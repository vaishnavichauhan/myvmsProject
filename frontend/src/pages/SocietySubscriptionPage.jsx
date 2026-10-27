import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Banknote,
  Building2,
  Calendar,
  Sparkles,
  ShieldCheck,
  X,
  Copy,
  Check,
  ChevronRight,
  ArrowRight,
  FileText,
} from 'lucide-react';
import adminApi from '../api/adminApi';
import { useAuthStore } from '../store/authStore';

export default function SocietySubscriptionPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ subscription: null, invoices: [] });
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Pay Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Form State
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'CARD' | 'CASH'
  const [transactionRef, setTransactionRef] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [cashPayer, setCashPayer] = useState('');
  const [notes, setNotes] = useState('');

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await adminApi.getSubscriptionBilling();
      if (res?.success || res?.data) {
        setData(res.data || res);
      }
    } catch (err) {
      console.error('Failed to load subscription billing:', err);
      setErrorMessage(err.message || 'Failed to load subscription & billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentMethod('UPI');
    setTransactionRef('');
    setCardHolder('');
    setBankName('');
    setCashPayer(user?.name || user?.full_name || '');
    setNotes('');
    setShowPayModal(true);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('myvms.platform@axisbank');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    let finalRef = transactionRef.trim();
    if (paymentMethod === 'CARD') {
      finalRef = `${bankName ? bankName + ' - ' : ''}${cardHolder ? cardHolder + ' - ' : ''}${transactionRef || 'CARD-TXN'}`;
    } else if (paymentMethod === 'CASH') {
      finalRef = `CASH - ${cashPayer || 'Admin'} ${transactionRef ? '(' + transactionRef + ')' : ''}`;
    }

    if (!finalRef) {
      setErrorMessage('Please provide a valid transaction reference or payment identifier.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await adminApi.paySubscriptionInvoice(selectedInvoice.id, {
        paymentMethod,
        transactionRef: finalRef,
        amount: selectedInvoice.amount,
        notes: notes.trim() || `Submitted by Society Admin for Invoice ${selectedInvoice.invoice_number}`,
      });

      setStatusMessage(
        `Payment information for invoice ${selectedInvoice.invoice_number} submitted successfully! It is now pending verification and approval by the Super Admin.`
      );
      setShowPayModal(false);
      await fetchBillingData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit payment details');
    } finally {
      setSubmitting(false);
    }
  };

  const sub = data.subscription;
  const invoices = data.invoices || [];

  // Calculate trial days remaining
  let trialRemainingDays = null;
  if (sub?.trial_ends_at) {
    const trialEnd = new Date(sub.trial_ends_at);
    const today = new Date();
    const diffTime = trialEnd - today;
    trialRemainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Subscription & Platform Billing
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Manage your society's platform subscription tier, trial status, and pay invoices via UPI, Card, or Cash.
          </p>
        </div>

        <button
          onClick={fetchBillingData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-main)',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status Messages */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{statusMessage}</span>
          </div>
          <X size={16} cursor="pointer" onClick={() => setStatusMessage(null)} />
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
          <X size={16} cursor="pointer" onClick={() => setErrorMessage(null)} />
        </div>
      )}

      {/* Subscription Status Card */}
      {sub && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(196, 154, 108, 0.12) 0%, var(--bg-secondary) 100%)',
            border: '1px solid rgba(196, 154, 108, 0.25)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--color-clay)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-clay)', fontWeight: 800 }}>
                  Active Society Subscription
                </div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {sub.plan_name || 'Platform Subscription Plan'}
                </h2>
              </div>
            </div>

            {/* Trial or Active Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {sub.status === 'TRIAL' || sub.subscription_status === 'TRIAL' ? (
                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(245, 158, 11, 0.18)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#d97706',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={14} />
                  <span>14-Day Free Trial Active</span>
                  {trialRemainingDays !== null && (
                    <span style={{ opacity: 0.85, fontWeight: 600 }}>({trialRemainingDays} days remaining)</span>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(16, 185, 129, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#10b981',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>Verified Active Subscription</span>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-card)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Plan Price</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                ₹{Number(sub.price_snapshot || sub.plan_catalog_price || 0).toLocaleString('en-IN')}{' '}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                  /{sub.billing_cycle ? sub.billing_cycle.toLowerCase() : 'monthly'}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Trial Ends / Due Date</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
                {sub.trial_ends_at || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Capacity Quota</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {sub.max_units} Units • {sub.max_users} Users • {sub.max_gates} Gates
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Subscription Term</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                {sub.start_date} to {sub.end_date}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoices & Payment Section */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-card)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Subscription Billing Invoices
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Invoices generated for your society subscription. Select "Pay" on pending invoices to submit payment via UPI, Card, or Cash.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-card)' }}>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 700 }}>Invoice #</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 700 }}>Plan Tier</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 700 }}>Billing Period (Starts After Trial)</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 700 }}>Due Date</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 700 }}>Amount</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '14px 18px', color: 'var(--text-dim)', fontWeight: 700, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Loading billing invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No subscription invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    style={{
                      borderBottom: '1px solid var(--border-card)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700 }}>
                      {inv.invoice_number}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: '#8B5CF6',
                        }}
                      >
                        {inv.plan_name}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px', fontSize: '0.82rem' }}>
                      <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        {inv.billing_period_start} → {inv.billing_period_end}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Starting after 14-day trial
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#f59e0b', fontSize: '0.85rem' }}>
                      {inv.due_date}
                    </td>

                    <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.98rem' }}>
                      ₹{Number(inv.amount).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      {inv.status === 'PAID' ? (
                        <div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={12} /> PAID
                          </span>
                          {inv.receipt_number && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '3px', fontFamily: 'monospace' }}>
                              {inv.receipt_number}
                            </div>
                          )}
                        </div>
                      ) : inv.payment_status === 'PENDING' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '12px',
                              background: 'rgba(245, 158, 11, 0.18)',
                              color: '#d97706',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: 'fit-content',
                            }}
                          >
                            <Clock size={12} /> Awaiting Super Admin Approval
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            Submitted via {inv.payment_method} ({inv.transaction_reference})
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#ef4444',
                          }}
                        >
                          UNPAID
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      {inv.status === 'PAID' ? (
                        <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                          ✓ Settled
                        </span>
                      ) : inv.payment_status === 'PENDING' ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-dim)',
                            fontStyle: 'italic',
                          }}
                        >
                          Under Review
                        </span>
                      ) : (
                        <button
                          onClick={() => openPaymentModal(inv)}
                          style={{
                            padding: '7px 16px',
                            borderRadius: '6px',
                            background: 'var(--color-clay)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                          }}
                        >
                          <CreditCard size={14} /> Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT MODAL (UPI, CARD, CASH) */}
      {showPayModal && selectedInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
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
              maxWidth: '540px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Pay Subscription Invoice
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Invoice: <strong>{selectedInvoice.invoice_number}</strong> • Amount: <strong>₹{Number(selectedInvoice.amount).toLocaleString('en-IN')}</strong>
                </p>
              </div>
              <X size={20} cursor="pointer" onClick={() => setShowPayModal(false)} />
            </div>

            {/* Payment Method Selector Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
                background: 'var(--bg-main)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '18px',
              }}
            >
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: paymentMethod === 'UPI' ? 'var(--color-clay)' : 'transparent',
                  color: paymentMethod === 'UPI' ? '#ffffff' : 'var(--text-dim)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <QrCode size={15} /> UPI (GPay/PhonePe)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: paymentMethod === 'CARD' ? 'var(--color-clay)' : 'transparent',
                  color: paymentMethod === 'CARD' ? '#ffffff' : 'var(--text-dim)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <CreditCard size={15} /> Card / NetBanking
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: paymentMethod === 'CASH' ? 'var(--color-clay)' : 'transparent',
                  color: paymentMethod === 'CASH' ? '#ffffff' : 'var(--text-dim)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Banknote size={15} /> Cash Payment
              </button>
            </div>

            {/* TAB CONTENT */}
            <form onSubmit={handleConfirmPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {paymentMethod === 'UPI' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      background: 'rgba(196, 154, 108, 0.08)',
                      border: '1px solid rgba(196, 154, 108, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-clay)', textTransform: 'uppercase' }}>
                      Platform Official UPI ID
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                        myvms.platform@axisbank
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: copiedUpi ? '#10b981' : 'var(--bg-secondary)',
                          border: '1px solid var(--border-card)',
                          color: copiedUpi ? '#ffffff' : 'var(--text-main)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                        {copiedUpi ? 'Copied' : 'Copy UPI'}
                      </button>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: '6px 0 0 0' }}>
                      Scan QR or pay ₹{Number(selectedInvoice.amount).toLocaleString('en-IN')} using Google Pay, PhonePe, Paytm, or BHIM.
                    </p>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                      UPI 12-Digit Reference / UTR Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 429381749281 or UPI-TXN-12345"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.88rem',
                      }}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                      Cardholder / Account Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Name as printed on Card"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC, ICICI, SBI"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                        Card Transaction / Auth Ref *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Last 4 digits / Auth Code"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-card)',
                          color: 'var(--text-main)',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'CASH' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>
                      Cash Payment Instructions
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                      Deposit cash directly with the Platform Super Administrator office. Provide depositor details and cash voucher or receipt number below.
                    </p>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                      Depositor / Payer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={cashPayer}
                      onChange={(e) => setCashPayer(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                      Cash Voucher / Receipt Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CASH-RCP-1049"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  Payment Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional payment details, branch, or remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 'var(--radius-sm)',
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
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-clay)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={15} />
                  {submitting ? 'Submitting...' : 'Confirm Payment Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
