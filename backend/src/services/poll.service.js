const PollRepository = require('../repositories/poll.repository');
const { pool } = require('../config/db');
const ApiError = require('../utils/apiError');

class PollService {
  /**
   * Create a new poll
   * User requirement: ONLY ADMIN and COMMITTEE MEMBER can create polls!
   */
  static async createPoll(data, user) {
    if (!user) {
      throw ApiError.unauthorized('Authentication required to create polls.');
    }

    // Check if creator is a committee member in the database
    const [cmRows] = await pool.query(
      `SELECT cm.society_id, cm.committee_id, COALESCE(c.name, cm.committee_name) AS committee_name, cm.name AS member_name
       FROM committee_members cm
       LEFT JOIN committees c ON cm.committee_id = c.id
       WHERE cm.user_id = ? AND cm.status = 'ACTIVE' LIMIT 1`,
      [user.id]
    );

    const userRole = String(user.role || '').toUpperCase();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const isCommitteeMember = userRole === 'COMMITTEE_MEMBER' || cmRows.length > 0;

    if (!isAdmin && !isCommitteeMember) {
      throw ApiError.forbidden('Access denied. Only Administrators and Committee Members can create polls & surveys.');
    }

    if (!data.title || !data.title.trim()) {
      throw ApiError.badRequest('Poll question/title is required.');
    }

    // Default end_date to 7 days from now if not explicitly passed
    let endDate = data.end_date;
    if (!endDate) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      endDate = d.toISOString().slice(0, 19).replace('T', ' ');
    }

    const options = (data.options || [])
      .map((opt) => (typeof opt === 'string' ? opt.trim() : (opt?.text || '').trim()))
      .filter(Boolean);

    if (options.length < 2) {
      throw ApiError.badRequest('A poll must have at least 2 distinct selectable options.');
    }

    // Resolve society ID & creator attribution
    let societyId = data.society_id || user.societyId || null;
    let createdByType = 'ADMIN';
    let creatorMemberName = null;
    let committeeId = null;
    let committeeName = null;

    if (isCommitteeMember && !isAdmin) {
      createdByType = 'COMMITTEE';
      if (cmRows.length > 0) {
        societyId = societyId || cmRows[0].society_id;
        committeeId = cmRows[0].committee_id;
        committeeName = cmRows[0].committee_name || 'Managing Committee';
        creatorMemberName = cmRows[0].member_name || user.fullName || user.name;
      } else {
        committeeName = data.committee_name || 'Managing Committee';
        creatorMemberName = user.fullName || user.name || 'Committee Member';
      }
    } else {
      createdByType = 'ADMIN';
      creatorMemberName = user.fullName || user.name || 'Admin';
      committeeId = null;
      committeeName = null;
    }

    if (!societyId) {
      const [sRows] = await pool.query(`SELECT id FROM societies WHERE status = 'ACTIVE' LIMIT 1`);
      if (sRows.length > 0) societyId = sRows[0].id;
    }

    const payload = {
      society_id: societyId,
      committee_id: committeeId || null,
      committee_name: committeeName || null,
      created_by_user_id: user.id,
      created_by_type: createdByType,
      creator_member_name: creatorMemberName,
      title: data.title.trim(),
      description: data.description ? data.description.trim() : null,
      category: data.category || 'GENERAL',
      end_date: endDate,
      allow_multiple: !!data.allow_multiple,
      is_anonymous: !!data.is_anonymous,
      options,
    };

    return await PollRepository.createPoll(payload);
  }

  /**
   * List all polls
   */
  static async getAllPolls(societyId, filters = {}, user) {
    const effSocId = societyId || user?.societyId || null;
    return await PollRepository.findAllPolls(effSocId, filters, user?.id || null);
  }

  /**
   * Get poll by ID
   */
  static async getPollById(pollId, user) {
    const poll = await PollRepository.findPollById(pollId, user?.id || null);
    if (!poll) throw ApiError.notFound('Poll not found');
    return poll;
  }

  /**
   * Cast a vote
   */
  static async castVote(pollId, optionId, user) {
    if (!user || !user.id) throw ApiError.unauthorized('Authentication required to cast vote.');
    return await PollRepository.castVote(pollId, optionId, user.id);
  }

  /**
   * Close a poll (Creator or Admin only)
   */
  static async closePoll(pollId, user) {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'COMMITTEE_MEMBER')) {
      throw ApiError.forbidden('Access denied. Only Administrators and Committee Members can close polls.');
    }
    return await PollRepository.closePoll(pollId);
  }

  /**
   * Delete a poll (Creator or Admin only)
   */
  static async deletePoll(pollId, user) {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'COMMITTEE_MEMBER')) {
      throw ApiError.forbidden('Access denied. Only Administrators and Committee Members can delete polls.');
    }
    return await PollRepository.deletePoll(pollId);
  }

  /**
   * Get statistics
   */
  static async getStats(societyId, user) {
    const effSocId = societyId || user?.societyId || null;
    return await PollRepository.getStats(effSocId, user?.id || null);
  }
}

module.exports = PollService;
