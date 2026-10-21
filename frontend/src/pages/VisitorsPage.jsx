import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  X,
  Check,
  Car,
  LogIn,
  LogOut,
  DoorOpen,
  UserPlus,
  Package,
  Truck,
  Briefcase,
  Shield,
  UserCheck,
} from 'lucide-react';
import { visitorApi } from '../api/visitorApi';
import { securityApi } from '../api/securityApi';
import { societyApi } from '../api/societyApi';
import { gateApi } from '../api/gateApi';
import { workerApi } from '../api/workerApi';
import { useAuthStore } from '../store/authStore';

export const GATE_VISIT_TYPES = [
  {
    id: 'VISITOR',
    modal: 'VISITOR',
    label: 'Visitor',
    sublabel: 'Guest Check-In',
    image: '/images/visitor.png',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    circleBg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
    border: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.25)',
    glowHover: 'rgba(6, 182, 212, 0.45)',
  },
  {
    id: 'COURIER',
    modal: 'COURIER',
    label: 'Courier',
    sublabel: 'Parcel Drop',
    image: '/images/courier.png',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    circleBg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%)',
    border: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.25)',
    glowHover: 'rgba(245, 158, 11, 0.45)',
  },
  {
    id: 'DELIVERY',
    modal: 'DELIVERY',
    label: 'Delivery',
    sublabel: 'Food & Grocery',
    image: '/images/delivery.png',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    circleBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
    border: '#10b981',
    glow: 'rgba(16, 185, 129, 0.25)',
    glowHover: 'rgba(16, 185, 129, 0.45)',
  },
  {
    id: 'WORKER',
    modal: 'WORKER',
    label: 'Worker',
    sublabel: 'Staff Passcode',
    image: '/images/worker.png',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    circleBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(109, 40, 217, 0.15) 100%)',
    border: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.25)',
    glowHover: 'rgba(139, 92, 246, 0.45)',
  },
  {
    id: 'VEHICLE',
    modal: 'VEHICLE',
    label: 'Vehicle',
    sublabel: 'Barrier Entry',
    image: '/images/vehicle.png',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    circleBg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(29, 78, 216, 0.15) 100%)',
    border: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.25)',
    glowHover: 'rgba(59, 130, 246, 0.45)',
  },
];

export const getGateVisitType = (item) => {
  const purp = (item?.purpose || '').toLowerCase();
  const vType = (item?.visitor_type || '').toLowerCase();
  const name = (item?.visitor_name || item?.name || '').toLowerCase();
  const eType = (item?.entry_type || '').toLowerCase();

  // 1. Courier
  if (purp.includes('courier') || name.includes('courier') || eType === 'courier') {
    return {
      type: 'COURIER',
      label: 'Courier',
      image: '/images/courier.png',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      badgeBg: '#fef3c7',
      rowHighlight: 'rgba(245, 158, 11, 0.04)',
    };
  }

  // 2. Delivery
  if (
    purp.includes('delivery') ||
    vType.includes('delivery') ||
    name.includes('delivery') ||
    name.includes('blinkit') ||
    name.includes('swiggy') ||
    name.includes('zomato') ||
    name.includes('zepto') ||
    name.includes('amazon') ||
    name.includes('flipkart') ||
    eType === 'delivery'
  ) {
    return {
      type: 'DELIVERY',
      label: 'Delivery',
      image: '/images/delivery.png',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      badgeBg: '#d1fae5',
      rowHighlight: 'rgba(16, 185, 129, 0.04)',
    };
  }

  // 3. Worker
  if (
    purp.includes('worker') ||
    name.includes('worker') ||
    name.includes('domestic staff') ||
    name.includes('helper') ||
    vType.includes('contractor') ||
    vType.includes('service_technician') ||
    vType.includes('staff_worker') ||
    eType === 'worker'
  ) {
    return {
      type: 'WORKER',
      label: 'Worker',
      image: '/images/worker.png',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.35)',
      badgeBg: '#ede9fe',
      rowHighlight: 'rgba(139, 92, 246, 0.04)',
    };
  }

  // 4. Vehicle
  if (
    purp.includes('vehicle') ||
    purp.includes('barrier') ||
    name.startsWith('vehicle') ||
    eType === 'vehicle' ||
    (item?.vehicle_number && !purp && !name)
  ) {
    return {
      type: 'VEHICLE',
      label: 'Vehicle',
      image: '/images/vehicle.png',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.35)',
      badgeBg: '#dbeafe',
      rowHighlight: 'rgba(59, 130, 246, 0.04)',
    };
  }

  // 5. Visitor (Default)
  return {
    type: 'VISITOR',
    label: 'Visitor',
    image: '/images/visitor.png',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.35)',
    badgeBg: '#cffafe',
    rowHighlight: 'rgba(6, 182, 212, 0.04)',
  };
};

