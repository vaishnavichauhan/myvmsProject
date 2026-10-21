const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Authentication Controller
 * Handles HTTP requests and delegates to AuthService.
 */
class AuthController {
  /**
   * POST /api/auth/login
   * Login with Phone Number (or Email) and Password
   */
  static async login(req, res, next) {
    try {
      const { phone, phoneNumber, email, password } = req.body;
      const identifier = phone || phoneNumber || email;

      const result = await AuthService.login(identifier, password);
      return ApiResponse.success(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   * Client-side token invalidation / logout acknowledgment
   */
  static async logout(req, res, next) {
    try {
      return ApiResponse.success(res, 'Logged out successfully', {
        loggedOut: true,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me (Protected by authMiddleware)
   * Get current logged-in user details
   */
  static async me(req, res, next) {
    try {
      const user = await AuthService.getProfile(req.user.id);
      return ApiResponse.success(res, 'Current user profile retrieved', { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/auth/me (Protected by authMiddleware)
   * Update profile details (name, email, phone, avatar)
   */
  static async updateProfile(req, res, next) {
    try {
      const user = await AuthService.updateProfile(req.user.id, req.body);
      return ApiResponse.success(res, 'Profile updated successfully', { user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/change-password (Protected by authMiddleware)
   * Securely update password with bcrypt
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword);
      return ApiResponse.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/register (Optional resident registration)
   */
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);
      return ApiResponse.created(res, 'Account created successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
