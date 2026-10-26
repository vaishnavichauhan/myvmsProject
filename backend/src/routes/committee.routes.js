const { Router } = require('express');
const CommitteeController = require('../controllers/committee.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');
const { requireFeature } = require('../middlewares/entitlement.middleware');

const router = Router();

// All routes require authentication and COMMITTEES module entitlement
router.use(authMiddleware, requireFeature('COMMITTEES'));

// Check if current user can create announcements (Admin or authorized Committee Member)
router.get('/my-permissions', CommitteeController.checkAnnouncementPermission);

// Committees Management (e.g. Festival, Electricity, etc.)
router.get('/committees', CommitteeController.getAllCommittees);
router.post('/committees', roleMiddleware(ROLES.ADMIN), CommitteeController.createCommittee);
router.put('/committees/:id', roleMiddleware(ROLES.ADMIN), CommitteeController.updateCommittee);
router.delete('/committees/:id', roleMiddleware(ROLES.ADMIN), CommitteeController.deleteCommittee);

// Home Occupants (Fetch resident users living in a selected home: Owners, Tenants, Family Members)
router.get('/home-occupants/:homeId', CommitteeController.getHomeOccupants);

// Committee Members Roster (Residents & Admins)
router.get('/', CommitteeController.getAll);
router.get('/:id', CommitteeController.getById);

// Admin-only operations for Committee Member assignment
router.post('/', roleMiddleware(ROLES.ADMIN), CommitteeController.create);
router.put('/:id', roleMiddleware(ROLES.ADMIN), CommitteeController.update);
router.delete('/:id', roleMiddleware(ROLES.ADMIN), CommitteeController.delete);

module.exports = router;
