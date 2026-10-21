import apiClient from './apiClient';

/**
 * Family Member and Home Portal API Client
 */
export const familyMemberApi = {
  /**
   * Fetch family members for current user's home (or specified homeId)
   */
  getFamilyMembers: (homeId) => {
    const url = homeId ? `/family-members?homeId=${homeId}` : '/family-members';
    return apiClient.get(url);
  },

  /**
   * Fetch single family member details
   */
  getFamilyMemberById: (id) => apiClient.get(`/family-members/${id}`),

  /**
   * Register a new family member (Owner/Tenant/Admin)
   */
  createFamilyMember: (data) => apiClient.post('/family-members', data),

  /**
   * Update family member details
   */
  updateFamilyMember: (id, data) => apiClient.put(`/family-members/${id}`, data),

  /**
   * Remove a family member
   */
  deleteFamilyMember: (id) => apiClient.delete(`/family-members/${id}`),

  /**
   * Fetch complete Home Portal Dashboard
   * Returns: home, primaryResident, familyMembers, homeWorkers, permissions, committeeMembers, announcements, gates, visitors
   */
  getMyHomeDashboard: (homeId) => {
    const url = homeId ? `/family-members/dashboard?homeId=${homeId}` : '/family-members/dashboard';
    return apiClient.get(url);
  },
};
