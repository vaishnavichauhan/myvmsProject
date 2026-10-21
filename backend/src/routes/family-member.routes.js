const express = require('express');
const router = express.Router();
const FamilyMemberController = require('../controllers/family-member.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

// All family member routes require authentication
router.use(authMiddleware);

/**
 * GET /api/family-members/dashboard
 * Complete Home Portal for OWNER, TENANT, and FAMILY_MEMBER
 * (My Home, Family Members, Workers, Permissions, Committee, Announcements, Gates, Visitors)
 */
router.get(
  '/dashboard',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  FamilyMemberController.getMyHomeDashboard
);

/**
 * GET /api/family-members
 * View family members in home
 */
router.get(
  '/',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  FamilyMemberController.getFamilyMembers
);

/**
 * GET /api/family-members/:id
 * View single family member details
 */
router.get(
  '/:id',
  roleMiddleware('OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'),
  FamilyMemberController.getFamilyMemberById
);

/**
 * POST /api/family-members
 * Add family member (OWNER or TENANT can add to their own home; ADMIN can add to any)
 */
router.post(
  '/',
  roleMiddleware('OWNER', 'TENANT', 'ADMIN'),
  FamilyMemberController.createFamilyMember
);

/**
 * PUT /api/family-members/:id
 * Edit family member details
 */
router.put(
  '/:id',
  roleMiddleware('OWNER', 'TENANT', 'ADMIN'),
  FamilyMemberController.updateFamilyMember
);

/**
 * DELETE /api/family-members/:id
 * Remove family member from home
 */
router.delete(
  '/:id',
  roleMiddleware('OWNER', 'TENANT', 'ADMIN'),
  FamilyMemberController.deleteFamilyMember
);

module.exports = router;
