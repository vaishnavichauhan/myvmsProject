import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  X,
  CreditCard,
  Building2,
  Download,
} from 'lucide-react';
import superAdminApi from '../../api/superAdminApi';

export default function SuperAdminBillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    transactionRef: '',
    notes: '',
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getInvoices();
      if (res.success) {
        setInvoices(Array.isArray(res.data) ? res.data : (res.data?.invoices || []));
      }
    } catch (err) {
      console.error('Failed to load subscription invoices:', err);
      setErrorMessage(err.message || 'Failed to fetch billing invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleApprovePayment = async (inv) => {
    try {
      setApprovingId(inv.id);
      setErrorMessage(null);
      await superAdminApi.approvePayment(inv.id);
      setStatusMessage(`Payment confirmed! Invoice ${inv.invoice_number} marked PAID and ${inv.society_name} subscription is now ACTIVE.`);
      await fetchInvoices();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to approve payment');
    } finally {
      setApprovingId(null);
    }
  };

  const handleAutoGenerateBills = async () => {
    try {
      setAutoGenerating(true);
      setErrorMessage(null);
      const res = await superAdminApi.autoGenerateInvoices();
      const count = res?.data?.generated?.length || 0;
      setStatusMessage(count > 0 ? `Auto-generated ${count} recurring subscription invoice(s).` : 'All society subscription invoices are up to date.');
      await fetchInvoices();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to auto-generate bills');
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await superAdminApi.recordPayment(selectedInvoice.id, paymentForm);
      setStatusMessage(`Payment of ₹${paymentForm.amount} recorded for invoice ${selectedInvoice.invoice_number}.`);
      setShowPaymentModal(false);
      fetchInvoices();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const totalBilled = invoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === 'PAID').reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
  const totalPending = invoices.filter((i) => i.status === 'PENDING').reduce((acc, inv) => acc + Number(inv.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Subscription Billing & Invoices
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Platform subscription revenue, invoices, and verified payment transactions (strictly isolated from society maintenance).
          </p>
        </div>

        <button
          onClick={handleAutoGenerateBills}
          disabled={autoGenerating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-clay)',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: autoGenerating ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <RefreshCw size={14} className={autoGenerating ? 'animate-spin' : ''} />
          {autoGenerating ? 'Checking Renewals...' : 'Auto-Generate Monthly Bills'}
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
          <span>{errorMessage}</span>
          <X size={16} cursor="pointer" onClick={() => setErrorMessage(null)} />
        </div>
      )}

      {/* Revenue KPI Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Subscription Revenue</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            ₹{totalPaid.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>Verified collected platform fees</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Pending Invoices</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>Awaiting society transfer</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Billed Volume</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            ₹{totalBilled.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>Across {invoices.length} invoices</div>
        </div>
      </div>

      {/* Invoices Table */}
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
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Invoice #</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Society</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Plan & Cycle</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Billing Period & Due Date</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Amount</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Status & Details</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-dim)', fontWeight: 700, textAlign: 'right' }}>Actions</th>
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
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700 }}>
                      {inv.invoice_number}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{inv.society_name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Code: {inv.society_code}</div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: '#8B5CF6',
                        }}
                      >
                        {inv.plan_name}
                      </span>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '3px', textTransform: 'capitalize' }}>
                        {inv.billing_cycle ? inv.billing_cycle.toLowerCase() : 'monthly'}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '0.8rem' }}>
                      <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        {inv.billing_period_start} → {inv.billing_period_end}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#f59e0b', marginTop: '2px' }}>
                        Due: {inv.due_date}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      ₹{Number(inv.amount).toLocaleString('en-IN')}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
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
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '3px', fontFamily: 'monospace' }}>
                              {inv.receipt_number}
                            </div>
                          )}
                        </div>
                      ) : inv.payment_status === 'PENDING' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                            <Clock size={12} /> Pending Approval
                          </span>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            via {inv.payment_method || 'UPI'} • {inv.transaction_reference}
                          </div>
                          {inv.payment_notes && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                              "{inv.payment_notes}"
                            </div>
                          )}
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

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {inv.payment_status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleApprovePayment(inv)}
                            disabled={approvingId === inv.id}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#10b981',
                              border: 'none',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: approvingId === inv.id ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={13} />
                            {approvingId === inv.id ? 'Approving...' : 'Approve Payment'}
                          </button>
                        </div>
                      ) : inv.status === 'PENDING' ? (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setPaymentForm({
                              amount: inv.amount,
                              paymentMethod: 'CASH',
                              transactionRef: `OFFLINE-${Date.now().toString().slice(-6)}`,
                              notes: `Direct cash/offline payment for ${inv.society_name}`,
                            });
                            setShowPaymentModal(true);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'var(--color-clay)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Record Payment
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                          ✓ Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && selectedInvoice && (
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Record Subscription Payment
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Invoice: <strong>{selectedInvoice.invoice_number}</strong> ({selectedInvoice.society_name})
                </p>
              </div>
              <X size={20} cursor="pointer" onClick={() => setShowPaymentModal(false)} />
            </div>

            {errorMessage && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.82rem', marginBottom: '12px' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Amount Received (INR) *
                </label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
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
                  Payment Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
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
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="UPI">UPI / QR Payment</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Transaction Reference / UTR Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR928371948"
                  value={paymentForm.transactionRef}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
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

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                  Payment Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional reconciliation notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
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
                  onClick={() => setShowPaymentModal(false)}
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
                  {submitting ? 'Confirming...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
