import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Ban,
  RefreshCw,
  Edit,
  Sliders,
  Shield,
  Layers,
  X,
  Lock,
} from 'lucide-react';
import superAdminApi from '../../api/superAdminApi';

export default function SuperAdminSocietiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [societies, setSocieties] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactNumber: '',
    contactEmail: '',
    societyType: 'FLAT',
    planId: '',
    maxUnits: 100,
    maxUsers: 50,
    maxWorkers: 20,
    trialDays: 14,
    adminName: '',
    adminPhone: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [limitFormData, setLimitFormData] = useState({
    limitType: 'UNITS',
    overrideValue: 120,
    reason: '',
  });

  const fetchSocieties = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getSocieties({
        search: search || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.societies || []);
        const total = res.data?.pagination?.total ?? list.length;
        const totalPages = res.data?.pagination?.totalPages ?? Math.max(1, Math.ceil(total / (pagination.limit || 20)));
        setSocieties(list);
        setPagination((prev) => ({
          ...prev,
          total,
          totalPages,
        }));
      }
    } catch (err) {
      console.error('Failed to load societies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (selectedPlanId) => {
    const sel = plans.find((p) => String(p.id) === String(selectedPlanId));
    setFormData((prev) => ({
      ...prev,
      planId: selectedPlanId,
      maxUnits: sel?.max_units !== undefined && sel?.max_units !== null ? Number(sel.max_units) : prev.maxUnits,
      maxUsers: sel?.max_users !== undefined && sel?.max_users !== null ? Number(sel.max_users) : prev.maxUsers,
      maxGates: sel?.max_gates !== undefined && sel?.max_gates !== null ? Number(sel.max_gates) : (prev.maxGates || 5),
      maxWorkers: sel?.max_workers !== undefined && sel?.max_workers !== null ? Number(sel.max_workers) : prev.maxWorkers,
      trialDays: sel?.trial_days !== undefined && sel?.trial_days !== null ? Number(sel.trial_days) : prev.trialDays,
    }));
  };

  const handleOpenCreateModal = () => {
    const defaultPlan = plans[0] || null;
    setFormData({
      name: '',
      code: '',
      registrationNumber: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contactNumber: '',
      contactEmail: '',
      societyType: 'FLAT',
      planId: defaultPlan ? String(defaultPlan.id) : '',
      maxUnits: defaultPlan?.max_units !== undefined && defaultPlan?.max_units !== null ? Number(defaultPlan.max_units) : 100,
      maxUsers: defaultPlan?.max_users !== undefined && defaultPlan?.max_users !== null ? Number(defaultPlan.max_users) : 50,
      maxGates: defaultPlan?.max_gates !== undefined && defaultPlan?.max_gates !== null ? Number(defaultPlan.max_gates) : 5,
      maxWorkers: defaultPlan?.max_workers !== undefined && defaultPlan?.max_workers !== null ? Number(defaultPlan.max_workers) : 20,
      trialDays: defaultPlan?.trial_days !== undefined && defaultPlan?.trial_days !== null ? Number(defaultPlan.trial_days) : 14,
      adminName: '',
      adminPhone: '',
      adminEmail: '',
      adminPassword: '',
    });
    setActionError(null);
    setShowCreateModal(true);
  };

  const fetchPlans = async () => {
    try {
      const res = await superAdminApi.getPlans();
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.plans || []);
        setPlans(list);
        if (list.length > 0) {
          const first = list[0];
          setFormData((prev) => {
            if (!prev.planId) {
              return {
                ...prev,
                planId: String(first.id),
                maxUnits: first.max_units !== undefined && first.max_units !== null ? Number(first.max_units) : prev.maxUnits,
                maxUsers: first.max_users !== undefined && first.max_users !== null ? Number(first.max_users) : prev.maxUsers,
                maxGates: first.max_gates !== undefined && first.max_gates !== null ? Number(first.max_gates) : (prev.maxGates || 5),
                maxWorkers: first.max_workers !== undefined && first.max_workers !== null ? Number(first.max_workers) : prev.maxWorkers,
                trialDays: first.trial_days !== undefined && first.trial_days !== null ? Number(first.trial_days) : prev.trialDays,
              };
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchSocieties();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setActionError(null);

      const selectedPlan = plans.find((p) => p.id === Number(formData.planId));
      if (selectedPlan?.max_units && Number(formData.maxUnits) > selectedPlan.max_units) {
        setActionError(`Cannot create society with ${formData.maxUnits} units. The selected ${selectedPlan.name} Plan allows a maximum of ${selectedPlan.max_units} units. Please select an upgraded plan or set units up to ${selectedPlan.max_units}.`);
        setSubmitting(false);
        return;
      }
      if (selectedPlan?.max_gates && Number(formData.maxGates) > selectedPlan.max_gates) {
        setActionError(`Cannot create society with ${formData.maxGates} gates. The selected ${selectedPlan.name} Plan allows a maximum of ${selectedPlan.max_gates} gates. Please select an upgraded plan or set gates up to ${selectedPlan.max_gates}.`);
        setSubmitting(false);
        return;
      }

      const res = await superAdminApi.createSociety(formData);
      if (res.success) {
        setActionSuccess('Society and Society Admin created successfully!');
        setShowCreateModal(false);
        fetchSocieties();
        // Reset form
        setFormData({
          name: '',
          code: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          contactNumber: '',
          contactEmail: '',
          societyType: 'FLAT',
          planId: plans[0]?.id || '',
          maxUnits: 100,
          maxUsers: 50,
          maxGates: 5,
          maxWorkers: 20,
          trialDays: 14,
          adminName: '',
          adminPhone: '',
          adminEmail: '',
          adminPassword: '',
        });
      }
    } catch (err) {
      setActionError(err.message || 'Failed to create society');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLimitOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSociety) return;
    try {
      setSubmitting(true);
      setActionError(null);
      const res = await superAdminApi.setLimitOverride(selectedSociety.id, limitFormData);
      if (res.success) {
        setActionSuccess('Limit override configured successfully!');
        setShowLimitsModal(false);
        fetchSocieties();
      }
    } catch (err) {
      setActionError(err.message || 'Failed to configure limit override');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspendToggle = async (soc) => {
    const isSuspended = soc.subscription_status === 'SUSPENDED';
    const confirmMsg = isSuspended
      ? `Are you sure you want to reactivate ${soc.name}?`
      : `Are you sure you want to suspend ${soc.name}? Residents will lose portal access.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isSuspended) {
        await superAdminApi.activateSociety(soc.id);
        setActionSuccess(`${soc.name} activated successfully.`);
      } else {
        await superAdminApi.suspendSociety(soc.id, 'Suspended by Super Admin');
        setActionSuccess(`${soc.name} suspended successfully.`);
      }
      fetchSocieties();
    } catch (err) {
      alert(err.message || 'Operation failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Society Management
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Multi-society catalog, subscription allotments, limits, and administrative controls.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-clay)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
          }}
        >
          <Plus size={16} /> Create New Society
        </button>
      </div>

      {actionSuccess && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <span>{actionSuccess}</span>
          <X size={16} cursor="pointer" onClick={() => setActionSuccess(null)} />
        </div>
      )}

      {/* Filter / Search Bar */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              flex: 1,
            }}
          >
            <Search size={16} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search by society name, code, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-main)',
                width: '100%',
                fontSize: '0.85rem',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Status:</span>
          {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: statusFilter === st ? 'var(--color-clay)' : 'var(--border-card)',
                background: statusFilter === st ? 'rgba(196, 154, 108, 0.15)' : 'transparent',
                color: statusFilter === st ? 'var(--color-clay)' : 'var(--text-dim)',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Societies Table */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-card)' }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Society</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Society Admin</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Plan</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Units Capacity</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Users Capacity</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Loading societies...
                  </td>
                </tr>
              ) : societies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No societies found matching your criteria.
                  </td>
                </tr>
              ) : (
                societies.map((soc) => {
                  const unitCap = soc.max_units || 100;
                  const unitUsed = soc.current_units_used || 0;
                  const unitPct = Math.round((unitUsed / unitCap) * 100);

                  const userCap = soc.max_users || 50;
                  const userUsed = soc.current_users_used || 0;
                  const userPct = Math.round((userUsed / userCap) * 100);

                  return (
                    <tr
                      key={soc.id}
                      style={{
                        borderBottom: '1px solid var(--border-card)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      {/* Society Name & Code */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: 'rgba(196, 154, 108, 0.15)',
                              color: 'var(--color-clay)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                            }}
                          >
                            {soc.code ? soc.code.substring(0, 3) : 'SOC'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{soc.name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                              Code: <span style={{ fontFamily: 'monospace' }}>{soc.code}</span> • {soc.city || soc.address}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Society Admin */}
                      <td style={{ padding: '14px 16px' }}>
                        {soc.admin_name ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{soc.admin_name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>{soc.admin_phone}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            No admin assigned
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            color: '#8B5CF6',
                          }}
                        >
                          {soc.plan_name || 'No Plan'}
                        </span>
                      </td>

                      {/* Units Capacity */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '110px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 600 }}>{unitUsed} / {unitCap}</span>
                            <span style={{ color: unitPct >= 90 ? '#ef4444' : unitPct >= 80 ? '#f59e0b' : 'var(--text-dim)' }}>
                              {unitPct}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: 'var(--border-subtle)', borderRadius: '3px' }}>
                            <div
                              style={{
                                width: `${Math.min(unitPct, 100)}%`,
                                height: '100%',
                                background: unitPct >= 90 ? '#ef4444' : unitPct >= 80 ? '#f59e0b' : 'var(--color-clay)',
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Users Capacity */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '110px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 600 }}>{userUsed} / {userCap}</span>
                            <span style={{ color: userPct >= 90 ? '#ef4444' : userPct >= 80 ? '#f59e0b' : 'var(--text-dim)' }}>
                              {userPct}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: 'var(--border-subtle)', borderRadius: '3px' }}>
                            <div
                              style={{
                                width: `${Math.min(userPct, 100)}%`,
                                height: '100%',
                                background: userPct >= 90 ? '#ef4444' : userPct >= 80 ? '#f59e0b' : '#10b981',
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background:
                              soc.subscription_status === 'ACTIVE'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : soc.subscription_status === 'TRIAL'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color:
                              soc.subscription_status === 'ACTIVE'
                                ? '#10b981'
                                : soc.subscription_status === 'TRIAL'
                                ? '#f59e0b'
                                : '#ef4444',
                            textTransform: 'uppercase',
                          }}
                        >
                          {soc.subscription_status || soc.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            title="Manage Capacity Limits"
                            onClick={() => {
                              setSelectedSociety(soc);
                              setLimitFormData({
                                limitType: 'UNITS',
                                overrideValue: (soc.max_units || 100) + 20,
                                reason: 'Capacity expansion authorized by Super Admin',
                              });
                              setShowLimitsModal(true);
                              setActionError(null);
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'var(--bg-main)',
                              border: '1px solid var(--border-card)',
                              color: 'var(--text-main)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Sliders size={13} /> Limits
                          </button>

                          <button
                            title={soc.subscription_status === 'SUSPENDED' ? 'Activate Society' : 'Suspend Society'}
                            onClick={() => handleSuspendToggle(soc)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: soc.subscription_status === 'SUSPENDED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid',
                              borderColor: soc.subscription_status === 'SUSPENDED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                              color: soc.subscription_status === 'SUSPENDED' ? '#10b981' : '#ef4444',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Ban size={13} /> {soc.subscription_status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE SOCIETY MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>Create New Society</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Sets up society profile, assigns subscription plan, and creates the initial Society Admin account.
                </p>
              </div>
              <X size={20} cursor="pointer" onClick={() => setShowCreateModal(false)} />
            </div>

            {actionError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#ef4444',
                  fontSize: '0.84rem',
                  marginBottom: '16px',
                }}
              >
                {actionError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Society Basic Details */}
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-clay)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                1. Society Information
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Society Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Palm Grove Residency"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Unique Society Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PALM-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Society Structure Type *
                  </label>
                  <select
                    value={formData.societyType}
                    onChange={(e) => setFormData({ ...formData, societyType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="FLAT">Flat / Apartment Complex</option>
                    <option value="BUNGALOW">Bungalow / Row House</option>
                    <option value="GATED_COMMUNITY">Gated Community / Mixed</option>
                    <option value="COMMERCIAL">Commercial Complex</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="Society office phone"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    placeholder="Street, locality"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              {/* Plan & Resource Limits */}
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-clay)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginTop: '10px' }}>
                2. Subscription Plan & Capacities
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Subscription Plan *
                  </label>
                  <select
                    value={formData.planId}
                    onChange={(e) => handlePlanSelect(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price}/{p.billing_cycle}) • {p.max_units} Units, {p.max_users} Users, {p.max_gates || 5} Gates, {p.trial_days}d Trial
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const selPlan = plans.find((p) => String(p.id) === String(formData.planId));
                    if (!selPlan) return null;
                    return (
                      <small style={{ fontSize: '0.72rem', color: 'var(--color-clay)', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                        ✓ Auto-filled from {selPlan.name} Plan: {selPlan.trial_days}d Trial • {selPlan.max_units} Units • {selPlan.max_users} Users • {selPlan.max_gates || 5} Gates
                      </small>
                    );
                  })()}
                </div>

                <div>
                  {(() => {
                    const selPlan = plans.find((p) => String(p.id) === String(formData.planId));
                    return (
                      <>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                          Trial Period (Days) {selPlan?.trial_days !== undefined && (
                            <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>
                              (Plan Default: {selPlan.trial_days}d)
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.trialDays}
                          onChange={(e) => setFormData({ ...formData, trialDays: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                          }}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  {(() => {
                    const selPlan = plans.find((p) => String(p.id) === String(formData.planId));
                    const isExceeded = selPlan?.max_units && Number(formData.maxUnits) > selPlan.max_units;
                    return (
                      <>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                          Max Units (Homes) {selPlan?.max_units && (
                            <span style={{ color: isExceeded ? '#ef4444' : 'var(--color-clay)', fontWeight: 600 }}>
                              (Plan Max: {selPlan.max_units})
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.maxUnits}
                          onChange={(e) => setFormData({ ...formData, maxUnits: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-main)',
                            border: isExceeded ? '1px solid #ef4444' : '1px solid var(--border-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                          }}
                        />
                        {isExceeded && (
                          <span style={{ color: '#ef4444', fontSize: '0.72rem', display: 'block', marginTop: '3px' }}>
                            Exceeds {selPlan.name} plan limit of {selPlan.max_units} units!
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div>
                  {(() => {
                    const selPlan = plans.find((p) => String(p.id) === String(formData.planId));
                    return (
                      <>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                          Max Users {selPlan?.max_users && (
                            <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>
                              (Plan Default: {selPlan.max_users})
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.maxUsers}
                          onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                          }}
                        />
                      </>
                    );
                  })()}
                </div>
                <div>
                  {(() => {
                    const selPlan = plans.find((p) => String(p.id) === String(formData.planId));
                    return (
                      <>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                          Max Gates {selPlan?.max_gates && (
                            <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>
                              (Plan Default: {selPlan.max_gates})
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.maxGates}
                          onChange={(e) => setFormData({ ...formData, maxGates: e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 0) })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                          }}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Society Admin Account */}
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-clay)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginTop: '10px' }}>
                3. Society Admin Credentials
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Admin Phone (Login ID) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit phone number"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Admin Email
                  </label>
                  <input
                    type="email"
                    placeholder="admin@society.com"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Initial Admin Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-clay)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
                  }}
                >
                  {submitting ? 'Creating Society...' : 'Create Society & Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIMIT OVERRIDE MODAL */}
      {showLimitsModal && selectedSociety && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Configure Limit Override</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Society: <strong>{selectedSociety.name}</strong>
                </p>
              </div>
              <X size={20} cursor="pointer" onClick={() => setShowLimitsModal(false)} />
            </div>

            {actionError && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleLimitOverrideSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Resource Type
                </label>
                <select
                  value={limitFormData.limitType}
                  onChange={(e) => setLimitFormData({ ...limitFormData, limitType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="UNITS">Units (Homes)</option>
                  <option value="USERS">Users (Residents & Staff)</option>
                  <option value="WORKERS">Workers</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  New Approved Limit
                </label>
                <input
                  type="number"
                  required
                  value={limitFormData.overrideValue}
                  onChange={(e) => setLimitFormData({ ...limitFormData, overrideValue: parseInt(e.target.value, 10) || 0 })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Justification / Audit Reason *
                </label>
                <textarea
                  required
                  placeholder="e.g. Additional tower completed or approved by platform board"
                  rows={3}
                  value={limitFormData.reason}
                  onChange={(e) => setLimitFormData({ ...limitFormData, reason: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowLimitsModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-clay)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : 'Apply Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
