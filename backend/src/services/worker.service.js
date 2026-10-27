const WorkerRepository = require('../repositories/worker.repository');
const UserRepository = require('../repositories/user.repository');
const HomeRepository = require('../repositories/home.repository');
const ApiError = require('../utils/apiError');

const VALID_WORKER_TYPES = [
  'DRIVER',
  'MAID',
  'COOK',
  'GARDENER',
  'CLEANER',
  'OTHER',
  'PLUMBER',
  'ELECTRICIAN',
  'CARPENTER',
  'NANNY',
];

/**
 * Worker Business Logic Service
 * Enforces single worker master record rule, many-to-many home mapping, and strict resident home scoping.
 */
class WorkerService {
  /**
   * Helper: Resolve caller's home and permissions
   */
  /**
   * Helper: Resolve caller's home and permissions
   */
  static async resolveCallerHome(user, requestedHomeId = null) {
    if (user.role === 'ADMIN') {
      if (requestedHomeId) {
        const home = await HomeRepository.findById(requestedHomeId);
        if (!home) throw ApiError.notFound(`Home ${requestedHomeId} not found.`);
        return {
          home_id: home.id,
          society_id: home.society_id,
          home_number: home.home_number,
          resident_id: null,
        };
      }
      return null;
    }

    const homeDetails = await UserRepository.getUserHomeDetails(user.id, user.role);
    if (!homeDetails) {
      throw ApiError.forbidden('Your account is not mapped to an active home.');
    }

    // Residents can only ever access their own home
    if (requestedHomeId && parseInt(requestedHomeId, 10) !== homeDetails.home_id) {
      throw ApiError.forbidden('Residents should only be allowed to modify workers connected to their own home.');
    }

    return homeDetails;
  }

  /**
   * Get all workers assigned to caller's home (or all society workers if ADMIN)
   */
  static async getHomeWorkers(user, requestedHomeId = null, queryParams = {}) {
    if (user.role === 'ADMIN' || user.role === 'SECURITY') {
      if (requestedHomeId) {
        return WorkerRepository.findWorkersByHomeId(requestedHomeId);
      }
      return WorkerRepository.findAllWorkers({
        societyId: queryParams.societyId || queryParams.society_id || user.societyId,
        worker_type: queryParams.worker_type || queryParams.type,
        search: queryParams.search || queryParams.q,
      });
    }

    const callerHome = await this.resolveCallerHome(user, requestedHomeId);
    return WorkerRepository.findWorkersByHomeId(callerHome.home_id);
  }

  /**
   * Search existing workers in society (for searchable dropdowns)
   */
  static async searchExistingWorkers(user, { worker_type, search, requestedHomeId = null, societyId = null } = {}) {
    let targetSocietyId = societyId;
    let callerHome = null;

    if (user.role === 'ADMIN' || user.role === 'SECURITY') {
      targetSocietyId = societyId || user.societyId || null;
    } else {
      callerHome = await this.resolveCallerHome(user, requestedHomeId);
      targetSocietyId = callerHome.society_id;
    }

    const workers = await WorkerRepository.searchWorkers(targetSocietyId, {
      worker_type,
      search,
    });

    let activeWorkerIdsInHome = new Set();
    if (callerHome) {
      const homeWorkers = await WorkerRepository.findWorkersByHomeId(callerHome.home_id);
      activeWorkerIdsInHome = new Set(
        homeWorkers.filter((hw) => hw.assignment_status === 'ACTIVE').map((hw) => hw.worker_id)
      );
    }

    return workers.map((w) => ({
      ...w,
      already_connected_to_my_home: activeWorkerIdsInHome.has(w.id),
    }));
  }

  /**
   * Add existing worker to own home (Select from dropdown and link)
   */
  static async addExistingWorkerToHome(user, data) {
    const { worker_id, expected_time_in, expected_time_out, requested_home_id } = data;

    if (!worker_id) {
      throw ApiError.badRequest('Worker ID is required.');
    }

    const callerHome = await this.resolveCallerHome(user, requested_home_id);
    if (!callerHome) {
      throw ApiError.badRequest('A valid Home is required to link a worker.');
    }

    const worker = await WorkerRepository.findById(worker_id);
    if (!worker) {
      throw ApiError.notFound(`Worker with ID ${worker_id} not found.`);
    }

    // Verify worker belongs to same society
    if (worker.society_id !== callerHome.society_id) {
      throw ApiError.forbidden('Worker does not belong to your society.');
    }

    // Check if worker already connected to caller's home
    const existingAssignment = await WorkerRepository.findAssignment(worker_id, callerHome.home_id);
    if (existingAssignment && existingAssignment.status === 'ACTIVE') {
      throw ApiError.conflict(
        `${worker.full_name} (${worker.worker_type}) is already assigned to Home ${callerHome.home_number}.`
      );
    }

    // Link worker to caller's home via worker_home
    const assignment = await WorkerRepository.assignWorkerToHome({
      worker_id: worker.id,
      home_id: callerHome.home_id,
      assigned_by_resident_id: callerHome.resident_id || callerHome.primary_resident_id || null,
      expected_time_in: expected_time_in || '08:00:00',
      expected_time_out: expected_time_out || '19:00:00',
      status: 'ACTIVE',
    });

    return {
      message: `${worker.full_name} (${worker.worker_type}) successfully added to Home ${callerHome.home_number}.`,
      assignment,
      worker,
    };
  }

