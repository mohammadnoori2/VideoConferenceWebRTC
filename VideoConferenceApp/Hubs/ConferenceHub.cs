using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace VideoConferenceApp.Hubs
{
    public class ConferenceHub : Hub
    {
        private readonly ILogger<ConferenceHub> _logger;

        public ConferenceHub(ILogger<ConferenceHub> logger)
        {
            _logger = logger;
        }

        public async Task SendOffer(string connectionId, string offerJson)
        {
            try
            {
                if (string.IsNullOrEmpty(connectionId)) throw new ArgumentNullException(nameof(connectionId));
                if (string.IsNullOrEmpty(offerJson)) throw new ArgumentNullException(nameof(offerJson));

                _logger.LogInformation($"Sending offer to {connectionId}");
                await Clients.Client(connectionId).SendAsync("ReceiveOffer", offerJson);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SendOffer");
                throw;
            }
        }

        public async Task SendAnswer(string connectionId, string answerJson)
        {
            try
            {
                if (string.IsNullOrEmpty(connectionId)) throw new ArgumentNullException(nameof(connectionId));
                if (string.IsNullOrEmpty(answerJson)) throw new ArgumentNullException(nameof(answerJson));

                _logger.LogInformation($"Sending answer to {connectionId}");
                await Clients.Client(connectionId).SendAsync("ReceiveAnswer", answerJson);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SendAnswer");
                throw;
            }
        }

        public async Task SendIceCandidate(string connectionId, string candidateJson)
        {
            try
            {
                if (string.IsNullOrEmpty(connectionId)) throw new ArgumentNullException(nameof(connectionId));
                if (string.IsNullOrEmpty(candidateJson)) throw new ArgumentNullException(nameof(candidateJson));

                _logger.LogInformation($"Sending ICE candidate to {connectionId}");
                await Clients.Client(connectionId).SendAsync("ReceiveIceCandidate", candidateJson);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SendIceCandidate");
                throw;
            }
        }
    }
}
