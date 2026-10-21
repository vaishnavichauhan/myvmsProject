import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Home,
  DoorOpen,
  Users,
  UserCheck,
  ShieldCheck,
  Briefcase,
  Award,

  Truck,
  Activity,
  ArrowRight,
  RefreshCw,
  Bell,
  Megaphone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  LogOut,
  LogIn,
  PackageCheck,
  UserPlus,
  Shield,
  Layers,
  FileText,
  Calendar,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adminApi } from '../api/adminApi';
import { announcementApi } from '../api/announcementApi';
import EmergencyBanner from '../components/announcements/EmergencyBanner';

/**
 * Prompt 18 — Admin Dashboard
 * High-performance command center for MYVMS Society Administrator.
 *
 * Core Metrics Displayed:
 * 1. Total Homes
 * 2. Occupied Homes
 * 3. Vacant Homes
 * 4. Owners
 * 5. Tenants
 * 6. Family Members
 * 7. Security Staff
 * 8. Workers
 * 9. Committee Members
 * 10. Today's Visitors
 * 11. Today's Deliveries
 * 12. Today's Gate Entries
 *
 * Recent Activity:
 * - Visitor entered
 * - Delivery approved
 * - Visitor exited
 * - New resident
 * - New worker
 * - Committee announcement
 *
 * Visual Charts & Analytics:
 * - Home Occupancy Breakdown (Owners, Tenants, Vacant)
 * - Gate Entry Traffic distribution
 * - Residential vs Staff community breakdown
 *
 * Direct navigation to all society management modules.
 */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setErrorMsg(null);
      const [dashRes, annRes] = await Promise.all([
        adminApi.getAdminDashboard(),
        announcementApi.getAnnouncements(),
      ]);

      if (dashRes?.success || dashRes?.data) {
        setData(dashRes.data || dashRes);
      }
      if (annRes?.success || annRes?.data) {
        const list = annRes.data?.announcements || annRes.announcements || annRes.data || [];
        setAnnouncements(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setErrorMsg(err.message || 'Failed to load society analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const stats = data?.stats || {
    totalHomes: 0,
    occupiedHomes: 0,
    vacantHomes: 0,
    owners: 0,
    tenants: 0,
    familyMembers: 0,
    securityStaff: 0,
    workers: 0,
    committeeMembers: 0,
    todayVisitors: 0,
    todayDeliveries: 0,
    todayGateEntries: 0,
  };

  const occupancy = data?.occupancyBreakdown || {
    total: 7,
    occupied: 6,
    vacant: 1,
    ownerOccupied: 4,
    tenantOccupied: 2,
    occupancyPercentage: 86,
    vacantPercentage: 14,
  };

  const traffic = data?.trafficDistribution || {
    VISITOR: 0,
    DELIVERY: 0,
    RESIDENT: 0,
    WORKER: 0,
    STAFF: 0,
  };

  const activities = data?.recentActivity || [];

  // Filter activities
  const filteredActivities = activities.filter((act) => {
    if (activityFilter === 'ALL') return true;
    if (activityFilter === 'VISITOR' && (act.type === 'VISITOR_ENTERED' || act.type === 'VISITOR_EXITED')) return true;
    if (activityFilter === 'DELIVERY' && act.type === 'DELIVERY_APPROVED') return true;
    if (activityFilter === 'RESIDENT' && act.type === 'NEW_RESIDENT') return true;
    if (activityFilter === 'WORKER' && act.type === 'NEW_WORKER') return true;
    if (activityFilter === 'ANNOUNCEMENT' && act.type === 'COMMITTEE_ANNOUNCEMENT') return true;
    return false;
  });

  const getActivityIcon = (type) => {
    switch (type) {
      case 'VISITOR_ENTERED':
        return <LogIn style={{ width: 18, height: 18, color: '#10b981' }} />;
      case 'DELIVERY_APPROVED':
        return <PackageCheck style={{ width: 18, height: 18, color: '#3b82f6' }} />;
      case 'VISITOR_EXITED':
        return <LogOut style={{ width: 18, height: 18, color: '#f59e0b' }} />;
      case 'NEW_RESIDENT':
        return <UserPlus style={{ width: 18, height: 18, color: '#a855f7' }} />;
      case 'NEW_WORKER':
        return <Briefcase style={{ width: 18, height: 18, color: '#06b6d4' }} />;
      case 'COMMITTEE_ANNOUNCEMENT':
        return <Bell style={{ width: 18, height: 18, color: '#ec4899' }} />;
      default:
        return <Activity style={{ width: 18, height: 18, color: '#6366f1' }} />;
    }
  };

  const getActivityBadgeStyle = (type) => {
    switch (type) {
      case 'VISITOR_ENTERED':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'DELIVERY_APPROVED':
        return { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' };
      case 'VISITOR_EXITED':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'NEW_RESIDENT':
        return { background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' };
      case 'NEW_WORKER':
        return { background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' };
      case 'COMMITTEE_ANNOUNCEMENT':
        return { background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)' };
      default:
        return { background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' };
    }
  };

  // Management modules list
  const managementModules = [
    {
      title: 'Societies & Homes',
      description: 'Manage society profile, blocks, wings & residential flat inventory',
      path: '/dashboard/societies',
      icon: Building2,
      count: `${stats.totalHomes} Units`,
      badge: 'Real Estate',
      color: '#6366f1',
    },
    {
      title: 'Resident Management',
      description: 'Directory of primary owners, tenants, move-in dates & leases',
      path: '/dashboard/residents',
      count: `${stats.owners + stats.tenants} Residents`,
      icon: Users,
      badge: 'Directory',
      color: '#3b82f6',
    },
    {
      title: 'Family Members',
      description: 'Household members, verified dependents & app authorizations',
      path: '/dashboard/family-members',
      count: `${stats.familyMembers} Registered`,
      icon: UserCheck,
      badge: 'Households',
      color: '#a855f7',
    },
    {
      title: 'Home Workers',
      description: 'Domestic helpers, drivers, maids, RFID badges & assignments',
      path: '/dashboard/workers',
      count: `${stats.workers} Active`,
      icon: Briefcase,
      badge: 'Domestic Staff',
      color: '#06b6d4',
    },
    {
      title: 'Permissions Directory',
      description: 'Resident-level approval rules for couriers, deliveries & guests',
      path: '/dashboard/permissions',
      count: 'Active Rules',
      icon: ShieldCheck,
      badge: 'Security Rules',
      color: '#10b981',
    },
    {
      title: 'Security Personnel',
      description: 'Security guard rosters, badges, shifts & patrol duty logs',
      path: '/dashboard/security-staff',
      count: `${stats.securityStaff} Guards`,
      icon: Shield,
      badge: 'Guards',
      color: '#f59e0b',
    },
    {
      title: 'Society Gates',
      description: 'Physical boom barriers, pedestrian gates & entry checkpoints',
      path: '/dashboard/gates',
      count: 'Active Gates',
      icon: DoorOpen,
      badge: 'Perimeter',
      color: '#ec4899',
    },
    {
      title: 'Security Gate Console',
      description: 'Fast watchman console with privacy intercom & quick gate pass',
      path: '/dashboard/security',
      count: 'Live Console',
      icon: Activity,
      badge: 'Watchman Duty',
      color: '#14b8a6',
    },
    {
      title: 'Visitor Management',
      description: 'Guest directory, visitor entries, pre-approvals & OTP passcodes',
      path: '/dashboard/visitors',
      count: `${stats.todayVisitors} Today`,
      icon: UserCheck,
      badge: 'Gate Passes',
      color: '#8b5cf6',
    },
    {
      title: 'Courier & Delivery',
      description: 'Swiggy, Amazon, Blinkit parcel logging & gate storage lockers',
      path: '/dashboard/courier-delivery',
      count: `${stats.todayDeliveries} Today`,
      icon: Truck,
      badge: 'Deliveries',
      color: '#f97316',
    },
    {
      title: 'Managing Committee',
      description: 'Elected board, President, Secretary, Treasurer & governance',
      path: '/dashboard/committee',
      count: `${stats.committeeMembers} Members`,
      icon: Award,
      badge: 'Governing Board',
      color: '#e11d48',
    },
    {
      title: 'Announcements & Alerts',
      description: 'Publish emergency alerts, festival circulars & meeting notices',
      path: '/dashboard/announcements',
      count: `${announcements.length} Published`,
      icon: Megaphone,
      badge: 'Notice Board',
      color: '#f43f5e',
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Prominent Emergency Banner if active */}
      <EmergencyBanner announcements={announcements} />

      {/* Header Banner with Welcome & Society Showcase */}
      <div
        className="glass-panel"
        style={{
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          border: '1px solid var(--color-sand)',
          background: 'var(--color-white)',
          boxShadow: '0 8px 25px rgba(196, 154, 108, 0.1)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          minHeight: '340px',
          gap: 0,
        }}
      >
        {/* Left Side: Enhanced UI with Badges, Highlights & Actions */}
        <div
          style={{
            flex: '1 1 540px',
            padding: '36px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 20,
            minHeight: '340px',
          }}
        >


          {/* Welcome Text */}
          <div>
            <h1
              style={{
                fontSize: 'clamp(1.9rem, 2.5vw, 2.4rem)',
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.03em',
                color: 'var(--color-dark-brown)',
                lineHeight: 1.2,
              }}
            >
              Welcome, {user?.fullName || user?.full_name || 'System Administrator'}
            </h1>
            <p
              style={{
                margin: '10px 0 0',
                color: 'var(--text-muted)',
                fontSize: '0.98rem',
                lineHeight: 1.6,
                maxWidth: '620px',
              }}
            >
              Welcome back to your society command center. Monitor live visitor traffic, resident occupancy, and security gate operations across your residential community.
            </p>

            {/* Society Name if created, otherwise Create Society button */}
            {data?.society?.name || user?.societyName ? (
              <div style={{ marginTop: '18px' }}>
                <Link
                  to="/societies"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(196, 154, 108, 0.12)',
                    border: '1px solid var(--color-sand)',
                    color: 'var(--color-dark-brown)',
                    textDecoration: 'none',
                    transition: 'transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'pointer',
                    width: 'fit-content',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(196, 154, 108, 0.22)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(196, 154, 108, 0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(196, 154, 108, 0.12)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--color-clay)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                    }}
                  >
                    <Building2 size={16} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--color-clay)',
                      }}
                    >
                      Society:
                    </span>
                    <span
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--color-dark-brown)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {data?.society?.name || user?.societyName}
                    </span>
                  </div>
                </Link>
              </div>
            ) : (
              <div style={{ marginTop: '18px' }}>
                <Link
                  to="/societies"
                  state={{ openCreate: true }}
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <Plus size={16} />
                  <span>Create Society</span>
                </Link>
              </div>
            )}
          </div>



          {/* Action Buttons & Refresh Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >


            <button
              id="admin-refresh-btn"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="btn btn-outline"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw
                style={{
                  width: 14,
                  height: 14,
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
              <span>{refreshing ? 'Syncing...' : 'Refresh Console'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Society Image with Enhanced Height */}
        <div
          style={{
            flex: '1 1 420px',
            minHeight: '340px',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-tertiary)',
          }}
        >
          <img
            src="/images/community-hero.jpg"
            alt={data?.society?.name || 'Suncity Paradise Architecture'}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '340px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          {/* Subtle gradient overlay to match earthy sandy tones */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(64, 54, 48, 0.75) 0%, rgba(64, 54, 48, 0.15) 50%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
          {/* Bottom Overlay Pill on Image */}
          <div
            style={{
              position: 'absolute',
              bottom: 18,
              left: 20,
              right: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              color: '#FFFFFF',
            }}
          >

          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: 16,
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangle style={{ width: 20, height: 20 }} />
          <span>{errorMsg}</span>
        </div>
      )}


      {/* 12 CORE METRIC CARDS */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--grad-primary)',
                boxShadow: 'var(--shadow-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Layers style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-dark-brown)' }}>
                Society Overview Metrics
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Visual analytics and 12 live operational society counters
              </p>
            </div>
          </div>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(196, 154, 108, 0.15)',
              color: 'var(--color-clay)',
              fontSize: '0.825rem',
              fontWeight: 700,
            }}
          >
            12 Live Operational Counters
          </span>
        </div>

        {/* VISUAL CHARTS & ANALYTICS SECTION (TOP 3 CARDS) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 20,
            marginBottom: 28,
          }}
        >
          {/* Chart 1: Home Occupancy Ratio */}
          <div
            id="occupancy-chart-card"
            className="glass-panel"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Society Occupancy Status</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Total Real Estate Capacity: {stats.totalHomes} Units
                  </p>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {occupancy.occupancyPercentage}% Occupied
                </span>
              </div>

              {/* Segmented Distribution Bar */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    height: 14,
                    borderRadius: 7,
                    overflow: 'hidden',
                    background: 'var(--color-background)',
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: `${stats.totalHomes > 0 ? (occupancy.ownerOccupied / stats.totalHomes) * 100 : 0}%`,
                      background: 'var(--color-clay)',
                      transition: 'width 0.6s ease',
                    }}
                    title={`Owner Occupied: ${occupancy.ownerOccupied}`}
                  />
                  <div
                    style={{
                      width: `${stats.totalHomes > 0 ? (occupancy.tenantOccupied / stats.totalHomes) * 100 : 0}%`,
                      background: 'var(--color-sky-blue)',
                      transition: 'width 0.6s ease',
                    }}
                    title={`Tenant Occupied: ${occupancy.tenantOccupied}`}
                  />
                  <div
                    style={{
                      width: `${stats.totalHomes > 0 ? (occupancy.vacant / stats.totalHomes) * 100 : 0}%`,
                      background: 'var(--color-sand)',
                      transition: 'width 0.6s ease',
                    }}
                    title={`Vacant Units: ${occupancy.vacant}`}
                  />
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-clay)' }} />
                    <span style={{ color: 'var(--color-text)' }}>Owner:</span>
                    <strong style={{ color: '#403630' }}>{occupancy.ownerOccupied} ({stats.totalHomes > 0 ? Math.round((occupancy.ownerOccupied / stats.totalHomes) * 100) : 0}%)</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-sky-blue)' }} />
                    <span style={{ color: 'var(--color-text)' }}>Tenant:</span>
                    <strong style={{ color: '#403630' }}>{occupancy.tenantOccupied} ({stats.totalHomes > 0 ? Math.round((occupancy.tenantOccupied / stats.totalHomes) * 100) : 0}%)</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-sand)' }} />
                    <span style={{ color: 'var(--color-text)' }}>Vacant:</span>
                    <strong style={{ color: '#403630' }}>{occupancy.vacant} ({stats.totalHomes > 0 ? Math.round((occupancy.vacant / stats.totalHomes) * 100) : 0}%)</strong>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--color-background)',
                border: '1px solid var(--color-sand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>Allotment Velocity</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-fern-green)' }}>6 of 7 Units Live</span>
            </div>
          </div>

          {/* Chart 2: Community & Staff Demographics */}
          <div
            id="demographics-chart-card"
            className="glass-panel"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#403630' }}>Community Population</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text)' }}>
                    Residents, Staff & Committee Members
                  </p>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'rgba(196, 154, 108, 0.15)',
                    color: 'var(--color-clay)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {stats.owners + stats.tenants + stats.familyMembers} Residents Total
                </span>
              </div>

              {/* Distribution bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-text)' }}>Residents (Owners & Tenants)</span>
                    <strong style={{ color: '#403630' }}>{stats.owners + stats.tenants}</strong>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-background)', overflow: 'hidden' }}>
                    <div style={{ width: `${((stats.owners + stats.tenants) / 15) * 100}%`, height: '100%', background: 'var(--color-clay)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-text)' }}>Household Family Members</span>
                    <strong style={{ color: '#403630' }}>{stats.familyMembers}</strong>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-background)', overflow: 'hidden' }}>
                    <div style={{ width: `${(stats.familyMembers / 15) * 100}%`, height: '100%', background: 'var(--color-sky-blue)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-text)' }}>Security & Helpers (Staff)</span>
                    <strong style={{ color: '#403630' }}>{stats.securityStaff + stats.workers}</strong>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--color-background)', overflow: 'hidden' }}>
                    <div style={{ width: `${((stats.securityStaff + stats.workers) / 15) * 100}%`, height: '100%', background: 'var(--color-fern-green)' }} />
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--color-background)',
                border: '1px solid var(--color-sand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>Committee Board</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-clay)' }}>{stats.committeeMembers} Active Members</span>
            </div>
          </div>

          {/* Chart 3: Today's Gate Traffic */}
          <div
            id="traffic-chart-card"
            className="glass-panel"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#403630' }}>Today's Gate Movement</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text)' }}>
                    Perimeter Security Barrier Activity
                  </p>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 20,
                    background: 'rgba(135, 206, 235, 0.25)',
                    color: '#0284c7',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {stats.todayGateEntries} Gate Passes
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    padding: '12px 8px',
                    borderRadius: 10,
                    background: 'rgba(107, 142, 90, 0.1)',
                    border: '1px solid rgba(107, 142, 90, 0.25)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-fern-green)' }}>{stats.todayVisitors}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text)', marginTop: 2 }}>Visitors</div>
                </div>

                <div
                  style={{
                    padding: '12px 8px',
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.12)',
                    border: '1px solid var(--color-sand)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-clay)' }}>{stats.todayDeliveries}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text)', marginTop: 2 }}>Deliveries</div>
                </div>

                <div
                  style={{
                    padding: '12px 8px',
                    borderRadius: 10,
                    background: 'rgba(135, 206, 235, 0.15)',
                    border: '1px solid rgba(135, 206, 235, 0.4)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}>{stats.todayGateEntries}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text)', marginTop: 2 }}>Barrier Logs</div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'var(--color-background)',
                border: '1px solid var(--color-sand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>Gate Shift</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-fern-green)' }}>Main Gate 1 • Armed</span>
            </div>
          </div>
        </div>


        {/* Responsive Grid with all 12 requested metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 16,
          }}
        >
          {/* 1. Total Homes */}
          <div
            id="card-total-homes"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Total Homes</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(196, 154, 108, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Building2 style={{ width: 18, height: 18, color: 'var(--color-clay)' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#403630', lineHeight: 1 }}>
              {stats.totalHomes}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              All registered units in society
            </div>
          </div>

          {/* 2. Occupied Homes */}
          <div
            id="card-occupied-homes"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Occupied Homes</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(107, 142, 90, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Home style={{ width: 18, height: 18, color: 'var(--color-fern-green)' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-fern-green)', lineHeight: 1 }}>
              {stats.occupiedHomes}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              {occupancy.occupancyPercentage}% Occupancy rate
            </div>
          </div>

          {/* 3. Vacant Homes */}
          <div
            id="card-vacant-homes"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Vacant Homes</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(214, 194, 161, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DoorOpen style={{ width: 18, height: 18, color: 'var(--color-clay)' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-clay)', lineHeight: 1 }}>
              {stats.vacantHomes}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              {occupancy.vacantPercentage}% Ready for allotment
            </div>
          </div>

          {/* 4. Owners */}
          <div
            id="card-owners"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Owners</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(196, 154, 108, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award style={{ width: 18, height: 18, color: 'var(--color-clay)' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#403630', lineHeight: 1 }}>
              {stats.owners}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              Primary property deed holders
            </div>
          </div>

          {/* 5. Tenants */}
          <div
            id="card-tenants"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Tenants</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(135, 206, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users style={{ width: 18, height: 18, color: '#0284c7' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>
              {stats.tenants}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              Verified active lease holders
            </div>
          </div>

          {/* 6. Family Members */}
          <div
            id="card-family-members"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Family Members</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(196, 154, 108, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCheck style={{ width: 18, height: 18, color: 'var(--color-clay)' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#403630', lineHeight: 1 }}>
              {stats.familyMembers}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              Verified household dependents
            </div>
          </div>

          {/* 7. Security Staff */}
          <div
            id="card-security-staff"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Security Staff</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(135, 206, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck style={{ width: 18, height: 18, color: '#0284c7' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>
              {stats.securityStaff}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              Guards & gate supervisors
            </div>
          </div>

          {/* 8. Workers */}
          <div
            id="card-workers"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Workers</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(107, 142, 90, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Briefcase style={{ width: 18, height: 18, color: 'var(--color-fern-green)' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-fern-green)', lineHeight: 1 }}>
              {stats.workers}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              Drivers, maids & daily helpers
            </div>
          </div>

          {/* 9. Committee Members */}
          <div
            id="card-committee-members"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Committee Members</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(196, 154, 108, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >

              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-clay)', lineHeight: 1 }}>
              {stats.committeeMembers}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              President, Secretary, Treasurer
            </div>
          </div>

          {/* 10. Today's Visitors */}
          <div
            id="card-today-visitors"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Today's Visitors</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(107, 142, 90, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users style={{ width: 18, height: 18, color: 'var(--color-fern-green)' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-fern-green)', lineHeight: 1 }}>
              {stats.todayVisitors}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              Guest passes logged today
            </div>
          </div>

          {/* 11. Today's Deliveries */}
          <div
            id="card-today-deliveries"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Today's Deliveries</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(196, 154, 108, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Truck style={{ width: 18, height: 18, color: 'var(--color-clay)' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-clay)', lineHeight: 1 }}>
              {stats.todayDeliveries}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              Packages & parcel agents
            </div>
          </div>

          {/* 12. Today's Gate Entries */}
          <div
            id="card-today-gate-entries"
            className="glass-panel"
            style={{
              padding: 20,
              background: 'var(--color-white)',
              border: '1px solid var(--color-sand)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>Today's Gate Entries</span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(135, 206, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity style={{ width: 18, height: 18, color: '#0284c7' }} />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0284c7', lineHeight: 1 }}>
              {stats.todayGateEntries}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: 8 }}>
              Perimeter barrier audit logs
            </div>
          </div>
        </div>
      </div>


      {/* RECENT ACTIVITY AUDIT SECTION */}
      <div id="recent-activity-section" className="glass-panel" style={{ padding: 26, background: 'var(--color-white)', border: '1px solid var(--border-card)', borderRadius: '16px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 20,
            borderBottom: '1px solid var(--border-card)',
            paddingBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'var(--grad-primary)',
                boxShadow: 'var(--shadow-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-dark-brown)' }}>
                Recent Activity
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Audit overview and total log count of all recorded society activities
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(107, 142, 90, 0.15)',
              color: 'var(--color-fern-green)',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={14} />
            <span>Audit Logs Active</span>
          </div>
        </div>

        {/* Total Activities Display */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          {/* Main Total Activities Card */}
          <div
            style={{
              padding: '24px 28px',
              background: 'var(--bg-tertiary, #FAF6EE)',
              border: '1.5px solid var(--border-card)',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gridColumn: '1 / -1',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: 'var(--grad-primary)',
                  boxShadow: 'var(--shadow-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <Activity size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-clay)', letterSpacing: '0.05em' }}>
                  Total System Activities
                </span>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--color-dark-brown)', lineHeight: 1.1, marginTop: 2 }}>
                  {activities.length} <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-muted)' }}>Recorded Events</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                Real-time activity audit counter
              </span>
            </div>
          </div>

          {/* Breakdown Mini Cards */}
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--color-white)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(196, 154, 108, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-clay)',
                flexShrink: 0,
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visitor Entries</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                {activities.filter((a) => a.type?.startsWith('VISITOR')).length}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              background: 'var(--color-white)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(196, 154, 108, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-clay)',
                flexShrink: 0,
              }}
            >
              <Truck size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deliveries</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                {activities.filter((a) => a.type?.startsWith('DELIVERY')).length}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              background: 'var(--color-white)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(107, 142, 90, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-fern-green)',
                flexShrink: 0,
              }}
            >
              <Home size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Residents</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                {activities.filter((a) => a.type === 'NEW_RESIDENT').length}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              background: 'var(--color-white)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(2, 132, 199, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Workers & Staff</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                {activities.filter((a) => a.type === 'NEW_WORKER').length}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              background: 'var(--color-white)',
              border: '1px solid var(--border-card)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(234, 179, 8, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ca8a04',
                flexShrink: 0,
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Announcements</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                {activities.filter((a) => a.type === 'COMMITTEE_ANNOUNCEMENT').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MANAGEMENT MODULES NAVIGATION GRID */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers style={{ width: 22, height: 22, color: '#6366f1' }} />
              <span>Society Management Modules</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Direct access to all administrative features, configurations, and rosters
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
            12 Active Sub-systems
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {managementModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.title}
                to={mod.path}
                className="glass-panel"
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: `${mod.color}20`,
                        border: `1px solid ${mod.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon style={{ width: 22, height: 22, color: mod.color }} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {mod.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                    {mod.title}
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    {mod.description}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: mod.color }}>
                    {mod.count}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Open Module</span>
                    <ArrowRight style={{ width: 14, height: 14 }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
