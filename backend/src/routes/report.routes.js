const { Router } = require('express');
const ReportController = require('../controllers/report.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');

const router = Router();

// Reports are strictly restricted to ADMIN
router.use(authMiddleware);
router.use(roleMiddleware(ROLES.ADMIN));

router.get('/summary', ReportController.getSummaryReport);

module.exports = router;
