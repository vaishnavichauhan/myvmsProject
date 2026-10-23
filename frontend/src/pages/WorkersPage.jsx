import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Phone,
  Clock,
  ShieldCheck,
  Edit2,
  Trash2,
  Search,
  X,
  RefreshCw,
  Home,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Info,
  Building2,
  UserCheck,
  Key,
  Sparkles,
  Car,
  Wrench,
  Zap,
  Utensils,
  BadgeCheck,
} from 'lucide-react';
import { workerApi } from '../api/workerApi';
import { societyApi } from '../api/societyApi';
import { useAuthStore } from '../store/authStore';

const WORKER_TYPES = [
  {
    value: 'ALL',
    label: 'All Workers',
    color: '#6E5D53',
    border: 'var(--color-sand)',
    bg: 'rgba(214, 194, 161, 0.22)',
    circleBg: 'linear-gradient(135deg, rgba(214, 194, 161, 0.28) 0%, rgba(196, 154, 108, 0.28) 100%)',
    glow: 'rgba(196, 154, 108, 0.22)',
    icon: Briefcase,
  },
  {
    value: 'DRIVER',
    label: 'Driver',
    color: '#0284c7',
    border: '#38bdf8',
    bg: 'rgba(2, 132, 199, 0.12)',
    circleBg: 'linear-gradient(135deg, rgba(2, 132, 199, 0.16) 0%, rgba(56, 189, 248, 0.24) 100%)',
    glow: 'rgba(2, 132, 199, 0.24)',
    icon: Car,
  },
  {
    value: 'MAID',
    label: 'Maid',
    color: '#9333ea',
    border: '#c084fc',
    bg: 'rgba(147, 51, 234, 0.12)',
    circleBg: 'linear-gradient(135deg, rgba(147, 51, 234, 0.16) 0%, rgba(192, 132, 252, 0.24) 100%)',
    glow: 'rgba(147, 51, 234, 0.24)',
    icon: Sparkles,
  },
  {
    value: 'COOK',
    label: 'Cook',
    color: '#d97706',
    border: '#fbbf24',
    bg: 'rgba(217, 119, 6, 0.12)',
    circleBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.16) 0%, rgba(245, 158, 11, 0.24) 100%)',
    glow: 'rgba(217, 119, 6, 0.24)',
    icon: Utensils,
  },
  {
    value: 'GARDENER',
    label: 'Gardener',
    color: '#059669',
    border: '#34d399',
    bg: 'rgba(5, 150, 105, 0.12)',
    circleBg: 'linear-gradient(135deg, rgba(5, 150, 105, 0.16) 0%, rgba(16, 185, 129, 0.24) 100%)',
    glow: 'rgba(5, 150, 105, 0.24)',
    icon: Sparkles,
  },
  {
    value: 'CLEANER',
    label: 'Cleaner',
    color: '#0891b2',
    border: '#22d3ee',
    bg: 'rgba(8, 145, 178, 0.12)',
    circleBg: 'linear-gradient(135deg, rgba(8, 145, 178, 0.16) 0%, rgba(6, 182, 212, 0.24) 100%)',
    glow: 'rgba(8, 145, 178, 0.24)',
    icon: Sparkles,
  },
  {
    value: 'PLUMBER',
    label: 'Plumber',
    color: '#2563eb',
    border: '#60a5fa',
    bg: 'rgba(37, 99, 235, 0.12)',
    circleBg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.16) 0%, rgba(96, 165, 250, 0.24) 100%)',
    glow: 'rgba(37, 99, 235, 0.24)',
    icon: Wrench,
  },
  {
    value: 'ELECTRICIAN',
    label: 'Electrician',
    color: '#ea580c',
    border: '#fb923c',
    bg: 'rgba(234, 88, 12, 0.12)',
    circleBg: 'linear-gradient(135deg, rgba(234, 88, 12, 0.16) 0%, rgba(251, 146, 60, 0.24) 100%)',
    glow: 'rgba(234, 88, 12, 0.24)',
    icon: Zap,
  },
  {
    value: 'OTHER',
    label: 'Other Staff',
    color: '#C49A6C',
    border: '#D9C3B0',
    bg: 'rgba(196, 154, 108, 0.12)',
    circleBg: 'linear-gradient(135deg, rgba(196, 154, 108, 0.16) 0%, rgba(214, 194, 161, 0.24) 100%)',
    glow: 'rgba(196, 154, 108, 0.24)',
    icon: Briefcase,
  },
];

