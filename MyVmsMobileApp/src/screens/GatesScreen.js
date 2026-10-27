import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { gateApi, securityApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const GatesScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isSecurity = user?.role === 'SECURITY';
  const isResident = ['OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(user?.role);

  // Data states
  const [gates, setGates] = useState([]);
  const [securityStaffList, setSecurityStaffList] = useState([]);
  const [myAssignedGate, setMyAssignedGate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, CLOSED, UNDER_MAINTENANCE
  const [guardFilter, setGuardFilter] = useState('ALL'); // ALL, ASSIGNED, UNASSIGNED

  // Filter Dropdown overlays
  const [showStatusFilterPicker, setShowStatusFilterPicker] = useState(false);
  const [showGuardFilterPicker, setShowGuardFilterPicker] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGate, setSelectedGate] = useState(null);

  // Form dropdown overlays (inside modals)
  const [showCreateStatusPicker, setShowCreateStatusPicker] = useState(false);
  const [showEditStatusPicker, setShowEditStatusPicker] = useState(false);
  const [showAssignGatePicker, setShowAssignGatePicker] = useState(false);
  const [showAssignStaffPicker, setShowAssignStaffPicker] = useState(false);
  const [showAssignShiftPicker, setShowAssignShiftPicker] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Quick Message Guard Modal State
  const [messagingGuard, setMessagingGuard] = useState(null);
  const [messageText, setMessageText] = useState('');

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    gate_number: '',
    location: '',
    status: 'ACTIVE',
    gate_type: 'MAIN_ENTRY',
    is_automated_barrier: false,
    allows_entry_registration: true,
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    gate_number: '',
    location: '',
    status: 'ACTIVE',
    gate_type: 'MAIN_ENTRY',
    is_automated_barrier: false,
    allows_entry_registration: true,
  });

  // Assign Form State
  const [assignForm, setAssignForm] = useState({
    gate_id: '',
    security_staff_id: '',
    shift: 'MORNING',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const promises = [gateApi.getGates()];

      if (isAdmin) {
        promises.push(securityApi.getSecurityStaff().catch(() => ({ data: { staffList: [] } })));
      } else {
        promises.push(Promise.resolve({ data: { staffList: [] } }));
      }

      if (isSecurity || isAdmin) {
        promises.push(gateApi.getMyAssignedGate().catch(() => ({ data: { has_assignment: false, gate: null } })));
      } else {
        promises.push(Promise.resolve({ data: { has_assignment: false, gate: null } }));
      }

      const [gatesRes, staffRes, assignedRes] = await Promise.all(promises);

      const gatesData = gatesRes.data?.gates || gatesRes.data || [];
      setGates(Array.isArray(gatesData) ? gatesData : []);

      const staffData = staffRes.data?.staffList || staffRes.data || [];
      setSecurityStaffList(Array.isArray(staffData) ? staffData : []);

      if (assignedRes.data?.has_assignment && assignedRes.data?.gate) {
        setMyAssignedGate(assignedRes.data.gate);
      } else {
        setMyAssignedGate(null);
      }
    } catch (err) {
      console.log('Error fetching gates:', err);
      showToastError(err.message || 'Failed to fetch gates data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToastSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showToastError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Quick Preset Helper for Create Modal
  const applyPreset = (preset) => {
    setCreateForm((prev) => ({
      ...prev,
      name: preset.name,
      gate_number: preset.gate_number,
      location: preset.location,
      status: preset.status,
      gate_type: preset.gate_type || 'MAIN_ENTRY',
      is_automated_barrier: preset.barrier || false,
      allows_entry_registration: preset.allows_entry_registration !== undefined ? preset.allows_entry_registration : true,
    }));
  };

  // Quick Example Assignment Helper
  const applyQuickExampleAssign = () => {
    const mainGate = gates.find((g) => (g.name || g.gate_name || '').toLowerCase().includes('main')) || gates[0];
    const rakeshGuard = securityStaffList.find((s) => (s.full_name || '').toLowerCase().includes('rakesh')) || securityStaffList[0];

    if (mainGate && rakeshGuard) {
      setAssignForm({
        gate_id: String(mainGate.id || mainGate.gate_id),
        security_staff_id: String(rakeshGuard.id),
        shift: 'MORNING',
      });
    } else if (mainGate && securityStaffList.length > 0) {
      setAssignForm({
        gate_id: String(mainGate.id || mainGate.gate_id),
        security_staff_id: String(securityStaffList[0].id),
        shift: 'MORNING',
      });
    }
  };

  // Open Edit Gate Modal
  const handleOpenEdit = (gate) => {
    setSelectedGate(gate);
    setEditForm({
      name: gate.name || gate.gate_name || '',
      gate_number: gate.gate_number ? String(gate.gate_number) : '',
      location: gate.location || '',
      status: gate.status || gate.gate_status || 'ACTIVE',
      gate_type: gate.gate_type || 'MAIN_ENTRY',
      is_automated_barrier: Boolean(gate.is_automated_barrier),
      allows_entry_registration: gate.allows_entry_registration !== undefined ? Boolean(gate.allows_entry_registration) : true,
    });
    setShowEditModal(true);
  };

  // Open Assign Staff Modal
  const handleOpenAssign = (gate = null) => {
    const gateId = gate ? String(gate.id || gate.gate_id) : (gates.length > 0 ? String(gates[0].id || gates[0].gate_id) : '');
    const firstStaffId = securityStaffList.length > 0 ? String(securityStaffList[0].id) : '';

    setAssignForm({
      gate_id: gateId,
      security_staff_id: firstStaffId,
      shift: 'MORNING',
    });
    setShowAssignModal(true);
  };

  // Create Gate Handler
  const handleCreateGate = async () => {
    if (!createForm.name.trim()) {
      showToastError('Please enter gate name.');
      return;
    }
    setSubmitting(true);
    try {
      await gateApi.createGate(createForm);
      showToastSuccess(`Gate "${createForm.name}" created successfully!`);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        gate_number: '',
        location: '',
        status: 'ACTIVE',
        gate_type: 'MAIN_ENTRY',
        is_automated_barrier: false,
        allows_entry_registration: true,
      });
      fetchInitialData();
    } catch (err) {
      showToastError(err.message || 'Failed to create gate.');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Gate Handler
  const handleUpdateGate = async () => {
    if (!editForm.name.trim()) {
      showToastError('Please enter gate name.');
      return;
    }
    setSubmitting(true);
    try {
      const gateId = selectedGate.id || selectedGate.gate_id;
      await gateApi.updateGate(gateId, editForm);
      showToastSuccess(`Gate "${editForm.name}" updated successfully!`);
      setShowEditModal(false);
      fetchInitialData();
    } catch (err) {
      showToastError(err.message || 'Failed to update gate.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Gate Handler
  const handleDeleteGate = (gate) => {
    const gateId = gate.id || gate.gate_id;
    const gateName = gate.name || gate.gate_name || 'this gate';

    Alert.alert(
      'Delete Gate',
      `Are you sure you want to delete "${gateName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await gateApi.deleteGate(gateId);
              showToastSuccess(`Gate "${gateName}" deleted.`);
              fetchInitialData();
            } catch (err) {
              showToastError(err.message || 'Failed to delete gate.');
            }
          },
        },
      ]
    );
  };

  // Security Self Check-In (IN TIME)
  const handleSecurityCheckIn = async (gate) => {
    const gateId = gate.id || gate.gate_id;
    const gateName = gate.name || gate.gate_name;
    setSubmitting(true);
    try {
      const res = await gateApi.selfCheckIn({ gate_id: gateId });
      showToastSuccess(res.message || `Checked in at ${gateName}! IN TIME logged.`);
      fetchInitialData();
    } catch (err) {
      showToastError(err.response?.data?.message || err.message || 'Failed to check in to gate.');
    } finally {
      setSubmitting(false);
    }
  };

  // Security Self Check-Out (EXIT GATE / OUT TIME)
  const handleSecurityCheckOut = () => {
    Alert.alert(
      'Exit Gate Duty',
      'Are you sure you want to exit your active gate duty? Your exit time will be recorded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit Gate',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await gateApi.selfCheckOut();
              showToastSuccess(res.message || 'Checked out from gate. Exit time recorded.');
              setMyAssignedGate(null);
              fetchInitialData();
            } catch (err) {
              showToastError(err.response?.data?.message || err.message || 'Failed to exit gate.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Call Guard Handler
  const handleCallGuard = (guard) => {
    if (!guard.security_phone) {
      Alert.alert('Phone Unavailable', `No phone number registered for ${guard.security_name}`);
      return;
    }
    Linking.openURL(`tel:${guard.security_phone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  // Open Message Modal
  const handleOpenMessageGuard = (guard, gateName) => {
    setMessagingGuard({
      guardName: guard.security_name,
      guardPhone: guard.security_phone,
      gateName: gateName,
      shift: guard.shift,
    });
    setMessageText('');
  };

  // Send WhatsApp
  const handleSendWhatsApp = () => {
    if (!messagingGuard?.guardPhone) {
      Alert.alert('Phone Unavailable', 'No phone registered for this guard.');
      return;
    }
    const cleanPhone = messagingGuard.guardPhone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText || 'Hello, resident from society.')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp.');
    });
  };

  // Send SMS
  const handleSendSMS = () => {
    if (!messagingGuard?.guardPhone) {
      Alert.alert('Phone Unavailable', 'No phone registered for this guard.');
      return;
    }
    const url = `sms:${messagingGuard.guardPhone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(messageText || 'Hello, resident from society.')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open messaging app.');
    });
  };

  // Filtered Gates Memo
  const filteredGates = useMemo(() => {
    return gates.filter((g) => {
      const name = (g.name || g.gate_name || '').toLowerCase();
      const num = String(g.gate_number || '').toLowerCase();
      const loc = (g.location || '').toLowerCase();
      const status = (g.status || g.gate_status || 'ACTIVE').toUpperCase();
      const guardName = g.security_name || g.assigned_security?.name;

      const matchesSearch =
        !searchQuery.trim() ||
        name.includes(searchQuery.toLowerCase()) ||
        num.includes(searchQuery.toLowerCase()) ||
        loc.includes(searchQuery.toLowerCase()) ||
        (guardName && guardName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesGuard =
        guardFilter === 'ALL' ||
        (guardFilter === 'ASSIGNED' && Boolean(guardName)) ||
        (guardFilter === 'UNASSIGNED' && !guardName);

      return matchesSearch && matchesStatus && matchesGuard;
    });
  }, [gates, searchQuery, statusFilter, guardFilter]);

  // Counts
  const totalGates = gates.length;
  const activeGates = gates.filter((g) => (g.status || g.gate_status) === 'ACTIVE').length;
  const guardsOnDuty = gates.filter((g) => g.security_name || g.assigned_security?.name).length;
  const societyName = gates[0]?.society_name || user?.societyName || 'Our Society';

  // Render Gate Item
  const renderGateCard = ({ item: g }) => {
    const gateId = g.id || g.gate_id;
    const gateName = g.name || g.gate_name || 'Society Gate';
    const gateNum = g.gate_number || gateId;
    const gateLoc = g.location || 'Society Perimeter Entrance';
    const status = (g.status || g.gate_status || 'ACTIVE').toUpperCase();
    const isActive = status === 'ACTIVE';
    const isClosed = status === 'CLOSED';

    // Assigned guard details
    const guardName = g.security_name || g.assigned_security?.name;
    const guardPhone = g.security_phone || g.assigned_security?.phone;
    const shift = g.shift || g.assigned_security?.shift || 'Morning';
    const badgeNumber = g.badge_number || g.assigned_security?.badge_number || 'SEC-01';
    const agencyName = g.agency_name || g.assigned_security?.agency_name || 'Society Security Staff';
    const isAssignedToMe = myAssignedGate && (myAssignedGate.id === gateId || myAssignedGate.gate_id === gateId);

    const assignedGuards = g.assigned_guards && g.assigned_guards.length > 0
      ? g.assigned_guards
      : (guardName ? [{
        assignment_id: g.assignment_id,
        security_name: guardName,
        security_phone: guardPhone,
        shift: shift,
        badge_number: badgeNumber,
        agency_name: agencyName,
      }] : []);

    const hasGuards = assignedGuards.length > 0;

    return (
      <View
        style={[
          styles.gateCard,
          isAssignedToMe && styles.gateCardAssignedToMe,
        ]}
      >
        {/* 1. TOP SECTION: Gate Identity Header with Dark Gradient */}
        <View style={styles.gateIdentityHeader}>
          <View style={styles.gateIdentityTopRow}>
            <View style={styles.gateNameGroup}>
              <View style={styles.gateIconBox}>
                <CustomIcon name="doorOpen" size={18} color={THEME.colors.clay} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gateTitleText} numberOfLines={1}>
                  {gateName}
                </Text>
                <View style={styles.gateLocationRow}>
                  <CustomIcon name="mapPin" size={13} color="#87CEEB" />
                  <Text style={styles.gateLocationText} numberOfLines={1}>
                    {gateLoc}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.gateBadgesCol}>

              <View
                style={[
                  styles.gateStatusBadge,
                  isActive
                    ? styles.statusActive
                    : isClosed
                      ? styles.statusClosed
                      : styles.statusMaintenance,
                ]}
              >
                <Text
                  style={[
                    styles.gateStatusText,
                    isActive
                      ? styles.textStatusActive
                      : isClosed
                        ? styles.textStatusClosed
                        : styles.textStatusMaintenance,
                  ]}
                >
                  {status}
                </Text>
              </View>
            </View>
          </View>


        </View>

        {/* 2. BOTTOM SECTION: Security on Gate Details */}
        <View style={styles.securitySection}>
          <View style={styles.securitySectionHeader}>
            <View style={styles.securityHeaderLeft}>
              <CustomIcon
                name="shieldCheck"
                size={16}
                color={hasGuards ? '#15803D' : THEME.colors.textDim}
              />
              <Text
                style={[
                  styles.securityHeaderText,
                  { color: hasGuards ? '#15803D' : THEME.colors.textDim },
                ]}
              >
                {hasGuards
                  ? `Security on Gate (${assignedGuards.length} On Duty)`
                  : 'Security on Gate'}
              </Text>
            </View>

            {isSecurity && (
              isAssignedToMe ? (
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#065f46' }}>✓ Active Station</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ backgroundColor: THEME.colors.fernGreen, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                  onPress={() => handleSecurityCheckIn(g)}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>Check In (IN TIME)</Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Guards List */}
          {hasGuards ? (
            <View style={styles.guardListContainer}>
              {assignedGuards.map((guard, idx) => (
                <View key={guard.assignment_id || idx} style={styles.guardCard}>
                  {/* Guard Info Row */}
                  <View style={styles.guardInfoRow}>
                    <View style={styles.guardAvatar}>
                      <Text style={styles.guardAvatarText}>
                        {(guard.security_name || 'S').charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={styles.guardNameRow}>
                        <Text style={styles.guardNameText} numberOfLines={1}>
                          {guard.security_name}
                        </Text>
                        <View style={styles.guardShiftBadge}>
                          <Text style={styles.guardShiftText}>
                            {guard.shift || 'Morning'} Shift
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.guardSubDetailText}>
                        Officer Badge: <Text style={{ color: THEME.colors.clay, fontWeight: '700' }}>{guard.badge_number || (guard.security_staff_id ? `SEC-${guard.security_staff_id}` : 'SEC-01')}</Text>
                        {guard.security_phone ? ` • 📞 ${guard.security_phone}` : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Actions Row */}
                  <View style={styles.guardActionsRow}>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCallGuard(guard)}
                      activeOpacity={0.8}
                    >
                      <CustomIcon name="phoneCall" size={14} color="#FFFFFF" />
                      {/* <Text style={styles.callBtnText}>Call</Text> */}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.messageBtn}
                      onPress={() => handleOpenMessageGuard(guard, gateName)}
                      activeOpacity={0.8}
                    >
                      <CustomIcon name="messageSquare" size={14} color="#FFFFFF" />
                      {/* <Text style={styles.messageBtnText}>Message</Text> */}
                    </TouchableOpacity>

                    {isSecurity && guard.security_user_id === user?.id && (
                      <TouchableOpacity
                        style={styles.endShiftBtn}
                        onPress={handleSecurityCheckOut}
                      >
                        <Text style={styles.endShiftBtnText}>Exit Gate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noGuardBox}>
              <CustomIcon name="doorOpen" size={16} color={THEME.colors.textDim} />
              <Text style={styles.noGuardText}>
                Automated barrier checkpoint • No security officer stationed currently
              </Text>
            </View>
          )}

          {/* Admin Action Toolbar at Card Bottom */}
          {isAdmin && (
            <View style={[styles.cardAdminFooter, { justifyContent: 'flex-end' }]}>

              <View style={styles.editDeleteBtnGroup}>
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => handleOpenEdit(g)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <CustomIcon name="edit" size={14} color={THEME.colors.darkBrown} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.iconActionBtn, styles.deleteBtnBg]}
                  onPress={() => handleDeleteGate(g)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <CustomIcon name="trash" size={14} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title={isSecurity ? 'Gate Activity' : (isAdmin ? 'Society Gates & Security' : 'Society Gates & Assigned Security')}
        showBack={!isSecurity && navigation?.canGoBack ? navigation.canGoBack() : false}
      />

      {/* Pinned / Non-scrolling Top Section (Action buttons, banner, search, and dropdowns) */}
      <View style={styles.topFixedSection}>
        {/* Action Bar (Add Gate, Assign Staff, Refresh) */}
        <View style={styles.topActionBar}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addGateHeaderBtn}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.8}
            >
              <CustomIcon name="plus" size={15} color="#FFFFFF" />
              <Text style={styles.addGateHeaderBtnText}>Add New Gate</Text>
            </TouchableOpacity>
          )}


        </View>

        {/* Security Guard Duty Assignment Banner (If role is SECURITY) */}


        {/* Toast Notifications */}
        {errorMsg && (
          <View style={styles.alertError}>
            <CustomIcon name="alert" size={16} color="#DC2626" />
            <Text style={styles.alertErrorText}>{errorMsg}</Text>
            <TouchableOpacity onPress={() => setErrorMsg(null)}>
              <CustomIcon name="close" size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {successMsg && (
          <View style={styles.alertSuccess}>
            <CustomIcon name="checkCircle" size={16} color="#15803D" />
            <Text style={styles.alertSuccessText}>{successMsg}</Text>
            <TouchableOpacity onPress={() => setSuccessMsg(null)}>
              <CustomIcon name="close" size={14} color="#15803D" />
            </TouchableOpacity>
          </View>
        )}

        {/* Filter & Search Bar */}
        <View style={styles.filterSection}>
          {/* Search Box */}
          <View style={styles.searchBox}>
            <CustomIcon name="search" size={16} color={THEME.colors.clay} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search gates by name, guard, location..."
              placeholderTextColor={THEME.colors.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <CustomIcon name="close" size={14} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Dropdown Buttons */}
          <View style={styles.filterButtonsRow}>
            {/* Status Filter */}
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setShowStatusFilterPicker(true)}
            >
              <Text style={styles.filterChipLabel}>Status:</Text>
              <Text style={styles.filterChipValue}>
                {statusFilter === 'ALL'
                  ? `All (${gates.length})`
                  : statusFilter === 'ACTIVE'
                    ? `Active (${activeGates})`
                    : statusFilter === 'CLOSED'
                      ? 'Closed'
                      : 'Maint.'}
              </Text>
              <CustomIcon name="chevronRight" size={12} color={THEME.colors.textMuted} />
            </TouchableOpacity>

            {/* Guard Filter */}
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => setShowGuardFilterPicker(true)}
            >
              <Text style={styles.filterChipLabel}>Guard:</Text>
              <Text style={styles.filterChipValue}>
                {guardFilter === 'ALL'
                  ? 'All Posts'
                  : guardFilter === 'ASSIGNED'
                    ? `Assigned (${guardsOnDuty})`
                    : `No Guard (${totalGates - guardsOnDuty})`}
              </Text>
              <CustomIcon name="chevronRight" size={12} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable Gate Cards FlatList */}
      <FlatList
        data={filteredGates}
        keyExtractor={(item, index) => String(item.id || item.gate_id || index)}
        renderItem={renderGateCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchInitialData();
            }}
            colors={[THEME.colors.clay]}
            tintColor={THEME.colors.clay}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={THEME.colors.clay} />
              <Text style={styles.loadingText}>Loading society gates & assignments...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <CustomIcon name="doorOpen" size={48} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Gates Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No gates match your search filter.'
                  : isAdmin
                    ? 'Click "+ Add New Gate" above to add Main Gate, Gate 2, Service Gate, or Parking Gate.'
                    : 'No checkpoints registered yet for your society.'}
              </Text>
            </View>
          )
        }
      />

      {/* =========================================================================
          STATUS FILTER PICKER OVERLAY
      ========================================================================== */}
      {showStatusFilterPicker && (
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowStatusFilterPicker(false)}
          />
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Filter by Gate Status</Text>
              <TouchableOpacity onPress={() => setShowStatusFilterPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            {[
              { label: `All Gates (${gates.length})`, value: 'ALL' },
              { label: `Active Only (${activeGates})`, value: 'ACTIVE' },
              { label: `Closed Only (${gates.filter((g) => (g.status || g.gate_status) === 'CLOSED').length})`, value: 'CLOSED' },
              { label: `Under Maintenance (${gates.filter((g) => (g.status || g.gate_status) === 'UNDER_MAINTENANCE').length})`, value: 'UNDER_MAINTENANCE' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pickerItem, statusFilter === opt.value && styles.pickerItemSelected]}
                onPress={() => {
                  setStatusFilter(opt.value);
                  setShowStatusFilterPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, statusFilter === opt.value && { fontWeight: '800' }]}>
                  {opt.label}
                </Text>
                {statusFilter === opt.value && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* =========================================================================
          GUARD FILTER PICKER OVERLAY
      ========================================================================== */}
      {showGuardFilterPicker && (
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowGuardFilterPicker(false)}
          />
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Filter by Security Assignment</Text>
              <TouchableOpacity onPress={() => setShowGuardFilterPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'All Posts', value: 'ALL' },
              { label: `Guard Assigned (${guardsOnDuty})`, value: 'ASSIGNED' },
              { label: `No Guard (${totalGates - guardsOnDuty})`, value: 'UNASSIGNED' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pickerItem, guardFilter === opt.value && styles.pickerItemSelected]}
                onPress={() => {
                  setGuardFilter(opt.value);
                  setShowGuardFilterPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, guardFilter === opt.value && { fontWeight: '800' }]}>
                  {opt.label}
                </Text>
                {guardFilter === opt.value && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* =========================================================================
          CREATE GATE MODAL (Admin Only)
      ========================================================================== */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowCreateModal(false)}
          />
          <View style={styles.formModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Society Gate</Text>
                <Text style={styles.modalSubtitle}>Configure physical checkpoint & access parameters</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <CustomIcon name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Quick Presets */}
              <View style={styles.presetSection}>
                <Text style={styles.presetSectionTitle}>Quick Presets (Tap to autofill):</Text>
                <View style={styles.presetButtonsRow}>
                  {[
                    {
                      name: 'Main Gate',
                      gate_number: '1',
                      location: 'Front Boulevard Entrance',
                      status: 'ACTIVE',
                      gate_type: 'MAIN_ENTRY',
                      barrier: true,
                      allows_entry_registration: true,
                    },
                    {
                      name: 'Gate 2',
                      gate_number: '2',
                      location: 'North Wing Resident Entry',
                      status: 'ACTIVE',
                      gate_type: 'RESIDENT_ONLY',
                      barrier: true,
                      allows_entry_registration: true,
                    },
                    {
                      name: 'Service Gate',
                      gate_number: '3',
                      location: 'Rear Commercial & Delivery Lane',
                      status: 'ACTIVE',
                      gate_type: 'SERVICE_DELIVERY',
                      barrier: false,
                      allows_entry_registration: true,
                    },
                    {
                      name: 'Parking Gate',
                      gate_number: 'P-1',
                      location: 'Basement Parking Ramp Entrance',
                      status: 'ACTIVE',
                      gate_type: 'RESIDENT_ONLY',
                      barrier: true,
                      allows_entry_registration: false,
                    },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.name}
                      style={styles.presetBtn}
                      onPress={() => applyPreset(preset)}
                    >
                      <Text style={styles.presetBtnText}>+ {preset.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Form Fields */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Gate Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Main Gate, Gate 2, Service Gate, Parking Gate"
                  placeholderTextColor={THEME.colors.textDim}
                  value={createForm.name}
                  onChangeText={(val) => setCreateForm((p) => ({ ...p, name: val }))}
                />
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Gate Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 1, 2, P-1"
                    placeholderTextColor={THEME.colors.textDim}
                    value={createForm.gate_number}
                    onChangeText={(val) => setCreateForm((p) => ({ ...p, gate_number: val }))}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Status *</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowCreateStatusPicker(true)}
                  >
                    <Text style={styles.dropdownBtnText}>{createForm.status}</Text>
                    <CustomIcon name="chevronRight" size={14} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Location / Checkpoint Description</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Front Boulevard / North Wing Perimeter"
                  placeholderTextColor={THEME.colors.textDim}
                  value={createForm.location}
                  onChangeText={(val) => setCreateForm((p) => ({ ...p, location: val }))}
                />
              </View>

              {/* Gate Entry Registration Toggle */}
              <TouchableOpacity
                style={[
                  styles.checkboxBanner,
                  createForm.allows_entry_registration && styles.checkboxBannerActive,
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  setCreateForm((p) => ({
                    ...p,
                    allows_entry_registration: !p.allows_entry_registration,
                  }))
                }
              >
                <View
                  style={[
                    styles.checkboxBox,
                    createForm.allows_entry_registration && styles.checkboxBoxChecked,
                  ]}
                >
                  {createForm.allows_entry_registration && (
                    <CustomIcon name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.checkboxTitle}>Gate Entry Registration</Text>
                    {createForm.allows_entry_registration ? (
                      <View style={styles.permitBadge}>
                        <Text style={styles.permitBadgeText}>✓ PERMITTED</Text>
                      </View>
                    ) : (
                      <View style={styles.historyOnlyBadge}>
                        <Text style={styles.historyOnlyBadgeText}>VIEW ONLY</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.checkboxSubText}>
                    Authorized guards at this gate can register visitor, courier, delivery & cab entries.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Automated Barrier Toggle */}
              <TouchableOpacity
                style={[
                  styles.checkboxBanner,
                  createForm.is_automated_barrier && styles.checkboxBannerActive,
                  { marginTop: 10 },
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  setCreateForm((p) => ({
                    ...p,
                    is_automated_barrier: !p.is_automated_barrier,
                  }))
                }
              >
                <View
                  style={[
                    styles.checkboxBox,
                    createForm.is_automated_barrier && styles.checkboxBoxChecked,
                  ]}
                >
                  {createForm.is_automated_barrier && (
                    <CustomIcon name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.checkboxTitle}>Automated Boom Barrier Equipped</Text>
                  <Text style={styles.checkboxSubText}>
                    Automatic license plate recognition or RFID access barrier installed.
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateGate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Gate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Create Status Dropdown Overlay */}
          {showCreateStatusPicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowCreateStatusPicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 320, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Status</Text>
                  <TouchableOpacity onPress={() => setShowCreateStatusPicker(false)}>
                    <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>
                {[
                  { label: 'ACTIVE (Open)', value: 'ACTIVE' },
                  { label: 'CLOSED', value: 'CLOSED' },
                  { label: 'UNDER MAINTENANCE', value: 'UNDER_MAINTENANCE' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pickerItem, createForm.status === opt.value && styles.pickerItemSelected]}
                    onPress={() => {
                      setCreateForm((p) => ({ ...p, status: opt.value }));
                      setShowCreateStatusPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, createForm.status === opt.value && { fontWeight: '800' }]}>
                      {opt.label}
                    </Text>
                    {createForm.status === opt.value && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* =========================================================================
          EDIT GATE MODAL (Admin Only)
      ========================================================================== */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowEditModal(false)}
          />
          <View style={styles.formModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Gate Details</Text>
                <Text style={styles.modalSubtitle}>Update checkpoint name, number, location and status</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <CustomIcon name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Gate Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.name}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, name: val }))}
                />
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Gate Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.gate_number}
                    onChangeText={(val) => setEditForm((p) => ({ ...p, gate_number: val }))}
                  />
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Status *</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowEditStatusPicker(true)}
                  >
                    <Text style={styles.dropdownBtnText}>{editForm.status}</Text>
                    <CustomIcon name="chevronRight" size={14} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Location / Description</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.location}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, location: val }))}
                />
              </View>

              {/* Gate Entry Registration Toggle */}
              <TouchableOpacity
                style={[
                  styles.checkboxBanner,
                  editForm.allows_entry_registration && styles.checkboxBannerActive,
                ]}
                activeOpacity={0.8}
                onPress={() =>
                  setEditForm((p) => ({
                    ...p,
                    allows_entry_registration: !p.allows_entry_registration,
                  }))
                }
              >
                <View
                  style={[
                    styles.checkboxBox,
                    editForm.allows_entry_registration && styles.checkboxBoxChecked,
                  ]}
                >
                  {editForm.allows_entry_registration && (
                    <CustomIcon name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.checkboxTitle}>Gate Entry Registration</Text>
                    {editForm.allows_entry_registration ? (
                      <View style={styles.permitBadge}>
                        <Text style={styles.permitBadgeText}>✓ PERMITTED</Text>
                      </View>
                    ) : (
                      <View style={styles.historyOnlyBadge}>
                        <Text style={styles.historyOnlyBadgeText}>VIEW ONLY</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.checkboxSubText}>
                    Authorized guards at this gate can register visitor entries.
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleUpdateGate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Edit Status Dropdown Overlay */}
          {showEditStatusPicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowEditStatusPicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 320, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Status</Text>
                  <TouchableOpacity onPress={() => setShowEditStatusPicker(false)}>
                    <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>
                {[
                  { label: 'ACTIVE', value: 'ACTIVE' },
                  { label: 'CLOSED', value: 'CLOSED' },
                  { label: 'UNDER MAINTENANCE', value: 'UNDER_MAINTENANCE' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pickerItem, editForm.status === opt.value && styles.pickerItemSelected]}
                    onPress={() => {
                      setEditForm((p) => ({ ...p, status: opt.value }));
                      setShowEditStatusPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, editForm.status === opt.value && { fontWeight: '800' }]}>
                      {opt.label}
                    </Text>
                    {editForm.status === opt.value && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* =========================================================================
          ASSIGN SECURITY STAFF MODAL (Admin Only)
      ========================================================================== */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowAssignModal(false)}
          />
          <View style={styles.formModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign Security Staff to Gate</Text>
                <Text style={styles.modalSubtitle}>Station guard to physical post (e.g. Rakesh → Main Gate)</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAssignModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <CustomIcon name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Quick 1-Click Example Button */}
              <TouchableOpacity
                style={styles.quickExampleBtn}
                onPress={applyQuickExampleAssign}
                activeOpacity={0.8}
              >
                <CustomIcon name="sparkles" size={14} color="#10b981" />
                <Text style={styles.quickExampleBtnText}>
                  Quick Example: Assign Rakesh → Main Gate (Morning Shift)
                </Text>
              </TouchableOpacity>

              {/* Select Gate */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Select Gate *</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowAssignGatePicker(true)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {(() => {
                      const found = gates.find((g) => String(g.id || g.gate_id) === String(assignForm.gate_id));
                      return found
                        ? `${found.name || found.gate_name} (Gate #${found.gate_number || found.id})`
                        : '-- Choose Gate --';
                    })()}
                  </Text>
                  <CustomIcon name="chevronRight" size={14} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Select Security Guard */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Select Security Staff Guard *</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowAssignStaffPicker(true)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {(() => {
                      const found = securityStaffList.find((s) => String(s.id) === String(assignForm.security_staff_id));
                      return found
                        ? `${found.full_name} (${found.badge_number || found.employee_id || 'Badge'}) - ${found.shift} Shift`
                        : '-- Choose Security Guard --';
                    })()}
                  </Text>
                  <CustomIcon name="chevronRight" size={14} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Duty Shift */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Duty Shift *</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowAssignShiftPicker(true)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {assignForm.shift === 'MORNING'
                      ? 'Morning Shift (06:00 - 14:00)'
                      : assignForm.shift === 'EVENING'
                        ? 'Evening Shift (14:00 - 22:00)'
                        : 'Night Shift (22:00 - 06:00)'}
                  </Text>
                  <CustomIcon name="chevronRight" size={14} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAssignStaff}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm Assignment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Gate Picker Overlay */}
          {showAssignGatePicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowAssignGatePicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 320, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Gate</Text>
                  <TouchableOpacity onPress={() => setShowAssignGatePicker(false)}>
                    <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 280 }}>
                  {gates.map((g) => {
                    const id = String(g.id || g.gate_id);
                    const isSelected = String(assignForm.gate_id) === id;
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setAssignForm((p) => ({ ...p, gate_id: id }));
                          setShowAssignGatePicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                          {g.name || g.gate_name} (Gate #{g.gate_number || id})
                        </Text>
                        {isSelected && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Security Staff Picker Overlay */}
          {showAssignStaffPicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowAssignStaffPicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 320, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Guard</Text>
                  <TouchableOpacity onPress={() => setShowAssignStaffPicker(false)}>
                    <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 280 }}>
                  {securityStaffList.map((s) => {
                    const id = String(s.id);
                    const isSelected = String(assignForm.security_staff_id) === id;
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setAssignForm((p) => ({ ...p, security_staff_id: id }));
                          setShowAssignStaffPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                          {s.full_name} ({s.badge_number || s.employee_id || 'ID'}) - {s.shift} Shift
                        </Text>
                        {isSelected && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Shift Picker Overlay */}
          {showAssignShiftPicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowAssignShiftPicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 320, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Duty Shift</Text>
                  <TouchableOpacity onPress={() => setShowAssignShiftPicker(false)}>
                    <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>
                {[
                  { label: 'Morning Shift (06:00 - 14:00)', value: 'MORNING' },
                  { label: 'Evening Shift (14:00 - 22:00)', value: 'EVENING' },
                  { label: 'Night Shift (22:00 - 06:00)', value: 'NIGHT' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pickerItem, assignForm.shift === opt.value && styles.pickerItemSelected]}
                    onPress={() => {
                      setAssignForm((p) => ({ ...p, shift: opt.value }));
                      setShowAssignShiftPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, assignForm.shift === opt.value && { fontWeight: '800' }]}>
                      {opt.label}
                    </Text>
                    {assignForm.shift === opt.value && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* =========================================================================
          QUICK MESSAGE GUARD MODAL
      ========================================================================== */}
      <Modal
        visible={Boolean(messagingGuard)}
        animationType="fade"
        transparent
        onRequestClose={() => setMessagingGuard(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setMessagingGuard(null)}
          />
          <View style={[styles.formModalCard, { maxWidth: 380 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.msgIconBox}>
                  <CustomIcon name="messageSquare" size={18} color={THEME.colors.clay} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Message Guard on Duty</Text>
                  <Text style={styles.modalSubtitle}>
                    {messagingGuard?.guardName} • {messagingGuard?.gateName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setMessagingGuard(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <CustomIcon name="close" size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Presets */}
              <Text style={styles.presetSectionTitle}>Quick Preset Messages:</Text>
              <View style={styles.presetButtonsRow}>
                {[
                  'Please allow my expected visitor entry',
                  'Delivery package arriving shortly at gate',
                  'Cab arriving for my flat in 5 mins',
                  'Please hold my parcel at security post',
                ].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.msgPresetBtn,
                      messageText === preset && styles.msgPresetBtnActive,
                    ]}
                    onPress={() => setMessageText(preset)}
                  >
                    <Text
                      style={[
                        styles.msgPresetBtnText,
                        messageText === preset && styles.msgPresetBtnTextActive,
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Text Input */}
              <View style={[styles.fieldGroup, { marginTop: 12 }]}>
                <Text style={styles.fieldLabel}>Message Content:</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={3}
                  placeholder="Type your message or instructions for the guard..."
                  placeholderTextColor={THEME.colors.textDim}
                  value={messageText}
                  onChangeText={setMessageText}
                />
              </View>
            </ScrollView>

            {/* Quick Send Options */}
            <View style={styles.msgActionButtonsRow}>
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={handleSendWhatsApp}
                activeOpacity={0.8}
              >
                <Text style={styles.whatsappBtnText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.smsBtn}
                onPress={handleSendSMS}
                activeOpacity={0.8}
              >
                <CustomIcon name="send" size={14} color="#FFFFFF" />
                <Text style={styles.smsBtnText}>Send SMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topFixedSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: THEME.colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
  },

  /* Top Action Bar */
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  refreshIconBtn: {
    width: 38,
    height: 38,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.white,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.card,
  },
  assignHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.white,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: THEME.radius.md,
    ...THEME.shadows.card,
  },
  assignHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  addGateHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: THEME.radius.md,
    ...THEME.shadows.card,
  },
  addGateHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  openConsoleHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: THEME.radius.md,
    ...THEME.shadows.card,
  },
  openConsoleHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Security Duty Banner */
  securityDutyBanner: {
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    ...THEME.shadows.card,
  },
  dutyBannerAssigned: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  dutyBannerUnassigned: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  dutyShieldIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dutyBannerPreTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dutyGateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  dutyGateNumBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dutyGateNumBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  dutyGateSubText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  dutyNoGateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 2,
  },
  dutyNoGateSubText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  dutyOpenConsoleBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
  },
  dutyOpenConsoleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  /* Alert Toasts */
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.errorBg,
    borderColor: THEME.colors.errorBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    padding: 10,
    marginBottom: 12,
  },
  alertErrorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.error,
    marginHorizontal: 8,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.successBg,
    borderColor: THEME.colors.successBorder,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    padding: 10,
    marginBottom: 12,
  },
  alertSuccessText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.fernGreenDark,
    marginHorizontal: 8,
  },

  /* KPI Stats Grid */
  kpiContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    flex: 1,
    marginRight: 4,
  },
  kpiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 6,
  },
  kpiSubText: {
    fontSize: 9,
    color: THEME.colors.textDim,
    marginTop: 2,
  },

  /* Filter & Search Bar */
  filterSection: {
    // backgroundColor: THEME.colors.white,
    // borderRadius: THEME.radius.lg,
    // padding: 12,
    // borderWidth: 1,
    // borderColor: THEME.colors.sand,
    // gap: 10,
    ...THEME.shadows.card,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    paddingHorizontal: 10,
    marginBottom: 2,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: THEME.colors.darkBrown,
    paddingVertical: 0,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE0D5',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 36,
  },
  filterChipLabel: {
    fontSize: 11,
    color: THEME.colors.textDim,
    fontWeight: '600',
  },
  filterChipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    flex: 1,
    marginLeft: 4,
  },

  /* Gate Card */
  gateCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    overflow: 'hidden',
    marginBottom: 16,
    ...THEME.shadows.card,
  },
  gateCardAssignedToMe: {
    borderColor: '#10b981',
    borderWidth: 2,
  },

  /* Part 1: Gate Identity Header */
  gateIdentityHeader: {
    backgroundColor: '#403630',
    padding: 16,
  },
  gateIdentityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gateNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  gateIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 154, 108, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gateTitleText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  gateLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  gateLocationText: {
    fontSize: 11,
    color: '#D6C2A1',
    flex: 1,
  },
  gateBadgesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  gateNumBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gateNumBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gateStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
  },
  gateStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  textStatusActive: {
    color: '#15803D',
  },
  statusClosed: {
    backgroundColor: '#FEE2E2',
  },
  textStatusClosed: {
    color: '#DC2626',
  },
  statusMaintenance: {
    backgroundColor: '#FEF3C7',
  },
  textStatusMaintenance: {
    color: '#D97706',
  },
  gateTagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  gateFeaturePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gateFeaturePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FAF5ED',
  },

  /* Part 2: Security Information Section */
  securitySection: {
    padding: 16,
    backgroundColor: THEME.colors.white,
  },
  securitySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assignGuardSmallBtn: {
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  assignGuardSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.clay,
  },

  /* Guard Cards */
  guardListContainer: {
    gap: 10,
  },
  guardCard: {
    backgroundColor: '#FAF6EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    padding: 12,
  },
  guardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guardAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardAvatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  guardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guardNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    flex: 1,
  },
  guardShiftBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  guardShiftText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  guardSubDetailText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  guardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EAE0D5',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    ...THEME.shadows.card,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    ...THEME.shadows.card,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  endShiftBtn: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  endShiftBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  noGuardBox: {
    backgroundColor: '#FAF6EE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noGuardText: {
    fontSize: 11,
    color: THEME.colors.textDim,
    flex: 1,
    lineHeight: 16,
  },

  /* Card Admin Footer */
  cardAdminFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0E8DC',
  },
  changeGuardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeGuardBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  editDeleteBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },

  /* Center Loading & Empty */
  centerLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 30,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  /* Modals Base */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  formModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 20,
    maxHeight: '90%',
    ...THEME.shadows.float,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8DC',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  modalSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },

  /* Presets Section */
  presetSection: {
    backgroundColor: THEME.colors.sandWell,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    padding: 10,
    marginBottom: 14,
  },
  presetSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  presetButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },

  /* Quick Example Button */
  quickExampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    padding: 10,
    borderRadius: THEME.radius.md,
    marginBottom: 14,
  },
  quickExampleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },

  /* Form Elements */
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: THEME.colors.darkBrown,
  },
  dropdownBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownBtnText: {
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },

  /* Checkbox Banners */
  checkboxBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1.5,
    borderColor: '#EAE0D5',
    borderRadius: THEME.radius.md,
    padding: 12,
  },
  checkboxBannerActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  permitBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  permitBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  historyOnlyBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  historyOnlyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textDim,
  },
  checkboxSubText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 3,
    lineHeight: 15,
  },

  /* Modal Actions */
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E8DC',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  submitBtn: {
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Message Modal Elements */
  msgIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(196, 154, 108, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgPresetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FAF6EE',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  msgPresetBtnActive: {
    backgroundColor: 'rgba(196, 154, 108, 0.2)',
    borderColor: THEME.colors.clay,
  },
  msgPresetBtnText: {
    fontSize: 11,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  msgPresetBtnTextActive: {
    color: THEME.colors.clay,
    fontWeight: '700',
  },
  msgActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  smsBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: THEME.colors.clay,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  smsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Overlay Selectors */
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  formPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  pickerModalContent: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 16,
    ...THEME.shadows.float,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8DC',
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E6',
  },
  pickerItemSelected: {
    backgroundColor: THEME.colors.sandWell,
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 13,
    color: THEME.colors.darkBrown,
  },
});
