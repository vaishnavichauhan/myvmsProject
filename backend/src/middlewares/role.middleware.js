const ApiError = require('../utils/apiError');

/**
 * Role Authorization Middleware (roleMiddleware)
 * Restricts access to specified user roles (e.g., 'ADMIN').
 * @param  {string|string[]} roles Allowed role or array of roles
 */
const roleMiddleware = (...roles) => {
  // Normalize roles to flat array
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User is not authenticated.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Role '${req.user.role}' is not authorized. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
};

module.exports = {
  roleMiddleware,
  authorizeRoles: roleMiddleware, // Alias for backwards compatibility
};
