import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Palmtree,
  Building2,
  ArrowUpRight,
  Filter,
  RefreshCw,
  BadgePercent,
  CreditCard,
  FileText,
} from 'lucide-react';
import { amenityApi } from '../../api/amenityApi';
import { useAuthStore } from '../../store/authStore';

export default function AmenityReportsPage() {
  const { user } = useAuthStore();

  const [amenities, setAmenities] = useState([]);
  const [selectedAmenityId, setSelectedAmenityId] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Amenities for filter
  useEffect(() => {
    async function loadAmenities() {
      try {
        const res = await amenityApi.getAmenities();
        setAmenities(Array.isArray(res.data) ? res.data : (res.data?.data || []));
      } catch (err) {
        console.error('Failed to load amenities', err);
      }
    }
    loadAmenities();
  }, []);

  // Fetch Report Data
  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedAmenityId !== 'ALL') params.amenity_id = selectedAmenityId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await amenityApi.getReports(params);
      setReportsData(res.data?.data || res.data || null);
    } catch (err) {
      console.error('Failed to load reports', err);
      setError(err.response?.data?.message || err.message || 'Error loading report metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedAmenityId, startDate, endDate]);

  const overview = reportsData?.overview || {
    total_amenities: 0,
    active_amenities: 0,
    total_bookings: 0,
    pending_approvals: 0,
    confirmed_bookings: 0,
    todays_bookings: 0,
    booking_revenue: 0,
    outstanding_payments: 0,
    deposits_held: 0,
    pending_refunds: 0,
  };

  const categoryBreakdown = reportsData?.category_breakdown || [];
  const recentBookings = reportsData?.recent_bookings || [];

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
            <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>Booking Reports</span>
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
            <BarChart3 size={28} color="var(--color-clay)" />
            Amenities Analytics & Booking Reports
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Society amenities performance metrics, booking revenues, outstanding balances, and security deposit ledgers.
          </p>
        </div>

        <button
          onClick={fetchReport}
          title="Refresh analytics"
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
      </div>

      {/* Date & Amenity Filter Controls */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1px solid var(--border-card)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palmtree size={16} color="var(--color-clay)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Amenity:</span>
          <select
            value={selectedAmenityId}
            onChange={(e) => setSelectedAmenityId(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Start Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>End Date:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
            }}
          />
        </div>

        {(startDate || endDate || selectedAmenityId !== 'ALL') && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setSelectedAmenityId('ALL');
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px solid var(--border-card)',
              color: 'var(--text-dim)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* KPI Cards Grid (Exact 9 KPIs specified in prompt) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* 1. Total Amenities */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', padding: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Amenities</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {overview.total_amenities}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#10B981', marginTop: '2px' }}>
            {overview.active_amenities} Active Facilities
          </div>
        </div>

        {/* 2. Active Amenities */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', padding: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>Active Amenities</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
            {overview.active_amenities}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Ready for bookings
          </div>
        </div>

        {/* 3. Pending Booking Requests */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', padding: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600 }}>Pending Approval</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
            {overview.pending_approvals}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Awaiting admin action
          </div>
        </div>

        {/* 4. Confirmed Bookings */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', padding: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: '#2563EB', fontWeight: 600 }}>Confirmed Bookings</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
            {overview.confirmed_bookings}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Scheduled reservations
          </div>
        </div>

        {/* 5. Today's Bookings */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', padding: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-clay)', fontWeight: 600 }}>Today's Bookings</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-clay)', marginTop: '4px' }}>
            {overview.todays_bookings}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Active events today
          </div>
        </div>

        {/* 6. Booking Revenue (Fee Income) */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', padding: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>Booking Revenue</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            ₹{Number(overview.booking_revenue).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Pure society revenue (Excludes deposits)
          </div>
        </div>

        {/* 7. Outstanding Booking Payments */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', padding: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: '#EF4444', fontWeight: 600 }}>Outstanding Payments</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>
            ₹{Number(overview.outstanding_payments).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Approved requests pending payment
          </div>
        </div>

        {/* 8. Deposits Held (Liability) */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', padding: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: '#C49A6C', fontWeight: 600 }}>Deposits Held (Liability)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#C49A6C', marginTop: '4px' }}>
            ₹{Number(overview.deposits_held).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Refundable deposits held in escrow
          </div>
        </div>

        {/* 9. Pending Refunds */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', padding: '16px' }}>
          <div style={{ fontSize: '0.78rem', color: '#8B5CF6', fontWeight: 600 }}>Pending Refunds</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#8B5CF6', marginTop: '4px' }}>
            ₹{Number(overview.pending_refunds).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Awaiting bank disbursement
          </div>
        </div>
      </div>

      {/* Category Breakdown & Recent Bookings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Category Performance */}
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
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--color-clay)" />
            Category Utilization & Revenue
          </h3>

          {categoryBreakdown.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No booking activity recorded for categories.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categoryBreakdown.map((cat, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                      {cat.category}
                    </span>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                      {cat.bookings_count} Total Reservations
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.92rem' }}>
                      ₹{Number(cat.total_revenue).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Revenue Generated</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Audit Stream */}
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
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--color-clay)" />
            Recent Booking Audits
          </h3>

          {recentBookings.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No recent reservations logged.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentBookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.82rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-clay)' }}>{b.booking_number}</div>
                    <div style={{ color: 'var(--text-main)' }}>
                      {b.amenity_name} • Home {b.home_number} ({b.resident_name})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{Number(b.total_amount).toLocaleString()}
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '3px',
                        background: b.booking_status === 'CONFIRMED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                        color: b.booking_status === 'CONFIRMED' ? '#10B981' : '#D97706',
                      }}
                    >
                      {b.booking_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
