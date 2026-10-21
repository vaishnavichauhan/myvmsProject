const { Router } = require('express');
const AnnouncementController = require('../controllers/announcement.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

// Authentication required
router.use(authMiddleware);

// View announcements (All roles: Residents, Owners, Tenants, Committee Members, Security, Admins)
router.get('/', AnnouncementController.getAll);
router.get('/:id', AnnouncementController.getById);

// Create announcement (Admin or Committee Member with permission - checked inside service)
router.post('/', AnnouncementController.create);

// Update/Delete announcement (Admin or Author)
router.put('/:id', AnnouncementController.update);
router.delete('/:id', AnnouncementController.delete);

module.exports = router;
