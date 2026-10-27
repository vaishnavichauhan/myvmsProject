const MaintenanceRepository = require('../repositories/maintenance.repository');
const ApiError = require('../utils/apiError');

/**
 * Maintenance Service
 * Business logic layer for Maintenance Plans, Invoices, Late Penalty rules, and Payments.
 */
class MaintenanceService {
  // ==========================================================================
  // PLANS
  // ==========================================================================

  static async createPlan(data) {
    if (!data.name || !data.name.trim()) {
      throw ApiError.badRequest('Plan name is required (e.g., "Standard 2BHK Plan")');
    }

    if (data.amount === undefined || data.amount === null || Number(data.amount) < 0) {
      throw ApiError.badRequest('Maintenance amount must be a positive number');
    }

    const validCycles = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];
    if (data.billing_cycle && !validCycles.includes(data.billing_cycle)) {
      throw ApiError.badRequest(`Invalid billing cycle. Allowed: ${validCycles.join(', ')}`);
    }

    const validTypes = ['1BHK', '2BHK', '3BHK', '4BHK', 'VILLA', 'BUNGALOW', 'PENTHOUSE', 'STUDIO', 'ALL'];
    if (data.applicable_type && !validTypes.includes(data.applicable_type)) {
      throw ApiError.badRequest(`Invalid property configuration. Allowed: ${validTypes.join(', ')}`);
    }

    const validPenaltyTypes = ['FIXED', 'PERCENTAGE'];
    if (data.penalty_type && !validPenaltyTypes.includes(data.penalty_type)) {
      throw ApiError.badRequest(`Invalid penalty type. Allowed: ${validPenaltyTypes.join(', ')}`);
    }

    return await MaintenanceRepository.createPlan({
      ...data,
      amount: Number(data.amount),
      due_day: Number(data.due_day || 5),
      grace_period_days: Number(data.grace_period_days ?? 5),
      penalty_rate: Number(data.penalty_rate || 0),
    });
  }

  static async getAllPlans(societyId, filters) {
    return await MaintenanceRepository.findAllPlans(societyId, filters);
  }

  static async getPlanById(id) {
    const plan = await MaintenanceRepository.findPlanById(id);
    if (!plan) {
      throw ApiError.notFound('Maintenance plan not found');
    }
    return plan;
  }

  static async updatePlan(id, data) {
    await this.getPlanById(id);
    return await MaintenanceRepository.updatePlan(id, data);
  }

  static async deletePlan(id) {
    await this.getPlanById(id);
    return await MaintenanceRepository.deletePlan(id);
  }

  // ==========================================================================
  // BILLS / INVOICES
  // ==========================================================================

  static async getAllBills(societyId, filters) {
    return await MaintenanceRepository.findAllBills(societyId, filters);
  }

  static async getBillById(id) {
    const bill = await MaintenanceRepository.findBillById(id);
    if (!bill) {
      throw ApiError.notFound('Maintenance bill not found');
    }
    return bill;
  }

  static async createCustomBill(data) {
    if (!data.home_id) {
      throw ApiError.badRequest('Home/Unit selection is required');
    }
    if (!data.billing_period) {
      throw ApiError.badRequest('Billing period is required (e.g., "2026-10" or "Q4-2026")');
    }
    if (!data.base_amount || Number(data.base_amount) <= 0) {
      throw ApiError.badRequest('Maintenance base amount must be greater than zero');
    }
    if (!data.due_date) {
      throw ApiError.badRequest('Payment due date is required');
    }

    return await MaintenanceRepository.createBill(data);
  }

  static async generateBatchBills(societyId, data) {
    const { billing_period, billing_cycle = 'MONTHLY', due_date = null, plan_id = null } = data;
    if (!billing_period || !billing_period.trim()) {
      throw ApiError.badRequest('Billing period is required (e.g., "2026-10" or "Q4-2026")');
    }

    return await MaintenanceRepository.generateBatchBills(societyId, billing_period.trim(), billing_cycle, due_date, plan_id);
  }

  static async selectResidentPlan(userId, planId, requestedPeriod = null) {
    if (!planId) {
      throw ApiError.badRequest('Plan ID is required to select a maintenance plan');
    }
    return await MaintenanceRepository.selectResidentPlan(userId, Number(planId), requestedPeriod);
  }

  // ==========================================================================
  // PAYMENTS
  // ==========================================================================

  static async recordPayment(data, user) {
    if (!data.bill_id) {
      throw ApiError.badRequest('Bill ID is required to record a payment');
    }
    if (!data.amount || Number(data.amount) <= 0) {
      throw ApiError.badRequest('Payment amount must be greater than zero');
    }

    const validMethods = ['CASH', 'UPI', 'NET_BANKING', 'CHEQUE', 'CARD'];
    if (data.payment_method && !validMethods.includes(data.payment_method)) {
      throw ApiError.badRequest(`Invalid payment method. Allowed: ${validMethods.join(', ')}`);
    }

    return await MaintenanceRepository.recordPayment(data, user);
  }

  static async approvePayment(paymentId, user, adminRemarks = null) {
    const userRole = String(user?.role || '').toUpperCase();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'RESIDENTIAL_ADMIN'].includes(userRole);
    if (!isAdmin) {
      throw ApiError.forbidden('Only Society Administrators can verify and approve payments.');
    }

    return await MaintenanceRepository.approvePayment(Number(paymentId), user, adminRemarks);
  }

  static async rejectPayment(paymentId, user, reason = 'Payment verification rejected by admin') {
    const userRole = String(user?.role || '').toUpperCase();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'RESIDENTIAL_ADMIN'].includes(userRole);
    if (!isAdmin) {
      throw ApiError.forbidden('Only Society Administrators can verify and reject payments.');
    }

    return await MaintenanceRepository.rejectPayment(Number(paymentId), user, reason);
  }

  static async getAllPayments(societyId, filters) {
    return await MaintenanceRepository.findAllPayments(societyId, filters);
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  static async getStats(societyId, homeId = null) {
    return await MaintenanceRepository.getStats(societyId, homeId);
  }
}

module.exports = MaintenanceService;
