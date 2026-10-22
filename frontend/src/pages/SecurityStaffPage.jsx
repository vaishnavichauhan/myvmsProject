import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Plus,
  Phone,
  UserCheck,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Power,
  RefreshCw,
  Clock,
  Building,
  Building2,
  BadgeAlert,
} from 'lucide-react';
import { securityApi } from '../api/securityApi';
import { societyApi } from '../api/societyApi';
import { useAuthStore } from '../store/authStore';

export default function SecurityStaffPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [staffList, setStaffList] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    password: '',
    employee_id: '',
    photo: '',
    agency_name: 'In-House Security Staff',
    shift: 'ROTATIONAL',
    status: 'ACTIVE',
    society_id: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    employee_id: '',
    photo: '',
    agency_name: '',
    shift: 'ROTATIONAL',
    status: 'ACTIVE',
    society_id: '',
  });

  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    loadSocieties();
    fetchStaff('ALL');
  }, []);

  const loadSocieties = async () => {
    try {
      const res = await societyApi.getSocieties();
      const list = res.data?.societies || res.societies || [];
      setSocieties(list);
      if (list.length > 0) {
        setCreateForm((p) => ({ ...p, society_id: list[0].id }));
      }
    } catch (err) {
      console.error('Failed to load societies', err);
    }
  };

  const fetchStaff = async (socId = selectedSocietyId) => {
    setLoading(true);
    try {
      const params = {};
      if (socId && socId !== 'ALL') {
        params.society_id = socId;
      }
      const res = await securityApi.getSecurityStaff(params);
      setStaffList(res.data?.staffList || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch security staff.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocietyChange = (e) => {
    const val = e.target.value;
    setSelectedSocietyId(val);
    fetchStaff(val);
  };

  const handleOpenCreateModal = () => {
    const defaultSoc = selectedSocietyId !== 'ALL' ? selectedSocietyId : (societies[0]?.id || 1);
    setCreateForm((p) => ({ ...p, society_id: defaultSoc }));
    setShowCreateModal(true);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const targetSoc = createForm.society_id || (selectedSocietyId !== 'ALL' ? selectedSocietyId : (societies[0]?.id || 1));
      await securityApi.createSecurityStaff({
        ...createForm,
        society_id: targetSoc,
      });
      setSuccessMsg(`Security staff member "${createForm.name}" registered successfully!`);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        phone: '',
        password: '',
        employee_id: '',
        photo: '',
        agency_name: 'In-House Security Staff',
        shift: 'ROTATIONAL',
        status: 'ACTIVE',
        society_id: targetSoc,
      });
      fetchStaff(selectedSocietyId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create security staff.');
    }
  };

  const handleOpenEdit = (staff) => {
    setSelectedStaff(staff);
    setEditForm({
      name: staff.full_name || '',
      phone: staff.phone || '',
      employee_id: staff.employee_id || staff.badge_number || '',
      photo: staff.avatar_url || '',
      agency_name: staff.agency_name || '',
      shift: staff.shift || 'ROTATIONAL',
      status: staff.status || 'ACTIVE',
      society_id: staff.society_id || (societies[0]?.id || 1),
    });
    setShowEditModal(true);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setErrorMsg(null);
    try {
      await securityApi.updateSecurityStaff(selectedStaff.id, editForm);
      setSuccessMsg(`Updated security staff member "${editForm.name}" successfully.`);
      setShowEditModal(false);
      fetchStaff(selectedSocietyId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update security staff.');
    }
  };

  const handleToggleStatus = async (staff) => {
    const nextStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await securityApi.updateSecurityStaffStatus(staff.id, nextStatus);
      setSuccessMsg(`Security staff "${staff.full_name}" is now marked as ${nextStatus}.`);
      fetchStaff(selectedSocietyId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change staff status.');
    }
  };

  const handleOpenResetPassword = (staff) => {
    setSelectedStaff(staff);
    setNewPasswordInput('');
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setErrorMsg(null);
    try {
      await securityApi.resetSecurityStaffPassword(selectedStaff.id, newPasswordInput);
      setSuccessMsg(`Password for "${selectedStaff.full_name}" reset successfully.`);
      setShowResetPasswordModal(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password.');
    }
  };

  const handleDeleteStaff = async (staff) => {
    if (!window.confirm(`Are you sure you want to delete security staff member "${staff.full_name}" (${staff.employee_id || staff.phone})? This will revoke gate access.`)) {
      return;
    }
    try {
      await securityApi.deleteSecurityStaff(staff.id);
      setSuccessMsg(`Security staff member "${staff.full_name}" deleted successfully.`);
      fetchStaff();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete security staff.');
    }
  };

  // Filtered List
  const filteredList = staffList.filter((staff) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      staff.full_name?.toLowerCase().includes(q) ||
      staff.phone?.toLowerCase().includes(q) ||
      staff.employee_id?.toLowerCase().includes(q) ||
      staff.badge_number?.toLowerCase().includes(q) ||
      staff.agency_name?.toLowerCase().includes(q);

    const matchShift = filterShift === 'ALL' || staff.shift === filterShift;
    const matchStatus = filterStatus === 'ALL' || staff.status === filterStatus;

    return matchSearch && matchShift && matchStatus;
  });

  const totalGuards = staffList.length;
  const activeGuards = staffList.filter((s) => s.status === 'ACTIVE').length;
  const inactiveGuards = totalGuards - activeGuards;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner / Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
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
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Security Staff & Watchman Roster
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Register gate personnel, issue employee credentials, manage shifts, and monitor gate duties.
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginLeft: 'auto',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => fetchStaff(selectedSocietyId)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={16} />
          </button>
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> Register Security Staff
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fda4af',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#fda4af', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#6ee7b7',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
      }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Security Staff</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(196, 154, 108, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Shield size={20} color="var(--color-clay)" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--text-main)' }}>
            {totalGuards}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Authorized Watchmen & Gatekeepers
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Gate Access</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(107, 142, 90, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <UserCheck size={20} color="var(--color-fern-green)" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--color-fern-green)' }}>
            {activeGuards}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Allowed to login & manage gate
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Suspended / Inactive</span>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(214, 194, 161, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BadgeAlert size={20} color="var(--color-dark-brown)" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: 'var(--color-dark-brown)' }}>
            {inactiveGuards}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Gate login revoked
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#FFFFFF',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 14px',
          flex: '1 1 300px',
        }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, phone, employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              width: '100%',
              fontSize: '0.88rem',
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              padding: '8px 12px',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          >
            <option value="ALL">All Shifts</option>
            <option value="MORNING">Morning Shift</option>
            <option value="EVENING">Evening Shift</option>
            <option value="NIGHT">Night Shift</option>
            <option value="ROTATIONAL">Rotational Shift</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-main)',
              padding: '8px 12px',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Staff Cards / Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '12px', opacity: 0.7 }} />
          <div>Loading security roster...</div>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Shield size={48} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>No Security Staff Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
            {searchTerm || filterShift !== 'ALL' || filterStatus !== 'ALL'
              ? 'No staff members match the selected filters.'
              : 'No security staff have been registered yet. Click "Register Security Staff" above.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '20px',
        }}>
          {filteredList.map((staff) => {
            const isActive = staff.status === 'ACTIVE';
            return (
              <div
                key={staff.id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  borderLeft: `4px solid ${isActive ? '#10b981' : '#f43f5e'}`,
                }}
              >
                {/* Header row with avatar and details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '12px',
                    background: staff.avatar_url ? `url(${staff.avatar_url}) center/cover` : 'var(--grad-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1.2rem',
                    flexShrink: 0,
                    border: '1px solid var(--border-card)',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    {!staff.avatar_url && (staff.full_name?.charAt(0) || <ShieldCheck size={26} color="#fff" />)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {staff.full_name}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{
                        background: 'rgba(196, 154, 108, 0.18)',
                        color: 'var(--color-clay)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>
                        ID: {staff.employee_id || staff.badge_number || 'N/A'}
                      </span>
                      <span style={{
                        background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: isActive ? '#6ee7b7' : '#fda4af',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>
                        {staff.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata details */}
                <div style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-card)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.85rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(196, 154, 108, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Phone size={14} color="var(--color-clay)" />
                    </div>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{staff.phone}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>(Login Phone)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(107, 142, 90, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Clock size={14} color="var(--color-fern-green)" />
                    </div>
                    <span>Shift:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{staff.shift || 'Rotational'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(196, 154, 108, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Building2 size={14} color="var(--color-clay)" />
                    </div>
                    <span>Society:</span>
                    <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>{staff.society_name || 'Society #' + staff.society_id}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(214, 194, 161, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Building size={14} color="var(--color-dark-brown)" />
                    </div>
                    <span>Agency:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{staff.agency_name || 'In-House'}</span>
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-subtle)',
                    gap: '8px',
                  }}>
                    {/* Toggle Status */}
                    <button
                      onClick={() => handleToggleStatus(staff)}
                      title={isActive ? 'Deactivate Security Staff' : 'Activate Security Staff'}
                      style={{
                        background: isActive ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${isActive ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        color: isActive ? '#fda4af' : '#6ee7b7',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Power size={14} />
                      {isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {/* Reset Password */}
                      <button
                        onClick={() => handleOpenResetPassword(staff)}
                        title="Reset Guard Password"
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: '#fcd34d',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        <KeyRound size={14} /> Password
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEdit(staff)}
                        title="Edit Details"
                        style={{
                          background: 'rgba(196, 154, 108, 0.15)',
                          border: '1px solid rgba(196, 154, 108, 0.3)',
                          color: 'var(--color-clay)',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteStaff(staff)}
                        title="Delete Security Member"
                        style={{
                          background: 'rgba(244, 63, 94, 0.15)',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          color: '#fda4af',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SECURITY STAFF MODAL */}
      {showCreateModal && (
        <div style={{
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
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Register New Security Staff</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Create watchman credentials for gate check-in & gate exit.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Assigned Society *
                </label>
                <select
                  required
                  value={createForm.society_id}
                  onChange={(e) => setCreateForm({ ...createForm, society_id: e.target.value })}
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
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Singh"
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Phone Number (Login ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit mobile"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Employee / Badge ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SEC-005"
                    value={createForm.employee_id}
                    onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })}
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
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Password * (Min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Create guard password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Duty Shift
                  </label>
                  <select
                    value={createForm.shift}
                    onChange={(e) => setCreateForm({ ...createForm, shift: e.target.value })}
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
                    <option value="MORNING">Morning (06:00 - 14:00)</option>
                    <option value="EVENING">Evening (14:00 - 22:00)</option>
                    <option value="NIGHT">Night (22:00 - 06:00)</option>
                    <option value="ROTATIONAL">Rotational Shift</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Status
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
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Agency Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Security Corps / In-House"
                  value={createForm.agency_name}
                  onChange={(e) => setCreateForm({ ...createForm, agency_name: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Photo / Avatar URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={createForm.photo}
                  onChange={(e) => setCreateForm({ ...createForm, photo: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Security Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SECURITY STAFF MODAL */}
      {showEditModal && selectedStaff && (
        <div style={{
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
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Security Staff</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Update staff details, duty shift, and employee information.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Assigned Society
                </label>
                <select
                  value={editForm.society_id}
                  onChange={(e) => setEditForm({ ...editForm, society_id: e.target.value })}
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
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Full Name
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Employee / Badge ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.employee_id}
                    onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Shift
                  </label>
                  <select
                    value={editForm.shift}
                    onChange={(e) => setEditForm({ ...editForm, shift: e.target.value })}
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
                    <option value="MORNING">Morning (06:00 - 14:00)</option>
                    <option value="EVENING">Evening (14:00 - 22:00)</option>
                    <option value="NIGHT">Night (22:00 - 06:00)</option>
                    <option value="ROTATIONAL">Rotational Shift</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Status
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
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Agency Name
                </label>
                <input
                  type="text"
                  value={editForm.agency_name}
                  onChange={(e) => setEditForm({ ...editForm, agency_name: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Photo / Avatar URL
                </label>
                <input
                  type="url"
                  value={editForm.photo}
                  onChange={(e) => setEditForm({ ...editForm, photo: e.target.value })}
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

      {/* RESET PASSWORD MODAL */}
      {showResetPasswordModal && selectedStaff && (
        <div style={{
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
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} style={{ color: '#f59e0b' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Reset Guard Password</h3>
              </div>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0 }}>
              Set a new login password for <strong>{selectedStaff.full_name}</strong> (Phone: {selectedStaff.phone}).
            </p>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  New Password * (Min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
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
