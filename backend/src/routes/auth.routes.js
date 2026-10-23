const { Router } = require('express');
const AuthController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { ROLES } = require('../constants/roles');
const ApiResponse = require('../utils/apiResponse');

const router = Router();

// Public Authentication APIs
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/register', AuthController.register);
router.get('/test-users', AuthController.getTestUsers);

// Protected APIs (Requires valid Bearer JWT via authMiddleware)
router.get('/me', authMiddleware, AuthController.me);
router.put('/me', authMiddleware, AuthController.updateProfile);
router.post('/change-password', authMiddleware, AuthController.changePassword);

// Role-protected test API (Admin only)
router.get('/admin-only', authMiddleware, roleMiddleware(ROLES.ADMIN), (req, res) => {
  return ApiResponse.success(res, 'Admin authorization verified successfully', {
    admin: req.user,
  });
});

module.exports = router;
