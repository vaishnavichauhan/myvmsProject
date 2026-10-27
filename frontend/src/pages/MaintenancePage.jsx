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
  ShieldCheck,
  XCircle,
  Check,
  CalendarDays,
  LayoutGrid,
  ListFilter,
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

  // View Mode for Bills Tab: 'TABLE' | 'HOME_LIST' | 'MONTH_LIST'
  const [viewMode, setViewMode] = useState('TABLE');
  const [billsSubTab, setBillsSubTab] = useState('INVOICES'); // 'INVOICES' | 'MONTHLY_PAYMENT'
  const [societyHomes, setSocietyHomes] = useState([]);
  const [selectedMonthView, setSelectedMonthView] = useState('ALL');

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
    plan_id: 'AUTO',
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

  // Admin Payment Verification & Confirmation Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedPaymentForVerify, setSelectedPaymentForVerify] = useState(null);
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Pay Maintenance Modal (Resident chooses from available plans for current/advance payment)
  const [showPayMaintenanceModal, setShowPayMaintenanceModal] = useState(false);

  // Admin Maintenance Cycle Range (Start Month & Year to End Month & Year)
  const [cycleRange, setCycleRange] = useState(() => {
    const today = new Date();
    const curY = today.getFullYear();
    const curM = String(today.getMonth() + 1).padStart(2, '0');
    const saved = localStorage.getItem('myvms_maint_cycle');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.startMonth && parsed.endMonth) return parsed;
      } catch (e) {}
    }
    // Default cycle: current month (2026-10) to current month + 2 (2026-12)
    const endD = new Date(curY, today.getMonth() + 2, 1);
    const endY = endD.getFullYear();
    const endM = String(endD.getMonth() + 1).padStart(2, '0');
    return {
      startMonth: `${curY}-${curM}`,
      endMonth: `${endY}-${endM}`,
    };
  });
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [cycleForm, setCycleForm] = useState(cycleRange);

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

    // Quarterly format: Q1-YYYY, Q2-YYYY, Q3-YYYY, Q4-YYYY or YYYY-Q1...
    const qMatch1 = String(billing_period).match(/Q([1-4])[-_\s]*(\d{4})/i);
    const qMatch2 = String(billing_period).match(/(\d{4})[-_\s]*Q([1-4])/i);
    if (qMatch1 || qMatch2 || billing_cycle === 'QUARTERLY') {
      const quarter = qMatch1 ? parseInt(qMatch1[1], 10) : qMatch2 ? parseInt(qMatch2[2], 10) : Math.ceil((new Date().getMonth() + 1) / 3);
      const year = qMatch1 ? qMatch1[2] : qMatch2 ? qMatch2[1] : new Date().getFullYear();
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
    const qMatch1 = String(period).match(/Q([1-4])[-_\s]*(\d{4})/i);
    const qMatch2 = String(period).match(/(\d{4})[-_\s]*Q([1-4])/i);
    if (qMatch1 || qMatch2) {
      const q = qMatch1 ? parseInt(qMatch1[1], 10) : parseInt(qMatch2[2], 10);
      const y = qMatch1 ? qMatch1[2] : qMatch2[1];
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
      const [statsRes, plansRes, billsRes, paymentsRes, homesRes] = await Promise.all([
        maintenanceApi.getStats({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getPlans({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getBills({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getPayments({ society_id: selectedSocietyId }).catch(() => ({})),
        societyApi.getHomesBySociety(selectedSocietyId).catch(() => ({})),
      ]);

      setStats(statsRes.data?.stats || null);
      setPlans(plansRes.data?.plans || []);
      setBills(billsRes.data?.bills || []);
      setPayments(paymentsRes.data?.payments || []);
      const rawHomes = homesRes?.data?.homes || homesRes?.homes || homesRes?.data || [];
      setSocietyHomes(Array.isArray(rawHomes) ? rawHomes : []);
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

  // Combined list of society homes
  const allHomes = useMemo(() => {
    if (Array.isArray(societyHomes) && societyHomes.length > 0) return societyHomes;
    const map = new Map();
    bills.forEach((b) => {
      if (b.home_id && !map.has(b.home_id)) {
        map.set(b.home_id, {
          id: b.home_id,
          home_number: b.home_number,
          home_type: b.home_type,
          resident_name: b.resident_name,
          resident_phone: b.resident_phone,
        });
      }
    });
    return Array.from(map.values());
  }, [societyHomes, bills]);

  // Format month key helper: e.g. "2026-11" -> { short: "Nov-2026", long: "November 2026", year: "2026", monthName: "November" }
  const formatMonth = (monthStr) => {
    if (!monthStr) return { short: '', long: '', monthName: '', year: '' };
    const match = String(monthStr).match(/(\d{4})-(\d{1,2})/);
    if (!match) return { short: monthStr, long: monthStr, monthName: monthStr, year: '' };
    const year = match[1];
    const mIdx = parseInt(match[2], 10) - 1;
    const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const longNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return {
      short: `${shortNames[mIdx] || match[2]}-${year}`,
      long: `${longNames[mIdx] || match[2]} ${year}`,
      monthName: longNames[mIdx] || match[2],
      year,
    };
  };

  // All active billing months tracked in system (strictly within selected cycle range)
  const allBillingMonths = useMemo(() => {
    if (!cycleRange.startMonth || !cycleRange.endMonth) return [];
    const [sY, sM] = cycleRange.startMonth.split('-').map(Number);
    const [eY, eM] = cycleRange.endMonth.split('-').map(Number);
    let curr = new Date(sY, sM - 1, 1);
    const stop = new Date(eY, eM - 1, 1);
    const list = [];
    while (curr <= stop) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      list.push(`${yyyy}-${mm}`);
      curr.setMonth(curr.getMonth() + 1);
    }
    // Also include any months that actually have bills within this cycle range
    bills.forEach((b) => {
      if (b.billing_cycle === 'MONTHLY' && b.billing_period && /^\d{4}-\d{2}$/.test(b.billing_period)) {
        if (b.billing_period >= cycleRange.startMonth && b.billing_period <= cycleRange.endMonth) {
          if (!list.includes(b.billing_period)) list.push(b.billing_period);
        }
      }
    });
    return list.sort();
  }, [cycleRange, bills]);

  // Helper to get payment status of a specific home for a given month (e.g. "2026-11")
  const getHomeMonthStatus = (homeId, monthKey) => {
    const bill = bills.find((b) => {
      if (String(b.home_id) !== String(homeId)) return false;
      if (b.billing_period === monthKey) return true;
      const covered = getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle);
      return covered.includes(monthKey);
    });

    if (!bill) {
      return {
        status: 'NOT_INVOICED',
        label: 'Not Invoiced',
        isPaid: false,
        bill: null,
      };
    }

    const covered = getCoveredMonthsForPeriod(bill.billing_period, bill.billing_cycle);
    const numCovered = covered.length > 0 ? covered.length : 1;
    const isMultiMonth = numCovered > 1;

    if (bill.status === 'PAID') {
      return {
        status: 'PAID',
        label: 'Done Payment',
        isPaid: true,
        bill,
        amount: Number(bill.paid_amount || bill.total_amount),
        monthlyShare: Math.round(Number(bill.paid_amount || bill.total_amount) / numCovered),
        isMultiMonth,
        coveredMonths: covered,
        method: bill.payment_method || 'ONLINE',
      };
    }

    if (bill.status === 'PENDING_APPROVAL' || Number(bill.pending_payments_count) > 0) {
      return {
        status: 'PENDING_APPROVAL',
        label: 'Pending Approval',
        isPaid: false,
        bill,
        amount: Number(bill.total_amount),
        monthlyShare: Math.round(Number(bill.total_amount) / numCovered),
        isMultiMonth,
        coveredMonths: covered,
      };
    }

    return {
      status: bill.status || 'PENDING',
      label: bill.status === 'OVERDUE' ? 'Overdue Due' : 'Pending Due',
      isPaid: false,
      bill,
      amount: Number(bill.balance_amount || bill.total_amount),
      monthlyShare: Math.round(Number(bill.balance_amount || bill.total_amount) / numCovered),
      isMultiMonth,
      coveredMonths: covered,
    };
  };

  // Helper to get consolidated payment periods for a home (combining Quarterly into 1 card showing 2500 once)
  const getHomePaymentPeriods = (targetHomeId) => {
    if (!targetHomeId) return [];
    const homeBills = bills.filter((b) => String(b.home_id) === String(targetHomeId));
    const periods = [];
    const handledMonths = new Set();

    // 1. Process Multi-Month / Quarterly bills first so they combine their 3 months
    const multiMonthBills = homeBills.filter(
      (b) => ['QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(b.billing_cycle) ||
             (getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle).length > 1)
    );

    multiMonthBills.forEach((qBill) => {
      const covered = getCoveredMonthsForPeriod(qBill.billing_period, qBill.billing_cycle);
      if (covered.length > 0) {
        covered.forEach((m) => handledMonths.add(m));

        const firstFmt = formatMonth(covered[0]);
        const lastFmt = formatMonth(covered[covered.length - 1]);
        const isPaid = qBill.status === 'PAID';
        const isPendingApproval = qBill.status === 'PENDING_APPROVAL' || Number(qBill.pending_payments_count) > 0;

        periods.push({
          key: `bill-${qBill.id}`,
          sortKey: covered[0],
          isMultiMonth: true,
          billing_cycle: qBill.billing_cycle,
          title: `${firstFmt.short.split(' ')[0]} – ${lastFmt.short}`,
          subTitle: `Covers ${covered.map((m) => formatMonth(m).short.split(' ')[0]).join(', ')} ${firstFmt.year}`,
          cycleBadge: qBill.billing_cycle === 'QUARTERLY' ? 'Quarterly (3 Months Plan)' : `${covered.length} Months Combined`,
          coveredMonths: covered,
          amount: Number(qBill.paid_amount || qBill.total_amount),
          balanceAmount: Number(qBill.balance_amount || qBill.total_amount),
          isPaid,
          status: isPaid ? 'PAID' : isPendingApproval ? 'PENDING_APPROVAL' : (qBill.status || 'PENDING'),
          label: isPaid ? 'Done Payment' : isPendingApproval ? 'Approval Pending' : (qBill.status === 'OVERDUE' ? 'Overdue Due' : 'Pending Due'),
          bill: qBill,
        });
      }
    });

    // 2. Process all remaining months in allBillingMonths
    allBillingMonths.forEach((m) => {
      if (handledMonths.has(m)) return;
      handledMonths.add(m);

      const mBill = homeBills.find((b) => b.billing_period === m);
      const fmt = formatMonth(m);

      if (mBill) {
        const isPaid = mBill.status === 'PAID';
        const isPendingApproval = mBill.status === 'PENDING_APPROVAL' || Number(mBill.pending_payments_count) > 0;
        periods.push({
          key: `bill-${mBill.id}`,
          sortKey: m,
          isMultiMonth: false,
          billing_cycle: mBill.billing_cycle || 'MONTHLY',
          title: fmt.short,
          subTitle: fmt.long,
          cycleBadge: 'Monthly Plan',
          coveredMonths: [m],
          amount: Number(mBill.paid_amount || mBill.total_amount),
          balanceAmount: Number(mBill.balance_amount || mBill.total_amount),
          isPaid,
          status: isPaid ? 'PAID' : isPendingApproval ? 'PENDING_APPROVAL' : (mBill.status || 'PENDING'),
          label: isPaid ? 'Done Payment' : isPendingApproval ? 'Approval Pending' : (mBill.status === 'OVERDUE' ? 'Overdue Due' : 'Pending Due'),
          bill: mBill,
        });
      } else {
        periods.push({
          key: `month-${m}`,
          sortKey: m,
          isMultiMonth: false,
          billing_cycle: 'MONTHLY',
          title: fmt.short,
          subTitle: fmt.long,
          cycleBadge: 'Monthly',
          coveredMonths: [m],
          amount: 0,
          balanceAmount: 0,
          isPaid: false,
          status: 'NOT_INVOICED',
          label: 'Not Invoiced',
          bill: null,
        });
      }
    });

    return periods.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  };

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

  // Helper to determine the next unpaid period for a given plan (advance billing)
  const getNextUnpaidPeriodForPlan = (plan) => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;

    const paidMonthsSet = new Set();
    filteredBills.forEach((b) => {
      if (b.status === 'PAID') {
        if (b.billing_cycle === 'MONTHLY' && b.billing_period) {
          paidMonthsSet.add(b.billing_period);
        }
        const cov = getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle);
        cov.forEach((m) => paidMonthsSet.add(m));
      }
    });

    if (plan.billing_cycle === 'QUARTERLY') {
      const curQ = Math.ceil(curMonth / 3);
      let qNum = curQ;
      let qYear = curYear;
      while (true) {
        const qStr = `Q${qNum}-${qYear}`;
        const qMonths = getCoveredMonthsForPeriod(qStr, 'QUARTERLY');
        const hasAnyPaidMonth = qMonths.some((m) => paidMonthsSet.has(m));
        if (!hasAnyPaidMonth) {
          return {
            period: qStr,
            isAdvance: qNum !== curQ || qYear !== curYear,
            desc: getCoveredMonthsDescription(qStr, 'QUARTERLY'),
          };
        }
        qNum++;
        if (qNum > 4) {
          qNum = 1;
          qYear++;
        }
      }
    }

    let mNum = curMonth;
    let mYear = curYear;
    while (true) {
      const mStr = `${mYear}-${String(mNum).padStart(2, '0')}`;
      if (!paidMonthsSet.has(mStr)) {
        const isAdvance = mNum !== curMonth || mYear !== curYear;
        return {
          period: mStr,
          isAdvance,
          desc: formatMonth(mStr).long,
        };
      }
      mNum++;
      if (mNum > 12) {
        mNum = 1;
        mYear++;
      }
    }
  };

  const handleSelectPlan = async (plan, targetPeriod = null) => {
    setActionLoading(true);
    try {
      const payload = { plan_id: plan.id };
      if (targetPeriod) {
        payload.billing_period = targetPeriod;
      }
      const res = await maintenanceApi.selectResidentPlan(payload);
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
  const handleOpenGenerateModal = (initialPlan = null) => {
    if (initialPlan && initialPlan.id !== 'AUTO') {
      const cycle = initialPlan.billing_cycle || 'MONTHLY';
      setGenerateFormData({
        plan_id: initialPlan.id,
        billing_period: getCurrentPeriod(cycle),
        billing_cycle: cycle,
        due_date: '',
      });
    } else {
      setGenerateFormData({
        plan_id: 'AUTO',
        billing_period: getCurrentPeriod('MONTHLY'),
        billing_cycle: 'MONTHLY',
        due_date: '',
      });
    }
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
      const res = await maintenanceApi.recordPayment({
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
      const isPending = res.data?.payment?.status === 'PENDING_APPROVAL';
      if (isPending) {
        showToast(`Payment of ₹${paymentFormData.amount} submitted successfully! Awaiting Admin verification and confirmation.`);
      } else {
        showToast(`Payment of ₹${paymentFormData.amount} recorded and approved successfully for ${coveredDesc}!`);
      }
      setShowPaymentModal(false);
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Check & Confirm Payment Modal (for Admin)
  const handleOpenVerifyModal = (paymentOrBill) => {
    if (!paymentOrBill) return;

    let target = null;
    // 1. If it's a payment record directly from payments list
    if (paymentOrBill.receipt_number && paymentOrBill.bill_id) {
      target = paymentOrBill;
    } else {
      // 2. It's a bill (or custom object)
      const matchedPayment = payments.find(
        (p) => Number(p.bill_id) === Number(paymentOrBill.id) && p.status === 'PENDING_APPROVAL'
      );
      if (matchedPayment) {
        target = matchedPayment;
      } else {
        const paymentId = paymentOrBill.pending_payment_id || (payments.find(p => Number(p.bill_id) === Number(paymentOrBill.id))?.id);
        target = {
          id: paymentId,
          pending_payment_id: paymentId,
          bill_id: paymentOrBill.id,
          bill_number: paymentOrBill.bill_number,
          home_number: paymentOrBill.home_number,
          home_type: paymentOrBill.home_type,
          resident_name: paymentOrBill.resident_name,
          resident_phone: paymentOrBill.resident_phone,
          amount: paymentOrBill.pending_payment_amount || paymentOrBill.balance_amount || paymentOrBill.total_amount,
          payment_method: paymentOrBill.pending_payment_method || 'UPI',
          transaction_reference: paymentOrBill.pending_payment_ref || '',
          billing_period: paymentOrBill.billing_period,
          billing_cycle: paymentOrBill.billing_cycle,
          status: 'PENDING_APPROVAL',
        };
      }
    }

    setSelectedPaymentForVerify(target);
    setVerifyRemarks('');
    setRejectReason('');
    setIsRejecting(false);
    setShowVerifyModal(true);
  };

  // Admin approves payment
  const handleApprovePayment = async () => {
    let rawId = selectedPaymentForVerify?.id;
    if (!rawId || rawId === selectedPaymentForVerify?.bill_id) {
      rawId = selectedPaymentForVerify?.pending_payment_id;
    }
    if (!rawId && selectedPaymentForVerify?.bill_id) {
      const match = payments.find(p => Number(p.bill_id) === Number(selectedPaymentForVerify.bill_id) && p.status === 'PENDING_APPROVAL');
      if (match) rawId = match.id;
    }

    const paymentId = Number(rawId);
    if (!paymentId || isNaN(paymentId) || paymentId <= 0) {
      showError('No valid payment ID found to confirm. Please refresh and try again.');
      return;
    }

    setActionLoading(true);
    try {
      await maintenanceApi.approvePayment(paymentId, { remarks: verifyRemarks.trim() || undefined });
      showToast('Payment confirmed & approved successfully! Both resident and admin records updated.');
      setShowVerifyModal(false);
      await fetchData();
    } catch (err) {
      showError(err.message || 'Failed to approve payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin rejects payment
  const handleRejectPayment = async () => {
    let rawId = selectedPaymentForVerify?.id;
    if (!rawId || rawId === selectedPaymentForVerify?.bill_id) {
      rawId = selectedPaymentForVerify?.pending_payment_id;
    }
    if (!rawId && selectedPaymentForVerify?.bill_id) {
      const match = payments.find(p => Number(p.bill_id) === Number(selectedPaymentForVerify.bill_id) && p.status === 'PENDING_APPROVAL');
      if (match) rawId = match.id;
    }

    const paymentId = Number(rawId);
    if (!paymentId || isNaN(paymentId) || paymentId <= 0) {
      showError('No valid payment ID found to reject.');
      return;
    }

    if (!rejectReason.trim()) {
      showError('Please provide a reason for rejecting this payment submission');
      return;
    }

    setActionLoading(true);
    try {
      await maintenanceApi.rejectPayment(paymentId, { reason: rejectReason.trim() });
      showToast('Payment submission has been rejected. Bill restored to pending.');
      setShowVerifyModal(false);
      await fetchData();
    } catch (err) {
      showError(err.message || 'Failed to reject payment');
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
              <button
                onClick={handleOpenCreatePlan}
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
                <Plus size={16} />
                <span>New Plan</span>
              </button>
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
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-card)',
          gap: '12px',
          flexWrap: 'wrap',
          paddingBottom: '2px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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

        {/* Right side of Payment History: Pay Maintenance Button */}
        {!isAdmin && (
          <button
            type="button"
            id="btn-pay-maintenance"
            onClick={() => setShowPayMaintenanceModal(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 18px',
              fontSize: '0.85rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.2s ease',
              marginBottom: '4px',
            }}
          >
            <CreditCard size={16} />
            <span>Pay Maintenance</span>
          </button>
        )}
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


          {/* Resident Month-Wise Payment Done Track Record */}
          {!isAdmin && (
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
                    <CalendarDays size={18} color="var(--color-clay)" />
                    <span>My Monthly Payment Track Record {myHomeNumber ? `(Unit / Home ${myHomeNumber})` : ''}</span>
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Monthly breakdown of maintenance dues and verified payments for your home.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '10px',
                }}
              >
                {allBillingMonths.slice(0, 6).map((m) => {
                  const myHomeObj = allHomes.find(
                    (h) => (myHomeNumber && String(h.home_number).trim() === String(myHomeNumber).trim()) ||
                           (filteredBills.length > 0 && String(h.id) === String(filteredBills[0]?.home_id))
                  );
                  const homeId = myHomeObj?.id || filteredBills[0]?.home_id;
                  const monthStatus = homeId ? getHomeMonthStatus(homeId, m) : { status: 'NOT_INVOICED', label: 'Not Invoiced', isPaid: false };
                  const fmt = formatMonth(m);

                  return (
                    <div
                      key={m}
                      style={{
                        background: monthStatus.isPaid
                          ? 'rgba(16, 185, 129, 0.08)'
                          : monthStatus.status === 'PENDING_APPROVAL'
                          ? 'rgba(245, 158, 11, 0.08)'
                          : monthStatus.status === 'NOT_INVOICED'
                          ? 'rgba(255, 255, 255, 0.02)'
                          : 'rgba(239, 68, 68, 0.08)',
                        border: monthStatus.isPaid
                          ? '1px solid #10b981'
                          : monthStatus.status === 'PENDING_APPROVAL'
                          ? '1px solid #f59e0b'
                          : monthStatus.status === 'NOT_INVOICED'
                          ? '1px dashed var(--border-card)'
                          : '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          {fmt.short}
                        </span>
                        {monthStatus.isPaid ? (
                          <span
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            Done Payment
                          </span>
                        ) : monthStatus.status === 'PENDING_APPROVAL' ? (
                          <span
                            style={{
                              background: '#f59e0b',
                              color: '#000',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                            }}
                          >
                            Approval Pending
                          </span>
                        ) : monthStatus.status === 'NOT_INVOICED' ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Not Invoiced</span>
                        ) : (
                          <span
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                            }}
                          >
                            Pending Due
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {monthStatus.isPaid
                            ? `₹${Number(monthStatus.amount || 0).toLocaleString()} Paid (Approved)`
                            : monthStatus.bill
                            ? `Due: ₹${Number(monthStatus.amount || 0).toLocaleString()}`
                            : '—'}
                        </span>

                        {monthStatus.bill && !monthStatus.isPaid && monthStatus.status !== 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => handleOpenPaymentModal(monthStatus.bill)}
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
                            Pay Dues
                          </button>
                        )}
                        {monthStatus.bill && monthStatus.isPaid && (
                          <button
                            onClick={() => handleOpenReceiptModal(monthStatus.bill)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-card)',
                              color: 'var(--text-main)',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                            }}
                          >
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin View Switcher: Invoices Table | Home No List | Month-Wise List */}
          {isAdmin && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  View Mode:
                </span>
                <div
                  style={{
                    display: 'flex',
                    background: 'var(--bg-primary)',
                    borderRadius: '8px',
                    padding: '3px',
                    border: '1px solid var(--border-card)',
                    gap: '3px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('TABLE')}
                    style={{
                      background: viewMode === 'TABLE' ? 'var(--color-clay)' : 'transparent',
                      color: viewMode === 'TABLE' ? '#ffffff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      fontWeight: viewMode === 'TABLE' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileText size={14} />
                    <span>📑 Invoices Table</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('HOME_LIST')}
                    style={{
                      background: viewMode === 'HOME_LIST' ? 'var(--color-clay)' : 'transparent',
                      color: viewMode === 'HOME_LIST' ? '#ffffff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      fontWeight: viewMode === 'HOME_LIST' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Home size={14} />
                    <span>🏠 Home No List</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('MONTH_LIST')}
                    style={{
                      background: viewMode === 'MONTH_LIST' ? 'var(--color-clay)' : 'transparent',
                      color: viewMode === 'MONTH_LIST' ? '#ffffff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      fontWeight: viewMode === 'MONTH_LIST' ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <CalendarDays size={14} />
                    <span>📅 Month-Wise List</span>
                  </button>
                </div>
              </div>

              {/* Maintenance Cycle Selector Button for Admin */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Cycle:</span>
                <button
                  type="button"
                  id="btn-admin-maintenance-cycle"
                  onClick={() => {
                    setCycleForm(cycleRange);
                    setShowCycleModal(true);
                  }}
                  className="btn btn-outline"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(196, 154, 108, 0.12)',
                    borderColor: 'var(--color-clay)',
                    color: 'var(--color-clay)',
                    borderRadius: '20px',
                    cursor: 'pointer',
                  }}
                  title="Click to select start and end month cycle"
                >
                  <CalendarDays size={14} />
                  <span>{formatMonth(cycleRange.startMonth).short} to {formatMonth(cycleRange.endMonth).short}</span>
                  <Edit2 size={12} />
                </button>
              </div>
            </div>
          )}

          {/* VIEW 1: STANDARD INVOICES TABLE */}
          {(viewMode === 'TABLE' || !isAdmin) && (
            <>
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
                <option value="PENDING_APPROVAL">Pending Admin Approval</option>
                <option value="OVERDUE">Overdue</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid / Approved</option>
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
                          {b.status === 'PENDING_APPROVAL' || Number(b.pending_payments_count) > 0 ? (
                            <div>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 9px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(245, 158, 11, 0.35)',
                                }}
                              >
                                <ShieldCheck size={13} />
                                Pending Admin Approval
                              </span>
                              <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600, marginTop: '3px' }}>
                                ₹{Number(b.pending_payment_amount || b.paid_amount || b.total_amount).toLocaleString()} paid • Awaiting admin confirm
                              </div>
                            </div>
                          ) : b.status === 'PAID' ? (
                            <div>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 9px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                }}
                              >
                                <CheckCircle2 size={13} />
                                Done Payment
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981', fontSize: '0.72rem', fontWeight: 700, marginTop: '3px' }}>
                                <ShieldCheck size={12} />
                                Approved by Admin {b.approved_by_name ? `(${b.approved_by_name})` : ''}
                              </div>
                            </div>
                          ) : (
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
                                  b.status === 'OVERDUE'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : b.status === 'PARTIALLY_PAID'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(148, 163, 184, 0.15)',
                                color:
                                  b.status === 'OVERDUE'
                                    ? '#ef4444'
                                    : b.status === 'PARTIALLY_PAID'
                                    ? '#f59e0b'
                                    : '#94a3b8',
                              }}
                            >
                              {b.status}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            {isAdmin && (b.status === 'PENDING_APPROVAL' || Number(b.pending_payments_count) > 0) ? (
                              <button
                                onClick={() => handleOpenVerifyModal(b)}
                                title="Check payment details and confirm"
                                style={{
                                  background: '#f59e0b',
                                  color: '#000',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '5px 12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)',
                                }}
                              >
                                <ShieldCheck size={14} />
                                Check & Confirm
                              </button>
                            ) : !isAdmin && (b.status === 'PENDING_APPROVAL' || Number(b.pending_payments_count) > 0) ? (
                              <span
                                style={{
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  borderRadius: '4px',
                                  padding: '5px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Clock size={12} />
                                Awaiting Admin Approval
                              </span>
                            ) : !isPaid ? (
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
                            ) : (
                              <span
                                style={{
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <CheckCircle2 size={12} />
                                Done Payment
                              </span>
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
            </>
          )}

          {/* VIEW 2: HOME NO LIST */}
          {isAdmin && viewMode === 'HOME_LIST' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Home Search & Status Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 14px',
                    minWidth: '280px',
                    flex: 1,
                  }}
                >
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search home no (e.g. 1, 2) or resident name..."
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

                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Tracking payment status across <strong>{allHomes.length} Society Homes</strong>
                </div>
              </div>

              {/* Home Cards Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {allHomes
                  .filter((home) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      String(home.home_number || '').toLowerCase().includes(q) ||
                      String(home.resident_name || home.owner_name || '').toLowerCase().includes(q) ||
                      String(home.home_type || '').toLowerCase().includes(q)
                    );
                  })
                  .map((home) => {
                    const residentName = home.resident_name || home.owner_name || 'Resident';
                    const residentPhone = home.resident_phone || home.owner_phone || '';
                    const homeType = home.home_type || 'Unit';

                    // Compute overall stats for this home
                    const homeBills = bills.filter((b) => String(b.home_id) === String(home.id));
                    const totalInvoiced = homeBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
                    const totalPaid = homeBills.reduce((acc, b) => acc + Number(b.paid_amount || 0), 0);
                    const balanceDue = homeBills.reduce((acc, b) => acc + Number(b.balance_amount || 0), 0);

                    return (
                      <div
                        key={home.id}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-md)',
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}
                      >
                        {/* Header: Home Info & Summary Metrics */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            paddingBottom: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                background: 'var(--color-clay)',
                                color: '#ffffff',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontWeight: 800,
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <Home size={16} />
                              <span>Home {home.home_number}</span>
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                  {residentName}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                  }}
                                >
                                  {homeType}
                                </span>
                              </div>
                              {residentPhone && (
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Phone: {residentPhone}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Invoiced: </span>
                              <strong style={{ color: 'var(--text-main)' }}>₹{totalInvoiced.toLocaleString()}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Paid Done: </span>
                              <strong style={{ color: '#10b981' }}>₹{totalPaid.toLocaleString()}</strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>Due: </span>
                              <strong style={{ color: balanceDue > 0 ? '#ef4444' : '#10b981' }}>
                                ₹{balanceDue.toLocaleString()}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Month-Wise Payment Done Matrix for this Home */}
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Month-Wise Payment Track Record (Home {home.home_number})
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                              gap: '10px',
                            }}
                          >
                            {allBillingMonths.slice(0, 6).map((monthKey) => {
                              const monthStatus = getHomeMonthStatus(home.id, monthKey);
                              const fmt = formatMonth(monthKey);

                              return (
                                <div
                                  key={monthKey}
                                  style={{
                                    background: monthStatus.isPaid
                                      ? 'rgba(16, 185, 129, 0.08)'
                                      : monthStatus.status === 'PENDING_APPROVAL'
                                      ? 'rgba(245, 158, 11, 0.08)'
                                      : monthStatus.status === 'NOT_INVOICED'
                                      ? 'rgba(255, 255, 255, 0.02)'
                                      : 'rgba(239, 68, 68, 0.08)',
                                    border: monthStatus.isPaid
                                      ? '1px solid #10b981'
                                      : monthStatus.status === 'PENDING_APPROVAL'
                                      ? '1px solid #f59e0b'
                                      : monthStatus.status === 'NOT_INVOICED'
                                      ? '1px dashed var(--border-card)'
                                      : '1px solid rgba(239, 68, 68, 0.4)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '6px',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                      {fmt.short}
                                    </span>

                                    {monthStatus.isPaid ? (
                                      <span
                                        style={{
                                          background: '#10b981',
                                          color: '#ffffff',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontSize: '0.68rem',
                                          fontWeight: 800,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        <CheckCircle2 size={11} />
                                        Done Payment
                                      </span>
                                    ) : monthStatus.status === 'PENDING_APPROVAL' ? (
                                      <span
                                        style={{
                                          background: '#f59e0b',
                                          color: '#000',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontSize: '0.68rem',
                                          fontWeight: 800,
                                        }}
                                      >
                                        Check & Confirm
                                      </span>
                                    ) : monthStatus.status === 'NOT_INVOICED' ? (
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        Not Invoiced
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          background: 'rgba(239, 68, 68, 0.15)',
                                          color: '#ef4444',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontSize: '0.68rem',
                                          fontWeight: 800,
                                        }}
                                      >
                                        Pending Due
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', marginTop: '2px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {monthStatus.isPaid
                                        ? `₹${Number(monthStatus.amount || 0).toLocaleString()} (Approved)`
                                        : monthStatus.bill
                                        ? `₹${Number(monthStatus.amount || 0).toLocaleString()}`
                                        : '—'}
                                    </span>

                                    <div>
                                      {monthStatus.status === 'PENDING_APPROVAL' && monthStatus.bill && (
                                        <button
                                          onClick={() => handleOpenVerifyModal(monthStatus.bill)}
                                          style={{
                                            background: '#f59e0b',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '3px 8px',
                                            fontSize: '0.72rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Confirm
                                        </button>
                                      )}

                                      {monthStatus.bill && !monthStatus.isPaid && monthStatus.status !== 'PENDING_APPROVAL' && (
                                        <button
                                          onClick={() => handleOpenPaymentModal(monthStatus.bill)}
                                          style={{
                                            background: '#10b981',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '3px 8px',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Collect
                                        </button>
                                      )}

                                      {monthStatus.isPaid && monthStatus.bill && (
                                        <button
                                          onClick={() => handleOpenReceiptModal(monthStatus.bill)}
                                          style={{
                                            background: 'transparent',
                                            border: '1px solid var(--border-card)',
                                            color: 'var(--text-main)',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Receipt
                                        </button>
                                      )}

                                      {monthStatus.status === 'NOT_INVOICED' && (
                                        <button
                                          onClick={() => handleOpenGenerateModal()}
                                          style={{
                                            background: 'transparent',
                                            border: '1px solid rgba(196, 154, 108, 0.4)',
                                            color: 'var(--color-clay)',
                                            borderRadius: '4px',
                                            padding: '2px 6px',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          + Bill
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* VIEW 3: MONTH-WISE LIST */}
          {isAdmin && viewMode === 'MONTH_LIST' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Month Selector Chips */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMonthView('ALL')}
                  style={{
                    background: selectedMonthView === 'ALL' ? 'var(--color-clay)' : 'var(--bg-secondary)',
                    color: selectedMonthView === 'ALL' ? '#ffffff' : 'var(--text-muted)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: selectedMonthView === 'ALL' ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  All Months ({allBillingMonths.length})
                </button>

                {allBillingMonths.slice(0, 8).map((m) => {
                  const isSel = selectedMonthView === m;
                  const fmt = formatMonth(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMonthView(m)}
                      style={{
                        background: isSel ? 'var(--color-clay)' : 'var(--bg-secondary)',
                        color: isSel ? '#ffffff' : 'var(--text-muted)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmt.short}
                    </button>
                  );
                })}
              </div>

              {/* Month Sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {(selectedMonthView === 'ALL' ? allBillingMonths.slice(0, 6) : [selectedMonthView]).map((monthKey) => {
                  const fmt = formatMonth(monthKey);

                  // Calculate aggregate statistics for this month across all homes
                  let paidHomesCount = 0;
                  let pendingHomesCount = 0;
                  let totalMonthCollected = 0;
                  let totalMonthPending = 0;

                  allHomes.forEach((home) => {
                    const st = getHomeMonthStatus(home.id, monthKey);
                    if (st.isPaid) {
                      paidHomesCount++;
                      totalMonthCollected += Number(st.amount || 0);
                    } else if (st.status !== 'NOT_INVOICED') {
                      pendingHomesCount++;
                      totalMonthPending += Number(st.amount || 0);
                    }
                  });

                  return (
                    <div
                      key={monthKey}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Month Header Banner */}
                      <div
                        style={{
                          background: 'rgba(196, 154, 108, 0.08)',
                          borderBottom: '1px solid var(--border-card)',
                          padding: '14px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CalendarDays size={20} color="var(--color-clay)" />
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                              {fmt.long} ({fmt.short})
                            </h3>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              Maintenance Billing Cycle: {fmt.short}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem' }}>
                          <div style={{ background: 'var(--bg-primary)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Done Payment: </span>
                            <strong style={{ color: '#10b981' }}>{paidHomesCount} / {allHomes.length} Homes</strong>
                          </div>

                          <div style={{ background: 'var(--bg-primary)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Collected: </span>
                            <strong style={{ color: '#10b981' }}>₹{totalMonthCollected.toLocaleString()}</strong>
                          </div>

                          <div style={{ background: 'var(--bg-primary)', padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-card)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Pending Due: </span>
                            <strong style={{ color: totalMonthPending > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                              ₹{totalMonthPending.toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Homes Table for this Month */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Unit / Home #</th>
                              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Resident Info</th>
                              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Config</th>
                              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Invoice #</th>
                              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Month Fee</th>
                              <th style={{ padding: '12px 18px', fontWeight: 700 }}>Payment Status ({fmt.short})</th>
                              <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allHomes.map((home) => {
                              const monthStatus = getHomeMonthStatus(home.id, monthKey);
                              const b = monthStatus.bill;
                              const residentName = home.resident_name || home.owner_name || 'Resident';
                              const residentPhone = home.resident_phone || home.owner_phone || '';

                              return (
                                <tr
                                  key={home.id}
                                  style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                    background: monthStatus.isPaid ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                                  }}
                                >
                                  {/* Home Number */}
                                  <td style={{ padding: '12px 18px' }}>
                                    <span
                                      style={{
                                        background: 'rgba(196, 154, 108, 0.15)',
                                        color: 'var(--color-clay)',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontWeight: 800,
                                        fontSize: '0.85rem',
                                      }}
                                    >
                                      Home {home.home_number}
                                    </span>
                                  </td>

                                  {/* Resident Info */}
                                  <td style={{ padding: '12px 18px' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                      {residentName}
                                    </div>
                                    {residentPhone && (
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {residentPhone}
                                      </div>
                                    )}
                                  </td>

                                  {/* Config */}
                                  <td style={{ padding: '12px 18px' }}>
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: 'var(--text-muted)',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {home.home_type || '2BHK'}
                                    </span>
                                  </td>

                                  {/* Invoice # */}
                                  <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                    {b?.bill_number || '—'}
                                  </td>

                                  {/* Month Fee */}
                                  <td style={{ padding: '12px 18px' }}>
                                    <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                                      {b ? `₹${Number(b.total_amount).toLocaleString()}` : '—'}
                                    </span>
                                  </td>

                                  {/* Payment Status for Month */}
                                  <td style={{ padding: '12px 18px' }}>
                                    {monthStatus.isPaid ? (
                                      <div>
                                        <span
                                          style={{
                                            background: '#10b981',
                                            color: '#ffffff',
                                            padding: '3px 10px',
                                            borderRadius: '4px',
                                            fontSize: '0.74rem',
                                            fontWeight: 800,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <CheckCircle2 size={13} />
                                          Done Payment ({fmt.short})
                                        </span>
                                        <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                          <ShieldCheck size={12} />
                                          Approved by Admin
                                        </div>
                                      </div>
                                    ) : monthStatus.status === 'PENDING_APPROVAL' ? (
                                      <div>
                                        <span
                                          style={{
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            color: '#f59e0b',
                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                            padding: '3px 10px',
                                            borderRadius: '4px',
                                            fontSize: '0.74rem',
                                            fontWeight: 800,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <Clock size={12} />
                                          Awaiting Admin Approval
                                        </span>
                                      </div>
                                    ) : monthStatus.status === 'NOT_INVOICED' ? (
                                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                        Not Invoiced for {fmt.short}
                                      </span>
                                    ) : (
                                      <div>
                                        <span
                                          style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            color: '#ef4444',
                                            padding: '3px 10px',
                                            borderRadius: '4px',
                                            fontSize: '0.74rem',
                                            fontWeight: 800,
                                          }}
                                        >
                                          Pending Due: ₹{Number(monthStatus.amount || 0).toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                      {monthStatus.status === 'PENDING_APPROVAL' && b && (
                                        <button
                                          onClick={() => handleOpenVerifyModal(b)}
                                          style={{
                                            background: '#f59e0b',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 10px',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <ShieldCheck size={12} />
                                          Check & Confirm
                                        </button>
                                      )}

                                      {b && !monthStatus.isPaid && monthStatus.status !== 'PENDING_APPROVAL' && (
                                        <button
                                          onClick={() => handleOpenPaymentModal(b)}
                                          style={{
                                            background: '#10b981',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 10px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Collect
                                        </button>
                                      )}

                                      {monthStatus.isPaid && b && (
                                        <button
                                          onClick={() => handleOpenReceiptModal(b)}
                                          style={{
                                            background: 'transparent',
                                            border: '1px solid var(--border-card)',
                                            color: 'var(--text-main)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                          }}
                                        >
                                          <Printer size={12} />
                                          <span>Receipt</span>
                                        </button>
                                      )}

                                      {monthStatus.status === 'NOT_INVOICED' && (
                                        <button
                                          onClick={() => handleOpenGenerateModal()}
                                          style={{
                                            background: 'rgba(196, 154, 108, 0.15)',
                                            color: 'var(--color-clay)',
                                            border: '1px solid rgba(196, 154, 108, 0.3)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          + Generate
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Status & Approval</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Date & Time</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Action</th>
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
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.resident_name || 'Resident'}</div>
                      {p.resident_role && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {p.resident_role.toLowerCase().replace('_', ' ')}
                        </div>
                      )}
                    </td>
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
                    <td style={{ padding: '14px 16px' }}>
                      {p.status === 'PENDING_APPROVAL' ? (
                        <div>
                          <span
                            style={{
                              background: 'rgba(245, 158, 11, 0.12)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ShieldCheck size={12} />
                            Pending Admin Approval
                          </span>
                        </div>
                      ) : p.status === 'REJECTED' ? (
                        <div>
                          <span
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <XCircle size={12} />
                            Rejected
                          </span>
                          {p.rejection_reason && (
                            <div style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '2px' }}>
                              {p.rejection_reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <span
                            style={{
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            Approved by Admin
                          </span>
                          <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
                            Done Payment {p.approved_by_name ? `• ${p.approved_by_name}` : ''}
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(p.payment_date).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {isAdmin && p.status === 'PENDING_APPROVAL' ? (
                        <button
                          onClick={() => handleOpenVerifyModal(p)}
                          style={{
                            background: '#f59e0b',
                            color: '#000',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          <ShieldCheck size={13} />
                          Check & Confirm
                        </button>
                      ) : p.status === 'APPROVED' ? (
                        <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>
                          ✓ Done Payment
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
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
              Select a specific plan below to generate bills with that exact amount, or choose Auto-Match to bill each home according to its BHK setup.
            </div>

            <form onSubmit={handleGenerateInvoices} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Plan Selection Cards */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Select Maintenance Plan & Amount
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '210px', overflowY: 'auto', paddingRight: '4px' }}>
                  {/* Option 1: Auto Match */}
                  <div
                    onClick={() => {
                      setGenerateFormData((prev) => ({
                        ...prev,
                        plan_id: 'AUTO',
                      }));
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: generateFormData.plan_id === 'AUTO' ? '2px solid var(--color-clay)' : '1px solid var(--border-card)',
                      background: generateFormData.plan_id === 'AUTO' ? 'rgba(196, 154, 108, 0.12)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✨ Auto-Match by BHK / Home Config</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Matches each home (1BHK, 2BHK, 3BHK) with its configured plan
                      </div>
                    </div>
                    {generateFormData.plan_id === 'AUTO' && (
                      <div style={{ background: 'var(--color-clay)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={13} />
                      </div>
                    )}
                  </div>

                  {/* Specific Society Plans */}
                  {plans.map((p, idx) => {
                    const isSelected = String(generateFormData.plan_id) === String(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          const cycle = p.billing_cycle || 'MONTHLY';
                          setGenerateFormData((prev) => ({
                            ...prev,
                            plan_id: p.id,
                            billing_cycle: cycle,
                            billing_period: getCurrentPeriod(cycle),
                          }));
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid var(--color-clay)' : '1px solid var(--border-card)',
                          background: isSelected ? 'rgba(196, 154, 108, 0.12)' : 'var(--bg-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Plan {idx + 1}: {p.name}</span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: p.billing_cycle === 'QUARTERLY' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(196, 154, 108, 0.15)',
                                color: p.billing_cycle === 'QUARTERLY' ? '#3b82f6' : 'var(--color-clay)',
                                fontWeight: 800,
                              }}
                            >
                              {p.billing_cycle}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Amount: <strong style={{ color: '#10b981' }}>₹{Number(p.amount).toLocaleString()}</strong> • Config: {p.applicable_type} • Grace: {p.grace_period_days || 5}d (Late Penalty: {p.penalty_type === 'PERCENT' ? `${p.penalty_rate}%` : `₹${p.penalty_rate}`})
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            ₹{Number(p.amount).toLocaleString()}
                          </span>
                          {isSelected && (
                            <div style={{ background: 'var(--color-clay)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={13} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {generateFormData.plan_id !== 'AUTO' && (
                  <div
                    style={{
                      marginTop: '8px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>
                      Selected Plan Amount: <strong>₹{Number(plans.find((p) => String(p.id) === String(generateFormData.plan_id))?.amount || 0).toLocaleString()}</strong> ({generateFormData.billing_cycle}). All generated invoices will carry this amount.
                    </span>
                  </div>
                )}
              </div>

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

            {!isAdmin && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Approval Workflow:</strong> Once you confirm payment, your submission will be reviewed and verified by the society admin. After admin confirmation, both sides will show <strong>"Approved by Admin"</strong> and <strong>"Done Payment"</strong>.
                </span>
              </div>
            )}

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
                          : selectedBillForReceipt.status === 'PENDING_APPROVAL'
                          ? '#fef3c7'
                          : selectedBillForReceipt.status === 'OVERDUE'
                          ? '#fee2e2'
                          : '#fef3c7',
                      color:
                        selectedBillForReceipt.status === 'PAID'
                          ? '#15803d'
                          : selectedBillForReceipt.status === 'PENDING_APPROVAL'
                          ? '#b45309'
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
                      ? `✓ Done Payment • Approved by Admin`
                      : selectedBillForReceipt.status === 'PENDING_APPROVAL'
                      ? `⏳ Pending Admin Approval`
                      : selectedBillForReceipt.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Approval / Verification Banner */}
            {selectedBillForReceipt.status === 'PAID' && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #22c55e',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={28} color="#15803d" />
                  <div>
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9rem' }}>
                      DONE PAYMENT • APPROVED BY ADMIN
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Verified and approved by {selectedBillForReceipt.approved_by_name || 'Society Admin'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '3px 8px', borderRadius: '4px' }}>
                    OFFICIALLY CONFIRMED
                  </span>
                </div>
              </div>
            )}

            {selectedBillForReceipt.status === 'PENDING_APPROVAL' && (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1.5px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Clock size={28} color="#b45309" />
                <div>
                  <div style={{ fontWeight: 800, color: '#b45309', fontSize: '0.9rem' }}>
                    PAYMENT RECORDED • AWAITING ADMIN CONFIRMATION
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Payment has been submitted by resident and will be marked as "Done Payment & Approved by Admin" once verified.
                  </div>
                </div>
              </div>
            )}

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

      {/* =====================================================================
          MODAL: ADMIN CHECK & CONFIRM PAYMENT
          ===================================================================== */}
      {showVerifyModal && selectedPaymentForVerify && (
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
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-card)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={22} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                  Check & Confirm Payment
                </h3>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Instruction Notice */}
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Please review the resident's payment details and verify that the funds have been received in the society bank account. Confirming will mark the bill as <strong>"Done Payment"</strong> and <strong>"Approved by Admin"</strong> for both resident and admin.
            </p>

            {/* Payment Details Card */}
            <div
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-card)',
                borderRadius: '8px',
                padding: '14px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                fontSize: '0.84rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Receipt # / Reference:</span>
                <div style={{ fontWeight: 700, color: 'var(--color-clay)' }}>
                  {selectedPaymentForVerify.receipt_number || (selectedPaymentForVerify.latest_receipt_number ? selectedPaymentForVerify.latest_receipt_number : `#PAY-${selectedPaymentForVerify.pending_payment_id || selectedPaymentForVerify.id || 'NEW'}`)}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Invoice #:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedPaymentForVerify.bill_number}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Unit / Home:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedPaymentForVerify.home_number} {selectedPaymentForVerify.home_type ? `(${selectedPaymentForVerify.home_type})` : ''}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Resident:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedPaymentForVerify.resident_name || 'Resident'}
                </div>
                {selectedPaymentForVerify.resident_phone && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {selectedPaymentForVerify.resident_phone}
                  </div>
                )}
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Amount Received:</span>
                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.15rem' }}>
                  ₹{Number(selectedPaymentForVerify.amount || selectedPaymentForVerify.pending_payment_amount || selectedPaymentForVerify.paid_amount || selectedPaymentForVerify.total_amount).toLocaleString()}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Payment Mode:</span>
                <div>
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
                    {selectedPaymentForVerify.payment_method || selectedPaymentForVerify.pending_payment_method || 'Online'}
                  </span>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Transaction Ref / UTR / Cheque No:</span>
                <div
                  style={{
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    background: 'var(--bg-primary)',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    marginTop: '3px',
                    fontFamily: 'monospace',
                    fontSize: '0.88rem',
                    wordBreak: 'break-all',
                    border: '1px solid var(--border-card)',
                  }}
                >
                  {selectedPaymentForVerify.transaction_reference || selectedPaymentForVerify.pending_payment_ref || 'Not Provided / Direct'}
                </div>
              </div>

              {selectedPaymentForVerify.remarks && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Resident Remarks:</span>
                  <div style={{ color: 'var(--text-main)', fontStyle: 'italic', marginTop: '2px' }}>
                    "{selectedPaymentForVerify.remarks}"
                  </div>
                </div>
              )}
            </div>

            {/* Admin Remarks Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Admin Verification Remarks / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Bank statement verified, UTR matched, Cheque cleared"
                value={verifyRemarks}
                onChange={(e) => setVerifyRemarks(e.target.value)}
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

            {/* Rejection Section if expanding */}
            {isRejecting && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ef4444' }}>
                  Rejection Reason *
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR not found in bank statement, amount mismatch"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              {!isRejecting ? (
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <XCircle size={14} />
                  Reject Payment
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setIsRejecting(false); setRejectReason(''); }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-muted)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectPayment()}
                    disabled={actionLoading || !rejectReason.trim()}
                    style={{
                      background: '#ef4444',
                      border: 'none',
                      color: '#fff',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
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
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleApprovePayment()}
                  disabled={actionLoading}
                  style={{
                    background: '#10b981',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 20px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <ShieldCheck size={16} />
                  {actionLoading ? 'Confirming...' : 'Check & Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------------ */}
      {/* MODAL: PAY MAINTENANCE (ALL PLANS / NEXT MONTH SELECTION)          */}
      {/* ------------------------------------------------------------------ */}
      {showPayMaintenanceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '28px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              border: '1px solid var(--border-card)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={22} color="#10b981" />
                  <span>Pay Maintenance</span>
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                  {myHomeNumber ? `Unit / Home: ${myHomeNumber} • ` : ''}Select any plan below to make payment for current dues or advance months.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPayMaintenanceModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {residentAvailablePlans.map((plan) => {
                const isQuarterly = plan.billing_cycle === 'QUARTERLY';
                const nextInfo = getNextUnpaidPeriodForPlan(plan);

                return (
                  <div
                    key={plan.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1.5px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                            {plan.name}
                          </span>
                          <span
                            style={{
                              background: isQuarterly ? 'rgba(59, 130, 246, 0.15)' : 'rgba(196, 154, 108, 0.15)',
                              color: isQuarterly ? '#3b82f6' : 'var(--color-clay)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                            }}
                          >
                            {isQuarterly ? 'Quarterly (3 Months)' : 'Monthly'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {plan.description || (isQuarterly ? 'Covers 3 full months of society maintenance dues' : 'Covers 1 calendar month')}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)' }}>
                          ₹{Number(plan.amount).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Target Cycle Info Banner */}
                    <div
                      style={{
                        background: nextInfo.isAdvance ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        border: `1px solid ${nextInfo.isAdvance ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span style={{ color: nextInfo.isAdvance ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                          {nextInfo.isAdvance ? '✓ Current Month Done' : 'Due Period'}:
                        </span>{' '}
                        <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                          Will Pay for: {nextInfo.desc}
                        </span>
                      </div>
                      {nextInfo.isAdvance && (
                        <span
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          Next Cycle
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPayMaintenanceModal(false);
                        handleSelectPlan(plan, nextInfo.period);
                      }}
                      disabled={actionLoading}
                      style={{
                        background: 'var(--color-clay)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 16px',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '4px',
                      }}
                    >
                      <CreditCard size={15} />
                      <span>Proceed & Pay ₹{Number(plan.amount).toLocaleString()} for {nextInfo.desc}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: ADMIN MAINTENANCE CYCLE SELECTOR (START TO END MONTH/YEAR)  */}
      {/* ------------------------------------------------------------------ */}
      {showCycleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              border: '1px solid var(--border-card)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarDays size={20} color="var(--color-clay)" />
                  <span>Maintenance Month Cycle</span>
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Set the start and end month cycle. Only months in this range will be tracked and displayed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCycleModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (cycleForm.startMonth > cycleForm.endMonth) {
                  showError('Start month cannot be after end month');
                  return;
                }
                setCycleRange(cycleForm);
                localStorage.setItem(`myvms_maint_cycle`, JSON.stringify(cycleForm));
                setShowCycleModal(false);
                showToast(`Cycle set: ${formatMonth(cycleForm.startMonth).short} to ${formatMonth(cycleForm.endMonth).short}`);
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="input-group">
                  <label className="input-label">Start Month & Year *</label>
                  <input
                    type="month"
                    required
                    className="input-field"
                    value={cycleForm.startMonth}
                    onChange={(e) => setCycleForm({ ...cycleForm, startMonth: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">End Month & Year *</label>
                  <input
                    type="month"
                    required
                    className="input-field"
                    value={cycleForm.endMonth}
                    onChange={(e) => setCycleForm({ ...cycleForm, endMonth: e.target.value })}
                  />
                </div>
              </div>

              {/* Quick Cycle Presets */}
              <div style={{ marginBottom: '18px' }}>
                <label className="input-label" style={{ marginBottom: '6px' }}>Quick Presets:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const y = today.getFullYear();
                      const m = String(today.getMonth() + 1).padStart(2, '0');
                      const endD = new Date(y, today.getMonth() + 2, 1);
                      setCycleForm({
                        startMonth: `${y}-${m}`,
                        endMonth: `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}`,
                      });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '16px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                    }}
                  >
                    Current Quarter (3 Mos)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const y = today.getFullYear();
                      const m = String(today.getMonth() + 1).padStart(2, '0');
                      const endD = new Date(y, today.getMonth() + 5, 1);
                      setCycleForm({
                        startMonth: `${y}-${m}`,
                        endMonth: `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}`,
                      });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '16px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                    }}
                  >
                    Half Yearly (6 Mos)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const y = today.getFullYear();
                      const m = String(today.getMonth() + 1).padStart(2, '0');
                      const endD = new Date(y, today.getMonth() + 11, 1);
                      setCycleForm({
                        startMonth: `${y}-${m}`,
                        endMonth: `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}`,
                      });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '16px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                    }}
                  >
                    Annual (12 Mos)
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: '#10b981',
                  marginBottom: '16px',
                }}
              >
                💡 Only months from <strong>{formatMonth(cycleForm.startMonth).short}</strong> to <strong>{formatMonth(cycleForm.endMonth).short}</strong> will be displayed. Past months like Aug-2026 or Sep-2026 will not be shown.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCycleModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Apply Cycle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