export default function VisitorsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isSecurity = user?.role === 'SECURITY';
  const isResident = ['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [assignedGateInfo, setAssignedGateInfo] = useState(null);
  const [societyHomes, setSocietyHomes] = useState([]);

  // Checkpoint assignment & entry registration privilege
  const isGateAssigned = Boolean(assignedGateInfo);
  const isGateRegistrationEnabled = Boolean(assignedGateInfo?.allows_entry_registration);
  const canRegisterEntry = isSecurity && isGateAssigned && isGateRegistrationEnabled;

  // Active Gate Visit Type Modal: 'VISITOR' | 'COURIER' | 'DELIVERY' | 'WORKER' | 'VEHICLE' | null
  const [activeModal, setActiveModal] = useState(null);

  // Visit Type Form states
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    phone: '',
    home_id: 1,
    visitor_type: 'GUEST',
    purpose: 'Personal Visit',
    vehicle_number: '',
  });

  const [courierForm, setCourierForm] = useState({
    company: 'BlueDart',
    tracking_number: '',
    home_id: 1,
    recipient_name: '',
  });

  const [deliveryForm, setDeliveryForm] = useState({
    company: 'Blinkit',
    person_name: '',
    phone: '',
    home_id: 1,
    vehicle_number: '',
  });

  const [workerPasscode, setWorkerPasscode] = useState('');
  const [workersList, setWorkersList] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedWorkerObj, setSelectedWorkerObj] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: '',
    vehicle_type: 'FOUR_WHEELER',
    home_id: 1,
    driver_name: '',
  });

  // Search & Filter for History
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('ALL'); // ALL, PENDING, APPROVED, ENTERED, EXITED, REJECTED
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, VISITOR, COURIER, DELIVERY, WORKER, VEHICLE

  // Feedback Notifications
  const [notification, setNotification] = useState(null);

  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const promises = [
        visitorApi.getHistory().catch(() => ({ data: { entries: [] } })),
        societyApi.getAllHomes().catch(() => ({ data: { homes: [] } })),
        workerApi.getHomeWorkers().catch(() => ({ data: { workers: [] } })),
      ];

      if (isSecurity || isAdmin) {
        promises.push(
          gateApi.getMyAssignedGate().catch(() => ({ data: { has_assignment: false, gate: null } }))
        );
      } else {
        promises.push(Promise.resolve({ data: { has_assignment: false, gate: null } }));
      }

      const [historyRes, homesRes, workersRes, gateRes] = await Promise.all(promises);

      const entries = historyRes.data?.entries || [];
      setHistory(entries);

      const workers = workersRes.data?.workers || [];
      setWorkersList(workers);

      const homes = homesRes.data?.homes || [];
      setSocietyHomes(homes);
      if (homes.length > 0) {
        const firstId = homes[0].id || homes[0].home_id || 1;
        setVisitorForm((p) => ({ ...p, home_id: p.home_id || firstId }));
        setCourierForm((p) => ({ ...p, home_id: p.home_id || firstId }));
        setDeliveryForm((p) => ({ ...p, home_id: p.home_id || firstId }));
        setVehicleForm((p) => ({ ...p, home_id: p.home_id || firstId }));
      }

      if (gateRes.data?.has_assignment && gateRes.data?.gate) {
        setAssignedGateInfo(gateRes.data.gate);
      }
    } catch (err) {
      showNotice('error', err.message || 'Failed to load visitor data.');
    } finally {
      setLoading(false);
    }
  };

  // Submit 1: Visitor Check-In
  const handleVisitorSubmit = async (e) => {
    e.preventDefault();
    if (!canRegisterEntry) {
      showNotice('error', 'Only security guards assigned to a gate with Gate Entry Registration enabled can check in visitors.');
      return;
    }
    if (!visitorForm.name.trim() || !visitorForm.phone.trim()) {
      showNotice('error', 'Visitor Name and Phone Number are required.');
      return;
    }
    try {
      await visitorApi.createVisitorEntry({
        visitor_name: visitorForm.name.trim(),
        phone_number: visitorForm.phone.trim(),
        visiting_home: visitorForm.home_id,
        visitor_type: visitorForm.visitor_type,
        purpose: visitorForm.purpose || 'Personal Visit',
        vehicle_number: visitorForm.vehicle_number ? visitorForm.vehicle_number.trim().toUpperCase() : null,
        gate_id: assignedGateInfo?.id || null,
        record_entry_now: true,
      });
      showNotice('success', `Gate entry logged for "${visitorForm.name}". Status: ENTERED`);
      setActiveModal(null);
      setVisitorForm({
        name: '',
        phone: '',
        home_id: societyHomes[0]?.id || 1,
        visitor_type: 'GUEST',
        purpose: 'Personal Visit',
        vehicle_number: '',
      });
      fetchInitialData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to record visitor entry.');
    }
  };

  // Submit 2: Courier Package Entry
  const handleCourierSubmit = async (e) => {
    e.preventDefault();
    if (!canRegisterEntry) {
      showNotice('error', 'Only security guards assigned to a gate with Gate Entry Registration enabled can record courier parcels.');
      return;
    }
    try {
      await securityApi.recordGateEntry({
        name: courierForm.recipient_name || 'Resident Parcel',
        phone: 'N/A',
        home_id: courierForm.home_id,
        visitor_type: 'DELIVERY',
        purpose: `Courier: ${courierForm.company} (${courierForm.tracking_number || 'Standard Parcel'})`,
        entry_type: 'COURIER',
      });
      showNotice('success', `Courier package from ${courierForm.company} recorded at gate.`);
      setActiveModal(null);
      setCourierForm({ company: 'BlueDart', tracking_number: '', home_id: societyHomes[0]?.id || 1, recipient_name: '' });
      fetchInitialData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to record courier.');
    }
  };

  // Submit 3: Food & Grocery Delivery Entry
  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    if (!canRegisterEntry) {
      showNotice('error', 'Only security guards assigned to a gate with Gate Entry Registration enabled can check in delivery agents.');
      return;
    }
    try {
      await securityApi.recordGateEntry({
        name: `${deliveryForm.company} - ${deliveryForm.person_name || 'Delivery Agent'}`,
        phone: deliveryForm.phone || '9999999999',
        home_id: deliveryForm.home_id,
        visitor_type: 'DELIVERY',
        purpose: `Food / Grocery Delivery (${deliveryForm.company})`,
        vehicle_number: deliveryForm.vehicle_number ? deliveryForm.vehicle_number.trim().toUpperCase() : null,
        entry_type: 'DELIVERY',
      });
      showNotice('success', `Delivery agent from ${deliveryForm.company} checked in at gate.`);
      setActiveModal(null);
      setDeliveryForm({ company: 'Blinkit', person_name: '', phone: '', home_id: societyHomes[0]?.id || 1, vehicle_number: '' });
      fetchInitialData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to record delivery.');
    }
  };

  // Submit 4: Worker / Domestic Staff Passcode Entry
  const handleWorkerSubmit = async (e) => {
    e.preventDefault();
    if (!canRegisterEntry) {
      showNotice('error', 'Only security guards assigned to a gate with Gate Entry Registration enabled can verify worker entries.');
      return;
    }
    const code = workerPasscode.trim().toUpperCase();
    if (!code && !selectedWorkerId) {
      showNotice('error', 'Please select a worker name from the dropdown or enter a passcode.');
      return;
    }

    const workerName = selectedWorkerObj?.full_name || (code ? `Domestic Staff / Helper (${code})` : 'Domestic Staff');
    const workerPhone = selectedWorkerObj?.phone || 'N/A';
    const workerType = selectedWorkerObj?.worker_type || 'Domestic Worker';
    const passCodeDisplay = code || selectedWorkerObj?.pass_code || 'VERIFIED';

    try {
      await securityApi.recordGateEntry({
        name: workerName,
        phone: workerPhone,
        home_id: societyHomes[0]?.id || 1,
        visitor_type: 'SERVICE_TECHNICIAN',
        purpose: `Domestic Worker Passcode Entry (${workerType}) • Passcode: ${passCodeDisplay}`,
        entry_type: 'WORKER',
      });
      showNotice('success', `Worker gate pass verified & entry recorded for "${workerName}".`);
      setActiveModal(null);
      setWorkerPasscode('');
      setSelectedWorkerId('');
      setSelectedWorkerObj(null);
      fetchInitialData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to verify worker entry.');
    }
  };

  // Submit 5: Vehicle Barrier Entry
  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    if (!canRegisterEntry) {
      showNotice('error', 'Only security guards assigned to a gate with Gate Entry Registration enabled can log vehicle entries.');
      return;
    }
    if (!vehicleForm.vehicle_number.trim()) {
      showNotice('error', 'Vehicle Number is required.');
      return;
    }
    try {
      await securityApi.recordGateEntry({
        name: vehicleForm.driver_name || 'Vehicle Driver',
        phone: 'N/A',
        home_id: vehicleForm.home_id,
        visitor_type: 'CAB_TAXIS',
        purpose: `Vehicle Gate Movement (${vehicleForm.vehicle_type})`,
        vehicle_number: vehicleForm.vehicle_number.trim().toUpperCase(),
        entry_type: 'VEHICLE',
      });
      showNotice('success', `Vehicle ${vehicleForm.vehicle_number.toUpperCase()} barrier opened and logged.`);
      setActiveModal(null);
      setVehicleForm({ vehicle_number: '', vehicle_type: 'FOUR_WHEELER', home_id: societyHomes[0]?.id || 1, driver_name: '' });
      fetchInitialData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to record vehicle entry.');
    }
  };

  // Resident Approves or Rejects Request
  const handleApprovalDecision = async (entryId, decision, visitorName) => {
    try {
      await visitorApi.respondToApproval(entryId, decision);
      showNotice(
        'success',
        `Visitor "${visitorName}" request has been ${decision === 'APPROVED' ? 'APPROVED' : 'REJECTED'}.`
      );
      fetchInitialData();
    } catch (err) {
      showNotice('error', err.message || `Failed to ${decision.toLowerCase()} visitor.`);
    }
  };

  // Security records entry (transitions APPROVED -> ENTERED)
  const handleRecordEntry = async (entryId, visitorName) => {
    if (!canRegisterEntry) {
      showNotice('error', 'Only security guards assigned to a gate with Gate Entry Registration enabled can log entry.');
      return;
    }
    try {
      await visitorApi.recordEntry(entryId, { gate_id: assignedGateInfo?.id || null });
      showNotice('success', `Gate Entry recorded for "${visitorName}". Visitor is now ENTERED.`);
      fetchInitialData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to record gate entry.');
    }
  };

  // Security records exit (transitions ENTERED -> EXITED)
  const handleRecordExit = async (entryId, visitorName) => {
    try {
      await visitorApi.recordExit(entryId);
      showNotice('success', `Gate Exit logged for "${visitorName}". Visitor has EXITED.`);
      fetchInitialData();
    } catch (err) {
      showNotice('error', err.message || 'Failed to record gate exit.');
    }
  };

  // Filtered visitor history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const vName = (item.visitor_name || '').toLowerCase();
      const phone = (item.phone_number || '').toLowerCase();
      const hNum = (item.home_number || '').toLowerCase();
      const veh = (item.vehicle_number || '').toLowerCase();
      const purp = (item.purpose || '').toLowerCase();
      const stat = (item.status || 'PENDING').toUpperCase();
      const visitType = getGateVisitType(item);

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        vName.includes(q) ||
        phone.includes(q) ||
        hNum.includes(q) ||
        veh.includes(q) ||
        purp.includes(q) ||
        visitType.label.toLowerCase().includes(q);

      const matchesStatus = statusTab === 'ALL' || stat === statusTab;
      const matchesType = typeFilter === 'ALL' || visitType.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [history, searchQuery, statusTab, typeFilter]);

  // Derived counts
  const pendingRequests = history.filter((v) => v.status === 'PENDING');
  const insideVisitors = history.filter((v) => v.status === 'ENTERED' || v.status === 'INSIDE');
  const approvedWaiting = history.filter((v) => v.status === 'APPROVED');
  const exitedVisitors = history.filter((v) => v.status === 'EXITED' || v.status === 'CHECKED_OUT');
  const rejectedVisitors = history.filter((v) => v.status === 'REJECTED');

  // Status Badge Styling Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ENTERED':
      case 'INSIDE':
        return {
          bg: ' rgba(226, 177, 107, 1)',
          color: ' rgb(107, 78, 38)',
          border: ' rgb(107, 78, 38)',
          label: 'ENTERED (Inside)',
        };
      case 'APPROVED':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#60a5fa',
          border: 'rgba(59, 130, 246, 0.3)',
          label: 'APPROVED (Ready for Entry)',
        };
      case 'PENDING':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: 'rgba(245, 158, 11, 0.3)',
          label: 'PENDING (Approval Required)',
        };
      case 'EXITED':
      case 'CHECKED_OUT':
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          color: '#94a3b8',
          border: 'rgba(148, 163, 184, 0.3)',
          label: 'EXITED (Checked Out)',
        };
      case 'REJECTED':
        return {
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#fda4af',
          border: 'rgba(244, 63, 94, 0.3)',
          label: 'REJECTED',
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          color: '#94a3b8',
          border: 'rgba(148, 163, 184, 0.3)',
          label: status,
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header Hero Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          background: 'var(--color-white)',
          border: '1px solid var(--color-sand)',
          boxShadow: '0 4px 20px rgba(196, 154, 108, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 480px', minWidth: '280px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
              flexShrink: 0,
            }}
          >
            <UserCheck size={24} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--color-dark-brown)', letterSpacing: '-0.01em' }}>
              {isSecurity || isAdmin ? 'Gate Entry & Visitor Check-In' : 'Society Visitor & Guest Check-In'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0', lineHeight: 1.4 }}>
              Comprehensive gate checkpoint flow: Search flat, verify resident permissions, request approvals, and record entry/exit.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchInitialData}
            className="btn btn-outline"
            style={{
              padding: '10px 14px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--color-white)',
              border: '1.5px solid var(--border-card)',
              color: 'var(--color-dark-brown)',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)',
            }}
            title="Refresh visitor logs"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>


      {/* Notifications Alert */}
      {notification && (
        <div
          style={{
            background: notification.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${notification.type === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            color: notification.type === 'error' ? '#fda4af' : '#6ee7b7',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ fontWeight: 600 }}>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Gate Visit Type (Visible to Admin & Security; Pressable only for Security on Entry Registration Gate) */}
      {(isSecurity || isAdmin) && (
        <div
          className="glass-panel"
          style={{
            padding: '22px 24px',
            background: 'var(--color-white)',
            border: '1px solid var(--color-sand)',
            boxShadow: '0 4px 15px rgba(196, 154, 108, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DoorOpen size={20} color="var(--primary)" />
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#403630' }}>
                  Gate Visit Type
                </h2>
              </div>
            </div>




          </div>

          {/* Circle Cards Container - All 5 Cards: Visitor, Courier, Delivery, Worker, Vehicle */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            {GATE_VISIT_TYPES.map((vt) => {
              // 1. Authorized Security on registration gate: Touchable button with press/click action to open modal
              if (canRegisterEntry) {
                return (
                  <button
                    key={vt.id}
                    type="button"
                    onClick={() => setActiveModal(vt.modal)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: '#FFFFFF',
                      border: `2px solid ${vt.border}`,
                      borderRadius: '20px',
                      padding: '16px 20px',
                      minWidth: '135px',
                      cursor: 'pointer',
                      boxShadow: `0 4px 16px ${vt.glow}`,
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px) scale(1.03)';
                      e.currentTarget.style.boxShadow = `0 12px 28px ${vt.glowHover}`;
                      e.currentTarget.style.borderColor = vt.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = `0 4px 16px ${vt.glow}`;
                      e.currentTarget.style.borderColor = vt.border;
                    }}
                  >
                    {/* Circle Container */}
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: vt.circleBg,
                        border: `3px solid ${vt.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '12px',
                        boxShadow: `0 4px 14px ${vt.glow}`,
                        transition: 'transform 0.25s ease',
                      }}
                    >
                      <img
                        src={vt.image}
                        alt={vt.label}
                        style={{
                          width: '50px',
                          height: '50px',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#403630' }}>
                      {vt.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: vt.color,
                        marginTop: '3px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {vt.sublabel}
                    </span>
                  </button>
                );
              }

              // 2. Admin & Other Security: Clean div without touchable opacity or press/click action
              return (
                <div
                  key={vt.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: '#FFFFFF',
                    border: `2px solid ${vt.border}`,
                    borderRadius: '20px',
                    padding: '16px 20px',
                    minWidth: '135px',
                    cursor: 'default',
                    boxShadow: `0 3px 12px ${vt.glow}`,
                    outline: 'none',
                    userSelect: 'none',
                  }}
                  title={isAdmin ? `${vt.label} (Entry registered by Gate Security)` : `${vt.label} (View Only)`}
                >
                  {/* Circle Container */}
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: vt.circleBg,
                      border: `3px solid ${vt.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                      boxShadow: `0 3px 10px ${vt.glow}`,
                    }}
                  >
                    <img
                      src={vt.image}
                      alt={vt.label}
                      style={{
                        width: '50px',
                        height: '50px',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#403630' }}>
                    {vt.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: vt.color,
                      marginTop: '3px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {vt.sublabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Resident Approval Queue (Shown when pending requests exist for resident/admin) */}
      {pendingRequests.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            border: '1px solid var(--color-sand)',
            background: 'var(--color-white)',
            boxShadow: '0 4px 15px rgba(196, 154, 108, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fde68a' }}>
                  Pending Visitor Approvals ({pendingRequests.length})
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Visitors waiting at security checkpoint requiring resident clearance.
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                fontWeight: 700,
              }}
            >
              Action Required
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                      {req.visitor_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Phone: <strong>{req.phone_number}</strong>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#a5b4fc',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}
                  >
                    Visiting Unit {req.home_number}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  Purpose: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{req.purpose}</span>
                </div>

                {req.vehicle_number && (
                  <div style={{ fontSize: '0.78rem', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={13} /> Vehicle: <strong>{req.vehicle_number}</strong>
                  </div>
                )}

                {/* Approve / Reject buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleApprovalDecision(req.id, 'APPROVED', req.visitor_name)}
                    className="btn"
                    style={{
                      flex: 1,
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#6ee7b7',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px',
                    }}
                  >
                    <Check size={14} /> Approve Entry
                  </button>
                  <button
                    onClick={() => handleApprovalDecision(req.id, 'REJECTED', req.visitor_name)}
                    className="btn"
                    style={{
                      flex: 1,
                      background: 'rgba(244, 63, 94, 0.2)',
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                      color: '#fda4af',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px',
                    }}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. COMPLETE VISITOR HISTORY TABLE */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Visitor List</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Full audit trail of all visitor check-ins, approvals, vehicle movements, and gate departure times.
            </div>
          </div>

          {/* Search Filter Input */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search visitor, phone, unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 32px',
                borderRadius: 'var(--radius-md)',
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Gate Visit Type Filter Chips with Images */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>
            Filter Type:
          </span>
          <button
            onClick={() => setTypeFilter('ALL')}
            className="btn"
            style={{
              fontSize: '0.76rem',
              padding: '5px 14px',
              borderRadius: '20px',
              fontWeight: typeFilter === 'ALL' ? 800 : 600,
              background: typeFilter === 'ALL' ? '#403630' : '#FFFFFF',
              color: typeFilter === 'ALL' ? '#FFFFFF' : 'var(--text-muted)',
              border: typeFilter === 'ALL' ? '1.5px solid #403630' : '1.5px solid var(--border-card)',
            }}
          >
            All Types ({history.length})
          </button>
          {GATE_VISIT_TYPES.map((vt) => {
            const count = history.filter((h) => getGateVisitType(h).type === vt.id).length;
            const isActive = typeFilter === vt.id;
            return (
              <button
                key={vt.id}
                onClick={() => setTypeFilter(vt.id)}
                className="btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.76rem',
                  padding: '4px 12px 4px 6px',
                  borderRadius: '20px',
                  fontWeight: isActive ? 800 : 600,
                  background: isActive ? vt.color : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : vt.color,
                  border: `1.5px solid ${vt.color}`,
                  boxShadow: isActive ? `0 2px 8px ${vt.glow}` : 'none',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                  }}
                >
                  <img src={vt.image} alt={vt.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span>{vt.label}</span>
                <span style={{ opacity: 0.85, fontSize: '0.7rem' }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Status Tab Filters: PENDING, APPROVED, REJECTED, ENTERED, EXITED */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '14px' }}>
          {[
            { id: 'ALL', label: `All Statuses (${history.length})` },
            { id: 'PENDING', label: `Pending (${pendingRequests.length})`, count: pendingRequests.length, color: '#fbbf24' },
            { id: 'APPROVED', label: `Approved (${approvedWaiting.length})`, count: approvedWaiting.length, color: '#60a5fa' },
            { id: 'ENTERED', label: `Inside Premises (${insideVisitors.length})`, count: insideVisitors.length, color: '#34d399' },
            { id: 'EXITED', label: `Exited (${exitedVisitors.length})`, count: exitedVisitors.length, color: '#94a3b8' },
            { id: 'REJECTED', label: `Rejected (${rejectedVisitors.length})`, count: rejectedVisitors.length, color: '#fda4af' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className="btn"
              style={{
                fontSize: '0.78rem',
                padding: '6px 12px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                fontWeight: statusTab === tab.id ? 700 : 500,
                background: statusTab === tab.id ? 'var(--color-clay)' : '#FFFFFF',
                color: statusTab === tab.id ? '#FFFFFF' : 'var(--text-muted)',
                border: statusTab === tab.id ? '1px solid var(--color-clay)' : '1px solid var(--border-card)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Visitor History Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
            <div>Loading visitor records...</div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <Users size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div>No visitor entries found for the selected criteria.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '12px 14px' }}>Gate Visit Type</th>
                  <th style={{ padding: '12px 14px' }}>Visitor Details</th>
                  <th style={{ padding: '12px 14px' }}>Visiting Home</th>
                  <th style={{ padding: '12px 14px' }}>Purpose & Vehicle</th>
                  <th style={{ padding: '12px 14px' }}>Entry Time</th>
                  <th style={{ padding: '12px 14px' }}>Exit Time</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  {isSecurity && canRegisterEntry && <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => {
                  const badge = getStatusBadge(item.status);
                  const visitType = getGateVisitType(item);
                  const canRecordEntry = canRegisterEntry && item.status === 'APPROVED';
                  const canRecordExit = canRegisterEntry && (item.status === 'ENTERED' || item.status === 'INSIDE');
                  const canApprove = (isResident || isAdmin) && item.status === 'PENDING';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        borderLeft: `5px solid ${visitType.color}`,
                        background: visitType.rowHighlight,
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Gate Visit Type Column */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: visitType.bg,
                              border: `2px solid ${visitType.color}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              padding: '4px',
                              boxShadow: `0 2px 8px ${visitType.border}`,
                            }}
                          >
                            <img
                              src={visitType.image}
                              alt={visitType.label}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          </div>
                          <div>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                color: visitType.color,
                                background: visitType.bg,
                                border: `1px solid ${visitType.border}`,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {visitType.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Visitor Details */}
                      <td style={{ padding: '14px' }}>


                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {item.visitor_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            📞 {item.phone_number}
                          </div>
                        </div>

                      </td>

                      {/* Visiting Home */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 700, color: '#818cf8' }}>
                          Unit {item.home_number}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {item.building_or_wing}
                        </div>
                        {item.resident_name && (
                          <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '2px', fontWeight: 600 }}>
                            Resident: {item.resident_name}
                          </div>
                        )}
                      </td>

                      {/* Purpose & Vehicle */}
                      <td style={{ padding: '14px' }}>
                        <div>{item.purpose || 'Personal Visit'}</div>
                        {item.vehicle_number && (
                          <div style={{ fontSize: '0.72rem', color: '#06b6d4', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Car size={11} /> {item.vehicle_number}
                          </div>
                        )}
                      </td>

                      {/* Entry Time */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        {item.entry_time || item.check_in_time ? (
                          <div>
                            <div style={{ color: '#34d399', fontWeight: 600 }}>
                              {new Date(String(item.entry_time || item.check_in_time).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              {new Date(String(item.entry_time || item.check_in_time).replace(' ', 'T')).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Pending Entry</span>
                        )}
                      </td>

                      {/* Exit Time */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        {item.exit_time || item.check_out_time ? (
                          <div>
                            <div style={{ color: '#94a3b8', fontWeight: 600 }}>
                              {new Date(String(item.exit_time || item.check_out_time).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              {new Date(String(item.exit_time || item.check_out_time).replace(' ', 'T')).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ) : (item.entry_time || item.check_in_time) ? (
                          <span style={{ color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>Currently Inside</span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions (Hidden in Society Visitor & Guest Check-In and Admin Gate Entry) */}
                      {isSecurity && canRegisterEntry && (
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {canRecordEntry && (
                              <button
                                onClick={() => handleRecordEntry(item.id, item.visitor_name)}
                                className="btn"
                                style={{
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  color: '#6ee7b7',
                                  fontSize: '0.72rem',
                                  padding: '4px 8px',
                                  fontWeight: 700,
                                }}
                              >
                                <LogIn size={12} /> Log Entry
                              </button>
                            )}

                            {canRecordExit && (
                              <button
                                onClick={() => handleRecordExit(item.id, item.visitor_name)}
                                className="btn"
                                style={{
                                  background: 'rgba(244, 63, 94, 0.15)',
                                  border: '1px solid rgba(244, 63, 94, 0.35)',
                                  color: '#fda4af',
                                  fontSize: '0.72rem',
                                  padding: '4px 8px',
                                  fontWeight: 700,
                                }}
                              >
                                <LogOut size={12} /> Log Exit
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL 1: VISITOR ENTRY
          ======================================================== */}
      {isSecurity && activeModal === 'VISITOR' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
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
              maxWidth: '520px',
              padding: '28px',
              background: '#FFFFFF',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--color-dark-brown)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', border: '2px solid #06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                  <img src="/images/visitor.png" alt="Visitor" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>[ Visitor Check-In ]</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleVisitorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Visitor Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aakash Verma"
                  value={visitorForm.name}
                  onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Visitor Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={visitorForm.phone}
                  onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Destination Home</label>
                  <select
                    value={visitorForm.home_id}
                    onChange={(e) => setVisitorForm({ ...visitorForm, home_id: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                  >
                    {societyHomes.map((h) => (
                      <option key={h.id || h.home_id} value={h.id || h.home_id} style={{ background: '#FFFFFF', color: '#403630' }}>
                        Home {h.home_number} ({h.building_or_wing || 'Unit'}) {h.society_name ? `— ${h.society_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Visitor Type</label>
                  <select
                    value={visitorForm.visitor_type}
                    onChange={(e) => setVisitorForm({ ...visitorForm, visitor_type: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                  >
                    <option value="GUEST" style={{ background: '#FFFFFF', color: '#403630' }}>Guest / Friend</option>
                    <option value="CAB_TAXIS" style={{ background: '#FFFFFF', color: '#403630' }}>Cab / Taxi</option>
                    <option value="SERVICE_TECHNICIAN" style={{ background: '#FFFFFF', color: '#403630' }}>Service Technician</option>
                    <option value="CONTRACTOR" style={{ background: '#FFFFFF', color: '#403630' }}>Contractor</option>
                    <option value="OTHER" style={{ background: '#FFFFFF', color: '#403630' }}>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Family Guest / Meeting"
                  value={visitorForm.purpose}
                  onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Vehicle Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MH-02-CB-1234"
                  value={visitorForm.vehicle_number}
                  onChange={(e) => setVisitorForm({ ...visitorForm, vehicle_number: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px', background: '#06b6d4', borderColor: '#06b6d4' }}>
                  Confirm & Check In
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-outline" style={{ padding: '10px 16px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: COURIER ENTRY
          ======================================================== */}
      {activeModal === 'COURIER' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '28px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', color: 'var(--color-dark-brown)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '2px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                  <img src="/images/courier.png" alt="Courier" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>[ Courier Package Entry ]</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCourierSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Courier Service Provider</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BlueDart Express / DTDC / DHL / Amazon"
                  value={courierForm.company}
                  onChange={(e) => setCourierForm({ ...courierForm, company: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Tracking / AWB Number</label>
                <input
                  type="text"
                  placeholder="e.g. BD78912345IN"
                  value={courierForm.tracking_number}
                  onChange={(e) => setCourierForm({ ...courierForm, tracking_number: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Destination Home</label>
                <select
                  value={courierForm.home_id}
                  onChange={(e) => setCourierForm({ ...courierForm, home_id: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                >
                  {societyHomes.map((h) => (
                    <option key={h.id || h.home_id} value={h.id || h.home_id} style={{ background: '#FFFFFF', color: '#403630' }}>
                      Home {h.home_number} ({h.building_or_wing || 'Unit'}) {h.society_name ? `— ${h.society_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Recipient Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Resident Name"
                  value={courierForm.recipient_name}
                  onChange={(e) => setCourierForm({ ...courierForm, recipient_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px', background: '#f59e0b', borderColor: '#f59e0b' }}>
                  Log Courier at Gate
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-outline" style={{ padding: '10px 16px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: DELIVERY ENTRY
          ======================================================== */}
      {activeModal === 'DELIVERY' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '28px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', color: 'var(--color-dark-brown)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                  <img src="/images/delivery.png" alt="Delivery" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>[ Food & Grocery Delivery ]</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleDeliverySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Company / App</label>
                  <select
                    value={deliveryForm.company}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, company: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                  >
                    <option value="Blinkit" style={{ background: '#FFFFFF', color: '#403630' }}>Blinkit</option>
                    <option value="Swiggy" style={{ background: '#FFFFFF', color: '#403630' }}>Swiggy</option>
                    <option value="Zomato" style={{ background: '#FFFFFF', color: '#403630' }}>Zomato</option>
                    <option value="Zepto" style={{ background: '#FFFFFF', color: '#403630' }}>Zepto</option>
                    <option value="Amazon" style={{ background: '#FFFFFF', color: '#403630' }}>Amazon</option>
                    <option value="Amazon" style={{ background: '#FFFFFF', color: '#403630' }}>Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Destination Home</label>
                  <select
                    value={deliveryForm.home_id}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, home_id: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                  >
                    {societyHomes.map((h) => (
                      <option key={h.id || h.home_id} value={h.id || h.home_id} style={{ background: '#FFFFFF', color: '#403630' }}>
                        Home {h.home_number} ({h.building_or_wing || 'Unit'}) {h.society_name ? `— ${h.society_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Delivery Person Name</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Kumar"
                  value={deliveryForm.person_name}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, person_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={deliveryForm.phone}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Vehicle Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MH-02-AX-9988"
                  value={deliveryForm.vehicle_number}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, vehicle_number: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px', background: '#10b981', borderColor: '#10b981' }}>
                  Allow Delivery In
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-outline" style={{ padding: '10px 16px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: WORKER ENTRY
          ======================================================== */}
      {activeModal === 'WORKER' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', color: 'var(--color-dark-brown)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', border: '2px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                  <img src="/images/worker.png" alt="Worker" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>[ Worker Passcode Entry ]</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleWorkerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Dropdown of all worker names */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Select Worker Name *
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => {
                    const wId = e.target.value;
                    setSelectedWorkerId(wId);
                    const found = workersList.find((w) => String(w.id || w.worker_id) === String(wId));
                    if (found) {
                      setWorkerPasscode(found.pass_code || found.passcode || '');
                      setSelectedWorkerObj(found);
                    } else {
                      setSelectedWorkerObj(null);
                      setWorkerPasscode('');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    background: '#FFFFFF',
                    border: '2px solid var(--color-clay)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-dark-brown)',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    marginTop: '4px',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Choose Worker from Society Roster ({workersList.length} registered) --</option>
                  {workersList.map((w) => {
                    const wid = w.id || w.worker_id;
                    const wType = w.worker_type || 'Worker';
                    const pass = w.pass_code || w.passcode || '';
                    return (
                      <option key={wid} value={wid}>
                        {w.full_name} ({wType}){pass ? ` • Passcode: ${pass}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Passcode / Code Input (auto-filled or manual) */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Worker Passcode / ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PASS-GAR-75780"
                  value={workerPasscode}
                  onChange={(e) => setWorkerPasscode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 13px',
                    background: '#FFFFFF',
                    border: '2px solid var(--color-clay)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-dark-brown)',
                    fontSize: '1rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    marginTop: '4px',
                  }}
                />
              </div>

              {/* Worker Information Preview Card when a worker is selected */}
              {selectedWorkerObj && (
                <div
                  style={{
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#6d28d9', fontSize: '0.92rem' }}>
                      {selectedWorkerObj.full_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Role: <strong>{selectedWorkerObj.worker_type || 'Helper'}</strong> • Phone: {selectedWorkerObj.phone || 'N/A'}
                    </div>
                    {selectedWorkerObj.all_assigned_homes && (
                      <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
                        Assigned Flats: Unit {selectedWorkerObj.all_assigned_homes}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#7c3aed',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Verified Helper
                  </span>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '11px', fontWeight: 700 }}>
                  Authorize Worker Gate Pass
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setWorkerPasscode('');
                    setSelectedWorkerId('');
                    setSelectedWorkerObj(null);
                  }}
                  className="btn btn-outline"
                  style={{ padding: '11px 16px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: VEHICLE ENTRY
          ======================================================== */}
      {activeModal === 'VEHICLE' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', color: 'var(--color-dark-brown)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', border: '2px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                  <img src="/images/vehicle.png" alt="Vehicle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>[ Vehicle Barrier Entry ]</h3>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleVehicleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>License Plate / Vehicle Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-02-CB-1234"
                  value={vehicleForm.vehicle_number}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_number: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '12px 14px', background: '#FFFFFF', border: '2px solid var(--color-clay)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Vehicle Type</label>
                  <select
                    value={vehicleForm.vehicle_type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                  >
                    <option value="FOUR_WHEELER" style={{ background: '#FFFFFF', color: '#403630' }}>Car / SUV (4W)</option>
                    <option value="TWO_WHEELER" style={{ background: '#FFFFFF', color: '#403630' }}>Bike / Scooter (2W)</option>
                    <option value="COMMERCIAL" style={{ background: '#FFFFFF', color: '#403630' }}>Commercial / Van</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Destination Home</label>
                  <select
                    value={vehicleForm.home_id}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, home_id: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                  >
                    {societyHomes.map((h) => (
                      <option key={h.id || h.home_id} value={h.id || h.home_id} style={{ background: '#FFFFFF', color: '#403630' }}>
                        Home {h.home_number} ({h.building_or_wing || 'Unit'}) {h.society_name ? `— ${h.society_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Driver Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Driver / Owner Name"
                  value={vehicleForm.driver_name}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--color-dark-brown)', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px' }}>
                  Open Barrier & Log Entry
                </button>
                <button type="button" onClick={() => setActiveModal(null)} className="btn btn-outline" style={{ padding: '10px 16px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
