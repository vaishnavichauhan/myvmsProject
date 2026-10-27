const { Router } = require('express');
const AccountController = require('../controllers/account.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = Router();

// Ensure user is authenticated
router.use(authMiddleware);

// Accessible by Society Admin and Super Admin
router.get('/overview', AccountController.getOverview);
router.get('/monthly', AccountController.getMonthly);
router.get('/transactions', AccountController.getTransactions);

module.exports = router;
