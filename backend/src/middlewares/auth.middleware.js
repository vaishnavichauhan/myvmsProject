const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/apiError');

/**
 * JWT Authentication Middleware (authMiddleware)
 * Extracts and verifies token from 'Authorization: Bearer <token>' header.
 * Attaches decoded user payload ({ id, role, ... }) to req.user.
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authorization token is missing or malformed. Format: Bearer <token>');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Bearer token not provided.');
    }

    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return next(ApiError.unauthorized('Session has expired. Please log in again.'));
        }
        return next(ApiError.unauthorized('Invalid authentication token.'));
      }

      // JWT must contain user id and role
      req.user = decoded;
      next();
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  authenticate: authMiddleware, // Alias for backwards compatibility
};
