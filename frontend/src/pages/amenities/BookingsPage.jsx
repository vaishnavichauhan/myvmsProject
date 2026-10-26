import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck2,
  Plus,
  Search,
  Filter,
  Clock,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Eye,
  Check,
  X,
  CreditCard,
  Shield,
  FileText,
  DollarSign,
  ChevronRight,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';
import { amenityApi } from '../../api/amenityApi';
import { societyApi } from '../../api/societyApi';
import { useAuthStore } from '../../store/authStore';
import { ROLES } from '../../constants/roles';

export const BOOKING_STATUS_CONFIG = {
  PENDING_APPROVAL: { label: 'Pending Approval', color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
  APPROVED: { label: 'Approved — Payment Pending', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
  CONFIRMED: { label: 'Confirmed', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  REJECTED: { label: 'Rejected', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  CANCELLED: { label: 'Cancelled', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
  COMPLETED: { label: 'Completed', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
  NO_SHOW: { label: 'No-Show', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.12)' },
};

export const PAYMENT_STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: '#D97706', bg: 'rgba(217, 119, 6, 0.12)' },
  PARTIALLY_PAID: { label: 'Partial', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.12)' },
  PAID: { label: 'Paid', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  FAILED: { label: 'Failed', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  REFUNDED: { label: 'Refunded', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.12)' },
};

export default function BookingsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;
  const isCommitteeMember = user?.role === ROLES.COMMITTEE_MEMBER;
  const isResident = [ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER].includes(user?.role);
  const canApprove = isAdmin || isCommitteeMember;

  // Bookings list state
  const [bookings, setBookings] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [amenityFilter, setAmenityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [viewingBooking, setViewingBooking] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [actionBooking, setActionBooking] = useState(null);

  // Action Form Inputs
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_type: 'FULL_PAYMENT',
    payment_method: 'UPI',
    transaction_reference: '',
    remarks: '',
  });
  const [completeForm, setCompleteForm] = useState({
    facility_condition_notes: 'Facility inspected in clean and satisfactory condition.',
    damage_notes: '',
    damage_deduction_amount: 0,
    deposit_deduction_reason: '',
  });

  // New Booking Request Form State
  const [newBooking, setNewBooking] = useState({
    amenity_id: '',
    booking_date: '',
    start_time: '10:00',
    end_time: '12:00',
    purpose: '',
    expected_guests: 1,
    additional_notes: '',
    acceptRules: false,
  });
  const [pricingEstimate, setPricingEstimate] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Fetch Initial Data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load amenities list for dropdown
      const amRes = await amenityApi.getAmenities();
      const amList = Array.isArray(amRes.data) ? amRes.data : (amRes.data?.data || []);
      setAmenities(amList);

      // Load bookings
      const params = {};
      if (amenityFilter !== 'ALL') params.amenity_id = amenityFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (paymentFilter !== 'ALL') params.payment_status = paymentFilter;
      if (dateFilter) params.booking_date = dateFilter;
      if (search.trim()) params.search = search.trim();

      const res = await amenityApi.getBookings(params);
      setBookings(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      console.error('Failed to load bookings', err);
      setError(err.response?.data?.message || err.message || 'Error fetching bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [amenityFilter, statusFilter, paymentFilter, dateFilter]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  // View Details
  const handleOpenDetail = async (booking) => {
    try {
      const res = await amenityApi.getBookingById(booking.id);
      setViewingBooking(res.data?.data || res.data || booking);
      setIsDetailOpen(true);
    } catch (err) {
      setViewingBooking(booking);
      setIsDetailOpen(true);
    }
  };

  // Approve Booking
  const handleApprove = async (booking) => {
    if (!window.confirm(`Approve reservation ${booking.booking_number} for ${booking.amenity_name}?`)) {
      return;
    }
    try {
      await amenityApi.approveBooking(booking.id);
      fetchData();
      if (isDetailOpen) handleOpenDetail(booking);
    } catch (err) {
      alert('Approval failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Reject Booking
  const handleOpenReject = (booking) => {
    setActionBooking(booking);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    try {
      setModalLoading(true);
      await amenityApi.rejectBooking(actionBooking.id, rejectionReason.trim());
      setIsRejectModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Rejection failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setModalLoading(false);
    }
  };

  // Cancel Booking
  const handleOpenCancel = (booking) => {
    setActionBooking(booking);
    setCancellationReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancellationReason.trim()) {
      alert('Please provide a reason for cancellation.');
      return;
    }
    try {
      setModalLoading(true);
      await amenityApi.cancelBooking(actionBooking.id, cancellationReason.trim());
      setIsCancelModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Cancellation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setModalLoading(false);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = (booking) => {
    setActionBooking(booking);
    const balance = Math.max(0, Number(booking.total_amount) - (Number(booking.deposit_collected_amount) || 0));
    setPaymentForm({
      amount: balance > 0 ? String(balance) : String(booking.total_amount),
      payment_type: 'FULL_PAYMENT',
      payment_method: 'UPI',
      transaction_reference: '',
      remarks: 'Online / Counter receipt payment',
    });
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      await amenityApi.recordPayment({
        booking_id: actionBooking.id,
        amount: Number(paymentForm.amount),
        payment_type: paymentForm.payment_type,
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference,
        remarks: paymentForm.remarks,
      });
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Payment recording failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setModalLoading(false);
    }
  };

  // Complete Booking & Record condition
  const handleOpenComplete = (booking) => {
    setActionBooking(booking);
    setCompleteForm({
      facility_condition_notes: 'Facility inspected in clean and satisfactory condition.',
      damage_notes: '',
      damage_deduction_amount: 0,
      deposit_deduction_reason: '',
    });
    setIsCompleteModalOpen(true);
  };

  const handleConfirmComplete = async (e) => {
    e.preventDefault();
    try {
      setModalLoading(true);
      await amenityApi.completeBooking(actionBooking.id, {
        facility_condition_notes: completeForm.facility_condition_notes,
        damage_notes: completeForm.damage_notes,
        damage_deduction_amount: Number(completeForm.damage_deduction_amount || 0),
        deposit_deduction_reason: completeForm.deposit_deduction_reason,
      });
      setIsCompleteModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Completing booking failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setModalLoading(false);
    }
  };

  // Mark No-Show
  const handleMarkNoShow = async (booking) => {
    if (!window.confirm(`Mark booking ${booking.booking_number} as No-Show?`)) return;
    try {
      await amenityApi.markNoShow(booking.id, 'Resident did not show up during scheduled hours');
      fetchData();
    } catch (err) {
      alert('Error marking no-show: ' + (err.response?.data?.message || err.message));
    }
  };

  // New Booking Request Handlers
  const handleOpenNewBooking = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defDate = tomorrow.toISOString().split('T')[0];

    const firstAmenity = amenities.find((a) => a.status === 'ACTIVE') || amenities[0];
    setNewBooking({
      amenity_id: firstAmenity ? String(firstAmenity.id) : '',
      booking_date: defDate,
      start_time: '10:00',
      end_time: '12:00',
      purpose: '',
      expected_guests: 10,
      additional_notes: '',
      acceptRules: false,
    });
    setPricingEstimate(null);
    setModalError(null);
    setIsNewBookingOpen(true);

    if (firstAmenity) {
      calculateEstimate(firstAmenity.id, defDate, '10:00', '12:00');
    }
  };

  const calculateEstimate = async (amenityId, date, start, end) => {
    if (!amenityId || !date || !start || !end) return;
    try {
      const res = await amenityApi.calculatePrice(amenityId, {
        booking_date: date,
        start_time: `${start}:00`,
        end_time: `${end}:00`,
      });
      setPricingEstimate(res.data?.data || res.data || null);
    } catch {
      setPricingEstimate(null);
    }
  };

  const handleNewBookingChange = (field, val) => {
    const updated = { ...newBooking, [field]: val };
    setNewBooking(updated);

    if (['amenity_id', 'booking_date', 'start_time', 'end_time'].includes(field)) {
      if (updated.amenity_id && updated.booking_date && updated.start_time && updated.end_time) {
        calculateEstimate(updated.amenity_id, updated.booking_date, updated.start_time, updated.end_time);
      }
    }
  };

  const handleCreateBookingSubmit = async (e) => {
    e.preventDefault();
    if (!newBooking.acceptRules) {
      alert('Please read and accept the amenity rules to proceed.');
      return;
    }
    setModalLoading(true);
    setModalError(null);

    try {
      await amenityApi.createBooking({
        amenity_id: newBooking.amenity_id,
        booking_date: newBooking.booking_date,
        start_time: `${newBooking.start_time}:00`,
        end_time: `${newBooking.end_time}:00`,
        purpose: newBooking.purpose,
        expected_guests: Number(newBooking.expected_guests),
        additional_notes: newBooking.additional_notes,
      });

      alert('Reservation submitted successfully!');
      setIsNewBookingOpen(false);
      fetchData();
    } catch (err) {
      console.error('Booking failed', err);
      setModalError(err.response?.data?.message || err.message || 'Failed to submit booking');
    } finally {
      setModalLoading(false);
    }
  };

  // KPI calculations
  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.booking_status === 'PENDING_APPROVAL').length,
    confirmed: bookings.filter((b) => b.booking_status === 'CONFIRMED').length,
    approved: bookings.filter((b) => b.booking_status === 'APPROVED').length,
    completed: bookings.filter((b) => b.booking_status === 'COMPLETED').length,
    cancelled: bookings.filter((b) => b.booking_status === 'CANCELLED').length,
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Breadcrumb */}
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
            <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>Booking Management</span>
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
            <CalendarCheck2 size={28} color="var(--color-clay)" />
            {isResident ? 'My Amenity Bookings' : 'Amenity Booking Management'}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            {isResident
              ? 'Track your reservation requests, payment statuses, and deposit refund histories.'
              : 'Review, approve, verify payments, cancel, and inspect amenity reservations across the society.'}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchData}
            title="Refresh bookings"
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

          <button
            onClick={handleOpenNewBooking}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-clay)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(196, 154, 108, 0.25)',
            }}
          >
            <Plus size={16} />
            New Booking Request
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
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
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Bookings</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.total}</span>
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
          <span style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600 }}>Pending Approval</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706' }}>{stats.pending}</span>
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
          <span style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 600 }}>Payment Pending</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB' }}>{stats.approved}</span>
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
          <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>Confirmed Bookings</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10B981' }}>{stats.confirmed}</span>
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
          <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>Completed</span>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>{stats.completed}</span>
        </div>
      </div>

      {/* Filters Bar */}
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
        {/* Search */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            flex: '1 1 240px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            placeholder="Search booking #, resident, home, or amenity..."
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
              outline: 'none',
            }}
          />
        </form>

        {/* Amenity Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Amenity:</span>
          <select
            value={amenityFilter}
            onChange={(e) => setAmenityFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
            }}
          >
            <option value="ALL">All Amenities</option>
            {amenities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Booking Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Status:</span>
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
            {Object.keys(BOOKING_STATUS_CONFIG).map((k) => (
              <option key={k} value={k}>
                {BOOKING_STATUS_CONFIG[k].label}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Payment:</span>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
            }}
          >
            <option value="ALL">All Payments</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Date:</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
            }}
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading bookings...
        </div>
      ) : bookings.length === 0 ? (
        <div
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-card)',
          }}
        >
          <CalendarCheck2 size={42} color="var(--color-clay)" style={{ opacity: 0.5, marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-main)' }}>No Bookings Found</h3>
          <p style={{ margin: '0 0 16px 0', color: 'var(--text-dim)', fontSize: '0.86rem' }}>
            There are no booking records matching your selected filters.
          </p>
          <button
            onClick={handleOpenNewBooking}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-clay)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create New Booking
          </button>
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
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Amenity & Purpose</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Schedule</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Resident & Home</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Amount & Deposit</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Payment</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const statusCfg = BOOKING_STATUS_CONFIG[b.booking_status] || BOOKING_STATUS_CONFIG.PENDING_APPROVAL;
                const payCfg = PAYMENT_STATUS_CONFIG[b.payment_status] || PAYMENT_STATUS_CONFIG.PENDING;

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
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {b.purpose} {b.expected_guests ? `(${b.expected_guests} guests)` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {new Date(b.booking_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {b.start_time?.slice(0, 5)} - {b.end_time?.slice(0, 5)} ({b.duration_hours}h)
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        Home {b.home_number || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {b.resident_name || 'Resident'}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        ₹{Number(b.total_amount).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#C49A6C' }}>
                        Fee: ₹{Number(b.booking_fee).toLocaleString()} | Dep: ₹{Number(b.security_deposit).toLocaleString()}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: payCfg.bg,
                          color: payCfg.color,
                        }}
                      >
                        {payCfg.label}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: statusCfg.bg,
                          color: statusCfg.color,
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        {/* View Details */}
                        <button
                          onClick={() => handleOpenDetail(b)}
                          title="View Details"
                          style={{
                            padding: '5px 8px',
                            background: 'transparent',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                        </button>

                        {/* Admin / Committee Approval */}
                        {canApprove && b.booking_status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              onClick={() => handleApprove(b)}
                              title="Approve Booking"
                              style={{
                                padding: '5px 8px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid #10B981',
                                borderRadius: 'var(--radius-sm)',
                                color: '#10B981',
                                cursor: 'pointer',
                              }}
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenReject(b)}
                              title="Reject Booking"
                              style={{
                                padding: '5px 8px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid #EF4444',
                                borderRadius: 'var(--radius-sm)',
                                color: '#EF4444',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}

                        {/* Payment Verification / Collection */}
                        {b.payment_status !== 'PAID' && ['APPROVED', 'CONFIRMED', 'PENDING_APPROVAL'].includes(b.booking_status) && Number(b.total_amount) > 0 && (
                          <button
                            onClick={() => handleOpenPayment(b)}
                            title="Record Payment"
                            style={{
                              padding: '5px 8px',
                              background: 'rgba(196, 154, 108, 0.15)',
                              border: '1px solid var(--color-clay)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--color-clay)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <CreditCard size={13} />
                          </button>
                        )}

                        {/* Admin Complete & Inspect */}
                        {isAdmin && ['CONFIRMED', 'APPROVED'].includes(b.booking_status) && (
                          <button
                            onClick={() => handleOpenComplete(b)}
                            title="Complete & Record Inspection"
                            style={{
                              padding: '5px 8px',
                              background: 'transparent',
                              border: '1px solid var(--border-card)',
                              borderRadius: 'var(--radius-sm)',
                              color: '#059669',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Inspect
                          </button>
                        )}

                        {/* Cancel Booking */}
                        {['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED'].includes(b.booking_status) && (
                          <button
                            onClick={() => handleOpenCancel(b)}
                            title="Cancel Booking"
                            style={{
                              padding: '5px 8px',
                              background: 'transparent',
                              border: '1px solid var(--border-card)',
                              borderRadius: 'var(--radius-sm)',
                              color: '#6B7280',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Cancel
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
      )}

      {/* ====================================================================== */}
      {/* MODAL 1: VIEW BOOKING DETAILS                                          */}
      {/* ====================================================================== */}
      {isDetailOpen && viewingBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-card)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--color-clay)',
                    textTransform: 'uppercase',
                  }}
                >
                  Booking Details
                </span>
                <h2 style={{ margin: '4px 0 2px 0', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {viewingBooking.booking_number} — {viewingBooking.amenity_name}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  Home {viewingBooking.home_number} • Resident: {viewingBooking.resident_name} ({viewingBooking.resident_phone || 'No phone'})
                </div>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: BOOKING_STATUS_CONFIG[viewingBooking.booking_status]?.bg || 'rgba(0,0,0,0.1)',
                  color: BOOKING_STATUS_CONFIG[viewingBooking.booking_status]?.color || '#000',
                }}
              >
                Status: {BOOKING_STATUS_CONFIG[viewingBooking.booking_status]?.label}
              </span>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: PAYMENT_STATUS_CONFIG[viewingBooking.payment_status]?.bg || 'rgba(0,0,0,0.1)',
                  color: PAYMENT_STATUS_CONFIG[viewingBooking.payment_status]?.color || '#000',
                }}
              >
                Payment: {PAYMENT_STATUS_CONFIG[viewingBooking.payment_status]?.label}
              </span>

              {viewingBooking.deposit_refund_status !== 'NOT_APPLICABLE' && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '4px',
                    background: 'rgba(196, 154, 108, 0.15)',
                    color: 'var(--color-clay)',
                  }}
                >
                  Deposit Refund: {viewingBooking.deposit_refund_status}
                </span>
              )}
            </div>

            {/* Schedule & Purpose */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '14px',
                background: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.84rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Reservation Date</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{viewingBooking.booking_date}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Time Slot</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {viewingBooking.start_time?.slice(0, 5)} - {viewingBooking.end_time?.slice(0, 5)} ({viewingBooking.duration_hours}h)
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Event Purpose</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{viewingBooking.purpose}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Expected Guests</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{viewingBooking.expected_guests} Attendees</div>
              </div>
            </div>

            {/* Pricing & Deposit Breakdown */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px',
                background: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.84rem',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--color-clay)', marginBottom: '2px' }}>
                Financial Ledger & Security Deposit
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Applied Booking Fee:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  ₹{Number(viewingBooking.booking_fee).toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Refundable Security Deposit:</span>
                <span style={{ fontWeight: 600, color: '#C49A6C' }}>
                  ₹{Number(viewingBooking.security_deposit).toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  borderTop: '1px dashed var(--border-card)',
                  paddingTop: '6px',
                }}
              >
                <span>Total Amount:</span>
                <span style={{ color: 'var(--color-clay)' }}>
                  ₹{Number(viewingBooking.total_amount).toLocaleString()}
                </span>
              </div>

              {Number(viewingBooking.deposit_collected_amount) > 0 && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '8px',
                    borderRadius: '4px',
                    background: 'rgba(196, 154, 108, 0.1)',
                    fontSize: '0.78rem',
                  }}
                >
                  <div>Deposit Collected: ₹{Number(viewingBooking.deposit_collected_amount).toLocaleString()}</div>
                  {Number(viewingBooking.deposit_deduction_amount) > 0 && (
                    <div style={{ color: '#EF4444' }}>
                      Approved Deductions: -₹{Number(viewingBooking.deposit_deduction_amount).toLocaleString()} (
                      {viewingBooking.deposit_deduction_reason || 'Damage/Cleaning'})
                    </div>
                  )}
                  <div style={{ fontWeight: 700, color: '#10B981' }}>
                    Net Refundable: ₹
                    {(
                      Number(viewingBooking.deposit_collected_amount) -
                      Number(viewingBooking.deposit_deduction_amount)
                    ).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Condition & Damage Notes */}
            {viewingBooking.facility_condition_notes && (
              <div style={{ fontSize: '0.82rem', padding: '10px', background: 'var(--bg-main)', borderRadius: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Inspection Notes: </span>
                <span style={{ color: 'var(--text-dim)' }}>{viewingBooking.facility_condition_notes}</span>
              </div>
            )}

            {/* Payments History */}
            {viewingBooking.payments && viewingBooking.payments.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  Payment Receipts
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {viewingBooking.payments.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg-main)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--color-clay)' }}>{p.receipt_number}</span>
                        <span style={{ color: 'var(--text-dim)', marginLeft: '8px' }}>
                          ({p.payment_type} via {p.payment_method})
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, color: p.payment_type === 'REFUND' ? '#EF4444' : '#10B981' }}>
                        {p.payment_type === 'REFUND' ? '-' : '+'}₹{Number(p.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Logs */}
            {viewingBooking.audit_logs && viewingBooking.audit_logs.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--text-main)' }}>Audit Trail</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                  {viewingBooking.audit_logs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-dim)',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        <strong style={{ color: 'var(--text-main)' }}>{log.action}</strong> by {log.actor_name || 'System'}
                      </span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setIsDetailOpen(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 2: REJECT BOOKING                                                */}
      {/* ====================================================================== */}
      {isRejectModalOpen && actionBooking && (
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
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ margin: 0, color: '#EF4444', fontSize: '1.2rem' }}>Reject Booking Request</h3>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.86rem' }}>
              Specify the reason why booking <strong>{actionBooking.booking_number}</strong> for {actionBooking.amenity_name} is being rejected. The resident will be notified.
            </p>
            <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <textarea
                required
                rows={3}
                placeholder="e.g. Schedule clash with society maintenance, or guest count exceeds capacity..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#EF4444',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {modalLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 3: CANCEL BOOKING                                                */}
      {/* ====================================================================== */}
      {isCancelModalOpen && actionBooking && (
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
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>Cancel Reservation</h3>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.86rem' }}>
              Are you sure you want to cancel booking <strong>{actionBooking.booking_number}</strong>?
            </p>
            <form onSubmit={handleConfirmCancel} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <textarea
                required
                rows={3}
                placeholder="Reason for cancellation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#6B7280',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {modalLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 4: RECORD PAYMENT                                                */}
      {/* ====================================================================== */}
      {isPaymentModalOpen && actionBooking && (
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
                <CreditCard size={20} color="var(--color-clay)" />
                Record Booking Payment
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '10px', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}>
              <div><strong>Booking:</strong> {actionBooking.booking_number} ({actionBooking.amenity_name})</div>
              <div><strong>Total Amount:</strong> ₹{Number(actionBooking.total_amount).toLocaleString()}</div>
            </div>

            <form onSubmit={handleConfirmPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Amount to Collect (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Payment Type
                  </label>
                  <select
                    value={paymentForm.payment_type}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="FULL_PAYMENT">Full Payment (Fee + Deposit)</option>
                    <option value="BOOKING_FEE">Booking Fee Only</option>
                    <option value="SECURITY_DEPOSIT">Security Deposit Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Payment Method
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash at Office</option>
                    <option value="NET_BANKING">Net Banking / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Transaction Reference / UTR
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-12345678 or Cheque #8872"
                  value={paymentForm.transaction_reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
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
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="Additional notes for receipt..."
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
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
                  onClick={() => setIsPaymentModalOpen(false)}
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
                  disabled={modalLoading}
                  style={{
                    padding: '8px 24px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-clay)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {modalLoading ? 'Processing...' : 'Generate Receipt & Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 5: COMPLETE & FACILITY INSPECTION                                */}
      {/* ====================================================================== */}
      {isCompleteModalOpen && actionBooking && (
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
              maxWidth: '560px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} color="#059669" />
              Complete Booking & Inspection
            </h3>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.86rem' }}>
              Record facility condition notes and any deposit deductions for booking <strong>{actionBooking.booking_number}</strong>.
            </p>

            <form onSubmit={handleConfirmComplete} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Facility Condition Notes
                </label>
                <textarea
                  rows={2}
                  value={completeForm.facility_condition_notes}
                  onChange={(e) => setCompleteForm({ ...completeForm, facility_condition_notes: e.target.value })}
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
                  Damage Deductions from Security Deposit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={Number(actionBooking.deposit_collected_amount || 0)}
                  value={completeForm.damage_deduction_amount}
                  onChange={(e) => setCompleteForm({ ...completeForm, damage_deduction_amount: e.target.value })}
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
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  Deposit collected: ₹{Number(actionBooking.deposit_collected_amount || 0).toLocaleString()} • Net refund: ₹
                  {(
                    Number(actionBooking.deposit_collected_amount || 0) - Number(completeForm.damage_deduction_amount || 0)
                  ).toLocaleString()}
                </span>
              </div>

              {Number(completeForm.damage_deduction_amount) > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#EF4444', marginBottom: '5px' }}>
                    Deduction Reason & Damage Details *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Broken wall light, uncleaned party area"
                    value={completeForm.deposit_deduction_reason}
                    onChange={(e) => setCompleteForm({ ...completeForm, deposit_deduction_reason: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #EF4444',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
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
                  disabled={modalLoading}
                  style={{
                    padding: '8px 24px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#059669',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {modalLoading ? 'Saving...' : 'Complete Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODAL 6: NEW BOOKING REQUEST                                           */}
      {/* ====================================================================== */}
      {isNewBookingOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-card)',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-main)',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                New Amenity Booking Request
              </h2>
              <button
                onClick={() => setIsNewBookingOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBookingSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #EF4444',
                    color: '#EF4444',
                    fontSize: '0.85rem',
                  }}
                >
                  {modalError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Select Amenity *
                </label>
                <select
                  required
                  value={newBooking.amenity_id}
                  onChange={(e) => handleNewBookingChange('amenity_id', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="">-- Choose Amenity --</option>
                  {amenities
                    .filter((a) => a.status === 'ACTIVE')
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.category} - {a.access_type})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Booking Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newBooking.booking_date}
                    onChange={(e) => handleNewBookingChange('booking_date', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
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
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newBooking.start_time}
                    onChange={(e) => handleNewBookingChange('start_time', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
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
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newBooking.end_time}
                    onChange={(e) => handleNewBookingChange('end_time', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Booking Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Birthday Party, Yoga Workshop"
                    value={newBooking.purpose}
                    onChange={(e) => handleNewBookingChange('purpose', e.target.value)}
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
                    Expected Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newBooking.expected_guests}
                    onChange={(e) => handleNewBookingChange('expected_guests', e.target.value)}
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
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Any equipment setup, catering requirements..."
                  value={newBooking.additional_notes}
                  onChange={(e) => handleNewBookingChange('additional_notes', e.target.value)}
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

              {/* Price estimate breakdown */}
              {pricingEstimate && (
                <div
                  style={{
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px',
                    border: '1px solid var(--border-card)',
                    fontSize: '0.84rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Calculated Booking Fee:</span>
                    <span style={{ fontWeight: 600 }}>₹{Number(pricingEstimate.calculated_fee).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Refundable Security Deposit:</span>
                    <span style={{ fontWeight: 600, color: '#C49A6C' }}>₹{Number(pricingEstimate.security_deposit).toLocaleString()}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      borderTop: '1px dashed var(--border-card)',
                      paddingTop: '6px',
                    }}
                  >
                    <span>Total Amount Payable:</span>
                    <span style={{ color: 'var(--color-clay)' }}>₹{Number(pricingEstimate.total_amount).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  required
                  checked={newBooking.acceptRules}
                  onChange={(e) => handleNewBookingChange('acceptRules', e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  I accept the amenity rules, operating timings, noise regulations, and cancellation policies.
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}>
                <button
                  type="button"
                  onClick={() => setIsNewBookingOpen(false)}
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
                  disabled={modalLoading}
                  style={{
                    padding: '8px 24px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-clay)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {modalLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
