const SubscriptionRepository = require('../repositories/subscription.repository');
const { ROLES } = require('../constants/roles');
const { pool } = require('../config/db');

/**
 * Middleware to check if the current user's society has access to a specific platform feature.
 * Super Admins always bypass feature checks.
 *
 * @param {string} featureCode - e.g. 'RESIDENTS', 'WORKERS', 'SOCIETY_FINANCE', 'POLLS', 'AMENITIES', etc.
 */
function requireFeature(featureCode) {
  return async (req, res, next) => {
    try {
      // Super admin can access everything across the platform
      if (req.user && req.user.role === ROLES.SUPER_ADMIN) {
        return next();
      }

      let societyId =
        req.user?.societyId ||
        req.user?.society_id ||
        req.societyId ||
        req.params.societyId ||
        req.params.society_id ||
        req.query.societyId ||
        req.query.society_id ||
        req.body?.society_id ||
        req.body?.societyId;

      if (!societyId && req.user?.id) {
        const [uRows] = await pool.query('SELECT society_id FROM users WHERE id = ?', [req.user.id]);
        if (uRows.length > 0 && uRows[0].society_id) {
          societyId = uRows[0].society_id;
        } else if (req.user.role === ROLES.ADMIN) {
          const [admRows] = await pool.query('SELECT id FROM societies WHERE admin_user_id = ? LIMIT 1', [req.user.id]);
          if (admRows.length > 0) {
            societyId = admRows[0].id;
          } else {
            const [firstSoc] = await pool.query('SELECT id FROM societies WHERE status = "ACTIVE" ORDER BY id ASC LIMIT 1');
            if (firstSoc.length > 0) societyId = firstSoc[0].id;
          }
        }
      }

      if (!societyId) {
        return res.status(400).json({
          success: false,
          message: 'Society context is required to verify feature entitlement.'
        });
      }

      const features = await SubscriptionRepository.getSocietyFeatures(Number(societyId));
      const activeList = Array.isArray(features) ? features : (features?.activeFeatures || []);
      
      if (!activeList.includes(featureCode)) {
        return res.status(403).json({
          success: false,
          code: 'FEATURE_LOCKED',
          featureCode,
          subscriptionStatus: features.subscriptionStatus,
          planName: features.planName,
          message: `The '${featureCode}' module is not included in your society's current subscription plan (${features.planName || 'No active plan'}). Please contact your administrator to upgrade.`
        });
      }

      req.societyFeatures = features;
      next();
    } catch (err) {
      console.error('Error in requireFeature middleware:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to verify feature subscription entitlement.'
      });
    }
  };
}

/**
 * Middleware to enforce society limits (UNITS, USERS, WORKERS) before creation.
 *
 * @param {'UNITS' | 'USERS' | 'WORKERS'} limitType
 */
function enforceLimit(limitType) {
  return async (req, res, next) => {
    try {
      // Super Admin bypasses limit check if operating directly, but generally limits apply to societies
      if (req.user && req.user.role === ROLES.SUPER_ADMIN && !req.params.societyId && !req.body.societyId) {
        return next();
      }

      let societyId =
        req.user?.societyId ||
        req.user?.society_id ||
        req.societyId ||
        req.params.societyId ||
        req.params.society_id ||
        req.body?.societyId ||
        req.body?.society_id ||
        req.query?.societyId ||
        req.query?.society_id;

      if (!societyId && req.user?.id) {
        const [uRows] = await pool.query('SELECT society_id FROM users WHERE id = ?', [req.user.id]);
        if (uRows.length > 0 && uRows[0].society_id) {
          societyId = uRows[0].society_id;
        } else if (req.user.role === ROLES.ADMIN) {
          const [admRows] = await pool.query('SELECT id FROM societies WHERE admin_user_id = ? LIMIT 1', [req.user.id]);
          if (admRows.length > 0) {
            societyId = admRows[0].id;
          } else {
            const [firstSoc] = await pool.query('SELECT id FROM societies WHERE status = "ACTIVE" ORDER BY id ASC LIMIT 1');
            if (firstSoc.length > 0) societyId = firstSoc[0].id;
          }
        }
      }

      if (!societyId) {
        return res.status(400).json({
          success: false,
          message: 'Society context is required to enforce resource limits.'
        });
      }

      const check = await SubscriptionRepository.checkLimit(Number(societyId), limitType);

      if (!check.allowed) {
        return res.status(409).json({
          success: false,
          code: 'LIMIT_EXCEEDED',
          limitType,
          current: check.current,
          max: check.max,
          percentage: check.percentage,
          message: `Limit exceeded: Your society has reached the maximum allowed ${limitType.toLowerCase()} (${check.current}/${check.max}). Upgrade your subscription plan or request a limit override.`
        });
      }

      req.limitCheck = check;
      next();
    } catch (err) {
      console.error('Error in enforceLimit middleware:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to verify society capacity limit.'
      });
    }
  };
}

module.exports = {
  requireFeature,
  enforceLimit
};
