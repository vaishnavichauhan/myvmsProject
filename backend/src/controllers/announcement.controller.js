const AnnouncementService = require('../services/announcement.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { pool } = require('../config/db');

/**
 * Announcement Controller
 */
class AnnouncementController {
  /**
   * POST /api/announcements
   * Create an announcement (Admin or Committee Member with permission)
   */
  static async create(req, res, next) {
    try {
      let societyId = req.body.society_id || req.body.societyId || req.user?.societyId || req.user?.society_id;
      if (!societyId) {
        const [socs] = await pool.query('SELECT id FROM societies ORDER BY id ASC LIMIT 1');
        societyId = socs[0]?.id || null;
      }

      if (!societyId) {
        throw ApiError.badRequest('No society found. Please create a residential society in Societies page first.');
      }

      const announcement = await AnnouncementService.createAnnouncement(
        {
          ...req.body,
          society_id: Number(societyId),
        },
        req.user
      );

      return ApiResponse.created(res, 'Announcement created successfully', {
        announcement,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/announcements
   * List announcements
   */
  static async getAll(req, res, next) {
    try {
      let societyId = req.query.society_id || req.query.societyId || req.user?.societyId || req.user?.society_id || null;
      if (req.user?.role !== 'ADMIN' && !societyId) {
        const [socs] = await pool.query('SELECT id FROM societies ORDER BY id ASC LIMIT 1');
        societyId = socs[0]?.id || null;
      }

      const announcements = await AnnouncementService.getAllAnnouncements(societyId, req.query);

      return ApiResponse.success(res, 'Announcements retrieved successfully', {
        announcements,
        total: announcements.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/announcements/:id
   */
  static async getById(req, res, next) {
    try {
      const announcement = await AnnouncementService.getAnnouncementById(req.params.id);
      return ApiResponse.success(res, 'Announcement retrieved successfully', {
        announcement,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/announcements/:id
   */
  static async update(req, res, next) {
    try {
      const announcement = await AnnouncementService.updateAnnouncement(
        req.params.id,
        req.body,
        req.user
      );
      return ApiResponse.success(res, 'Announcement updated successfully', {
        announcement,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/announcements/:id
   */
  static async delete(req, res, next) {
    try {
      await AnnouncementService.deleteAnnouncement(req.params.id, req.user);
      return ApiResponse.success(res, 'Announcement deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnnouncementController;
