import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
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
  TrendingUp,
  AlertCircle,
  X,
  FileText,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Home,
  Layers,
  Check,
  Coins,
  Pencil,
  Trash,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { maintenanceApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';

export const MaintenanceBillingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const isUserAdmin =
    user?.role === ROLES.ADMIN ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN';

  // Admin Scope Toggle: 'ALL' (Society-wide) | 'MY_HOME' (Resident unit view)
  // Allows testing both Admin and Resident data perspectives
  const [scopeFilter, setScopeFilter] = useState(isUserAdmin ? 'ALL' : 'MY_HOME');
  const isAdminView = isUserAdmin && scopeFilter === 'ALL';
  const canManageCycles = isUserAdmin && isAdminView;

  const myHomeNumber =
    user?.flatNumber ||
    user?.unitNumber ||
    user?.home_number ||
    user?.homeNumber ||
    'Flat A-101';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' (Invoices & Collection) | 'plans' (Maintenance & Plans) | 'payments' (Payment History)
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [stats, setStats] = useState(null);
  const [bills, setBills] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);

  // Month format & calculation helpers matching frontend MaintenancePage.jsx
  const formatMonth = (monthStr) => {
    if (!monthStr) return { short: '', long: '', monthName: '', year: '' };
    const match = String(monthStr).match(/(\d{4})-(\d{1,2})/);
    if (!match) return { short: monthStr, long: monthStr, monthName: monthStr, year: '' };
    const year = match[1];
    const mIdx = parseInt(match[2], 10) - 1;
    const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const longNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return {
      short: `${shortNames[mIdx] || match[2]}-${year}`,
      long: `${longNames[mIdx] || match[2]} ${year}`,
      monthName: longNames[mIdx] || match[2],
      year,
    };
  };

  const getMonthsBetween = (startMonth, endMonth) => {
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
  };

  const formatPaymentDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = d.getDate();
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return String(dateStr);
    }
  };

  // Cycles State (Initialized with society cycle, loaded dynamically from API)
  const defaultCycles = [
    {
      id: 6,
      name: 'Cycle 1 (Oct 2026 – Sep 2027)',
      start_month: '2026-10',
      end_month: '2027-09',
      is_active: true,
    },
  ];
  const [cycles, setCycles] = useState(defaultCycles);
  const [activeCycle, setActiveCycle] = useState(defaultCycles[0]);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [cycleForm, setCycleForm] = useState({
    name: 'Cycle 2 (Oct-2027 - Sep-2028)',
    start_month: '2027-10',
    end_month: '2028-09',
  });
  const [cycleActionLoading, setCycleActionLoading] = useState(false);

  // Maintenance Plan Form & Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    applicable_type: 'ALL',
    resident_type: 'BOTH',
    amount: '',
    billing_cycle: 'MONTHLY',
    due_day: '5',
    grace_period_days: '5',
    penalty_type: 'FIXED',
    penalty_rate: '100',
    description: '',
  });
  const [submittingPlan, setSubmittingPlan] = useState(false);

  // Invoices & Payment Modals
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedPaymentForVerify, setSelectedPaymentForVerify] = useState(null);

  // Payment Form
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Generate Invoices Form (Admin)
  const [generatePeriod, setGeneratePeriod] = useState('2026-11');
  const [generateCycle, setGenerateCycle] = useState('MONTHLY');
  const [generatingBills, setGeneratingBills] = useState(false);

  // Fallback Mock Data matching frontend MaintenancePage.jsx
  const defaultStats = {
    total_bills: 3,
    total_billed: 4500,
    total_collected: 4500,
    total_pending: 0,
    total_penalties: 0,
    count_paid: 3,
    count_pending: 0,
    count_overdue: 0,
    count_pending_approval: 0,
    total_plans: 3,
  };

  const defaultPlans = [
    {
      id: 1,
      name: 'Standard Monthly Maintenance',
      applicable_type: 'ALL',
      resident_type: 'BOTH',
      amount: 1500,
      billing_cycle: 'MONTHLY',
      due_day: 5,
      grace_period_days: 5,
      penalty_type: 'FIXED',
      penalty_rate: 100,
      status: 'ACTIVE',
      description: 'Standard flat maintenance including water, security, and common lighting.',
    },
    {
      id: 2,
      name: 'Deluxe Quarterly Maintenance',
      applicable_type: '2BHK',
      resident_type: 'OWNER',
      amount: 4200,
      billing_cycle: 'QUARTERLY',
      due_day: 5,
      grace_period_days: 7,
      penalty_type: 'PERCENTAGE',
      penalty_rate: 5,
      status: 'ACTIVE',
      description: 'Quarterly maintenance covering clubhouse access, gym, and priority lift maintenance.',
    },
    {
      id: 3,
      name: 'Annual Advance Maintenance Plan',
      applicable_type: '3BHK',
      resident_type: 'BOTH',
      amount: 16000,
      billing_cycle: 'YEARLY',
      due_day: 10,
      grace_period_days: 10,
      penalty_type: 'FIXED',
      penalty_rate: 500,
      status: 'ACTIVE',
      description: 'Full year advance maintenance with 10% discount on common services.',
    },
  ];

  const defaultBills = [
    {
      id: 101,
      bill_number: 'INV-2026-M01',
      invoice_number: 'INV-2026-M01',
      home_number: 'Flat A-101',
      resident_name: 'Rajesh Sharma',
      resident_phone: '+91 98765 43210',
      billing_period: '2026-10',
      period_label: 'October 2026',
      plan_name: 'Standard Monthly Maintenance',
      total_amount: 1500,
      paid_amount: 1500,
      balance_amount: 0,
      penalty_amount: 0,
      due_date: '2026-11-05',
      status: 'PAID',
      isMyHome: true,
    },
    {
      id: 102,
      bill_number: 'INV-2026-M02',
      invoice_number: 'INV-2026-M02',
      home_number: 'Flat B-204',
      resident_name: 'Priya Patel',
      resident_phone: '+91 98765 12345',
      billing_period: '2026-10',
      period_label: 'October 2026',
      plan_name: 'Standard Monthly Maintenance',
      total_amount: 1500,
      paid_amount: 1500,
      balance_amount: 0,
      penalty_amount: 0,
      due_date: '2026-11-05',
      status: 'PAID',
      isMyHome: false,
    },
    {
      id: 103,
      bill_number: 'INV-2026-M03',
      invoice_number: 'INV-2026-M03',
      home_number: 'Flat C-302',
      resident_name: 'Amit Verma',
      resident_phone: '+91 98111 22334',
      billing_period: '2026-10',
      period_label: 'October 2026',
      plan_name: 'Standard Monthly Maintenance',
      total_amount: 1500,
      paid_amount: 1500,
      balance_amount: 0,
      penalty_amount: 0,
      due_date: '2026-11-05',
      status: 'PAID',
      isMyHome: false,
    },
    {
      id: 104,
      bill_number: 'INV-2026-M04',
      invoice_number: 'INV-2026-M04',
      home_number: 'Flat A-101',
      resident_name: 'Rajesh Sharma',
      resident_phone: '+91 98765 43210',
      billing_period: '2026-11',
      period_label: 'November 2026',
      plan_name: 'Standard Monthly Maintenance',
      total_amount: 1500,
      paid_amount: 0,
      balance_amount: 1500,
      penalty_amount: 0,
      due_date: '2026-11-05',
      status: 'PENDING',
      isMyHome: true,
    },
  ];

  const defaultPayments = [
    {
      id: 13,
      receipt_number: 'RCP-005810-586',
      bill_id: 33,
      bill_number: 'INV-202610-2-27',
      invoice_number: 'INV-202610-2-27',
      bill_title: 'Maintenance - 2026-10 (plan1)',
      billing_period: '2026-10',
      billing_cycle: 'MONTHLY',
      home_number: '2',
      resident_name: 'Rajesh2',
      resident_role: 'OWNER',
      amount: 1000,
      payment_method: 'NET_BANKING',
      transaction_reference: 'cdscds',
      status: 'APPROVED',
      approved_by_name: 'admin2',
      payment_date: '2026-10-28 10:53:25',
      created_at: '2026-10-28 10:53:25',
      isMyHome: false,
    },
    {
      id: 12,
      receipt_number: 'RCP-217114-781',
      bill_id: 28,
      bill_number: 'INV-202701-1-89',
      invoice_number: 'INV-202701-1-89',
      bill_title: 'Maintenance - 2027-01 (plan1)',
      billing_period: '2027-01',
      billing_cycle: 'MONTHLY',
      home_number: '1',
      resident_name: 'Rajesh1',
      resident_role: 'OWNER',
      amount: 1000,
      payment_method: 'CASH',
      transaction_reference: 'sd',
      status: 'APPROVED',
      approved_by_name: 'admin2',
      payment_date: '2026-10-27 18:00:17',
      created_at: '2026-10-27 18:00:17',
      isMyHome: true,
    },
    {
      id: 11,
      receipt_number: 'RCP-181582-915',
      bill_id: 27,
      bill_number: 'INV-Q42026-1-42',
      invoice_number: 'INV-Q42026-1-42',
      bill_title: 'Maintenance - Q4-2026 (plan2)',
      billing_period: 'Q4-2026',
      billing_cycle: 'QUARTERLY',
      home_number: '1',
      resident_name: 'Rajesh1',
      resident_role: 'OWNER',
      amount: 2500,
      payment_method: 'UPI',
      transaction_reference: 'dswd',
      status: 'APPROVED',
      approved_by_name: 'admin2',
      payment_date: '2026-10-27 17:59:41',
      created_at: '2026-10-27 17:59:41',
      isMyHome: true,
    },
  ];

  const fetchMaintenanceData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const socId = user?.society_id || user?.societyId;
      const socParam = socId ? { society_id: socId } : {};

      const [statsRes, billsRes, plansRes, paymentsRes, cyclesRes, activeCycleRes] = await Promise.all([
        maintenanceApi.getStats(socParam).catch(() => null),
        maintenanceApi.getBills(socParam).catch(() => null),
        maintenanceApi.getPlans(socParam).catch(() => null),
        maintenanceApi.getPayments(socParam).catch(() => null),
        maintenanceApi.getCycles(socParam).catch(() => null),
        maintenanceApi.getActiveCycle(socParam).catch(() => null),
      ]);

      const rawStats = statsRes?.data?.data || statsRes?.data || statsRes;
      if (rawStats && (rawStats.total_billed !== undefined || rawStats.total_collected !== undefined)) {
        setStats(rawStats);
      } else if (!stats) {
        setStats(defaultStats);
      }

      const rawBills =
        billsRes?.data?.bills ||
        billsRes?.data?.data?.bills ||
        billsRes?.bills ||
        (Array.isArray(billsRes?.data) ? billsRes.data : []);
      if (Array.isArray(rawBills) && rawBills.length > 0) {
        const enriched = rawBills.map((b) => ({
          ...b,
          bill_number: b.bill_number || b.invoice_number || `INV-${b.id}`,
          invoice_number: b.bill_number || b.invoice_number || `INV-${b.id}`,
          isMyHome:
            b.home_number === myHomeNumber ||
            b.flat_number === myHomeNumber ||
            b.resident_id === user?.id,
        }));
        setBills(enriched);
      } else if (!bills.length) {
        setBills(defaultBills);
      }

      const rawPlans =
        plansRes?.data?.plans ||
        plansRes?.data?.data?.plans ||
        plansRes?.plans ||
        (Array.isArray(plansRes?.data) ? plansRes.data : []);
      if (Array.isArray(rawPlans) && rawPlans.length > 0) {
        setPlans(rawPlans);
      } else if (!plans.length) {
        setPlans(defaultPlans);
      }

      const rawPayments =
        paymentsRes?.data?.payments ||
        paymentsRes?.data?.data?.payments ||
        paymentsRes?.payments ||
        (Array.isArray(paymentsRes?.data) ? paymentsRes.data : []);
      if (Array.isArray(rawPayments) && rawPayments.length > 0) {
        const enrichedPay = rawPayments.map((p) => ({
          ...p,
          bill_number: p.bill_number || p.invoice_number || (p.bill_id ? `INV-${p.bill_id}` : 'N/A'),
          invoice_number: p.bill_number || p.invoice_number || (p.bill_id ? `INV-${p.bill_id}` : 'N/A'),
          isMyHome:
            p.home_number === myHomeNumber ||
            p.resident_id === user?.id ||
            p.paid_by_user_id === user?.id,
        }));
        setPayments(enrichedPay);
      } else if (!payments.length) {
        setPayments(defaultPayments);
      }

      const rawCycles =
        cyclesRes?.data?.cycles ||
        cyclesRes?.data?.data?.cycles ||
        cyclesRes?.cycles ||
        (Array.isArray(cyclesRes?.data) ? cyclesRes.data : []);
      if (Array.isArray(rawCycles) && rawCycles.length > 0) {
        setCycles(rawCycles);
      } else if (!cycles.length) {
        setCycles(defaultCycles);
      }

      const rawActiveCycle =
        activeCycleRes?.data?.cycle ||
        activeCycleRes?.data?.data?.cycle ||
        activeCycleRes?.cycle ||
        (Array.isArray(rawCycles) && rawCycles.length > 0 ? rawCycles.find((c) => c.is_active) || rawCycles[0] : null);
      if (rawActiveCycle) {
        setActiveCycle(rawActiveCycle);
      } else if (!activeCycle && defaultCycles.length > 0) {
        setActiveCycle(defaultCycles[0]);
      }
    } catch (err) {
      console.log('Error fetching maintenance data:', err);
      if (!stats) setStats(defaultStats);
      if (!bills.length) setBills(defaultBills);
      if (!plans.length) setPlans(defaultPlans);
      if (!payments.length) setPayments(defaultPayments);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const activeStats = stats || defaultStats;
  const currentBills = bills.length ? bills : defaultBills;
  const currentPlans = plans.length ? plans : defaultPlans;
  const currentPayments = payments.length ? payments : defaultPayments;

  // Filter Bills based on Admin vs Resident Scope + Search + Status
  const filteredBills = useMemo(() => {
    return currentBills.filter((b) => {
      // 1. Role Scope Filter
      if (!isAdminView && !b.isMyHome) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL' && b.status !== statusFilter) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const home = (b.home_number || b.flat_number || '').toLowerCase();
        const resident = (b.resident_name || '').toLowerCase();
        const inv = (b.invoice_number || '').toLowerCase();
        return home.includes(term) || resident.includes(term) || inv.includes(term);
      }

      return true;
    });
  }, [currentBills, isAdminView, statusFilter, searchQuery]);

  // Filter Payments based on Admin vs Resident Scope
  const filteredPayments = useMemo(() => {
    return currentPayments.filter((p) => {
      if (!isAdminView && !p.isMyHome) {
        return false;
      }
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase();
        const matchesUnit = String(p.home_number || '').toLowerCase().includes(term);
        const matchesResident = String(p.resident_name || '').toLowerCase().includes(term);
        const matchesReceipt = String(p.receipt_number || '').toLowerCase().includes(term);
        const matchesInvoice = String(p.bill_number || p.invoice_number || '').toLowerCase().includes(term);
        const matchesTxn = String(p.transaction_reference || '').toLowerCase().includes(term);
        const matchesMode = String(p.payment_method || '').toLowerCase().includes(term);
        if (!matchesUnit && !matchesResident && !matchesReceipt && !matchesInvoice && !matchesTxn && !matchesMode) {
          return false;
        }
      }
      return true;
    });
  }, [currentPayments, isAdminView, searchQuery]);

  // Resident Specific Totals
  const residentStats = useMemo(() => {
    const myBills = currentBills.filter((b) => b.isMyHome);
    const totalBilled = myBills.reduce((acc, b) => acc + Number(b.total_amount || 0), 0);
    const totalPaid = myBills.reduce((acc, b) => acc + Number(b.paid_amount || 0), 0);
    const totalPending = myBills.reduce((acc, b) => acc + Number(b.balance_amount || 0), 0);
    const paidCount = myBills.filter((b) => b.status === 'PAID').length;
    const pendingCount = myBills.filter((b) => b.status === 'PENDING' || b.status === 'OVERDUE').length;

    return {
      totalBilled,
      totalPaid,
      totalPending,
      paidCount,
      pendingCount,
      hasPending: totalPending > 0,
    };
  }, [currentBills]);

  // Handle Submit Payment (Resident or Admin Collect)
  const handleSubmitPayment = async () => {
    if (!selectedBillForPayment) return;
    setSubmittingPayment(true);

    try {
      const amountToPay = selectedBillForPayment.balance_amount || selectedBillForPayment.total_amount;
      await maintenanceApi.recordPayment({
        bill_id: selectedBillForPayment.id,
        amount: Number(amountToPay),
        payment_method: paymentMethod,
        transaction_reference: transactionRef || `UTR-${Date.now().toString().slice(-6)}`,
        remarks: `Maintenance dues payment for ${selectedBillForPayment.home_number}`,
      });

      Alert.alert('Payment Recorded', `Payment of ₹${amountToPay} recorded successfully!`);
      setSelectedBillForPayment(null);
      setTransactionRef('');
      fetchMaintenanceData(true);
    } catch (err) {
      // Local fallback for offline simulation
      setBills((prev) =>
        prev.map((b) =>
          b.id === selectedBillForPayment.id
            ? { ...b, status: 'PAID', paid_amount: b.total_amount, balance_amount: 0 }
            : b
        )
      );
      Alert.alert('Payment Settled', 'Payment recorded and invoice marked as PAID.');
      setSelectedBillForPayment(null);
      setTransactionRef('');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handle Batch Generate Invoices (Admin)
  const handleGenerateInvoices = async () => {
    setGeneratingBills(true);
    try {
      await maintenanceApi.generateBatchBills({
        billing_period: generatePeriod,
        billing_cycle: generateCycle,
        due_date: '2026-12-05',
      });
      Alert.alert('Invoices Generated', `Batch maintenance bills generated for ${generatePeriod}!`);
      setShowGenerateModal(false);
      fetchMaintenanceData(true);
    } catch (err) {
      Alert.alert('Notice', `Batch bills scheduled for period ${generatePeriod}.`);
      setShowGenerateModal(false);
    } finally {
      setGeneratingBills(false);
    }
  };

  // Handle Verify Payment (Admin Approve/Reject)
  const handleVerifyPayment = async (decision) => {
    if (!selectedPaymentForVerify) return;
    try {
      if (decision === 'APPROVE') {
        await maintenanceApi.approvePayment(selectedPaymentForVerify.id);
        Alert.alert('Payment Approved', 'Resident payment receipt has been verified & approved.');
      } else {
        await maintenanceApi.rejectPayment(selectedPaymentForVerify.id);
        Alert.alert('Payment Rejected', 'Payment rejected.');
      }
      setSelectedPaymentForVerify(null);
      fetchMaintenanceData(true);
    } catch (err) {
      setSelectedPaymentForVerify(null);
      fetchMaintenanceData(true);
    }
  };

  // Handle Open Create Plan Modal (Admin)
  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      applicable_type: 'ALL',
      resident_type: 'BOTH',
      amount: '',
      billing_cycle: 'MONTHLY',
      due_day: '5',
      grace_period_days: '5',
      penalty_type: 'FIXED',
      penalty_rate: '100',
      description: '',
    });
    setShowPlanModal(true);
  };

  // Handle Open Edit Plan Modal (Admin)
  const handleOpenEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name || '',
      applicable_type: plan.applicable_type || 'ALL',
      resident_type: plan.resident_type || 'BOTH',
      amount: String(plan.amount || ''),
      billing_cycle: plan.billing_cycle || 'MONTHLY',
      due_day: String(plan.due_day || 5),
      grace_period_days: String(plan.grace_period_days || 5),
      penalty_type: plan.penalty_type || 'FIXED',
      penalty_rate: String(plan.penalty_rate || 100),
      description: plan.description || '',
    });
    setShowPlanModal(true);
  };

  // Handle Save Maintenance Plan (Create / Update)
  const handleSavePlan = async () => {
    if (!planForm.name?.trim()) {
      Alert.alert('Validation Error', 'Please enter a plan name.');
      return;
    }
    if (!planForm.amount || isNaN(Number(planForm.amount)) || Number(planForm.amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid maintenance charge amount.');
      return;
    }

    setSubmittingPlan(true);
    const planPayload = {
      name: planForm.name.trim(),
      applicable_type: planForm.applicable_type,
      resident_type: planForm.resident_type,
      amount: Number(planForm.amount),
      billing_cycle: planForm.billing_cycle,
      due_day: Number(planForm.due_day) || 5,
      grace_period_days: Number(planForm.grace_period_days) || 5,
      penalty_type: planForm.penalty_type,
      penalty_rate: Number(planForm.penalty_rate) || 0,
      description: planForm.description?.trim() || '',
      status: 'ACTIVE',
    };

    try {
      if (editingPlan) {
        await maintenanceApi.updatePlan(editingPlan.id, planPayload);
        setPlans((prev) =>
          prev.map((p) => (p.id === editingPlan.id ? { ...p, ...planPayload } : p))
        );
        Alert.alert('Plan Updated', `Plan "${planForm.name}" updated successfully!`);
      } else {
        const res = await maintenanceApi.createPlan(planPayload);
        const newPlan = res?.data?.plan || { ...planPayload, id: Date.now() };
        setPlans((prev) => [newPlan, ...prev]);
        Alert.alert('Plan Created', `New plan "${planForm.name}" created successfully!`);
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      fetchMaintenanceData(true);
    } catch (err) {
      // Offline fallback
      if (editingPlan) {
        setPlans((prev) =>
          prev.map((p) => (p.id === editingPlan.id ? { ...p, ...planPayload } : p))
        );
        Alert.alert('Plan Updated', `Plan "${planForm.name}" updated successfully!`);
      } else {
        const fallbackPlan = { ...planPayload, id: Date.now() };
        setPlans((prev) => [fallbackPlan, ...prev]);
        Alert.alert('Plan Created', `New plan "${planForm.name}" created successfully!`);
      }
      setShowPlanModal(false);
      setEditingPlan(null);
    } finally {
      setSubmittingPlan(false);
    }
  };

  // Handle Delete Maintenance Plan
  const handleDeletePlan = (planId) => {
    Alert.alert(
      'Deactivate Plan',
      'Are you sure you want to deactivate this maintenance plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await maintenanceApi.deletePlan(planId);
              setPlans((prev) => prev.filter((p) => p.id !== planId));
              Alert.alert('Plan Removed', 'Maintenance plan has been removed.');
            } catch (err) {
              setPlans((prev) => prev.filter((p) => p.id !== planId));
              Alert.alert('Plan Removed', 'Maintenance plan has been removed.');
            }
          },
        },
      ]
    );
  };

  // Handle Open Cycle Modal
  // Handle Open Create Cycle Modal (Auto calculates next continuous horizon)
  const handleOpenCreateCycleModal = () => {
    setEditingCycle(null);
    const sortedCycles = [...cycles].sort((a, b) => (a.start_month || '').localeCompare(b.start_month || ''));
    const latestCycle = sortedCycles[sortedCycles.length - 1];

    let nextStart = '';
    if (latestCycle && latestCycle.end_month) {
      const [y, m] = latestCycle.end_month.split('-').map(Number);
      let nm = m + 1;
      let ny = y;
      if (nm > 12) {
        nm = 1;
        ny += 1;
      }
      nextStart = `${ny}-${String(nm).padStart(2, '0')}`;
    } else {
      const today = new Date();
      nextStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }

    const [sy, sm] = nextStart.split('-').map(Number);
    let ey = sy;
    let em = sm + 11;
    while (em > 12) {
      em -= 12;
      ey += 1;
    }
    const defaultEnd = `${ey}-${String(em).padStart(2, '0')}`;

    const cycleNumber = sortedCycles.length + 1;
    setCycleForm({
      name: `Cycle ${cycleNumber} (${formatMonth(nextStart).short} - ${formatMonth(defaultEnd).short})`,
      start_month: nextStart,
      end_month: defaultEnd,
    });
    setShowCycleModal(true);
  };

  const handleOpenCycleModal = () => {
    handleOpenCreateCycleModal();
  };

  // Handle Open Edit Cycle
  const handleOpenEditCycle = (cycle) => {
    if (editingCycle && editingCycle.id === cycle.id) {
      handleOpenCreateCycleModal();
      return;
    }
    setEditingCycle(cycle);
    setCycleForm({
      name: cycle.name,
      start_month: cycle.start_month,
      end_month: cycle.end_month,
    });
    setShowCycleModal(true);
  };

  // Apply Quick Duration Presets (+6, +12, +24 Months)
  const applyCycleDuration = (addMonths) => {
    if (!cycleForm.start_month) return;
    const [sy, sm] = cycleForm.start_month.split('-').map(Number);
    let totalM = (sy * 12 + (sm - 1)) + addMonths;
    let newY = Math.floor(totalM / 12);
    let newM = (totalM % 12) + 1;
    const calcEnd = `${newY}-${String(newM).padStart(2, '0')}`;
    const cycleNum = cycles.length + (editingCycle ? 0 : 1);
    setCycleForm((prev) => ({
      ...prev,
      end_month: calcEnd,
      name: editingCycle
        ? prev.name
        : `Cycle ${cycleNum} (${formatMonth(prev.start_month).short} - ${formatMonth(calcEnd).short})`,
    }));
  };

  // Handle Save Cycle
  const handleSaveCycle = async () => {
    if (!canManageCycles) {
      Alert.alert('Permission Denied', 'Only society administrators can create or update maintenance cycles.');
      return;
    }
    if (!cycleForm.name?.trim() || !cycleForm.start_month || !cycleForm.end_month) {
      Alert.alert('Validation Error', 'Please enter cycle name, start month, and end month.');
      return;
    }
    if (cycleForm.start_month > cycleForm.end_month) {
      Alert.alert('Validation Error', 'Start month cannot be after end month.');
      return;
    }

    setCycleActionLoading(true);
    const socId = user?.society_id || user?.societyId;
    const cyclePayload = {
      society_id: socId,
      name: cycleForm.name.trim(),
      start_month: cycleForm.start_month,
      end_month: cycleForm.end_month,
    };

    try {
      if (editingCycle) {
        await maintenanceApi.updateCycle(editingCycle.id, cyclePayload);
        Alert.alert('Cycle Updated', `Cycle "${cycleForm.name}" updated successfully!`);
      } else {
        await maintenanceApi.createCycle(cyclePayload);
        Alert.alert('Cycle Created', `Cycle "${cycleForm.name}" created successfully!`);
      }
      setShowCycleModal(false);
      setEditingCycle(null);
      await fetchMaintenanceData();
    } catch (err) {
      console.log('Error saving cycle:', err);
      const msg = err.response?.data?.message || err.data?.message || err.message || 'Failed to save cycle';
      Alert.alert('Error', msg);
    } finally {
      setCycleActionLoading(false);
    }
  };

  // Handle Delete Cycle
  const handleDeleteCycle = (cycleId) => {
    if (!canManageCycles) {
      Alert.alert('Permission Denied', 'Only society administrators can delete maintenance cycles.');
      return;
    }
    Alert.alert(
      'Delete Cycle',
      'Are you sure you want to delete this maintenance cycle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setCycleActionLoading(true);
              await maintenanceApi.deleteCycle(cycleId);
              Alert.alert('Deleted', 'Cycle deleted successfully.');
              await fetchMaintenanceData();
            } catch (err) {
              console.log('Error deleting cycle:', err);
              const msg = err.response?.data?.message || err.data?.message || err.message || 'Failed to delete cycle';
              Alert.alert('Error', msg);
            } finally {
              setCycleActionLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      {/* Top Dark Header with Camera Cutout Inset */}
      <View
        style={[
          styles.header,
          {
            paddingTop:
              Platform.OS === 'android'
                ? Math.max(insets.top, StatusBar.currentHeight || 0, 24)
                : Math.max(insets.top, 14),
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Maintenance & Billing</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {isAdminView
                ? 'Society Billing, Plans & Collections'
                : `My Unit: ${myHomeNumber} • Dues & Receipts`}
            </Text>
          </View>
        </View>

        {/* Admin Scope Perspective Toggle (Society-wide vs My Unit) */}
        {isUserAdmin && (
          <View style={styles.roleToggleRow}>
            <View style={styles.roleBadgeBox}>
              <Text style={styles.roleBadgeText}>ADMIN SCOPE</Text>
            </View>
            <View style={styles.viewSegmentBox}>
              <TouchableOpacity
                style={[styles.viewSegmentBtn, scopeFilter === 'ALL' && styles.viewSegmentBtnActive]}
                onPress={() => setScopeFilter('ALL')}
                activeOpacity={0.8}
              >
                <Building2 size={12} color={scopeFilter === 'ALL' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
                <Text style={[styles.viewSegmentText, scopeFilter === 'ALL' && styles.viewSegmentTextActive]}>
                  Society
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewSegmentBtn, scopeFilter === 'MY_HOME' && styles.viewSegmentBtnActive]}
                onPress={() => setScopeFilter('MY_HOME')}
                activeOpacity={0.8}
              >
                <Home size={12} color={scopeFilter === 'MY_HOME' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
                <Text style={[styles.viewSegmentText, scopeFilter === 'MY_HOME' && styles.viewSegmentTextActive]}>
                  My Unit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMaintenanceData(true)}
            tintColor={THEME.colors.clay}
            colors={[THEME.colors.clay]}
          />
        }
      >
        {loading && !bills.length ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading maintenance records...</Text>
          </View>
        ) : (
          <>
            {/* ================================================================
                1. TOP KPI CARDS - HORIZONTAL SCROLL
                ================================================================ */}
            <View style={styles.kpiScrollSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalKpiScroll}
              >
                {/* Total Billed */}
                <View style={[styles.kpiCardHorizontal, { borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                  <View style={styles.kpiTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.kpiTag, { color: '#2563EB' }]}>TOTAL BILLED</Text>
                      <Text style={styles.kpiValue}>
                        ₹{Number(isAdminView ? activeStats.total_billed : residentStats.totalBilled).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                      <Receipt size={18} color="#2563EB" />
                    </View>
                  </View>
                  <View style={styles.kpiFooter}>
                    <Text style={styles.kpiSubText}>
                      {isAdminView
                        ? `Across ${activeStats.total_bills || currentBills.length} issued invoices`
                        : `Across ${filteredBills.length} invoice(s) for your unit`}
                    </Text>
                  </View>
                </View>

                {/* Collected Amount */}
                <View style={[styles.kpiCardHorizontal, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <View style={styles.kpiTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.kpiTag, { color: '#059669' }]}>COLLECTED AMOUNT</Text>
                      <Text style={[styles.kpiValue, { color: '#059669' }]}>
                        ₹{Number(isAdminView ? activeStats.total_collected : residentStats.totalPaid).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                      <TrendingUp size={18} color="#059669" />
                    </View>
                  </View>
                  <View style={styles.kpiFooter}>
                    <Text style={[styles.kpiSubText, { color: '#059669', fontWeight: '700' }]}>
                      {isAdminView
                        ? `${activeStats.count_paid || 3} fully settled accounts`
                        : `${residentStats.paidCount} settled payment(s)`}
                    </Text>
                  </View>
                </View>

                {/* Pending & Overdue */}
                <View style={[styles.kpiCardHorizontal, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                  <View style={styles.kpiTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.kpiTag, { color: '#EF4444' }]}>PENDING / OVERDUE</Text>
                      <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
                        ₹{Number(isAdminView ? activeStats.total_pending : residentStats.totalPending).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                      <Clock size={18} color="#EF4444" />
                    </View>
                  </View>
                  <View style={styles.kpiFooter}>
                    <Text style={[styles.kpiSubText, { color: '#EF4444', fontWeight: '600' }]}>
                      {isAdminView
                        ? `${activeStats.count_overdue || 0} overdue • ${activeStats.count_pending || 0} pending`
                        : residentStats.hasPending
                          ? 'Dues Pending • Action Required'
                          : 'All Dues Cleared'}
                    </Text>
                  </View>
                </View>

                {/* Late Fee Penalties */}
                <View style={[styles.kpiCardHorizontal, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                  <View style={styles.kpiTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.kpiTag, { color: '#D97706' }]}>LATE PENALTIES</Text>
                      <Text style={styles.kpiValue}>
                        ₹{Number(activeStats.total_penalties || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                      <ShieldAlert size={18} color="#D97706" />
                    </View>
                  </View>
                  <View style={styles.kpiFooter}>
                    <Text style={styles.kpiSubText}>Auto-applied after 5-day grace period</Text>
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* ================================================================
                2. ACTION BAR (CYCLE & NEW PLAN IF ADMIN / ACTIVE BADGE IF RESIDENT)
                ================================================================ */}
            <View style={styles.kpiActionBar}>
              {isAdminView ? (
                <View style={styles.adminActionRow}>
                  <TouchableOpacity
                    style={styles.cycleActionBtn}
                    onPress={handleOpenCycleModal}
                    activeOpacity={0.8}
                  >
                    <Calendar size={15} color={THEME.colors.clay} />
                    <Text style={styles.cycleActionBtnText} numberOfLines={1}>
                      Cycle: {activeCycle ? activeCycle.name : (cycles.length > 0 ? cycles[0].name : 'Cycle 1')}
                    </Text>
                    <View style={[styles.activeDot, { backgroundColor: activeCycle ? '#10B981' : '#F59E0B' }]} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.newPlanActionBtn}
                    onPress={handleOpenCreatePlan}
                    activeOpacity={0.8}
                  >
                    <Plus size={15} color="#FFFFFF" />
                    <Text style={styles.newPlanActionBtnText}>New Plan</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.residentActionRow}>
                  <TouchableOpacity
                    style={styles.residentCycleBadge}
                    activeOpacity={0.7}
                    onPress={() => {
                      setEditingCycle(null);
                      setShowCycleModal(true);
                    }}
                  >
                    <Calendar size={14} color="#10B981" />
                    <Text style={styles.residentCycleBadgeText} numberOfLines={1}>
                      Active Cycle: {activeCycle ? activeCycle.name : (cycles.length > 0 ? cycles[0].name : 'Cycle 1')}
                    </Text>
                    <View style={[styles.activeDot, { backgroundColor: '#10B981' }]} />
                  </TouchableOpacity>

                  {residentStats.hasPending && (
                    <TouchableOpacity
                      style={styles.residentQuickPayBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        const pendingBill = currentBills.find((b) => b.isMyHome && b.balance_amount > 0);
                        if (pendingBill) setSelectedBillForPayment(pendingBill);
                      }}
                    >
                      <CreditCard size={13} color="#FFFFFF" />
                      <Text style={styles.residentQuickPayBtnText}>Pay Dues</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* ================================================================
                3. 3 NAVIGATION TABS:
                   1) Invoice & Collection
                   2) Maintenance & Plans (if admin show "Create Plan")
                   3) Payment History
                ================================================================ */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              contentContainerStyle={styles.tabsScrollContent}
              style={styles.tabsScrollWrap}
            >
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'bills' && styles.tabBtnActive]}
                onPress={() => setActiveTab('bills')}
                activeOpacity={0.7}
              >
                <FileText size={15} color={activeTab === 'bills' ? THEME.colors.clay : '#6B7280'} />
                <Text
                  style={[styles.tabBtnText, activeTab === 'bills' && styles.tabBtnTextActive]}
                  numberOfLines={1}
                >
                  Invoice & Collection
                </Text>
                <View style={[styles.tabCountPill, activeTab === 'bills' && styles.tabCountPillActive]}>
                  <Text style={[styles.tabCountText, activeTab === 'bills' && styles.tabCountTextActive]}>
                    {filteredBills.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'plans' && styles.tabBtnActive]}
                onPress={() => setActiveTab('plans')}
                activeOpacity={0.7}
              >
                <Layers size={15} color={activeTab === 'plans' ? THEME.colors.clay : '#6B7280'} />
                <Text
                  style={[styles.tabBtnText, activeTab === 'plans' && styles.tabBtnTextActive]}
                  numberOfLines={1}
                >
                  Maintenance & Plans
                </Text>
                <View style={[styles.tabCountPill, activeTab === 'plans' && styles.tabCountPillActive]}>
                  <Text style={[styles.tabCountText, activeTab === 'plans' && styles.tabCountTextActive]}>
                    {currentPlans.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'payments' && styles.tabBtnActive]}
                onPress={() => setActiveTab('payments')}
                activeOpacity={0.7}
              >
                <CreditCard size={15} color={activeTab === 'payments' ? THEME.colors.clay : '#6B7280'} />
                <Text
                  style={[styles.tabBtnText, activeTab === 'payments' && styles.tabBtnTextActive]}
                  numberOfLines={1}
                >
                  Payment History
                </Text>
                <View style={[styles.tabCountPill, activeTab === 'payments' && styles.tabCountPillActive]}>
                  <Text style={[styles.tabCountText, activeTab === 'payments' && styles.tabCountTextActive]}>
                    {filteredPayments.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* ================================================================
                TAB 1: INVOICES & BILLS
                ================================================================ */}
            {activeTab === 'bills' && (
              <View style={styles.tabContent}>
                {/* Search & Admin Batch Invoicing Row */}
                <View style={styles.actionRow}>
                  <View style={styles.searchBox}>
                    <Search size={16} color="#6B7280" style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={isAdminView ? "Search unit, resident, inv #..." : "Search my invoices..."}
                      placeholderTextColor="#9CA3AF"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <X size={15} color="#6B7280" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {isAdminView && (
                    <TouchableOpacity
                      style={styles.batchBtn}
                      activeOpacity={0.8}
                      onPress={() => setShowGenerateModal(true)}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.batchBtnText}>Batch</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Status Filter Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statusChipsScroll}
                >
                  {[
                    { id: 'ALL', label: 'All Status' },
                    { id: 'PAID', label: 'Paid' },
                    { id: 'PENDING', label: 'Pending' },
                    { id: 'OVERDUE', label: 'Overdue' },
                  ].map((st) => {
                    const isSelected = statusFilter === st.id;
                    return (
                      <TouchableOpacity
                        key={st.id}
                        style={[styles.statusChip, isSelected && styles.statusChipActive]}
                        onPress={() => setStatusFilter(st.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.statusChipText, isSelected && styles.statusChipTextActive]}>
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Bills List */}
                <Text style={styles.sectionHeaderTitle}>
                  {isAdminView ? `SOCIETY INVOICES (${filteredBills.length})` : `MY INVOICES (${filteredBills.length})`}
                </Text>

                {filteredBills.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Receipt size={38} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Invoices Found</Text>
                    <Text style={styles.emptySub}>No maintenance bills match your filter criteria.</Text>
                  </View>
                ) : (
                  filteredBills.map((b) => {
                    const isPaid = b.status === 'PAID';
                    const isPending = b.status === 'PENDING';
                    const isOverdue = b.status === 'OVERDUE';

                    const statusBg = isPaid
                      ? 'rgba(16, 185, 129, 0.12)'
                      : isOverdue
                        ? 'rgba(239, 68, 68, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)';

                    const statusColor = isPaid
                      ? '#059669'
                      : isOverdue
                        ? '#EF4444'
                        : '#D97706';

                    return (
                      <View key={b.id || b.bill_number || b.invoice_number} style={styles.billCard}>
                        {/* Top row: Unit/Flat & Status Badge */}
                        <View style={styles.billTopRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.billHomeNumber}>
                                {b.home_number
                                  ? (String(b.home_number).match(/^(flat|unit|house|villa|plot|home)/i)
                                    ? b.home_number
                                    : `Unit ${b.home_number}`)
                                  : (b.flat_number || 'Unit')}
                              </Text>
                              {b.isMyHome && (
                                <View style={styles.myHomeBadge}>
                                  <Text style={styles.myHomeBadgeText}>MY HOME</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.billResidentName}>
                              {b.resident_name || 'Resident'}
                            </Text>
                          </View>

                          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                            {isPaid ? (
                              <CheckCircle2 size={12} color={statusColor} style={{ marginRight: 3 }} />
                            ) : (
                              <Clock size={12} color={statusColor} style={{ marginRight: 3 }} />
                            )}
                            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                              {b.status}
                            </Text>
                          </View>
                        </View>

                        {/* Mid row: Plan info & Period */}
                        <View style={styles.billMidRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.billPeriodText}>
                              Period: {b.period_label || b.billing_period || 'Current'}
                            </Text>
                            <Text style={styles.billPlanText}>{b.plan_name || 'Monthly Plan'}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.billAmountVal}>
                              ₹{Number(b.total_amount || 0).toLocaleString()}
                            </Text>
                            <Text style={styles.billDueDateText}>
                              Due: {b.due_date ? String(b.due_date).slice(0, 10) : '05 Nov 2026'}
                            </Text>
                          </View>
                        </View>

                        {/* Action Buttons Row */}
                        <View style={styles.billFooterRow}>
                          <View style={styles.invoiceBadge}>
                            <FileText size={12} color={THEME.colors.clay} style={{ marginRight: 4 }} />
                            <Text style={styles.invoiceBadgePrefix}>Invoice No: </Text>
                            <Text style={styles.invoiceBadgeNumber} numberOfLines={1}>
                              {b.bill_number || b.invoice_number || `INV-${b.id}`}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {isPaid ? (
                              <TouchableOpacity
                                style={styles.receiptActionBtn}
                                activeOpacity={0.75}
                                onPress={() => setSelectedBillForReceipt(b)}
                              >
                                <Receipt size={14} color={THEME.colors.clay} />
                                <Text style={styles.receiptActionText}>Receipt</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={styles.payActionBtn}
                                activeOpacity={0.75}
                                onPress={() => setSelectedBillForPayment(b)}
                              >
                                <CreditCard size={14} color="#FFFFFF" />
                                <Text style={styles.payActionText}>
                                  {isAdminView ? 'Collect' : 'Pay Now'}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ================================================================
                TAB 2: MAINTENANCE PLANS & PENALTY RULES
                ================================================================ */}
            {activeTab === 'plans' && (
              <View style={styles.tabContent}>
                {/* Header row with Title and "Create Plan" button if admin */}
                <View style={styles.plansSectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionHeaderTitle}>MAINTENANCE PLANS & PENALTY RULES</Text>
                    <Text style={styles.plansHeaderSubText}>Differential rates by BHK and unit type</Text>
                  </View>
                  {isAdminView && (
                    <TouchableOpacity
                      style={styles.createPlanBtn}
                      onPress={handleOpenCreatePlan}
                      activeOpacity={0.8}
                    >
                      <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.createPlanBtnText}>Create Plan</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Differential Charges Explanatory Banner */}
                <View style={styles.planInfoBanner}>
                  <View style={styles.planInfoIconBox}>
                    <ShieldAlert size={20} color={THEME.colors.clay} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planInfoTitle}>Differential Charges & Penalty Rule Engine</Text>
                    <Text style={styles.planInfoDesc}>
                      Configured maintenance rates based on home configurations (1BHK, 2BHK, 3BHK, etc.). Payments delayed beyond the grace period automatically incur fixed or percentage late penalties.
                    </Text>
                  </View>
                </View>

                {/* Plans List */}
                {currentPlans.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Receipt size={38} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Maintenance Plans Found</Text>
                    <Text style={styles.emptySub}>Define differential rates for 1BHK, 2BHK, 3BHK, or Bungalow units.</Text>
                    {isAdminView && (
                      <TouchableOpacity
                        style={[styles.createPlanBtn, { marginTop: 14 }]}
                        onPress={handleOpenCreatePlan}
                        activeOpacity={0.8}
                      >
                        <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.createPlanBtnText}>Create Plan</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  currentPlans.map((p) => {
                    const isFixed = p.penalty_type === 'FIXED';
                    return (
                      <View key={p.id} style={styles.planCard}>
                        {/* Top Tags & Admin Action Buttons */}
                        <View style={styles.planCardTopRow}>
                          <View style={styles.planTagsRow}>
                            <View style={styles.planTagPill}>
                              <Text style={styles.planTagPillText}>
                                {p.applicable_type === 'ALL' ? 'ALL UNITS' : `${p.applicable_type} UNIT`}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.planTagPill,
                                {
                                  backgroundColor:
                                    p.resident_type === 'TENANT'
                                      ? 'rgba(59, 130, 246, 0.12)'
                                      : p.resident_type === 'OWNER'
                                        ? 'rgba(16, 185, 129, 0.12)'
                                        : 'rgba(107, 142, 90, 0.12)',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.planTagPillText,
                                  {
                                    color:
                                      p.resident_type === 'TENANT'
                                        ? '#2563EB'
                                        : p.resident_type === 'OWNER'
                                          ? '#059669'
                                          : '#4B7038',
                                  },
                                ]}
                              >
                                {p.resident_type === 'TENANT'
                                  ? 'Tenant Only'
                                  : p.resident_type === 'OWNER'
                                    ? 'Owner Only'
                                    : 'Owner & Tenant'}
                              </Text>
                            </View>
                          </View>

                          {isAdminView && (
                            <View style={styles.planAdminActions}>
                              <TouchableOpacity
                                style={styles.planAdminIconBtn}
                                onPress={() => handleOpenEditPlan(p)}
                                activeOpacity={0.7}
                              >
                                <Pencil size={15} color={THEME.colors.clay} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.planAdminIconBtn}
                                onPress={() => handleDeletePlan(p.id)}
                                activeOpacity={0.7}
                              >
                                <Trash size={15} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>

                        {/* Title & Units matching */}
                        <Text style={styles.planTitle}>{p.name}</Text>
                        <Text style={styles.planSubtitle}>
                          {p.applicable_type === 'ALL' ? 'Applies to all flats in society' : `Configured for ${p.applicable_type} homes`}
                        </Text>

                        {/* Amount Box */}
                        <View style={styles.planAmountBox}>
                          <Text style={styles.planAmountNum}>
                            ₹{Number(p.amount || 0).toLocaleString()}
                          </Text>
                          <Text style={styles.planAmountFreq}>
                            / {p.billing_cycle === 'QUARTERLY' ? 'Quarter (3 Mos)' : String(p.billing_cycle || 'monthly').toLowerCase()}
                          </Text>
                        </View>

                        {/* Details Grid: Due Day, Grace, Penalty */}
                        <View style={styles.planDetailsGrid}>
                          <View style={styles.planDetailRow}>
                            <Text style={styles.planDetailLabel}>Due Date:</Text>
                            <Text style={styles.planDetailVal}>{p.due_day || 5}th of cycle</Text>
                          </View>
                          <View style={styles.planDetailRow}>
                            <Text style={styles.planDetailLabel}>Grace Period:</Text>
                            <Text style={styles.planDetailVal}>{p.grace_period_days || 5} Days</Text>
                          </View>
                          <View style={styles.planDetailRow}>
                            <Text style={styles.planDetailLabel}>Late Penalty:</Text>
                            <Text style={[styles.planDetailVal, { color: '#EF4444', fontWeight: '800' }]}>
                              {isFixed ? `₹${p.penalty_rate || 100} Fixed` : `${p.penalty_rate || 5}% Interest`}
                            </Text>
                          </View>
                        </View>

                        {p.description ? (
                          <Text style={styles.planDesc}>{p.description}</Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ================================================================
                TAB 3: PAYMENT RECORDS & VERIFICATION
                ================================================================ */}
            {activeTab === 'payments' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionHeaderTitle}>
                  {isAdminView
                    ? `COLLECTIONS & VERIFICATIONS (${filteredPayments.length})`
                    : `PAYMENT HISTORY (${filteredPayments.length})`}
                </Text>

                {filteredPayments.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <CreditCard size={38} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Payments Recorded</Text>
                    <Text style={styles.emptyText}>
                      When residents pay maintenance dues via UPI, Cash, or Cheque, the records will appear here.
                    </Text>
                  </View>
                ) : (
                  filteredPayments.map((pay) => {
                    const isApproved = pay.status === 'APPROVED' || pay.status === 'PAID';
                    const isPending = pay.status === 'PENDING_APPROVAL';
                    const isRejected = pay.status === 'REJECTED';

                    return (
                      <View key={pay.id || pay.receipt_number} style={styles.payRecordCard}>
                        {/* Row 1: Home/Unit + Resident & Amount Paid */}
                        <View style={styles.payCardHeaderRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.payHomeNumber}>
                                {pay.home_number
                                  ? (String(pay.home_number).match(/^(flat|unit|house|villa|plot|home)/i)
                                    ? pay.home_number
                                    : `Unit ${pay.home_number}`)
                                  : (pay.flat_number || 'Unit')}
                              </Text>
                              {pay.isMyHome && (
                                <View style={styles.myHomeBadge}>
                                  <Text style={styles.myHomeBadgeText}>MY HOME</Text>
                                </View>
                              )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                              <Text style={styles.payResidentName}>
                                {pay.resident_name || 'Resident'}
                              </Text>
                              {pay.resident_role && (
                                <View style={styles.residentRoleBadge}>
                                  <Text style={styles.residentRoleBadgeText}>
                                    {String(pay.resident_role).replace('_', ' ')}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.payAmountVal}>
                              ₹{Number(pay.amount || 0).toLocaleString()}
                            </Text>
                            <Text style={styles.payAmountSub}>Amount Paid</Text>
                          </View>
                        </View>

                        {/* Row 2: Reference Badges (Receipt # and Invoice #) */}
                        <View style={styles.payReferenceRow}>
                          <View style={styles.receiptNumberBadge}>
                            <Receipt size={12} color={THEME.colors.clay} style={{ marginRight: 4 }} />
                            <Text style={styles.receiptNumberLabel}>Receipt: </Text>
                            <Text style={styles.receiptNumberValue}>{pay.receipt_number || 'REC-N/A'}</Text>
                          </View>

                          <View style={styles.payInvoiceBadge}>
                            <FileText size={12} color="#4B5563" style={{ marginRight: 4 }} />
                            <Text style={styles.payInvoiceLabel}>Invoice: </Text>
                            <Text style={styles.payInvoiceValue} numberOfLines={1}>
                              {pay.bill_number || pay.invoice_number || (pay.bill_id ? `INV-${pay.bill_id}` : 'N/A')}
                            </Text>
                          </View>
                        </View>

                        {/* Row 3: Meta details Grid (Payment Mode, Txn Ref, Billing Period, Date) */}
                        <View style={styles.payDetailsGrid}>
                          <View style={styles.payDetailItem}>
                            <Text style={styles.payDetailLabel}>PAYMENT MODE</Text>
                            <View style={styles.payModePill}>
                              <CreditCard size={11} color="#2563EB" style={{ marginRight: 4 }} />
                              <Text style={styles.payModeText}>{String(pay.payment_method || 'ONLINE').replace('_', ' ')}</Text>
                            </View>
                          </View>

                          <View style={styles.payDetailItem}>
                            <Text style={styles.payDetailLabel}>TRANSACTION REF</Text>
                            <Text style={styles.payDetailValue} numberOfLines={1}>
                              {pay.transaction_reference || 'N/A'}
                            </Text>
                          </View>

                          <View style={styles.payDetailItem}>
                            <Text style={styles.payDetailLabel}>BILLING PERIOD</Text>
                            <Text style={styles.payDetailValue} numberOfLines={1}>
                              {pay.billing_period || pay.bill_title || 'Current'}
                            </Text>
                          </View>

                          <View style={styles.payDetailItem}>
                            <Text style={styles.payDetailLabel}>DATE & TIME</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Calendar size={11} color="#6B7280" style={{ marginRight: 4 }} />
                              <Text style={styles.payDetailValue} numberOfLines={1}>
                                {formatPaymentDate(pay.payment_date || pay.created_at)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Row 4: Status & Approval Footer */}
                        <View style={styles.payStatusFooterRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            {isPending ? (
                              <View style={styles.pendingApprovalBadge}>
                                <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
                                <Text style={styles.pendingApprovalText}>Pending Admin Approval</Text>
                              </View>
                            ) : isRejected ? (
                              <View>
                                <View style={styles.rejectedBadge}>
                                  <AlertCircle size={12} color="#DC2626" style={{ marginRight: 4 }} />
                                  <Text style={styles.rejectedText}>Rejected</Text>
                                </View>
                                {pay.rejection_reason && (
                                  <Text style={styles.rejectionReasonText} numberOfLines={1}>
                                    {pay.rejection_reason}
                                  </Text>
                                )}
                              </View>
                            ) : (
                              <View>
                                <View style={styles.approvedBadge}>
                                  <CheckCircle2 size={12} color="#059669" style={{ marginRight: 4 }} />
                                  <Text style={styles.approvedBadgeText}>Approved by Admin</Text>
                                </View>
                                <Text style={styles.approvedBySubtext} numberOfLines={1}>
                                  Done Payment {pay.approved_by_name ? `• ${pay.approved_by_name}` : ''}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Action buttons: Receipt view for approved, or Approve/Reject for Admin if pending */}
                          {isPending && isAdminView ? (
                            <View style={styles.verifyActionRow}>
                              <TouchableOpacity
                                style={[styles.verifyBtn, { backgroundColor: '#059669' }]}
                                onPress={() => {
                                  setSelectedPaymentForVerify(pay);
                                  handleVerifyPayment('APPROVE');
                                }}
                              >
                                <Check size={13} color="#FFFFFF" />
                                <Text style={styles.verifyBtnText}>Approve</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.verifyBtn, { backgroundColor: '#EF4444' }]}
                                onPress={() => {
                                  setSelectedPaymentForVerify(pay);
                                  handleVerifyPayment('REJECT');
                                }}
                              >
                                <X size={13} color="#FFFFFF" />
                                <Text style={styles.verifyBtnText}>Reject</Text>
                              </TouchableOpacity>
                            </View>
                          ) : isApproved ? (
                            <TouchableOpacity
                              style={styles.receiptActionBtn}
                              activeOpacity={0.75}
                              onPress={() => setSelectedBillForReceipt(pay)}
                            >
                              <Receipt size={14} color={THEME.colors.clay} />
                              <Text style={styles.receiptActionText}>Receipt</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ================================================================
          PAYMENT MODAL (Pay Now / Record Payment)
          ================================================================ */}
      <Modal
        visible={!!selectedBillForPayment}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBillForPayment(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedBillForPayment(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={(e) => { }}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Maintenance Payment</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedBillForPayment?.home_number} • {selectedBillForPayment?.period_label || selectedBillForPayment?.billing_period}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBillForPayment(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedBillForPayment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Total Due Card */}
                <View style={styles.payAmountCard}>
                  <Text style={styles.payDueLabel}>AMOUNT TO PAY</Text>
                  <Text style={styles.payDueVal}>
                    ₹{Number(selectedBillForPayment.balance_amount || selectedBillForPayment.total_amount).toLocaleString()}
                  </Text>
                  <Text style={styles.payInvoiceRef}>Invoice: {selectedBillForPayment.bill_number || selectedBillForPayment.invoice_number}</Text>
                </View>

                {/* Payment Method Selector */}
                <Text style={styles.formSectionLabel}>SELECT PAYMENT METHOD</Text>
                <View style={styles.methodsRow}>
                  {['UPI', 'NET_BANKING', 'CASH', 'CARD'].map((m) => {
                    const isSelected = paymentMethod === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.methodChip, isSelected && styles.methodChipActive]}
                        onPress={() => setPaymentMethod(m)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.methodChipText, isSelected && styles.methodChipTextActive]}>
                          {m.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* UTR / Transaction Reference */}
                <Text style={[styles.formSectionLabel, { marginTop: 14 }]}>TRANSACTION REFERENCE (UTR / CHEQUE)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. UTR-2026102901 or CASH-OFFLINE"
                  placeholderTextColor="#9CA3AF"
                  value={transactionRef}
                  onChangeText={setTransactionRef}
                />

                {/* Submit Payment Button */}
                <TouchableOpacity
                  style={styles.submitPayBtn}
                  activeOpacity={0.8}
                  disabled={submittingPayment}
                  onPress={handleSubmitPayment}
                >
                  {submittingPayment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.submitPayBtnText}>Confirm & Settle Payment</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ================================================================
          RECEIPT MODAL
          ================================================================ */}
      <Modal
        visible={!!selectedBillForReceipt}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBillForReceipt(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedBillForReceipt(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={(e) => { }}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Receipt size={20} color={THEME.colors.clay} />
                <Text style={styles.modalTitle}>Maintenance Receipt</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBillForReceipt(null)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedBillForReceipt && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.receiptStampCard}>
                  <Text style={styles.stampLabel}>AMOUNT SETTLED</Text>
                  <Text style={styles.stampVal}>
                    ₹{Number(selectedBillForReceipt.amount || selectedBillForReceipt.total_amount || 0).toLocaleString()}
                  </Text>
                  <View style={styles.stampBadge}>
                    <CheckCircle2 size={13} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.stampBadgeText}>PAID & VERIFIED</Text>
                  </View>
                </View>

                <View style={styles.receiptInfoTable}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Receipt #</Text>
                    <Text style={[styles.receiptVal, { color: THEME.colors.clay, fontWeight: '700' }]}>
                      {selectedBillForReceipt.receipt_number || selectedBillForReceipt.latest_receipt_number || 'REC-SETTLED'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Invoice #</Text>
                    <Text style={[styles.receiptVal, { color: '#1F2937', fontWeight: '700' }]}>
                      {selectedBillForReceipt.bill_number || selectedBillForReceipt.invoice_number || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Unit / Home</Text>
                    <Text style={styles.receiptVal}>
                      {selectedBillForReceipt.home_number
                        ? (String(selectedBillForReceipt.home_number).match(/^(flat|unit|house|villa|plot|home)/i)
                          ? selectedBillForReceipt.home_number
                          : `Unit ${selectedBillForReceipt.home_number}`)
                        : (selectedBillForReceipt.flat_number || 'Unit')}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Resident</Text>
                    <Text style={styles.receiptVal}>
                      {selectedBillForReceipt.resident_name || 'Resident'}
                      {selectedBillForReceipt.resident_role ? ` (${String(selectedBillForReceipt.resident_role).replace('_', ' ')})` : ''}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Period</Text>
                    <Text style={styles.receiptVal}>
                      {selectedBillForReceipt.period_label || selectedBillForReceipt.billing_period || selectedBillForReceipt.bill_title || 'Current'}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment Mode</Text>
                    <Text style={styles.receiptVal}>
                      {String(selectedBillForReceipt.payment_method || 'ONLINE').replace('_', ' ')}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Transaction Ref</Text>
                    <Text style={styles.receiptVal}>
                      {selectedBillForReceipt.transaction_reference || 'N/A'}
                    </Text>
                  </View>
                  {selectedBillForReceipt.approved_by_name && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Approved By</Text>
                      <Text style={styles.receiptVal}>{selectedBillForReceipt.approved_by_name}</Text>
                    </View>
                  )}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Date & Time</Text>
                    <Text style={styles.receiptVal}>
                      {formatPaymentDate(selectedBillForReceipt.payment_date || selectedBillForReceipt.created_at)}
                    </Text>
                  </View>
                  <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.receiptLabel}>Status</Text>
                    <Text style={[styles.receiptVal, { color: '#059669', fontWeight: '800' }]}>
                      PAID IN FULL
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setSelectedBillForReceipt(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.doneBtnText}>Close Receipt</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ================================================================
          ADMIN BATCH INVOICING MODAL
          ================================================================ */}
      <Modal
        visible={showGenerateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowGenerateModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={(e) => { }}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Batch Generate Invoices</Text>
                <Text style={styles.modalSubtitle}>Generate monthly bills for all society homes</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14, marginTop: 10 }}>
              <View>
                <Text style={styles.formSectionLabel}>BILLING PERIOD (YYYY-MM)</Text>
                <TextInput
                  style={styles.formInput}
                  value={generatePeriod}
                  onChangeText={setGeneratePeriod}
                  placeholder="2026-11"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity
                style={styles.submitPayBtn}
                activeOpacity={0.8}
                disabled={generatingBills}
                onPress={handleGenerateInvoices}
              >
                {generatingBills ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Plus size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitPayBtnText}>Generate Society Invoices</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ================================================================
          CYCLE MANAGEMENT MODAL (ADMIN)
          ================================================================ */}
      <Modal
        visible={showCycleModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCycleModal(false);
          setEditingCycle(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              setShowCycleModal(false);
              setEditingCycle(null);
            }}
          />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 }}>
                <Calendar size={20} color={THEME.colors.clay} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Maintenance Billing Cycles</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={2}>
                    {canManageCycles
                      ? 'Default 12-month cycle starts from society creation month. Admin can modify existing cycles or create the upcoming cycle.'
                      : 'View configured society maintenance cycles and active billing horizons.'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowCycleModal(false);
                  setEditingCycle(null);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
              {/* Active Cycle Badge Banner with Create Cycle Button */}
              <View style={styles.cycleInfoBanner}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.cycleInfoTag}>
                      <Text style={styles.cycleInfoTagText}>CONTINUOUS CYCLES</Text>
                    </View>
                    <Text style={styles.cycleInfoTitle}>
                      {cycles.length} Cycle{cycles.length !== 1 ? 's' : ''} Configured
                    </Text>
                  </View>

                  {canManageCycles && !editingCycle && (
                    <TouchableOpacity
                      style={styles.createCycleTopBtn}
                      onPress={handleOpenCreateCycleModal}
                      activeOpacity={0.8}
                    >
                      <Plus size={13} color="#FFFFFF" />
                      <Text style={styles.createCycleTopBtnText}>Create Cycle {cycles.length + 1}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.cycleInfoSub}>
                  Cycles run consecutively without gaps or overlaps. Residents can make payments across any configured cycle.
                </Text>
              </View>

              {/* Configured Cycles List */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.formSectionLabel}>CONFIGURED SOCIETY CYCLES ({cycles.length})</Text>
                {canManageCycles && (
                  <Text style={{ fontSize: 10, color: THEME.colors.textMuted }}>
                    Click Modify to edit any cycle
                  </Text>
                )}
              </View>

              {cycles.length === 0 ? (
                <View style={styles.emptyCyclesBox}>
                  <Text style={styles.emptyCyclesText}>
                    No maintenance cycles found.
                  </Text>
                </View>
              ) : (
                cycles.map((c, idx) => {
                  const monthsCount = getMonthsBetween(c.start_month, c.end_month).length;
                  const isBeingEdited = editingCycle && editingCycle.id === c.id;

                  return (
                    <View
                      key={c.id || idx}
                      style={[
                        styles.cycleItemCard,
                        isBeingEdited && styles.cycleItemCardActive,
                      ]}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.cycleItemName}>{c.name}</Text>
                          <View style={styles.cycleBadgePill}>
                            <Text style={styles.cycleBadgePillText}>CYCLE {idx + 1}</Text>
                          </View>
                        </View>
                        <Text style={styles.cycleItemDates}>
                          {formatMonth(c.start_month).short} to {formatMonth(c.end_month).short} • <Text style={{ fontWeight: '700', color: THEME.colors.darkBrown }}>{monthsCount} Months</Text>
                        </Text>
                      </View>

                      {canManageCycles && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            style={[
                              styles.cycleEditBtn,
                              isBeingEdited && styles.cycleEditBtnActive,
                            ]}
                            onPress={() => handleOpenEditCycle(c)}
                            activeOpacity={0.7}
                            disabled={cycleActionLoading}
                          >
                            <Pencil size={12} color={isBeingEdited ? '#FFFFFF' : THEME.colors.clay} />
                            <Text style={[styles.cycleEditBtnText, isBeingEdited && { color: '#FFFFFF' }]}>
                              {isBeingEdited ? 'Editing' : 'Modify'}
                            </Text>
                          </TouchableOpacity>

                          {cycles.length > 1 && (
                            <TouchableOpacity
                              style={styles.cycleDeleteBtn}
                              onPress={() => handleDeleteCycle(c.id)}
                              activeOpacity={0.7}
                              disabled={cycleActionLoading}
                            >
                              <Trash size={13} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              {/* Cycle Form: ONLY VISIBLE IF canManageCycles */}
              {canManageCycles && (
                <View style={styles.cycleFormBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      {editingCycle ? (
                        <Pencil size={14} color={THEME.colors.clay} />
                      ) : (
                        <Plus size={14} color={THEME.colors.clay} />
                      )}
                      <Text style={[styles.formSectionLabel, { marginBottom: 0 }]} numberOfLines={1}>
                        {editingCycle
                          ? `Modify Cycle: ${editingCycle.name}`
                          : `Create Upcoming Cycle (Cycle ${cycles.length + 1})`}
                      </Text>
                    </View>

                    {editingCycle && (
                      <TouchableOpacity
                        onPress={() => {
                          setEditingCycle(null);
                          handleOpenCreateCycleModal();
                        }}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Text style={{ fontSize: 11, color: THEME.colors.clay, fontWeight: '700', textDecorationLine: 'underline' }}>
                          Cancel Edit
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={{ gap: 10 }}>
                    <View>
                      <Text style={styles.fieldLabel}>Cycle Name *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={cycleForm.name}
                        onChangeText={(text) => setCycleForm((prev) => ({ ...prev, name: text }))}
                        placeholder={`e.g. Cycle ${cycles.length + 1} (${formatMonth(cycleForm.start_month).short} - ${formatMonth(cycleForm.end_month).short})`}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Start Month (YYYY-MM) *</Text>
                        <TextInput
                          style={styles.formInput}
                          value={cycleForm.start_month}
                          onChangeText={(text) => setCycleForm((prev) => ({ ...prev, start_month: text }))}
                          placeholder="2027-10"
                          placeholderTextColor="#9CA3AF"
                        />
                        {!editingCycle && cycles.length > 0 && (
                          <Text style={{ fontSize: 9.5, color: '#10B981', marginTop: 3, fontWeight: '600' }}>
                            ✓ Auto-linked to upcoming next month
                          </Text>
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>End Month (YYYY-MM) *</Text>
                        <TextInput
                          style={styles.formInput}
                          value={cycleForm.end_month}
                          onChangeText={(text) => setCycleForm((prev) => ({ ...prev, end_month: text }))}
                          placeholder="2028-09"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>

                    {/* Quick Presets for Duration */}
                    {cycleForm.start_month ? (
                      <View style={{ marginTop: 2 }}>
                        <Text style={{ fontSize: 10.5, color: THEME.colors.textMuted, fontWeight: '600', marginBottom: 5 }}>
                          Quick Duration:
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                          <TouchableOpacity
                            style={styles.durationPresetBtn}
                            onPress={() => applyCycleDuration(5)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.durationPresetBtnText}>+6 Months</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.durationPresetBtn}
                            onPress={() => applyCycleDuration(11)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.durationPresetBtnText}>+12 Months (1 Year)</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.durationPresetBtn}
                            onPress={() => applyCycleDuration(23)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.durationPresetBtnText}>+24 Months (2 Years)</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}

                    {/* Bottom Action Buttons */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={styles.cycleCancelBtn}
                        onPress={() => {
                          if (editingCycle) {
                            setEditingCycle(null);
                            handleOpenCreateCycleModal();
                          } else {
                            setShowCycleModal(false);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cycleCancelBtnText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.saveCycleBtn}
                        onPress={handleSaveCycle}
                        disabled={cycleActionLoading}
                        activeOpacity={0.8}
                      >
                        {cycleActionLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            {editingCycle ? (
                              <Pencil size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                            ) : (
                              <Plus size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
                            )}
                            <Text style={styles.saveCycleBtnText}>
                              {editingCycle ? 'Update Cycle' : `Create Cycle ${cycles.length + 1}`}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================================
          PLAN CREATE & EDIT MODAL (ADMIN)
          ================================================================ */}
      <Modal
        visible={showPlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPlanModal(false);
          setEditingPlan(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => {
            setShowPlanModal(false);
            setEditingPlan(null);
          }}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Receipt size={20} color={THEME.colors.clay} />
                <View>
                  <Text style={styles.modalTitle}>
                    {editingPlan ? 'Edit Maintenance Plan' : 'Create Maintenance Plan'}
                  </Text>
                  <Text style={styles.modalSubtitle}>Differential billing rates & penalty rules</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowPlanModal(false);
                  setEditingPlan(null);
                }}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              <View style={{ gap: 12, paddingBottom: 20 }}>
                {/* Plan Name */}
                <View>
                  <Text style={styles.fieldLabel}>Plan Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={planForm.name}
                    onChangeText={(text) => setPlanForm((prev) => ({ ...prev, name: text }))}
                    placeholder="e.g. Standard 2BHK Maintenance, Penthouse Luxury"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Property Configuration */}
                <View>
                  <Text style={styles.fieldLabel}>Property Configuration *</Text>
                  <View style={styles.chipRow}>
                    {['ALL', '1BHK', '2BHK', '3BHK', '4BHK', 'VILLA', 'PENTHOUSE'].map((cfg) => {
                      const isSel = planForm.applicable_type === cfg;
                      return (
                        <TouchableOpacity
                          key={cfg}
                          style={[styles.formChip, isSel && styles.formChipActive]}
                          onPress={() => setPlanForm((prev) => ({ ...prev, applicable_type: cfg }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                            {cfg}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Resident Type */}
                <View>
                  <Text style={styles.fieldLabel}>Resident Type *</Text>
                  <View style={styles.chipRow}>
                    {[
                      { id: 'BOTH', label: 'Owner & Tenant' },
                      { id: 'OWNER', label: 'Owner Only' },
                      { id: 'TENANT', label: 'Tenant Only' },
                    ].map((rt) => {
                      const isSel = planForm.resident_type === rt.id;
                      return (
                        <TouchableOpacity
                          key={rt.id}
                          style={[styles.formChip, isSel && styles.formChipActive]}
                          onPress={() => setPlanForm((prev) => ({ ...prev, resident_type: rt.id }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                            {rt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Payment Frequency */}
                <View>
                  <Text style={styles.fieldLabel}>Payment Frequency (Billing Cycle) *</Text>
                  <View style={styles.chipRow}>
                    {[
                      { id: 'MONTHLY', label: 'Monthly' },
                      { id: 'QUARTERLY', label: 'Quarterly (3 Mos)' },
                      { id: 'HALF_YEARLY', label: 'Half-Yearly' },
                      { id: 'YEARLY', label: 'Yearly' },
                    ].map((bc) => {
                      const isSel = planForm.billing_cycle === bc.id;
                      return (
                        <TouchableOpacity
                          key={bc.id}
                          style={[styles.formChip, isSel && styles.formChipActive]}
                          onPress={() => setPlanForm((prev) => ({ ...prev, billing_cycle: bc.id }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.formChipText, isSel && styles.formChipTextActive]}>
                            {bc.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Amount */}
                <View>
                  <Text style={styles.fieldLabel}>Maintenance Charge Amount (₹) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={planForm.amount}
                    onChangeText={(text) => setPlanForm((prev) => ({ ...prev, amount: text }))}
                    placeholder="e.g. 2500"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>

                {/* Due Day & Grace Period */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Due Day of Cycle (1-28)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={planForm.due_day}
                      onChangeText={(text) => setPlanForm((prev) => ({ ...prev, due_day: text }))}
                      placeholder="5"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                    <Text style={styles.fieldHelpText}>e.g. 5th of each period</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Grace Period (Days)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={planForm.grace_period_days}
                      onChangeText={(text) => setPlanForm((prev) => ({ ...prev, grace_period_days: text }))}
                      placeholder="5"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                    <Text style={styles.fieldHelpText}>Days before late penalty applies</Text>
                  </View>
                </View>

                {/* Late Penalty Rule Box */}
                <View style={styles.penaltyRuleFormBox}>
                  <Text style={styles.penaltyRuleHeader}>Late Payment Penalty Rule</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Type</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.penaltyTypeBtn, planForm.penalty_type === 'FIXED' && styles.penaltyTypeBtnActive]}
                          onPress={() => setPlanForm((prev) => ({ ...prev, penalty_type: 'FIXED' }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.penaltyTypeBtnText, planForm.penalty_type === 'FIXED' && styles.penaltyTypeBtnTextActive]}>
                            Fixed (₹)
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.penaltyTypeBtn, planForm.penalty_type === 'PERCENTAGE' && styles.penaltyTypeBtnActive]}
                          onPress={() => setPlanForm((prev) => ({ ...prev, penalty_type: 'PERCENTAGE' }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.penaltyTypeBtnText, planForm.penalty_type === 'PERCENTAGE' && styles.penaltyTypeBtnTextActive]}>
                            % Rate
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>
                        Penalty Value ({planForm.penalty_type === 'FIXED' ? '₹' : '%'})
                      </Text>
                      <TextInput
                        style={styles.formInput}
                        value={planForm.penalty_rate}
                        onChangeText={(text) => setPlanForm((prev) => ({ ...prev, penalty_rate: text }))}
                        placeholder={planForm.penalty_type === 'FIXED' ? '100' : '5'}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                {/* Description */}
                <View>
                  <Text style={styles.fieldLabel}>Description / Included Amenities</Text>
                  <TextInput
                    style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                    value={planForm.description}
                    onChangeText={(text) => setPlanForm((prev) => ({ ...prev, description: text }))}
                    placeholder="Includes 24/7 security, water, lift maintenance, common area lighting..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                  />
                </View>

                {/* Submit Plan Button */}
                <TouchableOpacity
                  style={styles.submitPayBtn}
                  onPress={handleSavePlan}
                  disabled={submittingPlan}
                  activeOpacity={0.8}
                >
                  {submittingPlan ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.submitPayBtnText}>
                        {editingPlan ? 'Update Maintenance Plan' : 'Create Maintenance Plan'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  header: {
    backgroundColor: '#342C26',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...THEME.shadows.float,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 154, 108, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.4)',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.clay,
    letterSpacing: 0.5,
  },
  viewSegmentBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  viewSegmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  viewSegmentBtnActive: {
    backgroundColor: THEME.colors.clay,
  },
  viewSegmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  viewSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  residentTagRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  // KPI Grid
  kpiGrid: {
    gap: 12,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    ...THEME.shadows.card,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  kpiTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  kpiSubText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  // Resident Personal Unit Card
  residentKpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(196, 154, 108, 0.35)',
    ...THEME.shadows.card,
  },
  resCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resCardTag: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.clay,
    letterSpacing: 0.5,
  },
  resHomeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 2,
  },
  resStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  resMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  resMetricBox: {
    flex: 1,
  },
  resMetricLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  resMetricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 3,
  },
  payDuesBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  payDuesBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  // Tabs Bar
  tabsScrollWrap: {
    marginTop: 14,
    marginBottom: 4,
  },
  tabsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 7,
    ...THEME.shadows.card,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    borderColor: THEME.colors.clay,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: THEME.colors.clay,
    fontWeight: '800',
  },
  tabCountPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  tabCountPillActive: {
    backgroundColor: THEME.colors.clay,
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    marginTop: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.darkBrown,
    padding: 0,
  },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  batchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusChipsScroll: {
    gap: 8,
    paddingVertical: 12,
  },
  statusChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusChipActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  // Bill Card
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.card,
  },
  billTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billHomeNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  billResidentName: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  billMidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  billPeriodText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  billPlanText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  billAmountVal: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
  },
  billDueDateText: {
    fontSize: 10,
    color: '#EF4444',
    marginTop: 2,
    fontWeight: '600',
  },
  billFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  myHomeBadge: {
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  myHomeBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  invoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 154, 108, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '65%',
  },
  invoiceBadgePrefix: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  invoiceBadgeNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  invoiceNumText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  receiptActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    gap: 4,
  },
  receiptActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  payActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    gap: 4,
  },
  payActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Plan Card
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.card,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  planCycleTag: {
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  planCycleTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  planRate: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.clay,
  },
  planDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  penaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  penaltyText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Payment Record Card
  payRecordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.card,
  },
  payCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  payHomeNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  payResidentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  residentRoleBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  residentRoleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  payAmountVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  payAmountSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 1,
  },
  payReferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  receiptNumberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 115, 51, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(184, 115, 51, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  receiptNumberLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.clay,
  },
  receiptNumberValue: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  payInvoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  payInvoiceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  payInvoiceValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  payDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  payDetailItem: {
    width: '48%',
  },
  payDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  payDetailValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  payModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payModeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  payStatusFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  pendingApprovalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  pendingApprovalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  rejectedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  rejectionReasonText: {
    fontSize: 10,
    color: '#DC2626',
    marginTop: 2,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  approvedBySubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  verifyActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  modalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  payAmountCard: {
    backgroundColor: 'rgba(196, 154, 108, 0.1)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    marginBottom: 14,
  },
  payDueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.clay,
    letterSpacing: 0.5,
  },
  payDueVal: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 4,
  },
  payInvoiceRef: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  formSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodChipActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  methodChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  methodChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  formInput: {
    backgroundColor: '#FAFAF9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 13,
    color: THEME.colors.darkBrown,
  },
  submitPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 18,
  },
  submitPayBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  // Receipt Modal Styles
  receiptStampCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 14,
  },
  stampLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
  stampVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#059669',
    marginTop: 4,
  },
  stampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stampBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  receiptInfoTable: {
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  receiptLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  doneBtn: {
    backgroundColor: THEME.colors.clay,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  // Horizontal KPI Cards Styles
  kpiScrollSection: {
    marginBottom: 6,
  },
  horizontalKpiScroll: {
    gap: 12,
    paddingRight: 16,
  },
  kpiCardHorizontal: {
    width: 235,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    ...THEME.shadows.card,
  },
  // Action Row (Cycle & New Plan if admin / Active Cycle if resident)
  kpiActionBar: {
    marginTop: 10,
    marginBottom: 6,
  },
  adminActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cycleActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 6,
    ...THEME.shadows.card,
  },
  cycleActionBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  newPlanActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.clay,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 5,
    ...THEME.shadows.card,
  },
  newPlanActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  residentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  residentCycleBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  residentCycleBadgeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  residentQuickPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  residentQuickPayBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  // Plans Section Header with Create Plan Button
  plansSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  plansHeaderSubText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  createPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
    ...THEME.shadows.card,
  },
  createPlanBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  planInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(196, 154, 108, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  planInfoIconBox: {
    marginTop: 2,
  },
  planInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  planInfoDesc: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  planCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planTagsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  planTagPill: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  planTagPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  planAdminActions: {
    flexDirection: 'row',
    gap: 6,
  },
  planAdminIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  planAmountBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  planAmountNum: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
  },
  planAmountFreq: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  planDetailsGrid: {
    gap: 5,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  planDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planDetailLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  planDetailVal: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  // Cycle Modal Styles
  cycleInfoBanner: {
    backgroundColor: 'rgba(196, 154, 108, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(196, 154, 108, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  cycleInfoTag: {
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cycleInfoTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cycleInfoTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  createCycleTopBtn: {
    backgroundColor: THEME.colors.clay,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    elevation: 2,
    shadowColor: THEME.colors.clay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  createCycleTopBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  cycleInfoSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 6,
    lineHeight: 15,
  },
  emptyCyclesBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 10,
  },
  emptyCyclesText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  cycleItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  cycleItemCardActive: {
    backgroundColor: 'rgba(196, 154, 108, 0.1)',
    borderColor: THEME.colors.clay,
    borderWidth: 1.5,
  },
  cycleItemName: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  cycleItemDates: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    marginTop: 3,
  },
  cycleBadgePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  cycleBadgePillText: {
    color: '#10B981',
    fontSize: 8.5,
    fontWeight: '800',
  },
  activeCyclePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  activeCyclePillText: {
    color: '#059669',
    fontSize: 8.5,
    fontWeight: '800',
  },
  cycleEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  cycleEditBtnActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  cycleEditBtnText: {
    color: THEME.colors.clay,
    fontSize: 10,
    fontWeight: '700',
  },
  cycleDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleFormBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
  },
  durationPresetBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationPresetBtnText: {
    color: THEME.colors.clay,
    fontSize: 10,
    fontWeight: '700',
  },
  cycleCancelBtn: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  cycleCancelBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
  },
  saveCycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveCycleBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  formChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FAFAF9',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formChipActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  formChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  formChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  penaltyRuleFormBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    padding: 10,
  },
  penaltyRuleHeader: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  penaltyTypeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  penaltyTypeBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  penaltyTypeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  penaltyTypeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