  /**
   * Add a new worker OR reuse existing worker if phone already exists
   * ADMIN creates a Society Worker (no home assignment directly).
   * RESIDENTS create and link worker directly to their own home.
   */
  static async createWorkerAndAddToHome(user, data) {
    const {
      name,
      full_name,
      phone,
      worker_type,
      photo_url = null,
      address = null,
      status = 'ACTIVE',
      expected_time_in = '08:00:00',
      expected_time_out = '19:00:00',
      requested_home_id = null,
      society_id = null,
      aadhar_number = null,
      aadhar_card_no = null,
      adhar_number = null,
      adhar_card_no = null,
      government_id_number = null,
    } = data;

    const resolvedAadhar = aadhar_number || aadhar_card_no || adhar_number || adhar_card_no || government_id_number || null;

    const workerName = (name || full_name || '').trim();
    if (!workerName) {
      throw ApiError.badRequest('Worker Name is required.');
    }

    const cleanPhone = String(phone || '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      throw ApiError.badRequest('A valid 10-digit Phone Number is required.');
    }

    const typeUpper = String(worker_type || 'OTHER').toUpperCase();
    if (!VALID_WORKER_TYPES.includes(typeUpper)) {
      throw ApiError.badRequest(`Worker Type must be one of: ${VALID_WORKER_TYPES.join(', ')}`);
    }

    // ========================================================
    // CASE A: ADMIN CREATES A SOCIETY WORKER (NO HOME NUMBER DIRECTLY)
    // ========================================================
    if (user.role === 'ADMIN') {
      const targetSocietyId = society_id || user.societyId || 1;

      // Check if worker already exists with this phone in this society
      let worker = await WorkerRepository.findByPhoneAndSociety(cleanPhone, targetSocietyId);
      if (worker) {
        worker = await WorkerRepository.updateWorker(worker.id, {
          full_name: workerName,
          worker_type: typeUpper,
          photo_url: photo_url || worker.photo_url,
          address: address || worker.address,
          aadhar_number: resolvedAadhar !== null ? resolvedAadhar : worker.aadhar_number,
          status: status || worker.status,
        });
      } else {
        worker = await WorkerRepository.createWorker({
          society_id: targetSocietyId,
          full_name: workerName,
          phone: cleanPhone,
          worker_type: typeUpper,
          photo_url,
          address,
          aadhar_number: resolvedAadhar,
          status: status || 'ACTIVE',
        });
      }

      // If Admin explicitly passed a requested_home_id, link to that home, otherwise DO NOT LINK TO ANY HOME!
      let assignment = null;
      if (requested_home_id) {
        assignment = await WorkerRepository.assignWorkerToHome({
          worker_id: worker.id,
          home_id: requested_home_id,
          assigned_by_resident_id: null,
          expected_time_in,
          expected_time_out,
          status: 'ACTIVE',
        });
      }

      return {
        message: `Society worker "${worker.full_name}" (${worker.worker_type}) registered successfully in society.`,
        worker,
        assignment,
      };
    }

    // ========================================================
    // CASE B: RESIDENT (OWNER/TENANT) CREATES WORKER FOR THEIR HOME
    // ========================================================
    const callerHome = await this.resolveCallerHome(user, requested_home_id);

    // 1. Check if worker already exists with this phone in caller's society
    let worker = await WorkerRepository.findByPhoneAndSociety(cleanPhone, callerHome.society_id);

    if (worker) {
      worker = await WorkerRepository.updateWorker(worker.id, {
        full_name: workerName,
        worker_type: typeUpper,
        photo_url: photo_url || worker.photo_url,
        address: address || worker.address,
        aadhar_number: resolvedAadhar !== null ? resolvedAadhar : worker.aadhar_number,
        status: status || worker.status,
      });
    } else {
      worker = await WorkerRepository.createWorker({
        society_id: callerHome.society_id,
        full_name: workerName,
        phone: cleanPhone,
        worker_type: typeUpper,
        photo_url,
        address,
        aadhar_number: resolvedAadhar,
        status: status || 'ACTIVE',
      });
    }

    // 2. Check if already linked to caller's home
    const existingAssignment = await WorkerRepository.findAssignment(worker.id, callerHome.home_id);
    if (existingAssignment && existingAssignment.status === 'ACTIVE') {
      throw ApiError.conflict(
        `${worker.full_name} (${worker.worker_type}) is already assigned to Home ${callerHome.home_number}.`
      );
    }

    // 3. Link worker to caller's home
    const assignment = await WorkerRepository.assignWorkerToHome({
      worker_id: worker.id,
      home_id: callerHome.home_id,
      assigned_by_resident_id: callerHome.resident_id || callerHome.primary_resident_id || null,
      expected_time_in,
      expected_time_out,
      status: 'ACTIVE',
    });

    return {
      message: `${worker.full_name} (${worker.worker_type}) registered and added to Home ${callerHome.home_number}.`,
      worker,
      assignment,
    };
  }

