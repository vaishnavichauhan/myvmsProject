const PollRepository = require('../repositories/poll.repository');
const { pool } = require('../config/db');
const ApiError = require('../utils/apiError');

class PollService {
  /**
   * Create a new poll
   * User requirement: ONLY ADMIN and COMMITTEE MEMBER can create polls!
   */
  static async createPoll(data, user) {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'COMMITTEE_MEMBER')) {
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

    // Resolve society ID
    let societyId = data.society_id || user.societyId || null;
    let committeeName = data.committee_name || null;
    let committeeId = data.committee_id || null;

    if (user.role === 'COMMITTEE_MEMBER') {
      const [cmRows] = await pool.query(
        `SELECT cm.society_id, cm.committee_id, COALESCE(c.name, cm.committee_name) AS committee_name
         FROM committee_members cm
         LEFT JOIN committees c ON cm.committee_id = c.id
         WHERE cm.user_id = ? AND cm.status = 'ACTIVE' LIMIT 1`,
        [user.id]
      );
      if (cmRows.length > 0) {
        societyId = societyId || cmRows[0].society_id;
        committeeId = committeeId || cmRows[0].committee_id;
        committeeName = committeeName || cmRows[0].committee_name || 'Managing Committee';
      }
    }

    if (committeeId && !committeeName) {
      const [cRows] = await pool.query('SELECT name FROM committees WHERE id = ? LIMIT 1', [committeeId]);
      if (cRows.length > 0) committeeName = cRows[0].name;
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
