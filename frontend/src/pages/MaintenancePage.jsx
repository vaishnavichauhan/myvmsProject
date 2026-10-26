import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  Home,
  Coins,
  Landmark,
} from 'lucide-react';
import { maintenanceApi } from '../api/maintenanceApi';
import { societyApi } from '../api/societyApi';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';

export default function MaintenancePage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;

  // Active Society State
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(user?.societyId ? String(user.societyId) : '');
  const myHomeNumber = user?.flatNumber || user?.unitNumber || '';

  // Tab State: 'bills' | 'plans' | 'payments'
  const [activeTab, setActiveTab] = useState('bills');

  // Scope Filter: 'ALL' (All homes in society) | 'MY_HOME' (Only resident's home)
  const [scopeFilter, setScopeFilter] = useState(isAdmin ? 'ALL' : 'MY_HOME');

  // Data States
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cycleFilter, setCycleFilter] = useState('ALL');

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planFormData, setPlanFormData] = useState({
    name: '',
    applicable_type: 'ALL',
    resident_type: 'BOTH',
    amount: '',
    billing_cycle: 'MONTHLY',
    due_day: 5,
    grace_period_days: 5,
    penalty_type: 'FIXED',
    penalty_rate: 100,
    description: '',
  });

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateFormData, setGenerateFormData] = useState({
    billing_period: getCurrentPeriod('MONTHLY'),
    billing_cycle: 'MONTHLY',
    due_date: '',
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_method: 'UPI',
    transaction_reference: '',
    remarks: '',
  });

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState(null);

  function getCurrentPeriod(cycle = 'MONTHLY') {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    if (cycle === 'QUARTERLY') {
      const q = Math.ceil((today.getMonth() + 1) / 3);
      return `Q${q}-${yyyy}`;
    }
    return `${yyyy}-${mm}`;
  }

  function getCoveredMonthsDescription(billing_period, billing_cycle) {
    if (!billing_period) return 'Current Period';

    // Quarterly format: Q1-YYYY, Q2-YYYY, Q3-YYYY, Q4-YYYY
    const qMatch = String(billing_period).match(/Q([1-4])[-_\s]*(\d{4})/i);
    if (qMatch || billing_cycle === 'QUARTERLY') {
      const quarter = qMatch ? parseInt(qMatch[1], 10) : Math.ceil((new Date().getMonth() + 1) / 3);
      const year = qMatch ? qMatch[2] : new Date().getFullYear();
      const quarterMap = {
        1: 'January, February, March',
        2: 'April, May, June',
        3: 'July, August, September',
        4: 'October, November, December',
      };
      return `${quarterMap[quarter] || '3 Months'} ${year}`;
    }

    // Monthly format: YYYY-MM
    const mMatch = String(billing_period).match(/(\d{4})[-_](\d{1,2})/);
    if (mMatch) {
      const year = mMatch[1];
      const monthIndex = parseInt(mMatch[2], 10) - 1;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${monthNames[monthIndex] || 'Month ' + mMatch[2]} ${year}`;
    }

    // Half-Yearly: H1-YYYY or H2-YYYY
    const hMatch = String(billing_period).match(/H([1-2])[-_\s]*(\d{4})/i);
    if (hMatch || billing_cycle === 'HALF_YEARLY') {
      const half = hMatch ? hMatch[1] : ((new Date().getMonth() + 1) <= 6 ? '1' : '2');
      const year = hMatch ? hMatch[2] : new Date().getFullYear();
      return half === '1' ? `January - June ${year}` : `July - December ${year}`;
    }

    if (billing_cycle === 'YEARLY') {
      const year = String(billing_period).replace(/\D/g, '') || new Date().getFullYear();
      return `Full Year ${year} (January to December)`;
    }

    return String(billing_period);
  }

  function getCoveredMonthsForPeriod(period, cycle) {
    if (!period) return [];
    const qMatch = String(period).match(/Q([1-4])[-_\s]*(\d{4})/i);
    if (qMatch) {
      const q = parseInt(qMatch[1], 10);
      const y = qMatch[2];
      const map = {
        1: [`${y}-01`, `${y}-02`, `${y}-03`],
        2: [`${y}-04`, `${y}-05`, `${y}-06`],
        3: [`${y}-07`, `${y}-08`, `${y}-09`],
        4: [`${y}-10`, `${y}-11`, `${y}-12`],
      };
      return map[q] || [];
    }
    const hMatch = String(period).match(/H([1-2])[-_\s]*(\d{4})/i);
    if (hMatch) {
      const h = parseInt(hMatch[1], 10);
      const y = hMatch[2];
      if (h === 1) return [`${y}-01`, `${y}-02`, `${y}-03`, `${y}-04`, `${y}-05`, `${y}-06`];
      return [`${y}-07`, `${y}-08`, `${y}-09`, `${y}-10`, `${y}-11`, `${y}-12`];
    }
    if (cycle === 'YEARLY' || String(period).startsWith('FY-')) {
      const y = String(period).replace(/\D/g, '') || new Date().getFullYear();
      const months = [];
      for (let i = 1; i <= 12; i++) {
        months.push(`${y}-${String(i).padStart(2, '0')}`);
      }
      return months;
    }
    const mMatch = String(period).match(/(\d{4})[-_](\d{1,2})/);
    if (mMatch) {
      const y = mMatch[1];
      const m = String(parseInt(mMatch[2], 10)).padStart(2, '0');
      return [`${y}-${m}`];
    }
    return [];
  }

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4500);
  };

  // 1. Initial Load: Societies
  useEffect(() => {
    const fetchSocieties = async () => {
      try {
        const res = await societyApi.getSocieties();
        const raw = res?.data?.societies || res?.societies || res?.data || res || [];
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.societies) ? raw.societies : []);
        setSocieties(list);
        if (list.length > 0) {
          const userMatch = user?.societyId && list.find((s) => String(s.id) === String(user.societyId));
          const currentMatch = selectedSocietyId && list.find((s) => String(s.id) === String(selectedSocietyId));
          const validId = currentMatch ? currentMatch.id : (userMatch ? userMatch.id : list[0].id);
          setSelectedSocietyId(String(validId));
        } else if (user?.societyId) {
          setSelectedSocietyId(String(user.societyId));
        }
      } catch (err) {
        console.error('Error fetching societies:', err);
        if (user?.societyId) {
          setSelectedSocietyId(String(user.societyId));
        }
      }
    };
    fetchSocieties();
  }, [user]);

  // 2. Fetch Data whenever selectedSocietyId changes
  const fetchData = async () => {
    if (!selectedSocietyId) return;
    setLoading(true);
    try {
      const [statsRes, plansRes, billsRes, paymentsRes] = await Promise.all([
        maintenanceApi.getStats({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getPlans({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getBills({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getPayments({ society_id: selectedSocietyId }).catch(() => ({})),
      ]);

      setStats(statsRes.data?.stats || null);
      setPlans(plansRes.data?.plans || []);
      setBills(billsRes.data?.bills || []);
      setPayments(paymentsRes.data?.payments || []);
    } catch (err) {
      console.error('Error fetching maintenance records:', err);
      showError(err.message || 'Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSocietyId]);

  // Filtered Bills: Only show own maintenance for non-admins, or toggle for admins
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // Non-admins (Owners, Tenants, Family members) ONLY see their own maintenance bills
      if (!isAdmin || scopeFilter === 'MY_HOME') {
        const isMyHome =
          (myHomeNumber && String(b.home_number).trim().toLowerCase() === String(myHomeNumber).trim().toLowerCase()) ||
          (user?.id && Number(b.resident_id) === Number(user.id)) ||
          (user?.phone && b.resident_phone && String(b.resident_phone).trim() === String(user.phone).trim());
        if (!isMyHome) return false;
      }

      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (cycleFilter !== 'ALL' && b.billing_cycle !== cycleFilter) return false;

      // Redundant bill prevention:
      // If this is an unpaid monthly bill, and there is an active/paid quarterly or annual bill for the same home covering this month, exclude it!
      if (b.billing_cycle === 'MONTHLY' && (b.status === 'PENDING' || Number(b.paid_amount || 0) === 0)) {
        const hasCoveringPaid = bills.some(
          (qb) =>
            qb.id !== b.id &&
            String(qb.home_id) === String(b.home_id) &&
            qb.status === 'PAID' &&
            ['QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(qb.billing_cycle) &&
            getCoveredMonthsForPeriod(qb.billing_period, qb.billing_cycle).includes(b.billing_period)
        );
        if (hasCoveringPaid) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const homeNum = (b.home_number || '').toLowerCase();
        const billNum = (b.bill_number || '').toLowerCase();
        const resident = (b.resident_name || '').toLowerCase();
        const phone = (b.resident_phone || '').toLowerCase();
        return homeNum.includes(q) || billNum.includes(q) || resident.includes(q) || phone.includes(q);
      }
      return true;
    });
  }, [bills, isAdmin, scopeFilter, statusFilter, cycleFilter, searchQuery, myHomeNumber, user]);

  // Filtered Payments: Only show resident's own payments for non-admins
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!isAdmin || scopeFilter === 'MY_HOME') {
        const isMyPayment =
          (myHomeNumber && String(p.home_number).trim().toLowerCase() === String(myHomeNumber).trim().toLowerCase()) ||
          (user?.id && Number(p.paid_by_user_id || p.resident_id) === Number(user.id)) ||
          (user?.phone && p.resident_phone && String(p.resident_phone).trim() === String(user.phone).trim());
        if (!isMyPayment) return false;
      }
      return true;
    });
  }, [payments, isAdmin, scopeFilter, myHomeNumber, user]);

  // Effective KPI Stats: Non-admins see their own maintenance totals
  const effectiveStats = useMemo(() => {
    if (isAdmin && scopeFilter === 'ALL' && stats) {
      return stats;
    }
    const myBills = filteredBills;
    const billed = myBills.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0);
    const collected = myBills.reduce((acc, b) => acc + (Number(b.paid_amount) || 0), 0);
    const pending = myBills.reduce((acc, b) => acc + (Number(b.balance_amount) || 0), 0);
    const penalties = myBills.reduce((acc, b) => acc + (Number(b.penalty_amount) || 0), 0);
    const countPaid = myBills.filter((b) => b.status === 'PAID').length;
    const countPending = myBills.filter((b) => b.status === 'PENDING').length;
    const countOverdue = myBills.filter((b) => b.status === 'OVERDUE').length;

    return {
      total_bills: myBills.length,
      total_billed: billed,
      total_collected: collected,
      total_pending: pending,
      total_penalties: penalties,
      count_paid: countPaid,
      count_pending: countPending,
      count_overdue: countOverdue,
    };
  }, [isAdmin, scopeFilter, stats, filteredBills]);

  // Active Society & Property Configurations
  const activeSociety = useMemo(() => {
    if (!Array.isArray(societies) || societies.length === 0) return null;
    return societies.find((s) => String(s.id) === String(selectedSocietyId)) || societies[0] || null;
  }, [societies, selectedSocietyId]);
  const selectedSociety = activeSociety;

  const activeSocietyConfigs = useMemo(() => {
    if (!activeSociety?.property_configuration) return ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE'];
    const parts = String(activeSociety.property_configuration)
      .split(/[,/]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    return parts.length > 0 ? parts : ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE'];
  }, [activeSociety]);

  // Available Plans for the logged-in resident (e.g. Owner sees Monthly & Quarterly, Tenant sees Monthly)
  const residentAvailablePlans = useMemo(() => {
    if (isAdmin) return [];
    const roleNormalized = (user?.role || '').toUpperCase() === 'OWNER' ? 'OWNER' : ((user?.role || '').toUpperCase() === 'TENANT' ? 'TENANT' : 'BOTH');
    return plans.filter((p) => {
      const matchRole = p.resident_type === 'BOTH' || p.resident_type === roleNormalized;
      return matchRole && p.status === 'ACTIVE';
    });
  }, [isAdmin, user, plans]);

  const handleSelectPlan = async (plan) => {
    setActionLoading(true);
    try {
      const res = await maintenanceApi.selectResidentPlan({ plan_id: plan.id });
      const bill = res.data?.bill;
      await fetchData();
      if (bill) {
        handleOpenPaymentModal(bill);
      }
    } catch (err) {
      showError(err.message || 'Failed to select maintenance plan');
    } finally {
      setActionLoading(false);
    }
  };

  // Plan Handlers
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanFormData({
      name: '',
      applicable_type: 'ALL',
      resident_type: 'BOTH',
      amount: '',
      billing_cycle: 'MONTHLY',
      due_day: 5,
      grace_period_days: 5,
      penalty_type: 'FIXED',
      penalty_rate: 100,
      description: '',
    });
    setShowPlanModal(true);
  };

  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanFormData({
      name: plan.name,
      applicable_type: plan.applicable_type,
      resident_type: plan.resident_type || 'BOTH',
      amount: plan.amount,
      billing_cycle: plan.billing_cycle,
      due_day: plan.due_day,
      grace_period_days: plan.grace_period_days,
      penalty_type: plan.penalty_type,
      penalty_rate: plan.penalty_rate,
      description: plan.description || '',
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planFormData.name || !planFormData.amount) {
      showError('Please provide a Plan Name and Amount');
      return;
    }

    setActionLoading(true);
    try {
      const effId = selectedSociety?.id || selectedSocietyId;
      if (editingPlan) {
        await maintenanceApi.updatePlan(editingPlan.id, planFormData);
        showToast('Maintenance plan updated successfully');
      } else {
        await maintenanceApi.createPlan({
          ...planFormData,
          society_id: effId,
        });
        showToast('Maintenance plan created successfully');
      }
      setShowPlanModal(false);
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to save maintenance plan');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to deactivate this maintenance plan?')) return;
    setActionLoading(true);
    try {
      await maintenanceApi.deletePlan(planId);
      showToast('Plan deactivated successfully');
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to delete plan');
    } finally {
      setActionLoading(false);
    }
  };

  // Generate Invoices Handlers
  const handleOpenGenerateModal = () => {
    setGenerateFormData({
      billing_period: getCurrentPeriod('MONTHLY'),
      billing_cycle: 'MONTHLY',
      due_date: '',
    });
    setShowGenerateModal(true);
  };

  const handleGenerateInvoices = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const effId = selectedSociety?.id || selectedSocietyId;
      const res = await maintenanceApi.generateBatchBills({
        society_id: effId,
        ...generateFormData,
      });
      const data = res.data || {};
      const periodLabel = data.billing_period || generateFormData.billing_period || 'current period';
      const genCount = Number(data.generated) || 0;
      const skipCount = Number(data.skipped) || 0;

      if (genCount === 0 && skipCount === 0) {
        showError(data.message || 'No invoices were generated. Please check your society homes and plans.');
        return;
      }

      showToast(
        `Generated ${genCount} invoices successfully (${skipCount} already existed for ${periodLabel}).`
      );
      setShowGenerateModal(false);
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to generate invoices');
    } finally {
      setActionLoading(false);
    }
  };

  // Payment Handlers
  const handleOpenPaymentModal = (bill) => {
    setSelectedBillForPayment(bill);
    setPaymentFormData({
      amount: bill.balance_amount || bill.total_amount,
      payment_method: 'UPI',
      transaction_reference: '',
      remarks: '',
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentFormData.amount || Number(paymentFormData.amount) <= 0) {
      showError('Please enter a valid payment amount');
      return;
    }

    setActionLoading(true);
    try {
      await maintenanceApi.recordPayment({
        bill_id: selectedBillForPayment.id,
        amount: Number(paymentFormData.amount),
        payment_method: paymentFormData.payment_method,
        transaction_reference: paymentFormData.transaction_reference,
        remarks: paymentFormData.remarks,
      });
      const coveredDesc = getCoveredMonthsDescription(
        selectedBillForPayment.billing_period,
        selectedBillForPayment.billing_cycle
      );
      showToast(`Payment of ₹${paymentFormData.amount} recorded successfully for ${coveredDesc}!`);
      setShowPaymentModal(false);
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Receipt Modal
  const handleOpenReceiptModal = async (bill) => {
    try {
      const res = await maintenanceApi.getBillById(bill.id);
      setSelectedBillForReceipt(res.data?.bill || bill);
      setShowReceiptModal(true);
    } catch {
      setSelectedBillForReceipt(bill);
      setShowReceiptModal(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            background: '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            background: '#ef4444',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Society Finance Hub - Row UI Switcher */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-card)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(196, 154, 108, 0.16)',
              color: 'var(--color-clay)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '0.82rem',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            <Landmark size={15} />
            <span>Society Finance</span>
          </div>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem', fontWeight: 500 }}>
            Financial Hub • Select Module:
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Active Maintenance Row Button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-clay)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.84rem',
              boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
            }}
          >
            <Receipt size={16} />
            <span>Maintenance</span>
            <span
              style={{
                fontSize: '0.62rem',
                padding: '2px 6px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              Recurring
            </span>
          </div>

          {/* Special Charges Row Link */}
          <Link
            to="/dashboard/special-charges"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)',
              fontWeight: 600,
              fontSize: '0.84rem',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-clay)';
              e.currentTarget.style.color = 'var(--color-clay)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--text-main)';
            }}
          >
            <Coins size={16} color="var(--color-clay)" />
            <span>Special Charges</span>
            <span
              style={{
                fontSize: '0.62rem',
                padding: '2px 6px',
                borderRadius: '10px',
                background: 'rgba(196, 154, 108, 0.15)',
                color: 'var(--color-clay)',
                fontWeight: 700,
              }}
            >
              One-Time Levies
            </span>
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(196, 154, 108, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-clay)',
              }}
            >
              <Receipt size={20} />
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Maintenance & Billing
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Configure differential BHK maintenance charges, billing cycles (Monthly/Quarterly), late penalties, and collect dues.
          </p>
        </div>

        {/* Top Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {societies.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="var(--color-clay)" />
              <select
                value={selectedSocietyId}
                onChange={(e) => setSelectedSocietyId(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isAdmin && (
            <>
              <button
                onClick={handleOpenCreatePlan}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Plus size={16} color="var(--color-clay)" />
                <span>New Plan</span>
              </button>

              <button
                onClick={handleOpenGenerateModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--color-clay)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(196, 154, 108, 0.35)',
                  transition: 'all 0.2s',
                }}
              >
                <Layers size={16} />
                <span>Generate Invoices</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Total Invoiced */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Billed
            </span>
            <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            ₹{Number(effectiveStats?.total_billed || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {isAdmin && scopeFilter === 'ALL'
              ? `Across ${effectiveStats?.total_bills || 0} issued invoices`
              : `Across ${effectiveStats?.total_bills || 0} issued invoice(s) for your unit`}
          </div>
        </div>

        {/* Total Collected */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Collected Amount
            </span>
            <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
            ₹{Number(effectiveStats?.total_collected || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {isAdmin && scopeFilter === 'ALL'
              ? `${effectiveStats?.count_paid || 0} fully settled accounts`
              : `${effectiveStats?.count_paid || 0} settled invoice(s)`}
          </div>
        </div>

        {/* Pending & Overdue */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Pending / Overdue
            </span>
            <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>
            ₹{Number(effectiveStats?.total_pending || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {effectiveStats?.count_overdue || 0} overdue & {effectiveStats?.count_pending || 0} pending
          </div>
        </div>

        {/* Late Fee Penalties */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Late Penalties
            </span>
            <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
            ₹{Number(effectiveStats?.total_penalties || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Auto-applied after grace period
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-card)',
          gap: '8px',
        }}
      >
        <button
          onClick={() => setActiveTab('bills')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'bills' ? '2px solid var(--color-clay)' : '2px solid transparent',
            color: activeTab === 'bills' ? 'var(--color-clay)' : 'var(--text-muted)',
            fontWeight: activeTab === 'bills' ? 700 : 500,
            fontSize: '0.92rem',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={17} />
          <span>Invoices & Collections ({filteredBills.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'plans' ? '2px solid var(--color-clay)' : '2px solid transparent',
            color: activeTab === 'plans' ? 'var(--color-clay)' : 'var(--text-muted)',
            fontWeight: activeTab === 'plans' ? 700 : 500,
            fontSize: '0.92rem',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Receipt size={17} />
          <span>Maintenance Plans & Penalty Rules ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'payments' ? '2px solid var(--color-clay)' : '2px solid transparent',
            color: activeTab === 'payments' ? 'var(--color-clay)' : 'var(--text-muted)',
            fontWeight: activeTab === 'payments' ? 700 : 500,
            fontSize: '0.92rem',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CreditCard size={17} />
          <span>Payment History ({filteredPayments.length})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: INVOICES & COLLECTIONS
          ===================================================================== */}
      {activeTab === 'bills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Transparency / Community Notice for Non-Admins */}
          {!isAdmin && (
            <div
              style={{
                background: 'rgba(196, 154, 108, 0.09)',
                border: '1px solid rgba(196, 154, 108, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '0.84rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Home size={18} color="var(--color-clay)" />
                <span style={{ color: 'var(--text-main)' }}>
                  <strong>My Maintenance Account:</strong> Viewing maintenance bills, dues, and payment options for your unit.
                </span>
              </div>
              {myHomeNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Logged in for:</span>
                  <span
                    style={{
                      background: 'var(--color-clay)',
                      color: '#ffffff',
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                    }}
                  >
                    Home {myHomeNumber}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Resident Plan Options (Owner shows 2 plans: Monthly & Quarterly; Tenant shows 1 plan: Monthly) */}
          {!isAdmin && residentAvailablePlans.length > 0 && (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} color="var(--color-clay)" />
                    <span>Choose Maintenance Payment Frequency ({residentAvailablePlans.length} {residentAvailablePlans.length === 1 ? 'Plan Available' : 'Plans Available for You'})</span>
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Select your preferred maintenance plan below. Monthly covers the current month (e.g. October); Quarterly covers 3 full months (October, November, December).
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '12px',
                }}
              >
                {residentAvailablePlans.map((plan) => {
                  const isQuarterly = plan.billing_cycle === 'QUARTERLY';
                  const periodKey = isQuarterly ? getCurrentPeriod('QUARTERLY') : getCurrentPeriod('MONTHLY');
                  const periodCoveredDesc = getCoveredMonthsDescription(periodKey, plan.billing_cycle);
                  
                  // Find exact bill for this home and plan/period
                  const linkedBill = filteredBills.find(
                    (b) => (b.plan_id === plan.id || b.billing_cycle === plan.billing_cycle) && b.billing_period === periodKey
                  );

                  // Check if this plan's period is already covered by ANY paid bill (e.g. Paid Quarterly bill covers Monthly)
                  const planCoveredMonths = getCoveredMonthsForPeriod(periodKey, plan.billing_cycle);
                  const coveringPaidBill = filteredBills.find(
                    (b) =>
                      b.status === 'PAID' &&
                      ((b.plan_id === plan.id && b.billing_period === periodKey) ||
                        getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle).some((m) => planCoveredMonths.includes(m)))
                  );

                  const isPaid = linkedBill?.status === 'PAID' || !!coveringPaidBill;
                  const isCoveredByOther =
                    linkedBill?.status !== 'PAID' &&
                    !!coveringPaidBill &&
                    coveringPaidBill.billing_cycle !== plan.billing_cycle;

                  return (
                    <div
                      key={plan.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: isPaid
                          ? '1px solid #10b981'
                          : '1px solid rgba(196, 154, 108, 0.35)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span
                            style={{
                              background: isQuarterly ? 'rgba(59, 130, 246, 0.12)' : 'rgba(196, 154, 108, 0.15)',
                              color: isQuarterly ? '#3b82f6' : 'var(--color-clay)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                            }}
                          >
                            {plan.billing_cycle === 'QUARTERLY' ? 'Quarterly (3 Months)' : 'Monthly'}
                          </span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            ₹{Number(plan.amount).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ marginTop: '8px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          {plan.name}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <strong>Covered Period:</strong> {periodCoveredDesc}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {isPaid ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '0.82rem' }}>
                            <CheckCircle2 size={16} />
                            <span>
                              {isCoveredByOther
                                ? `${periodCoveredDesc} Paid (via ${coveringPaidBill.billing_cycle === 'QUARTERLY' ? 'Quarterly' : coveringPaidBill.billing_cycle} Plan)`
                                : `${periodCoveredDesc} Payment Done`}
                            </span>
                          </div>
                        ) : linkedBill ? (
                          <>
                            <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700 }}>
                              Pending: ₹{Number(linkedBill.balance_amount || linkedBill.total_amount).toLocaleString()}
                            </span>
                            <button
                              onClick={() => handleOpenPaymentModal(linkedBill)}
                              style={{
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                padding: '6px 14px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Pay Now
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleSelectPlan(plan)}
                            disabled={actionLoading}
                            style={{
                              width: '100%',
                              background: 'var(--color-clay)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 'var(--radius-sm)',
                              padding: '7px 14px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Select & Pay {isQuarterly ? 'Quarterly' : 'Monthly'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Scope Filter: Admins can toggle between All Society Homes and My Home. Residents only see their own home */}
            {isAdmin ? (
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '3px',
                  gap: '3px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setScopeFilter('ALL')}
                  style={{
                    background: scopeFilter === 'ALL' ? 'var(--color-clay)' : 'transparent',
                    color: scopeFilter === 'ALL' ? '#ffffff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: scopeFilter === 'ALL' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  All Society Homes ({bills.length})
                </button>

                {myHomeNumber && (
                  <button
                    type="button"
                    onClick={() => setScopeFilter('MY_HOME')}
                    style={{
                      background: scopeFilter === 'MY_HOME' ? 'var(--color-clay)' : 'transparent',
                      color: scopeFilter === 'MY_HOME' ? '#ffffff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: scopeFilter === 'MY_HOME' ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    My Home (Unit {myHomeNumber})
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(196, 154, 108, 0.1)',
                  border: '1px solid rgba(196, 154, 108, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--color-clay)',
                }}
              >
                <Home size={15} />
                <span>My Unit Maintenance {myHomeNumber ? `(Home ${myHomeNumber})` : ''}</span>
              </div>
            )}

            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 14px',
                minWidth: '260px',
                flex: 1,
              }}
            >
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search unit, resident name, invoice no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 12px',
                  fontSize: '0.85rem',
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            {/* Cycle Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Period:</span>
              <select
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '7px 12px',
                  fontSize: '0.85rem',
                }}
              >
                <option value="ALL">All Cycles</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly (3 Months)</option>
                <option value="HALF_YEARLY">Half-Yearly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              overflowX: 'auto',
            }}
          >
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading maintenance invoices...
              </div>
            ) : filteredBills.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                <Receipt size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ margin: 0, color: 'var(--text-main)' }}>No Invoices Found</h3>
                <p style={{ margin: '6px 0 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {bills.length === 0
                    ? 'No maintenance bills have been generated for this society yet.'
                    : 'No invoices match your current search and filter criteria.'}
                </p>
                {isAdmin && bills.length === 0 && (
                  <button
                    onClick={handleOpenGenerateModal}
                    style={{
                      background: 'var(--color-clay)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 18px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Generate First Invoices
                  </button>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-card)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Invoice #</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Unit / Home</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Resident</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Period</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Base</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Late Penalty</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Total / Balance</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Due Date</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((b) => {
                    const isOverdue = b.status === 'OVERDUE';
                    const isPaid = b.status === 'PAID';
                    const hasPenalty = Number(b.penalty_amount) > 0;
                    const isMyHome = Boolean(
                      (myHomeNumber && String(b.home_number).trim().toLowerCase() === String(myHomeNumber).trim().toLowerCase()) ||
                      (user?.id && Number(b.resident_id) === Number(user.id)) ||
                      (user?.phone && b.resident_phone && String(b.resident_phone).trim() === String(user.phone).trim())
                    );

                    return (
                      <tr
                        key={b.id}
                        style={{
                          borderBottom: '1px solid var(--border-card)',
                          background: isMyHome
                            ? 'rgba(196, 154, 108, 0.08)'
                            : isOverdue
                            ? 'rgba(239, 68, 68, 0.03)'
                            : 'transparent',
                        }}
                      >
                        {/* Invoice Number */}
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {b.bill_number}
                        </td>

                        {/* Unit / Home */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-clay)' }}>{b.home_number}</span>
                            {isMyHome && (
                              <span
                                style={{
                                  background: 'var(--color-clay)',
                                  color: '#ffffff',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  textTransform: 'uppercase',
                                }}
                              >
                                My Home
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {b.home_type} {b.block_or_tower ? `• ${b.block_or_tower}` : ''}
                          </div>
                        </td>

                        {/* Resident */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {b.resident_name || 'Vacant / Unassigned'}
                          </div>
                          {b.resident_phone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.resident_phone}</div>
                          )}
                        </td>

                        {/* Period */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.84rem' }}>
                            {getCoveredMonthsDescription(b.billing_period, b.billing_cycle)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                            <span
                              style={{
                                background: b.billing_cycle === 'QUARTERLY' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(196, 154, 108, 0.12)',
                                color: b.billing_cycle === 'QUARTERLY' ? '#3b82f6' : 'var(--color-clay)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                              }}
                            >
                              {b.billing_cycle === 'QUARTERLY' ? 'Quarterly (3 Months)' : (b.billing_cycle || 'Monthly')}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              ({b.billing_period})
                            </span>
                          </div>
                        </td>

                        {/* Base Amount */}
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>₹{Number(b.base_amount).toLocaleString()}</td>

                        {/* Late Penalty */}
                        <td style={{ padding: '14px 16px' }}>
                          {hasPenalty ? (
                            <span
                              style={{
                                color: '#ef4444',
                                fontWeight: 700,
                                background: 'rgba(239, 68, 68, 0.1)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              +₹{Number(b.penalty_amount).toLocaleString()}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>₹0</span>
                          )}
                        </td>

                        {/* Total / Balance */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            ₹{Number(b.total_amount).toLocaleString()}
                          </div>
                          {!isPaid && (
                            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                              Bal: ₹{Number(b.balance_amount).toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* Due Date */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ color: isOverdue ? '#ef4444' : 'var(--text-main)', fontWeight: isOverdue ? 700 : 500 }}>
                            {new Date(b.due_date).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background:
                                b.status === 'PAID'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : b.status === 'OVERDUE'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : b.status === 'PARTIALLY_PAID'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(148, 163, 184, 0.15)',
                              color:
                                b.status === 'PAID'
                                  ? '#10b981'
                                  : b.status === 'OVERDUE'
                                  ? '#ef4444'
                                  : b.status === 'PARTIALLY_PAID'
                                  ? '#f59e0b'
                                  : '#94a3b8',
                            }}
                          >
                            {b.status === 'PAID' && <CheckCircle2 size={13} />}
                            {b.status}
                          </span>
                          {b.status === 'PAID' && (
                            <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                              {getCoveredMonthsDescription(b.billing_period, b.billing_cycle)} payment done
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            {!isPaid && (
                              <button
                                onClick={() => handleOpenPaymentModal(b)}
                                style={{
                                  background: isMyHome ? 'var(--color-clay)' : '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '5px 12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {isMyHome ? 'Pay Dues' : isAdmin ? 'Collect' : 'Pay'}
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenReceiptModal(b)}
                              title="View Invoice"
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--border-card)',
                                color: 'var(--text-main)',
                                borderRadius: '4px',
                                padding: '5px 8px',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Printer size={14} />
                              <span>View</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: MAINTENANCE PLANS & PENALTY CONFIGURATIONS
          ===================================================================== */}
      {activeTab === 'plans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Banner Explanation */}
          <div
            style={{
              background: 'rgba(196, 154, 108, 0.08)',
              border: '1px solid rgba(196, 154, 108, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            <div style={{ color: 'var(--color-clay)', marginTop: '2px' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                Differential Charges & Penalty Rule Engine
              </h4>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
                Configure maintenance fee rates based on home configurations (1BHK, 2BHK, 3BHK, Bungalow, etc.). Choose billing cycles:
                <strong> Monthly</strong>, <strong>Quarterly (every 3 months)</strong>, Half-Yearly, or Yearly.
                If payment is delayed beyond the <strong>grace period</strong>, a fixed or percentage late penalty is automatically applied.
              </p>
            </div>
          </div>

          {/* Plans Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {plans.map((p) => {
              const isFixed = p.penalty_type === 'FIXED';
              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    position: 'relative',
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span
                          style={{
                            background: 'rgba(196, 154, 108, 0.15)',
                            color: 'var(--color-clay)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {p.applicable_type === 'ALL' ? 'ALL UNITS' : `${p.applicable_type} UNIT`}
                        </span>
                        <span
                          style={{
                            background:
                              p.resident_type === 'TENANT'
                                ? 'rgba(59, 130, 246, 0.12)'
                                : p.resident_type === 'OWNER'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : 'rgba(107, 142, 90, 0.12)',
                            color:
                              p.resident_type === 'TENANT'
                                ? '#2563eb'
                                : p.resident_type === 'OWNER'
                                ? '#059669'
                                : 'var(--color-fern-green)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {p.resident_type === 'TENANT'
                            ? 'Tenant Only'
                            : p.resident_type === 'OWNER'
                            ? 'Owner Only'
                            : 'Both (Owner & Tenant)'}
                        </span>
                      </div>
                      <h3 style={{ margin: '0 0 2px', fontSize: '1.15rem', color: 'var(--text-main)' }}>
                        {p.name}
                      </h3>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {p.matching_homes_count} matching homes in society
                      </div>
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEditPlan(p)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Edit Plan"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Deactivate Plan"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Charge Amount */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      ₹{Number(p.amount).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      / {p.billing_cycle === 'QUARTERLY' ? 'Quarter (3 Mos)' : p.billing_cycle.toLowerCase()}
                    </span>
                  </div>

                  {/* Penalty & Cycle Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Due Date:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        {p.due_day}th of the cycle
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Grace Period:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        {p.grace_period_days} Days
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Late Payment Penalty:</span>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>
                        {isFixed ? `₹${p.penalty_rate} Fixed` : `${p.penalty_rate}% Interest`}
                      </span>
                    </div>
                  </div>

                  {p.description && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        borderTop: '1px solid var(--border-card)',
                        paddingTop: '8px',
                      }}
                    >
                      {p.description}
                    </div>
                  )}
                </div>
              );
            })}

            {plans.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '40px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-card)',
                }}
              >
                <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ margin: 0, color: 'var(--text-main)' }}>No Maintenance Plans Yet</h3>
                <p style={{ margin: '6px 0 16px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Define different maintenance rates for 1BHK, 2BHK, 3BHK, or Bungalow units.
                </p>
                {isAdmin && (
                  <button
                    onClick={handleOpenCreatePlan}
                    style={{
                      background: 'var(--color-clay)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 18px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Create First Plan
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: PAYMENT HISTORY
          ===================================================================== */}
      {activeTab === 'payments' && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            overflowX: 'auto',
          }}
        >
          {filteredPayments.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center' }}>
              <CreditCard size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>No Payments Recorded</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                When residents pay maintenance dues via UPI, Cash, or Cheque, the records will appear here.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-card)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Receipt #</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Invoice #</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Unit / Home</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Resident</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Amount Paid</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Payment Mode</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Transaction Ref</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Collected By</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--color-clay)' }}>
                      {p.receipt_number}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontWeight: 600 }}>
                      {p.bill_number}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>{p.home_number}</td>
                    <td style={{ padding: '14px 16px' }}>{p.resident_name || 'Resident'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#10b981' }}>
                      ₹{Number(p.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          background: 'rgba(59, 130, 246, 0.12)',
                          color: '#3b82f6',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        {p.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {p.transaction_reference || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(p.payment_date).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontSize: '0.82rem' }}>
                      {p.collected_by_name || 'System / Admin'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE / EDIT MAINTENANCE PLAN
          ===================================================================== */}
      {showPlanModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
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
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                {editingPlan ? 'Edit Maintenance Plan' : 'Create Maintenance Plan'}
              </h2>
              <button
                onClick={() => setShowPlanModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Plan Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Plan Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Standard 2BHK Maintenance, Premium Bungalow"
                  value={planFormData.name}
                  onChange={(e) => setPlanFormData({ ...planFormData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              {/* Property Configuration & Resident Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Property Configuration *
                  </label>
                  <select
                    id="select-plan-applicable-type"
                    value={planFormData.applicable_type}
                    onChange={(e) => setPlanFormData({ ...planFormData, applicable_type: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '9px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                    }}
                  >
                    <option value="ALL">All Configurations (Default)</option>
                    {activeSocietyConfigs.map((cfg) => (
                      <option key={cfg} value={cfg}>
                        {cfg === 'PENTHOUSE' ? 'Penthouse' : cfg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Resident Type *
                  </label>
                  <select
                    id="select-plan-resident-type"
                    value={planFormData.resident_type}
                    onChange={(e) => setPlanFormData({ ...planFormData, resident_type: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '9px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                    }}
                  >
                    <option value="BOTH">Both (Owner & Tenant)</option>
                    <option value="OWNER">Owner Only</option>
                    <option value="TENANT">Tenant Only</option>
                  </select>
                </div>
              </div>

              {/* Payment Frequency & Charge Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Payment Frequency (Period) *
                  </label>
                  <select
                    id="select-plan-billing-cycle"
                    value={planFormData.billing_cycle}
                    onChange={(e) => setPlanFormData({ ...planFormData, billing_cycle: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '9px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                    }}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly (3 Months)</option>
                    <option value="HALF_YEARLY">Half-Yearly (6 Months)</option>
                    <option value="YEARLY">Yearly (12 Months)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Maintenance Charge Amount (₹) *
                  </label>
                  <input
                    id="input-plan-amount"
                    type="number"
                    placeholder="e.g. 2500"
                    value={planFormData.amount}
                    onChange={(e) => setPlanFormData({ ...planFormData, amount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '9px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>
              </div>

              {/* Due Day & Grace Period */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Due Day of Cycle (1-28)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={planFormData.due_day}
                    onChange={(e) => setPlanFormData({ ...planFormData, due_day: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '9px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>e.g. 5th of each period</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={planFormData.grace_period_days}
                    onChange={(e) => setPlanFormData({ ...planFormData, grace_period_days: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '9px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Days after due date before penalty</span>
                </div>
              </div>

              {/* Late Penalty Rule */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ef4444' }}>
                  Late Payment Penalty Rule
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Penalty Type
                    </label>
                    <select
                      value={planFormData.penalty_type}
                      onChange={(e) => setPlanFormData({ ...planFormData, penalty_type: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-md)',
                        padding: '7px 10px',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value="FIXED">Fixed Amount (₹)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Penalty Value ({planFormData.penalty_type === 'FIXED' ? '₹' : '%'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={planFormData.penalty_rate}
                      onChange={(e) => setPlanFormData({ ...planFormData, penalty_rate: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-md)',
                        padding: '7px 10px',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Description / Terms
                </label>
                <textarea
                  placeholder="Includes security, water, lift maintenance, common area cleaning..."
                  rows={2}
                  value={planFormData.description}
                  onChange={(e) => setPlanFormData({ ...planFormData, description: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: 'var(--color-clay)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: BATCH GENERATE INVOICES
          ===================================================================== */}
      {showGenerateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
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
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                Generate Maintenance Invoices
              </h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background: 'rgba(196, 154, 108, 0.08)',
                border: '1px solid rgba(196, 154, 108, 0.25)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '0.83rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              Invoices will be batch-created for every active home in the society using the matching plan fee for their BHK / Bungalow configuration.
            </div>

            <form onSubmit={handleGenerateInvoices} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Billing Cycle
                </label>
                <select
                  value={generateFormData.billing_cycle}
                  onChange={(e) => {
                    const cycle = e.target.value;
                    setGenerateFormData({
                      ...generateFormData,
                      billing_cycle: cycle,
                      billing_period: getCurrentPeriod(cycle),
                    });
                  }}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly (3 Months)</option>
                  <option value="HALF_YEARLY">Half-Yearly (6 Months)</option>
                  <option value="YEARLY">Yearly (12 Months)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Billing Period Label *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026-10 or Q4-2026"
                  value={generateFormData.billing_period}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, billing_period: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Custom Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={generateFormData.due_date}
                  onChange={(e) => setGenerateFormData({ ...generateFormData, due_date: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Leave empty to auto-calculate based on plan due day
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: 'var(--color-clay)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Processing...' : 'Run Generation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: RECORD PAYMENT
          ===================================================================== */}
      {showPaymentModal && selectedBillForPayment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
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
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Record Maintenance Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Bill Summary */}
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '0.83rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Invoice:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedBillForPayment.bill_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Unit:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-clay)' }}>{selectedBillForPayment.home_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Covered Period:</span>
                <span style={{ fontWeight: 700, color: '#3b82f6' }}>
                  {getCoveredMonthsDescription(selectedBillForPayment.billing_period, selectedBillForPayment.billing_cycle)}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    ({selectedBillForPayment.billing_cycle})
                  </span>
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Amount:</span>
                <span style={{ fontWeight: 700 }}>₹{Number(selectedBillForPayment.total_amount).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Outstanding Balance:</span>
                <span style={{ fontWeight: 800, color: '#ef4444' }}>₹{Number(selectedBillForPayment.balance_amount).toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Payment Method
                </label>
                <select
                  value={paymentFormData.payment_method}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="UPI">UPI / Google Pay / PhonePe</option>
                  <option value="CASH">Cash at Admin Office</option>
                  <option value="NET_BANKING">Net Banking / NEFT / IMPS</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Transaction Reference / UTR / Cheque No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR3092830192 / Cheque #89102"
                  value={paymentFormData.transaction_reference}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, transaction_reference: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional payment notes"
                  value={paymentFormData.remarks}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, remarks: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: '#10b981',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: INVOICE & RECEIPT PREVIEW (PRINTABLE)
          ===================================================================== */}
      {showReceiptModal && selectedBillForReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Maintenance Invoice & Receipt
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Society & Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedBillForReceipt.society_name || 'Residential Society'}
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                  {selectedBillForReceipt.society_address || 'Society Management Office'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedBillForReceipt.bill_number}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Due: {new Date(selectedBillForReceipt.due_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Resident / Unit Information */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '0.82rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Unit / Home:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {selectedBillForReceipt.home_number} ({selectedBillForReceipt.home_type})
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Resident Name:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {selectedBillForReceipt.resident_name || 'Unit Owner'}
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Covered Months / Period:</span>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {getCoveredMonthsDescription(selectedBillForReceipt.billing_period, selectedBillForReceipt.billing_cycle)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Cycle: {selectedBillForReceipt.billing_cycle} ({selectedBillForReceipt.billing_period})
                </div>
              </div>

              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Payment Status:</span>
                <div>
                  <span
                    style={{
                      background:
                        selectedBillForReceipt.status === 'PAID'
                          ? '#dcfce7'
                          : selectedBillForReceipt.status === 'OVERDUE'
                          ? '#fee2e2'
                          : '#fef3c7',
                      color:
                        selectedBillForReceipt.status === 'PAID'
                          ? '#15803d'
                          : selectedBillForReceipt.status === 'OVERDUE'
                          ? '#b91c1c'
                          : '#b45309',
                      padding: '3px 9px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {selectedBillForReceipt.status === 'PAID'
                      ? `✓ ${getCoveredMonthsDescription(selectedBillForReceipt.billing_period, selectedBillForReceipt.billing_cycle)} payment done`
                      : selectedBillForReceipt.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Breakdown Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: '#64748b' }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '8px 0', color: '#64748b' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 0' }}>
                    <div style={{ fontWeight: 600 }}>Base Maintenance Charge</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {selectedBillForReceipt.plan_name || 'Standard Rate'} • {getCoveredMonthsDescription(selectedBillForReceipt.billing_period, selectedBillForReceipt.billing_cycle)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 0', fontWeight: 600 }}>
                    ₹{Number(selectedBillForReceipt.base_amount).toLocaleString()}
                  </td>
                </tr>

                {Number(selectedBillForReceipt.penalty_amount) > 0 && (
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 0' }}>
                      <div style={{ fontWeight: 600, color: '#b91c1c' }}>Late Payment Penalty</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Overdue fee after grace period
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 0', fontWeight: 700, color: '#b91c1c' }}>
                      +₹{Number(selectedBillForReceipt.penalty_amount).toLocaleString()}
                    </td>
                  </tr>
                )}

                <tr style={{ borderTop: '2px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 0', fontWeight: 800, fontSize: '0.95rem' }}>Total Payable</td>
                  <td style={{ textAlign: 'right', padding: '10px 0', fontWeight: 800, fontSize: '0.95rem' }}>
                    ₹{Number(selectedBillForReceipt.total_amount).toLocaleString()}
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '6px 0', color: '#15803d', fontWeight: 600 }}>Amount Paid</td>
                  <td style={{ textAlign: 'right', padding: '6px 0', color: '#15803d', fontWeight: 700 }}>
                    -₹{Number(selectedBillForReceipt.paid_amount || 0).toLocaleString()}
                  </td>
                </tr>

                <tr style={{ borderTop: '1px dashed #cbd5e1' }}>
                  <td style={{ padding: '8px 0', fontWeight: 800, color: '#b91c1c' }}>Balance Due</td>
                  <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 800, color: '#b91c1c' }}>
                    ₹{Number(selectedBillForReceipt.balance_amount || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Payment History Log */}
            {selectedBillForReceipt.payments && selectedBillForReceipt.payments.length > 0 && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Payment Receipts Recorded
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {selectedBillForReceipt.payments.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        background: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '4px',
                      }}
                    >
                      <span>
                        <strong>{p.receipt_number}</strong> ({p.payment_method})
                      </span>
                      <span style={{ color: '#15803d', fontWeight: 700 }}>
                        ₹{Number(p.amount).toLocaleString()} on {new Date(p.payment_date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
