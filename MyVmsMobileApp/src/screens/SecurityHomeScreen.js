import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { securityApi, gateApi, societyApi, visitorApi } from '../services/apiServices';
import {
  Building2,
  Clock,
  UserCheck,
  Truck,
  Package,
  Briefcase,
  Car,
  Shield,
  ShieldCheck,
  DoorOpen,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronDown,
} from 'lucide-react-native';

const GATE_VISIT_TYPES = [
  {
    id: 'VISITOR',
    label: 'Visitor',
    sublabel: 'Guest Check-In',
    image: require('../assets/images/visitor.png'),
    color: '#06b6d4',
    border: '#06b6d4',
    circleBg: 'rgba(6, 182, 212, 0.15)',
  },
  {
    id: 'COURIER',
    label: 'Courier',
    sublabel: 'Parcel Drop',
    image: require('../assets/images/courier.png'),
    color: '#f59e0b',
    border: '#f59e0b',
    circleBg: 'rgba(245, 158, 11, 0.15)',
  },
  {
    id: 'DELIVERY',
    label: 'Delivery',
    sublabel: 'Food & Grocery',
    image: require('../assets/images/delivery.png'),
    color: '#10b981',
    border: '#10b981',
    circleBg: 'rgba(16, 185, 129, 0.15)',
  },
  {
    id: 'WORKER',
    label: 'Worker',
    sublabel: 'Staff Passcode',
    image: require('../assets/images/worker.png'),
    color: '#8b5cf6',
    border: '#8b5cf6',
    circleBg: 'rgba(139, 92, 246, 0.15)',
  },
  {
    id: 'VEHICLE',
    label: 'Vehicle',
    sublabel: 'Barrier Entry',
    image: require('../assets/images/vehicle.png'),
    color: '#3b82f6',
    border: '#3b82f6',
    circleBg: 'rgba(59, 130, 246, 0.15)',
  },
];

