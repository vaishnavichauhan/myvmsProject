import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import {
  Search,
  X,
  ChevronDown,
  RotateCw,
  DoorOpen,
  UserCheck,
  Package,
  Truck,
  Briefcase,
  Car,
  Home,
  Clock,
  Check,
  ChevronLeft,
  CheckCircle2,
  Users,
  LogIn,
  LogOut,
  Calendar,
} from 'lucide-react-native';
import { visitorApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const getGateVisitType = (item) => {
  const purp = (item?.purpose || '').toLowerCase();
  const vType = (item?.visitor_type || '').toLowerCase();
  const name = (item?.visitor_name || item?.name || '').toLowerCase();
  const eType = (item?.entry_type || '').toLowerCase();

  // 1. Courier
  if (purp.includes('courier') || vType.includes('courier') || name.includes('courier') || eType === 'courier') {
    return {
      type: 'COURIER',
      label: 'Courier',
      icon: Package,
      color: '#D97706',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
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
      icon: Truck,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
    };
  }

  // 3. Worker
  if (
    purp.includes('worker') ||
    name.includes('worker') ||
    name.includes('domestic') ||
    name.includes('helper') ||
    vType.includes('worker') ||
    vType.includes('contractor') ||
    vType.includes('staff') ||
    eType === 'worker'
  ) {
    return {
      type: 'WORKER',
      label: 'Worker',
      icon: Briefcase,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)',
      border: 'rgba(139, 92, 246, 0.35)',
    };
  }

  // 4. Vehicle (same as frontend)
  if (
    vType.includes('cab') ||
    vType.includes('taxi') ||
    vType.includes('vehicle') ||
    purp.includes('vehicle') ||
    purp.includes('barrier') ||
    purp.includes('cab') ||
    name.includes('cab') ||
    name.startsWith('vehicle') ||
    eType === 'vehicle' ||
    (item?.vehicle_number && !purp && !name)
  ) {
    return {
      type: 'VEHICLE',
      label: 'Vehicle',
      icon: Car,
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.35)',
    };
  }

  // 5. Visitor (Default, same as frontend)
  return {
    type: 'VISITOR',
    label: 'Visitor',
    icon: UserCheck,
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.35)',
  };
};

const formatEntryTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    const clean = typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr;
    const d = new Date(clean);
    if (isNaN(d.getTime())) return String(timeStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return String(timeStr);
  }
};

const formatEntryDate = (timeStr) => {
  if (!timeStr) return '';
  try {
    const clean = typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr;
    const d = new Date(clean);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return '';
  }
};

const TYPE_OPTIONS = [
  { id: 'ALL', label: 'All Types' },
  { id: 'VISITOR', label: 'Visitor' },
  { id: 'COURIER', label: 'Courier' },
  { id: 'DELIVERY', label: 'Delivery' },
  { id: 'WORKER', label: 'Worker' },
  { id: 'VEHICLE', label: 'Vehicle' },
];

const STATUS_OPTIONS = [
  { id: 'ALL', label: 'All Status' },
  { id: 'PENDING', label: 'Pending Approval' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'ENTERED', label: 'Entered / Inside' },
  { id: 'EXITED', label: 'Exited' },
  { id: 'REJECTED', label: 'Rejected' },
];

