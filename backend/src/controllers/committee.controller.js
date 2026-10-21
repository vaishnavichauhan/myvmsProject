const CommitteeService = require('../services/committee.service');
const ApiResponse = require('../utils/apiResponse');
const { pool } = require('../config/db');
const HomeRepository = require('../repositories/home.repository');
const UserRepository = require('../repositories/user.repository');
const CommitteeRepository = require('../repositories/committee.repository');

/**
 * Society Committee Controller
 * Manages society committees, positions, home occupants, and resident member assignments.
 * Ensures committee passwords are never exposed.
 */
class CommitteeController {
  /**
   * ==========================================
   * 1. COMMITTEES (e.g. Festival, Electricity, etc.)
   * ==========================================
   */

  /**
   * POST /api/committee/committees (Admin Only)
   * Create a new committee name
   */
  static async createCommittee(req, res, next) {
    try {
      const societyId =
        req.body.society_id ||
        (req.user?.role === 'ADMIN'
          ? req.query.society_id || req.body.society_id || req.user?.societyId || 1
          : req.user?.societyId || 1);

      const committee = await CommitteeService.createCommittee({
        ...req.body,
        society_id: societyId,
      });

      return ApiResponse.created(res, `Committee "${committee.name}" created successfully`, {
        committee,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/committee/committees
   * List all committees with active member counts
   */
  static async getAllCommittees(req, res, next) {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      let societyId = req.query.society_id || req.query.societyId;
      if (!societyId) {
        societyId = isAdmin ? 'ALL' : (req.user?.societyId || req.user?.society_id || 1);
      }

      let committees = await CommitteeService.getAllCommittees(societyId);

      // Fallback: If resident society has 0 committees, show all committees
      if ((!committees || committees.length === 0) && !isAdmin) {
        committees = await CommitteeService.getAllCommittees('ALL');
      }

      return ApiResponse.success(res, 'Committees retrieved successfully', {
        committees,
        total: committees.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/committee/committees/:id (Admin Only)
   */
  static async updateCommittee(req, res, next) {
    try {
      const committee = await CommitteeService.updateCommittee(req.params.id, req.body);
      return ApiResponse.success(res, 'Committee updated successfully', { committee });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/committee/committees/:id (Admin Only)
   */
  static async deleteCommittee(req, res, next) {
    try {
      const result = await CommitteeService.deleteCommittee(req.params.id);
      return ApiResponse.success(res, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * ==========================================
   * 2. HOME OCCUPANTS
   * GET /api/committee/home-occupants/:homeId
   * Fetch resident users (Owner, Tenant, Family Members) for the selected home
   * ==========================================
   */
  static async getHomeOccupants(req, res, next) {
    try {
      const occupants = await CommitteeService.getHomeOccupants(req.params.homeId);
      return ApiResponse.success(res, 'Home occupants retrieved successfully', {
        occupants,
        total: occupants.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ==========================================
   * 3. COMMITTEE MEMBERS (Roster & Assignments)
   * ==========================================
   */

  /**
   * POST /api/committee (Admin Only)
   * Create / Assign a resident member to a committee
   */
  static async create(req, res, next) {
    try {
      let societyId = req.body.society_id;

      // Auto-detect society_id from home_id or user_id or committee_id
      if (!societyId && req.body.home_id) {
        const home = await HomeRepository.findById(req.body.home_id);
        if (home?.society_id) societyId = home.society_id;
      }
      if (!societyId && req.body.user_id) {
        const u = await UserRepository.findById(req.body.user_id);
        if (u?.society_id) societyId = u.society_id;
      }
      if (!societyId && req.body.committee_id) {
        const c = await CommitteeRepository.findCommitteeById(req.body.committee_id);
        if (c?.society_id) societyId = c.society_id;
      }
      if (!societyId) {
        societyId = req.user?.societyId || req.user?.society_id || 1;
      }

      // If committee was created under another society, sync it so it appears in this society
      if (req.body.committee_id && societyId) {
        await pool.query('UPDATE committees SET society_id = ? WHERE id = ? AND society_id != ?', [
          societyId,
          req.body.committee_id,
          societyId,
        ]);
      }

      const committeeMember = await CommitteeService.createCommitteeMember({
        ...req.body,
        society_id: societyId,
      });

      return ApiResponse.created(res, 'Committee member assigned successfully', {
        committeeMember,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/committee (Residents, Admins, etc.)
   * Retrieve list of all society committee members
   */
  static async getAll(req, res, next) {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      let societyId = req.query.society_id || req.query.societyId;
      if (!societyId) {
        societyId = isAdmin ? 'ALL' : (req.user?.societyId || req.user?.society_id || 1);
      }

      let committeeMembers = await CommitteeService.getAllCommitteeMembers(societyId, req.query);

      // If resident society has 0 committee members, fallback to general society committee members
      if ((!committeeMembers || committeeMembers.length === 0) && !isAdmin) {
        committeeMembers = await CommitteeService.getAllCommitteeMembers('ALL', req.query);
      }

      return ApiResponse.success(res, 'Committee members retrieved successfully', {
        committeeMembers,
        total: committeeMembers.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/committee/:id
   */
  static async getById(req, res, next) {
    try {
      const committeeMember = await CommitteeService.getCommitteeMemberById(req.params.id);
      return ApiResponse.success(res, 'Committee member details retrieved', {
        committeeMember,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/committee/:id (Admin Only)
   */
  static async update(req, res, next) {
    try {
      const committeeMember = await CommitteeService.updateCommitteeMember(
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, 'Committee member updated successfully', {
        committeeMember,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/committee/:id (Admin Only)
   */
  static async delete(req, res, next) {
    try {
      await CommitteeService.deleteCommitteeMember(req.params.id);
      return ApiResponse.success(res, 'Committee member removed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/committee/my-permissions
   * Check if logged in user has announcement permission as Admin or Committee Member
   */
  static async checkAnnouncementPermission(req, res, next) {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;
      const societyId = req.user?.societyId || req.user?.society_id || 1;

      let canCreate = false;
      let userCommittees = [];

      if (role === 'ADMIN') {
        canCreate = true;
      } else if (userId) {
        canCreate = await CommitteeService.checkAnnouncementPermission(userId, societyId);
        userCommittees = await CommitteeService.getUserCommittees(userId, societyId);
      }

      return ApiResponse.success(res, 'Announcement permission status', {
        canCreateAnnouncements: canCreate,
        role,
        userCommittees,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CommitteeController;