export const SecurityHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [assignedGateInfo, setAssignedGateInfo] = useState(null);
  const [societyInfo, setSocietyInfo] = useState(null);
  const [homes, setHomes] = useState([]);

  // Active Entry Modal: 'VISITOR' | 'COURIER' | 'DELIVERY' | 'WORKER' | 'VEHICLE' | null
  const [activeModal, setActiveModal] = useState(null);
  const [submittingEntry, setSubmittingEntry] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Entry Form States
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    phone: '',
    home_id: null,
    purpose: 'Personal Visit',
    vehicle_number: '',
  });

  const [courierForm, setCourierForm] = useState({
    company: 'BlueDart',
    tracking_number: '',
    home_id: null,
    recipient_name: '',
  });

  const [deliveryForm, setDeliveryForm] = useState({
    company: 'Blinkit',
    person_name: '',
    phone: '',
    home_id: null,
    vehicle_number: '',
  });

  const [workerPasscode, setWorkerPasscode] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  const [vehicleForm, setVehicleForm] = useState({
    vehicle_number: '',
    vehicle_type: 'FOUR_WHEELER',
    driver_name: '',
    home_id: null,
  });

  const showToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashRes, assignedRes] = await Promise.all([
        securityApi.getGateDashboard(user?.societyId).catch((err) => {
          console.log('Error fetching gate dashboard:', err);
          return { data: null };
        }),
        gateApi.getMyAssignedGate().catch((err) => {
          console.log('Error fetching assigned gate:', err);
          return { data: { has_assignment: false, gate: null } };
        }),
      ]);

      const dData = dashRes?.data || dashRes || {};
      setDashboardData(dData);
      setAssignedGateInfo(assignedRes?.data?.gate || null);

      // Society info fallback
      if (user?.societyId) {
        societyApi
          .getSocietyById(user.societyId)
          .then((res) => {
            if (res?.data?.society || res?.society) {
              setSocietyInfo(res?.data?.society || res?.society);
            }
          })
          .catch(() => {});
      }

      // Fetch Homes for destination selection
      societyApi
        .getAllHomes()
        .then((res) => {
          const list = res?.data?.homes || res?.homes || [];
          setHomes(list);
          if (list.length > 0) {
            const firstHomeId = list[0].id || list[0].home_id;
            setVisitorForm((prev) => ({ ...prev, home_id: prev.home_id || firstHomeId }));
            setCourierForm((prev) => ({ ...prev, home_id: prev.home_id || firstHomeId }));
            setDeliveryForm((prev) => ({ ...prev, home_id: prev.home_id || firstHomeId }));
            setVehicleForm((prev) => ({ ...prev, home_id: prev.home_id || firstHomeId }));
          }
        })
        .catch(() => {});
    } catch (err) {
      console.log('Error loading security dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleOpenEntryModal = (type) => {
    setActiveModal(type);
  };

  // Submit Handlers
  const handleVisitorSubmit = async () => {
    if (!visitorForm.name.trim() || !visitorForm.phone.trim()) {
      Alert.alert('Required Fields', 'Please enter visitor full name and phone number.');
      return;
    }
    setSubmittingEntry(true);
    try {
      await visitorApi.createVisitorEntry({
        visitor_name: visitorForm.name.trim(),
        phone_number: visitorForm.phone.trim(),
        visiting_home: visitorForm.home_id || homes[0]?.id || 1,
        visitor_type: 'GUEST',
        purpose: visitorForm.purpose || 'Personal Visit',
        vehicle_number: visitorForm.vehicle_number ? visitorForm.vehicle_number.trim().toUpperCase() : null,
        gate_id: assignedGateInfo?.id || null,
        record_entry_now: true,
      });
      showToast('success', `Gate entry logged for "${visitorForm.name}". Status: ENTERED`);
      setActiveModal(null);
      setVisitorForm({
        name: '',
        phone: '',
        home_id: homes[0]?.id || 1,
        purpose: 'Personal Visit',
        vehicle_number: '',
      });
      fetchDashboardData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record visitor entry.');
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleCourierSubmit = async () => {
    if (!courierForm.recipient_name.trim()) {
      Alert.alert('Required Field', 'Please enter recipient name.');
      return;
    }
    setSubmittingEntry(true);
    try {
      await securityApi.recordGateEntry({
        name: courierForm.recipient_name.trim(),
        phone: 'N/A',
        home_id: courierForm.home_id || homes[0]?.id || 1,
        visitor_type: 'DELIVERY',
        purpose: `Courier: ${courierForm.company} (${courierForm.tracking_number || 'Standard Parcel'})`,
        entry_type: 'COURIER',
        gate_id: assignedGateInfo?.id || null,
      });
      showToast('success', `Courier package from ${courierForm.company} recorded at gate.`);
      setActiveModal(null);
      setCourierForm({
        company: 'BlueDart',
        tracking_number: '',
        home_id: homes[0]?.id || 1,
        recipient_name: '',
      });
      fetchDashboardData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record courier.');
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleDeliverySubmit = async () => {
    if (!deliveryForm.person_name.trim()) {
      Alert.alert('Required Field', 'Please enter delivery agent name.');
      return;
    }
    setSubmittingEntry(true);
    try {
      await securityApi.recordGateEntry({
        name: `${deliveryForm.company} - ${deliveryForm.person_name.trim()}`,
        phone: deliveryForm.phone || '9999999999',
        home_id: deliveryForm.home_id || homes[0]?.id || 1,
        visitor_type: 'DELIVERY',
        purpose: `Food / Grocery Delivery (${deliveryForm.company})`,
        vehicle_number: deliveryForm.vehicle_number ? deliveryForm.vehicle_number.trim().toUpperCase() : null,
        entry_type: 'DELIVERY',
        gate_id: assignedGateInfo?.id || null,
      });
      showToast('success', `Delivery agent from ${deliveryForm.company} checked in at gate.`);
      setActiveModal(null);
      setDeliveryForm({
        company: 'Blinkit',
        person_name: '',
        phone: '',
        home_id: homes[0]?.id || 1,
        vehicle_number: '',
      });
      fetchDashboardData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record delivery.');
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleWorkerSubmit = async () => {
    const code = workerPasscode.trim().toUpperCase();
    if (!code && !selectedWorkerId) {
      Alert.alert('Worker Verification', 'Please enter a worker passcode or select a registered worker.');
      return;
    }
    setSubmittingEntry(true);
    const workerList = dashboardData?.workers || [];
    const matched = workerList.find(
      (w) => String(w.id) === String(selectedWorkerId) || (w.pass_code && w.pass_code.toUpperCase() === code)
    );
    const workerName = matched?.full_name || (code ? `Domestic Staff (${code})` : 'Domestic Staff');
    const workerPhone = matched?.phone || 'N/A';
    const workerType = matched?.worker_type || 'Domestic Worker';

    try {
      await securityApi.recordGateEntry({
        name: workerName,
        phone: workerPhone,
        home_id: homes[0]?.id || 1,
        visitor_type: 'SERVICE_TECHNICIAN',
        purpose: `Domestic Worker Passcode Entry (${workerType})`,
        entry_type: 'WORKER',
        gate_id: assignedGateInfo?.id || null,
      });
      showToast('success', `Worker pass verified & entry recorded for "${workerName}".`);
      setActiveModal(null);
      setWorkerPasscode('');
      setSelectedWorkerId('');
      fetchDashboardData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to verify worker entry.');
    } finally {
      setSubmittingEntry(false);
    }
  };

  const handleVehicleSubmit = async () => {
    if (!vehicleForm.vehicle_number.trim()) {
      Alert.alert('Required Field', 'Please enter vehicle registration number.');
      return;
    }
    setSubmittingEntry(true);
    try {
      await securityApi.recordGateEntry({
        name: vehicleForm.driver_name.trim() || 'Vehicle Driver',
        phone: 'N/A',
        home_id: vehicleForm.home_id || homes[0]?.id || 1,
        visitor_type: 'CAB_TAXIS',
        purpose: `Vehicle Gate Movement (${vehicleForm.vehicle_type})`,
        vehicle_number: vehicleForm.vehicle_number.trim().toUpperCase(),
        entry_type: 'VEHICLE',
        gate_id: assignedGateInfo?.id || null,
      });
      showToast('success', `Vehicle ${vehicleForm.vehicle_number.toUpperCase()} barrier opened and logged.`);
      setActiveModal(null);
      setVehicleForm({
        vehicle_number: '',
        vehicle_type: 'FOUR_WHEELER',
        home_id: homes[0]?.id || 1,
        driver_name: '',
      });
      fetchDashboardData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record vehicle entry.');
    } finally {
      setSubmittingEntry(false);
    }
  };

  const today = dashboardData?.today_activity || {
    visitors: dashboardData?.summary?.inside_visitors || 0,
    deliveries: dashboardData?.summary?.pending_deliveries || 0,
    couriers: dashboardData?.summary?.gate_couriers || 0,
    workers: dashboardData?.summary?.registered_workers || 0,
    vehicles: 0,
  };

  const userInitial = (user?.fullName || user?.full_name || 'S').charAt(0).toUpperCase();
  const guardName = user?.fullName || user?.full_name || 'Security Officer';
  const societyName = societyInfo?.name || user?.societyName || 'Suncity Paradise';
  const societyCode = societyInfo?.code || user?.societyCode || 'SUNCIT-951';

  // 5 KPI cards for Today's Activity matching frontend UI specification
  const activityKpiCards = [
    {
      id: 'visitors',
      title: 'VISITORS',
      count: today.visitors ?? 0,
      subtitle: 'Guests & Personal Visits',
      icon: UserCheck,
      color: '#0284c7',
      borderColor: '#0284c7',
      bgLight: 'rgba(2, 132, 199, 0.08)',
    },
    {
      id: 'deliveries',
      title: 'DELIVERIES',
      count: today.deliveries ?? 0,
      subtitle: 'Food & Grocery Agents',
      icon: Truck,
      color: THEME.colors.fernGreenDark || '#16a34a',
      borderColor: THEME.colors.fernGreenDark || '#16a34a',
      bgLight: 'rgba(22, 163, 74, 0.08)',
    },
    {
      id: 'couriers',
      title: 'COURIERS',
      count: today.couriers ?? 0,
      subtitle: 'Parcels & Packages',
      icon: Package,
      color: THEME.colors.clay || '#C49A6C',
      borderColor: THEME.colors.clay || '#C49A6C',
      bgLight: 'rgba(196, 154, 108, 0.1)',
    },
    {
      id: 'workers',
      title: 'WORKERS',
      count: today.workers ?? 0,
      subtitle: 'Daily Domestic Staff',
      icon: Briefcase,
      color: '#059669',
      borderColor: '#059669',
      bgLight: 'rgba(5, 150, 105, 0.08)',
    },
    {
      id: 'vehicles',
      title: 'VEHICLES',
      count: today.vehicles ?? 0,
      subtitle: 'Gate Barrier Movements',
      icon: Car,
      color: '#0284c7',
      borderColor: '#0284c7',
      bgLight: 'rgba(2, 132, 199, 0.08)',
    },
  ];

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.clay]}
            tintColor={THEME.colors.clay}
          />
        }
      >
        {/* ========================================================
            TOP DARK HEADER SECTION
            Header Avatar, Name and Role
            ======================================================== */}
        <View style={[styles.darkHeader, { paddingTop: Math.max(insets.top, 14) }]}>
          <View style={styles.userProfileRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarInitial}>{userInitial}</Text>
            </View>

            <View style={styles.userInfoCol}>
              <Text style={styles.userName} numberOfLines={1}>
                {guardName}
              </Text>
              <View style={styles.roleTag}>
                <ShieldCheck size={12} color="#E8D5C4" style={{ marginRight: 4 }} />
                <Text style={styles.roleTagText}>SECURITY GUARD</Text>
              </View>
            </View>
          </View>

          {/* Hero Title Matching Mobile App Top Aesthetic */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitleWhite}>Perimeter Security Console</Text>
            <Text style={styles.heroTitleClay}>Gatehouse Management</Text>
          </View>
        </View>

        {/* ========================================================
            HERO CARD OVERLAP: "gatehouse.jpg"
            Same as other home screen inside mobile app top part
            ======================================================== */}
        <View style={styles.heroCardOverlapWrapper}>
          <View style={styles.heroCard}>
            <Image
              source={require('../assets/images/gatehouse.jpg')}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* ========================================================
            LOWER BODY CONTENT
            ======================================================== */}
        <View style={styles.bodyContent}>
          {/* Toast Notification */}
          {toastMessage && (
            <View
              style={[
                styles.toastBanner,
                toastType === 'success' ? styles.toastBannerSuccess : styles.toastBannerError,
              ]}
            >
              {toastType === 'success' ? (
                <CheckCircle2 size={18} color="#15803D" style={{ marginRight: 8 }} />
              ) : (
                <AlertCircle size={18} color="#DC2626" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.toastBannerText}>{toastMessage}</Text>
            </View>
          )}

          {loading && !dashboardData ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.clay} />
              <Text style={styles.loadingText}>Loading security gate console...</Text>
            </View>
          ) : (
            <>
              {/* ========================================================
                  ACTIVE SOCIETY & ASSIGNED GATE STATION CARD
                  ======================================================== */}
              <View style={styles.societyCard}>
                <View style={styles.societyCardHeader}>
                  <Text style={styles.societyCardLabel}>ACTIVE STATION & SOCIETY CONSOLE</Text>
                </View>

                <View style={styles.societyDivider} />

                <View style={styles.societyMainRow}>
                  <View style={styles.societyBadge}>
                    <Building2 size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.societyInfoCol}>
                    <View style={styles.societyNameRow}>
                      <Text style={styles.societyName} numberOfLines={1}>
                        {societyName}
                      </Text>
                      <View style={styles.codePill}>
                        <Text style={styles.codePillText}>Code: {societyCode}</Text>
                      </View>
                    </View>

                    {/* Assigned Checkpoint Station */}
                    <View style={styles.stationRow}>
                      {assignedGateInfo ? (
                        <View style={styles.stationPillActive}>
                          <DoorOpen size={14} color="#065f46" style={{ marginRight: 5 }} />
                          <Text style={styles.stationTextActive} numberOfLines={1}>
                            Station: {assignedGateInfo.name || 'Main Gate'}
                          </Text>
                          {assignedGateInfo.allows_entry_registration && (
                            <Text style={styles.stationSubActive}> • Entry Enabled</Text>
                          )}
                        </View>
                      ) : (
                        <View style={styles.stationPillInactive}>
                          <Shield size={13} color="#b45309" style={{ marginRight: 5 }} />
                          <Text style={styles.stationTextInactive}>
                            Checkpoint: General Gate Console
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* ========================================================
                  GATE VISIT TYPE CARD SAME AS UI INSIDE FRONTEND
                  Circle cards with images: Visitor, Courier, Delivery, Worker, Vehicle
                  When clicked -> Opens Entry Registration Modal
                  ======================================================== */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <DoorOpen size={19} color={THEME.colors.clay} style={{ marginRight: 8 }} />
                  <Text style={styles.sectionTitle}>GATE VISIT TYPE</Text>
                </View>
                <View style={styles.entryNoticeBadge}>
                  <Text style={styles.entryNoticeText}>TAP CARD FOR ENTRY</Text>
                </View>
              </View>

              {/* Horizontal Scroll of the 5 Circle Cards matching frontend UI */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.visitTypeScrollContent}
                style={styles.visitTypeScroll}
              >
                {GATE_VISIT_TYPES.map((vt) => (
                  <TouchableOpacity
                    key={vt.id}
                    style={[
                      styles.visitTypeCard,
                      { borderColor: vt.border },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleOpenEntryModal(vt.id)}
                  >
                    {/* Circle Container with Image */}
                    <View
                      style={[
                        styles.visitTypeCircle,
                        { backgroundColor: vt.circleBg, borderColor: vt.border },
                      ]}
                    >
                      <Image
                        source={vt.image}
                        style={styles.visitTypeImage}
                        resizeMode="contain"
                      />
                    </View>

                    <Text style={styles.visitTypeLabel}>{vt.label}</Text>
                    <Text style={[styles.visitTypeSublabel, { color: vt.color }]}>
                      {vt.sublabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* ========================================================
                  TODAY'S ACTIVITY KPI CARDS
                  Exact match to frontend UI (Visitors, Deliveries, Couriers, Workers, Vehicles)
                  ======================================================== */}
              <View style={[styles.sectionHeader, { marginTop: 22 }]}>
                <View style={styles.sectionHeaderLeft}>
                  <Clock size={19} color="#0284c7" style={{ marginRight: 8 }} />
                  <Text style={styles.sectionTitle}>TODAY'S ACTIVITY</Text>
                </View>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>

              {/* Grid of 5 KPI Cards */}
              <View style={styles.kpiGrid}>
                {activityKpiCards.map((kpi) => {
                  const IconComp = kpi.icon;
                  const isFullWidth = kpi.id === 'vehicles';

                  if (isFullWidth) {
                    return (
                      <View
                        key={kpi.id}
                        style={[
                          styles.kpiCardFull,
                          { borderLeftColor: kpi.borderColor, borderLeftWidth: 4.5 },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Text style={[styles.kpiLabel, { color: kpi.color }]}>
                              {kpi.title}
                            </Text>
                          </View>
                          <Text style={styles.kpiSubtitle}>{kpi.subtitle}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                          <Text style={[styles.kpiCount, { marginBottom: 0 }]}>{kpi.count}</Text>
                          <View style={[styles.kpiIconWrap, { backgroundColor: kpi.bgLight }]}>
                            <IconComp size={18} color={kpi.color} />
                          </View>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View
                      key={kpi.id}
                      style={[
                        styles.kpiCard,
                        { borderLeftColor: kpi.borderColor, borderLeftWidth: 4.5 },
                      ]}
                    >
                      <View style={styles.kpiHeaderRow}>
                        <Text style={[styles.kpiLabel, { color: kpi.color }]}>
                          {kpi.title}
                        </Text>
                        <View style={[styles.kpiIconWrap, { backgroundColor: kpi.bgLight }]}>
                          <IconComp size={18} color={kpi.color} />
                        </View>
                      </View>

                      <Text style={styles.kpiCount}>{kpi.count}</Text>

                      <Text style={styles.kpiSubtitle} numberOfLines={1}>
                        {kpi.subtitle}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Bottom Spacer */}
              <View style={{ height: 40 }} />
            </>
          )}
        </View>
      </ScrollView>

      {/* ========================================================
          ENTRY MODALS FOR EACH GATE VISIT TYPE
          1. VISITOR CHECK-IN
          ======================================================== */}
      <Modal
        visible={activeModal === 'VISITOR'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleLeft}>
                <View style={[styles.modalTitleIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.15)', borderColor: '#06b6d4' }]}>
                  <Image source={require('../assets/images/visitor.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                </View>
                <Text style={styles.modalTitleText}>[ Visitor Check-In ]</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Visitor Full Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Aakash Verma"
                placeholderTextColor={THEME.colors.textDim}
                value={visitorForm.name}
                onChangeText={(text) => setVisitorForm({ ...visitorForm, name: text })}
              />

              <Text style={styles.formLabel}>Visitor Phone Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 9876543210"
                placeholderTextColor={THEME.colors.textDim}
                keyboardType="phone-pad"
                value={visitorForm.phone}
                onChangeText={(text) => setVisitorForm({ ...visitorForm, phone: text })}
              />

              <Text style={styles.formLabel}>Destination Home / Flat</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.homeChipsRow}>
                {homes.map((h) => {
                  const hId = h.id || h.home_id;
                  const isSelected = visitorForm.home_id === hId;
                  return (
                    <TouchableOpacity
                      key={hId}
                      style={[styles.homeChip, isSelected && styles.homeChipActive]}
                      onPress={() => setVisitorForm({ ...visitorForm, home_id: hId })}
                    >
                      <Text style={[styles.homeChipText, isSelected && styles.homeChipTextActive]}>
                        Home {h.home_number} ({h.building_or_wing || 'Flat'})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.formLabel}>Purpose of Visit</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Personal Visit / Guest"
                placeholderTextColor={THEME.colors.textDim}
                value={visitorForm.purpose}
                onChangeText={(text) => setVisitorForm({ ...visitorForm, purpose: text })}
              />

              <Text style={styles.formLabel}>Vehicle Number (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. MH-12-AB-1234"
                placeholderTextColor={THEME.colors.textDim}
                autoCapitalize="characters"
                value={visitorForm.vehicle_number}
                onChangeText={(text) => setVisitorForm({ ...visitorForm, vehicle_number: text })}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#06b6d4' }]}
                  onPress={handleVisitorSubmit}
                  disabled={submittingEntry}
                >
                  {submittingEntry ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Check-In & Record Entry</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          2. COURIER PACKAGE ENTRY MODAL
          ======================================================== */}
      <Modal
        visible={activeModal === 'COURIER'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleLeft}>
                <View style={[styles.modalTitleIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#f59e0b' }]}>
                  <Image source={require('../assets/images/courier.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                </View>
                <Text style={styles.modalTitleText}>[ Courier / Parcel Drop ]</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Courier Service Company</Text>
              <View style={styles.presetOptionsWrap}>
                {['BlueDart', 'DTDC', 'Delhivery', 'Amazon', 'FedEx', 'Other'].map((comp) => (
                  <TouchableOpacity
                    key={comp}
                    style={[
                      styles.presetChip,
                      courierForm.company === comp && styles.presetChipActive,
                    ]}
                    onPress={() => setCourierForm({ ...courierForm, company: comp })}
                  >
                    <Text style={[styles.presetChipText, courierForm.company === comp && styles.presetChipTextActive]}>
                      {comp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Recipient Resident Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Pravin Chauhan"
                placeholderTextColor={THEME.colors.textDim}
                value={courierForm.recipient_name}
                onChangeText={(text) => setCourierForm({ ...courierForm, recipient_name: text })}
              />

              <Text style={styles.formLabel}>Destination Home / Flat</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.homeChipsRow}>
                {homes.map((h) => {
                  const hId = h.id || h.home_id;
                  const isSelected = courierForm.home_id === hId;
                  return (
                    <TouchableOpacity
                      key={hId}
                      style={[styles.homeChip, isSelected && styles.homeChipActive]}
                      onPress={() => setCourierForm({ ...courierForm, home_id: hId })}
                    >
                      <Text style={[styles.homeChipText, isSelected && styles.homeChipTextActive]}>
                        Home {h.home_number}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.formLabel}>Tracking Number / AWB (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. BD-892348"
                placeholderTextColor={THEME.colors.textDim}
                value={courierForm.tracking_number}
                onChangeText={(text) => setCourierForm({ ...courierForm, tracking_number: text })}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={handleCourierSubmit}
                  disabled={submittingEntry}
                >
                  {submittingEntry ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Log Parcel at Gate</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          3. DELIVERY AGENT ENTRY MODAL
          ======================================================== */}
      <Modal
        visible={activeModal === 'DELIVERY'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleLeft}>
                <View style={[styles.modalTitleIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' }]}>
                  <Image source={require('../assets/images/delivery.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                </View>
                <Text style={styles.modalTitleText}>[ Delivery Agent Entry ]</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Delivery Company / App</Text>
              <View style={styles.presetOptionsWrap}>
                {['Blinkit', 'Swiggy', 'Zomato', 'Zepto', 'Amazon', 'Instamart', 'Other'].map((comp) => (
                  <TouchableOpacity
                    key={comp}
                    style={[
                      styles.presetChip,
                      deliveryForm.company === comp && styles.presetChipActive,
                    ]}
                    onPress={() => setDeliveryForm({ ...deliveryForm, company: comp })}
                  >
                    <Text style={[styles.presetChipText, deliveryForm.company === comp && styles.presetChipTextActive]}>
                      {comp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Delivery Person Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={THEME.colors.textDim}
                value={deliveryForm.person_name}
                onChangeText={(text) => setDeliveryForm({ ...deliveryForm, person_name: text })}
              />

              <Text style={styles.formLabel}>Contact Phone Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 9823456789"
                placeholderTextColor={THEME.colors.textDim}
                keyboardType="phone-pad"
                value={deliveryForm.phone}
                onChangeText={(text) => setDeliveryForm({ ...deliveryForm, phone: text })}
              />

              <Text style={styles.formLabel}>Destination Home / Flat</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.homeChipsRow}>
                {homes.map((h) => {
                  const hId = h.id || h.home_id;
                  const isSelected = deliveryForm.home_id === hId;
                  return (
                    <TouchableOpacity
                      key={hId}
                      style={[styles.homeChip, isSelected && styles.homeChipActive]}
                      onPress={() => setDeliveryForm({ ...deliveryForm, home_id: hId })}
                    >
                      <Text style={[styles.homeChipText, isSelected && styles.homeChipTextActive]}>
                        Home {h.home_number}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.formLabel}>Vehicle Number (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. MH-12-CZ-9801"
                placeholderTextColor={THEME.colors.textDim}
                autoCapitalize="characters"
                value={deliveryForm.vehicle_number}
                onChangeText={(text) => setDeliveryForm({ ...deliveryForm, vehicle_number: text })}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleDeliverySubmit}
                  disabled={submittingEntry}
                >
                  {submittingEntry ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Authorize Delivery Entry</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          4. WORKER / DOMESTIC STAFF PASSCODE ENTRY MODAL
          ======================================================== */}
      <Modal
        visible={activeModal === 'WORKER'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleLeft}>
                <View style={[styles.modalTitleIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: '#8b5cf6' }]}>
                  <Image source={require('../assets/images/worker.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                </View>
                <Text style={styles.modalTitleText}>[ Worker / Staff Passcode ]</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Enter Worker Daily Passcode</Text>
              <TextInput
                style={[styles.formInput, { fontSize: 18, fontWeight: '800', letterSpacing: 2, textAlign: 'center' }]}
                placeholder="e.g. 543210 or WRK-01"
                placeholderTextColor={THEME.colors.textDim}
                autoCapitalize="characters"
                value={workerPasscode}
                onChangeText={setWorkerPasscode}
              />

              <Text style={[styles.formLabel, { marginTop: 14 }]}>Or Select Registered Worker</Text>
              <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                {(dashboardData?.workers || []).map((w) => {
                  const isSelected = selectedWorkerId === String(w.id);
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={[styles.workerSelectRow, isSelected && styles.workerSelectRowActive]}
                      onPress={() => {
                        setSelectedWorkerId(String(w.id));
                        if (w.pass_code) setWorkerPasscode(w.pass_code);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.workerSelectName}>{w.full_name}</Text>
                        <Text style={styles.workerSelectSub}>{w.worker_type} • Code: {w.pass_code || 'VERIFIED'}</Text>
                      </View>
                      <Text style={styles.workerSelectHomes}>{w.active_homes ? `Homes: ${w.active_homes}` : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#8b5cf6' }]}
                  onPress={handleWorkerSubmit}
                  disabled={submittingEntry}
                >
                  {submittingEntry ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Verify & Record Entry</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          5. VEHICLE BARRIER ENTRY MODAL
          ======================================================== */}
      <Modal
        visible={activeModal === 'VEHICLE'}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleLeft}>
                <View style={[styles.modalTitleIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6' }]}>
                  <Image source={require('../assets/images/vehicle.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                </View>
                <Text style={styles.modalTitleText}>[ Vehicle Barrier Entry ]</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Vehicle Registration Plate *</Text>
              <TextInput
                style={[styles.formInput, { fontSize: 17, fontWeight: '800', letterSpacing: 1.5 }]}
                placeholder="e.g. MH-12-AB-1234"
                placeholderTextColor={THEME.colors.textDim}
                autoCapitalize="characters"
                value={vehicleForm.vehicle_number}
                onChangeText={(text) => setVehicleForm({ ...vehicleForm, vehicle_number: text })}
              />

              <Text style={styles.formLabel}>Vehicle Classification</Text>
              <View style={styles.presetOptionsWrap}>
                {[
                  { id: 'FOUR_WHEELER', label: 'Car / SUV' },
                  { id: 'TWO_WHEELER', label: '2-Wheeler' },
                  { id: 'CAB_TAXIS', label: 'Cab / Taxi' },
                  { id: 'COMMERCIAL', label: 'Commercial' },
                ].map((vt) => (
                  <TouchableOpacity
                    key={vt.id}
                    style={[
                      styles.presetChip,
                      vehicleForm.vehicle_type === vt.id && styles.presetChipActive,
                    ]}
                    onPress={() => setVehicleForm({ ...vehicleForm, vehicle_type: vt.id })}
                  >
                    <Text style={[styles.presetChipText, vehicleForm.vehicle_type === vt.id && styles.presetChipTextActive]}>
                      {vt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Driver Name (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Suresh Patel"
                placeholderTextColor={THEME.colors.textDim}
                value={vehicleForm.driver_name}
                onChangeText={(text) => setVehicleForm({ ...vehicleForm, driver_name: text })}
              />

              <Text style={styles.formLabel}>Visiting Home / Flat</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.homeChipsRow}>
                {homes.map((h) => {
                  const hId = h.id || h.home_id;
                  const isSelected = vehicleForm.home_id === hId;
                  return (
                    <TouchableOpacity
                      key={hId}
                      style={[styles.homeChip, isSelected && styles.homeChipActive]}
                      onPress={() => setVehicleForm({ ...vehicleForm, home_id: hId })}
                    >
                      <Text style={[styles.homeChipText, isSelected && styles.homeChipTextActive]}>
                        Home {h.home_number}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { backgroundColor: '#3b82f6' }]}
                  onPress={handleVehicleSubmit}
                  disabled={submittingEntry}
                >
                  {submittingEntry ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Open Barrier & Record Entry</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Top Dark Header Section */
  darkHeader: {
    backgroundColor: '#342C26',
    paddingHorizontal: 20,
    paddingBottom: 104,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    ...THEME.shadows.card,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  userInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 154, 108, 0.22)',
    borderWidth: 1,
    borderColor: '#C49A6C',
    borderRadius: THEME.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E8D5C4',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  /* Hero Title */
  heroTitleContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  heroTitleWhite: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  heroTitleClay: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.clay,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginTop: 2,
  },

  /* Overlapping Hero Card */
  heroCardOverlapWrapper: {
    paddingHorizontal: 20,
    marginTop: -90,
    marginBottom: 14,
    zIndex: 10,
    elevation: 8,
  },
  heroCard: {
    width: '100%',
    height: 180,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#2A221C',
    borderWidth: 1.5,
    borderColor: 'rgba(214, 194, 161, 0.45)',
    position: 'relative',
    ...THEME.shadows.float,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  /* Lower Body Content */
  bodyContent: {
    padding: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },

  /* Toast Banner */
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  toastBannerSuccess: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  toastBannerError: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  toastBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    flex: 1,
  },

  /* Active Society & Station Card */
  societyCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 18,
    ...THEME.shadows.card,
  },
  societyCardHeader: {
    marginBottom: 10,
  },
  societyCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  societyDivider: {
    height: 1,
    backgroundColor: THEME.colors.sand,
    marginBottom: 14,
    opacity: 0.7,
  },
  societyMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  societyBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: THEME.colors.darkBrown,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  societyInfoCol: {
    flex: 1,
  },
  societyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  societyName: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    flex: 1,
    marginRight: 8,
  },
  codePill: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.clay,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  stationRow: {
    marginTop: 4,
  },
  stationPillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  stationTextActive: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
  stationSubActive: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  stationPillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  stationTextInactive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  entryNoticeBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
  },
  entryNoticeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
    marginRight: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#b91c1c',
    letterSpacing: 0.5,
  },

  /* Gate Visit Type Circle Cards (Frontend Exact Match) */
  visitTypeScroll: {
    marginBottom: 6,
  },
  visitTypeScrollContent: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  visitTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 122,
    marginRight: 12,
    ...THEME.shadows.card,
  },
  visitTypeCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  visitTypeImage: {
    width: 42,
    height: 42,
  },
  visitTypeLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#403630',
  },
  visitTypeSublabel: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },

  /* Today's Activity KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  kpiCardFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    padding: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kpiIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiCount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#403630',
    lineHeight: 34,
    marginBottom: 4,
  },
  kpiSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContentCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.float,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.sand,
  },
  modalTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: '#F9F7F4',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.darkBrown,
  },
  homeChipsRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  homeChip: {
    backgroundColor: '#F3EFEA',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  homeChipActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  homeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  homeChipTextActive: {
    color: '#FFFFFF',
  },
  presetOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  presetChip: {
    backgroundColor: '#F3EFEA',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  presetChipActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  workerSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#F9F7F4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 8,
  },
  workerSelectRowActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8b5cf6',
  },
  workerSelectName: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  workerSelectSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  workerSelectHomes: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3EFEA',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.card,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
