import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Receipt,
  Coins,
  Sparkles,
  CreditCard,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Search,
  Building2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Layers,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import accountApi from '../api/accountApi';

export default function AccountsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'monthly' | 'transactions'
  const [yearFilter, setYearFilter] = useState('');
  const [overview, setOverview] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [txnCategoryFilter, setTxnCategoryFilter] = useState('ALL');
  const [txnSearch, setTxnSearch] = useState('');
  const [expandedMonth, setExpandedMonth] = useState(null);

  const defaultOverview = {
    maintenance: { billed: 0, paid: 0, pending: 0, count: 0, paidCount: 0 },
    specialCharges: { billed: 0, paid: 0, pending: 0, count: 0, paidCount: 0 },
    amenities: { billed: 0, paid: 0, pending: 0, count: 0, paidCount: 0 },
    subscription: { billed: 0, paid: 0, pending: 0, count: 0, paidCount: 0 },
    grandTotals: { totalBilled: 0, totalPaid: 0, totalPending: 0, recoveryRate: 100 },
  };
  const activeOverview = overview || defaultOverview;

  // Fetch all accounts data
  const fetchAccountsData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = yearFilter ? { year: yearFilter } : {};
      const [overviewRes, monthlyRes, txnsRes] = await Promise.all([
        accountApi.getOverview(params),
        accountApi.getMonthly(params),
        accountApi.getTransactions({ category: txnCategoryFilter, limit: 100 }),
      ]);

      const rawOverview = overviewRes?.data?.data || overviewRes?.data || overviewRes;
      if (rawOverview && (rawOverview.grandTotals || rawOverview.maintenance)) {
        setOverview(rawOverview);
      }

      const rawMonths =
        monthlyRes?.data?.months ||
        monthlyRes?.data?.data?.months ||
        monthlyRes?.months ||
        (Array.isArray(monthlyRes?.data) ? monthlyRes.data : []);
      setMonthlyData(Array.isArray(rawMonths) ? rawMonths : []);

      const rawTxns =
        txnsRes?.data?.transactions ||
        txnsRes?.data?.data?.transactions ||
        txnsRes?.transactions ||
        (Array.isArray(txnsRes?.data) ? txnsRes.data : []);
      setTransactions(Array.isArray(rawTxns) ? rawTxns : []);
    } catch (err) {
      console.error('Failed to load accounts data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccountsData();
  }, [yearFilter, txnCategoryFilter]);

  // Filtered transactions for search
  const filteredTransactions = useMemo(() => {
    if (!txnSearch.trim()) return transactions;
    const term = txnSearch.toLowerCase();
    return transactions.filter(
      (t) =>
        t.reference_number?.toLowerCase().includes(term) ||
        t.invoice_number?.toLowerCase().includes(term) ||
        t.home_number?.toLowerCase().includes(term) ||
        t.resident_name?.toLowerCase().includes(term) ||
        t.transaction_reference?.toLowerCase().includes(term)
    );
  }, [transactions, txnSearch]);

  // Aggregate totals across all months for report footer
  const monthlyTotals = useMemo(() => {
    return monthlyData.reduce(
      (acc, m) => {
        acc.totalBilled += Number(m.totalBilled || 0);
        acc.totalPayment += Number(m.totalPayment || 0);
        acc.totalPending += Number(m.totalPending || 0);
        acc.maintPaid += Number(m.maintenance?.paid || 0);
        acc.maintPending += Number(m.maintenance?.pending || 0);
        acc.scPaid += Number(m.specialCharges?.paid || 0);
        acc.scPending += Number(m.specialCharges?.pending || 0);
        acc.amenitiesPaid += Number(m.amenities?.paid || 0);
        acc.amenitiesPending += Number(m.amenities?.pending || 0);
        acc.subPaid += Number(m.subscription?.paid || 0);
        acc.subPending += Number(m.subscription?.pending || 0);
        return acc;
      },
      {
        totalBilled: 0,
        totalPayment: 0,
        totalPending: 0,
        maintPaid: 0,
        maintPending: 0,
        scPaid: 0,
        scPending: 0,
        amenitiesPaid: 0,
        amenitiesPending: 0,
        subPaid: 0,
        subPending: 0,
      }
    );
  }, [monthlyData]);

  const monthlyTotalRecovery =
    monthlyTotals.totalBilled > 0
      ? Math.round((monthlyTotals.totalPayment / monthlyTotals.totalBilled) * 100)
      : 100;

  // Export Monthly Data to CSV
  const handleExportCSV = () => {
    if (!monthlyData.length) return;
    const headers = [
      'Month',
      'Maintenance Paid (Rs)',
      'Maintenance Pending (Rs)',
      'Special Charges Paid (Rs)',
      'Special Charges Pending (Rs)',
      'Amenities Paid (Rs)',
      'Amenities Pending (Rs)',
      'Subscription Paid (Rs)',
      'Subscription Pending (Rs)',
      'Total Payment Collected (Rs)',
      'Total Pending Amount (Rs)',
      'Total Billed (Rs)',
      'Recovery Rate (%)',
    ];

    const rows = monthlyData.map((m) => [
      `"${m.monthLabel}"`,
      m.maintenance.paid,
      m.maintenance.pending,
      m.specialCharges.paid,
      m.specialCharges.pending,
      m.amenities.paid,
      m.amenities.pending,
      m.subscription.paid,
      m.subscription.pending,
      m.totalPayment,
      m.totalPending,
      m.totalBilled,
      `${m.recoveryRate}%`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Society_Accounts_Monthly_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Account Overview Financial Report to CSV
  const handleExportOverviewReportCSV = () => {
    if (!overview) return;
    const headers = [
      'Financial Category / Head',
      'Total Amount Billed (Rs)',
      'Total Payment Collected (Rs)',
      'Pending Amount Due (Rs)',
      'Recovery Rate (%)',
      'Total Records',
      'Paid Records',
    ];

    const maintRecovery =
      overview.maintenance.billed > 0
        ? Math.round((overview.maintenance.paid / overview.maintenance.billed) * 100)
        : 100;
    const scRecovery =
      overview.specialCharges.billed > 0
        ? Math.round((overview.specialCharges.paid / overview.specialCharges.billed) * 100)
        : 100;
    const amenityRecovery =
      overview.amenities.billed > 0
        ? Math.round((overview.amenities.paid / overview.amenities.billed) * 100)
        : 100;
    const subRecovery =
      overview.subscription.billed > 0
        ? Math.round((overview.subscription.paid / overview.subscription.billed) * 100)
        : 100;

    const rows = [
      [
        '"Maintenance Billing"',
        overview.maintenance.billed,
        overview.maintenance.paid,
        overview.maintenance.pending,
        `"${maintRecovery}%"`,
        overview.maintenance.count,
        overview.maintenance.paidCount,
      ],
      [
        '"Special Charges"',
        overview.specialCharges.billed,
        overview.specialCharges.paid,
        overview.specialCharges.pending,
        `"${scRecovery}%"`,
        overview.specialCharges.count,
        overview.specialCharges.paidCount,
      ],
      [
        '"Amenities Booking"',
        overview.amenities.billed,
        overview.amenities.paid,
        overview.amenities.pending,
        `"${amenityRecovery}%"`,
        overview.amenities.count,
        overview.amenities.paidCount,
      ],
      [
        '"Society Subscription"',
        overview.subscription.billed,
        overview.subscription.paid,
        overview.subscription.pending,
        `"${subRecovery}%"`,
        overview.subscription.count,
        overview.subscription.paidCount,
      ],
      [
        '"GRAND TOTAL / ALL MODULES"',
        overview.grandTotals.totalBilled,
        overview.grandTotals.totalPaid,
        overview.grandTotals.totalPending,
        `"${overview.grandTotals.recoveryRate}%"`,
        '—',
        '—',
      ],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Society_Financial_Overview_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '24px',
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      {/* =====================================================================
          HEADER SECTION
          ===================================================================== */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(196,154,108,0.2), rgba(196,154,108,0.05))',
                border: '1px solid rgba(196,154,108,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-clay)',
              }}
            >
              <Wallet size={24} />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                }}
              >
                Society Financial Accounts
              </h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Complete accounts ledger: Maintenance, Special Charges, Amenity Bookings & Society Subscriptions
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Year Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Year:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '7px 12px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <option value="">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAccountsData(true)}
            disabled={refreshing}
            title="Refresh financial data"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-main)',
              borderRadius: 'var(--radius-md)',
              padding: '7px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            style={{
              background: 'rgba(196, 154, 108, 0.12)',
              border: '1px solid rgba(196, 154, 108, 0.3)',
              color: 'var(--color-clay)',
              borderRadius: 'var(--radius-md)',
              padding: '7px 14px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          {/* Print Report */}
          <button
            onClick={() => window.print()}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-main)',
              borderRadius: 'var(--radius-md)',
              padding: '7px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          ACCOUNT OVERVIEW: 4 KEY FINANCIAL METRICS & REPORT
          ===================================================================== */}
      {loading && !overview && (
        <div
          style={{
            background: 'rgba(196, 154, 108, 0.08)',
            border: '1px solid rgba(196, 154, 108, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--text-main)',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--color-clay)' }} />
          <span>Loading society financial accounts data...</span>
        </div>
      )}

      {(() => {
        const overview = activeOverview;
        const maintRecovery =
          overview.maintenance.billed > 0
            ? Math.round((overview.maintenance.paid / overview.maintenance.billed) * 100)
            : 100;
        const scRecovery =
          overview.specialCharges.billed > 0
            ? Math.round((overview.specialCharges.paid / overview.specialCharges.billed) * 100)
            : 100;
        const amenityRecovery =
          overview.amenities.billed > 0
            ? Math.round((overview.amenities.paid / overview.amenities.billed) * 100)
            : 100;
        const subRecovery =
          overview.subscription.billed > 0
            ? Math.round((overview.subscription.paid / overview.subscription.billed) * 100)
            : 100;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. TOP 4 EXECUTIVE KPI CARDS */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Card 1: TOTAL AMOUNT */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Total Amount
                    </span>
                    <div
                      style={{
                        fontSize: '1.85rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        marginTop: '4px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      ₹{overview.grandTotals.totalBilled.toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(196, 154, 108, 0.14)',
                      color: 'var(--color-clay)',
                    }}
                  >
                    <Wallet size={20} />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-card)',
                  }}
                >
                  <span style={{ color: '#10b981', fontWeight: 600 }}>
                    ₹{overview.grandTotals.totalPaid.toLocaleString()} Paid ({overview.grandTotals.recoveryRate}%)
                  </span>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      color: 'var(--text-muted)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                    }}
                  >
                    All Modules
                  </span>
                </div>
              </div>

              {/* Card 2: PENDING AMOUNT */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.05)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#ef4444',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Pending Amount
                    </span>
                    <div
                      style={{
                        fontSize: '1.85rem',
                        fontWeight: 800,
                        color: '#ef4444',
                        marginTop: '4px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      ₹{overview.grandTotals.totalPending.toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#ef4444',
                    }}
                  >
                    <Clock size={20} />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-card)',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    Outstanding receivables due
                  </span>
                  <span
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      color: '#ef4444',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    Due Balance
                  </span>
                </div>
              </div>

              {/* Card 3: MAINTENANCE AMOUNT */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#10b981',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Maintenance Amount
                    </span>
                    <div
                      style={{
                        fontSize: '1.85rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        marginTop: '4px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      ₹{overview.maintenance.billed.toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10b981',
                    }}
                  >
                    <Receipt size={20} />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.76rem',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-card)',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <span style={{ color: '#10b981', fontWeight: 600 }}>
                    Paid: ₹{overview.maintenance.paid.toLocaleString()}
                  </span>
                  <span
                    style={{
                      color: overview.maintenance.pending > 0 ? '#ef4444' : 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Pending: ₹{overview.maintenance.pending.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Card 4: SPECIAL CHARGES AMOUNT */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#f59e0b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Special Charges Amount
                    </span>
                    <div
                      style={{
                        fontSize: '1.85rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        marginTop: '4px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      ₹{overview.specialCharges.billed.toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#f59e0b',
                    }}
                  >
                    <Coins size={20} />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.76rem',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-card)',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <span style={{ color: '#10b981', fontWeight: 600 }}>
                    Paid: ₹{overview.specialCharges.paid.toLocaleString()}
                  </span>
                  <span
                    style={{
                      color: overview.specialCharges.pending > 0 ? '#ef4444' : 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Pending: ₹{overview.specialCharges.pending.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          NAVIGATION TABS
          ===================================================================== */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-card)',
          gap: '8px',
          marginTop: '6px',
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2.5px solid var(--color-clay)' : '2.5px solid transparent',
            color: activeTab === 'overview' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: activeTab === 'overview' ? 700 : 500,
            padding: '10px 18px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={16} />
          <span>Account Overview & Financial Report</span>
          <span
            style={{
              background: activeTab === 'overview' ? 'rgba(196,154,108,0.2)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'overview' ? 'var(--color-clay)' : 'var(--text-muted)',
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            Report
          </span>
        </button>

        <button
          onClick={() => setActiveTab('monthly')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'monthly' ? '2.5px solid var(--color-clay)' : '2.5px solid transparent',
            color: activeTab === 'monthly' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: activeTab === 'monthly' ? 700 : 500,
            padding: '10px 18px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={16} />
          <span>Month-Wise Total Payment & Pending</span>
          <span
            style={{
              background: activeTab === 'monthly' ? 'rgba(196,154,108,0.2)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'monthly' ? 'var(--color-clay)' : 'var(--text-muted)',
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            {monthlyData.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'transactions' ? '2.5px solid var(--color-clay)' : '2.5px solid transparent',
            color: activeTab === 'transactions' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: activeTab === 'transactions' ? 700 : 500,
            padding: '10px 18px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers size={16} />
          <span>Transactions & Payment Receipts</span>
          <span
            style={{
              background: activeTab === 'transactions' ? 'rgba(196,154,108,0.2)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'transactions' ? 'var(--color-clay)' : 'var(--text-muted)',
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            {transactions.length}
          </span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: ACCOUNT OVERVIEW & FINANCIAL REPORT
          ===================================================================== */}
      {activeTab === 'overview' && (() => {
        const overview = activeOverview;
        const maintRecovery =
          overview.maintenance.billed > 0
            ? Math.round((overview.maintenance.paid / overview.maintenance.billed) * 100)
            : 100;
        const scRecovery =
          overview.specialCharges.billed > 0
            ? Math.round((overview.specialCharges.paid / overview.specialCharges.billed) * 100)
            : 100;
        const amenityRecovery =
          overview.amenities.billed > 0
            ? Math.round((overview.amenities.paid / overview.amenities.billed) * 100)
            : 100;
        const subRecovery =
          overview.subscription.billed > 0
            ? Math.round((overview.subscription.paid / overview.subscription.billed) * 100)
            : 100;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. SOCIETY FINANCIAL ACCOUNTS OVERVIEW REPORT TABLE */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              }}
            >
              {/* Report Header Bar */}
              <div
                style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                  borderBottom: '1px solid var(--border-card)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      padding: '7px',
                      borderRadius: '8px',
                      background: 'rgba(196, 154, 108, 0.15)',
                      color: 'var(--color-clay)',
                    }}
                  >
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.02rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Society Financial Accounts Overview Report
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Audited statement of Total Amount, Collections, and Pending Receivables by Account Category
                    </p>
                  </div>
                </div>

                {/* Report Quick Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleExportOverviewReportCSV}
                    style={{
                      background: 'rgba(196, 154, 108, 0.1)',
                      border: '1px solid rgba(196, 154, 108, 0.25)',
                      color: 'var(--color-clay)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Export Account Overview Report as CSV"
                  >
                    <Download size={14} />
                    <span>Export Report CSV</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-main)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                    title="Print Report"
                  >
                    <Printer size={14} />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Report Statement Table */}
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderBottom: '1px solid var(--border-card)',
                      }}
                    >
                      <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Account Category / Head
                      </th>
                      <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Total Amount
                      </th>
                      <th style={{ padding: '12px 18px', color: '#10b981', fontWeight: 700 }}>
                        Paid / Collected
                      </th>
                      <th style={{ padding: '12px 18px', color: '#ef4444', fontWeight: 700 }}>
                        Pending Amount
                      </th>
                      <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Recovery %
                      </th>
                      <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Invoices / Units
                      </th>
                      <th style={{ padding: '12px 18px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1: Maintenance Amount */}
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-card)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '5px',
                              borderRadius: '6px',
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10b981',
                              display: 'inline-flex',
                            }}
                          >
                            <Receipt size={15} />
                          </span>
                          <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                              Maintenance Amount
                            </strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Regular society flat maintenance bills
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{overview.maintenance.billed.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#10b981' }}>
                        ₹{overview.maintenance.paid.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#ef4444' }}>
                        ₹{overview.maintenance.pending.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: maintRecovery >= 75 ? '#10b981' : '#f59e0b', fontSize: '0.8rem' }}>
                            {maintRecovery}%
                          </span>
                          <div
                            style={{
                              width: '60px',
                              height: '5px',
                              background: 'rgba(255,255,255,0.06)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, maintRecovery)}%`,
                                height: '100%',
                                background: '#10b981',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {overview.maintenance.count} Invoices ({overview.maintenance.paidCount} Paid)
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <Link
                          to="/dashboard/maintenance"
                          style={{
                            color: 'var(--color-clay)',
                            textDecoration: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Manage</span>
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>

                    {/* Row 2: Special Charges Amount */}
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-card)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '5px',
                              borderRadius: '6px',
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: '#f59e0b',
                              display: 'inline-flex',
                            }}
                          >
                            <Coins size={15} />
                          </span>
                          <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                              Special Charges Amount
                            </strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Festival, sinking fund, renovation, and one-off levies
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{overview.specialCharges.billed.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#10b981' }}>
                        ₹{overview.specialCharges.paid.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#ef4444' }}>
                        ₹{overview.specialCharges.pending.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: scRecovery >= 75 ? '#10b981' : '#f59e0b', fontSize: '0.8rem' }}>
                            {scRecovery}%
                          </span>
                          <div
                            style={{
                              width: '60px',
                              height: '5px',
                              background: 'rgba(255,255,255,0.06)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, scRecovery)}%`,
                                height: '100%',
                                background: '#f59e0b',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {overview.specialCharges.count} Assignments ({overview.specialCharges.paidCount} Paid)
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <Link
                          to="/dashboard/special-charges"
                          style={{
                            color: 'var(--color-clay)',
                            textDecoration: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Manage</span>
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>

                    {/* Row 3: Amenities Booking */}
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-card)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '5px',
                              borderRadius: '6px',
                              background: 'rgba(59, 130, 246, 0.12)',
                              color: '#3b82f6',
                              display: 'inline-flex',
                            }}
                          >
                            <Sparkles size={15} />
                          </span>
                          <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                              Amenities Booking
                            </strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Clubhouse, hall, gym & sports facility bookings
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{overview.amenities.billed.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#10b981' }}>
                        ₹{overview.amenities.paid.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: overview.amenities.pending > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        ₹{overview.amenities.pending.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: amenityRecovery >= 75 ? '#10b981' : '#f59e0b', fontSize: '0.8rem' }}>
                            {amenityRecovery}%
                          </span>
                          <div
                            style={{
                              width: '60px',
                              height: '5px',
                              background: 'rgba(255,255,255,0.06)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, amenityRecovery)}%`,
                                height: '100%',
                                background: '#3b82f6',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {overview.amenities.count} Bookings Processed
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <Link
                          to="/dashboard/amenities/bookings"
                          style={{
                            color: 'var(--color-clay)',
                            textDecoration: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Manage</span>
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>

                    {/* Row 4: Society Subscription */}
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-card)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '5px',
                              borderRadius: '6px',
                              background: 'rgba(168, 85, 247, 0.12)',
                              color: '#a855f7',
                              display: 'inline-flex',
                            }}
                          >
                            <CreditCard size={15} />
                          </span>
                          <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                              Society Subscription
                            </strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Platform plan fee & billing licenses
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{overview.subscription.billed.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#10b981' }}>
                        ₹{overview.subscription.paid.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: overview.subscription.pending > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        ₹{overview.subscription.pending.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, color: subRecovery >= 75 ? '#10b981' : '#f59e0b', fontSize: '0.8rem' }}>
                            {subRecovery}%
                          </span>
                          <div
                            style={{
                              width: '60px',
                              height: '5px',
                              background: 'rgba(255,255,255,0.06)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, subRecovery)}%`,
                                height: '100%',
                                background: '#a855f7',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {overview.subscription.count} Invoices ({overview.subscription.paidCount} Paid)
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <Link
                          to="/dashboard/subscription-billing"
                          style={{
                            color: 'var(--color-clay)',
                            textDecoration: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Manage</span>
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  </tbody>

                  {/* Summary / Grand Total Row */}
                  <tfoot>
                    <tr
                      style={{
                        background: 'rgba(196, 154, 108, 0.08)',
                        borderTop: '2px solid var(--border-card)',
                      }}
                    >
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '5px',
                              borderRadius: '6px',
                              background: 'var(--color-clay)',
                              color: '#fff',
                              display: 'inline-flex',
                            }}
                          >
                            <Wallet size={15} />
                          </span>
                          <div>
                            <strong
                              style={{
                                color: 'var(--text-main)',
                                fontSize: '0.92rem',
                                letterSpacing: '-0.01em',
                              }}
                            >
                              GRAND TOTAL (OVERALL REPORT)
                            </strong>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Consolidated balance across all financial heads
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        ₹{overview.grandTotals.totalBilled.toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>
                        ₹{overview.grandTotals.totalPaid.toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>
                        ₹{overview.grandTotals.totalPending.toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, color: 'var(--color-clay)', fontSize: '0.9rem' }}>
                            {overview.grandTotals.recoveryRate}%
                          </span>
                          <div
                            style={{
                              width: '60px',
                              height: '6px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, overview.grandTotals.recoveryRate)}%`,
                                height: '100%',
                                background: 'var(--color-clay)',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 18px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        Overall Recovery
                      </td>
                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <button
                          onClick={handleExportOverviewReportCSV}
                          style={{
                            background: 'var(--color-clay)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Export
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 2. THE 4 FINANCIAL CATEGORIES CARDS */}
            <div
              style={{
                display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {/* 1. Maintenance */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'transform 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                  }}
                >
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    Maintenance Billing
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {overview.maintenance.count} Invoices ({overview.maintenance.paidCount} Paid)
                  </span>
                </div>
              </div>
              <Link
                to="/dashboard/maintenance"
                title="Open Maintenance & Billing"
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                <ExternalLink size={16} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>PAID / COLLECTED</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  ₹{overview.maintenance.paid.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>PENDING DUE</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                  ₹{overview.maintenance.pending.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
              <span>Total Billed:</span>
              <strong style={{ color: 'var(--text-main)' }}>₹{overview.maintenance.billed.toLocaleString()}</strong>
            </div>
          </div>

          {/* 2. Special Charges */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'transform 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#f59e0b',
                  }}
                >
                  <Coins size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    Special Charges
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {overview.specialCharges.count} Unit Assignments
                  </span>
                </div>
              </div>
              <Link
                to="/dashboard/special-charges"
                title="Open Special Charges"
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                <ExternalLink size={16} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>PAID / COLLECTED</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  ₹{overview.specialCharges.paid.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>PENDING DUE</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                  ₹{overview.specialCharges.pending.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
              <span>Total Billed:</span>
              <strong style={{ color: 'var(--text-main)' }}>₹{overview.specialCharges.billed.toLocaleString()}</strong>
            </div>
          </div>

          {/* 3. Amenities Booking */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'transform 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#3b82f6',
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    Amenities Booking
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {overview.amenities.count} Bookings Processed
                  </span>
                </div>
              </div>
              <Link
                to="/dashboard/amenities/bookings"
                title="Open Amenity Bookings"
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                <ExternalLink size={16} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>PAID / COLLECTED</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  ₹{overview.amenities.paid.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>PENDING DUE</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                  ₹{overview.amenities.pending.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
              <span>Total Billed:</span>
              <strong style={{ color: 'var(--text-main)' }}>₹{overview.amenities.billed.toLocaleString()}</strong>
            </div>
          </div>

          {/* 4. Subscription Billing */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'transform 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(168, 85, 247, 0.12)',
                    color: '#a855f7',
                  }}
                >
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-main)', fontWeight: 700 }}>
                    Subscription Billing
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {overview.subscription.currentPlan?.plan_name || 'Society Subscription'}
                  </span>
                </div>
              </div>
              <Link
                to="/dashboard/subscription-billing"
                title="Open Subscription & Billing"
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                <ExternalLink size={16} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>PAID TO PLATFORM</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  ₹{overview.subscription.paid.toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>DUE BALANCE</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                  ₹{overview.subscription.pending.toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)', paddingTop: '10px' }}>
              <span>Total Invoiced:</span>
              <strong style={{ color: 'var(--text-main)' }}>₹{overview.subscription.billed.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  })()}

  {/* =====================================================================
      TAB 2: MONTH-WISE BREAKDOWN TABLE & VISUALIZER
      ===================================================================== */}
  {activeTab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Loading month-wise financial data...</div>
            </div>
          ) : monthlyData.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '40px 20px',
                textAlign: 'center',
              }}
            >
              <Calendar size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>No Financial Records For This Period</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                When bills and payments are recorded across Maintenance, Special Charges, Amenities, or Subscriptions,
                monthly aggregated statistics will appear here.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-card)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Month / Period</th>
                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Maintenance</th>
                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Special Charges</th>
                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Amenities</th>
                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Subscription</th>
                    <th style={{ padding: '14px 16px', color: '#10b981', fontWeight: 700 }}>Total Payment (Paid)</th>
                    <th style={{ padding: '14px 16px', color: '#ef4444', fontWeight: 700 }}>Total Pending (Due)</th>
                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Recovery</th>
                    <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m) => {
                    const isExpanded = expandedMonth === m.monthKey;
                    return (
                      <React.Fragment key={m.monthKey}>
                        <tr
                          style={{
                            borderBottom: '1px solid var(--border-card)',
                            background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          {/* Month Label */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {m.monthLabel}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Billed: ₹{m.totalBilled.toLocaleString()}
                            </div>
                          </td>

                          {/* Maintenance */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ color: '#10b981', fontWeight: 600 }}>
                              ₹{m.maintenance.paid.toLocaleString()}
                            </div>
                            {m.maintenance.pending > 0 && (
                              <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>
                                Due: ₹{m.maintenance.pending.toLocaleString()}
                              </div>
                            )}
                          </td>

                          {/* Special Charges */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ color: '#10b981', fontWeight: 600 }}>
                              ₹{m.specialCharges.paid.toLocaleString()}
                            </div>
                            {m.specialCharges.pending > 0 && (
                              <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>
                                Due: ₹{m.specialCharges.pending.toLocaleString()}
                              </div>
                            )}
                          </td>

                          {/* Amenities */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ color: '#10b981', fontWeight: 600 }}>
                              ₹{m.amenities.paid.toLocaleString()}
                            </div>
                            {m.amenities.pending > 0 && (
                              <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>
                                Due: ₹{m.amenities.pending.toLocaleString()}
                              </div>
                            )}
                          </td>

                          {/* Subscription */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ color: '#10b981', fontWeight: 600 }}>
                              ₹{m.subscription.paid.toLocaleString()}
                            </div>
                            {m.subscription.pending > 0 && (
                              <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>
                                Due: ₹{m.subscription.pending.toLocaleString()}
                              </div>
                            )}
                          </td>

                          {/* Total Payment Collected */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                display: 'inline-block',
                              }}
                            >
                              ₹{m.totalPayment.toLocaleString()}
                            </span>
                          </td>

                          {/* Total Pending Amount */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                background:
                                  m.totalPending > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.04)',
                                color: m.totalPending > 0 ? '#ef4444' : 'var(--text-muted)',
                                border: m.totalPending > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-card)',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                display: 'inline-block',
                              }}
                            >
                              ₹{m.totalPending.toLocaleString()}
                            </span>
                          </td>

                          {/* Recovery Rate */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  color:
                                    m.recoveryRate >= 80
                                      ? '#10b981'
                                      : m.recoveryRate >= 50
                                      ? '#f59e0b'
                                      : '#ef4444',
                                }}
                              >
                                {m.recoveryRate}%
                              </span>
                            </div>
                          </td>

                          {/* Toggle Expand Details */}
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => setExpandedMonth(isExpanded ? null : m.monthKey)}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--border-card)',
                                color: 'var(--text-muted)',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>{isExpanded ? 'Hide' : 'Breakdown'}</span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Breakdown Drawer */}
                        {isExpanded && (
                          <tr style={{ background: 'rgba(255,255,255,0.015)' }}>
                            <td colSpan={9} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-card)' }}>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                  gap: '12px',
                                  fontSize: '0.82rem',
                                }}
                              >
                                {/* Maint */}
                                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                                    🏢 Maintenance
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                    <span>Billed:</span>
                                    <span>₹{m.maintenance.billed.toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                                    <span>Collected:</span>
                                    <span>₹{m.maintenance.paid.toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', fontWeight: 600 }}>
                                    <span>Pending:</span>
                                    <span>₹{m.maintenance.pending.toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Special Charges */}
                                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                                    ⚡ Special Charges
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                    <span>Billed:</span>
                                    <span>₹{m.specialCharges.billed.toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                                    <span>Collected:</span>
                                    <span>₹{m.specialCharges.paid.toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', fontWeight: 600 }}>
                                    <span>Pending:</span>
                                    <span>₹{m.specialCharges.pending.toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Amenities */}
                                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                                    🏊 Amenities Bookings
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                    <span>Billed:</span>
                                    <span>₹{m.amenities.billed.toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                                    <span>Collected:</span>
                                    <span>₹{m.amenities.paid.toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', fontWeight: 600 }}>
                                    <span>Pending:</span>
                                    <span>₹{m.amenities.pending.toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Subscription */}
                                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                                    💳 Subscription Billing
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                    <span>Invoiced:</span>
                                    <span>₹{m.subscription.billed.toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 600 }}>
                                    <span>Paid:</span>
                                    <span>₹{m.subscription.paid.toLocaleString()}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', fontWeight: 600 }}>
                                    <span>Due:</span>
                                    <span>₹{m.subscription.pending.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot style={{ background: 'rgba(255, 255, 255, 0.03)', borderTop: '2px solid var(--border-card)' }}>
                  <tr style={{ fontWeight: 700 }}>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 800 }}>
                        TOTAL (ALL MONTHS)
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Billed: ₹{monthlyTotals.totalBilled.toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ color: '#10b981', fontWeight: 800 }}>
                        ₹{monthlyTotals.maintPaid.toLocaleString()}
                      </div>
                      {monthlyTotals.maintPending > 0 && (
                        <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>
                          Due: ₹{monthlyTotals.maintPending.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ color: '#10b981', fontWeight: 800 }}>
                        ₹{monthlyTotals.scPaid.toLocaleString()}
                      </div>
                      {monthlyTotals.scPending > 0 && (
                        <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>
                          Due: ₹{monthlyTotals.scPending.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ color: '#10b981', fontWeight: 800 }}>
                        ₹{monthlyTotals.amenitiesPaid.toLocaleString()}
                      </div>
                      {monthlyTotals.amenitiesPending > 0 && (
                        <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>
                          Due: ₹{monthlyTotals.amenitiesPending.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ color: '#10b981', fontWeight: 800 }}>
                        ₹{monthlyTotals.subPaid.toLocaleString()}
                      </div>
                      {monthlyTotals.subPending > 0 && (
                        <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>
                          Due: ₹{monthlyTotals.subPending.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          display: 'inline-block',
                        }}
                      >
                        ₹{monthlyTotals.totalPayment.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span
                        style={{
                          background:
                            monthlyTotals.totalPending > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.04)',
                          color: monthlyTotals.totalPending > 0 ? '#ef4444' : 'var(--text-muted)',
                          border:
                            monthlyTotals.totalPending > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-card)',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          display: 'inline-block',
                        }}
                      >
                        ₹{monthlyTotals.totalPending.toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          color:
                            monthlyTotalRecovery >= 80
                              ? '#10b981'
                              : monthlyTotalRecovery >= 50
                              ? '#f59e0b'
                              : '#ef4444',
                        }}
                      >
                        {monthlyTotalRecovery}%
                      </span>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      —
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: TRANSACTIONS & PAYMENT RECEIPTS LEDGER
          ===================================================================== */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                flex: '1 1 280px',
                maxWidth: '420px',
              }}
            >
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by receipt #, invoice, unit, resident name..."
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.85rem',
                  width: '100%',
                }}
              />
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category:</span>
              <select
                value={txnCategoryFilter}
                onChange={(e) => setTxnCategoryFilter(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 12px',
                  fontSize: '0.85rem',
                }}
              >
                <option value="ALL">All Financial Categories</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="SPECIAL_CHARGES">Special Charges</option>
                <option value="AMENITIES">Amenities Booking</option>
                <option value="SUBSCRIPTION">Subscription Billing</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          {filteredTransactions.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '40px 20px',
                textAlign: 'center',
              }}
            >
              <Receipt size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>No Transactions Found</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No payment transactions matched your search or category filter.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-card)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Receipt #</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Invoice / Ref</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Unit / Resident</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Amount</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Mode</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t, idx) => (
                    <tr key={t.id ? `${t.category}-${t.id}` : idx} style={{ borderBottom: '1px solid var(--border-card)' }}>
                      {/* Category Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            background:
                              t.category === 'MAINTENANCE'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : t.category === 'SPECIAL_CHARGES'
                                ? 'rgba(245, 158, 11, 0.12)'
                                : t.category === 'AMENITIES'
                                ? 'rgba(59, 130, 246, 0.12)'
                                : 'rgba(168, 85, 247, 0.12)',
                            color:
                              t.category === 'MAINTENANCE'
                                ? '#10b981'
                                : t.category === 'SPECIAL_CHARGES'
                                ? '#f59e0b'
                                : t.category === 'AMENITIES'
                                ? '#3b82f6'
                                : '#a855f7',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}
                        >
                          {t.category.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Receipt # */}
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-clay)' }}>
                        {t.reference_number || 'N/A'}
                      </td>

                      {/* Invoice # */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontWeight: 600 }}>
                        {t.invoice_number || '—'}
                      </td>

                      {/* Unit / Resident */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {t.home_number} {t.resident_name ? `• ${t.resident_name}` : ''}
                        </div>
                        {t.resident_phone && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.resident_phone}</div>
                        )}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#10b981', fontSize: '0.92rem' }}>
                        ₹{Number(t.amount).toLocaleString()}
                      </td>

                      {/* Payment Mode */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.75rem',
                          }}
                        >
                          {t.payment_method || 'ONLINE'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            background:
                              t.status === 'APPROVED' || t.status === 'PAID' || t.status === 'SUCCESS'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : 'rgba(245, 158, 11, 0.12)',
                            color:
                              t.status === 'APPROVED' || t.status === 'PAID' || t.status === 'SUCCESS'
                                ? '#10b981'
                                : '#f59e0b',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          {t.status === 'APPROVED' || t.status === 'PAID' || t.status === 'SUCCESS'
                            ? 'Approved / Done'
                            : t.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(t.transaction_date).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
