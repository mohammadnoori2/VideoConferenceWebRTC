"use strict";

// Assuming SignalR is already connected
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/conferenceHub")
    .build();

let localStream = null;
let peerConnection = null;
let isHost = false;
let iceCandidateQueue = [];

// Peer connection configuration
const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// Get video and audio stream
async function getLocalStream() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStream = stream;
        // Display local stream in the local video element
        document.getElementById("localVideo").srcObject = localStream;
    } catch (error) {
        console.error("Error accessing media devices.", error);
    }
}

function setupPeerConnection() {
    if (!localStream) {
        console.error("Local stream is not initialized.");
        return;
    }

    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("Sending ICE candidate to server: ", event.candidate);
            connection.invoke("SendIceCandidate", connection.connectionId, JSON.stringify(event.candidate));
        }
    };

    peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById("remoteVideo");
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    // Add local stream tracks to the peer connection
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });
}

async function startConference() {
    isHost = true;
    await getLocalStream();
    connection.start()
        .then(() => {
            console.log("SignalR connection established. Connection ID: ", connection.connectionId);
            setupPeerConnection();

            // Create and send an offer
            peerConnection.createOffer()
                .then((offer) => {
                    return peerConnection.setLocalDescription(offer);
                })
                .then(() => {
                    console.log("Sending offer: ", peerConnection.localDescription);
                    connection.invoke("SendOffer", connection.connectionId, JSON.stringify(peerConnection.localDescription));
                })
                .catch((error) => {
                    console.error("Error creating or sending offer.", error);
                });
        })
        .catch((error) => {
            console.error("SignalR connection error: ", error);
        });
}

async function joinConference() {
    await getLocalStream();
    connection.start().then(() => {
        console.log("Joined conference with Connection ID: ", connection.connectionId);
        setupPeerConnection();
    }).catch((error) => {
        console.error("Error joining conference: ", error);
    });
}

function leaveConference() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        console.log("Left the conference.");
    }
    connection.stop().then(() => {
        console.log("Disconnected from SignalR.");
    }).catch((error) => {
        console.error("Error disconnecting from SignalR: ", error);
    });
}

// Handle receiving an offer from the host
connection.on("ReceiveOffer", async (offer) => {
    if (isHost) return; // Host should not process the offer

    try {
        console.log("Offer received from server: ", offer);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        connection.invoke("SendAnswer", connection.connectionId, JSON.stringify(answer));

        // Process any queued ICE candidates
        while (iceCandidateQueue.length > 0) {
            const candidate = iceCandidateQueue.shift();
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    } catch (error) {
        console.error("Error handling received offer.", error);
    }
});

// Handle receiving an answer from a participant
connection.on("ReceiveAnswer", async (answer) => {
    if (!isHost) return; // Only the host should process the answer

    try {
        console.log("Answer received from server: ", answer);
        const remoteDesc = new RTCSessionDescription(JSON.parse(answer));
        if (peerConnection.signalingState === "have-local-offer") {
            await peerConnection.setRemoteDescription(remoteDesc);

            // Process any queued ICE candidates
            while (iceCandidateQueue.length > 0) {
                const candidate = iceCandidateQueue.shift();
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } else {
            console.warn("Received answer in incorrect state: ", peerConnection.signalingState);
        }
    } catch (error) {
        console.error("Error handling received answer.", error);
    }
});

// Handle receiving an ICE candidate
connection.on("ReceiveIceCandidate", async (candidate) => {
    try {
        console.log("ICE candidate received from server: ", candidate);
        const candidateObj = JSON.parse(candidate);

        if (peerConnection.remoteDescription) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidateObj));
        } else {
            iceCandidateQueue.push(candidateObj);
        }
    } catch (error) {
        console.error("Error adding received ICE candidate.", error);
    }
});

// Start the conference when the "Start Conference" button is clicked
document.getElementById("startConference").addEventListener("click", startConference);

// Join the conference when the "Join Conference" button is clicked
document.getElementById("joinConference").addEventListener("click", joinConference);

// Leave the conference when the "Leave Conference" button is clicked
document.getElementById("leaveConference").addEventListener("click", leaveConference);
