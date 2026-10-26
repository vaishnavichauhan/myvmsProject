import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Coins,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
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
  CreditCard,
  Landmark,
} from 'lucide-react';
import { specialChargeApi } from '../api/specialChargeApi';
import { societyApi } from '../api/societyApi';
import { committeeApi } from '../api/committeeApi';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';

// Category Configuration & Theme Badges
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
    bg: 'rgba(107, 142, 90, 0.12)',
    color: '#6B8E5A',
    border: '#86EFAC',
  },
  OTHER: {
    label: 'Other Occasional Charge',
    icon: Coins,
    bg: 'rgba(196, 154, 108, 0.15)',
    color: '#C49A6C',
    border: '#D6C2A1',
  },
};

export default function SpecialChargesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;
  const isCommitteeMember = user?.role === ROLES.COMMITTEE_MEMBER;
  const isResident = [ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER].includes(user?.role);
  const canCreate = isAdmin || isCommitteeMember;

  // Active Society State
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(user?.societyId ? String(user.societyId) : '');

  // Committee List for committee-wise tagging
  const [committees, setCommittees] = useState([]);
  const [userCommittees, setUserCommittees] = useState([]);

  // Tab State: 'charges' | 'my-charges' | 'payments'
  const [activeTab, setActiveTab] = useState(isResident && !isCommitteeMember ? 'my-charges' : 'charges');

  // Data States
  const [stats, setStats] = useState(null);
  const [charges, setCharges] = useState([]);
  const [residentCharges, setResidentCharges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [committeeFilter, setCommitteeFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    category: 'REPAIR',
    amount: '',
    due_date: '',
    description: '',
    committee_id: '',
    committee_name: '',
    society_id: selectedSocietyId || '1',
  });

  // Assignments / Homes Drawer Modal
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [selectedChargeForAssignments, setSelectedChargeForAssignments] = useState(null);
  const [chargeAssignments, setChargeAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('ALL');

  // Payment Recording Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null); // assignment record
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_method: 'UPI',
    transaction_reference: '',
    remarks: '',
  });

  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Load Initial Societies & Committees
  useEffect(() => {
    fetchInitialMeta();
  }, []);

  // Reload data when active society changes
  useEffect(() => {
    if (selectedSocietyId) {
      loadData();
    }
  }, [selectedSocietyId]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const showError = (err) => {
    const text = err?.message || (typeof err === 'string' ? err : 'An error occurred');
    setErrorMsg(text);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const fetchInitialMeta = async () => {
    try {
      const socRes = await societyApi.getSocieties();
      const rawSoc = socRes?.data?.societies || socRes?.societies || socRes?.data || socRes || [];
      const socList = Array.isArray(rawSoc) ? rawSoc : (Array.isArray(rawSoc?.societies) ? rawSoc.societies : []);
      setSocieties(socList);

      let currentSocId = selectedSocietyId;
      if (!currentSocId && socList.length > 0) {
        currentSocId = String(socList[0].id);
        setSelectedSocietyId(currentSocId);
      }

      // Fetch Committees
      const commRes = await committeeApi.getCommittees({ society_id: currentSocId || 1 });
      const rawComm = commRes?.data?.committees || commRes?.committees || commRes?.data || commRes || [];
      const commList = Array.isArray(rawComm) ? rawComm : (Array.isArray(rawComm?.committees) ? rawComm.committees : []);
      setCommittees(commList);

      // If user is committee member, fetch their specific member info
      if (isCommitteeMember) {
        try {
          const permRes = await committeeApi.checkMyPermissions();
          const permData = permRes?.data || permRes;
          if (permData?.committee_id) {
            setUserCommittees([
              {
                id: permData.committee_id,
                name: permData.committee_name || 'Managing Committee',
              },
            ]);
          }
        } catch (_) { }
      }
    } catch (e) {
      console.error('Failed to load metadata', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const societyId = selectedSocietyId || '1';

      // 1. Fetch Stats
      try {
        const statsRes = await specialChargeApi.getStats({ society_id: societyId });
        setStats(statsRes?.data || statsRes);
      } catch (e) {
        console.warn('Could not load stats', e);
      }

      // 2. Fetch All Special Charges (for Admin & Committee Members)
      if (canCreate) {
        const chargesRes = await specialChargeApi.getAllCharges({ society_id: societyId });
        setCharges(chargesRes?.data || chargesRes || []);
      }

      // 3. Fetch Resident Charges (for Residents & Committee members who have a home)
      try {
        const resChargesRes = await specialChargeApi.getResidentCharges({ society_id: societyId });
        setResidentCharges(resChargesRes?.data || resChargesRes || []);
      } catch (e) {
        console.warn('Could not load resident charges', e);
      }

      // 4. Fetch Payments / Receipts
      try {
        const payRes = await specialChargeApi.getAllPayments({ society_id: societyId });
        setPayments(payRes?.data || payRes || []);
      } catch (e) {
        console.warn('Could not load payments', e);
      }
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  // Open Create Charge Modal
  const handleOpenCreateModal = () => {
    const today = new Date();
    today.setDate(today.getDate() + 15);
    const defaultDueDate = today.toISOString().split('T')[0];

    let prefillCommId = '';
    let prefillCommName = '';
    if (isCommitteeMember && userCommittees.length > 0) {
      prefillCommId = String(userCommittees[0].id);
      prefillCommName = userCommittees[0].name;
    }

    setCreateFormData({
      title: '',
      category: 'REPAIR',
      amount: '',
      due_date: defaultDueDate,
      description: '',
      committee_id: prefillCommId,
      committee_name: prefillCommName,
      society_id: selectedSocietyId || '1',
    });
    setShowCreateModal(true);
  };

  // Submit Create Special Charge
  const handleCreateCharge = async (e) => {
    e.preventDefault();
    if (!createFormData.title.trim()) {
      showError('Please enter a charge title.');
      return;
    }
    if (!createFormData.amount || Number(createFormData.amount) <= 0) {
      showError('Please enter a valid amount greater than zero.');
      return;
    }
    if (!createFormData.due_date) {
      showError('Please select the date to pay (Due Date).');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...createFormData,
        society_id: Number(createFormData.society_id || selectedSocietyId || 1),
        amount: Number(createFormData.amount),
        committee_id: createFormData.committee_id ? Number(createFormData.committee_id) : null,
      };

      const res = await specialChargeApi.createCharge(payload);
      showToast(res?.message || 'Special charge created and applied to all society homes successfully!');
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      showError(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Assignments Modal for a Charge
  const handleViewAssignments = async (charge) => {
    setSelectedChargeForAssignments(charge);
    setShowAssignmentsModal(true);
    setAssignmentsLoading(true);
    setAssignmentSearch('');
    setAssignmentStatusFilter('ALL');
    try {
      const res = await specialChargeApi.getAssignmentsByCharge(charge.id);
      setChargeAssignments(res?.data || res || []);
    } catch (err) {
      showError(err);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (assignment) => {
    setPaymentTarget(assignment);
    setPaymentFormData({
      amount: assignment.balance_amount || assignment.amount,
      payment_method: 'UPI',
      transaction_reference: '',
      remarks: '',
    });
    setShowPaymentModal(true);
  };

  // Submit Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentFormData.amount || Number(paymentFormData.amount) <= 0) {
      showError('Please enter a valid payment amount.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await specialChargeApi.recordPayment({
        assignment_id: paymentTarget.id,
        amount: Number(paymentFormData.amount),
        payment_method: paymentFormData.payment_method,
        transaction_reference: paymentFormData.transaction_reference.trim() || null,
        remarks: paymentFormData.remarks.trim() || null,
      });

      showToast(res?.message || 'Payment recorded successfully! Receipt generated.');
      setShowPaymentModal(false);

      // Open receipt immediately
      const data = res?.data || res;
      setReceiptData({
        receipt_number: data.receiptNumber || data.receipt_number,
        charge_title: data.chargeTitle || paymentTarget.charge_title || paymentTarget.title,
        home_number: data.homeNumber || paymentTarget.home_number,
        resident_name: paymentTarget.resident_name || user?.fullName || 'Resident',
        amount: data.amount || paymentFormData.amount,
        payment_method: data.paymentMethod || paymentFormData.payment_method,
        transaction_reference: data.transactionReference || paymentFormData.transaction_reference,
        payment_date: new Date().toISOString(),
        society_name: paymentTarget.society_name || 'Society Office',
      });
      setShowReceiptModal(true);

      loadData();
      if (selectedChargeForAssignments) {
        handleViewAssignments(selectedChargeForAssignments);
      }
    } catch (err) {
      showError(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Receipt Modal
  const handleViewReceipt = (item) => {
    setReceiptData({
      receipt_number: item.receipt_number || `RCP-SC-${item.id}`,
      charge_title: item.charge_title || item.title || 'Special Charge',
      home_number: item.home_number || 'N/A',
      resident_name: item.resident_name || user?.fullName || 'Resident',
      amount: item.paid_amount || item.amount,
      payment_method: item.payment_method || 'UPI',
      transaction_reference: item.transaction_reference || 'N/A',
      payment_date: item.paid_date || item.payment_date || item.created_at,
      society_name: item.society_name || 'Society Office',
      committee_name: item.committee_name || null,
    });
    setShowReceiptModal(true);
  };

  // Cancel / Delete Charge
  const handleDeleteCharge = async (chargeId) => {
    if (!window.confirm('Are you sure you want to cancel this special charge? This will mark the assessment as cancelled.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await specialChargeApi.deleteCharge(chargeId);
      showToast(res?.message || 'Special charge cancelled successfully.');
      loadData();
    } catch (err) {
      showError(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Special Charges (Overview tab)
  const filteredCharges = useMemo(() => {
    return charges.filter((c) => {
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (committeeFilter !== 'ALL' && String(c.committee_id) !== committeeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchDesc = c.description?.toLowerCase().includes(q);
        const matchComm = c.committee_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchComm) return false;
      }
      return true;
    });
  }, [charges, categoryFilter, statusFilter, committeeFilter, searchQuery]);

  // Filtered Charge Assignments (in Modal)
  const filteredAssignments = useMemo(() => {
    return chargeAssignments.filter((a) => {
      if (assignmentStatusFilter !== 'ALL' && a.status !== assignmentStatusFilter) return false;
      if (assignmentSearch.trim()) {
        const q = assignmentSearch.toLowerCase();
        const matchHome = a.home_number?.toLowerCase().includes(q);
        const matchResident = a.resident_name?.toLowerCase().includes(q);
        const matchPhone = a.resident_phone?.toLowerCase().includes(q);
        if (!matchHome && !matchResident && !matchPhone) return false;
      }
      return true;
    });
  }, [chargeAssignments, assignmentStatusFilter, assignmentSearch]);

  const activeSocietyObj = useMemo(() => {
    if (!Array.isArray(societies) || societies.length === 0) return null;
    return societies.find((s) => String(s.id) === String(selectedSocietyId)) || societies[0] || null;
  }, [societies, selectedSocietyId]);

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'var(--color-fern-green)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            background: '#DC2626',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.2s ease-in-out',
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
          {/* Maintenance Row Link */}
          <Link
            to="/dashboard/maintenance"
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
            <Receipt size={16} color="var(--color-clay)" />
            <span>Maintenance</span>
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
              Recurring Bills
            </span>
          </Link>

          {/* Special Charges Row Button (Active) */}
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
            <Coins size={16} />
            <span>Special Charges</span>
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
              One-Time (Active)
            </span>
          </div>
        </div>
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          border: '1px solid var(--border-card)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-clay) 0%, #B08253 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(196, 154, 108, 0.35)',
              color: '#ffffff',
            }}
          >
            <Coins size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>
                Special Charges
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 9px',
                  borderRadius: '12px',
                  background: 'rgba(196, 154, 108, 0.15)',
                  color: 'var(--color-clay)',
                  fontWeight: 600,
                  border: '1px solid var(--border-card)',
                }}
              >
                One-Time & Occasional Assessment
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 9px',
                  borderRadius: '12px',
                  background: 'rgba(107, 142, 90, 0.12)',
                  color: 'var(--color-fern-green)',
                  fontWeight: 600,
                }}
              >
                Applied to All Society Homes
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Manage one-time society repair levies, festival contributions, committee-approved renovations, and emergency funds.
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Society Selector (for Admin) */}
          {isAdmin && societies.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="var(--text-dim)" />
              <select
                value={selectedSocietyId}
                onChange={(e) => setSelectedSocietyId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {societies.map((soc) => (
                  <option key={soc.id} value={soc.id}>
                    {soc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Create Button (Admin or Committee Member) */}
          {canCreate && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-clay)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-clay)')}
            >
              <Plus size={18} />
              <span>Create Special Charge</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(196, 154, 108, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-clay)',
            }}
          >
            <Coins size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              {canCreate ? 'Active Levies' : 'Assigned Charges'}
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              {canCreate ? stats?.active_charges || charges.length || 0 : residentCharges.length || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {canCreate ? 'Society-wide special charges' : 'Applied to your residence'}
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(2, 132, 199, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-blue)',
            }}
          >
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              {canCreate ? 'Total Target Assessment' : 'Total Assessment Due'}
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              ₹
              {canCreate
                ? Number(stats?.total_target || 0).toLocaleString('en-IN')
                : residentCharges
                  .reduce((sum, c) => sum + Number(c.amount || 0), 0)
                  .toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {canCreate ? 'Sum of all home allocations' : 'Total for your flat'}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(107, 142, 90, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-fern-green)',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              {canCreate ? 'Total Collected' : 'Total Paid'}
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--color-fern-green)' }}>
              ₹
              {canCreate
                ? Number(stats?.total_collected || 0).toLocaleString('en-IN')
                : residentCharges
                  .reduce((sum, c) => sum + Number(c.paid_amount || 0), 0)
                  .toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {canCreate ? `${stats?.count_paid || 0} homes completed` : 'Verified receipts available'}
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(217, 119, 6, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              {canCreate ? 'Pending Collection' : 'Your Outstanding'}
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#D97706' }}>
              ₹
              {canCreate
                ? Number(stats?.total_pending || 0).toLocaleString('en-IN')
                : residentCharges
                  .reduce((sum, c) => sum + Number(c.balance_amount || 0), 0)
                  .toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {canCreate ? `${stats?.count_pending || 0} homes pending` : 'Pay before due date'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-card)',
          paddingBottom: '2px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {canCreate && (
            <button
              onClick={() => setActiveTab('charges')}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                background: activeTab === 'charges' ? 'var(--color-clay)' : 'transparent',
                color: activeTab === 'charges' ? '#ffffff' : 'var(--text-main)',
                fontWeight: activeTab === 'charges' ? 700 : 500,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Layers size={16} />
              <span>All Special Charges ({charges.length})</span>
            </button>
          )}

          {/* Resident / My Home Tab */}
          {(isResident || isCommitteeMember) && (
            <button
              onClick={() => setActiveTab('my-charges')}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                background: activeTab === 'my-charges' ? 'var(--color-clay)' : 'transparent',
                color: activeTab === 'my-charges' ? '#ffffff' : 'var(--text-main)',
                fontWeight: activeTab === 'my-charges' ? 700 : 500,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Home size={16} />
              <span>My Home Charges ({residentCharges.length})</span>
            </button>
          )}

          {/* Receipts Tab */}
          <button
            onClick={() => setActiveTab('payments')}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              background: activeTab === 'payments' ? 'var(--color-clay)' : 'transparent',
              color: activeTab === 'payments' ? '#ffffff' : 'var(--text-main)',
              fontWeight: activeTab === 'payments' ? 700 : 500,
              fontSize: '0.88rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Receipt size={16} />
            <span>Payment Receipts ({payments.length})</span>
          </button>
        </div>

        {/* Committee Badge Notice */}
        {isCommitteeMember && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-clay)',
              background: 'rgba(196, 154, 108, 0.12)',
              padding: '6px 12px',
              borderRadius: '20px',
            }}
          >
            <Award size={14} />
            <span>Committee Authority: Special charges apply committee-wise to all society homes</span>
          </div>
        )}
      </div>

      {/* Filters Bar (When viewing All Special Charges) */}
      {activeTab === 'charges' && (
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-secondary)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              flex: 1,
              minWidth: '240px',
              maxWidth: '380px',
            }}
          >
            <Search size={16} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search charges by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.86rem',
                color: 'var(--text-main)',
                width: '100%',
              }}
            />
            {searchQuery && (
              <X size={14} color="var(--text-dim)" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
            )}
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="REPAIR">Society Repair</option>
                <option value="FESTIVAL">Festival Charges</option>
                <option value="INFRASTRUCTURE">Infrastructure</option>
                <option value="EMERGENCY">Emergency Fund</option>
                <option value="EVENT">Event & Celebration</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Committee Filter */}
            {committees.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Committee:</span>
                <select
                  value={committeeFilter}
                  onChange={(e) => setCommitteeFilter(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  <option value="ALL">All Committees</option>
                  {committees.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Coins size={32} color="var(--color-clay)" style={{ animation: 'spin 2s linear infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Loading Special Charges & Assessments...</p>
        </div>
      ) : activeTab === 'charges' ? (
        /* TAB 1: ALL SPECIAL CHARGES (ADMIN & COMMITTEE MEMBERS) */
        filteredCharges.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 24px',
              textAlign: 'center',
              border: '1px dashed var(--border-card)',
            }}
          >
            <Coins size={44} color="var(--color-clay)" style={{ opacity: 0.6 }} />
            <h3 style={{ margin: '14px 0 6px 0', fontSize: '1.15rem', color: 'var(--text-heading)' }}>
              No Special Charges Found
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
              Special charges are one-time or occasional charges for society repairs, festival celebrations, or committee initiatives.
            </p>
            {canCreate && (
              <button
                onClick={handleOpenCreateModal}
                style={{
                  marginTop: '18px',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-clay)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Plus size={16} />
                <span>Create First Special Charge</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {filteredCharges.map((charge) => {
              const catConf = CATEGORY_MAP[charge.category] || CATEGORY_MAP.OTHER;
              const CatIcon = catConf.icon;
              const totalHomes = Number(charge.total_homes_assigned || 0);
              const paidHomes = Number(charge.total_homes_paid || 0);
              const progressPct = totalHomes > 0 ? Math.round((paidHomes / totalHomes) * 100) : 0;

              return (
                <div
                  key={charge.id}
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-card)',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  {/* Top Bar: Category & Status */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: catConf.bg,
                          color: catConf.color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: `1px solid ${catConf.border}`,
                        }}
                      >
                        <CatIcon size={13} />
                        <span>{catConf.label}</span>
                      </span>

                      {charge.committee_name && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(196, 154, 108, 0.12)',
                            color: 'var(--color-clay)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Award size={12} />
                          <span>{charge.committee_name}</span>
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background:
                          charge.status === 'ACTIVE'
                            ? 'rgba(107, 142, 90, 0.15)'
                            : charge.status === 'COMPLETED'
                              ? 'rgba(2, 132, 199, 0.15)'
                              : 'rgba(220, 38, 38, 0.15)',
                        color:
                          charge.status === 'ACTIVE'
                            ? 'var(--color-fern-green)'
                            : charge.status === 'COMPLETED'
                              ? 'var(--accent-blue)'
                              : '#DC2626',
                      }}
                    >
                      {charge.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 6px 0' }}>
                      {charge.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.84rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {charge.description || 'No additional description provided for this special charge.'}
                    </p>
                  </div>

                  {/* Details Card */}
                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        AMOUNT PER HOME
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-clay)' }}>
                        ₹{Number(charge.amount).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        DATE TO PAY (DUE)
                      </div>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: 'var(--text-heading)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '3px',
                        }}
                      >
                        <Calendar size={14} color="var(--color-clay)" />
                        <span>
                          {charge.due_date ? new Date(charge.due_date).toLocaleDateString('en-GB') : 'Immediate'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress & Breakdown */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>
                        Collection: {paidHomes} of {totalHomes} Homes Paid
                      </span>
                      <span style={{ color: 'var(--color-clay)', fontWeight: 700 }}>{progressPct}%</span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '7px',
                        borderRadius: '4px',
                        background: 'rgba(214, 194, 161, 0.3)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--color-clay) 0%, var(--color-fern-green) 100%)',
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        marginTop: '6px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>Collected: ₹{Number(charge.total_collected_amount || 0).toLocaleString('en-IN')}</span>
                      <span>Target: ₹{Number(charge.total_target_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border-subtle)',
                      gap: '8px',
                    }}
                  >
                    <button
                      onClick={() => handleViewAssignments(charge)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-clay)',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <Eye size={15} />
                      <span>View All Homes ({totalHomes})</span>
                    </button>

                    {isAdmin && charge.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleDeleteCharge(charge.id)}
                        title="Cancel this charge"
                        style={{
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-md)',
                          background: 'transparent',
                          color: '#DC2626',
                          border: '1px solid rgba(220, 38, 38, 0.3)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'my-charges' ? (
        /* TAB 2: MY HOME CHARGES (RESIDENTS & HOME OCCUPANTS) */
        residentCharges.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 24px',
              textAlign: 'center',
              border: '1px dashed var(--border-card)',
            }}
          >
            <CheckCircle2 size={44} color="var(--color-fern-green)" />
            <h3 style={{ margin: '14px 0 6px 0', fontSize: '1.15rem', color: 'var(--text-heading)' }}>
              No Outstanding Special Charges
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Your home has no pending one-time or occasional charges levied at this time.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {residentCharges.map((item) => {
              const catConf = CATEGORY_MAP[item.charge_category] || CATEGORY_MAP.OTHER;
              const CatIcon = catConf.icon;
              const isPaid = item.status === 'PAID';
              const isPartial = item.status === 'PARTIALLY_PAID';
              const dueDateObj = item.charge_due_date ? new Date(item.charge_due_date) : null;
              const isOverdue = !isPaid && dueDateObj && dueDateObj < new Date();

              return (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-card)',
                    padding: '22px 26px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Left Charge Info */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: '1 1 360px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--radius-md)',
                        background: catConf.bg,
                        color: catConf.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CatIcon size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: catConf.bg,
                            color: catConf.color,
                          }}
                        >
                          {catConf.label}
                        </span>
                        {item.committee_name && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(196, 154, 108, 0.12)',
                              color: 'var(--color-clay)',
                            }}
                          >
                            Issued by: {item.committee_name}
                          </span>
                        )}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Flat / Home: <strong>{item.home_number}</strong>
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)', margin: '6px 0 4px 0' }}>
                        {item.charge_title}
                      </h3>

                      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {item.charge_description || 'Occasional society charge approved by managing committee.'}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          marginTop: '8px',
                          fontSize: '0.78rem',
                          color: 'var(--text-dim)',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={14} color={isOverdue ? '#DC2626' : 'var(--color-clay)'} />
                          <span style={{ color: isOverdue ? '#DC2626' : 'inherit', fontWeight: isOverdue ? 700 : 500 }}>
                            Date to Pay: {dueDateObj ? dueDateObj.toLocaleDateString('en-GB') : 'Immediate'}
                            {isOverdue && ' (OVERDUE)'}
                          </span>
                        </span>
                        {item.paid_date && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-fern-green)' }}>
                            <CheckCircle2 size={14} />
                            <span>Paid on: {new Date(item.paid_date).toLocaleDateString('en-GB')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Financial & Action */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '24px',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        {isPaid ? 'PAID AMOUNT' : 'BALANCE TO PAY'}
                      </div>
                      <div
                        style={{
                          fontSize: '1.35rem',
                          fontWeight: 800,
                          color: isPaid ? 'var(--color-fern-green)' : 'var(--text-heading)',
                        }}
                      >
                        ₹{Number(isPaid ? item.paid_amount : item.balance_amount).toLocaleString('en-IN')}
                      </div>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          marginTop: '3px',
                          background: isPaid
                            ? 'rgba(107, 142, 90, 0.15)'
                            : isPartial
                              ? 'rgba(2, 132, 199, 0.15)'
                              : 'rgba(217, 119, 6, 0.15)',
                          color: isPaid ? 'var(--color-fern-green)' : isPartial ? 'var(--accent-blue)' : '#D97706',
                        }}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {!isPaid && (
                        <button
                          onClick={() => handleOpenPayment(item)}
                          style={{
                            padding: '9px 18px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-clay)',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
                          }}
                        >
                          <CreditCard size={15} />
                          <span>Pay Now</span>
                        </button>
                      )}

                      {isPaid && (
                        <button
                          onClick={() => handleViewReceipt(item)}
                          style={{
                            padding: '9px 18px',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(107, 142, 90, 0.12)',
                            color: 'var(--color-fern-green)',
                            border: '1px solid rgba(107, 142, 90, 0.3)',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <Printer size={15} />
                          <span>View Receipt</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* TAB 3: PAYMENT RECEIPTS */
        payments.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '60px 24px',
              textAlign: 'center',
              border: '1px dashed var(--border-card)',
            }}
          >
            <Receipt size={44} color="var(--color-clay)" style={{ opacity: 0.6 }} />
            <h3 style={{ margin: '14px 0 6px 0', fontSize: '1.15rem', color: 'var(--text-heading)' }}>
              No Payment Receipts Yet
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Whenever payments are recorded for special charges, verified receipts will appear here.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-card)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-card)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>RECEIPT #</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>SPECIAL CHARGE</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>FLAT / HOME</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>RESIDENT</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>AMOUNT</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>METHOD</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>DATE</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-dim)', textAlign: 'right' }}>
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--color-clay)' }}>
                      {p.receipt_number}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--text-heading)' }}>
                      {p.charge_title}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600 }}>{p.home_number}</td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{p.resident_name || 'Resident'}</td>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--color-fern-green)' }}>
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(196, 154, 108, 0.12)',
                          color: 'var(--color-clay)',
                        }}
                      >
                        {p.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(p.payment_date).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewReceipt(p)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(196, 154, 108, 0.12)',
                          color: 'var(--color-clay)',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Printer size={14} />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ========================================================
          MODAL 1: CREATE SPECIAL CHARGE (ADMIN & COMMITTEE MEMBER)
          ======================================================== */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '620px',
              border: '1px solid var(--border-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-clay)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Coins size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    Create Special Charge
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    One-time / occasional charge applied to all homes in society
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateCharge} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Scope Notice Banner */}
              <div
                style={{
                  background: 'rgba(196, 154, 108, 0.12)',
                  border: '1px solid var(--border-card)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertCircle size={18} color="var(--color-clay)" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Important:</strong> When created, this charge is automatically allocated to <strong>all active homes</strong> in the selected society.
                </span>
              </div>

              {/* Society Selector (if Admin and multiple) */}
              {isAdmin && societies.length > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Society *
                  </label>
                  <select
                    value={createFormData.society_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, society_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.86rem',
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

              {/* Title Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Charge Title / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Society Lift Repair, Diwali Festival 2026, Water Tank Deep Cleaning"
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              {/* Category & Committee Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Category */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    value={createFormData.category}
                    onChange={(e) => setCreateFormData({ ...createFormData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.86rem',
                    }}
                  >
                    <option value="REPAIR">Society Repair</option>
                    <option value="FESTIVAL">Festival Charges</option>
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                    <option value="EMERGENCY">Emergency Fund</option>
                    <option value="EVENT">Event & Celebration</option>
                    <option value="OTHER">Other Occasional</option>
                  </select>
                </div>

                {/* Committee Wise Tagging */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Committee Authority (Optional)
                  </label>
                  <select
                    value={createFormData.committee_id}
                    onChange={(e) => {
                      const selected = committees.find((c) => String(c.id) === e.target.value);
                      setCreateFormData({
                        ...createFormData,
                        committee_id: e.target.value,
                        committee_name: selected?.name || '',
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.86rem',
                    }}
                  >
                    <option value="">General Management Committee</option>
                    {committees.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount & Date to Pay Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Amount (₹) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Amount Per Home (₹) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-dim)',
                        fontWeight: 700,
                      }}
                    >
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 2500"
                      value={createFormData.amount}
                      onChange={(e) => setCreateFormData({ ...createFormData, amount: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 28px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-main)',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                      }}
                    />
                  </div>
                </div>

                {/* Date to Pay (due_date) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Date to Pay (Due Date) *
                  </label>
                  <input
                    type="date"
                    value={createFormData.due_date}
                    onChange={(e) => setCreateFormData({ ...createFormData, due_date: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.86rem',
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Description / Quotation Details *
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide background details, resolution number, scope of repair or festival celebration arrangement..."
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Modal Footer Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-card)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-clay)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
                    opacity: actionLoading ? 0.7 : 1,
                  }}
                >
                  {actionLoading ? 'Creating & Applying...' : 'Create & Apply to All Homes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: ALL HOMES ASSIGNMENT & STATUS BREAKDOWN
          ======================================================== */}
      {showAssignmentsModal && selectedChargeForAssignments && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '920px',
              border: '1px solid var(--border-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(196, 154, 108, 0.15)',
                      color: 'var(--color-clay)',
                    }}
                  >
                    All Homes Directory
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Due: {selectedChargeForAssignments.due_date ? new Date(selectedChargeForAssignments.due_date).toLocaleDateString('en-GB') : '-'}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  {selectedChargeForAssignments.title}
                </h3>
              </div>
              <button
                onClick={() => setShowAssignmentsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Search inside Modal */}
            <div
              style={{
                padding: '14px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                background: 'var(--bg-card)',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-secondary)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  width: '260px',
                }}
              >
                <Search size={14} color="var(--text-dim)" />
                <input
                  type="text"
                  placeholder="Filter by flat # or resident..."
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.82rem',
                    width: '100%',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {['ALL', 'PENDING', 'PAID', 'PARTIALLY_PAID'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setAssignmentStatusFilter(st)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: assignmentStatusFilter === st ? 'none' : '1px solid var(--border-subtle)',
                      background: assignmentStatusFilter === st ? 'var(--color-clay)' : 'transparent',
                      color: assignmentStatusFilter === st ? '#ffffff' : 'var(--text-main)',
                      cursor: 'pointer',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignments Table */}
            <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
              {assignmentsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Coins size={24} color="var(--color-clay)" style={{ animation: 'spin 2s linear infinite' }} />
                  <p style={{ marginTop: '8px', fontSize: '0.85rem' }}>Loading home assignments...</p>
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No homes matched the search criteria.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-card)' }}>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>FLAT #</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>RESIDENT</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>AMOUNT</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>PAID</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>BALANCE</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-dim)' }}>STATUS</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-dim)', textAlign: 'right' }}>
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssignments.map((a) => {
                      const isPaid = a.status === 'PAID';
                      return (
                        <tr
                          key={a.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--text-heading)' }}>
                            {a.home_number}
                            {a.building_or_wing && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: '4px' }}>
                                ({a.building_or_wing})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{a.resident_name || 'Occupied Flat'}</div>
                            {a.resident_phone && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{a.resident_phone}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 18px', fontWeight: 600 }}>
                            ₹{Number(a.amount).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 18px', color: 'var(--color-fern-green)', fontWeight: 600 }}>
                            ₹{Number(a.paid_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 18px', color: isPaid ? 'var(--text-dim)' : '#D97706', fontWeight: 700 }}>
                            ₹{Number(a.balance_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ padding: '12px 18px' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: isPaid
                                  ? 'rgba(107, 142, 90, 0.15)'
                                  : a.status === 'PARTIALLY_PAID'
                                    ? 'rgba(2, 132, 199, 0.15)'
                                    : 'rgba(217, 119, 6, 0.15)',
                                color: isPaid ? 'var(--color-fern-green)' : a.status === 'PARTIALLY_PAID' ? 'var(--accent-blue)' : '#D97706',
                              }}
                            >
                              {a.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                            {!isPaid ? (
                              <button
                                onClick={() => handleOpenPayment(a)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 'var(--radius-md)',
                                  background: 'var(--color-clay)',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 600,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Record Payment
                              </button>
                            ) : (
                              <button
                                onClick={() => handleViewReceipt(a)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 'var(--radius-md)',
                                  background: 'rgba(107, 142, 90, 0.12)',
                                  color: 'var(--color-fern-green)',
                                  border: '1px solid rgba(107, 142, 90, 0.3)',
                                  fontWeight: 600,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Receipt
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-card)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>Total Homes Assigned: {chargeAssignments.length}</span>
              <button
                onClick={() => setShowAssignmentsModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: RECORD / PAY PAYMENT
          ======================================================== */}
      {showPaymentModal && paymentTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '480px',
              border: '1px solid var(--border-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={20} color="var(--color-clay)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Record Payment
                </h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordPayment} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>FLAT & CHARGE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Flat {paymentTarget.home_number} • {paymentTarget.charge_title || paymentTarget.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Balance Due: ₹{Number(paymentTarget.balance_amount || paymentTarget.amount).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={paymentTarget.balance_amount || paymentTarget.amount}
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                  }}
                />
              </div>

              {/* Method */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Payment Method *
                </label>
                <select
                  value={paymentFormData.payment_method}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                  }}
                >
                  <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="NET_BANKING">Net Banking / IMPS / NEFT</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Transaction Reference / UTR #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref / Bank Txn ID"
                  value={paymentFormData.transaction_reference}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, transaction_reference: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              {/* Remarks */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid in full for Diwali celebration"
                  value={paymentFormData.remarks}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, remarks: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--border-card)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-clay)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
                    opacity: actionLoading ? 0.7 : 1,
                  }}
                >
                  {actionLoading ? 'Recording...' : 'Confirm & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: OFFICIAL PAYMENT RECEIPT
          ======================================================== */}
      {showReceiptModal && receiptData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1001,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            id="special-charge-receipt"
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '560px',
              border: '2px solid var(--border-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              color: '#333333',
              fontFamily: 'var(--font-body)',
            }}
          >
            {/* Receipt Header Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #C49A6C 0%, #B08253 100%)',
                color: '#ffffff',
                padding: '24px',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setShowReceiptModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>

              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                Official Society Receipt
              </div>
              <h2 style={{ margin: '4px 0', fontSize: '1.4rem', fontWeight: 800 }}>
                {receiptData.society_name || activeSocietyObj?.name || 'Residential Society'}
              </h2>
              <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>Special Assessment & Occasional Charge Receipt</div>
            </div>

            {/* Receipt Body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px dashed #e2e8f0',
                  paddingBottom: '12px',
                  fontSize: '0.82rem',
                }}
              >
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>RECEIPT NUMBER</div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>{receiptData.receipt_number}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>PAYMENT DATE</div>
                  <div style={{ fontWeight: 600 }}>
                    {receiptData.payment_date ? new Date(receiptData.payment_date).toLocaleString('en-GB') : '-'}
                  </div>
                </div>
              </div>

              {/* Home & Payer Info */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  fontSize: '0.82rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>FLAT / HOME NO:</span>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{receiptData.home_number}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>RESIDENT NAME:</span>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{receiptData.resident_name}</div>
                </div>
              </div>

              {/* Charge Specifics */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>CHARGE PARTICULARS</div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginTop: '2px' }}>
                  {receiptData.charge_title}
                </div>
                {receiptData.committee_name && (
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    Committee: <strong>{receiptData.committee_name}</strong>
                  </div>
                )}
              </div>

              {/* Amount Breakdown */}
              <div
                style={{
                  background: '#f1f5f9',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>AMOUNT RECEIVED</div>
                  <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                    Status: Verified & Confirmed
                  </div>
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669' }}>
                  ₹{Number(receiptData.amount).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Mode & Reference */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  fontSize: '0.78rem',
                  color: '#64748b',
                }}
              >
                <div>
                  Payment Method: <strong>{receiptData.payment_method}</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  Ref #: <strong>{receiptData.transaction_reference || 'DIRECT'}</strong>
                </div>
              </div>

              {/* Digital Seal */}
              <div
                style={{
                  borderTop: '1px dashed #cbd5e1',
                  paddingTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#059669" />
                  <span>Authorized Digital Society Signature</span>
                </div>
                <span>MYVMS Automated Receipt</span>
              </div>
            </div>

            {/* Print & Close Buttons */}
            <div
              style={{
                padding: '16px 24px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                onClick={() => setShowReceiptModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>

              <button
                onClick={() => window.print()}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#C49A6C',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
