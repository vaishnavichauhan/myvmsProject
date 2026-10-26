import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarCheck2,
  Building2,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  X,
  CreditCard,
  Ban,
} from 'lucide-react';
import superAdminApi from '../../api/superAdminApi';

export default function SuperAdminSubscriptionsPage() {
  const [searchParams] = useSearchParams();
  const [subscriptions, setSubscriptions] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [assignForm, setAssignForm] = useState({
    societyId: searchParams.get('societyId') || '',
    planId: '',
    billingCycle: 'MONTHLY',
    trialDays: 0,
    startDate: new Date().toISOString().split('T')[0],
    notes: 'Assigned by Super Admin',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, socsRes, plansRes] = await Promise.all([
        superAdminApi.getSubscriptions(),
        superAdminApi.getSocieties({ limit: 100 }),
        superAdminApi.getPlans(),
      ]);

      if (subsRes.success) {
        const subList = Array.isArray(subsRes.data) ? subsRes.data : (subsRes.data?.subscriptions || []);
        setSubscriptions(subList);
      }
      if (socsRes.success) {
        const socList = Array.isArray(socsRes.data) ? socsRes.data : (socsRes.data?.societies || []);
        setSocieties(socList);
        if (socList.length > 0 && !assignForm.societyId) {
          setAssignForm((prev) => ({ ...prev, societyId: socList[0].id }));
        }
      }
      if (plansRes.success) {
        const planList = Array.isArray(plansRes.data) ? plansRes.data : (plansRes.data?.plans || []);
        setPlans(planList);
        if (planList.length > 0 && !assignForm.planId) {
          setAssignForm((prev) => ({ ...prev, planId: planList[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      setErrorMessage(err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await superAdminApi.assignSubscription(assignForm);
      setStatusMessage('Subscription successfully assigned/updated.');
      setShowAssignModal(false);
      fetchData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to assign subscription');
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
            Society Subscriptions
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Active, trial, and historical subscription contracts across all societies.
          </p>
        </div>

        <button
          onClick={() => {
            setShowAssignModal(true);
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
          <Plus size={16} /> Assign / Change Plan
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

      {/* Subscriptions Table */}
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
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Plan Assigned</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Rate Snapshot</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Billing Cycle</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Start Date</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>End Date</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No subscriptions registered yet.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    style={{
                      borderBottom: '1px solid var(--border-card)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} color="var(--color-clay)" />
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{sub.society_name}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', paddingLeft: '24px' }}>
                        Code: {sub.society_code}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(139, 92, 246, 0.12)',
                          color: '#8B5CF6',
                        }}
                      >
                        {sub.plan_name}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{Number(sub.price_snapshot || 0).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '14px 16px', textTransform: 'capitalize' }}>
                      {sub.billing_cycle ? sub.billing_cycle.toLowerCase() : 'monthly'}
                    </td>

                    <td style={{ padding: '14px 16px', color: 'var(--text-dim)' }}>
                      {sub.start_date ? new Date(sub.start_date).toLocaleDateString() : 'N/A'}
                    </td>

                    <td style={{ padding: '14px 16px', color: 'var(--text-dim)' }}>
                      {sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'N/A'}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background:
                            sub.status === 'ACTIVE'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : sub.status === 'TRIAL'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            sub.status === 'ACTIVE'
                              ? '#10b981'
                              : sub.status === 'TRIAL'
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      >
                        {sub.status}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setAssignForm({
                            societyId: sub.society_id,
                            planId: sub.plan_id,
                            billingCycle: sub.billing_cycle || 'MONTHLY',
                            trialDays: 0,
                            startDate: new Date().toISOString().split('T')[0],
                            notes: 'Subscription renewal',
                          });
                          setShowAssignModal(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Modify / Renew
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ASSIGN / CHANGE PLAN MODAL */}
      {showAssignModal && (
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
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Assign / Update Subscription
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Changes take effect immediately and snapshot pricing into the contract.
                </p>
              </div>
              <X size={20} cursor="pointer" onClick={() => setShowAssignModal(false)} />
            </div>

            {errorMessage && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '12px' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Target Society *
                </label>
                <select
                  required
                  value={assignForm.societyId}
                  onChange={(e) => setAssignForm({ ...assignForm, societyId: e.target.value })}
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
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Select Subscription Plan *
                </label>
                <select
                  required
                  value={assignForm.planId}
                  onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
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
                      {p.name} — ₹{p.price}/{p.billing_cycle} ({p.max_units} units)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                    Billing Cycle
                  </label>
                  <select
                    value={assignForm.billingCycle}
                    onChange={(e) => setAssignForm({ ...assignForm, billingCycle: e.target.value })}
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
                    Trial Days (0 if paid)
                  </label>
                  <input
                    type="number"
                    value={assignForm.trialDays}
                    onChange={(e) => setAssignForm({ ...assignForm, trialDays: parseInt(e.target.value, 10) || 0 })}
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

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={assignForm.startDate}
                  onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
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
                  {submitting ? 'Applying...' : 'Save Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
