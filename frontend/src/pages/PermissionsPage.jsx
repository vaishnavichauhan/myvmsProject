import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  Package,
  Truck,
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Home,
  Check,
  X,
  PlayCircle,
  UserCheck,
  Search,
  Clock,
  Building2,
  Phone,
  PhoneCall,
  Copy,
  CheckCheck,
  AlertTriangle,
  MessageSquare,
  Send,
} from 'lucide-react';
import { permissionApi } from '../api/permissionApi';
import { useAuthStore } from '../store/authStore';

const PERMISSION_CONFIG = [
  {
    key: 'visitor_permission',
    type: 'VISITOR',
    label: 'Visitor',
    title: 'Guest & Visitor Approvals',
    desc: 'Generate entry OTPs and approve visitors, relatives, cabs, and technicians.',
    icon: Users,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
  },
  {
    key: 'courier_permission',
    type: 'COURIER',
    label: 'Courier',
    title: 'Courier & Package Pickup',
    desc: 'Receive parcel deliveries, courier drop-offs, and packages at the gate/lobby.',
    icon: Package,
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.15)',
  },
  {
    key: 'delivery_permission',
    type: 'DELIVERY',
    label: 'Delivery',
    title: 'Instant Deliveries (Food & Grocery)',
    desc: 'Approve entry passes for Swiggy, Zomato, Blinkit, and Amazon delivery agents.',
    icon: Truck,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
  },

  {
    key: 'worker_permission',
    type: 'WORKER',
    label: 'Worker',
    title: 'Home Helpers & Staff Management',
    desc: 'Assign, manage, and approve domestic helpers, drivers, maids, and cooks.',
    icon: Briefcase,
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.15)',
  },
];

