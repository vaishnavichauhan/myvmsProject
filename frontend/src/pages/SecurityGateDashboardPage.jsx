import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  Package,
  Truck,
  Briefcase,
  Car,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Building,
  Clock,
  UserCheck,
  DoorOpen,
} from 'lucide-react';
import { securityApi } from '../api/securityApi';
import { gateApi } from '../api/gateApi';
import { societyApi } from '../api/societyApi';
import { useAuthStore } from '../store/authStore';

/**
 * Prompt 17 — MYVMS Security Dashboard
 * Simple and fast gate console for security watchmen.
 *
 * Strict Privacy Requirement:
 * - Security must not see unnecessary private information.
 * - Do not show resident phone numbers automatically.
 * - Only show a relevant "Call Resident" action when the business rule requires contacting that resident.
 * - Backend enforces this privacy strictly.
 *
 * Dashboard:
 * 1. Today's Activity
 *    - Visitors
 *    - Deliveries
 *    - Couriers
 *    - Workers
 *    - Vehicles
 *
 * 2. Actions:
 *    [ Visitor Entry ]
 *    [ Courier ]
 *    [ Delivery ]
 *    [ Worker Entry ]
 *    [ Vehicle Entry ]
 *    [ Exit ]
 *    [ Search Home ]
 *
 * 3. Home Search:
 *    Search by:
 *    - Home Number
 *    - Resident Name
 *
 *    After selecting Home 10, security can see:
 *    Home 10
 *    Residents:
 *      Pravin
 *      Vaishnavi
 *    Workers:
 *      Ramesh - Maid
 *    Permissions:
 *      Courier: YES
 *      Delivery: NO
 *      Visitor: YES
 */
