import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Truck,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Home,
  Phone,
  RefreshCw,
  X,
  Building,
  UserCheck,
  Check,
  Shield,
  KeyRound,
  DoorOpen,
  MapPin,
  Car,
  LogIn,
  LogOut,

  ArrowRight,
  ShieldAlert,
  Calendar,
  FileText,
  PhoneCall,
  User,
  AlertTriangle,
  BadgeAlert,
  HelpCircle,
  Plus,
  Filter,
  Tag,
  Zap,
} from 'lucide-react';
import { courierDeliveryApi } from '../api/courierDeliveryApi';
import { societyApi } from '../api/societyApi';
import { gateApi } from '../api/gateApi';
import { useAuthStore } from '../store/authStore';

export default function CourierDeliveryPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isSecurity = user?.role === 'SECURITY';
  const isResident = ['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user?.role);

  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type');

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [societyHomes, setSocietyHomes] = useState([]);
  const [assignedGateInfo, setAssignedGateInfo] = useState(null);

  // Active Type Selection: 'COURIER' or 'DELIVERY'
  const [activeType, setActiveType] = useState(typeParam === 'COURIER' ? 'COURIER' : 'DELIVERY');

  // Modal for Admin Manual Entry / Security Check-in
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  // Home search state
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [searchedHomes, setSearchedHomes] = useState([]);
  const [searchingHomes, setSearchingHomes] = useState(false);
  const [selectedHome, setSelectedHome] = useState(null);
  const [selectedResidentUser, setSelectedResidentUser] = useState(null);

  // Permission Check state
  const [permissionCheck, setPermissionCheck] = useState({
    loading: false,
    data: null,
    error: null,
  });

  // Call Resident Intercom State
  const [callingResident, setCallingResident] = useState(false);
  const [callResidentResult, setCallResidentResult] = useState(null);

  // Create Form State (Person/Company name, Phone, Home, Type, Vehicle, Notes)
  const [entryForm, setEntryForm] = useState({
    company_or_person_name: '',
    phone: '',
    vehicle_number: '',
    notes: '',
  });

  // Quick Company Presets
  const deliveryCompanies = ['Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Amazon', 'Flipkart', 'Instamart'];
  const courierCompanies = ['BlueDart', 'FedEx', 'Delhivery', 'DTDC', 'India Post', 'DHL', 'Trackon'];

  // History Filter State
  const [historyFilterType, setHistoryFilterType] = useState(
    typeParam === 'COURIER' ? 'COURIER' : typeParam === 'DELIVERY' ? 'DELIVERY' : 'ALL'
  );
  const [historyFilterStatus, setHistoryFilterStatus] = useState('ALL'); // ALL, ENTERED, EXITED, PENDING, APPROVED, REJECTED
  const [historyFilterPartner, setHistoryFilterPartner] = useState('ALL'); // ALL or partner name
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Sync activeType & historyFilterType with URL search parameter
  useEffect(() => {
    if (typeParam === 'COURIER' || typeParam === 'DELIVERY') {
      setActiveType(typeParam);
      setHistoryFilterType(typeParam);
    } else if (isSecurity && !typeParam) {
      setSearchParams({ type: 'DELIVERY' }, { replace: true });
    }
  }, [typeParam, isSecurity]);

  const handleSwitchType = (newType) => {
    setActiveType(newType);
    setHistoryFilterType(newType);
    setSearchParams({ type: newType });
  };

  // Notifications
  const [notification, setNotification] = useState(null);
  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // When type changes, re-evaluate permission for current home
  useEffect(() => {
    if (selectedHome) {
      checkHomePermission(selectedHome.id || selectedHome.home_id, activeType, selectedResidentUser?.user_id);
    }
  }, [activeType]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const promises = [
        courierDeliveryApi.getHistory().catch(() => ({ data: { entries: [] } })),
        societyApi.getAllHomes().catch(() => ({ data: { homes: [] } })),
      ];

      if (isSecurity || isAdmin) {
        promises.push(
          gateApi.getMyAssignedGate().catch(() => ({ data: { has_assignment: false, gate: null } }))
        );
      } else {
        promises.push(Promise.resolve({ data: { has_assignment: false, gate: null } }));
      }

      const [historyRes, homesRes, gateRes] = await Promise.all(promises);

      setHistory(historyRes.data?.entries || []);
      setSocietyHomes(homesRes.data?.homes || []);
      setAssignedGateInfo(gateRes.data);
    } catch (err) {
      console.error('Initialization error:', err);
      showNotice('error', 'Failed to load courier and delivery data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchHomes = async (query) => {
    setHomeSearchQuery(query);
    if (!query.trim()) {
      setSearchedHomes([]);
      return;
    }
    setSearchingHomes(true);
    try {
      const res = await courierDeliveryApi.searchHomes(query);
      setSearchedHomes(res.data?.homes || []);
    } catch (err) {
      console.error('Home search error:', err);
    } finally {
      setSearchingHomes(false);
    }
  };

  const checkHomePermission = async (homeId, type, residentUserId = null) => {
    setPermissionCheck({ loading: true, data: null, error: null });
    setCallResidentResult(null);
    try {
      const res = await courierDeliveryApi.checkPermission(homeId, {
        type,
        resident_user_id: residentUserId || undefined,
      });
      setPermissionCheck({ loading: false, data: res.data, error: null });
      if (res.data?.selected_resident) {
        setSelectedResidentUser(res.data.selected_resident);
      }
    } catch (err) {
      setPermissionCheck({
        loading: false,
        data: null,
        error: err.message || 'Permission check failed',
      });
    }
  };

  const handleSelectHome = (home) => {
    setSelectedHome(home);
    setSearchedHomes([]);
    setHomeSearchQuery(`Home ${home.home_number || home.unit_number}`);
    setSelectedResidentUser(null);
    checkHomePermission(home.id || home.home_id, activeType);
  };

  const handleSelectResident = (resident) => {
    setSelectedResidentUser(resident);
    if (selectedHome) {
      checkHomePermission(selectedHome.id || selectedHome.home_id, activeType, resident.user_id);
    }
  };

  // Security executes [ Call Resident ]
  const handleCallResident = async () => {
    if (!selectedHome || !selectedResidentUser) {
      showNotice('error', 'Please select a home and resident first.');
      return;
    }

    setCallingResident(true);
    try {
      const res = await courierDeliveryApi.callResident({
        home_id: selectedHome.id || selectedHome.home_id,
        resident_user_id: selectedResidentUser.user_id,
        type: activeType,
        company_or_person_name: entryForm.company_or_person_name || 'Delivery / Courier Representative',
        reason: `${activeType} arrived at gate for Home ${selectedHome.home_number || selectedHome.unit_number} (Permission = NO)`,
      });

      setCallResidentResult(res.data);
      showNotice('success', `Call initiated with ${res.data.resident_name}. Contact phone authorized for gate exception.`);
    } catch (err) {
      showNotice('error', err.response?.data?.message || err.message || 'Failed to call resident.');
    } finally {
      setCallingResident(false);
    }
  };

  // Create Entry Record
  const handleCreateRecord = async (recordEntryNow = false) => {
    if (!selectedHome) {
      showNotice('error', 'Please select the target Home number.');
      return;
    }
    if (!entryForm.company_or_person_name.trim()) {
      showNotice('error', 'Person or company name is required.');
      return;
    }
    if (!entryForm.phone.trim()) {
      showNotice('error', 'Contact phone number is required.');
      return;
    }

    try {
      const payload = {
        home_id: selectedHome.id || selectedHome.home_id,
        type: activeType,
        company_or_person_name: entryForm.company_or_person_name.trim(),
        phone: entryForm.phone.trim(),
        vehicle_number: entryForm.vehicle_number ? entryForm.vehicle_number.trim() : null,
        resident_user_id: selectedResidentUser?.user_id || null,
        gate_id: assignedGateInfo?.gate?.id || null,
        record_entry_now: recordEntryNow,
        status: recordEntryNow ? 'ENTERED' : 'PENDING',
        notes: entryForm.notes || null,
      };

      const res = await courierDeliveryApi.createEntry(payload);
      showNotice('success', res.message || 'Entry recorded successfully.');

      // Reset form
      setEntryForm({
        company_or_person_name: '',
        phone: '',
        vehicle_number: '',
        notes: '',
      });
      setSelectedHome(null);
      setSelectedResidentUser(null);
      setPermissionCheck({ loading: false, data: null, error: null });
      setCallResidentResult(null);
      setHomeSearchQuery('');
      setIsCheckInModalOpen(false);

      // Refresh history
      const historyRes = await courierDeliveryApi.getHistory();
      setHistory(historyRes.data?.entries || []);
    } catch (err) {
      showNotice('error', err.response?.data?.message || err.message || 'Failed to record entry.');
    }
  };

  // Resident Approves / Rejects
  const handleApprovalResponse = async (id, decision) => {
    try {
      const res = await courierDeliveryApi.respondToApproval(id, decision);
      showNotice(decision === 'APPROVE' ? 'success' : 'warning', res.message || 'Response recorded.');
      const historyRes = await courierDeliveryApi.getHistory();
      setHistory(historyRes.data?.entries || []);
    } catch (err) {
      showNotice('error', err.response?.data?.message || err.message || 'Action failed.');
    }
  };

  // Record Entry
  const handleRecordGateEntry = async (id) => {
    try {
      const res = await courierDeliveryApi.recordEntry(id, {
        gate_id: assignedGateInfo?.gate?.id || null,
      });
      showNotice('success', res.message || 'Gate entry recorded.');
      const historyRes = await courierDeliveryApi.getHistory();
      setHistory(historyRes.data?.entries || []);
    } catch (err) {
      showNotice('error', err.response?.data?.message || err.message || 'Failed to record entry.');
    }
  };

  // Record Exit
  const handleRecordGateExit = async (id) => {
    try {
      const res = await courierDeliveryApi.recordExit(id);
      showNotice('success', res.message || 'Gate departure logged.');
      const historyRes = await courierDeliveryApi.getHistory();
      setHistory(historyRes.data?.entries || []);
    } catch (err) {
      showNotice('error', err.response?.data?.message || err.message || 'Failed to record exit.');
    }
  };

  // Derived: Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Type filter
      if (historyFilterType !== 'ALL' && item.type !== historyFilterType) return false;
      // Status filter
      if (historyFilterStatus !== 'ALL' && item.status !== historyFilterStatus) return false;
      // Partner filter
      if (historyFilterPartner !== 'ALL') {
        const partnerName = item.company_or_person_name || '';
        if (!partnerName.toLowerCase().includes(historyFilterPartner.toLowerCase())) {
          return false;
        }
      }
      // Search filter
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const matchesName = (item.company_or_person_name || '').toLowerCase().includes(q);
        const matchesPhone = (item.phone || '').toLowerCase().includes(q);
        const matchesVehicle = (item.vehicle_number || '').toLowerCase().includes(q);
        const matchesHome = String(item.home_number || '').toLowerCase().includes(q);
        const matchesResident = (item.resident_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesVehicle && !matchesHome && !matchesResident) return false;
      }
      return true;
    });
  }, [history, historyFilterType, historyFilterStatus, historyFilterPartner, historySearchQuery]);

  // Derived: Pending items for approval
  const pendingApprovals = useMemo(() => {
    return history.filter((item) => item.status === 'PENDING');
  }, [history]);

  // Derived: Currently on premises (ENTERED status)
  const insideRecords = useMemo(() => {
    return history.filter((item) => item.status === 'ENTERED');
  }, [history]);

  // Derived: Today's arrivals count
  const todayArrivalsCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return history.filter((item) => {
      const itemDate = item.entry_time ? item.entry_time.slice(0, 10) : item.created_at ? item.created_at.slice(0, 10) : '';
      return itemDate === todayStr;
    }).length;
  }, [history]);

  // Derived: Delivery vs Courier counts
  const totalDeliveries = history.filter((item) => item.type === 'DELIVERY').length;
  const totalCouriers = history.filter((item) => item.type === 'COURIER').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
            color: notification.type === 'success' ? '#34d399' : '#f87171',
            backdropFilter: 'blur(16px)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--color-white)',
          border: '1px solid var(--color-sand)',
          boxShadow: '0 4px 20px rgba(196, 154, 108, 0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '220px',
            height: '220px',
            background: 'radial-gradient(circle, rgba(196, 154, 108, 0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(107, 142, 90, 0.12)',
                  color: 'var(--color-fern-green)',
                  border: '1px solid rgba(107, 142, 90, 0.3)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Truck size={13} /> Society Gate Logistics & Deliveries
              </span>
              <span
                style={{
                  background: 'rgba(196, 154, 108, 0.15)',
                  color: 'var(--color-clay)',
                  border: '1px solid var(--color-sand)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {isAdmin ? 'Admin Logistics Console' : isSecurity ? 'Gate Guard Console' : 'Resident Portal'}
              </span>
              {isSecurity && (
                <span
                  style={{
                    background: 'rgba(135, 206, 235, 0.25)',
                    color: '#0284c7',
                    border: '1px solid rgba(135, 206, 235, 0.4)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <DoorOpen size={13} /> {assignedGateInfo?.gate?.gate_name || assignedGateInfo?.gate_name || 'Gate 1 (Main Entrance)'}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.95rem', fontWeight: 800, margin: '4px 0 8px 0', letterSpacing: '-0.02em', color: '#403630' }}>
              {activeType === 'COURIER' ? 'Courier & Parcel Management' : 'Food & Grocery Delivery Management'}
            </h1>
            <p style={{ color: 'var(--color-text)', fontSize: '0.95rem', maxWidth: '720px', lineHeight: 1.5 }}>
              {activeType === 'COURIER'
                ? 'Track e-commerce parcel deliveries, BlueDart/FedEx/Delhivery logistics, resident permission rules, and gate arrivals.'
                : 'Real-time food and grocery delivery tracking (Swiggy, Zomato, Blinkit, Zepto), resident clearances, and gate exit logs.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Quick Refresh */}
            <button
              onClick={fetchInitialData}
              disabled={loading}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
            >
              <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Refresh</span>
            </button>

            {/* Admin or Security Manual Check-in action */}
            <button
              onClick={() => setIsCheckInModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                padding: '10px 18px',
              }}
            >
              <Plus size={18} /> Quick Check-In Modal
            </button>
          </div>
        </div>

        {/* 4 CORE EXECUTIVE METRICS STRIP (Matches Admin standard) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '12px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-card)',
          }}
        >
          <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--color-clay)', textTransform: 'uppercase', fontWeight: 700 }}>Total Deliveries & Couriers</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)', marginTop: '2px' }}>
              {history.length} Movements
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {totalDeliveries} Food/Grocery • {totalCouriers} Parcels
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--color-fern-green)', textTransform: 'uppercase', fontWeight: 700 }}>Today's Gate Arrivals</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-fern-green)', marginTop: '2px' }}>
              {todayArrivalsCount} Today
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Gate deliveries logged today
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.725rem', color: '#0284C7', textTransform: 'uppercase', fontWeight: 700 }}>Active Inside Premises</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284C7', marginTop: '2px' }}>
              {insideRecords.length} Agents Inside
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Delivery agents on society grounds
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.725rem', color: '#B45309', textTransform: 'uppercase', fontWeight: 700 }}>Pending Clearance</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309', marginTop: '2px' }}>
              {pendingApprovals.length} Pending
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Awaiting resident approval
            </div>
          </div>
        </div>
      </div>

      {/* DUAL MODE SELECTOR (Synchronized with left sidebar & URL) */}
      <div
        className="glass-panel"
        style={{
          padding: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-card)',
        }}
      >
        {/* Tab 1: Food & Grocery Delivery */}
        <button
          type="button"
          onClick={() => handleSwitchType('DELIVERY')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            border: activeType === 'DELIVERY' ? '2px solid var(--color-fern-green)' : '1px solid var(--border-card)',
            background:
              activeType === 'DELIVERY'
                ? 'rgba(107, 142, 90, 0.12)'
                : '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeType === 'DELIVERY' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: activeType === 'DELIVERY' ? 'rgba(107, 142, 90, 0.2)' : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeType === 'DELIVERY' ? 'var(--color-fern-green)' : 'var(--text-muted)',
              }}
            >
              <Truck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: activeType === 'DELIVERY' ? 'var(--color-dark-brown)' : 'var(--text-muted)' }}>
                🚚 Food & Grocery Delivery
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Swiggy, Zomato, Blinkit, Zepto, Amazon Fresh & Instamart
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              background: activeType === 'DELIVERY' ? 'rgba(107, 142, 90, 0.2)' : 'var(--bg-tertiary)',
              color: activeType === 'DELIVERY' ? 'var(--color-fern-green)' : 'var(--text-muted)',
            }}
          >
            {totalDeliveries} Orders
          </span>
        </button>

        {/* Tab 2: Parcels & Courier Packets */}
        <button
          type="button"
          onClick={() => handleSwitchType('COURIER')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            border: activeType === 'COURIER' ? '2px solid var(--color-clay)' : '1px solid var(--border-card)',
            background:
              activeType === 'COURIER'
                ? 'rgba(196, 154, 108, 0.15)'
                : '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeType === 'COURIER' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: activeType === 'COURIER' ? 'rgba(196, 154, 108, 0.25)' : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeType === 'COURIER' ? 'var(--color-dark-brown)' : 'var(--text-muted)',
              }}
            >
              <Package size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: activeType === 'COURIER' ? 'var(--color-dark-brown)' : 'var(--text-muted)' }}>
                📦 Parcels & Courier Packets
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                BlueDart, FedEx, Delhivery, DTDC, India Post, DHL
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              background: activeType === 'COURIER' ? 'rgba(196, 154, 108, 0.25)' : 'var(--bg-tertiary)',
              color: activeType === 'COURIER' ? 'var(--color-dark-brown)' : 'var(--text-muted)',
            }}
          >
            {totalCouriers} Parcels
          </span>
        </button>
      </div>

      {/* FAST GATE CHECK-IN STATION (Tailored for Gate Security Watchman) */}
      {isSecurity && (
        <div
          className="glass-panel"
          style={{
            padding: '24px 28px',
            border: activeType === 'COURIER' ? '1px solid var(--color-clay)' : '1px solid var(--color-fern-green)',
            background: '#FFFFFF',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Station Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: activeType === 'COURIER' ? 'rgba(196, 154, 108, 0.25)' : 'rgba(107, 142, 90, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: activeType === 'COURIER' ? 'var(--color-clay)' : 'var(--color-fern-green)',
                }}
              >
                {activeType === 'COURIER' ? <Package size={22} /> : <Truck size={22} />}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  Fast Gate {activeType === 'COURIER' ? 'Courier & Parcel' : 'Food & Grocery Delivery'} Check-In Station
                </h2>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {activeType === 'COURIER'
                    ? 'Verify parcel recipient home, confirm resident courier permission, and log gate arrival.'
                    : 'Verify destination home, check resident delivery permission, and record gate entry.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  background: 'rgba(196, 154, 108, 0.15)',
                  color: 'var(--color-dark-brown)',
                  border: '1px solid var(--border-card)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <DoorOpen size={13} color="var(--color-clay)" /> {assignedGateInfo?.gate?.gate_name || 'Gate 1 (Main Entrance)'}
              </span>
            </div>
          </div>

          {/* Step 1: Quick Partner Selection Strip */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Step 1: Quick Partner / Provider
              </label>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Click chip to auto-fill</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(activeType === 'DELIVERY'
                ? ['Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Amazon', 'Flipkart', 'Instamart', "Domino's"]
                : ['BlueDart', 'FedEx', 'Delhivery', 'DTDC', 'India Post', 'DHL', 'Trackon', 'Shadowfax']
              ).map((p) => {
                const isSelected = entryForm.company_or_person_name.toLowerCase().includes(p.toLowerCase());
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setEntryForm((prev) => ({
                        ...prev,
                        company_or_person_name: `${p} ${activeType === 'COURIER' ? 'Courier' : 'Delivery'}`,
                      }))
                    }
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected
                        ? activeType === 'COURIER' ? '1px solid var(--color-clay)' : '1px solid var(--color-fern-green)'
                        : '1px solid var(--border-card)',
                      background: isSelected
                        ? activeType === 'COURIER' ? 'rgba(196, 154, 108, 0.25)' : 'rgba(107, 142, 90, 0.25)'
                        : 'var(--bg-tertiary)',
                      color: isSelected
                        ? 'var(--color-dark-brown)'
                        : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 & Step 3 Grid: Destination Home & Driver Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Destination Home Search & Permission Box */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  Step 2: Destination Home *
                </label>
                {selectedHome && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHome(null);
                      setSelectedResidentUser(null);
                      setHomeSearchQuery('');
                      setPermissionCheck({ loading: false, data: null, error: null });
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear Home
                  </button>
                )}
              </div>

              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={homeSearchQuery}
                  onChange={(e) => handleSearchHomes(e.target.value)}
                  placeholder="Search home no (e.g. 1, 2, 10)..."
                  className="input-field"
                  style={{ paddingLeft: '36px', margin: 0, background: '#FFFFFF' }}
                />
                {searchingHomes && (
                  <RefreshCw size={14} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-fern-green)' }} />
                )}
              </div>

              {/* Live searched homes dropdown */}
              {searchedHomes.length > 0 && (
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '6px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {searchedHomes.map((h) => (
                    <div
                      key={h.home_id || h.id}
                      onClick={() => handleSelectHome(h)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.825rem',
                        color: 'var(--text-main)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Home size={14} color="var(--color-clay)" />
                        <span>Home {h.home_number || h.unit_number} ({h.building_or_wing || h.society_name || 'Society'})</span>
                      </div>
                      <span style={{ fontSize: '0.725rem', color: 'var(--color-fern-green)', fontWeight: 700 }}>Select</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Home Residents & Permission Status */}
              {selectedHome && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Select Resident Recipient:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {permissionCheck.data?.residents?.map((res) => {
                      const isSelected = selectedResidentUser?.user_id === res.user_id;
                      const permStatus = activeType === 'COURIER' ? res.courier_permission : res.delivery_permission;
                      const isAllowed = permStatus === 'YES';

                      return (
                        <div
                          key={res.user_id}
                          onClick={() => handleSelectResident(res)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1px solid var(--color-fern-green)' : '1px solid var(--border-card)',
                            background: isSelected ? 'rgba(107, 142, 90, 0.15)' : '#FFFFFF',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div>
                            <strong style={{ color: 'var(--text-heading)' }}>{res.name}</strong>{' '}
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>({res.role})</span>
                            {res.phone && (
                              <span style={{ marginLeft: '6px', fontSize: '0.725rem', color: '#0284c7', fontWeight: 700 }}>
                                📞 {res.phone}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              background: isAllowed ? 'rgba(107, 142, 90, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: isAllowed ? 'var(--color-fern-green)' : '#dc2626',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            {activeType === 'COURIER' ? 'Courier' : 'Delivery'}: {permStatus}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Permission Alert Banner */}
                  {permissionCheck.data && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        marginTop: '4px',
                        background: permissionCheck.data.permission_allowed
                          ? 'rgba(107, 142, 90, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                        border: `1px solid ${permissionCheck.data.permission_allowed
                            ? 'rgba(107, 142, 90, 0.4)'
                            : 'rgba(245, 158, 11, 0.4)'
                          }`,
                        color: permissionCheck.data.permission_allowed ? 'var(--color-fern-green)' : '#b45309',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {permissionCheck.data.permission_allowed ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      <div style={{ flex: 1, fontWeight: 700 }}>
                        <div>
                          {permissionCheck.data.permission_allowed
                            ? `Permission is ALLOWED for Home ${selectedHome.home_number}. Direct Gate Entry Permitted.`
                            : `Permission is RESTRICTED (NO) for Home ${selectedHome.home_number}. Resident clearance required.`}
                        </div>
                        {permissionCheck.data.primary_contact && (
                          <div style={{ marginTop: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            Owner/Tenant: {permissionCheck.data.primary_contact.name} ({permissionCheck.data.primary_contact.role}) • Phone:{' '}
                            <a href={`tel:${permissionCheck.data.primary_contact.phone}`} style={{ color: '#0284c7', fontWeight: 800 }}>
                              📞 {permissionCheck.data.primary_contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Driver & Delivery Information Form */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Step 3: Driver & Entry Details
              </label>

              <div>
                <label className="input-label" style={{ fontSize: '0.75rem' }}>Partner / Company / Agent Name *</label>
                <input
                  type="text"
                  required
                  value={entryForm.company_or_person_name}
                  onChange={(e) => setEntryForm({ ...entryForm, company_or_person_name: e.target.value })}
                  placeholder={activeType === 'COURIER' ? 'e.g. BlueDart Courier, FedEx' : 'e.g. Swiggy Rahul, Zomato'}
                  className="input-field"
                  style={{ margin: 0 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Driver Phone *</label>
                  <input
                    type="tel"
                    required
                    value={entryForm.phone}
                    onChange={(e) => setEntryForm({ ...entryForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="input-field"
                    style={{ margin: 0 }}
                  />
                </div>

                <div>
                  <label className="input-label" style={{ fontSize: '0.75rem' }}>Vehicle Number</label>
                  <input
                    type="text"
                    value={entryForm.vehicle_number}
                    onChange={(e) => setEntryForm({ ...entryForm, vehicle_number: e.target.value.toUpperCase() })}
                    placeholder="MH-02-CB-1234"
                    className="input-field"
                    style={{ margin: 0 }}
                  />
                </div>
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '0.75rem' }}>Package Tracking / Notes</label>
                <input
                  type="text"
                  value={entryForm.notes}
                  onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                  placeholder={activeType === 'COURIER' ? 'AWB Tracking / Box count' : 'Food bag / Grocery order #'}
                  className="input-field"
                  style={{ margin: 0 }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', flexWrap: 'wrap' }}>
                {permissionCheck.data?.permission_allowed ? (
                  <button
                    type="button"
                    onClick={() => handleCreateRecord(true)}
                    disabled={!selectedHome || !entryForm.company_or_person_name || !entryForm.phone}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <Check size={16} /> Allow & Record Gate Entry
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleCallResident}
                      disabled={!selectedHome || callingResident}
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#38bdf8',
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <PhoneCall size={15} /> {callingResident ? 'Dialing...' : 'Call Resident'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCreateRecord(false)}
                      disabled={!selectedHome || !entryForm.company_or_person_name || !entryForm.phone}
                      className="btn btn-secondary"
                      style={{
                        flex: 1,
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        color: '#fbbf24',
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Clock size={15} /> Request Clearance
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCreateRecord(true)}
                      disabled={!selectedHome || !entryForm.company_or_person_name || !entryForm.phone}
                      className="btn btn-outline"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-muted)',
                        fontSize: '0.78rem',
                        padding: '10px',
                      }}
                    >
                      Override
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AGENTS CURRENTLY INSIDE PREMISES (Live tracking with 1-click Exit for Security) */}
      {isSecurity && insideRecords.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '20px 24px',
            border: '1px solid var(--border-card)',
            background: '#FFFFFF',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284C7',
                }}
              >
                <LogIn size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  Agents Currently Inside Society ({insideRecords.length})
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Delivery drivers & couriers on premises. Tap "Record Gate Exit" when they depart through the gate.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {insideRecords.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      background: item.type === 'COURIER' ? 'rgba(196, 154, 108, 0.2)' : 'rgba(107, 142, 90, 0.2)',
                      color: item.type === 'COURIER' ? 'var(--color-clay)' : 'var(--color-fern-green)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.type}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284C7' }}>
                    Home {item.home_number}
                  </span>
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                    {item.company_or_person_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Entered: {item.entry_time ? new Date(item.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'} • Phone: {item.phone}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRecordGateExit(item.id)}
                  className="btn btn-secondary"
                  style={{
                    marginTop: '4px',
                    padding: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <LogOut size={14} /> Record Gate Exit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK DELIVERY PARTNERS BREAKDOWN STRIP */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          border: '1px solid var(--border-card)',
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Tag size={13} /> Partner Filter:
        </span>

        <button
          onClick={() => setHistoryFilterPartner('ALL')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            border: historyFilterPartner === 'ALL' ? '1px solid var(--color-clay)' : '1px solid var(--border-card)',
            background: historyFilterPartner === 'ALL' ? 'rgba(196, 154, 108, 0.2)' : '#FFFFFF',
            color: historyFilterPartner === 'ALL' ? 'var(--color-dark-brown)' : 'var(--text-muted)',
          }}
        >
          All Partners ({history.length})
        </button>

        {['Swiggy', 'Zomato', 'Blinkit', 'Zepto', 'Amazon', 'Flipkart', 'BlueDart', 'Delhivery'].map((p) => {
          const isSelected = historyFilterPartner.toLowerCase() === p.toLowerCase();
          const count = history.filter((h) => (h.company_or_person_name || '').toLowerCase().includes(p.toLowerCase())).length;

          return (
            <button
              key={p}
              onClick={() => setHistoryFilterPartner(p)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: isSelected ? '1px solid var(--color-fern-green)' : '1px solid var(--border-card)',
                background: isSelected ? 'rgba(107, 142, 90, 0.2)' : '#FFFFFF',
                color: isSelected ? 'var(--color-fern-green)' : 'var(--text-muted)',
              }}
            >
              {p} ({count})
            </button>
          );
        })}
      </div>

      {/* PENDING APPROVALS ALERT CARD (Prominently alerts Admin & Residents) */}
      {pendingApprovals.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '20px 24px',
            border: '1px solid var(--border-card)',
            background: '#FFFFFF',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#b45309',
                }}
              >
                <Clock size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>
                  Deliveries Awaiting Resident Clearance ({pendingApprovals.length})
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Delivery agents currently waiting at the gate due to resident permission rules.
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {pendingApprovals.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      background: item.type === 'COURIER' ? 'rgba(196, 154, 108, 0.2)' : 'rgba(107, 142, 90, 0.2)',
                      color: item.type === 'COURIER' ? 'var(--color-clay)' : 'var(--color-fern-green)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.type}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284C7' }}>
                    Home {item.home_number}
                  </span>
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-heading)' }}>
                    {item.company_or_person_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    Phone: {item.phone}
                  </div>
                  {item.resident_name && (
                    <div style={{ fontSize: '0.78rem', color: '#b45309', marginTop: '2px' }}>
                      Recipient: <strong>{item.resident_name}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleApprovalResponse(item.id, 'APPROVE')}
                    className="btn btn-primary"
                    style={{
                      background: 'rgba(107, 142, 90, 0.15)',
                      border: '1px solid var(--color-fern-green)',
                      color: 'var(--color-fern-green)',
                      padding: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    <Check size={14} /> Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprovalResponse(item.id, 'REJECT')}
                    className="btn btn-danger"
                    style={{
                      padding: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    <X size={14} /> Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLETE GATE LOGS & AUDIT TRAIL TABLE */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-heading)' }}>Complete Gate Delivery & Courier Logs</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Full audit trail of all parcel and food deliveries, gate in/out timestamps, and resident clearances.
            </div>
          </div>

          {/* Type Tabs */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
            {['ALL', 'DELIVERY', 'COURIER'].map((typeKey) => (
              <button
                key={typeKey}
                onClick={() => setHistoryFilterType(typeKey)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: historyFilterType === typeKey ? 'var(--color-clay)' : 'transparent',
                  color: historyFilterType === typeKey ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {typeKey === 'ALL' ? 'All Movements' : typeKey === 'DELIVERY' ? 'Food / Groceries' : 'Parcels / Courier'}
              </button>
            ))}
          </div>
        </div>

        {/* Filter & Search Strip */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['ALL', 'ENTERED', 'EXITED', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setHistoryFilterStatus(st)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: historyFilterStatus === st ? '1px solid var(--color-fern-green)' : '1px solid var(--border-card)',
                  background: historyFilterStatus === st ? 'rgba(107, 142, 90, 0.2)' : '#FFFFFF',
                  color: historyFilterStatus === st ? 'var(--color-fern-green)' : 'var(--text-muted)',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Search partner (Swiggy, Amazon), home no, driver phone..."
              className="input-field"
              style={{ paddingLeft: '36px', height: '36px', fontSize: '0.825rem', margin: 0, background: '#FFFFFF' }}
            />
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Type</th>
                <th style={{ padding: '12px 14px' }}>Company / Delivery Partner</th>
                <th style={{ padding: '12px 14px' }}>Destination Home</th>
                <th style={{ padding: '12px 14px' }}>Driver Phone</th>
                <th style={{ padding: '12px 14px' }}>Vehicle</th>
                <th style={{ padding: '12px 14px' }}>Gate Entry</th>
                <th style={{ padding: '12px 14px' }}>Gate Exit</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                {(isSecurity || isAdmin) && <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No courier or delivery records matching current filter.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    {/* Type Badge */}
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          background: row.type === 'COURIER' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: row.type === 'COURIER' ? '#818cf8' : '#34d399',
                          border: `1px solid ${row.type === 'COURIER' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {row.type === 'COURIER' ? <Package size={12} /> : <Truck size={12} />}
                        {row.type}
                      </span>
                    </td>

                    {/* Person / Company */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.company_or_person_name}</div>
                      {row.notes && <div style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '2px' }}>{row.notes}</div>}
                    </td>

                    {/* Destination Home */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Home size={14} color="#38bdf8" />
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Home {row.home_number}</span>
                      </div>
                      {row.resident_name && (
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          For: {row.resident_name}
                        </div>
                      )}
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {row.phone}
                    </td>

                    {/* Vehicle */}
                    <td style={{ padding: '12px 14px' }}>
                      {row.vehicle_number ? (
                        <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'monospace' }}>
                          {row.vehicle_number}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)' }}>—</span>
                      )}
                    </td>

                    {/* Entry Time */}
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {row.entry_time ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {new Date(row.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: '0.7rem' }}>{new Date(row.entry_time).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        <span style={{ fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--text-dim)' }}>Pending Entry</span>
                      )}
                    </td>

                    {/* Exit Time */}
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {row.exit_time ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {new Date(row.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: '0.7rem' }}>{new Date(row.exit_time).toLocaleDateString()}</div>
                        </div>
                      ) : row.status === 'ENTERED' ? (
                        <span style={{ color: '#34d399', fontWeight: 600, fontSize: '0.75rem' }}>Active Inside</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          background:
                            row.status === 'ENTERED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : row.status === 'APPROVED'
                                ? 'rgba(6, 182, 212, 0.15)'
                                : row.status === 'EXITED'
                                  ? 'rgba(148, 163, 184, 0.15)'
                                  : row.status === 'REJECTED'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'rgba(245, 158, 11, 0.15)',
                          color:
                            row.status === 'ENTERED'
                              ? '#34d399'
                              : row.status === 'APPROVED'
                                ? '#22d3ee'
                                : row.status === 'EXITED'
                                  ? '#94a3b8'
                                  : row.status === 'REJECTED'
                                    ? '#f87171'
                                    : '#fbbf24',
                          border: `1px solid ${row.status === 'ENTERED'
                              ? 'rgba(16, 185, 129, 0.3)'
                              : row.status === 'APPROVED'
                                ? 'rgba(6, 182, 212, 0.3)'
                                : row.status === 'EXITED'
                                  ? 'rgba(148, 163, 184, 0.3)'
                                  : row.status === 'REJECTED'
                                    ? 'rgba(239, 68, 68, 0.3)'
                                    : 'rgba(245, 158, 11, 0.3)'
                            }`,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                        }}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* Actions */}
                    {(isSecurity || isAdmin) && (
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        {row.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => handleRecordGateEntry(row.id)}
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          >
                            Record Entry
                          </button>
                        )}
                        {row.status === 'ENTERED' && (
                          <button
                            type="button"
                            onClick={() => handleRecordGateExit(row.id)}
                            className="btn btn-secondary"
                            style={{
                              padding: '5px 10px',
                              fontSize: '0.75rem',
                              background: 'rgba(244, 63, 94, 0.15)',
                              borderColor: 'rgba(244, 63, 94, 0.35)',
                              color: '#fda4af',
                            }}
                          >
                            Record Exit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHECK-IN / ENTRY MODAL (Clean popup for Admin or Security) */}
      {isCheckInModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '580px',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--border-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Log Courier or Delivery Entry</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Search destination home, verify resident permission, and log gate arrival
                </div>
              </div>
              <button
                onClick={() => setIsCheckInModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Step 1: Type Selection */}
              <div>
                <label className="input-label">1. Arrival Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveType('DELIVERY')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      border: activeType === 'DELIVERY' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                      background: activeType === 'DELIVERY' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      color: activeType === 'DELIVERY' ? '#34d399' : 'var(--text-muted)',
                    }}
                  >
                    <Truck size={16} /> DELIVERY (Food/Grocery)
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveType('COURIER')}
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      border: activeType === 'COURIER' ? '1px solid #6366f1' : '1px solid var(--border-subtle)',
                      background: activeType === 'COURIER' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      color: activeType === 'COURIER' ? '#818cf8' : 'var(--text-muted)',
                    }}
                  >
                    <Package size={16} /> COURIER (Parcel/Box)
                  </button>
                </div>
              </div>

              {/* Step 2: Search Destination Home */}
              <div>
                <label className="input-label">2. Search Destination Home *</label>
                <div style={{ position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    value={homeSearchQuery}
                    onChange={(e) => handleSearchHomes(e.target.value)}
                    placeholder="Search home no (e.g. 2, 10, 42)..."
                    className="input-field"
                    style={{ paddingLeft: '36px' }}
                  />
                  {searchingHomes && (
                    <RefreshCw size={14} className="animate-spin" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                  )}
                </div>

                {searchedHomes.length > 0 && (
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      marginTop: '6px',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    {searchedHomes.map((h) => (
                      <div
                        key={h.home_id || h.id}
                        onClick={() => handleSelectHome(h)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.825rem',
                          color: 'var(--text-main)',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Home size={14} color="var(--color-clay)" />
                          <span>Home {h.home_number || h.unit_number} ({h.building_or_wing})</span>
                        </div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--color-fern-green)', fontWeight: 700 }}>Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Home & Permission Alert */}
              {selectedHome && (
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-card)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--color-clay)' }}>
                      <Home size={15} />
                      <span>Home {selectedHome.home_number || selectedHome.unit_number}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHome(null);
                        setSelectedResidentUser(null);
                        setPermissionCheck({ loading: false, data: null, error: null });
                      }}
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>

                  {/* Residents for this home */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {permissionCheck.data?.residents?.map((res) => {
                      const isSelected = selectedResidentUser?.user_id === res.user_id;
                      const permStatus = activeType === 'COURIER' ? res.courier_permission : res.delivery_permission;
                      const isAllowed = permStatus === 'YES';

                      return (
                        <div
                          key={res.user_id}
                          onClick={() => handleSelectResident(res)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: isSelected ? '1px solid var(--color-fern-green)' : '1px solid var(--border-card)',
                            background: isSelected ? 'rgba(107, 142, 90, 0.15)' : '#FFFFFF',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div>
                            <strong style={{ color: 'var(--text-heading)' }}>{res.name}</strong>{' '}
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>({res.role})</span>
                          </div>
                          <span
                            style={{
                              background: isAllowed ? 'rgba(107, 142, 90, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: isAllowed ? 'var(--color-fern-green)' : '#dc2626',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            Permission: {permStatus}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Entry Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="input-label" style={{ margin: 0 }}>3. Partner & Agent Details *</label>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(activeType === 'DELIVERY' ? ['Swiggy', 'Zomato', 'Blinkit', 'Amazon'] : ['BlueDart', 'Delhivery', 'DTDC', 'FedEx']).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEntryForm((prev) => ({ ...prev, company_or_person_name: `${p} Agent` }))}
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-card)',
                          borderRadius: '4px',
                          color: 'var(--text-muted)',
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <input
                    type="text"
                    required
                    placeholder="Company or Agent Name (e.g. Swiggy Rahul, BlueDart)"
                    value={entryForm.company_or_person_name}
                    onChange={(e) => setEntryForm({ ...entryForm, company_or_person_name: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <input
                      type="tel"
                      required
                      placeholder="Contact Phone *"
                      value={entryForm.phone}
                      onChange={(e) => setEntryForm({ ...entryForm, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div className="input-group" style={{ margin: 0 }}>
                    <input
                      type="text"
                      placeholder="Vehicle Number (Optional)"
                      value={entryForm.vehicle_number}
                      onChange={(e) => setEntryForm({ ...entryForm, vehicle_number: e.target.value.toUpperCase() })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Package note (e.g. Grocery bags, Amazon parcel)"
                    value={entryForm.notes}
                    onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCheckInModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>

                {permissionCheck.data?.permission_allowed ? (
                  <button
                    type="button"
                    onClick={() => handleCreateRecord(true)}
                    className="btn btn-primary"
                    disabled={!selectedHome || !entryForm.company_or_person_name}
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' }}
                  >
                    Allow & Record Entry
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCreateRecord(false)}
                    className="btn btn-secondary"
                    disabled={!selectedHome || !entryForm.company_or_person_name}
                    style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                  >
                    Request Resident Approval
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
