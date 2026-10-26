import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Palmtree,
  ChevronLeft,
  ChevronRight,
  Info,
  Shield,
  Layers,
  CalendarCheck2,
} from 'lucide-react';
import { amenityApi } from '../../api/amenityApi';
import { useAuthStore } from '../../store/authStore';
import { ROLES } from '../../constants/roles';

export default function AvailabilityPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [amenities, setAmenities] = useState([]);
  const [selectedAmenityId, setSelectedAmenityId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [slotData, setSlotData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Blocked Dates
  const [blockedDates, setBlockedDates] = useState([]);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    start_date: '',
    end_date: '',
    reason: 'Routine Scheduled Maintenance',
  });
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  // Load Amenities
  useEffect(() => {
    async function loadAmenities() {
      try {
        const res = await amenityApi.getAmenities();
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setAmenities(list);
        if (list.length > 0 && !selectedAmenityId) {
          setSelectedAmenityId(String(list[0].id));
        }
      } catch (err) {
        console.error('Failed to load amenities', err);
      }
    }
    loadAmenities();
  }, []);

  // Load Slots & Blocked Dates for selected amenity & date
  const fetchAvailability = async () => {
    if (!selectedAmenityId || !selectedDate) return;
    try {
      setLoading(true);
      setError(null);

      const [slotRes, detailRes] = await Promise.all([
        amenityApi.getSlotsForDate(selectedAmenityId, selectedDate),
        amenityApi.getAmenityById(selectedAmenityId),
      ]);

      setSlotData(slotRes.data?.data || slotRes.data || null);
      setBlockedDates(detailRes.data?.blocked_dates || detailRes.data?.data?.blocked_dates || []);
    } catch (err) {
      console.error('Failed to load slot availability', err);
      setError(err.response?.data?.message || err.message || 'Error loading slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedAmenityId, selectedDate]);

  // Date Navigator Helpers
  const handleDateShift = (days) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  // Add Blocked Date
  const handleCreateBlockedDate = async (e) => {
    e.preventDefault();
    if (!blockForm.start_date || !blockForm.end_date || !blockForm.reason) {
      alert('Please fill in all blocked date fields');
      return;
    }
    try {
      setBlockSubmitting(true);
      await amenityApi.addBlockedDate({
        amenity_id: selectedAmenityId,
        start_date: blockForm.start_date,
        end_date: blockForm.end_date,
        reason: blockForm.reason,
      });
      setIsAddBlockOpen(false);
      setBlockForm({ start_date: '', end_date: '', reason: 'Routine Scheduled Maintenance' });
      fetchAvailability();
    } catch (err) {
      alert('Failed to add blocked date: ' + (err.response?.data?.message || err.message));
    } finally {
      setBlockSubmitting(false);
    }
  };

  // Delete Blocked Date
  const handleDeleteBlockedDate = async (id) => {
    if (!window.confirm('Remove this blocked date period?')) return;
    try {
      await amenityApi.removeBlockedDate(id);
      fetchAvailability();
    } catch (err) {
      alert('Failed to remove: ' + (err.response?.data?.message || err.message));
    }
  };

  const selectedAmenity = amenities.find((a) => String(a.id) === String(selectedAmenityId));

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
            <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>Availability & Time Slots</span>
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
            <Clock size={28} color="var(--color-clay)" />
            Availability & Time Slot Management
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Interactive daily & slot grid, operating schedule, buffer intervals, and maintenance blocks.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setBlockForm({
                start_date: selectedDate,
                end_date: selectedDate,
                reason: 'Routine Scheduled Maintenance',
              });
              setIsAddBlockOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: 'var(--radius-sm)',
              background: '#EF4444',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <AlertTriangle size={16} />
            Block for Maintenance
          </button>
        )}
      </div>

      {/* Amenity Selector & Date Navigation Bar */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1px solid var(--border-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Amenity Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Palmtree size={18} color="var(--color-clay)" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Select Amenity:</span>
          <select
            value={selectedAmenityId}
            onChange={(e) => setSelectedAmenityId(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            {amenities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.category})
              </option>
            ))}
          </select>
        </div>

        {/* Date Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handleDateShift(-1)}
            style={{
              padding: '7px 12px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          />

          <button
            onClick={() => handleDateShift(1)}
            style={{
              padding: '7px 12px',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={16} />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-clay)',
              color: '#fff',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Today
          </button>
        </div>
      </div>

      {/* Operating Parameters Summary */}
      {selectedAmenity && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            padding: '16px',
            fontSize: '0.84rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Daily Operating Hours</span>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="var(--color-clay)" />
              {selectedAmenity.opening_time?.slice(0, 5)} - {selectedAmenity.closing_time?.slice(0, 5)}
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Slot & Buffer Duration</span>
            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              {selectedAmenity.slot_duration_minutes || 60}m slots • {selectedAmenity.buffer_minutes || 0}m buffer
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Duration Limits</span>
            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              Min {selectedAmenity.min_duration_hours || 1}h • Max {selectedAmenity.max_duration_hours || 8}h
            </div>
          </div>

          <div>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Advance Booking Horizon</span>
            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              Up to {selectedAmenity.advance_booking_days || 30} days in advance
            </div>
          </div>
        </div>
      )}

      {/* Main Slots Visual Matrix */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-card)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarCheck2 size={18} color="var(--color-clay)" />
            Time Slots for{' '}
            {new Date(selectedDate).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h3>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#10B981' }} />
              Available
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#D97706' }} />
              Pending
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#2563EB' }} />
              Confirmed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#EF4444' }} />
              Blocked
            </span>
          </div>
        </div>

        {/* Maintenance Banner if Date Blocked */}
        {slotData?.is_blocked && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #EF4444',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.88rem',
            }}
          >
            <AlertTriangle size={18} />
            <span>
              <strong>Facility Blocked for Maintenance on this date:</strong> {slotData.blocked_reason}
            </span>
          </div>
        )}

        {/* Slots Grid */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
            Calculating time slots...
          </div>
        ) : !slotData || !slotData.slots || slotData.slots.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No slots configured for this date.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            {slotData.slots.map((slot, idx) => {
              const isAvailable = slot.status === 'AVAILABLE';
              const isBlocked = slot.status === 'BLOCKED';
              const isPending = slot.status === 'PENDING_APPROVAL';
              const isConfirmed = slot.status === 'CONFIRMED' || slot.status === 'APPROVED';

              let borderColor = '#10B981';
              let bgColor = 'rgba(16, 185, 129, 0.08)';
              let textColor = '#10B981';

              if (isBlocked) {
                borderColor = '#EF4444';
                bgColor = 'rgba(239, 68, 68, 0.08)';
                textColor = '#EF4444';
              } else if (isPending) {
                borderColor = '#D97706';
                bgColor = 'rgba(217, 119, 6, 0.08)';
                textColor = '#D97706';
              } else if (isConfirmed) {
                borderColor = '#2563EB';
                bgColor = 'rgba(37, 99, 235, 0.08)';
                textColor = '#2563EB';
              }

              return (
                <div
                  key={idx}
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'transform var(--transition-fast)',
                  }}
                >
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {slot.slot_start} - {slot.slot_end}
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: textColor,
                    }}
                  >
                    {slot.status}
                  </span>
                  {slot.booking && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {slot.booking.resident_name
                        ? `Home ${slot.booking.home_number} (${slot.booking.resident_name})`
                        : slot.booking.reason || 'Reserved'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Blocked Dates Management Section */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-card)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#EF4444" />
              Scheduled Maintenance & Blocked Periods
            </h3>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
              Blocked dates prevent any resident bookings during repairs, painting, deep cleaning, or society private functions.
            </p>
          </div>
        </div>

        {blockedDates.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            No maintenance blackout dates scheduled for this amenity.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {blockedDates.map((b) => (
              <div
                key={b.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                    {b.start_date} to {b.end_date}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#EF4444' }}>{b.reason}</div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteBlockedDate(b.id)}
                    style={{
                      padding: '6px 10px',
                      background: 'transparent',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#EF4444',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Blocked Date Modal */}
      {isAddBlockOpen && (
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
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} color="#EF4444" />
              Schedule Maintenance Block
            </h3>

            <form onSubmit={handleCreateBlockedDate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={blockForm.start_date}
                    onChange={(e) => setBlockForm({ ...blockForm, start_date: e.target.value })}
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
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={blockForm.end_date}
                    onChange={(e) => setBlockForm({ ...blockForm, end_date: e.target.value })}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Reason for Blackout *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual pool filtration cleaning, Clubhouse painting"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
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
                  onClick={() => setIsAddBlockOpen(false)}
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
                  disabled={blockSubmitting}
                  style={{
                    padding: '8px 22px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#EF4444',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {blockSubmitting ? 'Blocking...' : 'Block Dates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