  /**
   * Edit worker relationship (timings, status) or worker profile
   * Strictly enforces: "Residents should only be allowed to modify workers connected to their own home."
   */
  static async editWorkerRelationship(user, assignmentId, updateData) {
    const assignment = await WorkerRepository.findAssignmentById(assignmentId);
    if (!assignment) {
      throw ApiError.notFound(`Worker assignment ${assignmentId} not found.`);
    }

    // Verify caller owns this home
    const callerHome = await this.resolveCallerHome(user);
    if (user.role !== 'ADMIN' && assignment.home_id !== callerHome.home_id) {
      throw ApiError.forbidden('Residents should only be allowed to modify workers connected to their own home.');
    }

    // 1. Update assignment timing/status
    const updatedAssignment = await WorkerRepository.updateAssignment(assignmentId, {
      expected_time_in: updateData.expected_time_in,
      expected_time_out: updateData.expected_time_out,
      status: updateData.assignment_status || updateData.status,
    });

    // 2. Optionally update worker profile (name, phone, address, photo, aadhar)
    const resolvedAadhar = updateData.aadhar_number !== undefined ? updateData.aadhar_number : (updateData.aadhar_card_no !== undefined ? updateData.aadhar_card_no : updateData.adhar_number);

    if (updateData.full_name || updateData.name || updateData.phone || updateData.address || updateData.photo_url || updateData.worker_type || resolvedAadhar !== undefined) {
      await WorkerRepository.updateWorker(assignment.worker_id, {
        full_name: updateData.full_name || updateData.name,
        phone: updateData.phone,
        worker_type: updateData.worker_type,
        address: updateData.address,
        photo_url: updateData.photo_url,
        aadhar_number: resolvedAadhar,
      });
    }

    return WorkerRepository.findAssignmentById(assignmentId);
  }

  /**
   * Remove worker from home
   * Strictly enforces: "Residents should only be allowed to modify workers connected to their own home."
   * Important: Does NOT delete the worker record from database, preserving multi-home assignments!
   */
  static async removeWorkerFromHome(user, assignmentId) {
    const assignment = await WorkerRepository.findAssignmentById(assignmentId);
    if (!assignment) {
      throw ApiError.notFound(`Worker assignment ${assignmentId} not found.`);
    }

    // Verify caller owns this home
    const callerHome = await this.resolveCallerHome(user);
    if (user.role !== 'ADMIN' && assignment.home_id !== callerHome.home_id) {
      throw ApiError.forbidden('Residents should only be allowed to modify workers connected to their own home.');
    }

    await WorkerRepository.removeWorkerFromHome(assignmentId);

    return {
      message: `${assignment.full_name} (${assignment.worker_type}) was removed from Home ${assignment.home_number}.`,
      worker_id: assignment.worker_id,
      worker_name: assignment.full_name,
    };
  }

  /**
   * Delete worker master record from society (Admin action)
   */
  static async deleteWorker(user, workerId) {
    if (user.role !== 'ADMIN') {
      throw ApiError.forbidden('Only administrators can delete worker master records.');
    }
    const worker = await WorkerRepository.findById(workerId);
    if (!worker) {
      throw ApiError.notFound(`Worker with ID ${workerId} not found.`);
    }
    await WorkerRepository.deleteWorker(workerId);
    return { message: `Worker "${worker.full_name}" deleted successfully from society.` };
  }
}

module.exports = WorkerService;
