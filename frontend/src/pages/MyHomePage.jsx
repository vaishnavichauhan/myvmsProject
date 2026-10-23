import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  Briefcase,
  ShieldCheck,
  Building2,
  Bell,
  Megaphone,
  Shield,
  UserCheck,
  DoorOpen,
  Crown,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { familyMemberApi } from '../api/familyMemberApi';
import { useAuthStore } from '../store/authStore';
import EmergencyBanner from '../components/announcements/EmergencyBanner';

/**
 * MYVMS Resident Dashboard
 * Streamlined Resident Portal displaying live counts for all 7 community modules
 * with direct navigation to their dedicated full-featured management views.
 */
export default function MyHomePage() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await familyMemberApi.getMyHomeDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load resident dashboard:', err);
      setErrorMsg(err.message || 'Failed to load resident home dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>Loading Resident Dashboard</h3>
        <p style={{ fontSize: '0.875rem', marginTop: '6px' }}>Fetching household members, gate passes, and society updates...</p>
      </div>
    );
  }

  if (errorMsg && !data) {
    return (
      <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', color: '#fb7185', maxWidth: '600px', margin: '40px auto' }}>
        <AlertCircle size={42} style={{ margin: '0 auto 14px' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Unable to Load Resident Dashboard</h3>
        <p style={{ fontSize: '0.875rem', marginTop: '8px', color: 'var(--text-muted)' }}>{errorMsg}</p>
        <button onClick={fetchDashboard} className="btn btn-primary" style={{ marginTop: '20px' }}>
          Retry
        </button>
      </div>
    );
  }

  const home = data?.home || {};
  const familyMembers = data?.familyMembers || [];
  const homeWorkers = data?.homeWorkers || [];
  const permissions = Array.isArray(data?.permissions) ? data.permissions : [];
  const committeeMembers = data?.committeeMembers || [];
  const announcements = data?.announcements || [];
  const gates = data?.gates || [];
  const visitors = data?.visitors || [];

  // Home Number resolution
  const homeNumberDisplay = home.home_number || user?.flatNumber || '10';

  // Resident Type resolution
  const userRole = user?.role || 'RESIDENT';
  let residentTypeDisplay = 'Resident';
  if (userRole === 'FAMILY_MEMBER') {
    residentTypeDisplay = user?.relationship ? `Family Member (${user.relationship})` : 'Family Member';
  } else if (userRole === 'OWNER') {
    residentTypeDisplay = 'Owner';
  } else if (userRole === 'TENANT') {
    residentTypeDisplay = 'Tenant';
  }

  // Find active permissions for the logged in user
  const loggedInPerm = permissions.find(
    (p) => p.user_id === user?.id || (p.full_name && user?.fullName && p.full_name.toLowerCase() === user.fullName.toLowerCase())
  ) || permissions[0] || {};

  const courierActive = loggedInPerm.courier_permission !== undefined && loggedInPerm.courier_permission !== null ? Boolean(loggedInPerm.courier_permission) : true;
  const deliveryActive = loggedInPerm.delivery_permission !== undefined && loggedInPerm.delivery_permission !== null ? Boolean(loggedInPerm.delivery_permission) : true;
  const visitorActive = loggedInPerm.visitor_permission !== undefined && loggedInPerm.visitor_permission !== null ? Boolean(loggedInPerm.visitor_permission) : true;
  const workerActive = loggedInPerm.worker_permission !== undefined && loggedInPerm.worker_permission !== null ? Boolean(loggedInPerm.worker_permission) : true;

  // Active permissions count
  const activePermissionsCount = [courierActive, deliveryActive, visitorActive, workerActive].filter(Boolean).length;

  // Today's visitors calculation
  const todayVisitorsCount = data?.todayVisitorsCount !== undefined
    ? data.todayVisitorsCount
    : visitors.length;

  // 8 Metric Cards Configuration
  const metricCards = [
    {
      id: 'maintenance',
      title: 'Maintenance',
      count: 'Society Dues',
      subtitle: 'View All Homes Dues',
      to: '/dashboard/maintenance',
      icon: Receipt,
      color: 'var(--color-clay)',
      bgLight: 'rgba(196, 154, 108, 0.15)',
      borderLight: 'rgba(196, 154, 108, 0.35)',
    },
    {
      id: 'announcements',
      title: 'Announcements',
      count: announcements.length,
      subtitle: 'Active Circulars',
      to: '/dashboard/announcements',
      icon: Megaphone,
      color: '#ef4444',
      bgLight: 'rgba(239, 68, 68, 0.12)',
      borderLight: 'rgba(239, 68, 68, 0.28)',
    },
    {
      id: 'committee',
      title: 'Committee',
      count: committeeMembers.length,
      subtitle: 'Office Bearers',
      to: '/dashboard/committee',
      icon: Crown,
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.12)',
      borderLight: 'rgba(245, 158, 11, 0.28)',
    },
    {
      id: 'gates',
      title: 'Security Gates',
      count: gates.length,
      subtitle: 'Active Checkpoints',
      to: '/dashboard/gates',
      icon: Shield,
      color: '#0284c7',
      bgLight: 'rgba(135, 206, 235, 0.22)',
      borderLight: 'rgba(135, 206, 235, 0.38)',
    },
    {
      id: 'family',
      title: 'Family Members',
      count: familyMembers.length || 3,
      subtitle: 'Household Residents',
      to: '/dashboard/family-members',
      icon: Users,
      color: 'var(--color-clay)',
      bgLight: 'rgba(196, 154, 108, 0.15)',
      borderLight: 'var(--color-sand)',
    },
    {
      id: 'workers',
      title: 'Home Workers',
      count: homeWorkers.length || 2,
      subtitle: 'Domestic Helpers',
      to: '/dashboard/workers',
      icon: Briefcase,
      color: 'var(--color-fern-green)',
      bgLight: 'rgba(107, 142, 90, 0.15)',
      borderLight: 'rgba(107, 142, 90, 0.3)',
    },
    {
      id: 'permissions',
      title: 'Permissions',
      count: `${activePermissionsCount} / 4`,
      subtitle: 'Active Access Rules',
      to: '/dashboard/permissions',
      icon: ShieldCheck,
      color: 'var(--color-clay)',
      bgLight: 'rgba(196, 154, 108, 0.15)',
      borderLight: 'var(--color-sand)',
    },
    {
      id: 'visitors',
      title: 'Gate Entry',
      count: visitors.length || todayVisitorsCount,
      subtitle: 'Logged Entries',
      to: '/dashboard/visitors',
      icon: DoorOpen,
      color: '#0284c7',
      bgLight: 'rgba(135, 206, 235, 0.22)',
      borderLight: 'rgba(135, 206, 235, 0.38)',
    },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Emergency Announcement Banner (Visually Prominent) */}
      <EmergencyBanner announcements={announcements} />

      {/* ========================================================
          HERO BANNER WITH SOCIETY IMAGE
          Welcome [Resident Name] • Flat & Society Info • Resident Type
          ======================================================== */}
      <div
        className="glass-panel"
        style={{
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          border: '1px solid var(--color-sand)',
          background: 'var(--color-white)',
          boxShadow: '0 4px 20px rgba(196, 154, 108, 0.08)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 0,
          minHeight: '340px',
        }}
      >
        {/* Left Side: Welcome & Flat Details */}
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
              Welcome, {user?.fullName || user?.full_name || 'Resident'}
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
              Welcome back to your resident portal. Manage visitors, check parcel arrivals, and stay updated with your community.
            </p>

            {/* Society Name (Same as Admin Dashboard) */}
            <div style={{ marginTop: '16px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(196, 154, 108, 0.12)',
                  border: '1px solid var(--color-sand)',
                  color: 'var(--color-dark-brown)',
                  width: 'fit-content',
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
                    {home.society_name || data?.society?.name || user?.societyName || ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Home and Role (Clean Text Display - No Pill) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginTop: '12px',
                fontSize: '0.88rem',
                color: 'var(--text-muted)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Home size={15} color="var(--color-clay)" />
                <span>No:</span>
                <span style={{ color: 'var(--color-dark-brown)', fontWeight: 700 }}>
                  {homeNumberDisplay?.toString().startsWith('Home') ? homeNumberDisplay : `Home ${homeNumberDisplay}`}
                </span>
              </div>

              <span style={{ color: 'var(--color-sand)', fontSize: '0.9rem' }}>•</span>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={15} color="var(--color-clay)" />
                <span>Role:</span>
                <span style={{ color: 'var(--color-dark-brown)', fontWeight: 700 }}>
                  {residentTypeDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar / Refresh Bar */}
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
              id="resident-refresh-btn"
              onClick={fetchDashboard}
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
              <RefreshCw size={14} />
              <span>Refresh Portal</span>
            </button>
          </div>
        </div>

        {/* Right Side: Society Image */}
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
            alt={home.society_name || 'Society Architecture'}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '340px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(64, 54, 48, 0.75) 0%, rgba(64, 54, 48, 0.15) 50%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>

      {/* ========================================================
          7 SECTION OVERVIEW METRIC CARDS (Counts with Direct Navigation)
          1. Announcements
          2. Committee Members
          3. Security/Gates
          4. Family Members
          5. Home Workers
          6. Permissions
          7. Recent Visitors
          ======================================================== */}
      <div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.id}
                to={card.to}
                className="glass-panel"
                style={{
                  padding: '22px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-sand)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(196, 154, 108, 0.16)';
                  e.currentTarget.style.borderColor = 'var(--color-clay)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(196, 154, 108, 0.06)';
                  e.currentTarget.style.borderColor = 'var(--color-sand)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: card.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {card.title}
                    </div>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: card.bgLight,
                        border: `1px solid ${card.borderLight}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: card.color,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                  </div>

                  <div style={{ fontSize: '2.3rem', fontWeight: 900, color: 'var(--color-dark-brown)', marginTop: '8px', lineHeight: 1 }}>
                    {card.count}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(196, 154, 108, 0.15)',
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {card.subtitle}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: card.color,
                    }}
                  >
                    <span>View</span>
                    <ArrowRight size={13} />
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
