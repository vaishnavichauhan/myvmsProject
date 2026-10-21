const ApiError = require('../utils/apiError');
const config = require('../config/env');

/**
 * Centralized Express Error Handling Middleware.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // MySQL specific error translation
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry: A record with this unique value already exists.';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    statusCode = 503;
    message = 'Database service unavailable or connection failed.';
  } else if (err.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 500;
    message = 'Database table not found. Please run migrations.';
  }

  // Log in development or on unexpected 500s
  if (statusCode === 500 || config.nodeEnv === 'development') {
    console.error(`[Error] [${req.method} ${req.originalUrl}] [${statusCode}]:`, err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 404 Route Not Found Handler.
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
