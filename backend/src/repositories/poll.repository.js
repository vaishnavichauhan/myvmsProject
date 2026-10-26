const { pool } = require('../config/db');
const ApiError = require('../utils/apiError');

class PollRepository {
  /**
   * Create a new poll with options
   */
  static async createPoll(data) {
    const {
      society_id,
      committee_id = null,
      committee_name = null,
      created_by_user_id,
      title,
      description = null,
      category = 'GENERAL',
      end_date,
      allow_multiple = false,
      is_anonymous = false,
      options = [],
    } = data;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Insert poll
      const [insertPollResult] = await connection.query(
        `INSERT INTO polls (
          society_id, committee_id, committee_name, created_by_user_id,
          title, description, category, status, end_date,
          allow_multiple, is_anonymous
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
        [
          society_id,
          committee_id,
          committee_name,
          created_by_user_id,
          title,
          description,
          category,
          end_date,
          allow_multiple ? 1 : 0,
          is_anonymous ? 1 : 0,
        ]
      );

      const pollId = insertPollResult.insertId;

      // 2. Insert options
      if (options.length > 0) {
        const optionValues = options.map((optText, index) => [
          pollId,
          optText.trim(),
          index,
          0,
        ]);

        await connection.query(
          `INSERT INTO poll_options (poll_id, option_text, display_order, votes_count)
           VALUES ?`,
          [optionValues]
        );
      }

      await connection.commit();
      return this.findPollById(pollId, created_by_user_id);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Find poll by ID with options, percentages, and user vote status
   */
  static async findPollById(pollId, currentUserId = null) {
    const [pollRows] = await pool.query(
      `SELECT p.*,
              s.name AS society_name,
              u.full_name AS created_by_name,
              CASE
                WHEN p.status = 'ACTIVE' AND p.end_date < NOW() THEN 'EXPIRED'
                ELSE p.status
              END AS effective_status
       FROM polls p
       JOIN societies s ON p.society_id = s.id
       JOIN users u ON p.created_by_user_id = u.id
       WHERE p.id = ?`,
      [pollId]
    );

    if (pollRows.length === 0) return null;
    const poll = pollRows[0];

    // Fetch options with votes count
    const [options] = await pool.query(
      `SELECT po.*,
              (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id) AS votes_count
       FROM poll_options po
       WHERE po.poll_id = ?
       ORDER BY po.display_order ASC, po.id ASC`,
      [pollId]
    );

    const totalVotes = options.reduce((sum, opt) => sum + Number(opt.votes_count || 0), 0);

    // Compute percentages
    const optionsWithPercent = options.map((opt) => ({
      ...opt,
      votes_count: Number(opt.votes_count || 0),
      percentage: totalVotes > 0 ? Math.round((Number(opt.votes_count || 0) / totalVotes) * 100) : 0,
    }));

    // Check if current user has voted
    let userVote = null;
    if (currentUserId) {
      const [voteRows] = await pool.query(
        `SELECT pv.option_id, po.option_text, pv.voted_at
         FROM poll_votes pv
         JOIN poll_options po ON pv.option_id = po.id
         WHERE pv.poll_id = ? AND pv.user_id = ?
         LIMIT 1`,
        [pollId, currentUserId]
      );
      if (voteRows.length > 0) {
        userVote = voteRows[0];
      }
    }

    return {
      ...poll,
      status: poll.effective_status,
      total_votes: totalVotes,
      options: optionsWithPercent,
      has_voted: !!userVote,
      user_vote: userVote,
    };
  }

  /**
   * List all polls for a society with filters
   */
  static async findAllPolls(societyId = null, filters = {}, currentUserId = null) {
    let query = `
      SELECT p.*,
             s.name AS society_name,
             u.full_name AS created_by_name,
             CASE
               WHEN p.status = 'ACTIVE' AND p.end_date < NOW() THEN 'EXPIRED'
               ELSE p.status
             END AS effective_status
      FROM polls p
      JOIN societies s ON p.society_id = s.id
      JOIN users u ON p.created_by_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (societyId && String(societyId) !== 'ALL') {
      query += ` AND p.society_id = ?`;
      params.push(societyId);
    }

    if (filters.category && filters.category !== 'ALL') {
      query += ` AND p.category = ?`;
      params.push(filters.category);
    }

    if (filters.committee_id) {
      query += ` AND p.committee_id = ?`;
      params.push(filters.committee_id);
    }

    if (filters.search) {
      query += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.committee_name LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY 
      CASE WHEN p.status = 'ACTIVE' AND p.end_date >= NOW() THEN 1 ELSE 2 END ASC,
      p.end_date ASC,
      p.id DESC`;

    const [polls] = await pool.query(query, params);

    // Hydrate options and user vote state for all polls
    const results = await Promise.all(
      polls.map(async (poll) => {
        const [options] = await pool.query(
          `SELECT po.id, po.poll_id, po.option_text, po.display_order,
                  (SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id) AS votes_count
           FROM poll_options po
           WHERE po.poll_id = ?
           ORDER BY po.display_order ASC, po.id ASC`,
          [poll.id]
        );

        const totalVotes = options.reduce((sum, opt) => sum + Number(opt.votes_count || 0), 0);

        const optionsWithPercent = options.map((opt) => ({
          ...opt,
          votes_count: Number(opt.votes_count || 0),
          percentage: totalVotes > 0 ? Math.round((Number(opt.votes_count || 0) / totalVotes) * 100) : 0,
        }));

        let userVote = null;
        if (currentUserId) {
          const [voteRows] = await pool.query(
            `SELECT pv.option_id, po.option_text, pv.voted_at
             FROM poll_votes pv
             JOIN poll_options po ON pv.option_id = po.id
             WHERE pv.poll_id = ? AND pv.user_id = ?
             LIMIT 1`,
            [poll.id, currentUserId]
          );
          if (voteRows.length > 0) userVote = voteRows[0];
        }

        return {
          ...poll,
          status: poll.effective_status,
          total_votes: totalVotes,
          options: optionsWithPercent,
          has_voted: !!userVote,
          user_vote: userVote,
        };
      })
    );

    // Filter by effective status if requested
    if (filters.status && filters.status !== 'ALL') {
      return results.filter((p) => p.status === filters.status);
    }

    return results;
  }

  /**
   * Cast a vote on a poll
   */
  static async castVote(pollId, optionId, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check poll status & expiry
      const [pollRows] = await connection.query(
        `SELECT * FROM polls WHERE id = ? FOR UPDATE`,
        [pollId]
      );

      if (pollRows.length === 0) {
        throw ApiError.notFound('Poll not found');
      }

      const poll = pollRows[0];
      if (poll.status !== 'ACTIVE' || new Date(poll.end_date) < new Date()) {
        throw ApiError.badRequest('This poll is closed or has expired. No further votes can be cast.');
      }

      // Check if user already voted
      const [existingVotes] = await connection.query(
        `SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?`,
        [pollId, userId]
      );

      if (existingVotes.length > 0) {
        throw ApiError.conflict('You have already cast your vote on this poll.');
      }

      // Check if option belongs to poll
      const [optRows] = await connection.query(
        `SELECT id FROM poll_options WHERE id = ? AND poll_id = ?`,
        [optionId, pollId]
      );

      if (optRows.length === 0) {
        throw ApiError.badRequest('Invalid option selected for this poll.');
      }

      // Find user home_id
      let homeId = null;
      const [residentRows] = await connection.query(
        `SELECT home_id FROM residents WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`,
        [userId]
      );
      if (residentRows.length > 0) {
        homeId = residentRows[0].home_id;
      } else {
        const [fmRows] = await connection.query(
          `SELECT home_id FROM family_members WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`,
          [userId]
        );
        if (fmRows.length > 0) homeId = fmRows[0].home_id;
      }

      // Record vote
      await connection.query(
        `INSERT INTO poll_votes (poll_id, option_id, user_id, home_id)
         VALUES (?, ?, ?, ?)`,
        [pollId, optionId, userId, homeId]
      );

      // Increment votes_count in poll_options
      await connection.query(
        `UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = ?`,
        [optionId]
      );

      await connection.commit();
      return this.findPollById(pollId, userId);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Close a poll (early termination)
   */
  static async closePoll(pollId) {
    await pool.query(
      `UPDATE polls SET status = 'CLOSED' WHERE id = ?`,
      [pollId]
    );
    return { success: true, message: 'Poll has been closed successfully.' };
  }

  /**
   * Delete poll
   */
  static async deletePoll(pollId) {
    await pool.query(`DELETE FROM polls WHERE id = ?`, [pollId]);
    return { success: true, message: 'Poll deleted successfully.' };
  }

  /**
   * Overall dashboard stats for polls
   */
  static async getStats(societyId = null, currentUserId = null) {
    let where = 'WHERE 1=1';
    const params = [];

    if (societyId && String(societyId) !== 'ALL') {
      where += ` AND society_id = ?`;
      params.push(societyId);
    }

    const [pollCounts] = await pool.query(
      `SELECT
         COUNT(*) AS total_polls,
         SUM(CASE WHEN status = 'ACTIVE' AND end_date >= NOW() THEN 1 ELSE 0 END) AS active_polls,
         SUM(CASE WHEN status = 'CLOSED' OR end_date < NOW() THEN 1 ELSE 0 END) AS closed_polls
       FROM polls
       ${where}`,
      params
    );

    let voteCountQuery = `
      SELECT COUNT(*) AS total_votes
      FROM poll_votes pv
      JOIN polls p ON pv.poll_id = p.id
      ${where}
    `;
    const [voteCounts] = await pool.query(voteCountQuery, params);

    let userVotedCount = 0;
    if (currentUserId) {
      const [uVotes] = await pool.query(
        `SELECT COUNT(*) AS count FROM poll_votes WHERE user_id = ?`,
        [currentUserId]
      );
      userVotedCount = uVotes[0]?.count || 0;
    }

    return {
      total_polls: pollCounts[0]?.total_polls || 0,
      active_polls: pollCounts[0]?.active_polls || 0,
      closed_polls: pollCounts[0]?.closed_polls || 0,
      total_votes: voteCounts[0]?.total_votes || 0,
      my_votes_count: userVotedCount,
    };
  }
}

module.exports = PollRepository;
