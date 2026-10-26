import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Clock,
  Phone,
  PhoneCall,
  UserCheck,
  DoorOpen,
  MapPin,
  UserPlus,
  Search,

  ExternalLink,
  ShieldCheck,
  Lock,
  Building2,
  ArrowRight,
  MessageSquare,
  Send,
} from 'lucide-react';
import { gateApi } from '../api/gateApi';
import { securityApi } from '../api/securityApi';
import { useAuthStore } from '../store/authStore';

const getGateImage = (gate) => {
  const name = (gate?.name || gate?.gate_name || '').toLowerCase();
  const type = (gate?.gate_type || '').toLowerCase();
  if (name.includes('parking') || type.includes('parking')) {
    return '/images/parking-gate.jpg';
  }
  if (name.includes('service') || name.includes('back') || name.includes('delivery')) {
    return '/images/service-gate.jpg';
  }
  return '/images/gatehouse.jpg';
};

export default function GatesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isSecurity = user?.role === 'SECURITY';
  const isResident = ['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user?.role);

  const [gates, setGates] = useState([]);
  const [securityStaffList, setSecurityStaffList] = useState([]);
  const [myAssignedGate, setMyAssignedGate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, CLOSED, UNDER_MAINTENANCE
  const [guardFilter, setGuardFilter] = useState('ALL'); // ALL, ASSIGNED, UNASSIGNED

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGate, setSelectedGate] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    gate_number: '',
    location: '',
    status: 'ACTIVE',
    gate_type: 'MAIN_ENTRY',
    is_automated_barrier: false,
    allows_entry_registration: true,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    gate_number: '',
    location: '',
    status: 'ACTIVE',
    gate_type: 'MAIN_ENTRY',
    is_automated_barrier: false,
    allows_entry_registration: true,
  });

  const [assignForm, setAssignForm] = useState({
    gate_id: '',
    security_staff_id: '',
    shift: 'MORNING',
  });

  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Quick Message Guard Modal State
  const [messagingGuard, setMessagingGuard] = useState(null);
  const [messageText, setMessageText] = useState('');

  const handleOpenMessageGuard = (guard, gateName) => {
    setMessagingGuard({
      guardName: guard.security_name,
      guardPhone: guard.security_phone,
      gateName: gateName,
      shift: guard.shift,
    });
    setMessageText('');
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const promises = [gateApi.getGates()];

      if (isAdmin) {
        promises.push(securityApi.getSecurityStaff());
      } else {
        promises.push(Promise.resolve({ data: { staffList: [] } }));
      }

      if (isSecurity || isAdmin) {
        promises.push(gateApi.getMyAssignedGate().catch(() => ({ data: { has_assignment: false, gate: null } })));
      } else {
        promises.push(Promise.resolve({ data: { has_assignment: false, gate: null } }));
      }

      const [gatesRes, staffRes, assignedRes] = await Promise.all(promises);

      setGates(gatesRes.data?.gates || []);
      setSecurityStaffList(staffRes.data?.staffList || []);
      if (assignedRes.data?.has_assignment && assignedRes.data?.gate) {
        setMyAssignedGate(assignedRes.data.gate);
      } else {
        setMyAssignedGate(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch gates data.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Preset Helper for Create Modal
  const applyPreset = (preset) => {
    setCreateForm((prev) => ({
      ...prev,
      name: preset.name,
      gate_number: preset.gate_number,
      location: preset.location,
      status: preset.status,
      gate_type: preset.gate_type || 'MAIN_ENTRY',
      is_automated_barrier: preset.barrier || false,
      allows_entry_registration: preset.allows_entry_registration !== undefined ? preset.allows_entry_registration : true,
    }));
  };

  const handleCreateGate = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await gateApi.createGate(createForm);
      setSuccessMsg(`Gate "${createForm.name}" created successfully!`);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        gate_number: '',
        location: '',
        status: 'ACTIVE',
        gate_type: 'MAIN_ENTRY',
        is_automated_barrier: false,
        allows_entry_registration: true,
      });
      fetchInitialData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create gate.');
    }
  };

  const handleOpenEdit = (gate) => {
    setSelectedGate(gate);
    setEditForm({
      name: gate.name || gate.gate_name || '',
      gate_number: gate.gate_number || '',
      location: gate.location || '',
      status: gate.status || gate.gate_status || 'ACTIVE',
      gate_type: gate.gate_type || 'MAIN_ENTRY',
      is_automated_barrier: Boolean(gate.is_automated_barrier),
      allows_entry_registration: gate.allows_entry_registration !== undefined ? Boolean(gate.allows_entry_registration) : true,
    });
    setShowEditModal(true);
  };

  const handleUpdateGate = async (e) => {
    e.preventDefault();
    if (!selectedGate) return;
    setErrorMsg(null);
    try {
      const gateId = selectedGate.id || selectedGate.gate_id;
      await gateApi.updateGate(gateId, editForm);
      setSuccessMsg(`Gate "${editForm.name}" updated successfully.`);
      setShowEditModal(false);
      fetchInitialData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update gate.');
    }
  };

  const handleDeleteGate = async (gate) => {
    const gateId = gate.id || gate.gate_id;
    const gateName = gate.name || gate.gate_name;
    if (!window.confirm(`Are you sure you want to delete gate "${gateName}"?`)) {
      return;
    }
    try {
      await gateApi.deleteGate(gateId);
      setSuccessMsg(`Gate "${gateName}" deleted successfully.`);
      fetchInitialData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete gate.');
    }
  };

  const handleOpenAssign = (gate = null) => {
    setSelectedGate(gate);
    const chosenGateId = gate ? (gate.id || gate.gate_id) : (gates[0]?.id || gates[0]?.gate_id || '');
    const chosenStaffId = securityStaffList[0]?.id || '';
    setAssignForm({
      gate_id: chosenGateId,
      security_staff_id: chosenStaffId,
      shift: 'MORNING',
    });
    setShowAssignModal(true);
  };

  // Quick auto-fill for example: "Rakesh, Gate: Main Gate, Shift: Morning"
  const applyQuickExampleAssign = () => {
    const mainGate = gates.find((g) => (g.name || g.gate_name || '').toLowerCase().includes('main'));
    const rakesh = securityStaffList.find((s) => (s.full_name || '').toLowerCase().includes('rakesh'));

    if (mainGate && rakesh) {
      setAssignForm({
        gate_id: mainGate.id || mainGate.gate_id,
        security_staff_id: rakesh.id,
        shift: 'MORNING',
      });
    } else if (mainGate && securityStaffList.length > 0) {
      setAssignForm({
        gate_id: mainGate.id || mainGate.gate_id,
        security_staff_id: securityStaffList[0].id,
        shift: 'MORNING',
      });
    }
  };

  const handleAssignStaff = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await gateApi.assignSecurityStaff(assignForm);
      setSuccessMsg(res.message || 'Assigned security staff successfully!');
      setShowAssignModal(false);
      fetchInitialData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign security staff.');
    }
  };

  const handleUnassignStaff = async (assignmentId, gateName) => {
    if (!window.confirm(`Remove guard assignment from ${gateName}?`)) return;
    try {
      await gateApi.unassignSecurityStaff(assignmentId);
      setSuccessMsg(`Guard assignment on ${gateName} closed.`);
      fetchInitialData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to unassign staff.');
    }
  };

  // Filtered gates
  const filteredGates = useMemo(() => {
    return gates.filter((g) => {
      const name = (g.name || g.gate_name || '').toLowerCase();
      const num = String(g.gate_number || '').toLowerCase();
      const loc = (g.location || '').toLowerCase();
      const status = (g.status || g.gate_status || 'ACTIVE').toUpperCase();
      const guardName = g.security_name || g.assigned_security?.name;

      const matchesSearch =
        !searchQuery.trim() ||
        name.includes(searchQuery.toLowerCase()) ||
        num.includes(searchQuery.toLowerCase()) ||
        loc.includes(searchQuery.toLowerCase()) ||
        (guardName && guardName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesGuard =
        guardFilter === 'ALL' ||
        (guardFilter === 'ASSIGNED' && Boolean(guardName)) ||
        (guardFilter === 'UNASSIGNED' && !guardName);

      return matchesSearch && matchesStatus && matchesGuard;
    });
  }, [gates, searchQuery, statusFilter, guardFilter]);

  const totalGates = gates.length;
  const activeGates = gates.filter((g) => (g.status || g.gate_status) === 'ACTIVE').length;
  const guardsOnDuty = gates.filter((g) => g.security_name || g.assigned_security?.name).length;
  const societyName = gates[0]?.society_name || user?.societyName || 'Our Society';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner / Header: Left Side Info & Right Side Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Left Side: Icon, Title & Description */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 480px', minWidth: '280px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
              flexShrink: 0,
            }}
          >
            <DoorOpen size={24} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
              {isAdmin ? 'Society Gates & Security Duty Roster' : 'Society Gates & Assigned Security Staff'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0', lineHeight: 1.4, maxWidth: '640px' }}>
              {isAdmin
                ? 'Configure physical society gates (Main Gate, Gate 2, Service Gate, Parking Gate) and assign security personnel shifts.'
                : `View how many gates ${societyName} has, assigned on-duty security staff for each gate, and direct phone contact for instant assistance.`}
            </p>
          </div>
        </div>

        {/* Right Side: Set Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <button
            onClick={fetchInitialData}
            className="btn btn-outline"
            style={{
              padding: '10px 14px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--color-white)',
              border: '1.5px solid var(--border-card)',
              color: 'var(--color-dark-brown)',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
            title="Refresh gates and security roster"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => handleOpenAssign(null)}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'var(--color-white)',
                  border: '1.5px solid var(--color-sand)',
                  color: 'var(--color-clay)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <UserPlus size={16} />
                <span>Assign Staff to Gate</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'var(--grad-primary)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Plus size={16} />
                <span>Add New Gate</span>
              </button>
            </>
          )}

        </div>
      </div>




      {/* Alerts */}
      {errorMsg && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fda4af',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', color: '#fda4af', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Society Gates</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(196, 154, 108, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DoorOpen size={20} color="var(--color-clay)" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)' }}>
            {totalGates}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Registered gates for {societyName}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Checkpoints</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(107, 142, 90, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CheckCircle2 size={20} color="var(--color-fern-green)" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--color-fern-green)' }}>
            {activeGates}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Currently open for entry & exit
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Security Staff on Duty</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(196, 154, 108, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <UserCheck size={20} color="var(--color-clay)" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--color-clay)' }}>
            {guardsOnDuty}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Guards actively stationed at gates
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'var(--color-white)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 2px 10px rgba(196, 154, 108, 0.05)',
        }}
      >
        {/* Left Side: Search Bar with Defined Width and Search Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '360px',
            maxWidth: '100%',
          }}
        >
          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-tertiary, #FAF6EE)',
              border: '1.5px solid var(--border-subtle, #EAE0D5)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              boxSizing: 'border-box',
            }}
          >
            <Search size={16} style={{ color: 'var(--color-clay, #C49A6C)', marginRight: '8px', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search gates by name, guard, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main, #403630)',
                fontSize: '0.88rem',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              height: '38px',
              flexShrink: 0,
            }}
          >
            <Search size={14} />
            <span>Search</span>
          </button>
        </div>

        {/* Right Side: Button Set (Filters + Action Buttons) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginLeft: 'auto',
          }}
        >
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                background: '#FFFFFF',
                border: '1.5px solid var(--border-subtle, #EAE0D5)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                height: '38px',
              }}
            >
              <option value="ALL">All Gates ({gates.length})</option>
              <option value="ACTIVE">Active Only ({activeGates})</option>
              <option value="CLOSED">Closed Only ({gates.filter(g => (g.status || g.gate_status) === 'CLOSED').length})</option>
              <option value="UNDER_MAINTENANCE">Maintenance ({gates.filter(g => (g.status || g.gate_status) === 'UNDER_MAINTENANCE').length})</option>
            </select>
          </div>

          {/* Guard Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Guard:</span>
            <select
              value={guardFilter}
              onChange={(e) => setGuardFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 'var(--radius-md)',
                background: '#FFFFFF',
                border: '1.5px solid var(--border-subtle, #EAE0D5)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                height: '38px',
              }}
            >
              <option value="ALL">All Posts</option>
              <option value="ASSIGNED">Guard Assigned ({guardsOnDuty})</option>
              <option value="UNASSIGNED">No Guard ({totalGates - guardsOnDuty})</option>
            </select>
          </div>

          {/* Refresh Button */}


          {/* Admin Action Buttons */}


          {/* Security Action Button */}
          {isSecurity && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/security')}
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '38px',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: '#10b981',
                borderColor: '#10b981',
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'nowrap',
              }}
            >
              <Shield size={15} />
              <span>Gate Console</span>
            </button>
          )}
        </div>
      </div>

      {/* Gates Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '12px', opacity: 0.7 }} />
          <div>Loading society gates & assignments...</div>
        </div>
      ) : filteredGates.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', borderRadius: '16px', background: '#FFFFFF' }}>
          <DoorOpen size={48} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>No Gates Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
            {searchQuery
              ? 'No gates match your search filter.'
              : isAdmin
                ? 'Click "+ Add New Gate" above to add Main Gate, Gate 2, Service Gate, or Parking Gate.'
                : 'No checkpoints registered yet for your society.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {filteredGates.map((g) => {
            const gateId = g.id || g.gate_id;
            const gateName = g.name || g.gate_name;
            const gateNum = g.gate_number || gateId;
            const gateLoc = g.location || 'Society Perimeter Entrance';
            const status = g.status || g.gate_status || 'ACTIVE';
            const isActive = status === 'ACTIVE';
            const isClosed = status === 'CLOSED';

            // Assigned guard details
            const guardName = g.security_name || g.assigned_security?.name;
            const guardPhone = g.security_phone || g.assigned_security?.phone;
            const shift = g.shift || g.assigned_security?.shift || 'Morning';
            const badgeNumber = g.badge_number || g.assigned_security?.badge_number || 'SEC-01';
            const agencyName = g.agency_name || g.assigned_security?.agency_name || 'Society Security Staff';
            const isAssignedToMe = myAssignedGate && (myAssignedGate.id === gateId || myAssignedGate.gate_id === gateId);

            const assignedGuards = g.assigned_guards && g.assigned_guards.length > 0
              ? g.assigned_guards
              : (guardName ? [{
                assignment_id: g.assignment_id,
                security_name: guardName,
                security_phone: guardPhone,
                shift: shift,
                badge_number: badgeNumber,
                agency_name: agencyName,
              }] : []);

            const hasGuards = assignedGuards.length > 0;

            return (
              <div
                key={gateId}
                id={`gate-card-${gateId}`}
                style={{
                  background: '#FFFFFF',
                  border: isAssignedToMe ? '2px solid #10b981' : '1.5px solid var(--color-sand, #D6C2A1)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: isAssignedToMe
                    ? '0 6px 20px rgba(16, 185, 129, 0.15)'
                    : '0 4px 16px rgba(64, 54, 48, 0.05)',
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  transition: 'all 0.25s ease',
                }}
              >
                {/* 1. LEFT SIDE: First Gate Name with Background Color */}
                <div
                  style={{
                    flex: '0 0 280px',
                    minWidth: '240px',
                    background: 'linear-gradient(135deg, #403630 0%, #2A221E 100%)',
                    color: '#FFFFFF',
                    padding: '22px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    boxSizing: 'border-box',
                  }}
                >
                  <div>


                    {/* Gate Name Header with Right Arrow */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(196, 154, 108, 0.22)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <DoorOpen size={17} color="var(--color-clay)" />
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '1.35rem',
                            fontWeight: 900,
                            color: '#FFFFFF',
                            letterSpacing: '-0.01em',
                            lineHeight: 1.2,
                          }}
                        >
                          {gateName}
                        </h3>
                      </div>
                    </div>

                    {/* Location */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: '#D6C2A1', marginTop: '8px' }}>
                      <MapPin size={12} color="#87CEEB" />
                      <span>{gateLoc}</span>
                    </div>
                  </div>

                  {/* Bottom Gate Status */}

                </div>

                {/* 2. RIGHT SIDE: Security Information Starts ("after start securti infomation") */}
                <div
                  style={{
                    flex: 1,
                    minWidth: '320px',
                    padding: '20px 24px',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div>
                    {/* Security on Gate Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: hasGuards ? 'var(--color-fern-green)' : '#8E7C70',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <ShieldCheck size={16} color={hasGuards ? 'var(--color-fern-green)' : '#8E7C70'} />
                        <span>{hasGuards ? `Security on Gate (${assignedGuards.length} On Duty)` : 'Security on Gate'}</span>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleOpenAssign(g)}
                          style={{
                            background: 'rgba(196, 154, 108, 0.12)',
                            border: '1px solid var(--color-sand)',
                            color: 'var(--color-clay)',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          + Assign Guard
                        </button>
                      )}
                    </div>

                    {/* Guards on Gate Info Card */}
                    {hasGuards ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {assignedGuards.map((guard, idx) => (
                          <div
                            key={guard.assignment_id || idx}
                            style={{
                              background: '#FAF6EE',
                              borderRadius: '12px',
                              border: '1px solid #EAE0D5',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '12px',
                            }}
                          >
                            {/* Guard Avatar & Identity */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '42px',
                                  height: '42px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(135deg, var(--color-clay) 0%, #a8794a 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#FFFFFF',
                                  fontWeight: 900,
                                  fontSize: '1rem',
                                  boxShadow: '0 2px 8px rgba(196, 154, 108, 0.25)',
                                  flexShrink: 0,
                                  border: '1px solid var(--border-card)',
                                }}
                              >
                                {(guard.security_name || 'S').charAt(0).toUpperCase()}
                              </div>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--color-dark-brown)', fontSize: '0.98rem' }}>
                                    {guard.security_name}
                                  </span>
                                  <span
                                    style={{
                                      background: 'rgba(107, 142, 90, 0.15)',
                                      color: 'var(--color-fern-green)',
                                      border: '1px solid rgba(107, 142, 90, 0.3)',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    {guard.shift || 'Morning'} Shift
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#6E5D53', marginTop: '2px' }}>
                                  Officer Badge ID: <strong style={{ color: 'var(--color-clay)' }}>{guard.badge_number || (guard.security_staff_id ? `SEC-${guard.security_staff_id}` : 'SEC-01')}</strong>
                                  {guard.security_phone && <span style={{ marginLeft: '10px' }}>• 📞 {guard.security_phone}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Call & Message Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <a
                                href={guard.security_phone ? `tel:${guard.security_phone}` : '#'}
                                onClick={(e) => {
                                  if (!guard.security_phone) {
                                    e.preventDefault();
                                    alert(`No phone number registered for ${guard.security_name}`);
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  background: '#10b981',
                                  color: '#FFFFFF',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                                }}
                                title={`Call ${guard.security_name}`}
                              >
                                <PhoneCall size={14} />
                                <span>Call</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => handleOpenMessageGuard(guard, gateName)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  background: 'var(--color-clay)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(196, 154, 108, 0.25)',
                                }}
                                title={`Send Message to ${guard.security_name}`}
                              >
                                <MessageSquare size={14} />
                                <span>Message</span>
                              </button>

                              {isAdmin && guard.assignment_id && (
                                <button
                                  onClick={() => handleUnassignStaff(guard.assignment_id, gateName)}
                                  title="End Shift"
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    color: '#dc2626',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                  }}
                                >
                                  End Shift
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          background: '#FAF6EE',
                          borderRadius: '10px',
                          border: '1px solid #EAE0D5',
                          padding: '14px 18px',
                          color: '#8E7C70',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <DoorOpen size={16} />
                        <span>Automated barrier checkpoint • No security officer stationed currently</span>
                      </div>
                    )}
                  </div>

                  {/* Admin Management Toolbar */}
                  {isAdmin && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: '1px solid #F0E8DC',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <button
                        onClick={() => handleOpenAssign(g)}
                        className="btn btn-secondary"
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <UserPlus size={13} /> {guardName ? 'Change Guard' : 'Assign Guard'}
                      </button>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEdit(g)}
                          title="Edit Gate"
                          style={{
                            background: '#FAF6EE',
                            border: '1px solid var(--color-sand)',
                            color: 'var(--color-dark-brown)',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => handleDeleteGate(g)}
                          title="Delete Gate"
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#dc2626',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE GATE MODAL (Admin Only) */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Create Society Gate</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick 1-Click Preset Buttons */}
            <div
              style={{
                marginBottom: '18px',
                padding: '12px 14px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-card)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: '8px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >

                Quick Presets (Click to autofill):
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  {
                    name: 'Main Gate',
                    gate_number: '1',
                    location: 'Front Boulevard Entrance',
                    status: 'ACTIVE',
                    gate_type: 'MAIN_ENTRY',
                    barrier: true,
                    allows_entry_registration: true,
                  },
                  {
                    name: 'Gate 2',
                    gate_number: '2',
                    location: 'North Wing Resident Entry',
                    status: 'ACTIVE',
                    gate_type: 'RESIDENT_ONLY',
                    barrier: true,
                    allows_entry_registration: true,
                  },
                  {
                    name: 'Service Gate',
                    gate_number: '3',
                    location: 'Rear Commercial & Delivery Lane',
                    status: 'ACTIVE',
                    gate_type: 'SERVICE_DELIVERY',
                    barrier: false,
                    allows_entry_registration: true,
                  },
                  {
                    name: 'Parking Gate',
                    gate_number: 'P-1',
                    location: 'Basement Parking Ramp Entrance',
                    status: 'ACTIVE',
                    gate_type: 'RESIDENT_ONLY',
                    barrier: true,
                    allows_entry_registration: false,
                  },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="btn"
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      color: '#a5b4fc',
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateGate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  Gate Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Gate, Gate 2, Service Gate, Parking Gate"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      marginBottom: '6px',
                    }}
                  >
                    Gate Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1, 2, 3, P-1"
                    value={createForm.gate_number}
                    onChange={(e) => setCreateForm({ ...createForm, gate_number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      marginBottom: '6px',
                    }}
                  >
                    Status *
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      outline: 'none',
                    }}
                  >
                    <option value="ACTIVE">ACTIVE (Open)</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  Location / Checkpoint Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Front Boulevard / North Wing Perimeter / Basement Ramp"
                  value={createForm.location}
                  onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Checkbox: Gate Entry Registration */}
              <div
                style={{
                  padding: '14px 16px',
                  background: createForm.allows_entry_registration ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${createForm.allows_entry_registration ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-subtle)'}`,
                  transition: 'all 0.2s ease',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={createForm.allows_entry_registration}
                    onChange={(e) => setCreateForm({ ...createForm, allows_entry_registration: e.target.checked })}
                    style={{
                      marginTop: '3px',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#10b981',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Gate Entry Registration</span>
                      {createForm.allows_entry_registration ? (
                        <span style={{ fontSize: '0.68rem', background: '#d1fae5', color: '#065f46', padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                          ✓ ENTRY REGISTRATION PERMITTED
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', background: 'var(--bg-card)', color: 'var(--text-muted)', padding: '1px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          VIEW HISTORY ONLY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                      When checked, security guards assigned to this gate are authorized to register visitor, courier, delivery, worker, and vehicle entries.
                      Guards assigned to other gates can only view visitor entry history.
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GATE MODAL */}
      {showEditModal && selectedGate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Edit Gate Details</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Update gate name, number, location and operational status.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateGate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  Gate Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      marginBottom: '6px',
                    }}
                  >
                    Gate Number
                  </label>
                  <input
                    type="text"
                    value={editForm.gate_number}
                    onChange={(e) => setEditForm({ ...editForm, gate_number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      marginBottom: '6px',
                    }}
                  >
                    Status *
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      outline: 'none',
                    }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="UNDER_MAINTENANCE">UNDER MAINTENANCE</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  Location / Description
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Checkbox: Gate Entry Registration */}
              <div
                style={{
                  padding: '14px 16px',
                  background: editForm.allows_entry_registration ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${editForm.allows_entry_registration ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-subtle)'}`,
                  transition: 'all 0.2s ease',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editForm.allows_entry_registration}
                    onChange={(e) => setEditForm({ ...editForm, allows_entry_registration: e.target.checked })}
                    style={{
                      marginTop: '3px',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#10b981',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Gate Entry Registration</span>
                      {editForm.allows_entry_registration ? (
                        <span style={{ fontSize: '0.68rem', background: '#d1fae5', color: '#065f46', padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                          ✓ ENTRY REGISTRATION PERMITTED
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', background: 'var(--bg-card)', color: 'var(--text-muted)', padding: '1px 7px', borderRadius: '4px', fontWeight: 600 }}>
                          VIEW HISTORY ONLY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                      When checked, security guards assigned to this gate are authorized to register visitor, courier, delivery, worker, and vehicle entries.
                      Guards assigned to other gates can only view visitor entry history.
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                >
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

      {/* ASSIGN SECURITY STAFF MODAL (Admin Only) */}
      {showAssignModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Assign Security Staff to Gate</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Assign security guard to an active post (Example: Rakesh → Main Gate → Morning shift).
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick 1-Click Example Button */}
            <div style={{ marginBottom: '16px' }}>
              <button
                type="button"
                onClick={applyQuickExampleAssign}
                className="btn"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#6ee7b7',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '8px 14px',
                  borderRadius: '6px',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >

                Quick Example: Assign Rakesh → Main Gate (Morning Shift)
              </button>
            </div>

            <form onSubmit={handleAssignStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  Select Gate *
                </label>
                <select
                  required
                  value={assignForm.gate_id}
                  onChange={(e) => setAssignForm({ ...assignForm, gate_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Choose Gate --</option>
                  {gates.map((g) => {
                    const id = g.id || g.gate_id;
                    const name = g.name || g.gate_name;
                    const num = g.gate_number || id;
                    return (
                      <option key={id} value={id}>
                        {name} (Gate #{num})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  Select Security Staff Guard *
                </label>
                <select
                  required
                  value={assignForm.security_staff_id}
                  onChange={(e) => setAssignForm({ ...assignForm, security_staff_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Choose Security Guard --</option>
                  {securityStaffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.employee_id || s.badge_number || 'Badge'}) - {s.shift} Shift
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    marginBottom: '6px',
                  }}
                >
                  Duty Shift *
                </label>
                <select
                  value={assignForm.shift}
                  onChange={(e) => setAssignForm({ ...assignForm, shift: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    outline: 'none',
                  }}
                >
                  <option value="MORNING">Morning Shift (06:00 - 14:00)</option>
                  <option value="EVENING">Evening Shift (14:00 - 22:00)</option>
                  <option value="NIGHT">Night Shift (22:00 - 06:00)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MESSAGE GUARD MODAL */}
      {messagingGuard && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px 26px',
              border: '1.5px solid var(--color-sand)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(196, 154, 108, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                  }}
                >
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                    Message Guard on Duty
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#6E5D53', marginTop: '2px' }}>
                    {messagingGuard.guardName} • {messagingGuard.gateName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMessagingGuard(null)}
                style={{
                  background: '#FAF6EE',
                  border: '1.5px solid var(--color-sand)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6E5D53',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6E5D53', textTransform: 'uppercase', marginBottom: '8px' }}>
                Quick Preset Messages:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  'Please allow my expected visitor entry',
                  'Delivery package arriving shortly at gate',
                  'Cab arriving for my flat in 5 mins',
                  'Please hold my parcel at security post',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMessageText(preset)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: messageText === preset ? 'rgba(196, 154, 108, 0.2)' : '#FAF6EE',
                      border: messageText === preset ? '1px solid var(--color-clay)' : '1px solid var(--color-sand)',
                      color: messageText === preset ? 'var(--color-clay)' : 'var(--color-dark-brown)',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginBottom: '6px' }}>
                Message Content:
              </label>
              <textarea
                rows={3}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message or instructions for the guard..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  border: '1.5px solid var(--color-sand)',
                  color: 'var(--color-dark-brown)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              {messagingGuard.guardPhone ? (
                <>
                  <a
                    href={`https://wa.me/${messagingGuard.guardPhone.replace(/\D/g, '')}?text=${encodeURIComponent(messageText || 'Hello, resident from society.')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      borderRadius: '10px',
                      background: '#25D366',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
                    }}
                  >
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`sms:${messagingGuard.guardPhone}?body=${encodeURIComponent(messageText || 'Hello, resident from society.')}`}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'var(--color-clay)',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 2px 6px rgba(196, 154, 108, 0.25)',
                    }}
                  >
                    <Send size={14} />
                    <span>Send SMS</span>
                  </a>
                </>
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#dc2626' }}>
                  No phone number registered for this guard.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
