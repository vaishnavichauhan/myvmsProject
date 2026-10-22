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
} from 'lucide-react';
import { residentApi } from '../api/residentApi';
import { societyApi } from '../api/societyApi';
import apiClient from '../api/apiClient';
import { useAuthStore } from '../store/authStore';

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
  const [selectedResident, setSelectedResident] = useState(null);

  // Unified Form: Merges "Add Residential Unit" fields + "Resident Details"
  const defaultCreateForm = {
    // Residential Unit Fields
    home_number: '',
    building_or_wing: 'Wing A',
    floor: '1',
    home_type: '2BHK',
    society_id: '',
    // Resident Account Fields
    name: '',
    phone: '',
    email: '',
    password: 'Password@123',
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
      const [resRes, socRes, homesRes] = await Promise.all([
        residentApi.getResidents(),
        societyApi.getSocieties(),
        apiClient.get('/homes'),
      ]);

      const socList = socRes.data?.societies || socRes.societies || [];
      setSocieties(socList);

      const allResidents = resRes.data?.residents || [];
      setResidents(allResidents);

      const allHomes = homesRes.data?.homes || homesRes.homes || [];
      setHomes(allHomes);

      if (socList.length > 0) {
        setCreateForm((prev) => ({
          ...prev,
          society_id: socList[0].id,
          building_or_wing: socList[0].society_type === 'BUNGALOW' ? 'Row 1' : 'Wing A',
          home_type: socList[0].society_type === 'BUNGALOW' ? 'BUNGALOW' : '2BHK',
        }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch resident and unit data.');
    } finally {
      setLoading(false);
    }
  };

  // Active Society & Total capacity
  const currentSociety = societies[0] || null;
  const totalSocietyHomes = currentSociety?.total_homes || Math.max(homes.length, 10);

  // -------------------------------------------------------------
  // Auto-generate Row & Column Units data (e.g. Total 10 Homes auto-generated)
  // -------------------------------------------------------------
  const allUnitsData = useMemo(() => {
    // Map homes by normalized number
    const homeByNum = new Map();
    homes.forEach((h) => {
      homeByNum.set(String(h.home_number).toLowerCase(), h);
      const pureNum = String(h.home_number).replace(/^(home|flat|unit|villa)\s*/i, '').trim().toLowerCase();
      homeByNum.set(pureNum, h);
    });

    // Map residents by home_id and home_number
    const resByHomeId = new Map();
    const resByHomeNum = new Map();
    residents.forEach((r) => {
      if (r.home_id) resByHomeId.set(r.home_id, r);
      if (r.home_number) {
        resByHomeNum.set(String(r.home_number).toLowerCase(), r);
        const pureNum = String(r.home_number).replace(/^(home|flat|unit|villa)\s*/i, '').trim().toLowerCase();
        resByHomeNum.set(pureNum, r);
      }
    });

    const unitsList = [];
    const processedHomeIds = new Set();
    const processedHomeNums = new Set();

    // 1. Auto-generate sequential slots from 1 up to totalSocietyHomes (e.g. 1 to 10)
    for (let i = 1; i <= totalSocietyHomes; i++) {
      const numStr = String(i);
      const existing = homeByNum.get(numStr) || homeByNum.get(`home ${numStr}`);
      const res = (existing && resByHomeId.get(existing.id)) || resByHomeNum.get(numStr) || resByHomeNum.get(`home ${numStr}`) || null;

      if (existing) {
        processedHomeIds.add(existing.id);
        processedHomeNums.add(String(existing.home_number).toLowerCase());
      }

      const rawNum = existing?.home_number ? String(existing.home_number) : String(i);
      const displayLabel = existing?.home_number
        ? (String(existing.home_number).match(/^(home|flat|villa|unit)/i) ? existing.home_number : `Home ${existing.home_number}`)
        : `Home ${i}`;

      unitsList.push({
        id: existing?.id || `auto-slot-${i}`,
        home_id: existing?.id || null,
        displayNumber: displayLabel,
        rawNumber: rawNum,
        slotNumber: i,
        building_or_wing: existing?.building_or_wing || (currentSociety?.society_type === 'BUNGALOW' ? 'Row 1' : 'Wing A'),
        floor: existing?.floor ?? (Math.floor((i - 1) / 4) + 1),
        home_type: existing?.home_type || (currentSociety?.society_type === 'BUNGALOW' ? 'BUNGALOW' : '2BHK'),
        isConfigured: !!existing,
        isOccupied: !!res,
        resident: res,
      });
    }

    // 2. Include any existing homes in database that weren't captured by 1..totalSocietyHomes
    homes.forEach((h) => {
      const lower = String(h.home_number).toLowerCase();
      if (!processedHomeIds.has(h.id) && !processedHomeNums.has(lower)) {
        const res = resByHomeId.get(h.id) || resByHomeNum.get(lower) || null;
        unitsList.push({
          id: h.id,
          home_id: h.id,
          displayNumber: String(h.home_number).match(/^(home|flat|villa|unit)/i) ? h.home_number : `Home ${h.home_number}`,
          rawNumber: String(h.home_number),
          slotNumber: unitsList.length + 1,
          building_or_wing: h.building_or_wing || 'Wing A',
          floor: h.floor ?? 1,
          home_type: h.home_type || '2BHK',
          isConfigured: true,
          isOccupied: !!res,
          resident: res,
        });
      }
    });

    return unitsList;
  }, [homes, residents, currentSociety, totalSocietyHomes]);

  // Filtered rows for the Row-Column Data Table
  const filteredUnits = useMemo(() => {
    return allUnitsData.filter((u) => {
      const matchesSearch =
        u.displayNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.building_or_wing.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.resident?.full_name && u.resident.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.resident?.phone && u.resident.phone.includes(searchTerm));

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

  // Open "Create Resident" modal (optionally pre-fill unit #)
  const handleOpenCreateModal = (prefillUnitNumber = '') => {
    const defaultWing = currentSociety?.society_type === 'BUNGALOW' ? 'Row 1' : 'Wing A';
    const defaultType = currentSociety?.society_type === 'BUNGALOW' ? 'BUNGALOW' : '2BHK';

    setCreateForm({
      ...defaultCreateForm,
      society_id: currentSociety?.id || 1,
      home_number: prefillUnitNumber || '',
      building_or_wing: defaultWing,
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

      // Check if home already exists in DB
      let targetHome = homes.find(
        (h) => String(h.home_number).toLowerCase() === hNum.toLowerCase()
      );

      // If unit does not exist in DB, create it first
      if (!targetHome) {
        const homeRes = await societyApi.createHome(activeSocId, {
          home_number: hNum,
          building_or_wing: createForm.building_or_wing || 'Wing A',
          floor: createForm.floor ? parseInt(createForm.floor, 10) : 1,
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
        building_or_wing: createForm.building_or_wing,
        floor: createForm.floor,
        home_type: createForm.home_type,
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email ? createForm.email.trim() : null,
        password: createForm.password || 'Password@123',
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
          <button
            onClick={fetchInitialData}
            className="btn btn-outline"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            title="Refresh Units & Residents"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />

          </button>

          {isAdmin && (
            <button
              id="btn-create-resident"
              onClick={() => handleOpenCreateModal()}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              <span>Create Resident</span>
            </button>
          )}
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
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Primary Residents</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>{residents.length}</div>
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
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Unit #
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Wing / Tower
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Floor
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Unit Type
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Occupancy
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Resident Name
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Type
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Phone
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Move-In Date
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-dark-brown)', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Loading residential units and residents...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No matching units or residents found.
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((u) => {
                  const res = u.resident;
                  const isOcc = u.isOccupied;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(214, 194, 161, 0.4)',
                        background: isOcc ? 'var(--color-white)' : 'rgba(250, 245, 237, 0.4)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      {/* Unit Number */}
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-dark-brown)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '7px',
                              background: isOcc ? 'rgba(107, 142, 90, 0.16)' : 'rgba(217, 119, 6, 0.14)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Home
                              size={15}
                              color={isOcc ? 'var(--color-fern-green)' : 'var(--accent-amber)'}
                            />
                          </div>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                            {String(u.rawNumber).replace(/^(home|flat|unit|villa)\s*/i, '').trim() || u.rawNumber}
                          </span>
                        </div>
                      </td>

                      {/* Wing */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                        {u.building_or_wing}
                      </td>

                      {/* Floor */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        Floor {u.floor}
                      </td>

                      {/* Unit Type */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(196, 154, 108, 0.14)', color: 'var(--color-dark-brown)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {u.home_type}
                        </span>
                      </td>

                      {/* Occupancy */}
                      <td style={{ padding: '14px 16px' }}>
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
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: isOcc ? 'var(--color-dark-brown)' : 'var(--text-dim)' }}>
                        {isOcc ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                            <span>{res.full_name}</span>
                          </div>
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>— Vacant Unit —</span>
                        )}
                      </td>

                      {/* Resident Type */}
                      <td style={{ padding: '14px 16px' }}>
                        {isOcc ? (
                          <span className={`badge ${res.resident_type === 'OWNER' ? 'badge-OWNER' : 'badge-TENANT'}`} style={{ fontSize: '0.68rem' }}>
                            {res.resident_type}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontSize: '0.82rem' }}>
                        {isOcc ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={13} color="var(--color-fern-green)" />
                            <span>{res.phone}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Move-in Date */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {isOcc && res.move_in_date ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} color="var(--text-dim)" />
                            <span>{res.move_in_date.split('T')[0]}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        {isOcc ? (
                          <span className={`badge ${res.status === 'ACTIVE' ? 'badge-COMMITTEE_MEMBER' : 'badge-ADMIN'}`} style={{ fontSize: '0.65rem' }}>
                            {res.status}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Available</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isOcc ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedResident(res);
                                    setEditForm({
                                      name: res.full_name,
                                      phone: res.phone,
                                      email: res.email || '',
                                      resident_type: res.resident_type,
                                      status: res.status,
                                    });
                                    setShowEditModal(true);
                                  }}
                                  className="btn btn-outline"
                                  style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                                  title="Edit Resident"
                                >
                                  <Edit2 size={13} />
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedResident(res);
                                    setNewPasswordInput('');
                                    setShowResetPasswordModal(true);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                                  title="Reset Password"
                                >
                                  <KeyRound size={13} color="var(--accent-amber)" />
                                </button>

                                <button
                                  onClick={() => handleToggleStatus(res)}
                                  className="btn btn-outline"
                                  style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                                  title={res.status === 'ACTIVE' ? 'Deactivate Resident' : 'Activate Resident'}
                                >
                                  <Power size={13} color={res.status === 'ACTIVE' ? '#fb7185' : '#34d399'} />
                                </button>

                                <button
                                  onClick={() => handleDeleteResident(res)}
                                  className="btn btn-danger"
                                  style={{ padding: '6px 8px', fontSize: '0.72rem' }}
                                  title="Delete Resident"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          isAdmin && (
                            <button
                              onClick={() => handleOpenCreateModal(u.rawNumber)}
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Plus size={12} />
                              <span>Create Resident</span>
                            </button>
                          )
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="input-group" style={{ marginBottom: '8px' }}>
                    <label className="input-label">Home / Unit Number *</label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      placeholder="e.g. Home 3, 101, Villa 4"
                      value={createForm.home_number}
                      onChange={(e) => setCreateForm({ ...createForm, home_number: e.target.value })}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: '8px' }}>
                    <label className="input-label">Building / Wing</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Wing A, Tower 1"
                      value={createForm.building_or_wing}
                      onChange={(e) => setCreateForm({ ...createForm, building_or_wing: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Floor</label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      placeholder="e.g. 1"
                      value={createForm.floor}
                      onChange={(e) => setCreateForm({ ...createForm, floor: e.target.value })}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Unit Type</label>
                    <select
                      className="input-field"
                      value={createForm.home_type}
                      onChange={(e) => setCreateForm({ ...createForm, home_type: e.target.value })}
                    >
                      <option value="1BHK">1BHK</option>
                      <option value="2BHK">2BHK</option>
                      <option value="3BHK">3BHK</option>
                      <option value="4BHK">4BHK</option>
                      <option value="BUNGALOW">BUNGALOW</option>
                      <option value="VILLA">VILLA</option>
                      <option value="PENTHOUSE">PENTHOUSE</option>
                      <option value="STUDIO">STUDIO</option>
                      <option value="OTHER">OTHER</option>
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
                      placeholder="Min 6 characters"
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

    </div>
  );
}
