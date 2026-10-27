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
  MapPin,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { securityApi } from '../api/securityApi';
import { gateApi } from '../api/gateApi';
import { societyApi } from '../api/societyApi';
import { useAuthStore } from '../store/authStore';

const getGateImage = (gate) => {
  const name = (gate?.name || gate?.gate_name || '').toLowerCase();
  const type = (gate?.gate_type || '').toLowerCase();
  if (name.includes('parking') || type.includes('parking')) {
    return '/images/parking-gate.jpg';
  }
  if (name.includes('service') || name.includes('back') || name.includes('delivery')) {
    return '/images/service-gate.jpg';
  }
  return '/images/gatehouse.jpg';
};

const formatTime = (ts) => {
  if (!ts) return 'Just now';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return String(ts);
  }
};

export default function SecurityGateDashboardPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignedGateInfo, setAssignedGateInfo] = useState(null);
  const [gatesList, setGatesList] = useState([]);
  const [showAllGates, setShowAllGates] = useState(false);
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
      const [dashRes, assignedRes, gatesRes] = await Promise.all([
        securityApi.getGateDashboard(socId !== 'ALL' ? socId : undefined),
        gateApi.getMyAssignedGate().catch(() => ({ data: { has_assignment: false, gate: null } })),
        gateApi.getGates({ society_id: socId !== 'ALL' ? socId : undefined }).catch(() => ({ data: { gates: [] } })),
      ]);
      setDashboardData(dashRes.data || {});
      setAssignedGateInfo(assignedRes.data?.gate || null);
      setGatesList(gatesRes.data?.gates || []);
    } catch (err) {
      showNotice('error', err.message || 'Failed to load gate console data.');
    } finally {
      setLoading(false);
    }
  };

  // Security selects gate -> Records IN TIME
  const handleCheckInGate = async (gate) => {
    const gateId = gate.id || gate.gate_id;
    const gateName = gate.name || gate.gate_name;
    try {
      setLoading(true);
      const res = await gateApi.selfCheckIn({ gate_id: gateId });
      showNotice('success', `Checked in at "${gateName}" successfully! Your IN TIME has been recorded.`);
      setShowAllGates(false);
      await fetchGateData(selectedSocietyId);
    } catch (err) {
      showNotice('error', err.response?.data?.message || err.message || 'Failed to check in to gate.');
    } finally {
      setLoading(false);
    }
  };

  // Security exits gate -> Records EXIT GATE / OUT TIME
  const handleCheckOutGate = async () => {
    if (!window.confirm('Are you sure you want to exit your active gate duty? Your exit time will be recorded.')) {
      return;
    }
    try {
      setLoading(true);
      const res = await gateApi.selfCheckOut();
      showNotice('success', res.data?.message || 'Checked out from gate successfully. Exit time recorded.');
      setAssignedGateInfo(null);
      await fetchGateData(selectedSocietyId);
    } catch (err) {
      showNotice('error', err.response?.data?.message || err.message || 'Failed to exit gate.');
    } finally {
      setLoading(false);
    }
  };
