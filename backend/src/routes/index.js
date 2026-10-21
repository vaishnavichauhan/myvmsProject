const { Router } = require('express');
const authRoutes = require('./auth.routes');
const healthRoutes = require('./health.routes');
const societyRoutes = require('./society.routes');
const homeRoutes = require('./home.routes');
const residentRoutes = require('./resident.routes');
const familyMemberRoutes = require('./family-member.routes');
const workerRoutes = require('./worker.routes');
const permissionRoutes = require('./permission.routes');
const securityRoutes = require('./security.routes');
const gateRoutes = require('./gate.routes');
const visitorRoutes = require('./visitor.routes');
const courierDeliveryRoutes = require('./courier-delivery.routes');
const committeeRoutes = require('./committee.routes');
const announcementRoutes = require('./announcement.routes');
const adminRoutes = require('./admin.routes');
const reportRoutes = require('./report.routes');
const { ALL_ROLES } = require('../constants/roles');
const ApiResponse = require('../utils/apiResponse');

const router = Router();

// Base API information endpoint
router.get('/', (req, res) => {
  return ApiResponse.success(res, 'MYVMS Residential Society Management API is operational', {
    version: '1.0.0',
    availableRoles: ALL_ROLES,
    endpoints: {
      health: '/api/v1/health',
      auth: {
        login: 'POST /api/auth/login (Phone Number & Password)',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        changePassword: 'POST /api/auth/change-password',
      },
      societies: {
        create: 'POST /api/societies (Admin Only)',
        list: 'GET /api/societies',
        detail: 'GET /api/societies/:id',
        update: 'PUT /api/societies/:id (Admin Only)',
        delete: 'DELETE /api/societies/:id (Admin Only)',
      },
      homes: {
        create: 'POST /api/societies/:societyId/homes (Admin Only)',
        batch: 'POST /api/societies/:societyId/homes/batch (Admin Only)',
        list: 'GET /api/societies/:societyId/homes',
        detail: 'GET /api/homes/:id',
        update: 'PUT /api/homes/:id (Admin Only)',
        delete: 'DELETE /api/homes/:id (Admin Only)',
      },
      residents: {
        create: 'POST /api/residents (Admin Only)',
        list: 'GET /api/residents',
        detail: 'GET /api/residents/:id',
        update: 'PUT /api/residents/:id (Admin Only)',
        status: 'PATCH /api/residents/:id/status (Admin Only)',
        resetPassword: 'POST /api/residents/:id/reset-password (Admin Only)',
        delete: 'DELETE /api/residents/:id (Admin Only)',
      },
      familyMembers: {
        list: 'GET /api/family-members (Owner/Tenant/Family Member)',
        dashboard: 'GET /api/family-members/dashboard (Home Portal)',
        create: 'POST /api/family-members (Owner/Tenant/Admin)',
        update: 'PUT /api/family-members/:id (Owner/Tenant/Admin)',
        delete: 'DELETE /api/family-members/:id (Owner/Tenant/Admin)',
      },
      workers: {
        list: 'GET /api/workers (Home Workers)',
        search: 'GET /api/workers/search (Searchable Dropdown)',
        assign: 'POST /api/workers/assign (Select Existing Worker)',
        create: 'POST /api/workers (Create or Link Worker)',
        update: 'PUT /api/workers/assignments/:id (Edit Relationship)',
        delete: 'DELETE /api/workers/assignments/:id (Remove Worker From Home)',
      },
      permissions: {
        list: 'GET /api/permissions (Resident-Specific Permissions)',
        update: 'PUT /api/permissions/:userId (Owner/Tenant Manage Rights)',
        check: 'GET /api/permissions/check/:type (Check Specific Right)',
      },
      security: {
        staff: 'GET /api/security (Admin List), POST /api/security (Admin Create)',
        gateDashboard: 'GET /api/security/gate/dashboard (Gate Console)',
        searchHomes: 'GET /api/security/gate/search-homes (Intercom & Flat Lookup)',
        gateEntry: 'POST /api/security/gate/entry (Log Entry)',
        gateExit: 'PATCH /api/security/gate/exit/:id (Log Exit)',
      },
    },
  });
});

// Mount module routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/societies', societyRoutes);
router.use('/homes', homeRoutes);
router.use('/residents', residentRoutes);
router.use('/family-members', familyMemberRoutes);
router.use('/workers', workerRoutes);
router.use('/permissions', permissionRoutes);
router.use('/security', securityRoutes);
router.use('/gates', gateRoutes);
router.use('/visitors', visitorRoutes);
router.use('/courier-deliveries', courierDeliveryRoutes);
router.use('/deliveries', courierDeliveryRoutes);
router.use('/committee', committeeRoutes);
router.use('/announcements', announcementRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
