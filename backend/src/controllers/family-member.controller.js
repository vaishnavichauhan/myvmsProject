const FamilyMemberService = require('../services/family-member.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Family Member Controller
 * Handles HTTP requests for family member management and home portal dashboard.
 */
class FamilyMemberController {
  /**
   * GET /api/family-members
   * View family members (scoped to authenticated user's home)
   */
  static async getFamilyMembers(req, res, next) {
    try {
      const result = await FamilyMemberService.getFamilyMembers(
        req.user,
        req.query.homeId
      );
      return ApiResponse.success(res, 'Family members retrieved successfully', {
        familyMembers: result.familyMembers || result,
        owner: result.owner || null,
        home: result.home || null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/family-members/:id
   * View single family member details
   */
  static async getFamilyMemberById(req, res, next) {
    try {
      const familyMember = await FamilyMemberService.getFamilyMemberById(
        req.user,
        req.params.id
      );
      return ApiResponse.success(res, 'Family member retrieved', { familyMember });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/family-members
   * Add a new family member to user's home
   */
  static async createFamilyMember(req, res, next) {
    try {
      const familyMember = await FamilyMemberService.addFamilyMember(
        req.user,
        req.body
      );
      return ApiResponse.created(res, 'Family member added successfully', { familyMember });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/family-members/:id
   * Edit existing family member in user's home
   */
  static async updateFamilyMember(req, res, next) {
    try {
      const familyMember = await FamilyMemberService.updateFamilyMember(
        req.user,
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, 'Family member details updated', { familyMember });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/family-members/:id
   * Delete family member from user's home
   */
  static async deleteFamilyMember(req, res, next) {
    try {
      const result = await FamilyMemberService.deleteFamilyMember(
        req.user,
        req.params.id
      );
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/family-members/dashboard (or /api/my-home)
   * Retrieve complete Home Portal dashboard (My Home, Family Members, Workers, Permissions, Committee, Announcements, Gates, Visitors)
   */
  static async getMyHomeDashboard(req, res, next) {
    try {
      const dashboard = await FamilyMemberService.getMyHomeDashboard(
        req.user,
        req.query.homeId
      );
      return ApiResponse.success(res, 'Home dashboard retrieved successfully', dashboard);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FamilyMemberController;
