const MaintenanceRepository = require('../repositories/maintenance.repository');
const ApiError = require('../utils/apiError');
const { pool } = require('../config/db');

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

  // ==========================================================================
  // MAINTENANCE CYCLES
  // ==========================================================================

  static getNextMonthStr(monthStr) {
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return '';
    const [y, m] = monthStr.split('-').map(Number);
    let nextM = m + 1;
    let nextY = y;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    return `${nextY}-${String(nextM).padStart(2, '0')}`;
  }

  static getPrevMonthStr(monthStr) {
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return '';
    const [y, m] = monthStr.split('-').map(Number);
    let prevM = m - 1;
    let prevY = y;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    return `${prevY}-${String(prevM).padStart(2, '0')}`;
  }

  static addMonthsToStr(monthStr, count) {
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return '';
    const [y, m] = monthStr.split('-').map(Number);
    const totalMonths = y * 12 + (m - 1) + count;
    const newY = Math.floor(totalMonths / 12);
    const newM = (totalMonths % 12) + 1;
    return `${newY}-${String(newM).padStart(2, '0')}`;
  }

  static async ensureDefaultCycle(societyId) {
    if (!societyId) return [];
    const existing = await MaintenanceRepository.findAllCycles(societyId);
    if (existing && existing.length > 0) {
      return existing;
    }

    // Determine society creation month
    let startMonth = new Date().toISOString().slice(0, 7); // fallback current month YYYY-MM
    try {
      const [socRows] = await pool.query('SELECT created_at FROM societies WHERE id = ? LIMIT 1', [societyId]);
      if (socRows.length > 0 && socRows[0].created_at) {
        const d = new Date(socRows[0].created_at);
        if (!isNaN(d.getTime())) {
          startMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }
    } catch (err) {
      console.warn('Could not fetch society created_at for default cycle, using current month:', err.message);
    }

    // Default maintenance cycle is 12 months (e.g. 2026-10 to 2027-09)
    const endMonth = this.addMonthsToStr(startMonth, 11);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [sy, sm] = startMonth.split('-').map(Number);
    const [ey, em] = endMonth.split('-').map(Number);
    const startLabel = `${monthNames[sm - 1]} ${sy}`;
    const endLabel = `${monthNames[em - 1]} ${ey}`;

    await MaintenanceRepository.createCycle({
      society_id: societyId,
      name: `Cycle 1 (${startLabel} – ${endLabel})`,
      start_month: startMonth,
      end_month: endMonth,
    });

    return await MaintenanceRepository.findAllCycles(societyId);
  }

  static async getAllCycles(societyId) {
    let cycles = await MaintenanceRepository.findAllCycles(societyId);
    if (!cycles || cycles.length === 0) {
      cycles = await this.ensureDefaultCycle(societyId);
    }
    return cycles;
  }

  static async getActiveCycle(societyId) {
    const cycles = await this.getAllCycles(societyId);
    return cycles[0] || null;
  }

  static async createCycle(societyId, data) {
    if (!data.name || !data.name.trim()) {
      throw ApiError.badRequest('Cycle name is required (e.g. "Cycle 2 (Oct 2027 - Sep 2028)")');
    }
    if (!data.start_month || !/^\d{4}-\d{2}$/.test(data.start_month)) {
      throw ApiError.badRequest('Valid start month (YYYY-MM) is required');
    }
    if (!data.end_month || !/^\d{4}-\d{2}$/.test(data.end_month)) {
      throw ApiError.badRequest('Valid end month (YYYY-MM) is required');
    }
    if (data.start_month > data.end_month) {
      throw ApiError.badRequest('Start month cannot be after end month');
    }

    // Check existing cycles for overlap and sequential continuous ordering
    const existingCycles = await MaintenanceRepository.findAllCycles(societyId);

    if (existingCycles && existingCycles.length > 0) {
      // Sort existing cycles chronologically by end_month
      const sorted = [...existingCycles].sort((a, b) => (a.end_month || '').localeCompare(b.end_month || ''));

      // 1. Strict overlap check: no cycle can share the same month
      for (const c of sorted) {
        if (data.start_month <= c.end_month && c.start_month <= data.end_month) {
          throw ApiError.badRequest(
            `Cycles cannot share the same month. Selected period (${data.start_month} to ${data.end_month}) overlaps with existing cycle "${c.name}" (${c.start_month} to ${c.end_month}).`
          );
        }
      }

      // 2. Strict sequential order: new cycle must start in the immediate upcoming next month after the previous cycle ends
      const latestCycle = sorted[sorted.length - 1];
      const expectedStartMonth = this.getNextMonthStr(latestCycle.end_month);

      if (data.start_month < expectedStartMonth) {
        throw ApiError.badRequest(
          `Cycles must be in increasing chronological order. Previous cycle "${latestCycle.name}" covers up to ${latestCycle.end_month}. The next cycle cannot start earlier than ${expectedStartMonth}.`
        );
      }

      if (data.start_month > expectedStartMonth) {
        throw ApiError.badRequest(
          `Cycle months must be sequential without skipping months. Previous cycle "${latestCycle.name}" ends in ${latestCycle.end_month}, so the upcoming cycle must start with ${expectedStartMonth} (cannot start with ${data.start_month}).`
        );
      }
    }

    return await MaintenanceRepository.createCycle({
      society_id: societyId,
      name: data.name.trim(),
      start_month: data.start_month,
      end_month: data.end_month,
    });
  }

  static async updateCycle(societyId, cycleId, data) {
    const cycle = await MaintenanceRepository.findCycleById(cycleId);
    if (!cycle) {
      throw ApiError.notFound('Maintenance cycle not found');
    }
    if (Number(cycle.society_id) !== Number(societyId)) {
      throw ApiError.forbidden('Cannot modify cycle of another society');
    }

    const name = data.name !== undefined ? data.name.trim() : cycle.name;
    const start_month = data.start_month || cycle.start_month;
    const end_month = data.end_month || cycle.end_month;

    if (!name) {
      throw ApiError.badRequest('Cycle name cannot be empty');
    }
    if (!/^\d{4}-\d{2}$/.test(start_month) || !/^\d{4}-\d{2}$/.test(end_month)) {
      throw ApiError.badRequest('Valid start month and end month (YYYY-MM) are required');
    }
    if (start_month > end_month) {
      throw ApiError.badRequest('Start month cannot be after end month');
    }

    // Check against all other cycles for this society
    const otherCycles = (await MaintenanceRepository.findAllCycles(societyId)).filter(
      (c) => Number(c.id) !== Number(cycleId)
    );

    if (otherCycles.length > 0) {
      const sorted = [...otherCycles].sort((a, b) => a.start_month.localeCompare(b.start_month));

      // Check overlap
      for (const c of sorted) {
        if (start_month <= c.end_month && c.start_month <= end_month) {
          throw ApiError.badRequest(
            `Cycle period (${start_month} to ${end_month}) overlaps with existing cycle "${c.name}" (${c.start_month} to ${c.end_month}). Cycles cannot share the same month.`
          );
        }
      }

      // Check continuity with predecessor and successor
      const predecessors = sorted.filter((c) => c.end_month < start_month);
      const successors = sorted.filter((c) => c.start_month > end_month);

      if (predecessors.length > 0) {
        const lastPred = predecessors[predecessors.length - 1];
        const expectedStart = this.getNextMonthStr(lastPred.end_month);
        if (start_month !== expectedStart) {
          throw ApiError.badRequest(
            `Cycle must start in the immediate next month after previous cycle "${lastPred.name}" ends (${lastPred.end_month}). Expected start: ${expectedStart}.`
          );
        }
      }

      if (successors.length > 0) {
        const firstSucc = successors[0];
        const expectedSuccStart = this.getNextMonthStr(end_month);
        if (firstSucc.start_month !== expectedSuccStart) {
          throw ApiError.badRequest(
            `Next cycle "${firstSucc.name}" starts at ${firstSucc.start_month}. This cycle must end in ${this.getPrevMonthStr(firstSucc.start_month)} to maintain continuous cycle progression.`
          );
        }
      }
    }

    return await MaintenanceRepository.updateCycle(cycleId, {
      name,
      start_month,
      end_month,
    });
  }

  static async activateCycle(societyId, cycleId) {
    return await MaintenanceRepository.activateCycle(societyId, cycleId);
  }

  static async deleteCycle(societyId, cycleId) {
    return await MaintenanceRepository.deleteCycle(societyId, cycleId);
  }
}

module.exports = MaintenanceService;
