import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Sliders,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Home,
  Users,
  Briefcase,
  RefreshCw,
  Plus,
  X,
} from 'lucide-react';
import superAdminApi from '../../api/superAdminApi';

export default function SuperAdminLimitsPage() {
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [overrideForm, setOverrideForm] = useState({
    limitType: 'UNITS',
    overrideValue: 120,
    reason: '',
  });

  const fetchSocieties = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getSocieties({ limit: 100 });
      const list = Array.isArray(res.data) ? res.data : (res.data?.societies || []);
      if (res.success && list.length > 0) {
        setSocieties(list);
        setSelectedSocietyId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load societies:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async (socId) => {
    if (!socId) return;
    try {
      const res = await superAdminApi.getSocietyUsage(socId);
      if (res.success) {
        setUsageData(res.data);
      }
    } catch (err) {
      console.error('Failed to load society usage:', err);
    }
  };

  useEffect(() => {
    fetchSocieties();
  }, []);

  useEffect(() => {
    if (selectedSocietyId) {
      fetchUsage(selectedSocietyId);
    }
  }, [selectedSocietyId]);

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSocietyId) return;
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await superAdminApi.setLimitOverride(selectedSocietyId, overrideForm);
      setStatusMessage('Limit override configured and logged to audit trail.');
      setShowOverrideModal(false);
      fetchUsage(selectedSocietyId);
      fetchSocieties();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to apply limit override');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSoc = societies.find((s) => s.id === Number(selectedSocietyId));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Resource Usage & Limit Management
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Monitor real-time unit, user, and worker capacities, 80%/90% threshold alerts, and configure approved limit overrides.
          </p>
        </div>

        <button
          onClick={() => {
            if (usageData?.units) {
              setOverrideForm({
                limitType: 'UNITS',
                overrideValue: usageData.units.effectiveLimit + 25,
                reason: 'Authorized expansion approved by platform administration',
              });
            }
            setShowOverrideModal(true);
            setErrorMessage(null);
          }}
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
          <Sliders size={16} /> Grant Limit Override
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

      {/* Society Selector Tab */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)' }}>Selected Society:</span>
        <select
          value={selectedSocietyId || ''}
          onChange={(e) => setSelectedSocietyId(Number(e.target.value))}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-main)',
            fontSize: '0.88rem',
            fontWeight: 700,
            outline: 'none',
            minWidth: '280px',
          }}
        >
          {societies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code}) — {s.plan_name || 'No Plan'}
            </option>
          ))}
        </select>
      </div>

      {/* Usage Cards Grid */}
      {usageData && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Units Card */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Home size={18} color="#3b82f6" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Units (Homes)</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    Base Plan: {usageData.units.baseLimit}
                    {usageData.units.hasOverride && ` • Override: ${usageData.units.overrideValue}`}
                  </div>
                </div>
              </div>

              {usageData.units.percentage >= 90 ? (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  Critical (90%+)
                </span>
              ) : usageData.units.percentage >= 80 ? (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  Warning (80%+)
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  Optimal
                </span>
              )}
            </div>

            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {usageData.units.current} <span style={{ fontSize: '1.1rem', color: 'var(--text-dim)', fontWeight: 600 }}>/ {usageData.units.effectiveLimit}</span>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Capacity Utilized</span>
                <span style={{ fontWeight: 700, color: usageData.units.percentage >= 90 ? '#ef4444' : usageData.units.percentage >= 80 ? '#f59e0b' : 'var(--text-main)' }}>
                  {usageData.units.percentage}% ({usageData.units.remaining} remaining)
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(usageData.units.percentage, 100)}%`,
                    height: '100%',
                    background: usageData.units.percentage >= 90 ? '#ef4444' : usageData.units.percentage >= 80 ? '#f59e0b' : '#3b82f6',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Users Card */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Platform Users</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    Base Plan: {usageData.users.baseLimit}
                    {usageData.users.hasOverride && ` • Override: ${usageData.users.overrideValue}`}
                  </div>
                </div>
              </div>

              {usageData.users.percentage >= 90 ? (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                  Critical (90%+)
                </span>
              ) : usageData.users.percentage >= 80 ? (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  Warning (80%+)
                </span>
              ) : (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  Optimal
                </span>
              )}
            </div>

            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {usageData.users.current} <span style={{ fontSize: '1.1rem', color: 'var(--text-dim)', fontWeight: 600 }}>/ {usageData.users.effectiveLimit}</span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Capacity Utilized</span>
                <span style={{ fontWeight: 700, color: usageData.users.percentage >= 90 ? '#ef4444' : usageData.users.percentage >= 80 ? '#f59e0b' : 'var(--text-main)' }}>
                  {usageData.users.percentage}% ({usageData.users.remaining} remaining)
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(usageData.users.percentage, 100)}%`,
                    height: '100%',
                    background: usageData.users.percentage >= 90 ? '#ef4444' : usageData.users.percentage >= 80 ? '#f59e0b' : '#10b981',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Workers Card */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(196, 154, 108, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={18} color="var(--color-clay)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>Society Workers</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    Base Plan: {usageData.workers.baseLimit}
                    {usageData.workers.hasOverride && ` • Override: ${usageData.workers.overrideValue}`}
                  </div>
                </div>
              </div>

              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                Optimal
              </span>
            </div>

            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {usageData.workers.current} <span style={{ fontSize: '1.1rem', color: 'var(--text-dim)', fontWeight: 600 }}>/ {usageData.workers.effectiveLimit}</span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Capacity Utilized</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {usageData.workers.percentage}% ({usageData.workers.remaining} remaining)
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(usageData.workers.percentage, 100)}%`,
                    height: '100%',
                    background: 'var(--color-clay)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERRIDE MODAL */}
      {showOverrideModal && (
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
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Grant Limit Override</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Society: <strong>{selectedSoc?.name}</strong>
                </p>
              </div>
              <X size={20} cursor="pointer" onClick={() => setShowOverrideModal(false)} />
            </div>

            {errorMessage && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem', marginBottom: '12px' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleOverrideSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Resource Type
                </label>
                <select
                  value={overrideForm.limitType}
                  onChange={(e) => setOverrideForm({ ...overrideForm, limitType: e.target.value })}
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
                  value={overrideForm.overrideValue}
                  onChange={(e) => setOverrideForm({ ...overrideForm, overrideValue: parseInt(e.target.value, 10) || 0 })}
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
                  Audit Justification *
                </label>
                <textarea
                  required
                  placeholder="Reason for limit override (e.g. Society board request or payment confirmed)"
                  rows={3}
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
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
                  onClick={() => setShowOverrideModal(false)}
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
                  {submitting ? 'Applying...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