export default function PermissionsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [homesList, setHomesList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingHomeId, setUpdatingHomeId] = useState(null);
  const [updatingPermKey, setUpdatingPermKey] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Live Backend Enforcement Test State
  const [enforcementLog, setEnforcementLog] = useState(null);
  const [testingAction, setTestingAction] = useState(null);

  // Security Gate Visit Permission Check Widget State
  const [selectedHomeIdForCheck, setSelectedHomeIdForCheck] = useState('');
  const [selectedVisitTypeForCheck, setSelectedVisitTypeForCheck] = useState('VISITOR');
  const [copiedPhone, setCopiedPhone] = useState(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await permissionApi.getHomePermissions();
      const perms = res.data?.permissions || [];
      setHomesList(perms);
      if (perms.length > 0) {
        setSelectedHomeIdForCheck((prev) => (prev ? prev : String(perms[0].home_id)));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load home permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPhone = (phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  /**
   * Check if caller has rights to edit this home's permissions:
   * - Admin can edit any home
   * - Owner, Tenant, or Family Member can edit if they live in this home
   */
  const canEditHome = (homeItem) => {
    if (isAdmin) return true;
    if (!homeItem?.residents) return false;
    return homeItem.residents.some((r) => r.user_id === user?.id);
  };

  const handleTogglePermission = async (homeItem, permKey, forcedVal = null) => {
    if (!canEditHome(homeItem)) {
      setErrorMsg('You do not have permission to manage this home.');
      return;
    }

    const currentVal = homeItem[permKey] !== undefined && homeItem[permKey] !== null
      ? Boolean(homeItem[permKey])
      : true;
    const newVal = forcedVal !== null ? forcedVal : !currentVal;

    if (forcedVal !== null && currentVal === forcedVal) {
      return;
    }

    setUpdatingHomeId(homeItem.home_id);
    setUpdatingPermKey(permKey);
    setErrorMsg(null);

    const payload = {
      home_id: homeItem.home_id,
      courier_permission: homeItem.courier_permission !== undefined && homeItem.courier_permission !== null ? Boolean(homeItem.courier_permission) : true,
      delivery_permission: homeItem.delivery_permission !== undefined && homeItem.delivery_permission !== null ? Boolean(homeItem.delivery_permission) : true,
      visitor_permission: homeItem.visitor_permission !== undefined && homeItem.visitor_permission !== null ? Boolean(homeItem.visitor_permission) : true,
      worker_permission: homeItem.worker_permission !== undefined && homeItem.worker_permission !== null ? Boolean(homeItem.worker_permission) : true,
      [permKey]: newVal,
    };

    try {
      await permissionApi.updateHomePermissions(homeItem.home_id, payload);
      setSuccessMsg(
        `Updated ${permKey.replace('_permission', '').toUpperCase()} permission for Home ${homeItem.home_number} to ${newVal ? 'YES' : 'NO'}`
      );
      await fetchPermissions();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update home permission.');
    } finally {
      setUpdatingHomeId(null);
      setUpdatingPermKey(null);
    }
  };

  const handleTestBackendEnforcement = async (actionType) => {
    setTestingAction(actionType);
    setEnforcementLog(null);
    try {
      let res;
      if (actionType === 'COURIER') res = await permissionApi.testCourierAction();
      else if (actionType === 'DELIVERY') res = await permissionApi.testDeliveryAction();
      else if (actionType === 'VISITOR') res = await permissionApi.testVisitorAction();
      else if (actionType === 'WORKER') res = await permissionApi.testWorkerAction();

      setEnforcementLog({
        type: 'SUCCESS',
        action: actionType,
        message: res.message || `${actionType} action authorized successfully by backend!`,
        status: 200,
      });
    } catch (err) {
      setEnforcementLog({
        type: 'BLOCKED',
        action: actionType,
        message: err.message || `Action denied by backend for ${actionType}`,
        status: err.status || 403,
      });
    } finally {
      setTestingAction(null);
    }
  };

  const filteredHomes = homesList.filter((h) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const matchHome =
      String(h.home_number).toLowerCase().includes(term) ||
      (h.building_or_wing && h.building_or_wing.toLowerCase().includes(term)) ||
      (h.society_name && h.society_name.toLowerCase().includes(term));
    const matchResident = h.residents?.some(
      (r) =>
        r.full_name?.toLowerCase().includes(term) ||
        r.phone?.includes(term) ||
        r.user_label?.toLowerCase().includes(term)
    );
    return matchHome || matchResident;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <ShieldCheck size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Home Permissions</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
              Permissions are common per home number.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAdmin && (
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              />
              <input
                type="text"
                placeholder="Search by Home # or Resident..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem', minWidth: '240px' }}
              />
            </div>
          )}

          <button onClick={fetchPermissions} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            <RefreshCw size={14} />

          </button>
        </div>
      </div>



      {/* Alerts */}
      {successMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            color: '#fb7185',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =========================================================================
          SECURITY GATE VISIT PERMISSION & RESIDENT VERIFICATION WIDGET
          Shows Home Owner / Tenant Phone Number when permission is required / checked
          ========================================================================= */}
      {homesList.length > 0 && (() => {
        const activeCheckHome = homesList.find((h) => String(h.home_id) === String(selectedHomeIdForCheck)) || homesList[0];
        const activeCheckCfg = PERMISSION_CONFIG.find((c) => c.type === selectedVisitTypeForCheck) || PERMISSION_CONFIG[0];
        const isCheckAllowed = activeCheckHome
          ? activeCheckHome[activeCheckCfg.key] !== undefined && activeCheckHome[activeCheckCfg.key] !== null
            ? Boolean(activeCheckHome[activeCheckCfg.key])
            : true
          : true;

        const checkPrimaryResident = activeCheckHome?.residents?.find((r) => r.role === 'OWNER' || r.resident_type === 'OWNER') ||
          activeCheckHome?.residents?.find((r) => r.role === 'TENANT' || r.resident_type === 'TENANT') ||
          activeCheckHome?.residents?.[0];

        const alternateResidents = (activeCheckHome?.residents || []).filter(
          (r) => r.user_id !== checkPrimaryResident?.user_id
        );

        return (
          <div
            id="security-gate-permission-verifier"
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: isCheckAllowed ? '2px solid #E2D9CF' : '2px solid #FCA5A5',
              padding: '26px 28px',
              boxShadow: isCheckAllowed
                ? '0 8px 24px rgba(64, 54, 48, 0.05)'
                : '0 8px 24px rgba(239, 68, 68, 0.12)',
              position: 'relative',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: isCheckAllowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1.5px solid ${isCheckAllowed ? '#10b981' : '#ef4444'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isCheckAllowed ? '#059669' : '#dc2626',
                  }}
                >
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-dark-brown)' }}>
                      Security Gate Permission Check & Contact Verification
                    </h2>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '20px',
                        background: isCheckAllowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isCheckAllowed ? '#059669' : '#dc2626',
                        border: `1px solid ${isCheckAllowed ? '#10b981' : '#f87171'}`,
                      }}
                    >
                      {isCheckAllowed ? 'ALLOWED (YES)' : 'PERMISSION REQUIRED (NO)'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#6E5D53', margin: '4px 0 0 0' }}>
                    Select a Home Number and Gate Visit Type. If permission is required (NO), the Home Owner / Tenant phone number is displayed immediately for security contact.
                  </p>
                </div>
              </div>
            </div>

            {/* Selection Row: 1. Home Number Select, 2. Gate Visit Type Pills */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                background: '#FAF6EE',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid #EBE3D7',
                marginBottom: '20px',
              }}
            >
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-dark-brown)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Home size={14} color="var(--color-clay)" /> Select Home Number:
                </label>
                <select
                  value={selectedHomeIdForCheck}
                  onChange={(e) => setSelectedHomeIdForCheck(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--color-sand)',
                    background: '#FFFFFF',
                    color: 'var(--color-dark-brown)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    marginTop: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {homesList.map((h) => (
                    <option key={h.home_id} value={h.home_id}>
                      Home {h.home_number} {h.building_or_wing ? `(${h.building_or_wing})` : ''} {h.society_name ? `— ${h.society_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-dark-brown)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                  Gate Visit Type:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {PERMISSION_CONFIG.map((cfg) => {
                    const isSelected = selectedVisitTypeForCheck === cfg.type;
                    const IconComp = cfg.icon;
                    return (
                      <button
                        key={cfg.type}
                        type="button"
                        onClick={() => setSelectedVisitTypeForCheck(cfg.type)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: isSelected ? `2px solid ${cfg.color}` : '1.5px solid #E2D9CF',
                          background: isSelected ? cfg.bg : '#FFFFFF',
                          color: isSelected ? cfg.color : '#6E5D53',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <IconComp size={15} />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Status & Owner/Tenant Phone Display Box */}
            {isCheckAllowed ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle2 size={24} color="#10b981" />
                  <div>
                    <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.95rem' }}>
                      Direct Gate Entry Permitted for Home {activeCheckHome?.home_number}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: '2px' }}>
                      {activeCheckCfg.label} permission is set to <strong>YES</strong>. No security restriction for this visit type.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '2px solid #F87171',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#dc2626',
                    }}
                  >
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991B1B' }}>
                      ⚠️ Permission Required: Home {activeCheckHome?.home_number} Restricted {activeCheckCfg.label} Entry
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#7F1D1D', marginTop: '2px' }}>
                      Security Gate Protocol: Blanket entry is set to <strong>NO</strong>. Security must contact the Home Owner or Tenant below for approval before granting entry:
                    </div>
                  </div>
                </div>

                {checkPrimaryResident ? (
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1.5px solid #FCA5A5',
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          boxShadow: '0 4px 10px rgba(220, 38, 38, 0.25)',
                        }}
                      >
                        {checkPrimaryResident.full_name?.charAt(0).toUpperCase() || 'R'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                            {checkPrimaryResident.full_name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: 'rgba(239, 68, 68, 0.12)',
                              color: '#DC2626',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            {checkPrimaryResident.role === 'OWNER' ? 'HOME OWNER' : 'HOME TENANT'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#B91C1C', letterSpacing: '0.02em' }}>
                            📞 Phone: {checkPrimaryResident.phone || 'Phone Not Registered'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {checkPrimaryResident.phone && (() => {
                        const rawPhone = String(checkPrimaryResident.phone).replace(/\D/g, '');
                        const waNumber = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                        const visitLabel = activeCheckCfg.label || 'Visitor';
                        const homeNum = activeCheckHome?.home_number || '';
                        const msgText = `Hello ${checkPrimaryResident.full_name}, Security at the gate regarding entry for Home ${homeNum} (${visitLabel}). Please provide approval.`;

                        return (
                          <>
                            <a
                              href={`tel:${checkPrimaryResident.phone}`}
                              className="btn"
                              style={{
                                background: '#DC2626',
                                color: '#FFFFFF',
                                padding: '10px 18px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textDecoration: 'none',
                                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                              }}
                            >
                              <PhoneCall size={16} /> Call {checkPrimaryResident.role === 'OWNER' ? 'Owner' : 'Tenant'} ({checkPrimaryResident.phone})
                            </a>

                            <a
                              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(msgText)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn"
                              style={{
                                background: '#25D366',
                                color: '#FFFFFF',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textDecoration: 'none',
                                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                              }}
                              title={`Chat on WhatsApp with ${checkPrimaryResident.full_name}`}
                            >
                              <MessageSquare size={16} /> WhatsApp Chat
                            </a>

                            <a
                              href={`sms:${checkPrimaryResident.phone}?body=${encodeURIComponent(msgText)}`}
                              className="btn"
                              style={{
                                background: '#4B5563',
                                color: '#FFFFFF',
                                padding: '10px 16px',
                                borderRadius: '10px',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textDecoration: 'none',
                              }}
                              title={`Send SMS to ${checkPrimaryResident.full_name}`}
                            >
                              <Send size={15} /> Send SMS
                            </a>

                            <button
                              type="button"
                              onClick={() => handleCopyPhone(checkPrimaryResident.phone)}
                              className="btn btn-outline"
                              style={{
                                padding: '9px 14px',
                                fontSize: '0.82rem',
                                borderColor: '#F87171',
                                color: '#B91C1C',
                                background: '#FFF5F5',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              {copiedPhone === checkPrimaryResident.phone ? (
                                <>
                                  <CheckCheck size={14} color="#059669" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={14} /> Copy Phone
                                </>
                              )}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: '#7F1D1D', fontStyle: 'italic', padding: '10px', background: '#FFFFFF', borderRadius: '8px' }}>
                    No registered owner or tenant found for Home {activeCheckHome?.home_number}. Please contact Society Office.
                  </div>
                )}

                {/* Alternate residents if any */}
                {alternateResidents.length > 0 && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #FCA5A5' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#7F1D1D', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Alternate Residents / Family Members for Home {activeCheckHome?.home_number}:
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {alternateResidents.map((alt) => (
                        <div
                          key={alt.user_id || alt.full_name}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #FECACA',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.8rem',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#1F2937' }}>{alt.full_name}</span>
                          <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>({alt.relationship || alt.role})</span>
                          {alt.phone && (
                            <a
                              href={`tel:${alt.phone}`}
                              style={{
                                color: '#DC2626',
                                fontWeight: 700,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Phone size={12} /> {alt.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Home-wise Permissions Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading home permissions...</p>
        </div>
      ) : filteredHomes.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <Shield size={40} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
          <h3>No Homes Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
            {searchTerm ? 'No homes match your search criteria.' : 'No active homes found.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          {filteredHomes.map((homeItem) => {
            const isUserHome = homeItem.residents?.some((r) => r.user_id === user?.id);
            const canEdit = canEditHome(homeItem);
            const isHomeUpdating = updatingHomeId === homeItem.home_id;

            return (
              <div
                key={homeItem.home_id}
                id={`home-permission-card-${homeItem.home_id}`}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  border: isUserHome ? '2px solid var(--color-clay)' : '1.5px solid var(--color-sand)',
                  padding: '26px 28px',
                  boxShadow: isUserHome
                    ? '0 10px 30px rgba(196, 154, 108, 0.12), 0 2px 8px rgba(64, 54, 48, 0.04)'
                    : '0 8px 24px rgba(64, 54, 48, 0.05), 0 2px 6px rgba(64, 54, 48, 0.03)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}
              >
                {/* Home Card Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '20px',
                    paddingBottom: '18px',
                    borderBottom: '1.5px solid #F0E8DC',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(196, 154, 108, 0.2) 0%, rgba(214, 194, 161, 0.3) 100%)',
                        border: '1.5px solid rgba(196, 154, 108, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-clay)',
                        boxShadow: '0 4px 12px rgba(196, 154, 108, 0.15)',
                        flexShrink: 0,
                      }}
                    >
                      <Home size={28} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--color-dark-brown)', letterSpacing: '-0.02em' }}>
                          Home {homeItem.home_number}
                        </h2>
                        {homeItem.building_or_wing && (
                          <span
                            style={{
                              background: '#FAF5ED',
                              color: 'var(--color-dark-brown)',
                              border: '1px solid var(--color-sand)',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '20px',
                            }}
                          >
                            {homeItem.building_or_wing}
                          </span>
                        )}
                        {homeItem.flat_number && homeItem.flat_number !== homeItem.home_number && (
                          <span
                            style={{
                              background: '#FAF5ED',
                              color: 'var(--color-dark-brown)',
                              border: '1px solid var(--color-sand)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              padding: '3px 10px',
                              borderRadius: '20px',
                            }}
                          >
                            Flat {homeItem.flat_number}
                          </span>
                        )}

                      </div>

                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: '#6E5D53',
                          marginTop: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={13} color="var(--color-clay)" />
                          Society: <strong>{homeItem.society_name || 'Society'}</strong>
                        </span>
                        {homeItem.last_updated_by_name && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Clock size={13} color="var(--color-clay)" />
                            Last modified by: <strong>{homeItem.last_updated_by_name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>


                </div>

                {/* Resident Roster Section */}
                <div
                  style={{
                    marginBottom: '22px',
                    background: '#FAF6EE',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    border: '1px solid #EBE3D7',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: 'var(--color-dark-brown)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Users size={14} color="var(--color-clay)" />
                    <span>Registered Residents of Home {homeItem.home_number} (Shared Gate Permissions):</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {homeItem.residents && homeItem.residents.length > 0 ? (
                      homeItem.residents.map((res) => {
                        const isSelf = res.user_id === user?.id;
                        const isOwner = res.role === 'OWNER' || res.resident_type === 'OWNER';
                        return (
                          <div
                            key={res.user_id || res.full_name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 12px',
                              borderRadius: '12px',
                              background: isSelf ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)',
                              border: isSelf
                                ? '1.5px solid var(--color-clay)'
                                : '1px solid #E2D9CF',
                              boxShadow: isSelf ? '0 2px 6px rgba(196, 154, 108, 0.15)' : 'none',
                              fontSize: '0.82rem',
                            }}
                          >
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: isOwner ? 'var(--color-clay)' : 'var(--color-fern-green)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                              }}
                            >
                              {res.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>

                            <span style={{ fontWeight: 700, color: isSelf ? 'var(--color-clay)' : 'var(--color-dark-brown)' }}>
                              {res.full_name} {isSelf && '(You)'}
                            </span>

                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: isOwner ? 'var(--color-clay)' : 'var(--color-fern-green)',
                                background: isOwner ? 'rgba(196, 154, 108, 0.12)' : 'rgba(107, 142, 90, 0.12)',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                              }}
                            >
                              {res.relationship ? `Family (${res.relationship})` : res.user_label || res.role}
                            </span>

                            {res.phone && (
                              <a
                                href={`tel:${res.phone}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#0284c7',
                                  background: 'rgba(2, 132, 199, 0.09)',
                                  border: '1px solid rgba(2, 132, 199, 0.25)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  textDecoration: 'none',
                                }}
                                title={`Click to call ${res.full_name}`}
                              >
                                <Phone size={11} />
                                <span>{res.phone}</span>
                              </a>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#8E7C70', fontStyle: 'italic' }}>
                        No residents registered yet.
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 Permission Matrix Items for this Home */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {PERMISSION_CONFIG.map((cfg) => {
                    const Icon = cfg.icon;
                    // Default permission is YES (true)
                    const isEnabled = homeItem[cfg.key] !== undefined && homeItem[cfg.key] !== null
                      ? Boolean(homeItem[cfg.key])
                      : true;
                    const isItemUpdating = isHomeUpdating && updatingPermKey === cfg.key;

                    return (
                      <div
                        key={cfg.key}
                        id={`perm-card-${homeItem.home_number}-${cfg.type.toLowerCase()}`}
                        style={{
                          background: isEnabled ? '#FFFFFF' : '#FAFAF8',
                          borderRadius: '20px',
                          border: isEnabled
                            ? '1.5px solid rgba(16, 185, 129, 0.45)'
                            : '1.5px solid #E5DCD0',
                          padding: '22px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '16px',
                          boxShadow: isEnabled
                            ? '0 6px 18px rgba(16, 185, 129, 0.1)'
                            : '0 4px 14px rgba(64, 54, 48, 0.04)',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        {/* Top row: 1. ICON on Left & 4. TOGGLE ICON on Right */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {/* 1. ICON */}
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '14px',
                              background: cfg.bg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: cfg.color,
                              border: `1.5px solid ${cfg.color}33`,
                              boxShadow: `0 2px 8px ${cfg.color}22`,
                            }}
                          >
                            <Icon size={22} />
                          </div>

                          {/* 4. TOGGLE ICON / SWITCH (Default: YES) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                color: isEnabled ? '#059669' : '#DC2626',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {isEnabled ? 'YES' : 'NO'}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              id={`toggle-btn-perm-${cfg.type.toLowerCase()}-home-${homeItem.home_number}`}
                              aria-checked={isEnabled}
                              disabled={!canEdit || isItemUpdating}
                              onClick={() => {
                                if (canEdit && !isItemUpdating) {
                                  handleTogglePermission(homeItem, cfg.key, !isEnabled);
                                }
                              }}
                              style={{
                                width: '52px',
                                height: '28px',
                                borderRadius: '28px',
                                background: isEnabled
                                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                  : '#D1C7BA',
                                position: 'relative',
                                border: 'none',
                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isEnabled
                                  ? '0 2px 8px rgba(16, 185, 129, 0.4), inset 0 1px 2px rgba(255,255,255,0.3)'
                                  : 'inset 0 1px 3px rgba(0, 0, 0, 0.15)',
                                opacity: !canEdit ? 0.6 : 1,
                                flexShrink: 0,
                              }}
                              title={canEdit ? (isEnabled ? 'Toggle to Block (Set to NO)' : 'Toggle to Allow (Set to YES)') : 'View only'}
                            >
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: '#FFFFFF',
                                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
                                  transform: isEnabled ? 'translateX(24px)' : 'translateX(0px)',
                                  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {isItemUpdating ? (
                                  <RefreshCw size={11} className="animate-spin" color="var(--color-clay)" />
                                ) : isEnabled ? (
                                  <Check size={12} strokeWidth={3} color="#059669" />
                                ) : (
                                  <X size={12} strokeWidth={3} color="#dc2626" />
                                )}
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Middle & Bottom: 2. TITLE & 3. DESCRIPTION */}
                        <div>
                          <h3
                            style={{
                              fontWeight: 800,
                              fontSize: '1.02rem',
                              color: 'var(--color-dark-brown)',
                              margin: '0 0 6px 0',
                              lineHeight: 1.3,
                            }}
                          >
                            {cfg.title}
                          </h3>
                          <p
                            style={{
                              fontSize: '0.82rem',
                              color: '#7A6B61',
                              lineHeight: 1.45,
                              margin: 0,
                            }}
                          >
                            {cfg.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
}