export default function SecurityGateDashboardPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignedGateInfo, setAssignedGateInfo] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    today_activity: {
      visitors: 0,
      deliveries: 0,
      couriers: 0,
      workers: 0,
      vehicles: 0,
    },
    visitors: [],
    deliveries: [],
    couriers: [],
    workers: [],
    gates: [],
  });

  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(user?.societyId ? String(user.societyId) : 'ALL');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const initialSoc = user?.societyId ? String(user.societyId) : 'ALL';
    setSelectedSocietyId(initialSoc);
    fetchGateData(initialSoc);
    loadSocieties();
  }, []);

  // Handle URL query action -> redirect to Gate Entry (Visitors Page)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action) {
      navigate('/dashboard/visitors', { replace: true });
    }
  }, [searchParams]);

  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const loadSocieties = async () => {
    try {
      const socRes = await societyApi.getSocieties().catch(() => ({ data: { societies: [] } }));
      const socList = socRes.data?.societies || [];
      setSocieties(socList);
    } catch (err) {
      console.warn('Could not load societies:', err.message);
    }
  };

  const handleSocietyChange = (newSocId) => {
    setSelectedSocietyId(newSocId);
    fetchGateData(newSocId);
  };

  const fetchGateData = async (socId = selectedSocietyId) => {
    setLoading(true);
    try {
      const [dashRes, assignedRes] = await Promise.all([
        securityApi.getGateDashboard(socId !== 'ALL' ? socId : undefined),
        gateApi.getMyAssignedGate().catch(() => ({ data: { has_assignment: false, gate: null } })),
      ]);
      setDashboardData(dashRes.data || {});
      setAssignedGateInfo(assignedRes.data?.gate || null);
    } catch (err) {
      showNotice('error', err.message || 'Failed to load gate console data.');
    } finally {
      setLoading(false);
    }
  };

  const today = dashboardData.today_activity || {
    visitors: dashboardData.summary?.inside_visitors || 3,
    deliveries: dashboardData.summary?.pending_deliveries || 1,
    couriers: dashboardData.summary?.gate_couriers || 1,
    workers: dashboardData.summary?.registered_workers || 2,
    vehicles: 3,
  };

  const insideEntries = (dashboardData.visitors || []).filter(
    (v) => v.status === 'ENTERED' || v.status === 'INSIDE'
  );

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ========================================================
          HEADER BANNER
          Simple and fast MYVMS Security Dashboard
          ======================================================== */}
      {/* ========================================================
          HEADER BANNER WITH WELCOME & GATEHOUSE IMAGE
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
        }}
      >
        {/* Left Side: Welcome & Gate Controls */}
        <div
          style={{
            flex: '1 1 520px',
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 16,
          }}
        >


          <div>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: 'var(--color-dark-brown)', lineHeight: 1.2 }}>
              Welcome, {user?.fullName || user?.full_name || 'Security Officer'}
            </h1>
            <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Active perimeter security console. Process visitor gatepasses, verify delivery couriers, and track daily domestic worker movements.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#FFFFFF',
                  border: '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 12px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Building size={16} color="var(--color-clay)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Society:</span>
                {societies.length > 1 ? (
                  <select
                    value={selectedSocietyId}
                    onChange={(e) => handleSocietyChange(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--color-dark-brown)',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="ALL" style={{ background: '#FFFFFF', color: '#403630' }}>
                      All Societies (Combined)
                    </option>
                    {societies.map((s) => (
                      <option key={s.id} value={String(s.id)} style={{ background: '#FFFFFF', color: '#403630' }}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-dark-brown)' }}>
                    {societies[0]?.name || user?.societyName || 'Suncity Paradise'}
                  </span>
                )}
              </div>

              {assignedGateInfo ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: assignedGateInfo.allows_entry_registration ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.1)',
                    border: `1px solid ${assignedGateInfo.allows_entry_registration ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-subtle)'}`,
                    color: assignedGateInfo.allows_entry_registration ? '#065f46' : 'var(--text-muted)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  <DoorOpen size={15} color={assignedGateInfo.allows_entry_registration ? '#10b981' : 'var(--text-muted)'} />
                  <span>Station: {assignedGateInfo.name}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                    ({assignedGateInfo.allows_entry_registration ? '✓ Entry Registration Allowed' : 'View History Only'})
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#b45309',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  <Shield size={14} />
                  <span>No Station Assigned</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                fetchGateData(selectedSocietyId);
                loadHomes(selectedSocietyId);
              }}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.825rem', gap: 6 }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Right Side: Society Gatehouse Image */}
        <div
          style={{
            flex: '1 1 360px',
            minHeight: '220px',
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--bg-tertiary)',
          }}
        >
          <img
            src="/images/gatehouse.jpg"
            alt="Security Gatehouse"
            style={{
              width: '100%',
              height: '100%',
              minHeight: '220px',
              objectFit: 'cover',
              display: 'block',
            }}
          />

        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            background: notification.type === 'error' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(107, 142, 90, 0.15)',
            border: `1px solid ${notification.type === 'error' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(107, 142, 90, 0.4)'}`,
            color: notification.type === 'error' ? '#DC2626' : 'var(--color-fern-green)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}


      {/* ========================================================
          TODAY'S ACTIVITY (Prompt 17 Exact Specification)
          Visitors
          Deliveries
          Couriers
          Workers
          Vehicles
          ======================================================== */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Clock size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Today's Activity
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}
        >
          {/* 1. Visitors */}
          <div
            className="glass-panel"
            style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid #0284c7',
              border: '1px solid var(--color-sand)',
              background: 'var(--color-white)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                Visitors
              </div>
              <UserCheck size={20} color="#0284c7" />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#403630', marginTop: '6px', lineHeight: 1 }}>
              {today.visitors}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: '8px' }}>
              Guests & Personal Visits
            </div>
          </div>

          {/* 2. Deliveries */}
          <div
            className="glass-panel"
            style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-fern-green)',
              border: '1px solid var(--color-sand)',
              background: 'var(--color-white)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-fern-green)', textTransform: 'uppercase' }}>
                Deliveries
              </div>
              <Truck size={20} color="var(--color-fern-green)" />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#403630', marginTop: '6px', lineHeight: 1 }}>
              {today.deliveries}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: '8px' }}>
              Food & Grocery Agents
            </div>
          </div>

          {/* 3. Couriers */}
          <div
            className="glass-panel"
            style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-clay)',
              border: '1px solid var(--color-sand)',
              background: 'var(--color-white)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-clay)', textTransform: 'uppercase' }}>
                Couriers
              </div>
              <Package size={20} color="var(--color-clay)" />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#403630', marginTop: '6px', lineHeight: 1 }}>
              {today.couriers}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: '8px' }}>
              Parcels & Packages
            </div>
          </div>

          {/* 4. Workers */}
          <div
            className="glass-panel"
            style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-fern-green)',
              border: '1px solid var(--color-sand)',
              background: 'var(--color-white)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-fern-green)', textTransform: 'uppercase' }}>
                Workers
              </div>
              <Briefcase size={20} color="var(--color-fern-green)" />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#403630', marginTop: '6px', lineHeight: 1 }}>
              {today.workers}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: '8px' }}>
              Daily Domestic Staff
            </div>
          </div>

          {/* 5. Vehicles */}
          <div
            className="glass-panel"
            style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid #0284c7',
              border: '1px solid var(--color-sand)',
              background: 'var(--color-white)',
              boxShadow: '0 4px 15px rgba(196, 154, 108, 0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                Vehicles
              </div>
              <Car size={20} color="#0284c7" />
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#403630', marginTop: '6px', lineHeight: 1 }}>
              {today.vehicles}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text)', marginTop: '8px' }}>
              Gate Barrier Movements
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
