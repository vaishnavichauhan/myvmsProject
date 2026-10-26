import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Plus,
  Phone,
  Mail,
  Home,
  ShieldCheck,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Power,
  RefreshCw,
  Building2,
  DoorOpen,
  Layers,
  UserPlus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
  Eye,
} from 'lucide-react';
import { residentApi } from '../api/residentApi';
import { societyApi } from '../api/societyApi';
import { adminApi } from '../api/adminApi';
import apiClient from '../api/apiClient';
import { useAuthStore } from '../store/authStore';

export const parsePropertyConfigs = (configStr) => {
  if (!configStr) return ['2BHK'];
  if (Array.isArray(configStr)) return configStr;
  const parts = String(configStr)
    .split(/[,/]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return parts.length > 0 ? parts : ['2BHK'];
};

export default function ResidentsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [residents, setResidents] = useState([]);
  const [homes, setHomes] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OCCUPIED' | 'VACANT'
  const [residentTypeFilter, setResidentTypeFilter] = useState('ALL'); // 'ALL' | 'OWNER' | 'TENANT'

  // Pagination (10 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, residentTypeFilter]);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // Unified Form: Merges "Add Residential Unit" fields + "Resident Details"
  const defaultCreateForm = {
    // Residential Unit Fields
    home_number: '',
    building_or_wing: '',
    floor: '',
    society_type: 'FLAT',
    home_type: '2BHK',
    society_id: '',
    // Resident Account Fields
    name: '',
    phone: '',
    email: '',
    password: '123456',
    resident_type: 'OWNER',
    move_in_date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE',
  };

  const [createForm, setCreateForm] = useState(defaultCreateForm);

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    resident_type: 'OWNER',
    status: 'ACTIVE',
  });

  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [resRes, socRes, homesRes, dashRes] = await Promise.all([
        residentApi.getResidents(),
        societyApi.getSocieties(),
        apiClient.get('/homes'),
        adminApi.getAdminDashboard().catch(() => null),
      ]);

      const socList = socRes.data?.societies || socRes.societies || [];
      setSocieties(socList);

      const activeSocId = user?.societyId || user?.society_id || socList[0]?.id;
      const allResidents = (resRes.data?.residents || []).filter(
        (r) => !activeSocId || !r.society_id || String(r.society_id) === String(activeSocId)
      );
      setResidents(allResidents);

      // Total Users Count from dashboard stats or allResidents fallback
      const dashStats = dashRes?.data?.stats || dashRes?.stats;
      const totalUsers = dashStats?.totalUsers ?? (
        dashStats ? (dashStats.owners || 0) + (dashStats.tenants || 0) + (dashStats.familyMembers || 0) : allResidents.length
      );
      setTotalUsersCount(totalUsers || allResidents.length);

      const allHomes = (homesRes.data?.homes || homesRes.homes || []).filter(
        (h) => !activeSocId || !h.society_id || String(h.society_id) === String(activeSocId)
      );
      setHomes(allHomes);

      const targetSoc = socList.find((s) => String(s.id) === String(activeSocId)) || socList[0];
      if (targetSoc) {
        const socConfigs = parsePropertyConfigs(targetSoc.property_configuration);
        setCreateForm((prev) => ({
          ...prev,
          society_id: targetSoc.id,
          society_type: targetSoc.society_type || 'FLAT',
          building_or_wing: '',
          floor: '',
          home_type: socConfigs[0] || '2BHK',
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch resident and unit data.');
    } finally {
      setLoading(false);
    }
  };

  // Active Society & Total capacity
  const mySocId = user?.societyId || user?.society_id;
  const currentSociety = (mySocId ? societies.find((s) => String(s.id) === String(mySocId)) : null) || societies[0] || null;
  const isFlat = currentSociety?.society_type === 'FLAT';
  const totalSocietyHomes = currentSociety ? (currentSociety.actual_homes_count || homes.length || currentSociety.total_homes || 0) : 0;

  const societyConfigs = useMemo(() => {
    return parsePropertyConfigs(currentSociety?.property_configuration);
  }, [currentSociety]);

  // -------------------------------------------------------------
  // Auto-generate Row & Column Units data (Bungalow 1..N vs Flat A-101..A-105, B-201..B-205)
  // -------------------------------------------------------------
  const allUnitsData = useMemo(() => {
    // If no society has been created yet, do not generate or display any units
    if (!currentSociety) {
      return [];
    }

    const societyHomes = homes.filter(
      (h) => String(h.society_id) === String(currentSociety.id)
    );

    const totalCapacity = Math.max(
      parseInt(currentSociety.total_homes, 10) || 0,
      societyHomes.length,
      1
    );

    // Map homes by normalized numbers
    const homeByNum = new Map();
    societyHomes.forEach((h) => {
      const raw = String(h.home_number || '').trim();
      const lower = raw.toLowerCase();
      homeByNum.set(lower, h);
      const pureNum = lower.replace(/^(home|flat|unit|villa)\s*/i, '').trim();
      homeByNum.set(pureNum, h);
      homeByNum.set(lower.replace(/[-\s]/g, ''), h);
    });

    // Map residents by home_id and home_number
    const resByHomeId = new Map();
    const resByHomeNum = new Map();
    residents.forEach((r) => {
      if (r.home_id) resByHomeId.set(r.home_id, r);
      if (r.home_number) {
        const raw = String(r.home_number || '').trim();
        const lower = raw.toLowerCase();
        resByHomeNum.set(lower, r);
        const pureNum = lower.replace(/^(home|flat|unit|villa)\s*/i, '').trim();
        resByHomeNum.set(pureNum, r);
        resByHomeNum.set(lower.replace(/[-\s]/g, ''), r);
      }
    });

    // 1. Gather all actual homes from database
    const sortedHomes = [...societyHomes].sort((a, b) => {
      const wingA = String(a.building_or_wing || '').toUpperCase();
      const wingB = String(b.building_or_wing || '').toUpperCase();
      if (wingA !== wingB) return wingA.localeCompare(wingB);
      const numA = parseInt(String(a.home_number).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.home_number).replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    const expectedSlots = [];
    const existingNumSet = new Set(
      sortedHomes.map((h) => String(h.home_number || '').trim().toLowerCase())
    );

    // Add all existing database homes first
    sortedHomes.forEach((h) => {
      expectedSlots.push({
        rawNumber: String(h.home_number).trim(),
        tower: h.building_or_wing || null,
        floor: h.floor,
        dbHome: h,
      });
    });

    // If total existing homes is less than totalCapacity, fill in missing slots
    if (expectedSlots.length < totalCapacity) {
      if (isFlat) {
        const towerACount = Math.ceil(totalCapacity / 2);
        const towerBCount = totalCapacity - towerACount;
        for (let i = 1; i <= towerACount && expectedSlots.length < totalCapacity; i++) {
          const num = `A-${100 + i}`;
          if (!existingNumSet.has(num.toLowerCase())) {
            expectedSlots.push({
              rawNumber: num,
              tower: 'A',
              floor: 1,
              dbHome: null,
            });
            existingNumSet.add(num.toLowerCase());
          }
        }
        for (let i = 1; i <= towerBCount && expectedSlots.length < totalCapacity; i++) {
          const num = `B-${200 + i}`;
          if (!existingNumSet.has(num.toLowerCase())) {
            expectedSlots.push({
              rawNumber: num,
              tower: 'B',
              floor: 1,
              dbHome: null,
            });
            existingNumSet.add(num.toLowerCase());
          }
        }
      } else {
        // Bungalow: 1, 2, 3...
        for (let i = 1; i <= totalCapacity && expectedSlots.length < totalCapacity; i++) {
          const numStr = String(i);
          if (!existingNumSet.has(numStr.toLowerCase())) {
            expectedSlots.push({
              rawNumber: numStr,
              tower: null,
              floor: null,
              dbHome: null,
            });
            existingNumSet.add(numStr.toLowerCase());
          }
        }
      }
    }

    // Sort expected slots naturally so Unit 1 is Home 1, Unit 2 is Home 2, etc.
    expectedSlots.sort((a, b) => {
      const towerA = String(a.tower || '').toUpperCase();
      const towerB = String(b.tower || '').toUpperCase();
      if (towerA !== towerB) return towerA.localeCompare(towerB);
      const numA = parseInt(String(a.rawNumber).replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.rawNumber).replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    // 2. Map every slot into its unit representation
    return expectedSlots.map((slot, index) => {
      const rawNum = slot.rawNumber;
      const lower = rawNum.toLowerCase();
      const pureNum = lower.replace(/^(home|flat|unit|villa)\s*/i, '').trim();

      const matchedHome =
        slot.dbHome ||
        homeByNum.get(lower) ||
        homeByNum.get(pureNum) ||
        homeByNum.get(lower.replace(/[-\s]/g, '')) ||
        null;

      const res =
        (matchedHome && resByHomeId.get(matchedHome.id)) ||
        resByHomeNum.get(lower) ||
        resByHomeNum.get(pureNum) ||
        resByHomeNum.get(lower.replace(/[-\s]/g, '')) ||
        null;

      return {
        id: matchedHome ? matchedHome.id : `slot-${index + 1}`,
        home_id: matchedHome ? matchedHome.id : null,
        displayNumber: rawNum,
        rawNumber: rawNum,
        slotNumber: index + 1,
        building_or_wing: matchedHome ? (matchedHome.building_or_wing || null) : slot.tower,
        floor: matchedHome ? (matchedHome.floor !== null && matchedHome.floor !== undefined ? matchedHome.floor : null) : slot.floor,
        society_type: currentSociety.society_type || 'BUNGALOW',
        home_type: (matchedHome && matchedHome.home_type) || societyConfigs[0] || '2BHK',
        isConfigured: !!matchedHome,
        isOccupied: !!res,
        resident: res,
      };
    });
  }, [homes, residents, currentSociety, societyConfigs, isFlat]);

  // Filtered rows for the Row-Column Data Table
  const filteredUnits = useMemo(() => {
    return allUnitsData.filter((u) => {
      const matchesSearch =
        searchTerm === '' ||
        (u.displayNumber && u.displayNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.rawNumber && String(u.rawNumber).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.building_or_wing && u.building_or_wing.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.resident?.full_name && u.resident.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.resident?.phone && u.resident.phone.includes(searchTerm)) ||
        (u.resident?.email && u.resident.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'OCCUPIED' && u.isOccupied) ||
        (statusFilter === 'VACANT' && !u.isOccupied) ||
        (statusFilter.startsWith('UNIT_') && String(u.rawNumber) === statusFilter.replace('UNIT_', ''));

      const matchesType =
        residentTypeFilter === 'ALL' ||
        (u.resident && u.resident.resident_type === residentTypeFilter);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allUnitsData, searchTerm, statusFilter, residentTypeFilter]);

  // Pagination calculation (10 units per page)
  const totalPages = Math.ceil(filteredUnits.length / pageSize) || 1;
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUnits.slice(start, start + pageSize);
  }, [filteredUnits, currentPage, pageSize]);

  const occupiedCount = allUnitsData.filter((u) => u.isOccupied).length;
  const vacantCount = allUnitsData.length - occupiedCount;

  // Open "Create Resident" modal (prefilled from specific unit in the table)
  const handleOpenCreateModal = (unitOrNumber = '') => {
    const unitObj = typeof unitOrNumber === 'object' && unitOrNumber !== null ? unitOrNumber : null;
    const firstVacant = allUnitsData.find((u) => !u.isOccupied);
    const prefillUnitNumber = unitObj
      ? (unitObj.rawNumber || unitObj.displayNumber)
      : (unitOrNumber || (firstVacant ? (firstVacant.rawNumber || firstVacant.displayNumber) : '1'));
    const firstSocConfig = societyConfigs[0] || '2BHK';
    const defaultType = (unitObj?.home_type && societyConfigs.includes(unitObj.home_type.toUpperCase()))
      ? unitObj.home_type.toUpperCase()
      : (firstVacant?.home_type && societyConfigs.includes(firstVacant.home_type.toUpperCase()) ? firstVacant.home_type.toUpperCase() : firstSocConfig);
    const defaultSocietyType = currentSociety?.society_type || 'FLAT';

    let wing = unitObj?.building_or_wing || firstVacant?.building_or_wing || '';
    let floorVal = unitObj?.floor !== null && unitObj?.floor !== undefined
      ? String(unitObj.floor)
      : (firstVacant?.floor !== null && firstVacant?.floor !== undefined ? String(firstVacant.floor) : '');

    if (defaultSocietyType === 'FLAT' && prefillUnitNumber) {
      if (!wing) {
        const match = String(prefillUnitNumber).match(/^([A-Za-z]+)[-_]/);
        if (match) wing = match[1];
      }
      if (!floorVal) {
        const numPart = String(prefillUnitNumber).replace(/^[A-Za-z]+[-_]/, '');
        if (numPart.length >= 3) {
          floorVal = numPart.slice(0, -2);
        } else {
          floorVal = '1';
        }
      }
    }

    setCreateForm({
      ...defaultCreateForm,
      society_id: currentSociety?.id || 1,
      home_number: prefillUnitNumber ? String(prefillUnitNumber).replace(/^(home|flat|unit|villa)\s*/i, '').trim() : '',
      society_type: defaultSocietyType,
      building_or_wing: wing,
      floor: floorVal,
      home_type: defaultType,
    });
    setErrorMsg(null);
    setShowCreateModal(true);
  };

  // Submit Merged Form (Creates Unit if needed + Registers Resident)
  const handleCreateResident = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const activeSocId = createForm.society_id || currentSociety?.id || 1;
      const hNum = String(createForm.home_number).trim();

      if (!hNum) {
        throw new Error('Please enter a Home / Flat Number.');
      }
      if (!createForm.name || !createForm.name.trim()) {
        throw new Error('Resident Full Name is required.');
      }
      if (!createForm.phone || !createForm.phone.trim()) {
        throw new Error('Resident Phone Number is required for login.');
      }

      // Check if home already exists in DB for this society
      let targetHome = homes.find(
        (h) =>
          String(h.society_id) === String(activeSocId) &&
          String(h.home_number).toLowerCase() === hNum.toLowerCase()
      );

      // If unit does not exist in DB, create it first
      if (!targetHome) {
        const homeRes = await societyApi.createHome(activeSocId, {
          home_number: hNum,
          building_or_wing: createForm.building_or_wing || null,
          floor: createForm.floor !== '' && createForm.floor !== null ? Number(createForm.floor) : null,
          home_type: createForm.home_type || '2BHK',
          occupancy_status: 'VACANT',
        });
        targetHome = homeRes.data?.home || homeRes.home || homeRes.data;
      }

      const targetHomeId = targetHome?.id || targetHome?.insertId;

      // Register primary resident mapped to this home
      await residentApi.createResident({
        home_id: targetHomeId,
        home_number: hNum,
        society_id: activeSocId,
        building_or_wing: createForm.building_or_wing || null,
        floor: createForm.floor !== '' && createForm.floor !== null ? Number(createForm.floor) : null,
        home_type: createForm.home_type,
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email ? createForm.email.trim() : null,
        password: createForm.password || '123456',
        resident_type: createForm.resident_type || 'OWNER',
        move_in_date: createForm.move_in_date || new Date().toISOString().split('T')[0],
        status: createForm.status || 'ACTIVE',
      });

      setSuccessMsg(`Resident "${createForm.name}" registered for Unit ${hNum} successfully!`);
      setShowCreateModal(false);
      setCreateForm(defaultCreateForm);
      fetchInitialData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register resident.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditResident = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await residentApi.updateResident(selectedResident.id, editForm);
      setSuccessMsg('Resident details updated successfully!');
      setShowEditModal(false);
      fetchInitialData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update resident.');
    }
  };

  const handleToggleStatus = async (resident) => {
    const newStatus = resident.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await residentApi.updateResidentStatus(resident.id, newStatus);
      setSuccessMsg(`Resident status changed to ${newStatus}`);
      fetchInitialData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to toggle status.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    try {
      const res = await residentApi.resetResidentPassword(selectedResident.id, newPasswordInput);
      setSuccessMsg(res.data?.message || 'Password reset successfully!');
      setShowResetPasswordModal(false);
      setNewPasswordInput('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password.');
    }
  };

  const handleDeleteResident = async (resident) => {
    if (!window.confirm(`Are you sure you want to remove resident ${resident.full_name}?`)) return;
    try {
      await residentApi.deleteResident(resident.id);
      setSuccessMsg('Resident removed successfully.');
      fetchInitialData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete resident.');
    }
  };

  const handleDeleteUnit = async (unit) => {
    if (!window.confirm(`Are you sure you want to delete ${unit.displayNumber}?`)) return;
    try {
      if (unit.home_id) {
        await apiClient.delete(`/homes/${unit.home_id}`);
      }
      if (currentSociety && currentSociety.id && currentSociety.total_homes > 0) {
        const newTotal = Math.max(0, currentSociety.total_homes - 1);
        await societyApi.updateSociety(currentSociety.id, { total_homes: newTotal });
      }
      setSuccessMsg(`${unit.displayNumber} deleted successfully.`);
      fetchInitialData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete unit.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* ---------------------------------------------------- */}
      {/* Top Header with ONE Primary Button: "Create Resident" */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Users size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: 0 }}>
              Resident Management
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Manage residential units, inventory allocation, and primary residents in one unified view.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAdmin && (
            <button
              id="btn-create-resident-top"
              onClick={() => handleOpenCreateModal()}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
              }}
            >
              <UserPlus size={16} />
              <span>Create Resident & Unit</span>
            </button>
          )}
          <button
            onClick={fetchInitialData}
            className="btn btn-outline"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            title="Refresh Units & Residents"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Toast Notifications */}
      {/* ---------------------------------------------------- */}
      {successMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Quick Metrics Bar */}
      {/* ---------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div className="glass-panel" style={{ padding: '14px 18px', background: 'var(--color-white)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(196, 154, 108, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} color="var(--color-clay)" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Total Units</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>{allUnitsData.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', background: 'var(--color-white)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(107, 142, 90, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={20} color="var(--color-fern-green)" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Occupied Units</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-fern-green)' }}>{occupiedCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', background: 'var(--color-white)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(135, 206, 235, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DoorOpen size={20} color="var(--accent-cyan)" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Vacant Units</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>{vacantCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', background: 'var(--color-white)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(214, 194, 161, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="var(--color-dark-brown)" />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Total Users</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>{totalUsersCount}</div>
          </div>
        </div>
      </div>



      {/* ---------------------------------------------------- */}
      {/* Row & Column Wise Data Table */}
      {/* ---------------------------------------------------- */}
      <div
        className="glass-panel"
        style={{
          borderRadius: 'var(--radius-lg)',
          background: 'var(--color-white)',
          border: '1px solid var(--border-card)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {/* Table Filter Controls */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
            <Search size={16} color="var(--text-dim)" />
            <input
              type="text"
              className="input-field"
              placeholder="Search by unit number, resident name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '4px', margin: 0, width: '100%' }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              id="filter-units-dropdown"
              className="input-field"
              style={{
                margin: 0,
                padding: '6px 12px',
                fontSize: '0.8rem',
                height: 'auto',
                minWidth: '160px',
                background: 'var(--color-white)',
                border: '1px solid var(--border-card)',
                fontWeight: 600,
                color: 'var(--color-dark-brown)',
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Units ({allUnitsData.length})</option>
              <option value="OCCUPIED">Occupied Units ({occupiedCount})</option>
              <option value="VACANT">Vacant Units ({vacantCount})</option>
              <optgroup label="Select Specific Unit">
                {allUnitsData.map((u) => {
                  const pureNum = String(u.rawNumber).replace(/^(home|flat|unit|villa)\s*/i, '').trim() || u.rawNumber;
                  return (
                    <option key={u.id} value={`UNIT_${u.rawNumber}`}>
                      Unit {pureNum} ({u.isOccupied ? 'Occupied' : 'Vacant'})
                    </option>
                  );
                })}
              </optgroup>
            </select>

            <select
              id="filter-resident-type-dropdown"
              className="input-field"
              style={{
                margin: 0,
                padding: '6px 12px',
                fontSize: '0.8rem',
                height: 'auto',
                minWidth: '120px',
                background: 'var(--color-white)',
                border: '1px solid var(--border-card)',
                fontWeight: 600,
                color: 'var(--color-dark-brown)',
              }}
              value={residentTypeFilter}
              onChange={(e) => setResidentTypeFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="OWNER">Owner</option>
              <option value="TENANT">Tenant</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase', width: '60px', textAlign: 'center' }}>
                  Sr. No
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Unit
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Home no.
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Type
                </th>
                {isFlat && (
                  <>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Tower
                    </th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Floor
                    </th>
                  </>
                )}
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Property Configuration
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Occupancy
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  User Name
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Resident Type
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Phone Number
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Email ID
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Move-In Date
                </th>
                <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>
                  User Details
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isFlat ? 14 : 12} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Loading residential units and residents...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={isFlat ? 14 : 12} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    {!currentSociety ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Home size={32} color="var(--color-clay)" style={{ opacity: 0.6 }} />
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-dark-brown)' }}>
                          No Society Registered Yet
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Please navigate to Society Management and create a Residential Society first.
                        </span>
                      </div>
                    ) : (
                      'No matching units or residents found.'
                    )}
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((u, index) => {
                  const res = u.resident;
                  const isOcc = u.isOccupied;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(214, 194, 161, 0.4)',
                        background: isOcc ? 'var(--color-white)' : 'rgba(250, 245, 237, 0.4)',
                        transition: 'background var(--transition-fast)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {/* Sr. No */}
                      <td style={{ padding: '14px 14px', fontWeight: 600, color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center' }}>
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      {/* Unit */}
                      <td style={{ padding: '14px 14px', fontWeight: 700 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: 'rgba(196, 154, 108, 0.16)',
                            color: 'var(--color-dark-brown)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          Unit {u.slotNumber}
                        </span>
                      </td>

                      {/* Home */}
                      <td style={{ padding: '14px 14px', fontWeight: 700, color: 'var(--color-dark-brown)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              background: isFlat
                                ? (isOcc ? 'rgba(107, 142, 90, 0.16)' : 'rgba(217, 119, 6, 0.14)')
                                : (isOcc ? 'rgba(107, 142, 90, 0.16)' : 'rgba(196, 154, 108, 0.22)'),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                            title={isFlat ? 'Flat Unit' : 'Bungalow'}
                          >
                            {isFlat ? (
                              <Building2
                                size={15}
                                color={isOcc ? 'var(--color-fern-green)' : 'var(--accent-amber)'}
                              />
                            ) : (
                              <Home
                                size={15}
                                color={isOcc ? 'var(--color-fern-green)' : 'var(--color-clay)'}
                              />
                            )}
                          </div>
                          <span style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                            {String(u.rawNumber).replace(/^(home|flat|unit|villa)\s*/i, '').trim() || u.rawNumber}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '14px 14px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            background: isFlat ? 'rgba(217, 119, 6, 0.12)' : 'rgba(196, 154, 108, 0.18)',
                            color: isFlat ? 'var(--accent-amber)' : 'var(--color-dark-brown)',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                          }}
                        >
                          {isFlat ? 'Flat' : 'Bungalow'}
                        </span>
                      </td>

                      {/* Tower & Floor (ONLY shown if FLAT) */}
                      {isFlat && (
                        <>
                          <td style={{ padding: '14px 14px', color: 'var(--text-main)', fontWeight: 600 }}>
                            {u.building_or_wing ? (
                              <span style={{ fontWeight: 700, color: 'var(--color-dark-brown)' }}>
                                Tower {String(u.building_or_wing).replace(/^Tower\s*/i, '')}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 14px', color: 'var(--text-muted)' }}>
                            {u.floor !== null && u.floor !== undefined && String(u.floor).trim() !== '' ? (
                              <span>Floor {u.floor}</span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>—</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Property Configuration */}
                      <td style={{ padding: '14px 14px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            background: 'rgba(196, 154, 108, 0.14)',
                            color: 'var(--color-dark-brown)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 700,
                          }}
                        >
                          {u.home_type || '2BHK'}
                        </span>
                      </td>

                      {/* Occupancy */}
                      <td style={{ padding: '14px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: isOcc ? 'rgba(107, 142, 90, 0.15)' : 'rgba(214, 194, 161, 0.35)',
                            color: isOcc ? 'var(--color-fern-green)' : 'var(--color-dark-brown)',
                          }}
                        >
                          {isOcc ? 'OCCUPIED' : 'VACANT'}
                        </span>
                      </td>

                      {/* Resident Name */}
                      <td style={{ padding: '14px 14px', fontWeight: 600, color: isOcc ? 'var(--color-dark-brown)' : 'var(--text-dim)' }}>
                        {isOcc ? (
                          <span style={{ fontWeight: 700, color: 'var(--color-dark-brown)' }}>{res.full_name}</span>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>— Vacant Unit —</span>
                        )}
                      </td>

                      {/* Resident Type */}
                      <td style={{ padding: '14px 14px' }}>
                        {isOcc ? (
                          <span className={`badge ${res.resident_type === 'OWNER' ? 'badge-OWNER' : 'badge-TENANT'}`} style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                            {res.resident_type}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Phone Number */}
                      <td style={{ padding: '14px 14px', color: 'var(--text-main)', fontSize: '0.82rem' }}>
                        {isOcc && res.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={13} color="var(--color-fern-green)" />
                            <span style={{ fontWeight: 600 }}>{res.phone}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '14px 14px', color: 'var(--text-main)', fontSize: '0.82rem' }}>
                        {isOcc && res.email ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={13} color="var(--accent-amber)" />
                            <span style={{ color: 'var(--color-dark-brown)' }}>{res.email}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Move-in Date */}
                      <td style={{ padding: '14px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {isOcc && res.move_in_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} color="var(--text-dim)" />
                            <span>{res.move_in_date.split('T')[0]}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* User Details */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {isOcc ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResident(res);
                              setShowUserDetailsModal(true);
                            }}
                            className="btn btn-outline"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.76rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 600,
                            }}
                            title="View User Details"
                          >
                            <Eye size={13} color="var(--color-clay)" />
                            <span>View Details</span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                            — Vacant —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar (10 per page) */}
        {filteredUnits.length > 0 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--color-dark-brown)' }}>{Math.min((currentPage - 1) * pageSize + 1, filteredUnits.length)}</strong> to{' '}
              <strong style={{ color: 'var(--color-dark-brown)' }}>{Math.min(currentPage * pageSize, filteredUnits.length)}</strong> of{' '}
              <strong style={{ color: 'var(--color-dark-brown)' }}>{filteredUnits.length}</strong> units
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--color-white)',
                  }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className="btn"
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      background: currentPage === pageNum ? 'var(--color-dark-brown)' : 'var(--color-white)',
                      color: currentPage === pageNum ? '#fff' : 'var(--color-dark-brown)',
                      border: '1px solid var(--border-card)',
                      cursor: 'pointer',
                    }}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--color-white)',
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODAL: Unified "Create Resident" (Merged Unit + Resident) */}
      {/* ---------------------------------------------------- */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', padding: '28px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: 0 }}>
                  Create Resident & Residential Unit
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Add residential unit configuration and primary resident login in one step.
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateResident}>
              {/* SECTION A: Residential Unit Details */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '18px', border: '1px solid var(--border-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-clay)', marginBottom: '12px' }}>
                  <Building2 size={16} />
                  <span>Residential Unit Information</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: (createForm.society_type === 'FLAT' || isFlat) ? 'repeat(auto-fit, minmax(110px, 1fr))' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  {/* Home No: Non-changeable */}
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Lock size={12} color="var(--text-muted)" />
                      <span>Home No</span>
                    </label>
                    <input
                      id="input-create-resident-unit"
                      type="text"
                      readOnly
                      required
                      className="input-field"
                      style={{
                        background: 'rgba(214, 194, 161, 0.22)',
                        cursor: 'not-allowed',
                        fontWeight: 700,
                        color: 'var(--color-dark-brown)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      title="Home Number is fixed for this unit and cannot be changed"
                      value={createForm.home_number}
                    />
                  </div>

                  {/* Type: Non-changeable */}
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Lock size={12} color="var(--text-muted)" />
                      <span>Type</span>
                    </label>
                    <input
                      id="input-create-resident-type"
                      type="text"
                      readOnly
                      className="input-field"
                      style={{
                        background: 'rgba(214, 194, 161, 0.22)',
                        cursor: 'not-allowed',
                        fontWeight: 600,
                        color: 'var(--color-dark-brown)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      title="Society Type is fixed and cannot be changed"
                      value={createForm.society_type === 'BUNGALOW' ? 'Bungalow' : 'Flat'}
                    />
                  </div>

                  {/* Tower: Non-changeable (only if Flat) */}
                  {(createForm.society_type === 'FLAT' || isFlat) && (
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Lock size={12} color="var(--text-muted)" />
                        <span>Tower</span>
                      </label>
                      <input
                        id="input-create-resident-tower"
                        type="text"
                        readOnly
                        className="input-field"
                        style={{
                          background: 'rgba(214, 194, 161, 0.22)',
                          cursor: 'not-allowed',
                          fontWeight: 700,
                          color: 'var(--color-dark-brown)',
                          border: '1px solid var(--border-subtle)',
                        }}
                        title="Tower is fixed for this flat and cannot be changed"
                        value={
                          createForm.building_or_wing
                            ? (String(createForm.building_or_wing).toLowerCase().startsWith('tower')
                                ? createForm.building_or_wing
                                : `Tower ${String(createForm.building_or_wing).replace(/^Tower\s*/i, '')}`)
                            : '—'
                        }
                      />
                    </div>
                  )}

                  {/* Floor: Non-changeable (only if Flat) */}
                  {(createForm.society_type === 'FLAT' || isFlat) && (
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Lock size={12} color="var(--text-muted)" />
                        <span>Floor</span>
                      </label>
                      <input
                        id="input-create-resident-floor"
                        type="text"
                        readOnly
                        className="input-field"
                        style={{
                          background: 'rgba(214, 194, 161, 0.22)',
                          cursor: 'not-allowed',
                          fontWeight: 700,
                          color: 'var(--color-dark-brown)',
                          border: '1px solid var(--border-subtle)',
                        }}
                        title="Floor is fixed for this flat and cannot be changed"
                        value={
                          createForm.floor !== '' && createForm.floor !== null && createForm.floor !== undefined
                            ? (String(createForm.floor).toLowerCase().startsWith('floor')
                                ? createForm.floor
                                : `Floor ${createForm.floor}`)
                            : '—'
                        }
                      />
                    </div>
                  )}

                  {/* Configuration */}
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Property Configuration *</label>
                    <select
                      id="select-create-resident-property-config"
                      className="input-field"
                      value={createForm.home_type || societyConfigs[0] || '2BHK'}
                      onChange={(e) => setCreateForm({ ...createForm, home_type: e.target.value })}
                    >
                      {societyConfigs.map((cfg) => (
                        <option key={cfg} value={cfg}>
                          {cfg === 'PENTHOUSE' ? 'Penthouse' : cfg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION B: Resident Account Details */}
              <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '18px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-fern-green)', marginBottom: '12px' }}>
                  <UserPlus size={16} />
                  <span>Resident Account & Credentials</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label className="input-label">Resident Full Name *</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="e.g. Amit Patel"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label className="input-label">Resident Type *</label>
                    <select
                      className="input-field"
                      value={createForm.resident_type}
                      onChange={(e) => setCreateForm({ ...createForm, resident_type: e.target.value })}
                    >
                      <option value="OWNER">OWNER (Property Owner)</option>
                      <option value="TENANT">TENANT (Rental Resident)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label className="input-label">Mobile Phone Number * (Login ID)</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="e.g. 9876543210"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label className="input-label">Password * (Login Pass)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="input-field"
                      placeholder="e.g. 123456"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Email (Optional)</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="resident@example.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Move-In Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={createForm.move_in_date}
                      onChange={(e) => setCreateForm({ ...createForm, move_in_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" id="btn-submit-create-resident" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Registering...' : 'Register Resident & Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Edit Resident */}
      {/* ---------------------------------------------------- */}
      {showEditModal && selectedResident && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Resident: {selectedResident.full_name}</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditResident}>
              <div className="input-group">
                <label className="input-label">Resident Full Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">Phone Number *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Resident Type</label>
                  <select
                    className="input-field"
                    value={editForm.resident_type}
                    onChange={(e) => setEditForm({ ...editForm, resident_type: e.target.value })}
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="TENANT">TENANT</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Email (Optional)</label>
                <input
                  type="email"
                  className="input-field"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Status</label>
                <select
                  className="input-field"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Reset Resident Password */}
      {/* ---------------------------------------------------- */}
      {showResetPasswordModal && selectedResident && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '24px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="var(--accent-amber)" />
                <h3 style={{ fontSize: '1.15rem' }}>Reset Password</h3>
              </div>
              <button onClick={() => setShowResetPasswordModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Set a new login password for resident <strong>{selectedResident.full_name}</strong> (Phone: {selectedResident.phone}).
            </p>

            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label className="input-label">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Enter new password (min 6 chars)"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowResetPasswordModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" id="btn-submit-reset-password" className="btn btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: View User Details (Read-Only) */}
      {/* ---------------------------------------------------- */}
      {showUserDetailsModal && selectedResident && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '26px',
              background: 'var(--color-white)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-card)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(196, 154, 108, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="var(--color-clay)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: 0 }}>
                    User Details
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Resident Information (Read-Only)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowUserDetailsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Read-Only Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '22px' }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  User Name
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-dark-brown)' }}>
                  {selectedResident.full_name || '—'}
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Resident Type
                </div>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: selectedResident.resident_type === 'OWNER' ? 'rgba(107, 142, 90, 0.15)' : 'rgba(135, 206, 235, 0.2)',
                      color: selectedResident.resident_type === 'OWNER' ? 'var(--color-fern-green)' : '#0284c7',
                    }}
                  >
                    {selectedResident.resident_type || 'OWNER'}
                  </span>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Phone Number
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-dark-brown)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={13} color="var(--color-clay)" />
                  <span>{selectedResident.phone || '—'}</span>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Email ID
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-dark-brown)', display: 'flex', alignItems: 'center', gap: '6px', wordBreak: 'break-all' }}>
                  <Mail size={13} color="var(--accent-amber)" />
                  <span>{selectedResident.email || '—'}</span>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Move-In Date
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-dark-brown)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} color="var(--text-dim)" />
                  <span>{selectedResident.move_in_date ? selectedResident.move_in_date.split('T')[0] : '—'}</span>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Home no.
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-dark-brown)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Home size={13} color="var(--color-clay)" />
                  <span>{selectedResident.home_number || '—'}</span>
                </div>
              </div>
            </div>

            {/* Strictly Close Button Only - Admin cannot perform any action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowUserDetailsModal(false)}
                className="btn btn-primary"
                style={{ padding: '8px 22px', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
