import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Check,
  Edit,
  Copy,
  Trash2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Tag,
} from 'lucide-react';
import superAdminApi from '../../api/superAdminApi';

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: 4999,
    billingCycle: 'MONTHLY',
    maxUsers: 50,
    maxUnits: 100,
    maxGates: 5,
    trialDays: 14,
    features: [],
    status: 'ACTIVE',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, featsRes] = await Promise.all([
        superAdminApi.getPlans(),
        superAdminApi.getPlatformFeatures(),
      ]);

      if (plansRes.success) {
        setPlans(plansRes.data.plans || []);
      }
      if (featsRes.success) {
        setFeatures(featsRes.data.features || []);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
      setErrorMessage(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      price: 2999,
      billingCycle: 'MONTHLY',
      maxUsers: 50,
      maxUnits: 100,
      maxGates: 5,
      trialDays: 14,
      features: ['RESIDENTS', 'WORKERS', 'POLLS', 'GATES_VISITORS'],
      status: 'ACTIVE',
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  const getPlanFeatureCodes = (planFeatures) => {
    if (!Array.isArray(planFeatures)) return [];
    return planFeatures.map((f) => (typeof f === 'string' ? f : f?.code)).filter(Boolean);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      price: parseFloat(plan.price) || 0,
      billingCycle: plan.billing_cycle || 'MONTHLY',
      maxUsers: plan.max_users || 50,
      maxUnits: plan.max_units || 100,
      maxGates: plan.max_gates || 5,
      trialDays: plan.trial_days || 0,
      features: getPlanFeatureCodes(plan.features),
      status: plan.status || 'ACTIVE',
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleDuplicatePlan = (plan) => {
    setEditingPlan(null);
    setFormData({
      name: `${plan.name} (Copy)`,
      code: `${plan.code}_COPY`.substring(0, 50),
      description: plan.description || '',
      price: parseFloat(plan.price) || 0,
      billingCycle: plan.billing_cycle || 'MONTHLY',
      maxUsers: plan.max_users || 50,
      maxUnits: plan.max_units || 100,
      maxGates: plan.max_gates || 5,
      trialDays: plan.trial_days || 0,
      features: getPlanFeatureCodes(plan.features),
      status: 'ACTIVE',
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  const toggleFeature = (code) => {
    setFormData((prev) => {
      const exists = prev.features.includes(code);
      return {
        ...prev,
        features: exists ? prev.features.filter((f) => f !== code) : [...prev.features, code],
      };
    });
  };

  const selectAllFeatures = () => {
    setFormData((prev) => ({
      ...prev,
      features: features.map((f) => f.code),
    }));
  };

  const deselectAllFeatures = () => {
    setFormData((prev) => ({
      ...prev,
      features: [],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        maxUnits: parseInt(formData.maxUnits, 10) || 0,
        maxUsers: parseInt(formData.maxUsers, 10) || 0,
        maxGates: parseInt(formData.maxGates, 10) || 5,
        trialDays: parseInt(formData.trialDays, 10) || 0,
        max_units: parseInt(formData.maxUnits, 10) || 0,
        max_users: parseInt(formData.maxUsers, 10) || 0,
        max_gates: parseInt(formData.maxGates, 10) || 5,
        trial_days: parseInt(formData.trialDays, 10) || 0,
        billing_cycle: formData.billingCycle,
      };

      if (editingPlan) {
        await superAdminApi.updatePlan(editingPlan.id, payload);
        setStatusMessage(`Plan "${formData.name}" updated successfully.`);
      } else {
        await superAdminApi.createPlan(payload);
        setStatusMessage(`Plan "${formData.name}" created successfully.`);
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Subscription Plans & Tiers
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Configure platform pricing, capacity limits, and granular module entitlements per plan.
          </p>
        </div>

        <button
          onClick={openCreateModal}
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
          <Plus size={16} /> Create Plan
        </button>
      </div>

      {statusMessage && (
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
          <span>{statusMessage}</span>
          <X size={16} cursor="pointer" onClick={() => setStatusMessage(null)} />
        </div>
      )}

      {/* Plan Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {loading ? (
          <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            Loading subscription plans...
          </div>
        ) : (
          plans.map((plan) => {
            const planFeatCodes = getPlanFeatureCodes(plan.features);
            const sortedFeatures = [...features].sort((a, b) => {
              const aIncluded = planFeatCodes.includes(a.code);
              const bIncluded = planFeatCodes.includes(b.code);
              if (aIncluded && !bIncluded) return -1;
              if (!aIncluded && bIncluded) return 1;
              return a.name.localeCompare(b.name);
            });
            return (
              <div
                key={plan.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                }}
              >
                {/* Top Badge & Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(196, 154, 108, 0.15)',
                        color: 'var(--color-clay)',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                      }}
                    >
                      {plan.code}
                    </span>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                      {plan.name}
                    </h2>
                  </div>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      background: plan.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      color: plan.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                    }}
                  >
                    {plan.status}
                  </span>
                </div>

                <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', minHeight: '36px', lineHeight: '1.4' }}>
                  {plan.description || 'Standard society plan with configurable module allocations.'}
                </p>

                {/* Price Display */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ₹{Number(plan.price).toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                    / {plan.billing_cycle ? plan.billing_cycle.toLowerCase() : 'monthly'}
                  </span>
                </div>

                {/* Capacities */}
                <div
                  style={{
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    textAlign: 'center',
                    fontSize: '0.78rem',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Max Units</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{plan.max_units}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Max Users</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{plan.max_users}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Max Gates</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{plan.max_gates || 5}</div>
                  </div>
                </div>

                {/* Included Features List with Highlighting */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Features Access
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 8px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                      }}
                    >
                      {planFeatCodes.length} / {features.length} Included
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {sortedFeatures.map((feat) => {
                      const isIncluded = planFeatCodes.includes(feat.code);
                      return (
                        <span
                          key={feat.code}
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isIncluded ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            color: isIncluded ? '#10b981' : 'var(--text-dim)',
                            border: isIncluded ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px dashed var(--border-subtle)',
                            fontWeight: isIncluded ? 700 : 400,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: isIncluded ? 1 : 0.42,
                            boxShadow: isIncluded ? '0 1px 3px rgba(16, 185, 129, 0.12)' : 'none',
                          }}
                        >
                          {isIncluded ? (
                            <Check size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                          ) : (
                            <X size={10} style={{ flexShrink: 0, opacity: 0.5 }} />
                          )}
                          {feat.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => openEditModal(plan)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Edit size={13} /> Edit Plan
                  </button>
                  <button
                    onClick={() => handleDuplicatePlan(plan)}
                    title="Duplicate plan configuration"
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT PLAN MODAL */}
      {showModal && (
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
              maxWidth: '640px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {editingPlan ? 'Edit Subscription Plan' : 'Create New Plan'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Define pricing, cycle, resource capacities, and select included platform modules.
                </p>
              </div>
              <X size={20} cursor="pointer" onClick={() => setShowModal(false)} />
            </div>

            {errorMessage && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '14px' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Plus"
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
                    Unique Plan Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ENTERPRISE_PLUS"
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

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Plan features summary"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
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
                    Billing Cycle
                  </label>
                  <select
                    value={formData.billingCycle}
                    onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
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
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half-Yearly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Trial Period (Days)
                  </label>
                  <input
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Max Units Allowed
                  </label>
                  <input
                    type="number"
                    value={formData.maxUnits}
                    onChange={(e) => setFormData({ ...formData, maxUnits: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
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
                    Max Users Allowed
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
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
                    Max Gates Allowed
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxGates}
                    onChange={(e) => setFormData({ ...formData, maxGates: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
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

              {/* Feature Checklist with Highlights */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-clay)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Included Platform Features</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: 'rgba(196, 154, 108, 0.2)',
                        color: 'var(--color-clay)',
                        fontWeight: 700,
                      }}
                    >
                      {formData.features.length} / {features.length} Selected
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={selectAllFeatures}
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        background: 'transparent',
                        border: '1px solid var(--border-card)',
                        color: 'var(--color-clay)',
                        cursor: 'pointer',
                      }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllFeatures}
                      style={{
                        padding: '3px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        background: 'transparent',
                        border: '1px solid var(--border-card)',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                      }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: '8px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    maxHeight: '270px',
                    overflowY: 'auto',
                  }}
                >
                  {features.map((feat) => {
                    const checked = formData.features.includes(feat.code);
                    return (
                      <div
                        key={feat.code}
                        onClick={() => toggleFeature(feat.code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: checked ? 'rgba(196, 154, 108, 0.15)' : 'var(--bg-secondary)',
                          border: checked ? '1.5px solid var(--color-clay)' : '1px solid var(--border-card)',
                          boxShadow: checked ? '0 2px 6px rgba(196, 154, 108, 0.18)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              background: checked ? 'var(--color-clay)' : 'var(--bg-main)',
                              border: checked ? '1.5px solid var(--color-clay)' : '1.5px solid var(--border-card)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {checked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: checked ? 700 : 500,
                              color: checked ? 'var(--text-main)' : 'var(--text-dim)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={feat.name}
                          >
                            {feat.name}
                          </span>
                        </div>
                        {checked && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(196, 154, 108, 0.25)',
                              color: 'var(--color-clay)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                              flexShrink: 0,
                              marginLeft: '6px',
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 16px',
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
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-clay)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
