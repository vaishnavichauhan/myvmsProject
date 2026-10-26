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
      const { phone, phoneNumber, email, phoneOrEmail, password } = req.body;
      const identifier = phone || phoneNumber || email || phoneOrEmail;

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
  /**
   * GET /api/auth/test-users (Public testing helper)
   * Returns list of active users with known test credentials for instant portal testing
   */
  static async getTestUsers(req, res, next) {
    try {
      const { pool } = require('../config/db');
      const [users] = await pool.query(`
        SELECT u.id, u.full_name, u.phone, u.email, u.role, u.flat_number, u.block_or_tower,
               s.name AS society_name
        FROM users u
        LEFT JOIN societies s ON u.society_id = s.id
        WHERE u.status = 'ACTIVE'
        ORDER BY FIELD(u.role, 'SUPER_ADMIN', 'ADMIN', 'OWNER', 'TENANT', 'COMMITTEE_MEMBER', 'SECURITY', 'FAMILY_MEMBER'), u.id ASC
      `);

      const testAccounts = users.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        flat_number: u.flat_number,
        block_or_tower: u.block_or_tower,
        society_name: u.society_name,
        password: u.role === 'ADMIN' ? 'Password@123' : '123456',
      }));

      return ApiResponse.success(res, 'Test accounts retrieved', { users: testAccounts });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
