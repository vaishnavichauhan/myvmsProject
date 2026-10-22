import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Shield,
  ShieldCheck,
  Plus,
  Phone,
  UserCheck,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Power,
  RefreshCw,
  Clock,
  Building,
  Building2,
  ChevronLeft,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { securityApi, societyApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

// Shift options matching frontend
const SHIFT_OPTIONS = [
  { value: 'ALL', label: 'All Shifts' },
  { value: 'MORNING', label: 'Morning Shift', timing: '06:00 AM - 02:00 PM', color: '#0284c7' },
  { value: 'EVENING', label: 'Evening Shift', timing: '02:00 PM - 10:00 PM', color: '#d97706' },
  { value: 'NIGHT', label: 'Night Shift', timing: '10:00 PM - 06:00 AM', color: '#7c3aed' },
  { value: 'ROTATIONAL', label: 'Rotational Shift', timing: 'Flexible / As Assigned', color: '#059669' },
];

// Status options matching frontend
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active', color: '#10b981' },
  { value: 'INACTIVE', label: 'Inactive', color: '#f43f5e' },
  { value: 'ON_LEAVE', label: 'On Leave', color: '#f59e0b' },
];

const SHIFT_FORM_OPTIONS = [
  { value: 'MORNING', label: 'Morning (06:00 - 14:00)' },
  { value: 'EVENING', label: 'Evening (14:00 - 22:00)' },
  { value: 'NIGHT', label: 'Night (22:00 - 06:00)' },
  { value: 'ROTATIONAL', label: 'Rotational Shift' },
];

const STATUS_FORM_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
  { value: 'ON_LEAVE', label: 'ON LEAVE' },
];

const defaultCreateForm = {
  name: '',
  phone: '',
  password: '',
  employee_id: '',
  photo: '',
  agency_name: 'In-House Security Staff',
  shift: 'ROTATIONAL',
  status: 'ACTIVE',
  society_id: null,
};

const defaultEditForm = {
  id: null,
  name: '',
  phone: '',
  employee_id: '',
  photo: '',
  agency_name: '',
  shift: 'ROTATIONAL',
  status: 'ACTIVE',
  society_id: null,
};

