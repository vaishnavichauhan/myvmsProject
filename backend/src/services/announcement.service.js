const AnnouncementRepository = require('../repositories/announcement.repository');
const CommitteeService = require('./committee.service');
const ApiError = require('../utils/apiError');
const { ROLES } = require('../constants/roles');

const VALID_TYPES = [
  'GENERAL',
  'FESTIVAL',
  'EMERGENCY',
  'MAINTENANCE',
  'MEETING',
  'IMPORTANT',
];

class AnnouncementService {
  /**
   * Create an announcement
   * Authorized: ADMIN, or Committee Member with can_create_announcements = true
   * Residents cannot create announcements.
   */
  static async createAnnouncement(data, currentUser) {
    const {
      title,
      description,
      content,
      type = 'GENERAL',
      date = null,
      category = null,
      priority = null,
      attachment_url = null,
      valid_until = null,
      status = 'ACTIVE',
      society_id = 1,
    } = data;

    if (!title || !title.trim()) {
      throw ApiError.badRequest('Announcement Title is required.');
    }

    const descVal = (description || content || '').trim();
    if (!descVal) {
      throw ApiError.badRequest('Announcement Description / Content is required.');
    }

    const cleanType = String(type || 'GENERAL').toUpperCase();
    if (!VALID_TYPES.includes(cleanType)) {
      throw ApiError.badRequest(
        `Invalid announcement type "${type}". Allowed types: ${VALID_TYPES.join(', ')}`
      );
    }

    // Permission check: Must be ADMIN, or Committee Member with can_create_announcements = true
    if (currentUser.role !== ROLES.ADMIN) {
      const hasPermission = await CommitteeService.checkAnnouncementPermission(
        currentUser.id,
        society_id
      );
      if (!hasPermission) {
        throw ApiError.forbidden(
          'Access denied. Only Admins and authorized Committee Members can create announcements.'
        );
      }
    }

    return AnnouncementRepository.create({
      society_id,
      created_by_user_id: currentUser.id,
      title: title.trim(),
      type: cleanType,
      description: descVal,
      content: descVal,
      date: date || new Date().toISOString().slice(0, 10),
      category,
      priority,
      attachment_url: attachment_url || null,
      valid_until: valid_until || null,
      status,
    });
  }

  /**
   * List announcements (All residents & staff can view active announcements)
   */
  static async getAllAnnouncements(societyId = 1, filters = {}) {
    return AnnouncementRepository.findAll(societyId, filters);
  }

  /**
   * Get single announcement
   */
  static async getAnnouncementById(id) {
    const announcement = await AnnouncementRepository.findById(id);
    if (!announcement) {
      throw ApiError.notFound(`Announcement with ID ${id} not found.`);
    }
    return announcement;
  }

  /**
   * Update announcement
   * Authorized: ADMIN or Author Committee Member with permission.
   * "Residents cannot edit announcements."
   */
  static async updateAnnouncement(id, data, currentUser) {
    const existing = await AnnouncementRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Announcement with ID ${id} not found.`);
    }

    // Role check: Only ADMIN or the author can edit. Regular residents cannot edit.
    if (currentUser.role !== ROLES.ADMIN) {
      if (existing.created_by_user_id !== currentUser.id) {
        throw ApiError.forbidden('Access denied. Residents cannot edit announcements.');
      }
      // Even if user created it, verify they still have committee permission
      const hasPermission = await CommitteeService.checkAnnouncementPermission(
        currentUser.id,
        existing.society_id
      );
      if (!hasPermission) {
        throw ApiError.forbidden('Access denied. You do not have permission to edit announcements.');
      }
    }

    if (data.type && !VALID_TYPES.includes(data.type.toUpperCase())) {
      throw ApiError.badRequest(
        `Invalid announcement type "${data.type}". Allowed types: ${VALID_TYPES.join(', ')}`
      );
    }

    return AnnouncementRepository.update(id, data);
  }

  /**
   * Delete announcement
   * Authorized: ADMIN or original author with committee permissions.
   */
  static async deleteAnnouncement(id, currentUser) {
    const existing = await AnnouncementRepository.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Announcement with ID ${id} not found.`);
    }

    if (currentUser.role !== ROLES.ADMIN && existing.created_by_user_id !== currentUser.id) {
      throw ApiError.forbidden('Access denied. Residents cannot delete announcements.');
    }

    return AnnouncementRepository.delete(id);
  }
}

module.exports = AnnouncementService;
