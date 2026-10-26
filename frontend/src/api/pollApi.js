import apiClient from './apiClient';

/**
 * Polls & Surveys API Client
 * Only Admin and Committee Members can create polls.
 * All residents can view and cast votes.
 */
export const pollApi = {
  // Statistics overview
  getStats: (params) => apiClient.get('/polls/stats', { params }),

  // List all polls with options, percentages & user vote state
  getAllPolls: (params) => apiClient.get('/polls', { params }),

  // Single poll details
  getPollById: (id) => apiClient.get(`/polls/${id}`),

  // Create poll (Admin & Committee Member only)
  createPoll: (data) => apiClient.post('/polls', data),

  // Cast vote on a poll option
  castVote: (pollId, optionId) => apiClient.post(`/polls/${pollId}/vote`, { option_id: optionId }),

  // Close poll early (Admin & Creator only)
  closePoll: (id) => apiClient.patch(`/polls/${id}/close`),

  // Delete poll (Admin & Creator only)
  deletePoll: (id) => apiClient.delete(`/polls/${id}`),
};

export default pollApi;
