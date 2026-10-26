const PollService = require('../services/poll.service');

class PollController {
  static async createPoll(req, res, next) {
    try {
      const poll = await PollService.createPoll(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Poll created successfully',
        data: poll,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllPolls(req, res, next) {
    try {
      const societyId = req.query.society_id || req.user.societyId || null;
      const polls = await PollService.getAllPolls(societyId, req.query, req.user);
      return res.status(200).json({
        success: true,
        data: polls,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPollById(req, res, next) {
    try {
      const poll = await PollService.getPollById(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        data: poll,
      });
    } catch (err) {
      next(err);
    }
  }

  static async castVote(req, res, next) {
    try {
      const { option_id } = req.body;
      if (!option_id) {
        return res.status(400).json({
          success: false,
          message: 'Please select an option to vote',
        });
      }
      const poll = await PollService.castVote(req.params.id, option_id, req.user);
      return res.status(200).json({
        success: true,
        message: 'Vote recorded successfully',
        data: poll,
      });
    } catch (err) {
      next(err);
    }
  }

  static async closePoll(req, res, next) {
    try {
      const result = await PollService.closePoll(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deletePoll(req, res, next) {
    try {
      const result = await PollService.deletePoll(req.params.id, req.user);
      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req, res, next) {
    try {
      const societyId = req.query.society_id || req.user.societyId || null;
      const stats = await PollService.getStats(societyId, req.user);
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = PollController;
