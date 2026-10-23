const SpecialChargeRepository = require('../repositories/special-charge.repository');
const { pool } = require('../config/db');

class SpecialChargeService {
  static async createCharge(data, user) {
    if (!data.title || !data.amount || !data.due_date || !data.society_id) {
      throw new Error('Title, amount, due date, and society are required fields');
    }

    if (Number(data.amount) <= 0) {
      throw new Error('Charge amount must be greater than zero');
    }

    // If a committee member is creating the charge, attach their committee name
    let committeeName = data.committee_name || null;
    let committeeId = data.committee_id || null;

    if (user.role === 'COMMITTEE_MEMBER') {
      const [cmRows] = await pool.query(
        `SELECT committee_id, committee_name FROM committee_members WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`,
        [user.id]
      );
      if (cmRows.length > 0) {
        committeeId = cmRows[0].committee_id || committeeId;
        committeeName = cmRows[0].committee_name || committeeName || 'Managing Committee';
      }
    }

    const payload = {
      ...data,
      committee_id: committeeId,
      committee_name: committeeName,
    };

    return await SpecialChargeRepository.createCharge(payload, user.id);
  }

  static async getAllCharges(societyId, filters = {}, user) {
    return await SpecialChargeRepository.findAllCharges(societyId, filters);
  }

  static async getChargeById(chargeId) {
    const charge = await SpecialChargeRepository.findChargeById(chargeId);
    if (!charge) throw new Error('Special charge not found');
    return charge;
  }

  static async getAssignmentsByCharge(chargeId, filters = {}) {
    return await SpecialChargeRepository.findAssignmentsByCharge(chargeId, filters);
  }

  static async getResidentCharges(user, societyId = null) {
    return await SpecialChargeRepository.findAssignmentsForResident(user.id, societyId);
  }

  static async recordPayment(data, user) {
    return await SpecialChargeRepository.recordPayment(data, user?.id || null);
  }

  static async getAllPayments(societyId, filters = {}) {
    return await SpecialChargeRepository.findAllPayments(societyId, filters);
  }

  static async updateCharge(chargeId, data) {
    return await SpecialChargeRepository.updateCharge(chargeId, data);
  }

  static async deleteCharge(chargeId) {
    return await SpecialChargeRepository.deleteCharge(chargeId);
  }

  static async getStats(societyId, user) {
    let homeId = null;
    if (['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user.role)) {
      const [res] = await pool.query(
        `SELECT home_id FROM residents WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`,
        [user.id]
      );
      if (res.length > 0) homeId = res[0].home_id;
    }
    return await SpecialChargeRepository.getStats(societyId, homeId);
  }
}

module.exports = SpecialChargeService;
