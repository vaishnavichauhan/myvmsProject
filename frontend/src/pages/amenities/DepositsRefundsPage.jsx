import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgePercent,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Building2,
  Users,
  Search,
  Filter,
  Eye,
  X,
  FileText,
  DollarSign,
  AlertCircle,
  Info,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { amenityApi } from '../../api/amenityApi';
import { useAuthStore } from '../../store/authStore';
import { ROLES } from '../../constants/roles';

export const REFUND_STATUS_CONFIG = {
  NOT_APPLICABLE: { label: 'Not Applicable', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
  ELIGIBLE: { label: 'Eligible for Refund', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
  APPROVED: { label: 'Approved — Ready', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  PROCESSED: { label: 'Processed & Paid', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
  REJECTED: { label: 'Deducted / Forfeited', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
};

export default function DepositsRefundsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Refund Processing Modal
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [refundForm, setRefundForm] = useState({
    refund_amount: '',
    transaction_reference: '',
    remarks: 'Security deposit refund after facility inspection',
  });
  const [submitting, setSubmitting] = useState(false);
  const [refundError, setRefundError] = useState(null);

  // Fetch Bookings with deposits
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await amenityApi.getBookings();
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      // Filter for bookings with security deposit > 0 or deposit collected > 0
      const depositBookings = list.filter(
        (b) => Number(b.security_deposit) > 0 || Number(b.deposit_collected_amount) > 0
      );
      setBookings(depositBookings);
    } catch (err) {
      console.error('Failed to load deposit ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered List
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.deposit_refund_status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const numMatch = b.booking_number?.toLowerCase().includes(q);
      const nameMatch = b.resident_name?.toLowerCase().includes(q);
      const homeMatch = String(b.home_number)?.toLowerCase().includes(q);
      const amMatch = b.amenity_name?.toLowerCase().includes(q);
      return numMatch || nameMatch || homeMatch || amMatch;
    }
    return true;
  });

  // KPI Calculations
  const totalDepositsCollected = bookings.reduce((sum, b) => sum + Number(b.deposit_collected_amount || 0), 0);
  const totalDamageDeductions = bookings.reduce((sum, b) => sum + Number(b.deposit_deduction_amount || 0), 0);
  const totalProcessedRefunds = bookings
    .filter((b) => b.deposit_refund_status === 'PROCESSED')
    .reduce((sum, b) => sum + Number(b.deposit_refund_amount || 0), 0);
  const netRefundableBalance = Math.max(0, totalDepositsCollected - totalDamageDeductions - totalProcessedRefunds);

  // Open Process Refund Modal
  const handleOpenRefundModal = (booking) => {
    setSelectedBooking(booking);
    const collected = Number(booking.deposit_collected_amount || 0);
    const deducted = Number(booking.deposit_deduction_amount || 0);
    const maxRefund = Math.max(0, collected - deducted);

    setRefundForm({
      refund_amount: String(maxRefund),
      transaction_reference: '',
      remarks: 'Deposit refund post-inspection reconciliation',
    });
    setRefundError(null);
    setIsRefundModalOpen(true);
  };

  const handleConfirmRefund = async (e) => {
    e.preventDefault();
    if (!refundForm.transaction_reference.trim()) {
      alert('Transaction reference / UTR is required to confirm bank reconciliation.');
      return;
    }

    try {
      setSubmitting(true);
      setRefundError(null);
      await amenityApi.processRefund(selectedBooking.id, {
        refund_amount: Number(refundForm.refund_amount),
        transaction_reference: refundForm.transaction_reference.trim(),
        remarks: refundForm.remarks,
      });

      alert('Refund processed and recorded successfully!');
      setIsRefundModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Refund failed', err);
      setRefundError(err.response?.data?.message || err.message || 'Refund processing failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px',
            }}
          >
            <Link to="/dashboard" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
              Dashboard
            </Link>
            <span>/</span>
            <Link to="/dashboard/amenities" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
              Amenities
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>Deposits & Refunds</span>
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
            }}
          >
            <BadgePercent size={28} color="var(--color-clay)" />
            Security Deposits & Refund Ledger
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Track refundable liabilities, damage deductions, inspection notes, and bank refund reconciliations.
          </p>
        </div>

        <button
          onClick={fetchData}
          title="Refresh ledger"
          style={{
            padding: '9px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-main)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Accounting Notice Banner */}
      <div
        style={{
          padding: '14px 18px',
          background: 'rgba(196, 154, 108, 0.1)',
          border: '1px solid rgba(196, 154, 108, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-main)',
          fontSize: '0.86rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <Info size={18} color="var(--color-clay)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Non-Income Liability Accounting:</strong> Security deposits are refundable guarantees collected to safeguard society assets. The formula enforced across MYVMS is:
          <div style={{ marginTop: '4px', fontWeight: 700, color: 'var(--color-clay)' }}>
            Refundable Amount = Deposit Collected − Approved Deductions
          </div>
          Refunds are only marked as processed upon verified transaction reconciliation.
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            Total Deposits Collected
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#C49A6C' }}>
            ₹{totalDepositsCollected.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>From confirmed reservations</span>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#EF4444', fontWeight: 600 }}>
            Approved Damage Deductions
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#EF4444' }}>
            ₹{totalDamageDeductions.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Retained for society repairs</span>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
            Processed & Paid Refunds
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>
            ₹{totalProcessedRefunds.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Reconciled back to residents</span>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 600 }}>
            Active Refundable Liability
          </span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB' }}>
            ₹{netRefundableBalance.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Deposits currently held</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1px solid var(--border-card)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 240px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            placeholder="Search by booking #, resident name, or home..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Refund Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
            }}
          >
            <option value="ALL">All Statuses</option>
            {Object.keys(REFUND_STATUS_CONFIG).map((k) => (
              <option key={k} value={k}>
                {REFUND_STATUS_CONFIG[k].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Deposits Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading deposit records...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-card)',
          }}
        >
          <BadgePercent size={42} color="var(--color-clay)" style={{ opacity: 0.5, marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-main)' }}>No Deposit Transactions</h3>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.86rem' }}>
            No security deposit records found matching the current criteria.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-card)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Booking #</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Amenity & Date</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Resident & Home</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Deposit Collected</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Deductions</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Net Refundable</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Refund Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const collected = Number(b.deposit_collected_amount || 0);
                const deducted = Number(b.deposit_deduction_amount || 0);
                const netRefundable = Math.max(0, collected - deducted);
                const refundCfg = REFUND_STATUS_CONFIG[b.deposit_refund_status] || REFUND_STATUS_CONFIG.NOT_APPLICABLE;
                const canProcessRefund = isAdmin && ['ELIGIBLE', 'PENDING_APPROVAL', 'APPROVED'].includes(b.deposit_refund_status) && netRefundable > 0;

                return (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: '1px solid var(--border-card)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-clay)' }}>
                      {b.booking_number}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{b.amenity_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{b.booking_date}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        Home {b.home_number || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {b.resident_name || 'Resident'}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#C49A6C' }}>
                      ₹{collected.toLocaleString()}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {deducted > 0 ? (
                        <div>
                          <span style={{ fontWeight: 700, color: '#EF4444' }}>-₹{deducted.toLocaleString()}</span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            {b.deposit_deduction_reason || 'Damage'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>₹0</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 800, color: netRefundable > 0 ? '#10B981' : 'var(--text-dim)' }}>
                      ₹{netRefundable.toLocaleString()}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: refundCfg.bg,
                          color: refundCfg.color,
                        }}
                      >
                        {refundCfg.label}
                      </span>
                      {b.deposit_refund_txn_ref && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Ref: {b.deposit_refund_txn_ref}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {canProcessRefund ? (
                        <button
                          onClick={() => handleOpenRefundModal(b)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--color-clay)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          Process Refund
                        </button>
                      ) : b.deposit_refund_status === 'PROCESSED' ? (
                        <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                          ✓ Disbursed
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ====================================================================== */}
      {/* PROCESS REFUND MODAL                                                   */}
      {/* ====================================================================== */}
      {isRefundModalOpen && selectedBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
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
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-card)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BadgePercent size={20} color="var(--color-clay)" />
                Process Security Deposit Refund
              </h3>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}>
              <div><strong>Booking:</strong> {selectedBooking.booking_number} ({selectedBooking.amenity_name})</div>
              <div><strong>Resident:</strong> {selectedBooking.resident_name} (Home {selectedBooking.home_number})</div>
              <div><strong>Deposit Collected:</strong> ₹{Number(selectedBooking.deposit_collected_amount || 0).toLocaleString()}</div>
              {Number(selectedBooking.deposit_deduction_amount) > 0 && (
                <div style={{ color: '#EF4444' }}>
                  <strong>Approved Deductions:</strong> -₹{Number(selectedBooking.deposit_deduction_amount).toLocaleString()}
                </div>
              )}
            </div>

            {refundError && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  fontSize: '0.82rem',
                }}
              >
                {refundError}
              </div>
            )}

            <form onSubmit={handleConfirmRefund} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Refund Amount to Disburse (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={
                    Number(selectedBooking.deposit_collected_amount || 0) -
                    Number(selectedBooking.deposit_deduction_amount || 0)
                  }
                  value={refundForm.refund_amount}
                  onChange={(e) => setRefundForm({ ...refundForm, refund_amount: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Bank UTR / Transaction Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-9988772211 or NEFT-33221"
                  value={refundForm.transaction_reference}
                  onChange={(e) => setRefundForm({ ...refundForm, transaction_reference: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Audit Remarks
                </label>
                <input
                  type="text"
                  value={refundForm.remarks}
                  onChange={(e) => setRefundForm({ ...refundForm, remarks: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 24px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#059669',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Confirming...' : 'Disburse & Close Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
