const SubscriptionRepository = require('../repositories/subscription.repository');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

class SuperAdminController {
  /**
   * GET /api/super-admin/overview
   * Real database-backed summary cards and platform analytics
   */
  static async getOverview(req, res, next) {
    try {
      const overview = await SubscriptionRepository.getPlatformOverview();
      return ApiResponse.success(res, 'Super Admin overview retrieved successfully', overview);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/societies
   * List societies with search, filter, pagination
   */
  static async getSocieties(req, res, next) {
    try {
      const { search, status, page, limit } = req.query;
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 20;
      const result = await SubscriptionRepository.getSocieties({
        search,
        status,
        page: pageNum,
        limit: limitNum,
      });
      const total = Array.isArray(result) ? result.length : (result.total || 0);
      const societies = Array.isArray(result) ? result : (result.societies || []);
      const payload = {
        societies,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.max(1, Math.ceil(total / limitNum)),
        },
      };
      return ApiResponse.success(res, 'Societies retrieved successfully', payload);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/societies/:id
   */
  static async getSocietyById(req, res, next) {
    try {
      const societyId = parseInt(req.params.id, 10);
      const society = await SubscriptionRepository.findSocietyById(societyId);
      if (!society) {
        throw ApiError.notFound('Society not found');
      }
      const usage = await SubscriptionRepository.getSocietyUsage(societyId);
      const features = await SubscriptionRepository.getSocietyFeatures(societyId);

      return ApiResponse.success(res, 'Society details retrieved', {
        society,
        usage,
        features,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/societies
   * Transactionally creates society + admin user + subscription
   */
  static async createSociety(req, res, next) {
    try {
      const {
        name,
        code,
        address,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        contactNumber,
        contactEmail,
        emergencyNumber,
        societyType,
        planId,
        maxUnits,
        maxUsers,
        maxWorkers,
        trialDays,
        adminName,
        adminEmail,
        adminPhone,
        adminPassword,
        adminData,
      } = req.body;

      const finalAdminName = adminName || adminData?.full_name || adminData?.name || adminData?.adminName;
      const finalAdminPhone = adminPhone || adminData?.phone || adminData?.adminPhone;
      const finalAdminEmail = adminEmail || adminData?.email || adminData?.adminEmail;
      const finalAdminPassword = adminPassword || adminData?.password || adminData?.adminPassword;

      if (!name || !code) {
        throw ApiError.badRequest('Society name and unique code are required.');
      }
      if (!finalAdminPhone || !finalAdminPassword || !finalAdminName) {
        throw ApiError.badRequest('Society admin name, phone number, and password are required.');
      }

      const result = await SubscriptionRepository.createSocietyWithAdmin({
        name,
        code,
        address: address || addressLine1 || '',
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        contactNumber,
        contactEmail,
        emergencyNumber,
        societyType,
        planId: planId ? parseInt(planId, 10) : null,
        maxUnits: maxUnits ? parseInt(maxUnits, 10) : 100,
        maxUsers: maxUsers ? parseInt(maxUsers, 10) : 50,
        maxWorkers: maxWorkers ? parseInt(maxWorkers, 10) : 20,
        trialDays: trialDays !== undefined && trialDays !== '' ? parseInt(trialDays, 10) : 14,
        adminName: finalAdminName,
        adminEmail: finalAdminEmail,
        adminPhone: finalAdminPhone,
        adminPassword: finalAdminPassword,
        createdBy: req.user.id,
      });

      return ApiResponse.created(res, 'Society and Society Admin created successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/super-admin/societies/:id
   */
  static async updateSociety(req, res, next) {
    try {
      const societyId = parseInt(req.params.id, 10);
      const result = await SubscriptionRepository.updateSociety(societyId, req.body, req.user.id);
      return ApiResponse.success(res, 'Society updated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/societies/:id/suspend
   */
  static async suspendSociety(req, res, next) {
    try {
      const societyId = parseInt(req.params.id, 10);
      const { reason } = req.body;
      const result = await SubscriptionRepository.suspendSociety(societyId, reason || 'Suspended by Super Admin', req.user.id);
      return ApiResponse.success(res, 'Society suspended successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/societies/:id/activate
   */
  static async activateSociety(req, res, next) {
    try {
      const societyId = parseInt(req.params.id, 10);
      const result = await SubscriptionRepository.activateSociety(societyId, req.user.id);
      return ApiResponse.success(res, 'Society activated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/admins
   */
  static async getSocietyAdmins(req, res, next) {
    try {
      const { search } = req.query;
      const admins = await SubscriptionRepository.getSocietyAdmins({ search });
      return ApiResponse.success(res, 'Society admins retrieved successfully', { admins });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/admins/:userId/reset-password
   */
  static async resetAdminPassword(req, res, next) {
    try {
      const userId = parseInt(req.params.userId, 10);
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        throw ApiError.badRequest('New password must be at least 6 characters long.');
      }
      await SubscriptionRepository.resetAdminPassword(userId, newPassword, req.user.id);
      return ApiResponse.success(res, 'Admin password reset successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/plans
   */
  static async getPlans(req, res, next) {
    try {
      const plans = await SubscriptionRepository.getPlans();
      return ApiResponse.success(res, 'Subscription plans retrieved successfully', { plans });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/plans/:id
   */
  static async getPlanById(req, res, next) {
    try {
      const planId = parseInt(req.params.id, 10);
      const plan = await SubscriptionRepository.getPlanById(planId);
      if (!plan) {
        throw ApiError.notFound('Subscription plan not found');
      }
      return ApiResponse.success(res, 'Plan details retrieved', { plan });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/plans
   */
  static async createPlan(req, res, next) {
    try {
      const {
        name,
        code,
        description,
        price,
        billingCycle,
        maxUsers,
        maxUnits,
        maxWorkers,
        maxGates,
        trialDays,
        features,
        extraUnitPrice,
        extraUserPrice,
        extraGatePrice,
        extra_unit_price,
        extra_user_price,
        extra_gate_price,
      } = req.body;

      if (!name || !name.trim()) {
        throw ApiError.badRequest('Plan name is required.');
      }
      if (!code || !code.trim()) {
        throw ApiError.badRequest('Unique plan code is required.');
      }
      if (price === undefined || price === null || price === '' || isNaN(price)) {
        throw ApiError.badRequest('Price is required and must be a valid amount.');
      }
      if (!billingCycle) {
        throw ApiError.badRequest('Billing cycle is required.');
      }
      if (!maxUnits || isNaN(maxUnits) || Number(maxUnits) <= 0) {
        throw ApiError.badRequest('Max units allowed is required and must be greater than 0.');
      }
      if (!maxUsers || isNaN(maxUsers) || Number(maxUsers) <= 0) {
        throw ApiError.badRequest('Max users allowed is required and must be greater than 0.');
      }
      if (!maxGates || isNaN(maxGates) || Number(maxGates) <= 0) {
        throw ApiError.badRequest('Max gates allowed is required and must be greater than 0.');
      }

      const newPlan = await SubscriptionRepository.createPlan({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description,
        price: parseFloat(price) || 0,
        billingCycle: billingCycle || 'MONTHLY',
        billing_cycle: billingCycle || 'MONTHLY',
        maxUsers: parseInt(maxUsers, 10),
        max_users: parseInt(maxUsers, 10),
        maxUnits: parseInt(maxUnits, 10),
        max_units: parseInt(maxUnits, 10),
        maxWorkers: maxWorkers ? parseInt(maxWorkers, 10) : 20,
        maxGates: parseInt(maxGates, 10),
        max_gates: parseInt(maxGates, 10),
        trialDays: trialDays !== undefined && trialDays !== '' ? parseInt(trialDays, 10) : 0,
        trial_days: trialDays !== undefined && trialDays !== '' ? parseInt(trialDays, 10) : 0,
        features: Array.isArray(features) ? features : [],
        extraUnitPrice: extraUnitPrice !== undefined ? extraUnitPrice : extra_unit_price,
        extraUserPrice: extraUserPrice !== undefined ? extraUserPrice : extra_user_price,
        extraGatePrice: extraGatePrice !== undefined ? extraGatePrice : extra_gate_price,
        extra_unit_price: extra_unit_price !== undefined ? extra_unit_price : extraUnitPrice,
        extra_user_price: extra_user_price !== undefined ? extra_user_price : extraUserPrice,
        extra_gate_price: extra_gate_price !== undefined ? extra_gate_price : extraGatePrice,
      }, req.user.id);

      return ApiResponse.created(res, 'Subscription plan created successfully', { plan: newPlan });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/super-admin/plans/:id
   */
  static async updatePlan(req, res, next) {
    try {
      const planId = parseInt(req.params.id, 10);
      const updatedPlan = await SubscriptionRepository.updatePlan(planId, req.body, req.user.id);
      return ApiResponse.success(res, 'Subscription plan updated successfully', { plan: updatedPlan });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/super-admin/plans/:id
   */
  static async deletePlan(req, res, next) {
    try {
      const planId = parseInt(req.params.id, 10);
      await SubscriptionRepository.deletePlan(planId, req.user.id);
      return ApiResponse.success(res, 'Subscription plan deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/features
   */
  static async getPlatformFeatures(req, res, next) {
    try {
      const features = await SubscriptionRepository.getPlatformFeatures();
      return ApiResponse.success(res, 'Platform features retrieved successfully', { features });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/subscriptions
   */
  static async getSubscriptions(req, res, next) {
    try {
      const { societyId, status } = req.query;
      const subscriptions = await SubscriptionRepository.getSubscriptions({
        societyId: societyId ? parseInt(societyId, 10) : null,
        status,
      });
      return ApiResponse.success(res, 'Subscriptions retrieved successfully', { subscriptions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/subscriptions/assign
   */
  static async assignSubscription(req, res, next) {
    try {
      const { societyId, planId, billingCycle, trialDays, startDate, endDate, notes } = req.body;
      if (!societyId || !planId) {
        throw ApiError.badRequest('Society ID and Plan ID are required.');
      }
      const result = await SubscriptionRepository.assignSubscription({
        societyId: parseInt(societyId, 10),
        planId: parseInt(planId, 10),
        billingCycle,
        trialDays,
        startDate,
        endDate,
        notes,
      }, req.user.id);

      return ApiResponse.success(res, 'Subscription assigned successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/societies/:id/usage
   */
  static async getSocietyUsage(req, res, next) {
    try {
      const societyId = parseInt(req.params.id, 10);
      const usage = await SubscriptionRepository.getSocietyUsage(societyId);
      return ApiResponse.success(res, 'Society resource usage retrieved', usage);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/societies/:id/limits/override
   */
  static async setLimitOverride(req, res, next) {
    try {
      const societyId = parseInt(req.params.id, 10);
      const { limitType, overrideValue, reason } = req.body;
      if (!limitType || overrideValue === undefined) {
        throw ApiError.badRequest('limitType (UNITS, USERS, WORKERS) and overrideValue are required.');
      }
      const result = await SubscriptionRepository.setLimitOverride({
        societyId,
        limitType,
        overrideValue: parseInt(overrideValue, 10),
        reason: reason || 'Approved by Super Admin',
        approvedBy: req.user.id,
      });
      return ApiResponse.success(res, 'Limit override configured successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/societies/:id/features/override
   */
  static async setFeatureOverride(req, res, next) {
    try {
      const societyId = parseInt(req.params.id, 10);
      const { featureCode, isEnabled, reason } = req.body;
      if (!featureCode || isEnabled === undefined) {
        throw ApiError.badRequest('featureCode and isEnabled are required.');
      }
      const result = await SubscriptionRepository.setFeatureOverride({
        societyId,
        featureCode,
        isEnabled: Boolean(isEnabled),
        reason: reason || 'Override by Super Admin',
        approvedBy: req.user.id,
      });
      return ApiResponse.success(res, 'Feature override configured successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/billing/invoices
   */
  static async getInvoices(req, res, next) {
    try {
      const { societyId, status } = req.query;
      const invoices = await SubscriptionRepository.getInvoices({
        societyId: societyId ? parseInt(societyId, 10) : null,
        status,
      });
      return ApiResponse.success(res, 'Subscription invoices retrieved', { invoices });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/billing/invoices/:invoiceId/payments
   */
  static async recordPayment(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.invoiceId, 10);
      const { amount, paymentMethod, transactionRef, notes } = req.body;
      if (!amount) {
        throw ApiError.badRequest('Payment amount is required.');
      }
      const result = await SubscriptionRepository.recordSubscriptionPayment({
        invoiceId,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'BANK_TRANSFER',
        transactionRef,
        notes,
      }, req.user.id);

      return ApiResponse.success(res, 'Subscription payment recorded successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/billing/invoices/:invoiceId/approve
   */
  static async approvePayment(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.invoiceId, 10);
      const result = await SubscriptionRepository.approveSubscriptionPayment(invoiceId, req.user.id);
      return ApiResponse.success(res, 'Subscription payment approved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/super-admin/billing/auto-generate
   */
  static async autoGenerateInvoices(req, res, next) {
    try {
      const generated = await SubscriptionRepository.autoGenerateRecurringInvoices();
      return ApiResponse.success(res, `Auto-generated ${generated.length} recurring subscription invoices`, { generated });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/super-admin/audit-logs
   */
  static async getAuditLogs(req, res, next) {
    try {
      const { societyId, limit } = req.query;
      const logs = await SubscriptionRepository.getPlatformAuditLogs({
        societyId: societyId ? parseInt(societyId, 10) : null,
        limit: limit ? parseInt(limit, 10) : 100,
      });
      return ApiResponse.success(res, 'Platform audit logs retrieved', { logs });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SuperAdminController;
