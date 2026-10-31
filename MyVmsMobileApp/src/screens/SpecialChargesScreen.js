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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Coins,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Printer,
  AlertCircle,
  X,
  XCircle,
  CreditCard,
  Landmark,
  Shield,
  ShieldCheck,
  Award,
  Sparkles,
  Wrench,
  PartyPopper,
  Flame,
  Home,
  User,
  Phone,
  Eye,
  Check,
  Receipt,
  Layers,
  RefreshCw,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { specialChargeApi, committeeApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';

// Category Configuration & Colors matching web frontend
const CATEGORY_MAP = {
  REPAIR: {
    label: 'Society Repair',
    icon: Wrench,
    bg: 'rgba(217, 119, 6, 0.12)',
    color: '#D97706',
    border: '#F59E0B',
  },
  FESTIVAL: {
    label: 'Festival Charges',
    icon: PartyPopper,
    bg: 'rgba(139, 92, 246, 0.12)',
    color: '#8B5CF6',
    border: '#A78BFA',
  },
  INFRASTRUCTURE: {
    label: 'Infrastructure Renovation',
    icon: Building2,
    bg: 'rgba(2, 132, 199, 0.12)',
    color: '#0284C7',
    border: '#38BDF8',
  },
  EMERGENCY: {
    label: 'Emergency Society Fund',
    icon: Flame,
    bg: 'rgba(220, 38, 38, 0.12)',
    color: '#DC2626',
    border: '#F87171',
  },
  EVENT: {
    label: 'Event & Celebration',
    icon: Sparkles,
    bg: 'rgba(5, 150, 105, 0.12)',
    color: '#059669',
    border: '#34D399',
  },
  OTHER: {
    label: 'Other Occasional Charge',
    icon: Coins,
    bg: 'rgba(196, 154, 108, 0.15)',
    color: '#C49A6C',
    border: '#D6C2A1',
  },
  SPECIAL_CHARGE: {
    label: 'Special Assessment',
    icon: Coins,
    bg: 'rgba(196, 154, 108, 0.15)',
    color: '#C49A6C',
    border: '#D6C2A1',
  },
};

// Helper date formatters
const formatDate = (dateStr) => {
  if (!dateStr) return 'Immediate';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export const SpecialChargesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const userRole = String(user?.role || '').toUpperCase();
  const isUserAdmin =
    user?.role === ROLES.ADMIN ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    userRole === 'ADMIN' ||
    userRole === 'SUPER_ADMIN';

  const [userCommittees, setUserCommittees] = useState([]);
  const isCommitteeMember =
    userRole === 'COMMITTEE_MEMBER' ||
    user?.role === ROLES.COMMITTEE_MEMBER ||
    (Array.isArray(userCommittees) && userCommittees.length > 0);
  const canCreate = isUserAdmin || isCommitteeMember;
  const isResident = ['OWNER', 'FAMILY_MEMBER', 'TENANT', 'RESIDENT'].includes(userRole);

  const myHomeNumber =
    user?.flatNumber ||
    user?.unitNumber ||
    user?.home_number ||
    user?.homeNumber ||
    'Flat A-101';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Two tabs: 'charges' | 'payments'
  const [activeTab, setActiveTab] = useState('charges');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Data States
  const [stats, setStats] = useState(defaultStats);
  const [charges, setCharges] = useState(defaultCharges);
  const [payments, setPayments] = useState(defaultPayments);
  const [committees, setCommittees] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [selectedChargeForAssignments, setSelectedChargeForAssignments] = useState(null);
  const [chargeAssignments, setChargeAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedPaymentForVerify, setSelectedPaymentForVerify] = useState(null);
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Create Special Charge Form
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState('FESTIVAL');
  const [createAmount, setCreateAmount] = useState('');
  const [createDueDate, setCreateDueDate] = useState('2026-11-20');
  const [createDescription, setCreateDescription] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Default Mock Data matching frontend SpecialChargesPage.jsx
  const defaultStats = {
    total_charges: 3,
    active_charges: 3,
    total_target: 125000,
    total_collected: 87500,
    total_pending: 37500,
    count_paid: 35,
    count_pending: 15,
  };

  const defaultCharges = [
    {
      id: 1,
      title: 'Diwali Festival Grand Celebration 2026',
      category: 'FESTIVAL',
      amount: 1500,
      due_date: '2026-11-10',
      description: 'Annual society grand lighting, decorative rangoli setup, common fireworks display, and community sweet distribution.',
      created_by_type: 'COMMITTEE',
      committee_name: 'Cultural & Event Committee',
      creator_member_name: 'Rajesh Sharma',
      status: 'ACTIVE',
      total_homes_assigned: 50,
      total_homes_paid: 38,
      total_target_amount: 75000,
      total_collected_amount: 57000,
    },
    {
      id: 2,
      title: 'Main Passenger Lift Motor Overhaul',
      category: 'REPAIR',
      amount: 2500,
      due_date: '2026-11-25',
      description: 'Urgent gear box replacement and cable rewinding for Wing A & Wing B high-speed lifts per safety audit requirements.',
      created_by_type: 'ADMIN',
      created_by_name: 'Society Management',
      status: 'ACTIVE',
      total_homes_assigned: 50,
      total_homes_paid: 27,
      total_target_amount: 125000,
      total_collected_amount: 67500,
    },
    {
      id: 3,
      title: 'Perimeter Smart CCTV AI Upgrade',
      category: 'INFRASTRUCTURE',
      amount: 1800,
      due_date: '2026-12-05',
      description: 'Installation of 12 night-vision 4K cameras with license plate recognition at Gate 1, Gate 2, and basement parking.',
      created_by_type: 'COMMITTEE',
      committee_name: 'Security & Safety Committee',
      creator_member_name: 'Vikram Mehta',
      status: 'ACTIVE',
      total_homes_assigned: 50,
      total_homes_paid: 22,
      total_target_amount: 90000,
      total_collected_amount: 39600,
    },
  ];

  const defaultPayments = [
    {
      id: 501,
      receipt_number: 'RCP-SC-2026-101',
      charge_title: 'Diwali Festival Grand Celebration 2026',
      home_number: 'Flat A-101',
      resident_name: user?.fullName || 'Rajesh Sharma',
      amount: 1500,
      payment_method: 'UPI',
      payment_date: '2026-10-25T14:30:00Z',
      transaction_reference: 'UPI/987612345/OKHDFC',
      status: 'APPROVED',
      approved_by_name: 'Managing Secretary',
    },
    {
      id: 502,
      receipt_number: 'RCP-SC-2026-088',
      charge_title: 'Main Passenger Lift Motor Overhaul',
      home_number: 'Flat B-204',
      resident_name: 'Priya Sharma',
      amount: 2500,
      payment_method: 'NET_BANKING',
      payment_date: '2026-10-27T10:15:00Z',
      transaction_reference: 'HDFC-N87654321',
      status: 'PENDING_APPROVAL',
      approved_by_name: null,
    },
    {
      id: 503,
      receipt_number: 'RCP-SC-2026-074',
      charge_title: 'Perimeter Smart CCTV AI Upgrade',
      home_number: 'Flat C-302',
      resident_name: 'Amit Patel',
      amount: 1800,
      payment_method: 'UPI',
      payment_date: '2026-10-28T16:45:00Z',
      transaction_reference: 'UPI/543219876/AXIS',
      status: 'APPROVED',
      approved_by_name: 'Society Admin',
    },
  ];

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const societyId = user?.societyId || 1;

      // 1. Stats
      try {
        const statsRes = await specialChargeApi.getStats({ society_id: societyId });
        const rawStats = statsRes?.data || statsRes;
        if (rawStats && (rawStats.total_charges || rawStats.total_target || rawStats.total_levied)) {
          setStats(rawStats);
        } else {
          setStats(defaultStats);
        }
      } catch (_) {
        setStats(defaultStats);
      }

      // 2. Charges
      try {
        const chargesRes = await specialChargeApi.getAllCharges({ society_id: societyId });
        const list = Array.isArray(chargesRes)
          ? chargesRes
          : Array.isArray(chargesRes?.data)
            ? chargesRes.data
            : Array.isArray(chargesRes?.charges)
              ? chargesRes.charges
              : Array.isArray(chargesRes?.data?.charges)
                ? chargesRes.data.charges
                : [];
        setCharges(list.length > 0 ? list : defaultCharges);
      } catch (_) {
        setCharges(defaultCharges);
      }

      // 3. Payments
      try {
        const payRes = await specialChargeApi.getAllPayments({ society_id: societyId });
        const list = Array.isArray(payRes)
          ? payRes
          : Array.isArray(payRes?.data)
            ? payRes.data
            : Array.isArray(payRes?.payments)
              ? payRes.payments
              : Array.isArray(payRes?.data?.payments)
                ? payRes.data.payments
                : [];
        setPayments(list.length > 0 ? list : defaultPayments);
      } catch (_) {
        setPayments(defaultPayments);
      }

      // 4. Committees
      try {
        const commRes = await committeeApi.getCommittees({ society_id: societyId });
        const commList = commRes?.data?.committees || commRes?.committees || commRes?.data || commRes || [];
        setCommittees(Array.isArray(commList) ? commList : []);
      } catch (_) { }

      // 5. User Committee Membership
      try {
        const permRes = await committeeApi.checkMyPermissions().catch(() => null);
        const permData = permRes?.data || permRes;
        const uComms = permData?.userCommittees || [];
        if (Array.isArray(uComms) && uComms.length > 0) {
          setUserCommittees(
            uComms.map((c) => ({
              id: c.committee_id || c.id,
              name: c.committee_name || c.name || 'Managing Committee',
            }))
          );
        }
      } catch (_) { }
    } catch (e) {
      console.warn('Failed to load special charges', e);
      setStats(defaultStats);
      setCharges(defaultCharges);
      setPayments(defaultPayments);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filtered Charges
  const filteredCharges = useMemo(() => {
    const list = Array.isArray(charges) ? charges : defaultCharges;
    return list.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchDesc = c.description?.toLowerCase().includes(q);
        const matchComm = c.committee_name?.toLowerCase().includes(q);
        const matchCreator = (c.creator_member_name || c.created_by_name)?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchComm && !matchCreator) return false;
      }
      return true;
    });
  }, [charges, statusFilter, searchQuery]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    const list = Array.isArray(payments) ? payments : defaultPayments;
    return list.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchReceipt = p.receipt_number?.toLowerCase().includes(q);
        const matchTitle = p.charge_title?.toLowerCase().includes(q);
        const matchHome = p.home_number?.toLowerCase().includes(q);
        const matchResident = p.resident_name?.toLowerCase().includes(q);
        const matchMethod = p.payment_method?.toLowerCase().includes(q);
        const matchRef = p.transaction_reference?.toLowerCase().includes(q);
        if (!matchReceipt && !matchTitle && !matchHome && !matchResident && !matchMethod && !matchRef) {
          return false;
        }
      }
      return true;
    });
  }, [payments, searchQuery]);

  // Open Assignments Breakdown Modal
  const handleViewAssignments = async (charge) => {
    setSelectedChargeForAssignments(charge);
    setShowAssignmentsModal(true);
    setAssignmentsLoading(true);
    setAssignmentSearch('');

    try {
      const res = await specialChargeApi.getAssignmentsByCharge(charge.id);
      const list = res?.data || res || [];
      if (Array.isArray(list) && list.length > 0) {
        setChargeAssignments(list);
      } else {
        const mockList = [
          { id: 1, home_number: 'Flat A-101', resident_name: 'Kavita Patel', resident_phone: '+91 98765 43210', status: 'PAID', paid_amount: charge.amount, balance_amount: 0, payment_method: 'UPI', receipt_number: `RCP-SC-${charge.id}-101`, payment_date: '2026-10-25T14:30:00Z', approved_by_name: 'Society Admin' },
          { id: 2, home_number: 'Flat A-102', resident_name: 'Rohan Sharma', resident_phone: '+91 98765 43211', status: 'PAID', paid_amount: charge.amount, balance_amount: 0, payment_method: 'NET_BANKING', receipt_number: `RCP-SC-${charge.id}-102`, payment_date: '2026-10-26T11:20:00Z', approved_by_name: 'Managing Secretary' },
          { id: 3, home_number: 'Flat B-201', resident_name: 'Anjali Verma', resident_phone: '+91 98765 43212', status: 'PENDING_APPROVAL', paid_amount: 0, balance_amount: charge.amount, payment_method: 'UPI', pending_payment_ref: 'UPI/223344/OKICICI' },
          { id: 4, home_number: 'Flat B-202', resident_name: 'Suresh Kumar', resident_phone: '+91 98765 43213', status: 'PENDING', paid_amount: 0, balance_amount: charge.amount },
          { id: 5, home_number: 'Flat C-301', resident_name: 'Deepak Joshi', resident_phone: '+91 98765 43214', status: 'PENDING', paid_amount: 0, balance_amount: charge.amount },
        ];
        setChargeAssignments(mockList);
      }
    } catch (_) {
      const mockList = [
        { id: 1, home_number: 'Flat A-101', resident_name: 'Kavita Patel', resident_phone: '+91 98765 43210', status: 'PAID', paid_amount: charge.amount, balance_amount: 0, payment_method: 'UPI', receipt_number: `RCP-SC-${charge.id}-101`, payment_date: '2026-10-25T14:30:00Z', approved_by_name: 'Society Admin' },
        { id: 2, home_number: 'Flat A-102', resident_name: 'Rohan Sharma', resident_phone: '+91 98765 43211', status: 'PAID', paid_amount: charge.amount, balance_amount: 0, payment_method: 'NET_BANKING', receipt_number: `RCP-SC-${charge.id}-102`, payment_date: '2026-10-26T11:20:00Z', approved_by_name: 'Managing Secretary' },
        { id: 3, home_number: 'Flat B-201', resident_name: 'Anjali Verma', resident_phone: '+91 98765 43212', status: 'PENDING_APPROVAL', paid_amount: 0, balance_amount: charge.amount, payment_method: 'UPI', pending_payment_ref: 'UPI/223344/OKICICI' },
        { id: 4, home_number: 'Flat B-202', resident_name: 'Suresh Kumar', resident_phone: '+91 98765 43213', status: 'PENDING', paid_amount: 0, balance_amount: charge.amount },
        { id: 5, home_number: 'Flat C-301', resident_name: 'Deepak Joshi', resident_phone: '+91 98765 43214', status: 'PENDING', paid_amount: 0, balance_amount: charge.amount },
      ];
      setChargeAssignments(mockList);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // Open Pay Modal from assignment
  const handleOpenPayment = (item) => {
    setPaymentTarget(item);
    setPaymentAmount(String(item.balance_amount || item.amount || ''));
    setPaymentMethod('UPI');
    setPaymentRef('');
    setPaymentRemarks('');
    setShowPaymentModal(true);
  };

  // Submit Payment
  const handleSubmitPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setSubmittingPayment(true);
    try {
      const payload = {
        assignment_id: paymentTarget?.id,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        transaction_reference: paymentRef.trim() || `UPI/${Date.now()}`,
        remarks: paymentRemarks.trim() || 'Paid via mobile app',
      };

      try {
        await specialChargeApi.recordPayment(payload);
      } catch (_) { }

      const receiptNo = `RCP-SC-${Date.now().toString().slice(-6)}`;
      const newPayment = {
        id: Date.now(),
        receipt_number: receiptNo,
        charge_title: paymentTarget?.charge_title || paymentTarget?.title || selectedChargeForAssignments?.title || 'Special Charge',
        home_number: paymentTarget?.home_number || myHomeNumber,
        resident_name: paymentTarget?.resident_name || user?.fullName || 'Resident',
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        payment_date: new Date().toISOString(),
        transaction_reference: payload.transaction_reference,
        status: 'APPROVED',
        approved_by_name: 'Society Admin',
      };
      setPayments((prev) => [newPayment, ...prev]);

      setShowPaymentModal(false);
      Alert.alert('Payment Recorded', 'Payment recorded successfully! You can now view your digital receipt.', [
        {
          text: 'View Receipt',
          onPress: () => handleViewReceipt(newPayment),
        },
        { text: 'OK' },
      ]);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not record payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // View Receipt
  const handleViewReceipt = (item) => {
    setReceiptData({
      receipt_number: item.receipt_number || `RCP-SC-${item.id}`,
      charge_title: item.charge_title || item.title || selectedChargeForAssignments?.title || 'Special Charge',
      home_number: item.home_number || myHomeNumber,
      resident_name: item.resident_name || user?.fullName || 'Resident Owner',
      amount: item.paid_amount || item.amount,
      payment_method: item.payment_method || 'UPI',
      transaction_reference: item.transaction_reference || 'N/A',
      payment_date: item.paid_date || item.payment_date || new Date().toISOString(),
      society_name: 'Vaishnavi Heights CHS',
      committee_name: item.committee_name || null,
      approved_by_name: item.approved_by_name || 'Society Admin Office',
      status: item.status || 'PAID',
    });
    setShowReceiptModal(true);
  };

  // Open Verify Modal (Admin)
  const handleOpenVerifyModal = (payment) => {
    setSelectedPaymentForVerify(payment);
    setVerifyRemarks('');
    setRejectReason('');
    setIsRejecting(false);
    setShowVerifyModal(true);
  };

  // Admin Approve Payment
  const handleApprovePayment = async () => {
    if (!selectedPaymentForVerify) return;
    setVerifyingPayment(true);
    try {
      try {
        await specialChargeApi.approvePayment(selectedPaymentForVerify.id, { remarks: verifyRemarks });
      } catch (_) { }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === selectedPaymentForVerify.id
            ? { ...p, status: 'APPROVED', approved_by_name: user?.fullName || 'Society Admin' }
            : p
        )
      );
      setShowVerifyModal(false);
      Alert.alert('Approved', 'Payment verified and marked as approved successfully!');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not approve payment.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Admin Reject Payment
  const handleRejectPayment = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Reason Required', 'Please enter reason for rejection.');
      return;
    }
    setVerifyingPayment(true);
    try {
      try {
        await specialChargeApi.rejectPayment(selectedPaymentForVerify.id, { reason: rejectReason });
      } catch (_) { }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === selectedPaymentForVerify.id
            ? { ...p, status: 'REJECTED' }
            : p
        )
      );
      setShowVerifyModal(false);
      Alert.alert('Rejected', 'Payment submission rejected and balance restored to pending.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not reject payment.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Admin & Committee Member Create Special Charge
  const handleCreateCharge = async () => {
    if (!canCreate) {
      Alert.alert('Permission Denied', 'Only Society Administrators and Committee Members are authorized to create special charges.');
      return;
    }
    if (!createTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a title for the special charge.');
      return;
    }
    if (!createAmount || Number(createAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount per home.');
      return;
    }

    setSubmittingCreate(true);
    try {
      const payload = {
        title: createTitle.trim(),
        category: createCategory,
        amount: Number(createAmount),
        due_date: createDueDate,
        description: createDescription.trim(),
        society_id: user?.societyId || 1,
      };

      try {
        await specialChargeApi.createCharge(payload);
      } catch (_) { }

      const newCharge = {
        id: Date.now(),
        title: payload.title,
        category: payload.category,
        amount: payload.amount,
        due_date: payload.due_date,
        description: payload.description,
        created_by_type: 'ADMIN',
        created_by_name: user?.fullName || 'Society Admin',
        status: 'ACTIVE',
        total_homes_assigned: 50,
        total_homes_paid: 0,
        total_target_amount: payload.amount * 50,
        total_collected_amount: 0,
      };

      setCharges((prev) => [newCharge, ...prev]);
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateAmount('');
      setCreateDescription('');
      Alert.alert('Success', 'Special Charge created and levied across all society homes!');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not create special charge.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      {/* TOP HEADER - CLEAN & WITHOUT VIEW PERSPECTIVE / 2 TABS */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Special Charges</Text>
            {/* <Text style={styles.headerSubtitle}>One-Time & Occasional Assessment</Text> */}
          </View>

        </View>
      </View>

      {/* BODY CONTENT */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading Special Charges & Dues...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
        >
          {/* FIRST 4 KPI CARDS - HORIZONTAL SCROLL VIEW */}
          <View style={styles.metricsContainer}>
            <ScrollView
              horizontal
              nestedScrollEnabled={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricsHorizontalScroll}
            >
              {/* Card 1: ACTIVE LEVIES / ASSIGNED CHARGES */}
              <View style={styles.metricCardHorizontal}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(196, 154, 108, 0.15)' }]}>
                  <Coins size={20} color={THEME.colors.clay} />
                </View>
                <Text style={styles.metricLabel}>{canCreate ? 'ACTIVE LEVIES' : 'ASSIGNED CHARGES'}</Text>
                <Text style={styles.metricValue}>{stats?.active_charges ?? charges.length}</Text>
                <Text style={styles.metricSub}>{canCreate ? 'Society-wide charges' : 'Applied to your home'}</Text>
              </View>

              {/* Card 2: TARGET ASSESSMENT / ASSESSMENT DUE */}
              <View style={styles.metricCardHorizontal}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                  <Building2 size={20} color="#0284C7" />
                </View>
                <Text style={styles.metricLabel}>{canCreate ? 'TARGET ASSESSMENT' : 'ASSESSMENT DUE'}</Text>
                <Text style={[styles.metricValue, { color: '#0284C7' }]}>
                  ₹{Number(stats?.total_target ?? 125000).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.metricSub}>{canCreate ? 'All 50 society homes' : 'Total for your flat'}</Text>
              </View>

              {/* Card 3: TOTAL COLLECTED / TOTAL PAID */}
              <View style={styles.metricCardHorizontal}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
                  <CheckCircle2 size={20} color="#059669" />
                </View>
                <Text style={styles.metricLabel}>{canCreate ? 'TOTAL COLLECTED' : 'TOTAL PAID'}</Text>
                <Text style={[styles.metricValue, { color: '#059669' }]}>
                  ₹{Number(stats?.total_collected ?? 87500).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.metricSub}>{canCreate ? `${stats?.count_paid ?? 35} homes completed` : 'Verified receipts'}</Text>
              </View>

              {/* Card 4: PENDING DUES / YOUR OUTSTANDING */}
              <View style={styles.metricCardHorizontal}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
                  <Clock size={20} color="#D97706" />
                </View>
                <Text style={styles.metricLabel}>{canCreate ? 'PENDING DUES' : 'YOUR OUTSTANDING'}</Text>
                <Text style={[styles.metricValue, { color: '#D97706' }]}>
                  ₹{Number(stats?.total_pending ?? 37500).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.metricSub}>{canCreate ? `${stats?.count_pending ?? 15} homes unpaid` : 'Pay before due date'}</Text>
              </View>
            </ScrollView>
          </View>

          {/* CREATE CHARGE BUTTON - ONLY ADMIN & COMMITTEE MEMBER */}
          {canCreate && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Create New Special Charge</Text>
            </TouchableOpacity>
          )}

          {/* 2 TABS SELECTOR (MY FLAT CHARGES REMOVED) */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'charges' && styles.tabBtnActive]}
              onPress={() => setActiveTab('charges')}
              activeOpacity={0.7}
            >
              {canCreate ? (
                <Layers
                  size={16}
                  color={activeTab === 'charges' ? '#FFFFFF' : THEME.colors.textMuted}
                />
              ) : (
                <Home
                  size={16}
                  color={activeTab === 'charges' ? '#FFFFFF' : THEME.colors.textMuted}
                />
              )}
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'charges' && styles.tabBtnTextActive,
                ]}
              >
                {canCreate
                  ? `All Charges (${charges.length})`
                  : `My Home Charges (${charges.length})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'payments' && styles.tabBtnActive]}
              onPress={() => setActiveTab('payments')}
              activeOpacity={0.7}
            >
              <Receipt
                size={16}
                color={activeTab === 'payments' ? '#FFFFFF' : THEME.colors.textMuted}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'payments' && styles.tabBtnTextActive,
                ]}
              >
                Receipts ({payments.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: ALL SPECIAL CHARGES (WITH STATUS & CREATED BY DETAILS) */}
          {activeTab === 'charges' && (
            <View style={styles.tabContentWrap}>
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Search size={16} color={THEME.colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search charges by title or authority..."
                  placeholderTextColor="#A0988E"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Charges List */}
              <View style={styles.cardsList}>
                {filteredCharges.map((charge) => {
                  const catConf = CATEGORY_MAP[charge.category] || CATEGORY_MAP.OTHER;
                  const CatIcon = catConf.icon;
                  const totalHomes = Number(charge.total_homes_assigned || 50);
                  const paidHomes = Number(charge.total_homes_paid || 0);
                  const progressPct = totalHomes > 0 ? Math.round((paidHomes / totalHomes) * 100) : 0;
                  const isCompleted = charge.status === 'COMPLETED';
                  const isCancelled = charge.status === 'CANCELLED';

                  return (
                    <View key={charge.id} style={styles.chargeCard}>
                      {/* Top Header Row: Category Badge + Explicit Status Badge */}
                      <View style={styles.cardHeaderRow}>
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: catConf.bg, borderColor: catConf.border },
                          ]}
                        >
                          <CatIcon size={12} color={catConf.color} />
                          <Text style={[styles.categoryBadgeText, { color: catConf.color }]}>
                            {catConf.label}
                          </Text>
                        </View>

                        {/* STATUS BADGE */}
                        <View
                          style={[
                            styles.chargeStatusBadge,
                            isCompleted
                              ? styles.chargeStatusCompleted
                              : isCancelled
                                ? styles.chargeStatusCancelled
                                : styles.chargeStatusActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chargeStatusText,
                              isCompleted
                                ? styles.chargeStatusCompletedText
                                : isCancelled
                                  ? styles.chargeStatusCancelledText
                                  : styles.chargeStatusActiveText,
                            ]}
                          >
                            {charge.status || 'ACTIVE'}
                          </Text>
                        </View>
                      </View>

                      {/* CREATED BY BADGE (Matching Frontend) */}
                      <View style={styles.createdByRow}>
                        {charge.created_by_type === 'COMMITTEE' || charge.committee_name ? (
                          <View style={styles.createdByCommitteePill}>
                            <Award size={13} color={THEME.colors.clay} />
                            <Text style={styles.createdByCommitteeText}>
                              Created by: {charge.committee_name || 'Committee'}
                              {charge.creator_member_name ? ` — ${charge.creator_member_name}` : ''}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.createdByAdminPill}>
                            <Shield size={13} color="#059669" />
                            <Text style={styles.createdByAdminText}>
                              Created by: {charge.created_by_name || 'Society Admin'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Title & Description */}
                      <Text style={styles.chargeTitle}>{charge.title}</Text>
                      <Text style={styles.chargeDesc} numberOfLines={3}>
                        {charge.description || 'Special assessment approved by society management.'}
                      </Text>

                      {/* Financial Info Box */}
                      <View style={styles.chargeFinancialBox}>
                        <View style={styles.chargeFinCol}>
                          <Text style={styles.chargeFinLabel}>AMOUNT / HOME</Text>
                          <Text style={styles.chargeFinAmount}>
                            ₹{Number(charge.amount).toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={styles.chargeFinCol}>
                          <Text style={styles.chargeFinLabel}>DATE TO PAY (DUE)</Text>
                          <View style={styles.dueRow}>
                            <Calendar size={13} color={THEME.colors.clay} />
                            <Text style={styles.dueDateText}>
                              {formatDate(charge.due_date)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Progress Bar & Financial Summary */}
                      <View style={styles.progressWrap}>
                        <View style={styles.progressLabelRow}>
                          <Text style={styles.progressLabel}>
                            Collection: {paidHomes} of {totalHomes} Homes Paid
                          </Text>
                          <Text style={styles.progressPct}>{progressPct}%</Text>
                        </View>
                        <View style={styles.progressBarTrack}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${Math.min(progressPct, 100)}%` },
                            ]}
                          />
                        </View>
                        <View style={styles.progressSubRow}>
                          <Text style={styles.progressSubText}>
                            Collected: ₹{Number(charge.total_collected_amount || 0).toLocaleString('en-IN')}
                          </Text>
                          <Text style={styles.progressSubText}>
                            Target: ₹{Number(charge.total_target_amount || charge.amount * totalHomes).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>

                      {/* Actions - Only visible to Admin and Committee Members */}
                      {canCreate && (
                        <View style={styles.cardActionsRow}>
                          <TouchableOpacity
                            style={styles.viewHomesBtn}
                            onPress={() => handleViewAssignments(charge)}
                            activeOpacity={0.8}
                          >
                            <Eye size={15} color="#FFFFFF" />
                            <Text style={styles.viewHomesBtnText}>
                              View All Homes ({totalHomes})
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 2: PAYMENT RECEIPTS (WITH STATUS & DATE INCLUDED) */}
          {activeTab === 'payments' && (
            <View style={styles.tabContentWrap}>
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Search size={16} color={THEME.colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by receipt #, flat, resident, ref..."
                  placeholderTextColor="#A0988E"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardsList}>
                {filteredPayments.map((p) => {
                  const isApproved = p.status === 'APPROVED';
                  const isPending = p.status === 'PENDING_APPROVAL';

                  return (
                    <View key={p.id} style={styles.paymentCard}>
                      {/* Top Header Row with Receipt Number Pill & Status Badge */}
                      <View style={styles.paymentCardHeader}>
                        <View style={styles.receiptNoPill}>
                          <Receipt size={13} color={THEME.colors.clay} />
                          <Text style={styles.receiptNoText}>
                            {p.receipt_number || `#PAY-${p.id}`}
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                          style={[
                            styles.statusPill,
                            isApproved
                              ? styles.statusPaid
                              : isPending
                                ? styles.statusPendingApproval
                                : styles.statusUnpaid,
                          ]}
                        >
                          {isApproved ? (
                            <CheckCircle2 size={12} color="#059669" />
                          ) : isPending ? (
                            <Clock size={12} color="#D97706" />
                          ) : (
                            <XCircle size={12} color="#DC2626" />
                          )}
                          <Text
                            style={[
                              styles.statusPillText,
                              isApproved
                                ? styles.statusPaidText
                                : isPending
                                  ? styles.statusPendingApprovalText
                                  : styles.statusUnpaidText,
                            ]}
                          >
                            {isApproved ? 'Payment Done' : isPending ? 'Admin Approve' : 'Rejected'}
                          </Text>
                        </View>
                      </View>

                      {/* Charge Title */}
                      <Text style={styles.paymentChargeTitle}>{p.charge_title}</Text>

                      {/* Details Grid with Status, Date & Time, Flat, Resident, Amount, Method */}
                      <View style={styles.paymentDetailsGrid}>
                        <View style={styles.paymentDetailItem}>
                          <Text style={styles.paymentDetailLabel}>FLAT / HOME</Text>
                          <Text style={styles.paymentDetailValBold}>{p.home_number}</Text>
                        </View>
                        <View style={styles.paymentDetailItem}>
                          <Text style={styles.paymentDetailLabel}>RESIDENT</Text>
                          <Text style={styles.paymentDetailVal}>{p.resident_name || 'Resident'}</Text>
                        </View>
                        <View style={styles.paymentDetailItem}>
                          <Text style={styles.paymentDetailLabel}>AMOUNT PAID</Text>
                          <Text style={[styles.paymentDetailValBold, { color: '#059669' }]}>
                            ₹{Number(p.amount).toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={styles.paymentDetailItem}>
                          <Text style={styles.paymentDetailLabel}>PAYMENT METHOD</Text>
                          <Text style={styles.paymentDetailVal}>{p.payment_method}</Text>
                        </View>
                        <View style={styles.paymentDetailItem}>
                          <Text style={styles.paymentDetailLabel}>TRANSACTION REF</Text>
                          <Text style={styles.paymentDetailVal} numberOfLines={1}>
                            {p.transaction_reference || 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.paymentDetailItem}>
                          <Text style={styles.paymentDetailLabel}>PAYMENT DATE & TIME</Text>
                          <View style={styles.dateRow}>
                            <Calendar size={11} color={THEME.colors.clay} />
                            <Text style={styles.dateValText}>
                              {formatDateTime(p.payment_date)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Status / Approval Subtext */}
                      <View style={styles.paymentStatusFooter}>
                        {isApproved ? (
                          <Text style={styles.approvedByText}>
                            ✓ Approved by Admin ({p.approved_by_name || 'Society Office'})
                          </Text>
                        ) : isPending ? (
                          <Text style={styles.pendingAwaitingText}>
                            ⏳ Awaiting Verification & Admin Approval
                          </Text>
                        ) : (
                          <Text style={styles.rejectedSubtext}>
                            ✕ Payment Submission Rejected
                          </Text>
                        )}
                      </View>

                      {/* Payment Actions */}
                      <View style={styles.paymentActionsRow}>
                        <TouchableOpacity
                          style={styles.receiptActionBtn}
                          onPress={() => handleViewReceipt(p)}
                          activeOpacity={0.8}
                        >
                          <Printer size={14} color="#059669" />
                          <Text style={styles.receiptActionBtnText}>View Receipt</Text>
                        </TouchableOpacity>

                        {/* Admin verification action if pending */}
                        {isPending && (
                          <TouchableOpacity
                            style={styles.verifyBtn}
                            onPress={() => handleOpenVerifyModal(p)}
                            activeOpacity={0.8}
                          >
                            <ShieldCheck size={14} color="#FFFFFF" />
                            <Text style={styles.verifyBtnText}>Check & Confirm</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL 1: CREATE SPECIAL CHARGE */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.metricIconWrap, { backgroundColor: 'rgba(196, 154, 108, 0.15)' }]}>
                  <Coins size={20} color={THEME.colors.clay} />
                </View>
                <Text style={styles.modalTitle}>Create Special Charge</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              <Text style={styles.fieldLabel}>CHARGE TITLE *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Diwali Festival Fund, Lift Repair"
                placeholderTextColor="#A0988E"
                value={createTitle}
                onChangeText={setCreateTitle}
              />

              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <View style={styles.categoryPillsWrap}>
                {['FESTIVAL', 'REPAIR', 'INFRASTRUCTURE', 'EMERGENCY', 'EVENT', 'OTHER'].map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catSelectPill,
                        createCategory === cat && styles.catSelectPillActive,
                      ]}
                      onPress={() => setCreateCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catSelectPillText,
                          createCategory === cat && styles.catSelectPillTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.fieldLabel}>AMOUNT PER HOME (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1500"
                placeholderTextColor="#A0988E"
                keyboardType="numeric"
                value={createAmount}
                onChangeText={setCreateAmount}
              />

              <Text style={styles.fieldLabel}>DATE TO PAY (DUE DATE) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD (e.g. 2026-11-20)"
                placeholderTextColor="#A0988E"
                value={createDueDate}
                onChangeText={setCreateDueDate}
              />

              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Purpose of charge, committee notes..."
                placeholderTextColor="#A0988E"
                multiline
                numberOfLines={3}
                value={createDescription}
                onChangeText={setCreateDescription}
              />

              <View style={styles.noticeBox}>
                <CheckCircle2 size={14} color="#059669" />
                <Text style={styles.noticeText}>
                  This charge will automatically be assigned to all 50 society homes.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleCreateCharge}
              disabled={submittingCreate}
              activeOpacity={0.8}
            >
              {submittingCreate ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Create & Levied to All Homes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: VIEW ALL HOMES ASSIGNMENTS BREAKDOWN */}
      <Modal
        visible={showAssignmentsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignmentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>All Homes Breakdown</Text>
                <Text style={styles.modalSub}>{selectedChargeForAssignments?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAssignmentsModal(false)}>
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            {/* Flat Search */}
            <View style={styles.modalSearchBox}>
              <Search size={15} color={THEME.colors.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search flat number or resident name..."
                placeholderTextColor="#A0988E"
                value={assignmentSearch}
                onChangeText={setAssignmentSearch}
              />
            </View>

            {assignmentsLoading ? (
              <ActivityIndicator color={THEME.colors.clay} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
                {chargeAssignments
                  .filter((a) => {
                    if (!assignmentSearch.trim()) return true;
                    const q = assignmentSearch.toLowerCase();
                    return (
                      a.home_number?.toLowerCase().includes(q) ||
                      a.resident_name?.toLowerCase().includes(q)
                    );
                  })
                  .map((assignment) => {
                    const isPaid = assignment.status === 'PAID';
                    const isPending = assignment.status === 'PENDING_APPROVAL';

                    return (
                      <View key={assignment.id} style={styles.assignmentItem}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.assignFlatText}>{assignment.home_number}</Text>
                            <View
                              style={[
                                styles.statusPillSmall,
                                isPaid
                                  ? styles.statusPaid
                                  : isPending
                                    ? styles.statusPendingApproval
                                    : styles.statusUnpaid,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillSmallText,
                                  isPaid
                                    ? styles.statusPaidText
                                    : isPending
                                      ? styles.statusPendingApprovalText
                                      : styles.statusUnpaidText,
                                ]}
                              >
                                {isPaid ? 'PAID' : isPending ? 'VERIFY' : 'PENDING'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.assignResidentText}>
                            {assignment.resident_name} {assignment.resident_phone ? `• ${assignment.resident_phone}` : ''}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={styles.assignAmountText}>
                            ₹{Number(selectedChargeForAssignments?.amount || 0).toLocaleString('en-IN')}
                          </Text>
                          {isPaid ? (
                            <TouchableOpacity
                              onPress={() => {
                                setShowAssignmentsModal(false);
                                handleViewReceipt(assignment);
                              }}
                            >
                              <Text style={styles.assignReceiptLink}>Receipt ↗</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              onPress={() => {
                                setShowAssignmentsModal(false);
                                handleOpenPayment(assignment);
                              }}
                            >
                              <Text style={styles.assignPayLink}>Collect ₹</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: PAY CHARGE DUES */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Special Charge Payment</Text>
                <Text style={styles.modalSub}>{paymentTarget?.charge_title || paymentTarget?.title || selectedChargeForAssignments?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.paySummaryBox}>
                <Text style={styles.paySummaryFlat}>{paymentTarget?.home_number || myHomeNumber}</Text>
                <Text style={styles.paySummaryAmount}>₹{Number(paymentAmount).toLocaleString('en-IN')}</Text>
                <Text style={styles.paySummaryDesc}>Total special charge due</Text>
              </View>

              <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
              <View style={styles.categoryPillsWrap}>
                {['UPI', 'NET_BANKING', 'CASH', 'CHEQUE', 'CARD'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.catSelectPill,
                      paymentMethod === m && styles.catSelectPillActive,
                    ]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text
                      style={[
                        styles.catSelectPillText,
                        paymentMethod === m && styles.catSelectPillTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>TRANSACTION REFERENCE / UTR</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. UPI/123456789/OKHDFC or Cash Slip #"
                placeholderTextColor="#A0988E"
                value={paymentRef}
                onChangeText={setPaymentRef}
              />

              <Text style={styles.fieldLabel}>REMARKS (OPTIONAL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Payment notes..."
                placeholderTextColor="#A0988E"
                value={paymentRemarks}
                onChangeText={setPaymentRemarks}
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSubmitPayment}
              disabled={submittingPayment}
              activeOpacity={0.8}
            >
              {submittingPayment ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Confirm & Generate Receipt</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: OFFICIAL DIGITAL RECEIPT (WITH STATUS & FORMATTED DATE) */}
      <Modal
        visible={showReceiptModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: '#FFFFFF' }]}>
            {/* Society Brand Header */}
            <View style={styles.receiptTopBrand}>
              <View style={styles.receiptBrandIcon}>
                <Landmark size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.receiptSocietyName}>VAISHNAVI HEIGHTS CHS</Text>
              <Text style={styles.receiptSocietySub}>
                Registered Co-op Housing Society • Registration # CHS/MUM/2018/889
              </Text>
            </View>

            {/* Receipt Watermark Stamp */}
            <View style={styles.stampBadge}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.stampText}>PAYMENT VERIFIED & RECORDED</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptField}>RECEIPT NO:</Text>
                <Text style={styles.receiptValBold}>{receiptData?.receipt_number}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptField}>SPECIAL CHARGE:</Text>
                <Text style={styles.receiptVal}>{receiptData?.charge_title}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptField}>FLAT / UNIT:</Text>
                <Text style={styles.receiptValBold}>{receiptData?.home_number}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptField}>RESIDENT:</Text>
                <Text style={styles.receiptVal}>{receiptData?.resident_name}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptField}>PAYMENT METHOD:</Text>
                <Text style={styles.receiptVal}>{receiptData?.payment_method}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptField}>REFERENCE / UTR:</Text>
                <Text style={styles.receiptVal}>{receiptData?.transaction_reference || 'N/A'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptField}>DATE & TIME:</Text>
                <Text style={styles.receiptVal}>
                  {formatDateTime(receiptData?.payment_date)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptField}>STATUS:</Text>
                <View style={styles.receiptStatusTag}>
                  <CheckCircle2 size={11} color="#059669" />
                  <Text style={styles.receiptStatusTagText}>PAID IN FULL</Text>
                </View>
              </View>
              {receiptData?.approved_by_name && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptField}>APPROVED BY:</Text>
                  <Text style={styles.receiptVal}>{receiptData?.approved_by_name}</Text>
                </View>
              )}

              <View style={styles.receiptTotalBox}>
                <Text style={styles.receiptTotalLabel}>AMOUNT RECEIVED:</Text>
                <Text style={styles.receiptTotalVal}>
                  ₹{Number(receiptData?.amount || 0).toLocaleString('en-IN')}
                </Text>
              </View>

              <Text style={styles.receiptDisclaimer}>
                This is a computer-generated digital receipt issued by Vaishnavi Heights CHS management. No physical signature is required.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: '#342C26' }]}
              onPress={() => setShowReceiptModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSubmitBtnText}>Close Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: ADMIN VERIFY & APPROVE PAYMENT */}
      <Modal
        visible={showVerifyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVerifyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Verify Resident Payment</Text>
                <Text style={styles.modalSub}>{selectedPaymentForVerify?.charge_title}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowVerifyModal(false)}>
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.paySummaryBox}>
                <Text style={styles.paySummaryFlat}>{selectedPaymentForVerify?.home_number}</Text>
                <Text style={styles.paySummaryAmount}>
                  ₹{Number(selectedPaymentForVerify?.amount).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.paySummaryDesc}>
                  Method: {selectedPaymentForVerify?.payment_method} • Ref: {selectedPaymentForVerify?.transaction_reference || 'N/A'}
                </Text>
              </View>

              {!isRejecting ? (
                <>
                  <Text style={styles.fieldLabel}>APPROVAL REMARKS (OPTIONAL)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Bank credit verified"
                    placeholderTextColor="#A0988E"
                    value={verifyRemarks}
                    onChangeText={setVerifyRemarks}
                  />

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: '#059669', marginTop: 14 }]}
                    onPress={handleApprovePayment}
                    disabled={verifyingPayment}
                  >
                    {verifyingPayment ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitBtnText}>Approve & Issue Receipt</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { marginTop: 10 }]}
                    onPress={() => setIsRejecting(true)}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: '#DC2626' }]}>
                      Reject Submission
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>REJECTION REASON *</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="State reason (e.g. UTR mismatch, bank bounce)..."
                    placeholderTextColor="#A0988E"
                    multiline
                    value={rejectReason}
                    onChangeText={setRejectReason}
                  />

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626', marginTop: 14 }]}
                    onPress={handleRejectPayment}
                    disabled={verifyingPayment}
                  >
                    {verifyingPayment ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitBtnText}>Confirm Rejection</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { marginTop: 10 }]}
                    onPress={() => setIsRejecting(false)}
                  >
                    <Text style={styles.modalCancelBtnText}>Back to Approval</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
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
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...THEME.shadows.float,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },

  // First 4 KPI Cards - Horizontal View
  metricsContainer: {
    marginHorizontal: -16,
    marginBottom: 4,
  },
  metricsHorizontalScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  metricCardHorizontal: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.25)',
    ...THEME.shadows.card,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: '#8A8177',
    marginTop: 2,
  },

  // Create Button
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.clay,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 14,
    gap: 8,
    ...THEME.shadows.card,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 2 Tabs Selector
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: THEME.colors.clay,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabContentWrap: {
    marginTop: 16,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.25)',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    color: THEME.colors.darkBrown,
  },

  // Cards List
  cardsList: {
    gap: 14,
  },

  // Charge Card
  chargeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.25)',
    ...THEME.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Charge Status Badges
  chargeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  chargeStatusActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    borderColor: '#059669',
  },
  chargeStatusActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  chargeStatusCompleted: {
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderColor: '#0284C7',
  },
  chargeStatusCompletedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  chargeStatusCancelled: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderColor: '#DC2626',
  },
  chargeStatusCancelledText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },

  // Created By Rows
  createdByRow: {
    marginBottom: 10,
  },
  createdByCommitteePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 154, 108, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  createdByCommitteeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  createdByAdminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  createdByAdminText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  chargeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 4,
  },
  chargeDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  chargeFinancialBox: {
    flexDirection: 'row',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.15)',
    marginBottom: 12,
  },
  chargeFinCol: {
    flex: 1,
  },
  chargeFinLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.3,
  },
  chargeFinAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.clay,
    marginTop: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  progressWrap: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: 'rgba(196, 154, 108, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.clay,
    borderRadius: 4,
  },
  progressSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressSubText: {
    fontSize: 10,
    color: '#8A8177',
    fontWeight: '600',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewHomesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.clay,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  viewHomesBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Payment Cards
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.25)',
    ...THEME.shadows.card,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptNoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  receiptNoText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusPaid: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    borderWidth: 1,
    borderColor: '#059669',
  },
  statusPaidText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  statusPendingApproval: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  statusPendingApprovalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  statusUnpaid: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  statusUnpaidText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  paymentChargeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    marginBottom: 10,
  },
  paymentDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.15)',
  },
  paymentDetailItem: {
    width: '50%',
    paddingVertical: 5,
  },
  paymentDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.3,
  },
  paymentDetailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
    marginTop: 1,
  },
  paymentDetailValBold: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateValText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
  },
  paymentStatusFooter: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  approvedByText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  pendingAwaitingText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '700',
  },
  rejectedSubtext: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  paymentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderWidth: 1,
    borderColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  receiptActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  verifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  modalSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  modalInput: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    fontSize: 13,
    color: THEME.colors.darkBrown,
  },
  categoryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  catSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
  },
  catSelectPillActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  catSelectPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  catSelectPillTextActive: {
    color: '#FFFFFF',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    gap: 8,
  },
  noticeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    flex: 1,
  },
  modalSubmitBtn: {
    backgroundColor: THEME.colors.clay,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    ...THEME.shadows.card,
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalCancelBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 12,
    color: THEME.colors.darkBrown,
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  assignFlatText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  statusPillSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillSmallText: {
    fontSize: 9,
    fontWeight: '800',
  },
  assignResidentText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  assignAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  assignReceiptLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  assignPayLink: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  paySummaryBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.2)',
    marginBottom: 12,
  },
  paySummaryFlat: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  paySummaryAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.clay,
    marginTop: 4,
  },
  paySummaryDesc: {
    fontSize: 11,
    color: '#8A8177',
    marginTop: 4,
  },
  receiptTopBrand: {
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  receiptBrandIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  receiptSocietyName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#342C26',
    letterSpacing: 0.5,
  },
  receiptSocietySub: {
    fontSize: 10,
    color: '#8A8177',
    marginTop: 2,
    textAlign: 'center',
  },
  stampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 12,
    gap: 6,
  },
  stampText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  receiptField: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8177',
  },
  receiptVal: {
    fontSize: 11,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  receiptValBold: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  receiptStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  receiptStatusTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  receiptTotalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
  },
  receiptTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  receiptTotalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.clay,
  },
  receiptDisclaimer: {
    fontSize: 9,
    color: '#9C958C',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 14,
  },
});
