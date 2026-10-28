import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
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
  Download,
  FileSpreadsheet,
  Table,
  Pencil,
  RefreshCw,
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
  const myHomeNumber = user?.flatNumber || user?.unitNumber || user?.home_number || user?.homeNumber || '';

  // Tab State: 'bills' | 'plans' | 'payments'
  const [activeTab, setActiveTab] = useState('bills');

  // View Mode for Bills Tab: 'TABLE' | 'HOME_LIST'
  const [viewMode, setViewMode] = useState('TABLE');
  const [billsSubTab, setBillsSubTab] = useState('INVOICES'); // 'INVOICES' | 'MONTHLY_PAYMENT'
  const [societyHomes, setSocietyHomes] = useState([]);
  const [residentCycleFilter, setResidentCycleFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'UNPAID'
  const [matrixCycleFilter, setMatrixCycleFilter] = useState('ALL'); // 'ALL' | cycleId

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
      } catch (e) { }
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
  const [cycles, setCycles] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [selectedCycleId, setSelectedCycleId] = useState('ALL');
  const [editingCycle, setEditingCycle] = useState(null);
  const [newCycleForm, setNewCycleForm] = useState({
    name: '',
    start_month: '',
    end_month: '',
  });
  const [cycleActionLoading, setCycleActionLoading] = useState(false);

  function getMonthsBetween(startMonth, endMonth) {
    if (!startMonth || !endMonth) return [];
    const [sY, sM] = String(startMonth).split('-').map(Number);
    const [eY, eM] = String(endMonth).split('-').map(Number);
    const result = [];
    let curY = sY;
    let curM = sM;
    while (curY < eY || (curY === eY && curM <= eM)) {
      result.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return result;
  }

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
      // If billing cycle is QUARTERLY and period is a start-month (YYYY-MM),
      // treat as a rolling 3-month window starting from that month.
      if (cycle === 'QUARTERLY') {
        const startY = parseInt(mMatch[1], 10);
        const startM = parseInt(mMatch[2], 10);
        const months = [];
        for (let i = 0; i < 3; i++) {
          let nm = startM + i;
          let ny = startY;
          if (nm > 12) { nm -= 12; ny++; }
          months.push(`${ny}-${String(nm).padStart(2, '0')}`);
        }
        return months;
      }
      if (cycle === 'HALF_YEARLY') {
        const startY = parseInt(mMatch[1], 10);
        const startM = parseInt(mMatch[2], 10);
        const months = [];
        for (let i = 0; i < 6; i++) {
          let nm = startM + i;
          let ny = startY;
          if (nm > 12) { nm -= 12; ny++; }
          months.push(`${ny}-${String(nm).padStart(2, '0')}`);
        }
        return months;
      }
      if (cycle === 'YEARLY') {
        const startY = parseInt(mMatch[1], 10);
        const startM = parseInt(mMatch[2], 10);
        const months = [];
        for (let i = 0; i < 12; i++) {
          let nm = startM + i;
          let ny = startY;
          if (nm > 12) { nm -= 12; ny++; }
          months.push(`${ny}-${String(nm).padStart(2, '0')}`);
        }
        return months;
      }
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
      const [statsRes, plansRes, billsRes, paymentsRes, homesRes, cyclesRes, activeCycleRes] = await Promise.all([
        maintenanceApi.getStats({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getPlans({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getBills({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getPayments({ society_id: selectedSocietyId }).catch(() => ({})),
        societyApi.getHomesBySociety(selectedSocietyId).catch(() => ({})),
        maintenanceApi.getCycles({ society_id: selectedSocietyId }).catch(() => ({})),
        maintenanceApi.getActiveCycle({ society_id: selectedSocietyId }).catch(() => ({})),
      ]);

      setStats(statsRes.data?.stats || null);
      setPlans(plansRes.data?.plans || []);
      setBills(billsRes.data?.bills || []);
      setPayments(paymentsRes.data?.payments || []);
      const rawHomes = homesRes?.data?.homes || homesRes?.homes || homesRes?.data || [];
      setSocietyHomes(Array.isArray(rawHomes) ? rawHomes : []);

      const cycleList = cyclesRes.data?.cycles || [];
      setCycles(cycleList);
      const actCycle = activeCycleRes.data?.cycle || null;
      setActiveCycle(actCycle);
      if (actCycle && actCycle.start_month && actCycle.end_month) {
        setCycleRange({
          startMonth: actCycle.start_month,
          endMonth: actCycle.end_month,
        });
        setCycleForm({
          startMonth: actCycle.start_month,
          endMonth: actCycle.end_month,
        });
      }
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

  // Format month for Excel spreadsheet row-column headers: e.g. "2026-10" -> "Oct-26", "2027-01" -> "Jan-27"
  const formatMonthExcel = (monthStr) => {
    if (!monthStr) return '';
    const match = String(monthStr).match(/(\d{4})-(\d{1,2})/);
    if (!match) return monthStr;
    const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(match[2], 10) - 1;
    const yy = match[1].slice(-2);
    return `${shortNames[mIdx] || match[2]}-${yy}`;
  };

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

  // All billing months tracked in system across created cycles (both active and inactive)
  const allBillingMonths = useMemo(() => {
    const list = new Set();

    // 1. Include all months defined across any created cycle
    if (Array.isArray(cycles) && cycles.length > 0) {
      cycles.forEach((c) => {
        if (c.start_month && c.end_month) {
          const cMonths = getMonthsBetween(c.start_month, c.end_month);
          cMonths.forEach((m) => list.add(m));
        }
      });
    } else if (cycleRange.startMonth && cycleRange.endMonth) {
      const defMonths = getMonthsBetween(cycleRange.startMonth, cycleRange.endMonth);
      defMonths.forEach((m) => list.add(m));
    }

    // 2. Also include any months that actually have bills
    bills.forEach((b) => {
      if (b.billing_period && /^\d{4}-\d{2}$/.test(b.billing_period)) {
        list.add(b.billing_period);
      }
      const cov = getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle);
      cov.forEach((m) => list.add(m));
    });

    return Array.from(list).sort();
  }, [cycles, cycleRange, bills]);

  // Helper to check which cycle a month belongs to (all configured cycles are valid and payable)
  const getMonthCycleInfo = (monthKey) => {
    if (!monthKey) {
      return { cycle: null, cycleId: null, cycleName: 'Out of Cycle' };
    }
    const matchingCycle = Array.isArray(cycles)
      ? cycles.find((c) => c.start_month && c.end_month && monthKey >= c.start_month && monthKey <= c.end_month)
      : null;

    return {
      cycle: matchingCycle || null,
      cycleId: matchingCycle?.id || null,
      cycleName: matchingCycle ? matchingCycle.name : 'Out of Cycle',
    };
  };

  // Helper to get payment status of a specific home for a given month (e.g. "2026-11")
  const getHomeMonthStatus = (homeId, monthKey) => {
    const bill = bills.find((b) => {
      if (String(b.home_id) !== String(homeId)) return false;
      if (b.billing_period === monthKey) return true;
      const covered = getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle);
      return covered.includes(monthKey);
    });

    const cycleInfo = getMonthCycleInfo(monthKey);

    if (!bill) {
      return {
        status: 'NOT_INVOICED',
        label: 'Not Invoiced',
        isPaid: false,
        bill: null,
        cycle: cycleInfo.cycle,
        cycleId: cycleInfo.cycleId,
        cycleName: cycleInfo.cycleName,
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
        cycle: cycleInfo.cycle,
        cycleId: cycleInfo.cycleId,
        cycleName: cycleInfo.cycleName,
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
        cycle: cycleInfo.cycle,
        cycleId: cycleInfo.cycleId,
        cycleName: cycleInfo.cycleName,
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
      cycle: cycleInfo.cycle,
      cycleId: cycleInfo.cycleId,
      cycleName: cycleInfo.cycleName,
    };
  };

  // Helper to get consolidated payment periods for a home.
  // Multi-month (quarterly) bills are expanded into one card PER month,
  // each tagged with billGroupId so they can be rendered as a grouped block.
  const getHomePaymentPeriods = (targetHomeId) => {
    if (!targetHomeId) return [];
    const homeBills = bills.filter((b) => String(b.home_id) === String(targetHomeId));
    const periods = [];
    const handledMonths = new Set();

    // 1. Expand multi-month bills into per-month cards
    const multiMonthBills = homeBills.filter(
      (b) => ['QUARTERLY', 'HALF_YEARLY', 'YEARLY'].includes(b.billing_cycle) ||
        (getCoveredMonthsForPeriod(b.billing_period, b.billing_cycle).length > 1)
    );

    multiMonthBills.forEach((qBill) => {
      const covered = getCoveredMonthsForPeriod(qBill.billing_period, qBill.billing_cycle);
      if (covered.length === 0) return;
      covered.forEach((m) => handledMonths.add(m));

      const isPaid = qBill.status === 'PAID';
      const isPendingApproval = qBill.status === 'PENDING_APPROVAL' || Number(qBill.pending_payments_count) > 0;
      const status = isPaid ? 'PAID' : isPendingApproval ? 'PENDING_APPROVAL' : (qBill.status || 'PENDING');

      covered.forEach((m, idx) => {
        const fmt = formatMonth(m);
        const cycleInfo = getMonthCycleInfo(m);
        const isPrimary = idx === 0; // first month carries the full amount
        periods.push({
          key: `bill-${qBill.id}-${m}`,
          sortKey: m,
          isMultiMonth: true,
          isPrimary,
          billGroupId: `bill-${qBill.id}`,
          groupSize: covered.length,
          groupIndex: idx,
          billing_cycle: qBill.billing_cycle,
          title: fmt.short,
          coveredMonths: covered,
          amount: isPrimary ? Number(qBill.paid_amount || qBill.total_amount) : 0,
          balanceAmount: isPrimary ? Number(qBill.balance_amount || qBill.total_amount) : 0,
          isPaid,
          status,
          label: isPaid ? 'Done Payment' : isPendingApproval ? 'Approval Pending' : (qBill.status === 'OVERDUE' ? 'Overdue' : 'Pending Due'),
          bill: qBill,
          cycle: cycleInfo.cycle,
          cycleId: cycleInfo.cycleId,
          cycleName: cycleInfo.cycleName,
        });
      });
    });

    // 2. Process remaining individual months
    allBillingMonths.forEach((m) => {
      if (handledMonths.has(m)) return;
      handledMonths.add(m);

      const mBill = homeBills.find((b) => b.billing_period === m);
      const fmt = formatMonth(m);
      const cycleInfo = getMonthCycleInfo(m);

      if (mBill) {
        const isPaid = mBill.status === 'PAID';
        const isPendingApproval = mBill.status === 'PENDING_APPROVAL' || Number(mBill.pending_payments_count) > 0;
        periods.push({
          key: `bill-${mBill.id}`,
          sortKey: m,
          isMultiMonth: false,
          isPrimary: true,
          billGroupId: `bill-${mBill.id}`,
          groupSize: 1,
          groupIndex: 0,
          billing_cycle: mBill.billing_cycle || 'MONTHLY',
          title: fmt.short,
          coveredMonths: [m],
          amount: Number(mBill.paid_amount || mBill.total_amount),
          balanceAmount: Number(mBill.balance_amount || mBill.total_amount),
          isPaid,
          status: isPaid ? 'PAID' : isPendingApproval ? 'PENDING_APPROVAL' : (mBill.status || 'PENDING'),
          label: isPaid ? 'Done Payment' : isPendingApproval ? 'Approval Pending' : (mBill.status === 'OVERDUE' ? 'Overdue' : 'Pending Due'),
          bill: mBill,
          cycle: cycleInfo.cycle,
          cycleId: cycleInfo.cycleId,
          cycleName: cycleInfo.cycleName,
        });
      } else {
        const sampleBill = homeBills.find((b) => Number(b.base_amount || b.total_amount) > 0);
        const samplePlan = plans.find((p) => p.billing_cycle === 'MONTHLY' && Number(p.base_amount) > 0);
        const estimatedMonthFee = sampleBill ? Number(sampleBill.base_amount || sampleBill.total_amount) : (samplePlan ? Number(samplePlan.base_amount) : 0);

        periods.push({
          key: `month-${m}`,
          sortKey: m,
          isMultiMonth: false,
          isPrimary: true,
          billGroupId: `month-${m}`,
          groupSize: 1,
          groupIndex: 0,
          billing_cycle: 'MONTHLY',
          title: fmt.short,
          coveredMonths: [m],
          amount: estimatedMonthFee,
          balanceAmount: estimatedMonthFee,
          isPaid: false,
          status: 'LEFT_TO_PAY',
          label: 'Left to Pay',
          bill: null,
          cycle: cycleInfo.cycle,
          cycleId: cycleInfo.cycleId,
          cycleName: cycleInfo.cycleName,
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
          (user?.homeId && Number(b.home_id) === Number(user.homeId)) ||
          (user?.home_id && Number(b.home_id) === Number(user.home_id)) ||
          (myHomeNumber && String(b.home_number).trim().toLowerCase() === String(myHomeNumber).trim().toLowerCase()) ||
          (user?.id && Number(b.resident_id) === Number(user.id)) ||
          (user?.phone && b.resident_phone && String(b.resident_phone).trim() === String(user.phone).trim());
        if (!isMyHome) {
          if (!isAdmin) {
            const distinctHomes = new Set(bills.map((x) => x.home_id).filter(Boolean));
            if (distinctHomes.size !== 1) return false;
          } else {
            return false;
          }
        }
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
          (user?.homeId && Number(p.home_id) === Number(user.homeId)) ||
          (user?.home_id && Number(p.home_id) === Number(user.home_id)) ||
          (myHomeNumber && String(p.home_number).trim().toLowerCase() === String(myHomeNumber).trim().toLowerCase()) ||
          (user?.id && Number(p.paid_by_user_id || p.resident_id) === Number(user.id)) ||
          (user?.phone && p.resident_phone && String(p.resident_phone).trim() === String(user.phone).trim());
        if (!isMyPayment) {
          if (!isAdmin) {
            const distinctHomes = new Set(payments.map((x) => x.home_id).filter(Boolean));
            if (distinctHomes.size !== 1) return false;
          } else {
            return false;
          }
        }
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
    const userRole = (user?.role || '').toUpperCase();
    const roleNormalized = (userRole === 'OWNER' || userRole === 'FAMILY_MEMBER') ? 'OWNER' : (userRole === 'TENANT' ? 'TENANT' : 'BOTH');
    return plans.filter((p) => {
      const matchRole = p.resident_type === 'BOTH' || p.resident_type === roleNormalized;
      return matchRole && p.status === 'ACTIVE';
    });
  }, [isAdmin, user, plans]);

  // Helper to determine the next unpaid period for a given plan (advance billing & active cycle boundary)
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

    const planDuration =
      plan.billing_cycle === 'YEARLY'
        ? 12
        : plan.billing_cycle === 'HALF_YEARLY'
          ? 6
          : plan.billing_cycle === 'QUARTERLY'
            ? 3
            : 1;

    // ACTIVE CYCLE ENFORCEMENT
    if (activeCycle && activeCycle.start_month && activeCycle.end_month) {
      const cycleMonths = getMonthsBetween(activeCycle.start_month, activeCycle.end_month);
      const unpaidCycleMonths = cycleMonths.filter((m) => !paidMonthsSet.has(m));

      if (unpaidCycleMonths.length === 0) {
        return {
          isEligible: false,
          isAllPaid: true,
          period: null,
          rollingMonths: [],
          desc: 'Active Cycle Fully Paid',
          disabledReason: `All months in active cycle "${activeCycle.name}" (${formatMonth(activeCycle.start_month).short} to ${formatMonth(activeCycle.end_month).short}) are already fully paid!`,
        };
      }

      // Rule: Plan duration cannot exceed remaining unpaid months
      if (planDuration > unpaidCycleMonths.length) {
        return {
          isEligible: false,
          isAllPaid: false,
          period: unpaidCycleMonths[0],
          rollingMonths: [],
          desc: `${unpaidCycleMonths.length} month(s) left in cycle`,
          disabledReason: `Cannot select ${plan.name} (${planDuration} months): Only ${unpaidCycleMonths.length} unpaid month(s) remain in active cycle "${activeCycle.name}" (${formatMonth(activeCycle.start_month).short} to ${formatMonth(activeCycle.end_month).short}).`,
        };
      }

      // Rule: Remaining unpaid months must divide cleanly by plan duration
      if (unpaidCycleMonths.length % planDuration !== 0) {
        return {
          isEligible: false,
          isAllPaid: false,
          period: unpaidCycleMonths[0],
          rollingMonths: [],
          desc: `${unpaidCycleMonths.length} month(s) left in cycle`,
          disabledReason: `Cannot select ${plan.name} (${planDuration} months): ${unpaidCycleMonths.length} unpaid month(s) remaining in active cycle "${activeCycle.name}" cannot be divided into ${planDuration}-month periods. Please use the Monthly plan.`,
        };
      }

      // Eligible: take the next planDuration months from unpaidCycleMonths
      const targetStartMonth = unpaidCycleMonths[0];
      const rollingMonths = unpaidCycleMonths.slice(0, planDuration);

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const yearGroups = {};
      rollingMonths.forEach((ms) => {
        const [y, m] = ms.split('-');
        if (!yearGroups[y]) yearGroups[y] = [];
        yearGroups[y].push(monthNames[parseInt(m, 10) - 1]);
      });
      const desc = Object.entries(yearGroups)
        .map(([y, mns]) => `${mns.join(', ')} ${y}`)
        .join(' & ');

      const isAdvance = targetStartMonth !== `${curYear}-${String(curMonth).padStart(2, '0')}`;
      return {
        isEligible: true,
        isAllPaid: false,
        period: targetStartMonth,
        rollingMonths,
        isAdvance,
        desc,
      };
    }

    // Fallback if no active cycle configured in backend
    if (plan.billing_cycle === 'QUARTERLY') {
      let mNum = curMonth;
      let mYear = curYear;
      while (true) {
        const mStr = `${mYear}-${String(mNum).padStart(2, '0')}`;
        if (!paidMonthsSet.has(mStr)) {
          const rollingMonths = [];
          for (let i = 0; i < 3; i++) {
            let nm = mNum + i;
            let ny = mYear;
            if (nm > 12) { nm -= 12; ny++; }
            rollingMonths.push(`${ny}-${String(nm).padStart(2, '0')}`);
          }
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
          ];
          const yearGroups = {};
          rollingMonths.forEach((ms) => {
            const [y, m] = ms.split('-');
            if (!yearGroups[y]) yearGroups[y] = [];
            yearGroups[y].push(monthNames[parseInt(m, 10) - 1]);
          });
          const desc = Object.entries(yearGroups)
            .map(([y, mns]) => `${mns.join(', ')} ${y}`)
            .join(' & ');
          const isAdvance = mNum !== curMonth || mYear !== curYear;
          return {
            isEligible: true,
            isAllPaid: false,
            period: mStr,
            rollingMonths,
            isAdvance,
            desc,
          };
        }
        mNum++;
        if (mNum > 12) { mNum = 1; mYear++; }
      }
    }

    let mNum = curMonth;
    let mYear = curYear;
    while (true) {
      const mStr = `${mYear}-${String(mNum).padStart(2, '0')}`;
      if (!paidMonthsSet.has(mStr)) {
        const isAdvance = mNum !== curMonth || mYear !== curYear;
        return {
          isEligible: true,
          isAllPaid: false,
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

  // Cycle Management Handlers (Admin can create upcoming cycles or modify existing cycles)
  const handleOpenCreateCycleModal = () => {
    setEditingCycle(null);
    const sortedCycles = Array.isArray(cycles) && cycles.length > 0
      ? [...cycles].sort((a, b) => (a.end_month || '').localeCompare(b.end_month || ''))
      : [];
    const latestCycle = sortedCycles.length > 0 ? sortedCycles[sortedCycles.length - 1] : null;

    let nextStart = '';
    if (latestCycle && latestCycle.end_month) {
      const [y, m] = latestCycle.end_month.split('-').map(Number);
      let nm = m + 1;
      let ny = y;
      if (nm > 12) { nm = 1; ny += 1; }
      nextStart = `${ny}-${String(nm).padStart(2, '0')}`;
    } else {
      const today = new Date();
      nextStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    const [sy, sm] = nextStart.split('-').map(Number);
    let ey = sy;
    let em = sm + 11;
    while (em > 12) { em -= 12; ey += 1; }
    const defaultEnd = `${ey}-${String(em).padStart(2, '0')}`;

    const cycleNumber = sortedCycles.length + 1;
    setNewCycleForm({
      name: `Cycle ${cycleNumber} (${formatMonth(nextStart).short} - ${formatMonth(defaultEnd).short})`,
      start_month: nextStart,
      end_month: defaultEnd,
    });
    setShowCycleModal(true);
  };

  const handleOpenCycleModal = () => {
    handleOpenCreateCycleModal();
  };

  const handleOpenEditCycleModal = (cycle) => {
    setEditingCycle(cycle);
    setNewCycleForm({
      name: cycle.name,
      start_month: cycle.start_month,
      end_month: cycle.end_month,
    });
    setShowCycleModal(true);
  };

  const handleSaveCycle = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newCycleForm.name?.trim() || !newCycleForm.start_month || !newCycleForm.end_month) {
      showError('Please provide cycle name, start month, and end month');
      return;
    }
    if (newCycleForm.start_month > newCycleForm.end_month) {
      showError('Start month cannot be after end month');
      return;
    }

    try {
      setCycleActionLoading(true);
      if (editingCycle) {
        await maintenanceApi.updateCycle(editingCycle.id, {
          name: newCycleForm.name.trim(),
          start_month: newCycleForm.start_month,
          end_month: newCycleForm.end_month,
        });
        showToast(`Cycle "${newCycleForm.name}" updated successfully!`);
      } else {
        await maintenanceApi.createCycle({
          society_id: selectedSocietyId,
          name: newCycleForm.name.trim(),
          start_month: newCycleForm.start_month,
          end_month: newCycleForm.end_month,
        });
        showToast(`Cycle "${newCycleForm.name}" created successfully!`);
      }
      setShowCycleModal(false);
      setEditingCycle(null);
      setNewCycleForm({ name: '', start_month: '', end_month: '' });
      await fetchData();
    } catch (err) {
      console.error('Error saving cycle:', err);
      showError(err.response?.data?.message || err.message || 'Failed to save cycle');
    } finally {
      setCycleActionLoading(false);
    }
  };

  const handleDeleteCycle = async (cycleId) => {
    if (!window.confirm('Are you sure you want to delete this maintenance cycle?')) return;
    try {
      setCycleActionLoading(true);
      await maintenanceApi.deleteCycle(cycleId);
      showToast('Cycle deleted successfully');
      await fetchData();
    } catch (err) {
      console.error('Error deleting cycle:', err);
      showError(err.response?.data?.message || err.message || 'Failed to delete cycle');
    } finally {
      setCycleActionLoading(false);
    }
  };

  const handleProceedToPayPlan = (plan, targetPeriod = null) => {
    setShowPayMaintenanceModal(false);
    // Draft payment object - invoice will only be generated upon clicking "Confirm Payment"
    const draftPaymentObj = {
      isPlanPayment: true,
      plan,
      billing_period: targetPeriod,
      billing_cycle: plan.billing_cycle,
      plan_name: plan.name,
      total_amount: Number(plan.amount),
      balance_amount: Number(plan.amount),
      amount: Number(plan.amount),
      home_number: myHomeNumber,
      resident_name: user?.name,
    };
    handleOpenPaymentModal(draftPaymentObj);
  };

  const handleSelectPlan = (plan, targetPeriod = null) => {
    handleProceedToPayPlan(plan, targetPeriod);
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
      let targetBill = selectedBillForPayment;

      // If initiated from "Pay Maintenance" plan selection (draft plan):
      // Only generate the bill / invoice now upon confirming payment!
      if (selectedBillForPayment?.isPlanPayment) {
        const payload = { plan_id: selectedBillForPayment.plan.id };
        if (selectedBillForPayment.billing_period) {
          payload.billing_period = selectedBillForPayment.billing_period;
        }
        const planRes = await maintenanceApi.selectResidentPlan(payload);
        targetBill = planRes.data?.bill;
        if (!targetBill) {
          throw new Error('Failed to generate invoice for the selected plan');
        }
      }

      const res = await maintenanceApi.recordPayment({
        bill_id: targetBill.id,
        amount: Number(paymentFormData.amount),
        payment_method: paymentFormData.payment_method,
        transaction_reference: paymentFormData.transaction_reference,
        remarks: paymentFormData.remarks,
      });

      const coveredDesc = getCoveredMonthsDescription(
        targetBill.billing_period,
        targetBill.billing_cycle
      );
      const isPending = res.data?.payment?.status === 'PENDING_APPROVAL';
      if (isPending) {
        showToast(`Payment of ₹${paymentFormData.amount} submitted successfully! Awaiting Admin verification and confirmation.`);
      } else {
        showToast(`Payment of ₹${paymentFormData.amount} recorded and approved successfully for ${coveredDesc}!`);
      }

      setShowPaymentModal(false);
      await fetchData();

      // Show the generated invoice & receipt preview immediately after confirming payment
      try {
        const fullBillRes = await maintenanceApi.getBillById(targetBill.id);
        setSelectedBillForReceipt(fullBillRes.data?.bill || targetBill);
      } catch {
        setSelectedBillForReceipt(targetBill);
      }
      setShowReceiptModal(true);
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

          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={handleOpenCycleModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-main)',
                  border: '1.5px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title="Manage society maintenance cycles and activation"
              >
                <CalendarDays size={16} color="var(--color-clay)" />
                <span>
                  Cycle: {activeCycle ? activeCycle.name : `${formatMonth(cycleRange.startMonth).short} - ${formatMonth(cycleRange.endMonth).short}`}
                </span>
                <span
                  style={{
                    background: activeCycle ? '#10b981' : '#f59e0b',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    display: 'inline-block',
                  }}
                />
              </button>

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
            </>
          ) : (
            activeCycle && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#10b981',
                }}
              >
                <CalendarDays size={14} />
                <span>Active Cycle: {activeCycle.name}</span>
              </div>
            )
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
            <span>Invoices & Collections(2)</span>
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
          {/* Owner / Family Member Sub-Tabs: "Invoices" and "Month Payment Tracker" */}
          {!isAdmin && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px 12px',
                marginBottom: '4px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                id="subtab-invoices"
                onClick={() => setBillsSubTab('INVOICES')}
                style={{
                  background: billsSubTab === 'INVOICES' ? 'var(--color-clay)' : 'transparent',
                  color: billsSubTab === 'INVOICES' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 20px',
                  fontSize: '0.88rem',
                  fontWeight: billsSubTab === 'INVOICES' ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: billsSubTab === 'INVOICES' ? '0 2px 8px rgba(196, 154, 108, 0.35)' : 'none',
                }}
              >
                <FileText size={16} />
                <span>Invoices</span>
                <span
                  style={{
                    background: billsSubTab === 'INVOICES' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                    color: billsSubTab === 'INVOICES' ? '#ffffff' : 'var(--text-main)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                  }}
                >
                  {filteredBills.length}
                </span>
              </button>

              <button
                type="button"
                id="subtab-month-tracker"
                onClick={() => setBillsSubTab('TRACKER')}
                style={{
                  background: billsSubTab === 'TRACKER' ? 'var(--color-clay)' : 'transparent',
                  color: billsSubTab === 'TRACKER' ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 20px',
                  fontSize: '0.88rem',
                  fontWeight: billsSubTab === 'TRACKER' ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: billsSubTab === 'TRACKER' ? '0 2px 8px rgba(196, 154, 108, 0.35)' : 'none',
                }}
              >
                <CalendarDays size={16} />
                <span>Month Payment Tracker</span>
                <span
                  style={{
                    background: billsSubTab === 'TRACKER' ? 'rgba(255,255,255,0.25)' : 'rgba(16, 185, 129, 0.15)',
                    color: billsSubTab === 'TRACKER' ? '#ffffff' : '#10b981',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                  }}
                >
                  Cycle Wise
                </span>
              </button>
            </div>
          )}

          {/* RESIDENT (USER) CYCLE MONTHS TRACK RECORD */}
          {!isAdmin && billsSubTab === 'TRACKER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(() => {
                const userHomeId = user?.homeId || user?.home_id;
                const userHomes = allHomes.filter(
                  (h) =>
                    (userHomeId && (Number(h.id) === Number(userHomeId) || String(h.id) === String(userHomeId))) ||
                    (myHomeNumber && String(h.home_number).trim().toLowerCase() === String(myHomeNumber).trim().toLowerCase()) ||
                    (user?.id && (String(h.owner_id) === String(user.id) || String(h.resident_id) === String(user.id)))
                );
                const residentHomes = userHomes.length > 0
                  ? userHomes
                  : (filteredBills.length > 0 && filteredBills[0]?.home_id
                    ? [{ id: filteredBills[0].home_id, home_number: filteredBills[0].home_number || myHomeNumber || 'Unit', building_or_wing: '' }]
                    : [{ id: userHomeId || 'my-home', home_number: myHomeNumber || 'Unit', building_or_wing: '' }]);

                const primaryHome = residentHomes[0];
                const resolvedHomeNum = myHomeNumber || primaryHome?.home_number || 'Unit';
                console.log("residentHomes", residentHomes);

                // Compute displayed months based on matrixCycleFilter
                const trackerMonths = (() => {
                  if (matrixCycleFilter === 'ALL') {
                    return allBillingMonths;
                  }
                  const selCycle = cycles.find((c) => String(c.id) === String(matrixCycleFilter));
                  if (!selCycle || !selCycle.start_month || !selCycle.end_month) {
                    return allBillingMonths;
                  }
                  return getMonthsBetween(selCycle.start_month, selCycle.end_month);
                })();

                // Compute metrics for the resident
                let totalPaidCount = 0;
                let totalUnpaidCount = 0;
                let totalPaidAmount = 0;
                let totalDueAmount = 0;

                trackerMonths.forEach((m) => {
                  const st = getHomeMonthStatus(primaryHome.id, m);
                  if (st.isPaid) {
                    totalPaidCount++;
                    totalPaidAmount += Number(st.monthlyShare || st.amount || 0);
                  } else if (st.bill) {
                    totalUnpaidCount++;
                    totalDueAmount += Number(st.balanceAmount || st.amount || 0);
                  }
                });

                const totalTrackerMonths = trackerMonths.length;
                const progressPct = totalTrackerMonths > 0 ? Math.round((totalPaidCount / totalTrackerMonths) * 100) : 0;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Toolbar: Home Badge + Cycle Selector Dropdown + Legend */}
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
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        {/* Home Badge */}
                        <div
                          style={{
                            background: 'var(--color-clay)',
                            color: '#ffffff',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Home size={14} />
                          <span>Home {resolvedHomeNum}</span>
                        </div>

                        {/* Cycle Dropdown Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            Cycle:
                          </label>
                          <select
                            value={matrixCycleFilter}
                            onChange={(e) => setMatrixCycleFilter(e.target.value)}
                            style={{
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-card)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '7px 12px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="ALL">All Cycles ({allBillingMonths.length} Months)</option>
                            {cycles.map((c, cIdx) => (
                              <option key={c.id} value={c.id}>
                                Cycle {cIdx + 1} ({formatMonthExcel(c.start_month)} – {formatMonthExcel(c.end_month)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Legend */}

                    </div>


                    {/* SPREADSHEET ROW-COLUMN MATRIX TABLE (REF SAME AS ADMIN) */}
                    <div
                      className="glass-panel"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-card)',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      <div style={{ overflowX: 'auto', maxHeight: '72vh', position: 'relative' }}>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                            fontSize: '0.82rem',
                            textAlign: 'left',
                          }}
                        >
                          <thead>
                            <tr style={{ background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 10 }}>
                              {/* Sticky Col 1: Unit */}
                              <th
                                style={{
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 12,
                                  background: 'var(--bg-primary)',
                                  padding: '12px 10px',
                                  fontWeight: 800,
                                  color: 'var(--text-muted)',
                                  borderBottom: '2px solid var(--border-card)',
                                  borderRight: '1px solid var(--border-card)',
                                  width: '60px',
                                  textAlign: 'center',
                                  textTransform: 'lowercase',
                                }}
                              >
                                unit
                              </th>

                              {/* Sticky Col 2: Home no */}
                              <th
                                style={{
                                  position: 'sticky',
                                  left: '60px',
                                  zIndex: 12,
                                  background: 'var(--bg-primary)',
                                  padding: '12px 14px',
                                  fontWeight: 800,
                                  color: 'var(--text-muted)',
                                  borderBottom: '2px solid var(--border-card)',
                                  borderRight: '2px solid var(--border-card)',
                                  minWidth: '120px',
                                }}
                              >
                                Home no
                              </th>

                              {/* Month Columns (Oct-26, Nov-26, Dec-26, Jan-27 ...) */}
                              {trackerMonths.map((m) => {
                                const label = formatMonthExcel(m);
                                return (
                                  <th
                                    key={m}
                                    style={{
                                      padding: '10px 14px',
                                      fontWeight: 800,
                                      color: 'var(--text-main)',
                                      borderBottom: '2px solid var(--border-card)',
                                      borderRight: '1px solid var(--border-card)',
                                      textAlign: 'center',
                                      minWidth: '95px',
                                      background: 'var(--bg-primary)',
                                    }}
                                  >
                                    <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>{label}</div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>

                          <tbody>
                            {residentHomes.map((home, idx) => {
                              const rowBg = idx % 2 === 0 ? 'var(--bg-secondary)' : 'rgba(255, 255, 255, 0.015)';

                              return (
                                <tr
                                  key={home.id}
                                  style={{
                                    background: rowBg,
                                    borderBottom: '1px solid var(--border-card)',
                                    transition: 'background 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(196, 154, 108, 0.08)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = rowBg;
                                  }}
                                >
                                  {/* Col 1: Unit index */}
                                  <td
                                    style={{
                                      position: 'sticky',
                                      left: 0,
                                      zIndex: 5,
                                      background: rowBg,
                                      padding: '10px 8px',
                                      fontWeight: 700,
                                      color: 'var(--text-muted)',
                                      textAlign: 'center',
                                      borderRight: '1px solid var(--border-card)',
                                      borderBottom: '1px solid var(--border-card)',
                                    }}
                                  >
                                    {idx + 1}
                                  </td>

                                  {/* Col 2: Home no */}
                                  <td
                                    style={{
                                      position: 'sticky',
                                      left: '60px',
                                      zIndex: 5,
                                      background: rowBg,
                                      padding: '10px 14px',
                                      borderRight: '2px solid var(--border-card)',
                                      borderBottom: '1px solid var(--border-card)',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                        {home.home_number}
                                      </span>
                                      {home.building_or_wing && (
                                        <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                                          ({home.building_or_wing})
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Dynamic Month Cells with multi-month merging (e.g. Oct, Nov, Dec merged showing 2500) */}
                                  {(() => {
                                    const cells = [];
                                    let i = 0;
                                    while (i < trackerMonths.length) {
                                      const m = trackerMonths[i];
                                      const st = getHomeMonthStatus(home.id, m);

                                      if (st.bill) {
                                        const billId = st.bill.id;
                                        let span = 1;
                                        while (
                                          i + span < trackerMonths.length &&
                                          getHomeMonthStatus(home.id, trackerMonths[i + span])?.bill?.id === billId
                                        ) {
                                          span++;
                                        }

                                        const totalDisplayVal = st.isPaid
                                          ? Number(st.bill.paid_amount || st.bill.total_amount || 0)
                                          : Number(st.bill.balance_amount || st.bill.total_amount || 0);

                                        if (st.isPaid) {
                                          cells.push(
                                            <td
                                              key={`${m}-${billId}`}
                                              colSpan={span}
                                              style={{
                                                padding: '8px 10px',
                                                textAlign: 'center',
                                                background: 'rgba(16, 185, 129, 0.12)',
                                                borderRight: '1px solid rgba(16, 185, 129, 0.25)',
                                                borderBottom: '1px solid var(--border-card)',
                                                cursor: 'pointer',
                                              }}
                                              onClick={() => handleOpenReceiptModal(st.bill)}
                                              title={`Home ${home.home_number}: ₹${totalDisplayVal.toLocaleString()} Paid for ${st.bill.billing_period || span + ' months'}. Click to view receipt.`}
                                            >
                                              <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.86rem' }}>
                                                {totalDisplayVal > 0 ? totalDisplayVal.toLocaleString() : '✓'}
                                              </div>
                                              <div style={{ fontSize: '0.62rem', color: '#10b981', opacity: 0.85, fontWeight: 700 }}>
                                                Paid
                                              </div>
                                            </td>
                                          );
                                        } else if (st.status === 'PENDING_APPROVAL') {
                                          cells.push(
                                            <td
                                              key={`${m}-${billId}`}
                                              colSpan={span}
                                              style={{
                                                padding: '6px 8px',
                                                textAlign: 'center',
                                                background: 'rgba(245, 158, 11, 0.12)',
                                                borderRight: '1px solid rgba(245, 158, 11, 0.25)',
                                                borderBottom: '1px solid var(--border-card)',
                                              }}
                                              title="Payment pending admin confirmation"
                                            >
                                              <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.82rem' }}>
                                                {totalDisplayVal.toLocaleString()}
                                              </div>
                                              <span
                                                style={{
                                                  background: '#f59e0b',
                                                  color: '#000000',
                                                  borderRadius: '3px',
                                                  padding: '1px 5px',
                                                  fontSize: '0.6rem',
                                                  fontWeight: 800,
                                                  display: 'inline-block',
                                                  marginTop: '2px',
                                                }}
                                              >
                                                Pending
                                              </span>
                                            </td>
                                          );
                                        } else {
                                          cells.push(
                                            <td
                                              key={`${m}-${billId}`}
                                              colSpan={span}
                                              style={{
                                                padding: '6px 8px',
                                                textAlign: 'center',
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                borderRight: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderBottom: '1px solid var(--border-card)',
                                              }}
                                              title={`Home ${home.home_number}: ₹${totalDisplayVal.toLocaleString()} Due`}
                                            >
                                              <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.82rem' }}>
                                                {totalDisplayVal.toLocaleString()}
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => handleOpenPaymentModal(st.bill)}
                                                style={{
                                                  background: '#10b981',
                                                  color: '#ffffff',
                                                  border: 'none',
                                                  borderRadius: '3px',
                                                  padding: '2px 6px',
                                                  fontSize: '0.62rem',
                                                  fontWeight: 700,
                                                  cursor: 'pointer',
                                                  marginTop: '2px',
                                                }}
                                              >
                                                Pay
                                              </button>
                                            </td>
                                          );
                                        }

                                        i += span;
                                      } else {
                                        cells.push(
                                          <td
                                            key={m}
                                            style={{
                                              padding: '10px 8px',
                                              textAlign: 'center',
                                              color: 'var(--text-dim)',
                                              borderRight: '1px solid var(--border-card)',
                                              borderBottom: '1px solid var(--border-card)',
                                              fontSize: '0.82rem',
                                            }}
                                            title={`No invoice generated for ${formatMonthExcel(m)}`}
                                          >
                                            —
                                          </td>
                                        );
                                        i++;
                                      }
                                    }
                                    return cells;
                                  })()}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}


          {(isAdmin || billsSubTab === 'INVOICES') && (
            <>

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
                        <FileSpreadsheet size={14} />
                        <span>📊 Home No Matrix</span>
                      </button>

                    </div>
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
                    {!isAdmin && (
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      {b.billing_period}
                                    </span>
                                    {(() => {
                                      const bCycle = getMonthCycleInfo(b.billing_period);
                                      if (bCycle.cycle) {
                                        return (
                                          <span
                                            style={{
                                              background: 'rgba(196, 154, 108, 0.15)',
                                              color: 'var(--color-clay)',
                                              padding: '1px 5px',
                                              borderRadius: '3px',
                                              fontSize: '0.62rem',
                                              fontWeight: 800,
                                            }}
                                          >
                                            🗓️ {bCycle.cycleName}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
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

              {/* VIEW 2: HOME NO LIST (ROW & COLUMN SPREADSHEET MATRIX) */}
              {isAdmin && viewMode === 'HOME_LIST' && (() => {
                // 1. Determine months to display based on selected cycle filter
                const displayedMonths = (() => {
                  if (matrixCycleFilter === 'ALL') {
                    return allBillingMonths;
                  }
                  const selCycle = cycles.find((c) => String(c.id) === String(matrixCycleFilter));
                  if (selCycle && selCycle.start_month && selCycle.end_month) {
                    return getMonthsBetween(selCycle.start_month, selCycle.end_month);
                  }
                  return allBillingMonths;
                })();

                // 2. Filter homes based on search and status
                const filteredHomes = allHomes.filter((home) => {
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchesQuery =
                      String(home.home_number || '').toLowerCase().includes(q) ||
                      String(home.resident_name || home.owner_name || '').toLowerCase().includes(q) ||
                      String(home.building_or_wing || '').toLowerCase().includes(q) ||
                      String(home.home_type || '').toLowerCase().includes(q);
                    if (!matchesQuery) return false;
                  }

                  return true;
                });

                // 3. Compute aggregate statistics
                const totalHomesCount = allHomes.length;
                let grandInvoiced = 0;
                let grandPaid = 0;
                let grandDue = 0;

                allHomes.forEach((home) => {
                  const hBills = bills.filter((b) => String(b.home_id) === String(home.id));
                  grandInvoiced += hBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
                  grandPaid += hBills.reduce((acc, b) => acc + Number(b.paid_amount || 0), 0);
                  grandDue += hBills.reduce((acc, b) => acc + Number(b.balance_amount || 0), 0);
                });

                // 4. Excel export handler
                const handleExportExcel = () => {
                  try {
                    const socName = selectedSociety?.name || (Array.isArray(societies) && societies.find((s) => String(s.id) === String(selectedSocietyId))?.name) || 'Society';

                    const headerRow = [
                      'unit',
                      'Home no',
                      ...displayedMonths.map((m) => formatMonthExcel(m)),
                    ];

                    const merges = [];
                    const dataRows = filteredHomes.map((home, rowIdx) => {
                      const sheetRowIndex = rowIdx + 1; // row 0 is headerRow

                      const monthValues = [];
                      let mColIdx = 2; // col 0: unit, 1: Home no
                      let i = 0;
                      while (i < displayedMonths.length) {
                        const m = displayedMonths[i];
                        const st = getHomeMonthStatus(home.id, m);

                        if (st.bill) {
                          const billId = st.bill.id;
                          let span = 1;
                          while (
                            i + span < displayedMonths.length &&
                            getHomeMonthStatus(home.id, displayedMonths[i + span])?.bill?.id === billId
                          ) {
                            span++;
                          }

                          const totalVal = st.isPaid
                            ? Number(st.bill.paid_amount || st.bill.total_amount || 0)
                            : Number(st.bill.balance_amount || st.bill.total_amount || 0);

                          monthValues.push(totalVal);
                          for (let s = 1; s < span; s++) {
                            monthValues.push('');
                          }

                          if (span > 1) {
                            merges.push({
                              s: { r: sheetRowIndex, c: mColIdx },
                              e: { r: sheetRowIndex, c: mColIdx + span - 1 },
                            });
                          }

                          mColIdx += span;
                          i += span;
                        } else {
                          monthValues.push('');
                          mColIdx++;
                          i++;
                        }
                      }

                      return [
                        rowIdx + 1,
                        home.home_number,
                        ...monthValues,
                      ];
                    });

                    const wsData = [headerRow, ...dataRows];
                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                    if (merges.length > 0) {
                      ws['!merges'] = merges;
                    }

                    const colWidths = headerRow.map((h, i) => {
                      let maxLen = String(h).length;
                      dataRows.forEach((r) => {
                        const cellLen = String(r[i] ?? '').length;
                        if (cellLen > maxLen) maxLen = cellLen;
                      });
                      return { wch: Math.min(Math.max(maxLen + 3, 10), 30) };
                    });
                    ws['!cols'] = colWidths;

                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Matrix');
                    const filename = `${socName.replace(/\s+/g, '_')}_Maintenance_Matrix.xlsx`;
                    XLSX.writeFile(wb, filename);
                    showToast('Excel matrix spreadsheet exported successfully!');
                  } catch (err) {
                    console.error('Error exporting matrix excel:', err);
                    showError('Failed to export Excel spreadsheet: ' + (err.message || ''));
                  }
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Filter & Action Toolbar: Search + Cycle Dropdown on left, Export Excel on right */}
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
                        padding: '10px 14px',
                      }}
                    >
                      {/* Left: Search input & Cycle selector dropdown */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                        {/* Search box */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '7px 12px',
                            minWidth: '240px',
                            flex: 1,
                            maxWidth: '420px',
                          }}
                        >
                          <Search size={15} color="var(--text-muted)" />
                          <input
                            type="text"
                            placeholder="Search Home No or resident name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-main)',
                              fontSize: '0.84rem',
                              outline: 'none',
                              width: '100%',
                            }}
                          />
                        </div>

                        {/* All Cycles Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            Cycle:
                          </label>
                          <select
                            value={matrixCycleFilter}
                            onChange={(e) => setMatrixCycleFilter(e.target.value)}
                            style={{
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-card)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '7px 12px',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="ALL">All Cycles ({allBillingMonths.length} Months)</option>
                            {cycles.map((c, cIdx) => (
                              <option key={c.id} value={c.id}>
                                Cycle {cIdx + 1} ({formatMonthExcel(c.start_month)} – {formatMonthExcel(c.end_month)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Right: Export to Excel Button */}
                      <button
                        type="button"
                        onClick={handleExportExcel}
                        style={{
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          padding: '7px 14px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                          whiteSpace: 'nowrap',
                        }}
                        title="Export this matrix table as an Excel spreadsheet (.xlsx)"
                      >
                        <Download size={14} />
                        <span>Export Excel</span>
                      </button>
                    </div>

                    {/* SPREADSHEET MATRIX TABLE VIEW */}
                    <div
                      className="glass-panel"
                      style={{
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-card)',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      <div
                        style={{
                          overflowX: 'auto',
                          maxHeight: '72vh',
                          position: 'relative',
                        }}
                      >
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                            fontSize: '0.82rem',
                            textAlign: 'left',
                          }}
                        >
                          <thead>
                            <tr style={{ background: 'var(--bg-primary)', position: 'sticky', top: 0, zIndex: 10 }}>
                              {/* Sticky Col 1: Unit */}
                              <th
                                style={{
                                  position: 'sticky',
                                  left: 0,
                                  zIndex: 12,
                                  background: 'var(--bg-primary)',
                                  padding: '12px 10px',
                                  fontWeight: 800,
                                  color: 'var(--text-muted)',
                                  borderBottom: '2px solid var(--border-card)',
                                  borderRight: '1px solid var(--border-card)',
                                  width: '60px',
                                  textAlign: 'center',
                                  textTransform: 'lowercase',
                                }}
                              >
                                unit
                              </th>

                              {/* Sticky Col 2: Home no */}
                              <th
                                style={{
                                  position: 'sticky',
                                  left: '60px',
                                  zIndex: 12,
                                  background: 'var(--bg-primary)',
                                  padding: '12px 14px',
                                  fontWeight: 800,
                                  color: 'var(--text-muted)',
                                  borderBottom: '2px solid var(--border-card)',
                                  borderRight: '2px solid var(--border-card)',
                                  minWidth: '120px',
                                }}
                              >
                                Home no
                              </th>


                              {/* Month Columns (Oct-26, Nov-26, Dec-26, Jan-27 ...) */}
                              {displayedMonths.map((m) => {
                                const label = formatMonthExcel(m);
                                return (
                                  <th
                                    key={m}
                                    style={{
                                      padding: '10px 14px',
                                      fontWeight: 800,
                                      color: 'var(--text-main)',
                                      borderBottom: '2px solid var(--border-card)',
                                      borderRight: '1px solid var(--border-card)',
                                      textAlign: 'center',
                                      minWidth: '95px',
                                      background: 'var(--bg-primary)',
                                    }}
                                  >
                                    <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>{label}</div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>

                          <tbody>
                            {filteredHomes.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={2 + displayedMonths.length}
                                  style={{
                                    padding: '36px',
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  No homes match the selected filters.
                                </td>
                              </tr>
                            ) : (
                              filteredHomes.map((home, idx) => {
                                const isEven = idx % 2 === 0;
                                const rowBg = isEven ? 'var(--bg-secondary)' : 'rgba(255, 255, 255, 0.015)';

                                return (
                                  <tr
                                    key={home.id}
                                    style={{
                                      background: rowBg,
                                      borderBottom: '1px solid var(--border-card)',
                                      transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'rgba(196, 154, 108, 0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = rowBg;
                                    }}
                                  >
                                    {/* Col 1: Unit index */}
                                    <td
                                      style={{
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 5,
                                        background: rowBg,
                                        padding: '10px 8px',
                                        fontWeight: 700,
                                        color: 'var(--text-muted)',
                                        textAlign: 'center',
                                        borderRight: '1px solid var(--border-card)',
                                        borderBottom: '1px solid var(--border-card)',
                                      }}
                                    >
                                      {idx + 1}
                                    </td>

                                    {/* Col 2: Home no */}
                                    <td
                                      style={{
                                        position: 'sticky',
                                        left: '60px',
                                        zIndex: 5,
                                        background: rowBg,
                                        padding: '10px 14px',
                                        borderRight: '2px solid var(--border-card)',
                                        borderBottom: '1px solid var(--border-card)',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                                          {home.home_number}
                                        </span>
                                        {home.building_or_wing && (
                                          <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                                            ({home.building_or_wing})
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* Dynamic Month Cells with multi-month merging (e.g. Oct, Nov, Dec merged showing 2500) */}
                                    {(() => {
                                      const cells = [];
                                      let i = 0;
                                      while (i < displayedMonths.length) {
                                        const m = displayedMonths[i];
                                        const st = getHomeMonthStatus(home.id, m);

                                        if (st.bill) {
                                          const billId = st.bill.id;
                                          let span = 1;
                                          while (
                                            i + span < displayedMonths.length &&
                                            getHomeMonthStatus(home.id, displayedMonths[i + span])?.bill?.id === billId
                                          ) {
                                            span++;
                                          }

                                          const totalDisplayVal = st.isPaid
                                            ? Number(st.bill.paid_amount || st.bill.total_amount || 0)
                                            : Number(st.bill.balance_amount || st.bill.total_amount || 0);

                                          if (st.isPaid) {
                                            cells.push(
                                              <td
                                                key={`${m}-${billId}`}
                                                colSpan={span}
                                                style={{
                                                  padding: '8px 10px',
                                                  textAlign: 'center',
                                                  background: 'rgba(16, 185, 129, 0.12)',
                                                  borderRight: '1px solid rgba(16, 185, 129, 0.25)',
                                                  borderBottom: '1px solid var(--border-card)',
                                                  cursor: 'pointer',
                                                }}
                                                onClick={() => handleOpenReceiptModal(st.bill)}
                                                title={`Home ${home.home_number}: ₹${totalDisplayVal.toLocaleString()} Paid for ${st.bill.billing_period || span + ' months'}. Click to view receipt.`}
                                              >
                                                <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.86rem' }}>
                                                  {totalDisplayVal > 0 ? totalDisplayVal.toLocaleString() : '✓'}
                                                </div>
                                                <div style={{ fontSize: '0.62rem', color: '#10b981', opacity: 0.85, fontWeight: 700 }}>
                                                  Paid
                                                </div>
                                              </td>
                                            );
                                          } else if (st.status === 'PENDING_APPROVAL') {
                                            cells.push(
                                              <td
                                                key={`${m}-${billId}`}
                                                colSpan={span}
                                                style={{
                                                  padding: '6px 8px',
                                                  textAlign: 'center',
                                                  background: 'rgba(245, 158, 11, 0.12)',
                                                  borderRight: '1px solid rgba(245, 158, 11, 0.25)',
                                                  borderBottom: '1px solid var(--border-card)',
                                                }}
                                                title={`Home ${home.home_number}: Payment pending admin confirmation`}
                                              >
                                                <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.82rem' }}>
                                                  {totalDisplayVal.toLocaleString()}
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenVerifyModal(st.bill)}
                                                  style={{
                                                    background: '#f59e0b',
                                                    color: '#000000',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    padding: '2px 6px',
                                                    fontSize: '0.62rem',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    marginTop: '2px',
                                                  }}
                                                >
                                                  Confirm
                                                </button>
                                              </td>
                                            );
                                          } else {
                                            cells.push(
                                              <td
                                                key={`${m}-${billId}`}
                                                colSpan={span}
                                                style={{
                                                  padding: '6px 8px',
                                                  textAlign: 'center',
                                                  background: 'rgba(239, 68, 68, 0.08)',
                                                  borderRight: '1px solid rgba(239, 68, 68, 0.2)',
                                                  borderBottom: '1px solid var(--border-card)',
                                                }}
                                                title={`Home ${home.home_number}: ₹${totalDisplayVal.toLocaleString()} Due`}
                                              >
                                                <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.82rem' }}>
                                                  {totalDisplayVal.toLocaleString()}
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenPaymentModal(st.bill)}
                                                  style={{
                                                    background: '#10b981',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '3px',
                                                    padding: '2px 6px',
                                                    fontSize: '0.62rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    marginTop: '2px',
                                                  }}
                                                >
                                                  Collect
                                                </button>
                                              </td>
                                            );
                                          }

                                          i += span;
                                        } else {
                                          cells.push(
                                            <td
                                              key={m}
                                              style={{
                                                padding: '10px 8px',
                                                textAlign: 'center',
                                                color: 'var(--text-dim)',
                                                borderRight: '1px solid var(--border-card)',
                                                borderBottom: '1px solid var(--border-card)',
                                                fontSize: '0.82rem',
                                              }}
                                              title={`No invoice generated for ${formatMonthExcel(m)}`}
                                            >
                                              —
                                            </td>
                                          );
                                          i++;
                                        }
                                      }
                                      return cells;
                                    })()}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>


                    </div>
                  </div>
                );
              })()}

            </>
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
                      Selected Plan Amount: <strong>₹{Number(plans.find((p) => String(p.id) === String(generateFormData.plan_id))?.amount || 0).toLocaleString()}</strong>. All generated invoices will carry this amount.
                    </span>
                  </div>
                )}
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
                <span style={{ color: 'var(--text-muted)' }}>{selectedBillForPayment.isPlanPayment ? 'Plan / Invoice:' : 'Invoice:'}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedBillForPayment.isPlanPayment
                    ? `${selectedBillForPayment.plan_name} (Generated on Confirm)`
                    : selectedBillForPayment.bill_number}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Unit:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-clay)' }}>{selectedBillForPayment.home_number || myHomeNumber}</span>
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
                <span style={{ fontWeight: 700 }}>₹{Number(selectedBillForPayment.total_amount || selectedBillForPayment.amount || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{selectedBillForPayment.isPlanPayment ? 'Payable Amount:' : 'Outstanding Balance:'}</span>
                <span style={{ fontWeight: 800, color: selectedBillForPayment.isPlanPayment ? '#10b981' : '#ef4444' }}>
                  ₹{Number(selectedBillForPayment.balance_amount || selectedBillForPayment.total_amount || selectedBillForPayment.amount || 0).toLocaleString()}
                </span>
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
                  <strong>Payment Confirmation:</strong> Clicking <strong>"Confirm Payment"</strong> will generate your official invoice, record your payment submission, and show your invoice receipt preview immediately.
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
                {activeCycle && (
                  <div style={{ marginTop: '8px' }}>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CalendarDays size={13} />
                      <span>Active Cycle: <strong>{activeCycle.name}</strong> ({formatMonth(activeCycle.start_month).short} to {formatMonth(activeCycle.end_month).short})</span>
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPayMaintenanceModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Check if all active cycle months are fully paid */}
            {activeCycle &&
              residentAvailablePlans.length > 0 &&
              residentAvailablePlans.every((p) => {
                const info = getNextUnpaidPeriodForPlan(p);
                return !info.isEligible && info.isAllPaid;
              }) && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1.5px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px',
                    textAlign: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px' }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981', margin: 0 }}>
                    Active Cycle Fully Settled!
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', margin: '6px 0 0' }}>
                    All maintenance dues for active cycle <strong>{activeCycle.name}</strong> ({formatMonth(activeCycle.start_month).short} to {formatMonth(activeCycle.end_month).short}) are completely cleared!
                  </p>
                </div>
              )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {residentAvailablePlans.map((plan) => {
                const isQuarterly = plan.billing_cycle === 'QUARTERLY';
                const nextInfo = getNextUnpaidPeriodForPlan(plan);

                return (
                  <div
                    key={plan.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: `1.5px solid ${nextInfo.isEligible ? 'var(--border-card)' : 'rgba(239, 68, 68, 0.3)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      opacity: nextInfo.isEligible ? 1 : 0.85,
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
                            {isQuarterly ? 'Quarterly (3 Months)' : plan.billing_cycle === 'HALF_YEARLY' ? 'Half Yearly (6 Mos)' : plan.billing_cycle === 'YEARLY' ? 'Yearly (12 Mos)' : 'Monthly (1 Mo)'}
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

                    {/* Eligibility or Ineligibility Banner */}
                    {!nextInfo.isEligible ? (
                      <div
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          fontSize: '0.8rem',
                          color: '#f87171',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                        }}
                      >
                        <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <strong>Unavailable in Active Cycle:</strong> {nextInfo.disabledReason}
                        </div>
                      </div>
                    ) : (
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
                            {nextInfo.isAdvance ? '✓ Current Month Settled' : 'Due Period'}:
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
                            Advance
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        handleProceedToPayPlan(plan, nextInfo.period);
                      }}
                      disabled={!nextInfo.isEligible || actionLoading}
                      style={{
                        background: nextInfo.isEligible ? 'var(--color-clay)' : 'rgba(255, 255, 255, 0.08)',
                        color: nextInfo.isEligible ? '#fff' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 16px',
                        fontSize: '0.88rem',
                        fontWeight: 800,
                        cursor: nextInfo.isEligible ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '4px',
                      }}
                    >
                      <CreditCard size={15} />
                      <span>
                        {nextInfo.isEligible
                          ? `Proceed & Pay ₹${Number(plan.amount).toLocaleString()} for ${nextInfo.desc}`
                          : 'Unavailable in Current Cycle'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: ADMIN MAINTENANCE CYCLE MANAGER & ACTIVATOR                 */}
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
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '26px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              border: '1px solid var(--border-card)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarDays size={22} color="var(--color-clay)" />
                  <span>Maintenance Billing Cycles</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Default 12-month cycle starts from society creation month. Admin can modify existing cycles or create the upcoming cycle.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCycleModal(false);
                  setEditingCycle(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Society Cycles Overview Banner */}
            <div
              style={{
                background: 'rgba(196, 154, 108, 0.08)',
                border: '1.5px solid rgba(196, 154, 108, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      background: 'var(--color-clay)',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    CONTINUOUS CYCLES
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                    {cycles.length} Cycle{cycles.length !== 1 ? 's' : ''} Configured
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Cycles run consecutively without gaps or overlaps. Residents can make payments across any configured cycle.
                </p>
              </div>

              {!editingCycle && (
                <button
                  type="button"
                  onClick={handleOpenCreateCycleModal}
                  style={{
                    background: 'var(--color-clay)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 6px rgba(196, 154, 108, 0.3)',
                  }}
                >
                  <Plus size={14} />
                  <span>Create Cycle {cycles.length + 1}</span>
                </button>
              )}
            </div>

            {/* List of Created Cycles */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Configured Society Cycles ({cycles.length})
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click Modify to edit any cycle
                </span>
              </div>

              {cycles.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-muted)',
                    fontSize: '0.84rem',
                  }}
                >
                  No maintenance cycles found. Fill the form below to initialize your cycle.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cycles.map((c, cIdx) => {
                    const monthsCount = getMonthsBetween(c.start_month, c.end_month).length;
                    const isBeingEdited = editingCycle && editingCycle.id === c.id;

                    return (
                      <div
                        key={c.id}
                        style={{
                          background: isBeingEdited ? 'rgba(196, 154, 108, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: isBeingEdited ? '1.5px solid var(--color-clay)' : '1px solid var(--border-card)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                              {c.name}
                            </span>
                            <span
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              CYCLE {cIdx + 1}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {formatMonth(c.start_month).short} to {formatMonth(c.end_month).short} • <strong>{monthsCount} Months</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditCycleModal(c)}
                            disabled={cycleActionLoading}
                            style={{
                              background: isBeingEdited ? 'var(--color-clay)' : 'rgba(196, 154, 108, 0.15)',
                              color: isBeingEdited ? '#ffffff' : 'var(--color-clay)',
                              border: '1px solid rgba(196, 154, 108, 0.3)',
                              borderRadius: '5px',
                              padding: '5px 12px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Pencil size={12} />
                            <span>{isBeingEdited ? 'Editing' : 'Modify'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCycle(c.id)}
                            disabled={cycleActionLoading}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '6px',
                            }}
                            title="Delete cycle"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create New Cycle / Modify Cycle Form */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {editingCycle ? <Pencil size={15} color="var(--color-clay)" /> : <Plus size={15} color="var(--color-clay)" />}
                  <span>{editingCycle ? `Modify Cycle: ${editingCycle.name}` : `Create Upcoming Cycle (Cycle ${cycles.length + 1})`}</span>
                </h4>
                {editingCycle && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCycle(null);
                      handleOpenCreateCycleModal();
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Cancel Edit (Create Mode)
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveCycle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Cycle Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder='e.g. "Cycle 2 (Oct 2027 - Sep 2028)"'
                    value={newCycleForm.name}
                    onChange={(e) => setNewCycleForm({ ...newCycleForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 12px',
                      fontSize: '0.84rem',
                      color: 'var(--text-main)',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Start Month *
                    </label>
                    <input
                      type="month"
                      required
                      value={newCycleForm.start_month}
                      onChange={(e) => setNewCycleForm({ ...newCycleForm, start_month: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 12px',
                        fontSize: '0.84rem',
                        color: 'var(--text-main)',
                        outline: 'none',
                      }}
                    />
                    {!editingCycle && cycles.length > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#10b981', marginTop: '2px', display: 'block' }}>
                        ✓ Auto-linked to upcoming next month
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      End Month *
                    </label>
                    <input
                      type="month"
                      required
                      value={newCycleForm.end_month}
                      onChange={(e) => setNewCycleForm({ ...newCycleForm, end_month: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 12px',
                        fontSize: '0.84rem',
                        color: 'var(--text-main)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Quick Presets for Duration */}
                {newCycleForm.start_month && (
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: '6px' }}>Quick Duration:</span>
                    {[
                      { label: '+6 Months', add: 5 },
                      { label: '+12 Months (1 Year)', add: 11 },
                      { label: '+24 Months (2 Years)', add: 23 },
                    ].map((preset) => {
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            const [sy, sm] = newCycleForm.start_month.split('-').map(Number);
                            let totalM = (sy * 12 + (sm - 1)) + preset.add;
                            let newY = Math.floor(totalM / 12);
                            let newM = (totalM % 12) + 1;
                            const calcEnd = `${newY}-${String(newM).padStart(2, '0')}`;
                            setNewCycleForm({
                              ...newCycleForm,
                              end_month: calcEnd,
                              name: newCycleForm.name ? newCycleForm.name : `Cycle (${formatMonth(newCycleForm.start_month).short} - ${formatMonth(calcEnd).short})`,
                            });
                          }}
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '4px',
                            color: 'var(--color-clay)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            marginRight: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCycleModal(false);
                      setEditingCycle(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-card)',
                      color: 'var(--text-muted)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={cycleActionLoading}
                    style={{
                      background: 'var(--color-clay)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 20px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: cycleActionLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(196, 154, 108, 0.4)',
                    }}
                  >
                    {cycleActionLoading ? <RefreshCw size={14} className="animate-spin" /> : editingCycle ? <Pencil size={14} /> : <Plus size={14} />}
                    <span>{editingCycle ? 'Update Cycle' : `Create Cycle ${cycles.length + 1}`}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
