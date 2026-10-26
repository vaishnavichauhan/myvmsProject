import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Palmtree,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  Calendar,
  Building2,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Info,
  CalendarCheck2,
  Layers,
  ArrowRight,
  Shield,
  CreditCard,
  FileText,
} from 'lucide-react';
import { amenityApi } from '../../api/amenityApi';
import { societyApi } from '../../api/societyApi';
import { useAuthStore } from '../../store/authStore';
import { ROLES } from '../../constants/roles';

// Category color and icon configuration
export const AMENITY_CATEGORIES = [
  'Common Plot',
  'Clubhouse',
  'Community Hall',
  'Gym',
  'Swimming Pool',
  'Garden',
  'Sports Court',
  'Indoor Games Room',
  'Party Lawn',
  'Other',
];

export const ACCESS_TYPE_CONFIG = {
  FREE: { label: 'Free Access', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  PAID: { label: 'Paid Reservation', color: '#C49A6C', bg: 'rgba(196, 154, 108, 0.15)' },
  FREE_WITH_PAID_EVENTS: { label: 'Free / Paid Events', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
};

export const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export default function AmenitiesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;
  const isResident = [ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER].includes(user?.role);

  // Societies for Admin selector
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(user?.societyId ? String(user.societyId) : '');

  // Amenities Data & Filters
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [accessFilter, setAccessFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [viewingAmenity, setViewingAmenity] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingAmenity, setBookingAmenity] = useState(null);

  // Form state for Add/Edit Amenity
  const [formData, setFormData] = useState({
    name: '',
    category: 'Clubhouse',
    description: '',
    location_or_building: '',
    max_capacity: 50,
    access_type: 'PAID',
    booking_type: 'HOURLY',
    booking_fee: 0,
    security_deposit: 0,
    available_days: [...DAYS_OF_WEEK],
    opening_time: '06:00',
    closing_time: '22:00',
    slot_duration_minutes: 60,
    buffer_minutes: 15,
    advance_booking_days: 30,
    min_duration_hours: 1,
    max_duration_hours: 8,
    requires_approval: true,
    cancellation_policy: '',
    rules: '',
    status: 'ACTIVE',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Quick Resident Booking Form State inside Amenities List
  const [bookingForm, setBookingForm] = useState({
    booking_date: '',
    start_time: '10:00',
    end_time: '12:00',
    purpose: '',
    expected_guests: 1,
    additional_notes: '',
    acceptRules: false,
  });
  const [pricingEstimate, setPricingEstimate] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  // Fetch Societies
  useEffect(() => {
    async function loadSocieties() {
      try {
        const res = await societyApi.getAll();
        const socList = res.data?.data || res.data || [];
        setSocieties(socList);
        if (!selectedSocietyId && socList.length > 0) {
          const userSoc = user?.societyId && socList.find((s) => String(s.id) === String(user.societyId));
          setSelectedSocietyId(userSoc ? String(userSoc.id) : String(socList[0].id));
        }
      } catch (err) {
        console.error('Failed to load societies', err);
      }
    }
    loadSocieties();
  }, [user?.societyId]);

  // Fetch Amenities
  const fetchAmenities = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      const activeSocId = selectedSocietyId || user?.societyId;
      if (activeSocId) params.society_id = activeSocId;
      if (categoryFilter !== 'ALL') params.category = categoryFilter;
      if (accessFilter !== 'ALL') params.access_type = accessFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await amenityApi.getAmenities(params);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.amenities || []);
      setAmenities(data);
    } catch (err) {
      console.error('Failed to load amenities', err);
      setError(err.response?.data?.message || err.message || 'Error fetching amenities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmenities();
  }, [selectedSocietyId, categoryFilter, accessFilter, statusFilter]);

  // Handle Search on Submit or Debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAmenities();
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingAmenity(null);
    setFormData({
      name: '',
      category: 'Clubhouse',
      description: '',
      location_or_building: '',
      max_capacity: 50,
      access_type: 'PAID',
      booking_type: 'HOURLY',
      booking_fee: 500,
      security_deposit: 1000,
      available_days: [...DAYS_OF_WEEK],
      opening_time: '06:00',
      closing_time: '22:00',
      slot_duration_minutes: 60,
      buffer_minutes: 15,
      advance_booking_days: 30,
      min_duration_hours: 1,
      max_duration_hours: 8,
      requires_approval: true,
      cancellation_policy: 'Full deposit refund if cancelled 48 hours prior.',
      rules: 'Observe community quiet hours. Clean up area after use.',
      status: 'ACTIVE',
    });
    setFormError(null);
    setIsAddEditOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (amenity) => {
    setEditingAmenity(amenity);
    setFormData({
      name: amenity.name || '',
      category: amenity.category || 'Other',
      description: amenity.description || '',
      location_or_building: amenity.location_or_building || '',
      max_capacity: amenity.max_capacity || 50,
      access_type: amenity.access_type || 'FREE',
      booking_type: amenity.booking_type || 'HOURLY',
      booking_fee: amenity.booking_fee || 0,
      security_deposit: amenity.security_deposit || 0,
      available_days: amenity.available_days || [...DAYS_OF_WEEK],
      opening_time: amenity.opening_time ? amenity.opening_time.slice(0, 5) : '06:00',
      closing_time: amenity.closing_time ? amenity.closing_time.slice(0, 5) : '22:00',
      slot_duration_minutes: amenity.slot_duration_minutes || 60,
      buffer_minutes: amenity.buffer_minutes || 15,
      advance_booking_days: amenity.advance_booking_days || 30,
      min_duration_hours: amenity.min_duration_hours || 1,
      max_duration_hours: amenity.max_duration_hours || 8,
      requires_approval: amenity.requires_approval ?? true,
      cancellation_policy: amenity.cancellation_policy || '',
      rules: amenity.rules || '',
      status: amenity.status || 'ACTIVE',
    });
    setFormError(null);
    setIsAddEditOpen(true);
  };

  // Toggle Day Selection
  const handleToggleDay = (day) => {
    setFormData((prev) => {
      const exists = prev.available_days.includes(day);
      if (exists) {
        return { ...prev, available_days: prev.available_days.filter((d) => d !== day) };
      } else {
        return { ...prev, available_days: [...prev.available_days, day] };
      }
    });
  };

  // Submit Add/Edit
  const handleSaveAmenity = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        ...formData,
        society_id: selectedSocietyId || user?.societyId,
        booking_fee: Number(formData.booking_fee || 0),
        security_deposit: Number(formData.security_deposit || 0),
        max_capacity: Number(formData.max_capacity || 1),
        slot_duration_minutes: Number(formData.slot_duration_minutes || 60),
        buffer_minutes: Number(formData.buffer_minutes || 0),
        advance_booking_days: Number(formData.advance_booking_days || 30),
        min_duration_hours: Number(formData.min_duration_hours || 1),
        max_duration_hours: Number(formData.max_duration_hours || 8),
        available_days_json: formData.available_days,
      };

      if (editingAmenity) {
        await amenityApi.updateAmenity(editingAmenity.id, payload);
      } else {
        await amenityApi.createAmenity(payload);
      }

      setIsAddEditOpen(false);
      fetchAmenities();
    } catch (err) {
      console.error('Error saving amenity', err);
      setFormError(err.response?.data?.message || err.message || 'Failed to save amenity');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (amenity) => {
    try {
      const newStatus = amenity.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await amenityApi.updateAmenity(amenity.id, { status: newStatus });
      fetchAmenities();
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete Amenity
  const handleDeleteAmenity = async (amenity) => {
    if (!window.confirm(`Are you sure you want to delete "${amenity.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await amenityApi.deleteAmenity(amenity.id);
      fetchAmenities();
    } catch (err) {
      alert('Failed to delete amenity: ' + (err.response?.data?.message || err.message));
    }
  };

  // Quick Book Now Handler
  const handleOpenBookNow = (amenity) => {
    setBookingAmenity(amenity);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defDate = tomorrow.toISOString().split('T')[0];

    const opStart = amenity.opening_time ? amenity.opening_time.slice(0, 5) : '09:00';
    const [h, m] = opStart.split(':').map(Number);
    const endH = String(Math.min(23, h + (amenity.min_duration_hours || 2))).padStart(2, '0');
    const opEnd = `${endH}:${String(m).padStart(2, '0')}`;

    setBookingForm({
      booking_date: defDate,
      start_time: opStart,
      end_time: opEnd,
      purpose: '',
      expected_guests: Math.min(25, amenity.max_capacity || 50),
      additional_notes: '',
      acceptRules: false,
    });
    setPricingEstimate(null);
    setBookingError(null);
    setIsBookingModalOpen(true);

    // Initial price calculation
    calculatePriceEstimate(amenity.id, defDate, opStart, opEnd);
  };

  const calculatePriceEstimate = async (amenityId, date, start, end) => {
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

  const handleBookingFormChange = (field, val) => {
    const updated = { ...bookingForm, [field]: val };
    setBookingForm(updated);

    if (['booking_date', 'start_time', 'end_time'].includes(field) && bookingAmenity) {
      if (updated.booking_date && updated.start_time && updated.end_time) {
        calculatePriceEstimate(bookingAmenity.id, updated.booking_date, updated.start_time, updated.end_time);
      }
    }
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.acceptRules) {
      alert('Please read and accept the amenity rules to proceed.');
      return;
    }
    setBookingLoading(true);
    setBookingError(null);

    try {
      const payload = {
        society_id: selectedSocietyId || user?.societyId,
        amenity_id: bookingAmenity.id,
        booking_date: bookingForm.booking_date,
        start_time: `${bookingForm.start_time}:00`,
        end_time: `${bookingForm.end_time}:00`,
        purpose: bookingForm.purpose,
        expected_guests: Number(bookingForm.expected_guests),
        additional_notes: bookingForm.additional_notes,
      };

      const res = await amenityApi.createBooking(payload);
      const bookingNo = res.data?.booking_number || res.data?.data?.booking_number || 'Confirmed';
      alert(`Reservation submitted successfully! Booking Number: ${bookingNo}`);
      setIsBookingModalOpen(false);
      navigate('/dashboard/amenities/bookings');
    } catch (err) {
      console.error('Booking failed', err);
      setBookingError(err.response?.data?.message || err.message || 'Failed to submit booking request');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Breadcrumb */}
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
            <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>Amenities & Bookings</span>
            <span>/</span>
            <span style={{ color: 'var(--text-main)' }}>Amenities List</span>
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
            <Palmtree size={28} color="var(--color-clay)" />
            Society Amenities
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Browse clubhouse, community halls, party lawns, swimming pool, and sports facilities.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {isAdmin && societies.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="var(--color-clay)" />
              <select
                value={selectedSocietyId}
                onChange={(e) => setSelectedSocietyId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
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
              onClick={handleOpenAdd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-clay)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(196, 154, 108, 0.25)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Plus size={16} />
              Add Amenity
            </button>
          )}

          <Link
            to="/dashboard/amenities/bookings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-card)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
            }}
          >
            <CalendarCheck2 size={16} color="var(--color-clay)" />
            Manage Bookings
          </Link>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1px solid var(--border-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Input */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              flex: '1 1 280px',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <Search
              size={17}
              color="var(--text-dim)"
              style={{ position: 'absolute', left: '12px' }}
            />
            <input
              type="text"
              placeholder="Search amenities by name, building, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </form>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
              }}
            >
              <option value="ALL">All Categories</option>
              {AMENITY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Access Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Access:</span>
            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
              }}
            >
              <option value="ALL">All Types</option>
              <option value="FREE">Free</option>
              <option value="PAID">Paid</option>
              <option value="FREE_WITH_PAID_EVENTS">Free / Paid Events</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {/* View Toggle */}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '7px 12px',
                background: viewMode === 'grid' ? 'var(--color-clay)' : 'var(--bg-main)',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-dim)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '7px 12px',
                background: viewMode === 'table' ? 'var(--color-clay)' : 'var(--bg-main)',
                color: viewMode === 'table' ? '#fff' : 'var(--text-dim)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(239, 68, 68, 0.12)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #EF4444',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: '240px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                animation: 'pulse 1.5s infinite',
                border: '1px solid var(--border-card)',
              }}
            />
          ))}
        </div>
      ) : amenities.length === 0 ? (
        /* Empty State */
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-card)',
          }}
        >
          <Palmtree size={48} color="var(--color-clay)" style={{ opacity: 0.5, marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-main)', fontSize: '1.15rem' }}>
            No Amenities Found
          </h3>
          <p style={{ margin: '0 0 20px 0', color: 'var(--text-dim)', fontSize: '0.88rem' }}>
            {search || categoryFilter !== 'ALL' || accessFilter !== 'ALL'
              ? 'No amenities match the specified filter criteria. Try resetting filters.'
              : 'Society amenities catalog is currently empty. Get started by adding your first amenity.'}
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-clay)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add First Amenity
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '20px',
          }}
        >
          {amenities.map((amenity) => {
            const accessCfg = ACCESS_TYPE_CONFIG[amenity.access_type] || ACCESS_TYPE_CONFIG.FREE;
            return (
              <div
                key={amenity.id}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                }}
              >
                {/* Header Banner */}
                <div
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--border-card)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    background: 'rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(196, 154, 108, 0.15)',
                        color: 'var(--color-clay)',
                      }}
                    >
                      {amenity.category}
                    </span>
                    <h3
                      style={{
                        margin: '8px 0 2px 0',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                      }}
                    >
                      {amenity.name}
                    </h3>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-dim)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Building2 size={13} />
                      {amenity.location_or_building || 'Society Premises'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: accessCfg.bg,
                        color: accessCfg.color,
                      }}
                    >
                      {accessCfg.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: amenity.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: amenity.status === 'ACTIVE' ? '#10B981' : '#EF4444',
                      }}
                    >
                      {amenity.status}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  {amenity.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.84rem',
                        color: 'var(--text-dim)',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {amenity.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      padding: '10px',
                      background: 'var(--bg-main)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Capacity</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} color="var(--color-clay)" />
                        Up to {amenity.max_capacity}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Hours</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} color="var(--color-clay)" />
                        {amenity.opening_time?.slice(0, 5)} - {amenity.closing_time?.slice(0, 5)}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Booking Fee</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        {amenity.booking_fee > 0 ? `₹${Number(amenity.booking_fee).toLocaleString()} (${amenity.booking_type})` : 'Free'}
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Refundable Deposit</div>
                      <div style={{ fontWeight: 700, color: '#C49A6C' }}>
                        {amenity.security_deposit > 0 ? `₹${Number(amenity.security_deposit).toLocaleString()}` : 'None'}
                      </div>
                    </div>
                  </div>

                  {amenity.requires_approval && (
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-dim)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Shield size={13} color="var(--color-clay)" />
                      Admin approval required before confirmation
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    background: 'var(--bg-main)',
                  }}
                >
                  <button
                    onClick={() => setViewingAmenity(amenity)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 10px',
                      background: 'transparent',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Eye size={13} />
                    Details
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(amenity)}
                          title={amenity.status === 'ACTIVE' ? 'Deactivate Amenity' : 'Activate Amenity'}
                          style={{
                            padding: '6px 8px',
                            background: 'transparent',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-sm)',
                            color: amenity.status === 'ACTIVE' ? '#EF4444' : '#10B981',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          {amenity.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(amenity)}
                          title="Edit Amenity"
                          style={{
                            padding: '6px 8px',
                            background: 'transparent',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          onClick={() => handleDeleteAmenity(amenity)}
                          title="Delete Amenity"
                          style={{
                            padding: '6px 8px',
                            background: 'transparent',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#EF4444',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleOpenBookNow(amenity)}
                      disabled={amenity.status !== 'ACTIVE'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 14px',
                        background: amenity.status === 'ACTIVE' ? 'var(--color-clay)' : 'var(--text-dim)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: amenity.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
                        opacity: amenity.status === 'ACTIVE' ? 1 : 0.6,
                      }}
                    >
                      <CalendarCheck2 size={13} />
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-card)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Amenity</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Category & Building</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Access & Type</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Capacity</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Fee</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Security Deposit</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {amenities.map((amenity) => {
                const accessCfg = ACCESS_TYPE_CONFIG[amenity.access_type] || ACCESS_TYPE_CONFIG.FREE;
                return (
                  <tr
                    key={amenity.id}
                    style={{
                      borderBottom: '1px solid var(--border-card)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {amenity.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-dim)' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-clay)' }}>{amenity.category}</div>
                      <div style={{ fontSize: '0.78rem' }}>{amenity.location_or_building || 'Society'}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: accessCfg.bg,
                          color: accessCfg.color,
                        }}
                      >
                        {accessCfg.label}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {amenity.booking_type}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                      Up to {amenity.max_capacity}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {amenity.booking_fee > 0 ? `₹${Number(amenity.booking_fee).toLocaleString()}` : 'Free'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#C49A6C' }}>
                      {amenity.security_deposit > 0 ? `₹${Number(amenity.security_deposit).toLocaleString()}` : 'None'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: amenity.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: amenity.status === 'ACTIVE' ? '#10B981' : '#EF4444',
                        }}
                      >
                        {amenity.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => setViewingAmenity(amenity)}
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
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenEdit(amenity)}
                            style={{
                              padding: '5px 8px',
                              background: 'transparent',
                              border: '1px solid var(--border-card)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenBookNow(amenity)}
                          disabled={amenity.status !== 'ACTIVE'}
                          style={{
                            padding: '5px 12px',
                            background: 'var(--color-clay)',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          Book
                        </button>
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
      {/* 1. ADD / EDIT AMENITY MODAL                                            */}
      {/* ====================================================================== */}
      {isAddEditOpen && (
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
              maxWidth: '740px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Modal Header */}
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
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Palmtree size={20} color="var(--color-clay)" />
                {editingAmenity ? 'Edit Amenity' : 'Add New Amenity'}
              </h2>
              <button
                onClick={() => setIsAddEditOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAmenity} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {formError && (
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
                  {formError}
                </div>
              )}

              {/* Basic Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Amenity Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grand Clubhouse, Common Plot"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.88rem',
                    }}
                  >
                    {AMENITY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Location or Building
                </label>
                <input
                  type="text"
                  placeholder="e.g. Central Tower Ground Floor, Near Main Gate Lawn"
                  value={formData.location_or_building}
                  onChange={(e) => setFormData({ ...formData, location_or_building: e.target.value })}
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
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Details about equipment, atmosphere, suitable events..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Pricing & Access Settings */}
              <div
                style={{
                  padding: '14px',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-clay)' }}>
                  Pricing, Access & Deposit Configuration
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Access Type
                    </label>
                    <select
                      value={formData.access_type}
                      onChange={(e) => setFormData({ ...formData, access_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem',
                      }}
                    >
                      <option value="FREE">Free Access</option>
                      <option value="PAID">Paid Only</option>
                      <option value="FREE_WITH_PAID_EVENTS">Free Access with Paid Event Reservations</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Booking Model
                    </label>
                    <select
                      value={formData.booking_type}
                      onChange={(e) => setFormData({ ...formData, booking_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem',
                      }}
                    >
                      <option value="HOURLY">Hourly Fee</option>
                      <option value="SLOT">Per Time Slot</option>
                      <option value="PER_DAY">Per Day Rate</option>
                      <option value="PER_EVENT">Per Event Fixed Fee</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Booking Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={formData.booking_fee}
                      onChange={(e) => setFormData({ ...formData, booking_fee: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                      Security Deposit (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={formData.security_deposit}
                      onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-card)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-main)',
                        fontSize: '0.84rem',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Operating Hours & Capacities */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Advance Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.advance_booking_days}
                    onChange={(e) => setFormData({ ...formData, advance_booking_days: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Min Duration (h)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.min_duration_hours}
                    onChange={(e) => setFormData({ ...formData, min_duration_hours: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Max Duration (h)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_duration_hours}
                    onChange={(e) => setFormData({ ...formData, max_duration_hours: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>

              {/* Available Days Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Available Days of Week
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = formData.available_days.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => handleToggleDay(d)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1px solid var(--color-clay)' : '1px solid var(--border-card)',
                          background: isSelected ? 'var(--color-clay)' : 'var(--bg-main)',
                          color: isSelected ? '#fff' : 'var(--text-dim)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {d.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Policies & Approvals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Cancellation Policy
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Full refund if cancelled 48h prior"
                    value={formData.cancellation_policy}
                    onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Amenity Rules
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. No loud music after 10 PM. No glass items."
                    value={formData.rules}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>

              {/* Checkboxes: Requires Approval & Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={formData.requires_approval}
                    onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  />
                  <span>Require Admin Approval for Bookings</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  <input
                    type="checkbox"
                    checked={formData.status === 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })}
                  />
                  <span>Active Amenity</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-card)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    padding: '9px 24px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-clay)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                    opacity: formSubmitting ? 0.7 : 1,
                  }}
                >
                  {formSubmitting ? 'Saving...' : editingAmenity ? 'Update Amenity' : 'Create Amenity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 2. VIEW DETAILS MODAL                                                  */}
      {/* ====================================================================== */}
      {viewingAmenity && (
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
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(196, 154, 108, 0.15)',
                    color: 'var(--color-clay)',
                  }}
                >
                  {viewingAmenity.category}
                </span>
                <h2 style={{ margin: '8px 0 2px 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {viewingAmenity.name}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  {viewingAmenity.location_or_building || 'Society Premises'}
                </div>
              </div>
              <button
                onClick={() => setViewingAmenity(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {viewingAmenity.description && (
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                {viewingAmenity.description}
              </p>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '16px',
                background: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Access & Booking Type</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {viewingAmenity.access_type} ({viewingAmenity.booking_type})
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Maximum Capacity</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  Up to {viewingAmenity.max_capacity} Guests
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Booking Fee</span>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {viewingAmenity.booking_fee > 0 ? `₹${Number(viewingAmenity.booking_fee).toLocaleString()}` : 'Free'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Security Deposit</span>
                <div style={{ fontWeight: 700, color: '#C49A6C' }}>
                  {viewingAmenity.security_deposit > 0 ? `₹${Number(viewingAmenity.security_deposit).toLocaleString()} (Refundable)` : 'None'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Operating Hours</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {viewingAmenity.opening_time?.slice(0, 5)} - {viewingAmenity.closing_time?.slice(0, 5)}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Advance Booking Limit</span>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  Up to {viewingAmenity.advance_booking_days} Days
                </div>
              </div>
            </div>

            {viewingAmenity.rules && (
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  Facility Rules & Guidelines
                </h4>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    fontSize: '0.84rem',
                    color: 'var(--text-dim)',
                  }}
                >
                  {viewingAmenity.rules}
                </div>
              </div>
            )}

            {viewingAmenity.cancellation_policy && (
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  Cancellation & Refund Policy
                </h4>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    fontSize: '0.84rem',
                    color: 'var(--text-dim)',
                  }}
                >
                  {viewingAmenity.cancellation_policy}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => setViewingAmenity(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  border: '1px solid var(--border-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const am = viewingAmenity;
                  setViewingAmenity(null);
                  handleOpenBookNow(am);
                }}
                disabled={viewingAmenity.status !== 'ACTIVE'}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-clay)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Book This Amenity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 3. RESIDENT BOOKING REQUEST MODAL                                      */}
      {/* ====================================================================== */}
      {isBookingModalOpen && bookingAmenity && (
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
            {/* Header */}
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
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-clay)' }}>
                  {bookingAmenity.category}
                </span>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Reserve {bookingAmenity.name}
                </h2>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitBooking} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {bookingError && (
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
                  {bookingError}
                </div>
              )}

              {/* Date & Time Slot selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Booking Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingForm.booking_date}
                    onChange={(e) => handleBookingFormChange('booking_date', e.target.value)}
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
                    value={bookingForm.start_time}
                    onChange={(e) => handleBookingFormChange('start_time', e.target.value)}
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
                    value={bookingForm.end_time}
                    onChange={(e) => handleBookingFormChange('end_time', e.target.value)}
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

              {/* Purpose & Guests */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Event / Booking Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Birthday Party, Yoga Workshop, Family Gathering"
                    value={bookingForm.purpose}
                    onChange={(e) => handleBookingFormChange('purpose', e.target.value)}
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
                    max={bookingAmenity.max_capacity || 500}
                    value={bookingForm.expected_guests}
                    onChange={(e) => handleBookingFormChange('expected_guests', e.target.value)}
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
                  placeholder="Any equipment setup, catering requirements, or special notes..."
                  value={bookingForm.additional_notes}
                  onChange={(e) => handleBookingFormChange('additional_notes', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Dynamic Price Breakdown Card */}
              <div
                style={{
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-clay)' }}>
                  Payable Amount & Security Deposit Breakdown
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  <span>Booking Fee:</span>
                  <span style={{ fontWeight: 600 }}>
                    {pricingEstimate ? `₹${Number(pricingEstimate.calculated_fee).toLocaleString()}` : `₹${bookingAmenity.booking_fee}`}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  <span>Security Deposit (Refundable):</span>
                  <span style={{ fontWeight: 600, color: '#C49A6C' }}>
                    {pricingEstimate ? `₹${Number(pricingEstimate.security_deposit).toLocaleString()}` : `₹${bookingAmenity.security_deposit}`}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    paddingTop: '8px',
                    borderTop: '1px dashed var(--border-card)',
                  }}
                >
                  <span>Total Amount Payable:</span>
                  <span style={{ color: 'var(--color-clay)' }}>
                    {pricingEstimate
                      ? `₹${Number(pricingEstimate.total_amount).toLocaleString()}`
                      : `₹${Number(bookingAmenity.booking_fee) + Number(bookingAmenity.security_deposit)}`}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  * Security deposit is tracked separately as a refundable liability and refunded post-inspection.
                </div>
              </div>

              {/* Accept Rules Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  lineHeight: 1.4,
                }}
              >
                <input
                  type="checkbox"
                  required
                  checked={bookingForm.acceptRules}
                  onChange={(e) => handleBookingFormChange('acceptRules', e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>
                  I agree to the society amenity rules, operating timings, noise regulations, and cancellation policy. I understand that damages may result in deductions from the security deposit.
                </span>
              </label>

              {/* Submit Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-card)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  style={{
                    padding: '9px 24px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-clay)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: bookingLoading ? 'not-allowed' : 'pointer',
                    opacity: bookingLoading ? 0.7 : 1,
                  }}
                >
                  {bookingLoading ? 'Submitting...' : 'Submit Booking Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