export default function WorkersPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isResident = ['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user?.role);
  const canModify = ['OWNER', 'TENANT', 'FAMILY_MEMBER', 'ADMIN'].includes(user?.role);

  const [workers, setWorkers] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Resident Add Worker Modal State: tab between "EXISTING" and "NEW"
  const [addMode, setAddMode] = useState('EXISTING'); // 'EXISTING' | 'NEW'
  const [selectedWorkerType, setSelectedWorkerType] = useState('GARDENER');
  const [existingWorkersList, setExistingWorkersList] = useState([]);
  const [searchingExisting, setSearchingExisting] = useState(false);
  const [selectedExistingWorkerId, setSelectedExistingWorkerId] = useState('');

  // Forms
  const [existingForm, setExistingForm] = useState({
    expected_time_in: '08:00',
    expected_time_out: '19:00',
  });

  const [newWorkerForm, setNewWorkerForm] = useState({
    name: '',
    phone: '',
    worker_type: 'GARDENER',
    address: '',
    photo_url: '',
    expected_time_in: '08:00',
    expected_time_out: '19:00',
  });

  // Admin Worker Form (Admin creates worker in society pool WITHOUT assigning home)
  const [adminWorkerForm, setAdminWorkerForm] = useState({
    name: '',
    phone: '',
    worker_type: 'GARDENER',
    society_id: '',
    address: '',
    photo_url: '',
    police_verified: true,
  });

  const [editForm, setEditForm] = useState({
    expected_time_in: '08:00',
    expected_time_out: '19:00',
    status: 'ACTIVE',
    name: '',
    phone: '',
    address: '',
    worker_type: 'GARDENER',
  });

  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const socRes = await societyApi.getSocieties();
        const socList = socRes.data?.societies || socRes.societies || [];
        setSocieties(socList);
        if (socList.length > 0) {
          setAdminWorkerForm((p) => ({ ...p, society_id: socList[0].id }));
        }
      }
      await fetchWorkers('ALL');
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async (socId = selectedSocietyId) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = {};
      if (isAdmin && socId && socId !== 'ALL') {
        params.societyId = socId;
      }
      const res = await workerApi.getHomeWorkers(null, params);
      setWorkers(res.data?.workers || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load workers.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocietyChange = (socId) => {
    setSelectedSocietyId(socId);
    fetchWorkers(socId);
  };

  // When Add Modal opens or worker type changes, load matching existing workers in society
  useEffect(() => {
    if (showAddModal && isResident && addMode === 'EXISTING') {
      fetchExistingWorkersForDropdown(selectedWorkerType);
    }
  }, [showAddModal, selectedWorkerType, addMode]);

  const fetchExistingWorkersForDropdown = async (type) => {
    setSearchingExisting(true);
    try {
      const targetSocId = isAdmin
        ? (selectedSocietyId !== 'ALL' ? selectedSocietyId : null)
        : (user?.societyId || null);

      const res = await workerApi.searchWorkers(type, null, null, targetSocId);
      const list = res.data?.workers || [];
      setExistingWorkersList(list);

      const firstAvailable = list.find((w) => !w.already_connected_to_my_home);
      setSelectedExistingWorkerId(firstAvailable ? String(firstAvailable.id) : list[0] ? String(list[0].id) : '');
    } catch (err) {
      console.error('Failed to search workers:', err);
    } finally {
      setSearchingExisting(false);
    }
  };

  // ==========================================
  // HANDLERS
  // ==========================================

  // Admin: Register Society Worker (No Home assigned directly)
  const handleAdminCreateWorker = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const targetSocId = adminWorkerForm.society_id || (selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0]?.id) || 1;

    try {
      await workerApi.createWorker({
        ...adminWorkerForm,
        society_id: targetSocId,
      });

      setSuccessMsg(`Society worker "${adminWorkerForm.name}" (${adminWorkerForm.worker_type}) registered in society pool! Residents can now assign this helper.`);
      setShowAddModal(false);
      setAdminWorkerForm({
        name: '',
        phone: '',
        worker_type: 'GARDENER',
        society_id: targetSocId,
        address: '',
        photo_url: '',
        police_verified: true,
      });
      fetchWorkers(selectedSocietyId);
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register society worker.');
    }
  };

  // Resident: Link Existing Worker to My Home
  const handleAddExistingWorker = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedExistingWorkerId) {
      setErrorMsg('Please select an existing worker from the dropdown.');
      return;
    }

    try {
      await workerApi.addExistingWorker({
        worker_id: selectedExistingWorkerId,
        expected_time_in: existingForm.expected_time_in,
        expected_time_out: existingForm.expected_time_out,
      });

      setSuccessMsg('Existing worker successfully assigned to your home!');
      setShowAddModal(false);
      fetchWorkers(selectedSocietyId);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign existing worker.');
    }
  };

  // Resident: Create New Worker & Link to My Home
  const handleResidentCreateNewWorker = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      await workerApi.createNewWorker({
        ...newWorkerForm,
        worker_type: selectedWorkerType === 'ALL' ? 'GARDENER' : selectedWorkerType,
      });

      setSuccessMsg(`Worker "${newWorkerForm.name}" registered and assigned to your home!`);
      setShowAddModal(false);
      setNewWorkerForm({
        name: '',
        phone: '',
        worker_type: 'GARDENER',
        address: '',
        photo_url: '',
        expected_time_in: '08:00',
        expected_time_out: '19:00',
      });
      fetchWorkers(selectedSocietyId);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create worker.');
    }
  };

  // Edit Assignment / Timings
  const handleEditAssignment = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (selectedAssignment.assignment_id) {
        await workerApi.updateAssignment(selectedAssignment.assignment_id, editForm);
      }
      setSuccessMsg('Worker duty hours and relationship updated!');
      setShowEditModal(false);
      fetchWorkers(selectedSocietyId);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update worker relationship.');
    }
  };

  // Resident / Family Member: Remove/Delete Worker from Home
  const handleRemoveWorkerFromHome = async (worker) => {
    if (
      !window.confirm(
        `Are you sure you want to delete/remove ${worker.full_name} (${worker.worker_type}) from your home? This worker will remain available in the society pool.`
      )
    ) {
      return;
    }

    try {
      await workerApi.removeWorker(worker.assignment_id);
      setSuccessMsg(`${worker.full_name} was removed from your home.`);
      fetchWorkers(selectedSocietyId);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove worker.');
    }
  };

  // Admin: Delete Master Worker Record from Society
  const handleDeleteWorkerFromSociety = async (worker) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${worker.full_name} (${worker.worker_type}) from the society database? All home links will be removed.`
      )
    ) {
      return;
    }

    try {
      await workerApi.deleteWorker(worker.worker_id || worker.id);
      setSuccessMsg(`Worker ${worker.full_name} deleted from society.`);
      fetchWorkers(selectedSocietyId);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete worker.');
    }
  };

  const typeCounts = useMemo(() => {
    const counts = { ALL: workers.length };
    WORKER_TYPES.forEach((t) => {
      if (t.value !== 'ALL') {
        counts[t.value] = workers.filter((w) => w.worker_type === t.value).length;
      }
    });
    return counts;
  }, [workers]);

  const filteredWorkers = workers.filter((w) => {
    const matchesSearch =
      w.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.pass_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.all_assigned_homes && w.all_assigned_homes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (w.society_name && w.society_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'ALL' || w.worker_type === filterType;
    return matchesSearch && matchesType;
  });

  const getInitials = (name) => {
    if (!name) return 'W';
    const parts = name.trim().split(/[\s-]+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const str = String(timeStr).slice(0, 5);
    const parts = str.split(':');
    if (parts.length < 2) return str;
    const hour = parseInt(parts[0], 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${parts[1]} ${ampm}`;
  };

  const getWorkerTypeBadge = (type) => {
    const match = WORKER_TYPES.find((t) => t.value === type);
    return (
      match || {
        value: type,
        label: type || 'Domestic Worker',
        color: '#C49A6C',
        border: '#D9C3B0',
        bg: 'rgba(196, 154, 108, 0.12)',
        circleBg: 'linear-gradient(135deg, rgba(196, 154, 108, 0.16) 0%, rgba(214, 194, 161, 0.24) 100%)',
        glow: 'rgba(196, 154, 108, 0.24)',
        icon: Briefcase,
      }
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Briefcase size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>
              {isAdmin ? 'Society Worker Management' : 'Home Worker Management'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {isAdmin
                ? 'Register society helpers (Gardeners, Maids, Drivers) and track resident home allocations.'
                : `Manage helpers, drivers, maids, cooks, and cleaners assigned to your home (${user?.flatNumber ? 'Home ' + user.flatNumber : ''}).`}
            </p>
          </div>
        </div>

        {/* Top Right Actions: Refresh Button + Add Worker Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchWorkers(selectedSocietyId)}
            className="btn btn-outline"
            style={{
              padding: '10px 14px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--color-white)',
              border: '1px solid var(--border-card)',
              color: 'var(--color-dark-brown)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Refresh workers list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {canModify && (
            <button
              id="btn-add-worker-modal"
              onClick={() => {
                if (isAdmin) {
                  if (societies.length > 0 && !adminWorkerForm.society_id) {
                    const defSoc = selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0].id;
                    setAdminWorkerForm((p) => ({ ...p, society_id: defSoc }));
                  }
                } else {
                  setAddMode('EXISTING');
                  setSelectedWorkerType('GARDENER');
                }
                setShowAddModal(true);
              }}
              className="btn btn-primary"
              style={{
                padding: '10px 18px',
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Plus size={16} />
              <span>{isAdmin ? 'Register Society Worker' : 'Add Worker to My Home'}</span>
            </button>
          )}
        </div>
      </div>


      {/* Success / Error Alerts */}
      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fb7185',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Controls Bar: Society Selector (Admin) + Search Bar + Worker Type Pills */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: 'var(--color-white)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Row 1: Society Switcher + Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Admin Society Switcher or Active Badge */}
          {isAdmin && (
            societies.length > 1 ? (
              <div style={{ minWidth: 220, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="var(--color-clay)" />
                <select
                  className="input-field"
                  style={{ marginBottom: 0, padding: '9px 12px', fontSize: '0.85rem', fontWeight: 600 }}
                  value={selectedSocietyId}
                  onChange={(e) => handleSocietyChange(e.target.value)}
                >
                  <option value="ALL">All Societies ({societies.length})</option>
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || `ID: ${s.id}`})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--color-dark-brown)',
                }}
              >
                <Building2 size={16} color="var(--color-clay)" />
                <span>{societies[0]?.name || ''}</span>
              </div>
            )
          )}

          {/* Search Bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={17} color="var(--text-dim)" style={{ position: 'absolute', left: 14, top: 12 }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by worker name, phone, pass code, or home..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 40, marginBottom: 0 }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: 2,
                }}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Worker Type Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingTop: '2px',
            paddingBottom: '2px',
            scrollbarWidth: 'thin',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginRight: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            Worker Type:
          </span>

          {WORKER_TYPES.map((t) => {
            const isActive = filterType === t.value;
            const count = typeCounts[t.value] || 0;

            return (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className="btn"
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s ease-in-out',
                  background: isActive ? 'var(--color-dark-brown)' : 'var(--bg-tertiary)',
                  color: isActive ? '#ffffff' : 'var(--color-dark-brown)',
                  border: isActive ? '1px solid var(--color-dark-brown)' : '1px solid var(--border-subtle)',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                }}
              >
                <span>{t.label}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255, 255, 255, 0.22)' : 'rgba(214, 194, 161, 0.45)',
                    color: isActive ? '#ffffff' : 'var(--color-dark-brown)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workers Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading workers...</div>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <Briefcase size={48} color="var(--text-dim)" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
          <h3>{isAdmin ? 'No Registered Workers Found' : 'No Workers Assigned to Your Home'}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px', maxWidth: '440px', margin: '6px auto 16px' }}>
            {isAdmin
              ? 'Use "Register Society Worker" to add general helpers (Gardeners, Maids, Drivers) for this society.'
              : 'Use the "Add Worker" button to select an existing gardener, maid, or driver from the society, or register a new helper.'}
          </p>
          {canModify && (
            <button
              onClick={() => {
                if (isAdmin) {
                  if (societies.length > 0 && !adminWorkerForm.society_id) {
                    setAdminWorkerForm((p) => ({ ...p, society_id: societies[0].id }));
                  }
                } else {
                  setAddMode('EXISTING');
                  setSelectedWorkerType('GARDENER');
                }
                setShowAddModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>{isAdmin ? 'Register Society Worker' : 'Add Worker Now'}</span>
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '24px',
            alignItems: 'stretch',
          }}
        >
          {filteredWorkers.map((w) => {
            const badge = getWorkerTypeBadge(w.worker_type);
            const RoleIcon = badge.icon || Briefcase;
            const assignedHomes = w.all_assigned_homes || (w.home_number ? String(w.home_number) : null);

            return (
              <div
                key={w.assignment_id || w.id}
                className="glass-panel"
                style={{
                  background: '#FFFFFF',
                  border: `2px solid ${badge.border}`,
                  borderRadius: '20px',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  textAlign: 'left',
                  boxShadow: `0 6px 20px ${badge.glow}`,
                  position: 'relative',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 28px ${badge.glow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${badge.glow}`;
                }}
              >
                {/* TOP SECTION: Left side top avatar + Right side name and title */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    width: '100%',
                    marginBottom: '14px',
                  }}
                >
                  {/* LEFT SIDE TOP: SQUARE AVATAR */}
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '14px',
                      background: badge.circleBg || '#FAF6EE',
                      border: `2px solid ${badge.border}`,
                      boxShadow: `0 4px 12px ${badge.glow || 'rgba(0,0,0,0.06)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {w.photo_url ? (
                      <img
                        src={w.photo_url}
                        alt={w.full_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '1.75rem',
                          fontWeight: 900,
                          color: badge.color,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {getInitials(w.full_name)}
                      </span>
                    )}
                  </div>

                  {/* RIGHT SIDE: NAME AND TITLE */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Worker Full Name */}
                    <h3
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--color-dark-brown)',
                        margin: '0 0 4px 0',
                        wordBreak: 'break-word',
                        lineHeight: 1.25,
                      }}
                    >
                      {w.full_name}
                    </h3>

                    {/* Role / Worker Title Tag */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.03em',
                        marginBottom: '4px',
                      }}
                    >

                      <span>{badge.label.toUpperCase()}</span>
                    </div>



                    {/* Society Name if available */}
                    {w.society_name && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                        {w.society_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Gate Passcode Monospace Chip */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1.5px dashed rgba(139, 92, 246, 0.35)',
                    padding: '4px 12px',
                    borderRadius: '10px',
                    marginBottom: '14px',
                    width: 'fit-content',
                  }}
                >
                  <Key size={13} color="#7c3aed" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6d28d9' }}>Gate Pass:</span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: '#5b21b6',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {w.pass_code || 'PASS-STD'}
                  </span>
                </div>

                {/* Works For / Home Allocation Banner */}
                <div
                  style={{
                    width: '100%',
                    background: '#FAF6EE',
                    border: '1px solid #EFE9E1',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  <Home size={15} color="var(--color-clay)" style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      color: assignedHomes ? 'var(--color-dark-brown)' : 'var(--color-clay)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {assignedHomes
                      ? assignedHomes.split(',').map((h) => `Unit ${h.trim()}`).join(', ')
                      : 'Society Pool (Available)'}
                  </span>
                </div>

                {/* Contact & Shift Timing Details */}
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    marginBottom: '16px',
                    textAlign: 'left',
                    padding: '0 4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} color="#059669" />
                    <span><strong>Phone:</strong> {w.phone || 'N/A'}</span>
                  </div>

                  {(w.expected_time_in || w.expected_time_out) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={14} color="#d97706" />
                      <span>
                        <strong>Duty Hours:</strong> {formatTime(w.expected_time_in)} - {formatTime(w.expected_time_out)}
                      </span>
                    </div>
                  )}

                  {w.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} color="var(--color-clay)" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.address}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                {canModify && (
                  <div
                    style={{
                      marginTop: 'auto',
                      width: '100%',
                      paddingTop: '14px',
                      borderTop: '1px solid var(--color-sand)',
                      display: 'flex',
                      gap: '8px',
                    }}
                  >
                    {/* If resident or assignment exists */}
                    {w.assignment_id && (
                      <>
                        <button
                          id={`btn-delete-worker-${w.assignment_id || w.worker_id || w.id}`}
                          onClick={() => handleRemoveWorkerFromHome(w)}
                          className="btn btn-danger"
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                          title="Remove worker from this home"
                        >
                          <Trash2 size={14} />
                          <span>{isAdmin ? 'Delete' : 'Remove'}</span>
                        </button>
                      </>
                    )}

                    {/* If resident viewing unassigned pool worker */}
                    {!w.assignment_id && isResident && (
                      <button
                        onClick={() => {
                          setSelectedWorkerType(w.worker_type);
                          setSelectedExistingWorkerId(String(w.id || w.worker_id));
                          setAddMode('EXISTING');
                          setShowAddModal(true);
                        }}
                        className="btn btn-primary"
                        style={{
                          width: '100%',
                          padding: '8px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Plus size={14} />
                        <span>Assign to My Home</span>
                      </button>
                    )}

                    {/* If Admin viewing master record */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteWorkerFromSociety(w)}
                        className="btn btn-danger"
                        style={{
                          width: '100%',
                          padding: '8px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                        title="Delete worker from society database"
                      >
                        <Trash2 size={14} />
                        <span>Delete Worker</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: ADD WORKER                                                  */}
      {/* (Admin: Society Pool | Resident: Select Existing or Register New)  */}
      {/* ------------------------------------------------------------------ */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '28px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {isAdmin ? 'Register Society Helper' : 'Add Helper to My Home'}
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {isAdmin
                    ? 'Register a verified worker into the society pool. No home number is assigned directly.'
                    : `Connect an existing society worker or register a new helper for your home.`}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* ======================================================== */}
            {/* VIEW A: ADMIN REGISTERS SOCIETY WORKER                    */}
            {/* ======================================================== */}
            {isAdmin ? (
              <form onSubmit={handleAdminCreateWorker}>
                {/* Target Society */}
                <div className="input-group">
                  <label className="input-label">Target Society *</label>
                  <select
                    required
                    className="input-field"
                    value={adminWorkerForm.society_id}
                    onChange={(e) => setAdminWorkerForm({ ...adminWorkerForm, society_id: e.target.value })}
                  >
                    {societies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code || `ID: ${s.id}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Worker Type *</label>
                  <select
                    className="input-field"
                    value={adminWorkerForm.worker_type}
                    onChange={(e) => setAdminWorkerForm({ ...adminWorkerForm, worker_type: e.target.value })}
                  >
                    {WORKER_TYPES.filter((t) => t.value !== 'ALL').map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Worker Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. BHURI"
                    value={adminWorkerForm.name}
                    onChange={(e) => setAdminWorkerForm({ ...adminWorkerForm, name: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Phone Number * (10 Digits)</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. 9876543210"
                    value={adminWorkerForm.phone}
                    onChange={(e) => setAdminWorkerForm({ ...adminWorkerForm, phone: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Address / Local Details (Optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Staff Quarters, Nearby Area"
                    value={adminWorkerForm.address}
                    onChange={(e) => setAdminWorkerForm({ ...adminWorkerForm, address: e.target.value })}
                  />
                </div>

                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--accent-amber)',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginTop: '8px',
                  }}
                >
                  ℹ️ <strong>Admin Notice:</strong> Admin registers helpers into the general society pool. No home number is assigned directly. Residents log in and assign helpers to their homes.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Register Society Helper
                  </button>
                </div>
              </form>
            ) : (
              /* ======================================================== */
              /* VIEW B: RESIDENT (Select Existing OR Create New)         */
              /* ======================================================== */
              <div>
                {/* Step 1: Worker Type Filter */}
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label className="input-label">Worker Type *</label>
                  <select
                    className="input-field"
                    value={selectedWorkerType}
                    onChange={(e) => {
                      setSelectedWorkerType(e.target.value);
                      setNewWorkerForm({ ...newWorkerForm, worker_type: e.target.value });
                    }}
                  >
                    {WORKER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Tab Switcher: [ Select Existing ] OR [ + Create New Worker ] */}
                <div
                  style={{
                    display: 'flex',
                    background: 'var(--bg-tertiary)',
                    padding: '4px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '20px',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  <button
                    type="button"
                    id="tab-existing-worker"
                    onClick={() => setAddMode('EXISTING')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: addMode === 'EXISTING' ? 'var(--primary)' : 'transparent',
                      color: addMode === 'EXISTING' ? '#fff' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    Select Existing {WORKER_TYPES.find((t) => t.value === selectedWorkerType)?.label}
                  </button>

                  <button
                    type="button"
                    id="tab-create-worker"
                    onClick={() => setAddMode('NEW')}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: addMode === 'NEW' ? 'var(--primary)' : 'transparent',
                      color: addMode === 'NEW' ? '#fff' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    + Create New Worker
                  </button>
                </div>

                {/* TAB 1: SELECT EXISTING WORKER */}
                {addMode === 'EXISTING' && (
                  <form onSubmit={handleAddExistingWorker}>
                    <div className="input-group">
                      <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          Choose registered {WORKER_TYPES.find((t) => t.value === selectedWorkerType)?.label.toLowerCase()} in society:
                        </span>
                        <span style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 600 }}>
                          {existingWorkersList.length} Found
                        </span>
                      </label>

                      {searchingExisting ? (
                        <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Searching society helpers...
                        </div>
                      ) : existingWorkersList.length === 0 ? (
                        <div
                          style={{
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-tertiary)',
                            border: '1px dashed var(--border-card)',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                          }}
                        >
                          No registered {WORKER_TYPES.find((t) => t.value === selectedWorkerType)?.label.toLowerCase()} found in society.
                          <div style={{ marginTop: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setAddMode('NEW')}
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                            >
                              + Register New {WORKER_TYPES.find((t) => t.value === selectedWorkerType)?.label} Instead
                            </button>
                          </div>
                        </div>
                      ) : (
                        <select
                          id="select-existing-worker"
                          required
                          className="input-field"
                          value={selectedExistingWorkerId}
                          onChange={(e) => setSelectedExistingWorkerId(e.target.value)}
                        >
                          <option value="">-- Choose Existing Worker ({existingWorkersList.length} Available) --</option>
                          {existingWorkersList.map((ew) => (
                            <option key={ew.id} value={ew.id} disabled={ew.already_connected_to_my_home}>
                              {ew.full_name} — {ew.phone} ({ew.worker_type}){' '}
                              {ew.active_home_numbers
                                ? `[Works for: Home ${ew.active_home_numbers}]`
                                : '[Society Pool Staff]'}{' '}
                              {ew.already_connected_to_my_home ? '✓ [Already in your home]' : '[Available to hire]'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Duty Timings */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
                      <div className="input-group">
                        <label className="input-label">Expected Time In</label>
                        <input
                          type="time"
                          className="input-field"
                          value={existingForm.expected_time_in}
                          onChange={(e) => setExistingForm({ ...existingForm, expected_time_in: e.target.value })}
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Expected Time Out</label>
                        <input
                          type="time"
                          className="input-field"
                          value={existingForm.expected_time_out}
                          onChange={(e) => setExistingForm({ ...existingForm, expected_time_out: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                      <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        id="btn-submit-add-existing"
                        className="btn btn-primary"
                        disabled={!selectedExistingWorkerId || existingWorkersList.length === 0}
                      >
                        Add Worker to My Home
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB 2: CREATE NEW WORKER */}
                {addMode === 'NEW' && (
                  <form onSubmit={handleResidentCreateNewWorker}>
                    <div className="input-group">
                      <label className="input-label">Worker Full Name *</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        placeholder="e.g. Ramesh"
                        value={newWorkerForm.name}
                        onChange={(e) => setNewWorkerForm({ ...newWorkerForm, name: e.target.value })}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Phone Number *</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        placeholder="e.g. 9876543222"
                        value={newWorkerForm.phone}
                        onChange={(e) => setNewWorkerForm({ ...newWorkerForm, phone: e.target.value })}
                      />
                    </div>

                    {/* Timings */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="input-group">
                        <label className="input-label">Time In</label>
                        <input
                          type="time"
                          className="input-field"
                          value={newWorkerForm.expected_time_in}
                          onChange={(e) => setNewWorkerForm({ ...newWorkerForm, expected_time_in: e.target.value })}
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Time Out</label>
                        <input
                          type="time"
                          className="input-field"
                          value={newWorkerForm.expected_time_out}
                          onChange={(e) => setNewWorkerForm({ ...newWorkerForm, expected_time_out: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Address (Optional)</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Local Staff Quarter, Village"
                        value={newWorkerForm.address}
                        onChange={(e) => setNewWorkerForm({ ...newWorkerForm, address: e.target.value })}
                      />
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        background: 'rgba(99, 102, 241, 0.1)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        marginTop: '10px',
                      }}
                    >
                      💡 When registered, this helper will be assigned to your home and will also be visible to the society admin.
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                      <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button type="submit" id="btn-submit-create-new-worker" className="btn btn-primary">
                        + Create & Assign to My Home
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: EDIT WORKER DUTY TIMINGS                                    */}
      {/* ------------------------------------------------------------------ */}
      {showEditModal && selectedAssignment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Edit Timings: {selectedAssignment.full_name}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditAssignment}>
              <div className="input-group">
                <label className="input-label">Worker Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Worker full name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Phone number"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Time In</label>
                  <input
                    type="time"
                    className="input-field"
                    value={editForm.expected_time_in}
                    onChange={(e) => setEditForm({ ...editForm, expected_time_in: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Time Out</label>
                  <input
                    type="time"
                    className="input-field"
                    value={editForm.expected_time_out}
                    onChange={(e) => setEditForm({ ...editForm, expected_time_out: e.target.value })}
                  />
                </div>
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
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
    </div>
  );
}