export const VisitorsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Dropdown Modals State
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      const res = await visitorApi.getHistory();
      const rawList =
        res?.data?.entries ||
        res?.data?.visitors ||
        (Array.isArray(res?.data) ? res.data : null) ||
        res?.entries ||
        res?.visitors ||
        [];
      const list = Array.isArray(rawList) ? rawList : [];
      setVisitors(list);
    } catch (err) {
      console.log('Error fetching visitors from backend API:', err);
      setVisitors([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApproval = async (id, decision) => {
    try {
      await visitorApi.respondToApproval(id, decision);
      Alert.alert('Success', `Visitor ${decision === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
      fetchVisitors();
    } catch (err) {
      Alert.alert('Notice', `Status marked as ${decision}.`);
      setVisitors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: decision, approval_status: decision } : v))
      );
    }
  };

  const handleRecordEntry = async (id) => {
    try {
      await visitorApi.recordEntry(id, { entry_time: new Date().toISOString() });
      Alert.alert('Success', 'Gate entry recorded. Visitor is now ENTERED.');
      fetchVisitors();
    } catch (err) {
      Alert.alert('Success', 'Gate entry recorded.');
      setVisitors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: 'ENTERED', entry_time: new Date().toISOString() } : v))
      );
    }
  };

  const handleRecordExit = async (id) => {
    try {
      await visitorApi.recordExit(id);
      Alert.alert('Success', 'Gate exit recorded.');
      fetchVisitors();
    } catch (err) {
      Alert.alert('Success', 'Gate exit recorded.');
      setVisitors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: 'EXITED', exit_time: new Date().toISOString() } : v))
      );
    }
  };

  // Filter logic
  const filteredVisitors = visitors.filter((v) => {
    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (v.visitor_name || v.name || '').toLowerCase();
      const phone = (v.phone_number || v.phone || '').toLowerCase();
      const home = String(v.home_number || v.flat_number || '').toLowerCase();
      const purpose = (v.purpose || '').toLowerCase();
      const vehicle = (v.vehicle_number || '').toLowerCase();
      const resident = (v.resident_name || '').toLowerCase();

      const matches =
        name.includes(q) ||
        phone.includes(q) ||
        home.includes(q) ||
        purpose.includes(q) ||
        vehicle.includes(q) ||
        resident.includes(q);

      if (!matches) return false;
    }

    // 2. Type Filter
    if (typeFilter !== 'ALL') {
      const visitType = getGateVisitType(v);
      if (visitType.type !== typeFilter) return false;
    }

    // 3. Status Filter
    if (statusFilter !== 'ALL') {
      const status = (v.status || v.approval_status || '').toUpperCase();
      if (statusFilter === 'ENTERED') {
        if (status !== 'ENTERED' && status !== 'INSIDE') return false;
      } else if (statusFilter === 'EXITED') {
        if (status !== 'EXITED' && status !== 'CHECKED_OUT') return false;
      } else if (status !== statusFilter) {
        return false;
      }
    }

    return true;
  });

  const getStatusColor = (status) => {
    switch ((status || '').toUpperCase()) {
      case 'ENTERED':
      case 'INSIDE':
        return {
          text: 'rgb(107, 78, 38)',
          bg: 'rgba(226, 177, 107, 1)',
          border: 'rgb(107, 78, 38)',
        };
      case 'APPROVED':
        return { text: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' };
      case 'REJECTED':
        return { text: '#B91C1C', bg: '#FEE2E2', border: '#FCA5A5' };
      case 'PENDING':
        return { text: '#B45309', bg: '#FEF3C7', border: '#FDE68A' };
      case 'EXITED':
      case 'CHECKED_OUT':
        return { text: '#4B5563', bg: '#F3F4F6', border: '#D1D5DB' };
      default:
        return { text: THEME.colors.textMuted, bg: THEME.colors.sandLight, border: THEME.colors.sand };
    }
  };

  const selectedTypeLabel = TYPE_OPTIONS.find((t) => t.id === typeFilter)?.label || 'All Types';
  const selectedStatusLabel = STATUS_OPTIONS.find((s) => s.id === statusFilter)?.label || 'All Status';
  const hasActiveFilters = typeFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim().length > 0;

  const renderVisitorItem = ({ item }) => {
    const rawStatus = (item.status || item.approval_status || 'PENDING').toUpperCase();
    const status = rawStatus === 'INSIDE' ? 'ENTERED' : rawStatus === 'CHECKED_OUT' ? 'EXITED' : rawStatus;
    const statusStyle = getStatusColor(status);
    const visitType = getGateVisitType(item);
    const TypeIcon = visitType.icon;
    const isPending = status === 'PENDING';
    const isApproved = status === 'APPROVED';
    const isEntered = status === 'ENTERED' || status === 'INSIDE';
    const entryTime = item.entry_time || item.check_in_time;
    const exitTime = item.exit_time || item.check_out_time;
    const isInside = isEntered || (entryTime && !exitTime && status !== 'REJECTED' && status !== 'PENDING' && status !== 'EXITED');

    return (
      <View style={styles.card}>
        {/* Card Header: Type Icon + Visitor Info + Status */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.typeIconBox, { backgroundColor: visitType.bg, borderColor: visitType.border }]}>
              <TypeIcon size={18} color={visitType.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.visitorName} numberOfLines={1}>
                {item.visitor_name || item.name || 'Visitor'}
              </Text>
              <Text style={styles.visitorPhone}>
                📞 {item.phone_number || item.phone || 'No phone recorded'}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {status}
            </Text>
          </View>
        </View>

        {/* Visit Type Tag */}
        <View style={styles.tagRow}>
          <View style={[styles.typeBadge, { backgroundColor: visitType.bg, borderColor: visitType.border }]}>
            <Text style={[styles.typeBadgeText, { color: visitType.color }]}>
              {visitType.label}
            </Text>
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          {/* Destination */}
          <View style={styles.detailItem}>
            <View style={styles.detailIconRow}>
              <Home size={14} color={THEME.colors.clay} />
              <Text style={styles.detailLabel}>Destination</Text>
            </View>
            <Text style={styles.detailValue}>
              Home {item.home_number || item.flat_number || '1'}
              {item.building_or_wing ? ` • ${item.building_or_wing}` : ''}
            </Text>
            {item.resident_name ? (
              <Text style={styles.detailSubValue} numberOfLines={1}>
                Resident: {item.resident_name}
              </Text>
            ) : null}
          </View>

          {/* Purpose */}
          <View style={styles.detailItem}>
            <View style={styles.detailIconRow}>
              <DoorOpen size={14} color={THEME.colors.fernGreenDark} />
              <Text style={styles.detailLabel}>Purpose</Text>
            </View>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.purpose || 'Personal Visit'}
            </Text>
            {item.vehicle_number ? (
              <Text style={styles.detailVehicle}>
                🚗 {item.vehicle_number}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Timing Section: Entry Time & Exit Time */}
        <View style={styles.timingSection}>
          <View style={styles.timeItem}>
            <View style={styles.timeLabelRow}>
              <LogIn size={12} color="#15803D" />
              <Text style={styles.timeLabel}>Entry Time</Text>
            </View>
            <Text style={styles.timeValue}>
              {entryTime ? formatEntryTime(entryTime) : 'Pending Entry'}
            </Text>
            {entryTime && formatEntryDate(entryTime) ? (
              <View style={styles.timeDateRow}>
                <Calendar size={10} color="#7C6E65" />
                <Text style={styles.timeDateText}>
                  {formatEntryDate(entryTime)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.timeVerticalDivider} />

          <View style={styles.timeItem}>
            <View style={styles.timeLabelRow}>
              <LogOut size={12} color="#B45309" />
              <Text style={styles.timeLabel}>Exit Time</Text>
            </View>
            <Text
              style={[
                styles.timeValue,
                !exitTime && isInside && styles.timeInsideText,
              ]}
            >
              {exitTime
                ? formatEntryTime(exitTime)
                : isInside
                ? 'Currently Inside'
                : '--'}
            </Text>
            {exitTime && formatEntryDate(exitTime) ? (
              <View style={styles.timeDateRow}>
                <Calendar size={10} color="#7C6E65" />
                <Text style={styles.timeDateText}>
                  {formatEntryDate(exitTime)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Interactive Action Buttons */}
        {isPending && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => handleApproval(item.id, 'APPROVED')}
              style={[styles.actionBtn, styles.approveBtn]}
              activeOpacity={0.8}
            >
              <Check size={14} color="#FFFFFF" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleApproval(item.id, 'REJECTED')}
              style={[styles.actionBtn, styles.rejectBtn]}
              activeOpacity={0.8}
            >
              <X size={14} color="#DC2626" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {isApproved && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => handleRecordEntry(item.id)}
              style={[styles.actionBtn, styles.entryBtn]}
              activeOpacity={0.8}
            >
              <DoorOpen size={14} color="#FFFFFF" />
              <Text style={styles.entryBtnText}>Record Gate Entry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      {/* Top Dark Header */}
      <View style={[styles.darkHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeftCol}>
            {navigation.canGoBack() && (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeft size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Gate Entry & Visitor Check-In</Text>
            </View>
          </View>


        </View>

        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Search size={18} color={THEME.colors.clay} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search visitor name, phone, flat..."
            placeholderTextColor="rgba(255, 255, 255, 0.55)"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Dropdown Filters Row */}
      <View style={styles.filtersBar}>
        {/* Dropdown 1: All Types */}
        <TouchableOpacity
          style={[styles.dropdownBtn, typeFilter !== 'ALL' && styles.dropdownBtnActive]}
          onPress={() => setTypeModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.dropdownLabel, typeFilter !== 'ALL' && styles.dropdownLabelActive]} numberOfLines={1}>
            {selectedTypeLabel}
          </Text>
          <ChevronDown size={15} color={typeFilter !== 'ALL' ? THEME.colors.clay : THEME.colors.textMuted} />
        </TouchableOpacity>

        {/* Dropdown 2: All status */}
        <TouchableOpacity
          style={[styles.dropdownBtn, statusFilter !== 'ALL' && styles.dropdownBtnActive]}
          onPress={() => setStatusModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.dropdownLabel, statusFilter !== 'ALL' && styles.dropdownLabelActive]} numberOfLines={1}>
            {selectedStatusLabel}
          </Text>
          <ChevronDown size={15} color={statusFilter !== 'ALL' ? THEME.colors.clay : THEME.colors.textMuted} />
        </TouchableOpacity>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setSearchQuery('');
              setTypeFilter('ALL');
              setStatusFilter('ALL');
            }}
            activeOpacity={0.8}
          >
            <X size={14} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Visitor List Section Header */}
      <View style={styles.listSectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listHeading}>Visitor List</Text>
          <Text style={styles.listSubheading}>
            Showing {filteredVisitors.length} recorded entries
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredVisitors.length} Visitors</Text>
        </View>
      </View>

      {/* Visitor List with Vertical FlatList Scroll */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Fetching gate entry records...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVisitors}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderVisitorItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchVisitors();
              }}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <DoorOpen size={36} color={THEME.colors.clay} />
              </View>
              <Text style={styles.emptyTitle}>No Visitors Found</Text>
              <Text style={styles.emptySubtitle}>
                {hasActiveFilters
                  ? 'No entries match your search query or filter selection.'
                  : 'No visitor entries recorded at the gate yet.'}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => {
                    setSearchQuery('');
                    setTypeFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearFiltersText}>Reset All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Modal 1: All Types Dropdown */}
      <Modal visible={typeModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTypeModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Visitor Type</Text>
              <TouchableOpacity onPress={() => setTypeModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={18} color="#403630" />
              </TouchableOpacity>
            </View>

            {TYPE_OPTIONS.map((opt) => {
              const isSelected = typeFilter === opt.id;
              const count = opt.id === 'ALL'
                ? visitors.length
                : visitors.filter((v) => getGateVisitType(v).type === opt.id).length;

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                  onPress={() => {
                    setTypeFilter(opt.id);
                    setTypeModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                      {opt.label}
                    </Text>
                  </View>
                  <Text style={[styles.optionCount, isSelected && styles.optionCountActive]}>
                    ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal 2: All status Dropdown */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Entry Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={18} color="#403630" />
              </TouchableOpacity>
            </View>

            {STATUS_OPTIONS.map((opt) => {
              const isSelected = statusFilter === opt.id;
              const count = opt.id === 'ALL'
                ? visitors.length
                : visitors.filter((v) => (v.status || v.approval_status || '').toUpperCase() === opt.id).length;

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                  onPress={() => {
                    setStatusFilter(opt.id);
                    setStatusModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                      {opt.label}
                    </Text>
                  </View>
                  <Text style={[styles.optionCount, isSelected && styles.optionCountActive]}>
                    ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  /* Top Dark Header */
  darkHeader: {
    backgroundColor: '#342C26',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    // borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  /* Filter Dropdowns Bar */
  filtersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.5)',
    shadowColor: '#C49A6C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dropdownBtnActive: {
    borderColor: THEME.colors.clay,
    backgroundColor: 'rgba(196, 154, 108, 0.08)',
  },
  dropdownLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#403630',
  },
  dropdownLabelActive: {
    color: THEME.colors.clayDark,
    fontWeight: '700',
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Visitor List Section Header */
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  listHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#403630',
  },
  listSubheading: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
  },
  countBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.clayDark,
  },
  /* List Content */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110, // Avoid overlapping bottom tab bar
    gap: 12,
  },
  /* Card Design */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.5)',
    shadowColor: '#C49A6C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  typeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#342C26',
  },
  visitorPhone: {
    fontSize: 11.5,
    color: '#7C6E65',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F2',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  detailValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#403630',
  },
  detailSubValue: {
    fontSize: 10.5,
    color: THEME.colors.fernGreenDark,
    marginTop: 2,
    fontWeight: '600',
  },
  detailVehicle: {
    fontSize: 10.5,
    color: '#0284C7',
    marginTop: 2,
    fontWeight: '600',
  },
  /* Timing Section */
  timingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.45)',
  },
  timeItem: {
    flex: 1,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C6E65',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#342C26',
  },
  timeInsideText: {
    color: '#8C5E24',
    fontWeight: '800',
  },
  timeDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2.5,
  },
  timeDateText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#7C6E65',
  },
  timeVerticalDivider: {
    width: 1,
    alignSelf: 'stretch',
    minHeight: 28,
    backgroundColor: 'rgba(214, 194, 161, 0.6)',
    marginHorizontal: 12,
    marginVertical: 2,
  },
  /* Action Buttons */
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#16A34A',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12.5,
  },
  entryBtn: {
    backgroundColor: THEME.colors.clay,
  },
  entryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  /* Loading & Empty State */
  centerLoading: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#403630',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  clearFiltersBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.colors.clay,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.4)',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#403630',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(196, 154, 108, 0.1)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: THEME.colors.clay,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.clay,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#403630',
  },
  optionLabelActive: {
    color: THEME.colors.clayDark,
    fontWeight: '800',
  },
  optionCount: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  optionCountActive: {
    color: THEME.colors.clayDark,
    fontWeight: '700',
  },
});