export const SecurityGateScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isAdmin = !user?.role || user?.role === 'ADMIN' || user?.role === 'RESIDENTIAL_ADMIN';

  // Data states
  const [staffList, setStaffList] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Filter pickers
  const [showShiftPicker, setShowShiftPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showSocietyPicker, setShowSocietyPicker] = useState(false);

  // Form pickers for Register New Security Staff
  const [showFormSocietyPicker, setShowFormSocietyPicker] = useState(false);
  const [showFormShiftPicker, setShowFormShiftPicker] = useState(false);
  const [showFormStatusPicker, setShowFormStatusPicker] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [editForm, setEditForm] = useState(defaultEditForm);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const socRes = await societyApi.getSocieties().catch(() => ({ data: { societies: [] } }));
      const socList = socRes.data?.societies || socRes.societies || [];
      setSocieties(socList);
      if (socList.length > 0) {
        setCreateForm((p) => ({ ...p, society_id: socList[0].id }));
      }
      await fetchStaff('ALL');
    } catch (err) {
      console.log('Error initializing security staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async (socId = selectedSocietyId) => {
    try {
      const params = {};
      if (socId && socId !== 'ALL') {
        params.society_id = socId;
      }
      const res = await securityApi.getSecurityStaff(params);
      const list =
        res.data?.staffList ||
        res.data?.staff ||
        res.data?.guards ||
        (Array.isArray(res.data) ? res.data : []);
      setStaffList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Error fetching security staff:', err);
      showToastError(err.message || 'Failed to fetch security staff.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStaff(selectedSocietyId);
  };

  const showToastSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showToastError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Filtered staff list
  const filteredList = useMemo(() => {
    return (staffList || []).filter((staff) => {
      if (!staff) return false;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q.trim() ||
        (staff.full_name && staff.full_name.toLowerCase().includes(q)) ||
        (staff.phone && staff.phone.includes(q)) ||
        (staff.employee_id && staff.employee_id.toLowerCase().includes(q)) ||
        (staff.badge_number && staff.badge_number.toLowerCase().includes(q)) ||
        (staff.agency_name && staff.agency_name.toLowerCase().includes(q));

      const matchShift = filterShift === 'ALL' || (staff.shift || '').toUpperCase() === filterShift;
      const matchStatus = filterStatus === 'ALL' || (staff.status || '').toUpperCase() === filterStatus;

      return matchSearch && matchShift && matchStatus;
    });
  }, [staffList, searchTerm, filterShift, filterStatus]);

  const handleCallPhone = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Phone', `Contact: ${phone}`);
    });
  };

  // Actions: Register Security Staff
  const handleOpenCreateModal = () => {
    const defaultSoc = selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0]?.id || 1;
    setCreateForm({
      ...defaultCreateForm,
      society_id: defaultSoc,
    });
    setShowFormSocietyPicker(false);
    setShowFormShiftPicker(false);
    setShowFormStatusPicker(false);
    setShowCreateModal(true);
  };

  const handleCreateStaff = async () => {
    if (!createForm.name.trim()) {
      Alert.alert('Required', 'Please enter security staff full name.');
      return;
    }
    if (!createForm.phone.trim() || createForm.phone.trim().length < 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!createForm.employee_id.trim()) {
      Alert.alert('Required', 'Please enter an Employee / Badge ID.');
      return;
    }
    if (!createForm.password.trim() || createForm.password.trim().length < 6) {
      Alert.alert('Required', 'Initial password must be at least 6 characters long.');
      return;
    }

    setSaving(true);
    try {
      const targetSoc =
        createForm.society_id || (selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0]?.id || 1);
      await securityApi.createSecurityStaff({
        ...createForm,
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password.trim(),
        employee_id: createForm.employee_id.trim(),
        agency_name: createForm.agency_name ? createForm.agency_name.trim() : 'In-House Security Staff',
        photo: createForm.photo ? createForm.photo.trim() : '',
        shift: createForm.shift || 'ROTATIONAL',
        status: createForm.status || 'ACTIVE',
        society_id: targetSoc,
      });

      showToastSuccess(`Security staff "${createForm.name}" registered successfully!`);
      setShowCreateModal(false);
      setShowFormSocietyPicker(false);
      setShowFormShiftPicker(false);
      setShowFormStatusPicker(false);
      setCreateForm(defaultCreateForm);
      fetchStaff(selectedSocietyId);
    } catch (err) {
      showToastError(err.message || 'Failed to create security staff.');
    } finally {
      setSaving(false);
    }
  };

  // Actions: Edit Security Staff
  const handleOpenEdit = (staff) => {
    setSelectedStaff(staff);
    setEditForm({
      id: staff.id,
      name: staff.full_name || '',
      phone: staff.phone || '',
      employee_id: staff.employee_id || staff.badge_number || '',
      photo: staff.avatar_url || '',
      agency_name: staff.agency_name || '',
      shift: (staff.shift || 'ROTATIONAL').toUpperCase(),
      status: staff.status || 'ACTIVE',
      society_id: staff.society_id || societies[0]?.id || 1,
    });
    setShowEditModal(true);
  };

  const handleUpdateStaff = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Required', 'Staff name is required.');
      return;
    }
    setSaving(true);
    try {
      await securityApi.updateSecurityStaff(selectedStaff.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        employee_id: editForm.employee_id.trim(),
        agency_name: editForm.agency_name.trim(),
        shift: editForm.shift,
        status: editForm.status,
        society_id: editForm.society_id,
      });
      showToastSuccess(`Updated security staff member "${editForm.name}".`);
      setShowEditModal(false);
      fetchStaff(selectedSocietyId);
    } catch (err) {
      showToastError(err.message || 'Failed to update security staff.');
    } finally {
      setSaving(false);
    }
  };

  // Actions: Status Toggle
  const handleToggleStatus = (staff) => {
    const nextStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    Alert.alert(
      'Change Staff Status',
      `Mark "${staff.full_name}" as ${nextStatus}? ${nextStatus === 'INACTIVE'
        ? 'Gate login access will be temporarily revoked.'
        : 'Gate access and guard credentials will be restored.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await securityApi.updateSecurityStaffStatus(staff.id, nextStatus);
              showToastSuccess(`"${staff.full_name}" is now marked as ${nextStatus}.`);
              fetchStaff(selectedSocietyId);
            } catch (err) {
              showToastError(err.message || 'Failed to change staff status.');
            }
          },
        },
      ]
    );
  };

  // Actions: Reset Password
  const handleOpenResetPassword = (staff) => {
    setSelectedStaff(staff);
    setNewPasswordInput('');
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters long.');
      return;
    }
    setSaving(true);
    try {
      await securityApi.resetSecurityStaffPassword(selectedStaff.id, newPasswordInput.trim());
      showToastSuccess(`Password for "${selectedStaff.full_name}" reset successfully.`);
      setShowResetPasswordModal(false);
      setNewPasswordInput('');
    } catch (err) {
      showToastError(err.message || 'Failed to reset password.');
    } finally {
      setSaving(false);
    }
  };

  // Actions: Delete Staff
  const handleDeleteStaff = (staff) => {
    Alert.alert(
      'Remove Security Staff',
      `Are you sure you want to delete "${staff.full_name}" (${staff.employee_id || staff.phone
      })? This will permanently revoke gate access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await securityApi.deleteSecurityStaff(staff.id);
              showToastSuccess(`"${staff.full_name}" removed from security staff.`);
              fetchStaff(selectedSocietyId);
            } catch (err) {
              showToastError(err.message || 'Failed to delete security staff.');
            }
          },
        },
      ]
    );
  };

  // Render Card Item (FlatList)
  const renderStaffCard = ({ item: staff }) => {
    const isActive = staff.status === 'ACTIVE';
    const shiftInfo =
      SHIFT_OPTIONS.find((s) => s.value === (staff.shift || '').toUpperCase()) || {
        label: staff.shift || 'Rotational',
        color: '#059669',
      };

    return (
      <View
        style={[
          styles.staffCard,
          { borderLeftColor: isActive ? '#10b981' : '#f43f5e' },
        ]}
      >
        {/* Card Header Row: Left Avatar + Right Info */}
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: isActive
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(244, 63, 94, 0.12)',
              },
            ]}
          >
            {staff.avatar_url ? (
              <Image source={{ uri: staff.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitial, { color: isActive ? '#059669' : '#e11d48' }]}>
                {staff.full_name?.charAt(0)?.toUpperCase() || 'S'}
              </Text>
            )}
          </View>

          <View style={styles.cardHeaderInfo}>
            <Text style={styles.staffNameText} numberOfLines={1}>
              {staff.full_name || 'Guard Officer'}
            </Text>

            <View style={styles.badgesRow}>
              {/* Employee ID Badge */}
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>
                  ID: {staff.employee_id || staff.badge_number || 'N/A'}
                </Text>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isActive
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(244, 63, 94, 0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: isActive ? '#059669' : '#e11d48' },
                  ]}
                >
                  {staff.status || 'ACTIVE'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Metadata Details Box */}
        <View style={styles.metadataBox}>
          {/* Phone */}
          <TouchableOpacity
            style={styles.metaRow}
            onPress={() => handleCallPhone(staff.phone)}
            activeOpacity={0.7}
          >
            <View style={[styles.metaIconWrap, { backgroundColor: 'rgba(196, 154, 108, 0.15)' }]}>
              <Phone size={13} color={THEME.colors.clay} />
            </View>
            <Text style={styles.metaLabel}>Login Phone:</Text>
            <Text
              style={[styles.metaValue, { color: '#059669', textDecorationLine: 'underline' }]}
            >
              {staff.phone || 'N/A'}
            </Text>
          </TouchableOpacity>

          {/* Shift */}
          <View style={styles.metaRow}>
            <View style={[styles.metaIconWrap, { backgroundColor: 'rgba(107, 142, 90, 0.15)' }]}>
              <Clock size={13} color={THEME.colors.fernGreenDark} />
            </View>
            <Text style={styles.metaLabel}>Shift:</Text>
            <Text style={[styles.metaValue, { color: shiftInfo.color, fontWeight: '700' }]}>
              {shiftInfo.label}
            </Text>
          </View>

          {/* Society */}
          {staff.society_name && (
            <View style={styles.metaRow}>
              <View style={[styles.metaIconWrap, { backgroundColor: 'rgba(196, 154, 108, 0.15)' }]}>
                <Building2 size={13} color={THEME.colors.clay} />
              </View>
              <Text style={styles.metaLabel}>Society:</Text>
              <Text
                style={[styles.metaValue, { color: THEME.colors.clay, fontWeight: '700' }]}
                numberOfLines={1}
              >
                {staff.society_name}
              </Text>
            </View>
          )}

          {/* Agency */}
          <View style={styles.metaRow}>
            <View style={[styles.metaIconWrap, { backgroundColor: 'rgba(214, 194, 161, 0.25)' }]}>
              <Building size={13} color={THEME.colors.darkBrown} />
            </View>
            <Text style={styles.metaLabel}>Agency:</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {staff.agency_name || 'In-House Security Staff'}
            </Text>
          </View>
        </View>

        {/* Action Toolbar Footer */}
        {isAdmin && (
          <View style={styles.cardActionsFooter}>
            {/* Toggle Status (Activate / Deactivate) */}
            <TouchableOpacity
              style={[
                styles.actionBtnStatus,
                {
                  backgroundColor: isActive
                    ? 'rgba(244, 63, 94, 0.1)'
                    : 'rgba(16, 185, 129, 0.1)',
                  borderColor: isActive ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                },
              ]}
              onPress={() => handleToggleStatus(staff)}
              activeOpacity={0.75}
            >
              <Power size={13} color={isActive ? '#e11d48' : '#059669'} />

            </TouchableOpacity>

            <View style={styles.actionButtonsRight}>
              {/* Reset Password */}
              <TouchableOpacity
                style={styles.actionBtnPassword}
                onPress={() => handleOpenResetPassword(staff)}
                activeOpacity={0.75}
              >
                <KeyRound size={13} color="#d97706" />
                {/* <Text style={styles.actionBtnPasswordText}>Password</Text> */}
              </TouchableOpacity>

              {/* Edit */}
              <TouchableOpacity
                style={styles.actionBtnEdit}
                onPress={() => handleOpenEdit(staff)}
                activeOpacity={0.75}
              >
                <Edit2 size={13} color={THEME.colors.darkBrown} />
                {/* <Text style={styles.actionBtnEditText}>Edit</Text> */}
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                style={styles.actionBtnDelete}
                onPress={() => handleDeleteStaff(staff)}
                activeOpacity={0.75}
              >
                <Trash2 size={13} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ========================================================
          1. HEADER (SECURITY STAFF & WATCHMAN)
          ======================================================== */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs');
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={26} color={THEME.colors.darkBrown} />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingLeft: 6 }}>
            <Text style={styles.headerTitle}>Security Staff & Watchman</Text>
          </View>
        </View>
      </View>

      {/* ========================================================
          2. TOAST NOTIFICATIONS
          ======================================================== */}
      {successMsg && (
        <View style={styles.toastSuccess}>
          <CheckCircle2 size={16} color="#15803D" style={{ marginRight: 6 }} />
          <Text style={styles.toastSuccessText}>{successMsg}</Text>
        </View>
      )}

      {errorMsg && (
        <View style={styles.toastError}>
          <AlertCircle size={16} color="#B91C1C" style={{ marginRight: 6 }} />
          <Text style={styles.toastErrorText}>{errorMsg}</Text>
        </View>
      )}

      {/* ========================================================
          3. SEARCH BAR & ACTION BUTTON (SEARCH RIGHT SIDE BUTTON)
          & DROPDOWNS FOR SHIFTS AND STATUS
          (NOTE: NO KPI CARD RENDERED AS REQUESTED)
          ======================================================== */}
      <View style={styles.filterSection}>
        {/* Search Input & Action Button Row */}
        <View style={styles.searchAndButtonRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={THEME.colors.textDim} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, employee ID..."
              placeholderTextColor={THEME.colors.textDim}
              value={searchTerm}
              onChangeText={setSearchTerm}
              clearButtonMode="while-editing"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchTerm('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={THEME.colors.textDim} />
              </TouchableOpacity>
            )}
          </View>

          {/* Button on the right side of search */}
          {isAdmin && (
            <TouchableOpacity
              id="btn-register-security-staff"
              style={styles.btnRegisterStaff}
              activeOpacity={0.85}
              onPress={handleOpenCreateModal}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.btnRegisterStaffText} numberOfLines={1}>
                Register security staff
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdowns Row: Shift & Status (and Society if admin) */}
        <View style={styles.dropdownRow}>
          {/* Shift Dropdown */}
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowShiftPicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownBtnLeft}>
              <Clock size={14} color={THEME.colors.clay} />
              <Text style={styles.dropdownBtnText} numberOfLines={1}>
                {SHIFT_OPTIONS.find((s) => s.value === filterShift)?.label || 'All Shifts'}
              </Text>
            </View>
            <ChevronDown size={14} color={THEME.colors.darkBrown} />
          </TouchableOpacity>

          {/* Status Dropdown */}
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowStatusPicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownBtnLeft}>
              <ShieldCheck
                size={14}
                color={
                  filterStatus === 'ACTIVE'
                    ? '#10b981'
                    : filterStatus === 'INACTIVE'
                      ? '#f43f5e'
                      : THEME.colors.clay
                }
              />
              <Text style={styles.dropdownBtnText} numberOfLines={1}>
                {STATUS_OPTIONS.find((s) => s.value === filterStatus)?.label || 'All Status'}
              </Text>
            </View>
            <ChevronDown size={14} color={THEME.colors.darkBrown} />
          </TouchableOpacity>

          {/* Society Dropdown if multiple */}
          {isAdmin && societies.length > 1 && (
            <TouchableOpacity
              style={[styles.dropdownBtn, { flex: 0.9 }]}
              onPress={() => setShowSocietyPicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.dropdownBtnLeft}>
                <Building2 size={14} color={THEME.colors.clay} />
                <Text style={styles.dropdownBtnText} numberOfLines={1}>
                  {selectedSocietyId === 'ALL'
                    ? 'All Societies'
                    : societies.find((s) => s.id === selectedSocietyId)?.name || 'Society'}
                </Text>
              </View>
              <ChevronDown size={14} color={THEME.colors.darkBrown} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ========================================================
          4. MAIN CONTENT: CARD TYPE UI USING VERTICAL FLATLIST
          ======================================================== */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading security roster...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderStaffCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Shield size={44} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Security Staff Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchTerm || filterShift !== 'ALL' || filterStatus !== 'ALL'
                  ? 'No staff members match the selected filters.'
                  : 'Tap "Register security staff" to add gatekeepers & watchmen.'}
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={handleOpenCreateModal}
                  activeOpacity={0.85}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.emptyAddBtnText}>Register security staff</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ========================================================
          5. MODAL: SHIFT PICKER DROPDOWN
          ======================================================== */}
      <Modal visible={showShiftPicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowShiftPicker(false)}
        >
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Duty Shift</Text>
              <TouchableOpacity onPress={() => setShowShiftPicker(false)}>
                <X size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {SHIFT_OPTIONS.map((s) => {
                const isSelected = filterShift === s.value;
                return (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setFilterShift(s.value);
                      setShowShiftPicker(false);
                    }}
                  >
                    <View>
                      <Text
                        style={[
                          styles.pickerItemText,
                          isSelected && { color: THEME.colors.darkBrown, fontWeight: '800' },
                        ]}
                      >
                        {s.label}
                      </Text>
                      {s.timing && <Text style={styles.pickerItemSub}>{s.timing}</Text>}
                    </View>
                    {isSelected && <Check size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================
          6. MODAL: STATUS PICKER DROPDOWN
          ======================================================== */}
      <Modal visible={showStatusPicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusPicker(false)}
        >
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                <X size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260 }}>
              {STATUS_OPTIONS.map((st) => {
                const isSelected = filterStatus === st.value;
                return (
                  <TouchableOpacity
                    key={st.value}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setFilterStatus(st.value);
                      setShowStatusPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        isSelected && { color: THEME.colors.darkBrown, fontWeight: '800' },
                      ]}
                    >
                      {st.label}
                    </Text>
                    {isSelected && <Check size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================
          7. MODAL: SOCIETY PICKER (ADMIN)
          ======================================================== */}
      <Modal visible={showSocietyPicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSocietyPicker(false)}
        >
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Society</Text>
              <TouchableOpacity onPress={() => setShowSocietyPicker(false)}>
                <X size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedSocietyId === 'ALL' && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedSocietyId('ALL');
                  fetchStaff('ALL');
                  setShowSocietyPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    selectedSocietyId === 'ALL' && { fontWeight: '800' },
                  ]}
                >
                  All Societies ({societies.length})
                </Text>
                {selectedSocietyId === 'ALL' && <Check size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>

              {societies.map((s) => {
                const isSelected = selectedSocietyId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedSocietyId(s.id);
                      fetchStaff(s.id);
                      setShowSocietyPicker(false);
                    }}
                  >
                    <Text
                      style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}
                    >
                      {s.name} ({s.code || `ID: ${s.id}`})
                    </Text>
                    {isSelected && <Check size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================
          8. MODAL: REGISTER NEW SECURITY STAFF (MATCHING FRONTEND UI)
          ======================================================== */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (showFormSocietyPicker) {
            setShowFormSocietyPicker(false);
          } else if (showFormShiftPicker) {
            setShowFormShiftPicker(false);
          } else if (showFormStatusPicker) {
            setShowFormStatusPicker(false);
          } else {
            setShowCreateModal(false);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBottomOverlay}
        >
          <View style={styles.formModalSheet}>
            <View style={styles.formModalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.formModalTitle}>Register New Security Staff</Text>
                <Text style={styles.formModalSubtitle}>
                  Create watchman credentials for gate check-in & gate exit.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowFormSocietyPicker(false);
                  setShowFormShiftPicker(false);
                  setShowFormStatusPicker(false);
                  setShowCreateModal(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Assigned Society */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  ASSIGNED SOCIETY <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdownSelectInput}
                  onPress={() => setShowFormSocietyPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownSelectInputText} numberOfLines={1}>
                    {societies.find((s) => s.id === createForm?.society_id)?.name ||
                      societies[0]?.name ||
                      'Select Society'}{' '}
                    (
                    {societies.find((s) => s.id === createForm?.society_id)?.code ||
                      `ID: ${createForm?.society_id || societies[0]?.id || 1}`}
                    )
                  </Text>
                  <ChevronDown size={16} color={THEME.colors.clay} />
                </TouchableOpacity>
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  FULL NAME <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Ramesh Singh"
                  placeholderTextColor={THEME.colors.textDim}
                  value={createForm?.name || ''}
                  onChangeText={(val) => setCreateForm((p) => ({ ...p, name: val }))}
                />
              </View>

              {/* Phone & Employee ID Row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>
                    PHONE NUMBER (LOGIN ID) <Text style={{ color: '#DC2626' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10-digit mobile"
                    placeholderTextColor={THEME.colors.textDim}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={createForm?.phone || ''}
                    onChangeText={(val) => setCreateForm((p) => ({ ...p, phone: val }))}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>
                    EMPLOYEE / BADGE ID <Text style={{ color: '#DC2626' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. SEC-005"
                    placeholderTextColor={THEME.colors.textDim}
                    value={createForm?.employee_id || ''}
                    onChangeText={(val) => setCreateForm((p) => ({ ...p, employee_id: val }))}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  PASSWORD * (MIN 6 CHARACTERS) <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Create guard password"
                  placeholderTextColor={THEME.colors.textDim}
                  secureTextEntry
                  value={createForm?.password || ''}
                  onChangeText={(val) => setCreateForm((p) => ({ ...p, password: val }))}
                />
              </View>

              {/* Shift & Status Row */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>DUTY SHIFT</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelectInput}
                    onPress={() => setShowFormShiftPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownSelectInputText} numberOfLines={1}>
                      {SHIFT_FORM_OPTIONS.find((s) => s.value === createForm?.shift)?.label ||
                        'Rotational Shift'}
                    </Text>
                    <ChevronDown size={16} color={THEME.colors.clay} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>STATUS</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelectInput}
                    onPress={() => setShowFormStatusPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownSelectInputText} numberOfLines={1}>
                      {createForm?.status || 'ACTIVE'}
                    </Text>
                    <ChevronDown size={16} color={THEME.colors.clay} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Agency Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>AGENCY NAME (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Apex Security Corps / In-House"
                  placeholderTextColor={THEME.colors.textDim}
                  value={createForm?.agency_name || ''}
                  onChangeText={(val) => setCreateForm((p) => ({ ...p, agency_name: val }))}
                />
              </View>

              {/* Photo / Avatar URL */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PHOTO / AVATAR URL (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://..."
                  placeholderTextColor={THEME.colors.textDim}
                  autoCapitalize="none"
                  value={createForm?.photo || ''}
                  onChangeText={(val) => setCreateForm((p) => ({ ...p, photo: val }))}
                />
              </View>
            </ScrollView>

            <View style={styles.formModalActions}>
              <TouchableOpacity
                style={styles.formCancelBtn}
                onPress={() => {
                  setShowFormSocietyPicker(false);
                  setShowFormShiftPicker(false);
                  setShowFormStatusPicker(false);
                  setShowCreateModal(false);
                }}
              >
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.formSubmitBtn}
                onPress={handleCreateStaff}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.formSubmitBtnText}>Save Security Staff</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Assigned Society Picker Overlay */}
          {showFormSocietyPicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowFormSocietyPicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 330, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Assigned Society</Text>
                  <TouchableOpacity
                    onPress={() => setShowFormSocietyPicker(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {societies.map((s) => {
                    const isSelected = createForm?.society_id === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setCreateForm((p) => ({ ...p, society_id: s.id }));
                          setShowFormSocietyPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                          {s.name} ({s.code || `ID: ${s.id}`})
                        </Text>
                        {isSelected && <Check size={16} color={THEME.colors.clay} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Duty Shift Picker Overlay */}
          {showFormShiftPicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowFormShiftPicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 330, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Duty Shift</Text>
                  <TouchableOpacity
                    onPress={() => setShowFormShiftPicker(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                  {SHIFT_FORM_OPTIONS.map((s) => {
                    const isSelected = createForm?.shift === s.value;
                    return (
                      <TouchableOpacity
                        key={s.value}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setCreateForm((p) => ({ ...p, shift: s.value }));
                          setShowFormShiftPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                          {s.label}
                        </Text>
                        {isSelected && <Check size={16} color={THEME.colors.clay} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Status Picker Overlay */}
          {showFormStatusPicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowFormStatusPicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 330, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Status</Text>
                  <TouchableOpacity
                    onPress={() => setShowFormStatusPicker(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  {STATUS_FORM_OPTIONS.map((st) => {
                    const isSelected = createForm?.status === st.value;
                    return (
                      <TouchableOpacity
                        key={st.value}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setCreateForm((p) => ({ ...p, status: st.value }));
                          setShowFormStatusPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                          {st.label}
                        </Text>
                        {isSelected && <Check size={16} color={THEME.colors.clay} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          9. MODAL: EDIT SECURITY STAFF
          ======================================================== */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBottomOverlay}
        >
          <View style={styles.formModalSheet}>
            <View style={styles.formModalHeader}>
              <View>
                <Text style={styles.formModalTitle}>Edit Security Staff</Text>
                <Text style={styles.formModalSubtitle}>
                  Update guard credentials, shift timings, and duty status
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>OFFICER FULL NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm?.name || ''}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, name: val }))}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>PHONE (LOGIN ID)</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="phone-pad"
                    value={editForm?.phone || ''}
                    onChangeText={(val) => setEditForm((p) => ({ ...p, phone: val }))}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>EMPLOYEE / BADGE ID</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm?.employee_id || ''}
                    onChangeText={(val) => setEditForm((p) => ({ ...p, employee_id: val }))}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SECURITY AGENCY</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm?.agency_name || ''}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, agency_name: val }))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ASSIGNED DUTY SHIFT</Text>
                <View style={styles.formChipGrid}>
                  {SHIFT_OPTIONS.filter((s) => s.value !== 'ALL').map((s) => {
                    const isSelected = editForm?.shift === s.value;
                    return (
                      <TouchableOpacity
                        key={s.value}
                        onPress={() => setEditForm((p) => ({ ...p, shift: s.value }))}
                        style={[
                          styles.formShiftChip,
                          isSelected && {
                            backgroundColor: s.color,
                            borderColor: s.color,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.formShiftChipText,
                            isSelected && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GATE LOGIN ACCESS STATUS</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.statusToggleBtn,
                      editForm?.status === 'ACTIVE' && styles.statusToggleBtnActiveGreen,
                    ]}
                    onPress={() => setEditForm((p) => ({ ...p, status: 'ACTIVE' }))}
                  >
                    <ShieldCheck
                      size={14}
                      color={editForm?.status === 'ACTIVE' ? '#15803D' : THEME.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.statusToggleBtnText,
                        editForm?.status === 'ACTIVE' && styles.statusToggleBtnTextActiveGreen,
                      ]}
                    >
                      Active
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusToggleBtn,
                      editForm?.status === 'INACTIVE' && styles.statusToggleBtnActiveRed,
                    ]}
                    onPress={() => setEditForm((p) => ({ ...p, status: 'INACTIVE' }))}
                  >
                    <Power
                      size={14}
                      color={editForm?.status === 'INACTIVE' ? '#DC2626' : THEME.colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.statusToggleBtnText,
                        editForm?.status === 'INACTIVE' && styles.statusToggleBtnTextActiveRed,
                      ]}
                    >
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.formModalActions}>
              <TouchableOpacity
                style={styles.formCancelBtn}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.formSubmitBtn}
                onPress={handleUpdateStaff}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.formSubmitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          10. MODAL: RESET PASSWORD
          ======================================================== */}
      <Modal visible={showResetPasswordModal} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Reset Guard Password</Text>
              <TouchableOpacity onPress={() => setShowResetPasswordModal(false)}>
                <X size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: THEME.colors.textMuted, marginBottom: 12 }}>
              Set a new login password for officer{' '}
              <Text style={{ fontWeight: '800', color: THEME.colors.darkBrown }}>
                "{selectedStaff?.full_name}"
              </Text>{' '}
              (Phone: {selectedStaff?.phone}).
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <TextInput
                style={styles.textInput}
                placeholder="At least 6 characters"
                placeholderTextColor={THEME.colors.textDim}
                secureTextEntry
                value={newPasswordInput}
                onChangeText={setNewPasswordInput}
              />
            </View>

            <View style={[styles.formModalActions, { marginTop: 10 }]}>
              <TouchableOpacity
                style={styles.formCancelBtn}
                onPress={() => setShowResetPasswordModal(false)}
              >
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.formSubmitBtn}
                onPress={handleResetPassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.formSubmitBtnText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  /* Header Section */
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.25)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    letterSpacing: -0.3,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: THEME.colors.sandWell,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },

  /* Toast Alerts */
  toastSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(21, 128, 61, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.3)',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toastSuccessText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '700',
    flex: 1,
  },
  toastError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(185, 28, 28, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.3)',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toastErrorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '700',
    flex: 1,
  },

  /* Filter Section (Search & Dropdowns) */
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    marginBottom: 6,
    gap: 8,
  },
  searchAndButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: THEME.colors.darkBrown,
    fontWeight: '500',
    paddingVertical: 0,
  },
  btnRegisterStaff: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    gap: 6,
    ...THEME.shadows.card,
  },
  btnRegisterStaffText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  dropdownBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dropdownBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },

  /* FlatList Content & Staff Cards */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
  },
  staffCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    ...THEME.shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '900',
  },
  cardHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  staffNameText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  idBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  idBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.clayDark,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* Metadata Box */
  metadataBox: {
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.35)',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    flex: 1,
  },

  /* Card Action Footer */
  cardActionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
  },
  actionBtnStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBtnStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtonsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnPassword: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
  },
  actionBtnPasswordText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  actionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  actionBtnEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  actionBtnDelete: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Empty & Loading States */
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: THEME.colors.white,
    borderRadius: 18,
    padding: 18,
    ...THEME.shadows.card,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.sand,
    marginBottom: 8,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
  },
  pickerItemText: {
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  pickerItemSub: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },

  /* Bottom Sheet Forms */
  modalBottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  formModalSheet: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...THEME.shadows.modal,
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  formModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  formModalSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  textInput: {
    height: 42,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: THEME.colors.darkBrown,
  },
  formChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  formShiftChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  formShiftChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  statusToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  statusToggleBtnActiveGreen: {
    backgroundColor: 'rgba(21, 128, 61, 0.12)',
    borderColor: 'rgba(21, 128, 61, 0.35)',
  },
  statusToggleBtnActiveRed: {
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    borderColor: 'rgba(225, 29, 72, 0.35)',
  },
  statusToggleBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  statusToggleBtnTextActiveGreen: {
    color: '#15803D',
    fontWeight: '800',
  },
  statusToggleBtnTextActiveRed: {
    color: '#DC2626',
    fontWeight: '800',
  },
  formModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
  },
  formCancelBtn: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  formCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  formSubmitBtn: {
    flex: 1.5,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: THEME.colors.clay,
    ...THEME.shadows.card,
  },
  formSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dropdownSelectInput: {
    height: 42,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSelectInputText: {
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
    flex: 1,
  },
  formPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99,
  },
});
