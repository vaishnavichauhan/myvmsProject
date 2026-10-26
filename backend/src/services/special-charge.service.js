const SpecialChargeRepository = require('../repositories/special-charge.repository');
const { pool } = require('../config/db');

class SpecialChargeService {
  static async createCharge(data, user) {
    let societyId = data.society_id || user.societyId || null;

    // Resolve committee details
    let committeeName = data.committee_name || null;
    let committeeId = data.committee_id || null;

    // If a committee member is creating the charge, resolve their committee and society
    if (user.role === 'COMMITTEE_MEMBER') {
      const [cmRows] = await pool.query(
        `SELECT cm.society_id, cm.committee_id, COALESCE(c.name, cm.committee_name) AS committee_name
         FROM committee_members cm
         LEFT JOIN committees c ON cm.committee_id = c.id
         WHERE cm.user_id = ? AND cm.status = 'ACTIVE' LIMIT 1`,
        [user.id]
      );
      if (cmRows.length > 0) {
        societyId = societyId || cmRows[0].society_id;
        committeeId = committeeId || cmRows[0].committee_id;
        committeeName = committeeName || cmRows[0].committee_name || 'Managing Committee';
      }
    }

    // If an Admin specified committee_id but not committee_name, look up committee name
    if (committeeId && !committeeName) {
      const [cRows] = await pool.query(
        `SELECT name FROM committees WHERE id = ? LIMIT 1`,
        [committeeId]
      );
      if (cRows.length > 0) {
        committeeName = cRows[0].name;
      }
    }

    if (!societyId) {
      const [sRows] = await pool.query(`SELECT id FROM societies WHERE status = 'ACTIVE' LIMIT 1`);
      if (sRows.length > 0) {
        societyId = sRows[0].id;
      }
    }

    if (!data.title || !data.amount || !data.due_date || !societyId) {
      throw new Error('Title, amount, due date, and society are required fields');
    }

    if (Number(data.amount) <= 0) {
      throw new Error('Charge amount must be greater than zero');
    }

    const payload = {
      ...data,
      society_id: societyId,
      committee_id: committeeId || null,
      committee_name: committeeName || null,
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
    if (['OWNER', 'TENANT', 'FAMILY_MEMBER', 'COMMITTEE_MEMBER'].includes(user.role)) {
      const [res] = await pool.query(
        `SELECT home_id FROM residents WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`,
        [user.id]
      );
      if (res.length > 0) {
        homeId = res[0].home_id;
      } else {
        const [fm] = await pool.query(
          `SELECT home_id FROM family_members WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`,
          [user.id]
        );
        if (fm.length > 0) {
          homeId = fm[0].home_id;
        } else {
          const [cm] = await pool.query(
            `SELECT home_id FROM committee_members WHERE user_id = ? AND status = 'ACTIVE' AND home_id IS NOT NULL LIMIT 1`,
            [user.id]
          );
          if (cm.length > 0) homeId = cm[0].home_id;
        }
      }
    }
    return await SpecialChargeRepository.getStats(societyId, homeId);
  }
}

module.exports = SpecialChargeService;