;

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
                    {societies[0]?.name || user?.societyName || ''}
                  </span>
                )}
              </div>

              {assignedGateInfo ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#065f46',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 12px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                  >
                    <DoorOpen size={16} color="#10b981" />
                    <span>Station: <strong>{assignedGateInfo.name}</strong></span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        background: '#FFFFFF',
                        color: '#065f46',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontWeight: 700,
                      }}
                    >
                      IN: {formatTime(assignedGateInfo.check_in_time)}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckOutGate}
                    className="btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#dc2626',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Exit active gate duty station and log exit time"
                  >
                    <DoorOpen size={14} />
                    <span>Exit Gate</span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#b45309',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px 12px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  <Shield size={14} />
                  <span>No Station Selected • Select Gate Below to Start Duty</span>
                </div>
              )}
            </div>

            <button
              onClick={() => fetchGateData(selectedSocietyId)}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '0.825rem', gap: 6 }}
              title="Refresh console and active station"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
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
          DUTY STATION CONSOLE (Active Gate & Gate Selection)
          Security sees all gates -> selects gate -> logs IN TIME
          ======================================================== */}
      {assignedGateInfo && !showAllGates ? (
        <div
          className="glass-panel"
          style={{
            padding: '24px 28px',
            borderRadius: 'var(--radius-lg)',
            background: '#FFFFFF',
            border: '2px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 6px 24px rgba(16, 185, 129, 0.08)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                flexShrink: 0,
              }}
            >
              <DoorOpen size={28} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#065f46',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Active Duty Station
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>•</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Shift: {assignedGateInfo.shift || 'Morning'}
                </span>
              </div>

              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--color-dark-brown)' }}>
                {assignedGateInfo.name} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600 }}>(Gate #{assignedGateInfo.gate_number})</span>
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: '#065f46', fontWeight: 700 }}>
                  <Clock size={14} color="#10b981" />
                  <span>IN Time: {formatTime(assignedGateInfo.check_in_time)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <MapPin size={14} />
                  <span>{assignedGateInfo.location || 'Society Perimeter'}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: assignedGateInfo.allows_entry_registration ? '#047857' : '#64748b', fontWeight: 600 }}>
                  {assignedGateInfo.allows_entry_registration ? '✓ Entry Registration Allowed' : 'Monitor Only Checkpoint'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAllGates(true)}
              className="btn btn-secondary"
              style={{ padding: '9px 16px', fontSize: '0.85rem', fontWeight: 700, gap: '6px' }}
            >
              <DoorOpen size={16} />
              <span>Switch Gate</span>
            </button>

            <button
              onClick={handleCheckOutGate}
              className="btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                fontSize: '0.85rem',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <DoorOpen size={16} />
              <span>Exit Gate</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="glass-panel"
          style={{
            padding: '26px 30px',
            borderRadius: 'var(--radius-xl)',
            background: '#FFFFFF',
            border: '1.5px solid var(--color-sand)',
            boxShadow: '0 6px 20px rgba(196, 154, 108, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <DoorOpen size={20} color="var(--color-clay)" />
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--color-dark-brown)' }}>
                  Society Gates — Select Your Duty Station
                </h2>
              </div>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Select the gate you are stationed at. Selecting a gate logs your <strong>IN TIME</strong> and begins your duty shift.
              </p>
            </div>

            {assignedGateInfo && (
              <button
                onClick={() => setShowAllGates(false)}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.82rem', gap: '6px' }}
              >
                <X size={14} />
                <span>Keep Current Station</span>
              </button>
            )}
          </div>

          {gatesList.length === 0 ? (
            <div
              style={{
                padding: '30px',
                textAlign: 'center',
                background: '#FAF6EE',
                borderRadius: 'var(--radius-md)',
                border: '1px solid #EAE0D5',
                color: 'var(--text-muted)',
              }}
            >
              <DoorOpen size={32} color="var(--color-sand)" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontWeight: 700, margin: 0 }}>No gates found for this society.</p>
              <p style={{ fontSize: '0.82rem', marginTop: '4px' }}>Please contact society admin to configure gates.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {gatesList.map((gate) => {
                const gateId = gate.id || gate.gate_id;
                const isCurrentStation = assignedGateInfo && (assignedGateInfo.id === gateId);
                const hasAssignedGuards = gate.assigned_guards && gate.assigned_guards.length > 0;

                return (
                  <div
                    key={gateId}
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      border: isCurrentStation ? '2px solid #10b981' : '1px solid var(--color-sand)',
                      background: isCurrentStation ? 'rgba(16, 185, 129, 0.03)' : '#FFFFFF',
                      boxShadow: isCurrentStation ? '0 4px 16px rgba(16, 185, 129, 0.15)' : '0 2px 8px rgba(196, 154, 108, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ height: '110px', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={getGateImage(gate)}
                        alt={gate.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: gate.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                          color: '#FFFFFF',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        {gate.status || 'ACTIVE'}
                      </div>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                            {gate.name}
                          </h3>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            Gate #{gate.gate_number || gateId}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} />
                          {gate.location || 'Society Perimeter'}
                        </p>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid #F0E8DC', paddingTop: '8px' }}>
                        {hasAssignedGuards ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#065f46', fontWeight: 600 }}>
                            <ShieldCheck size={14} color="#10b981" />
                            <span>Manned by: {gate.assigned_guards.map((g) => g.security_name).join(', ')}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8E7C70' }}>
                            <DoorOpen size={14} />
                            <span>Station currently unmanned</span>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                        {isCurrentStation ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div
                              style={{
                                flex: 1,
                                padding: '8px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                color: '#065f46',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                              }}
                            >
                              <CheckCircle2 size={14} color="#10b981" />
                              <span>Your Station</span>
                            </div>
                            <button
                              onClick={handleCheckOutGate}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#dc2626',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Exit Gate
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCheckInGate(gate)}
                            className="btn btn-primary"
                            style={{
                              width: '100%',
                              padding: '8px 14px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              background: 'linear-gradient(135deg, var(--color-fern-green) 0%, #3e5a2f 100%)',
                              color: '#FFFFFF',
                              borderRadius: 'var(--radius-md)',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <Clock size={14} />
                            <span>Select Gate & Check In (IN TIME)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
