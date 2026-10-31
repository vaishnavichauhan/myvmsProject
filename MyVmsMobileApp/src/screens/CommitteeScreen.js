import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { committeeApi, societyApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Position Configurations
const POSITION_CONFIG = {
  HEAD: {
    label: 'Head / Convener',
    icon: 'crown',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  CHAIRPERSON: {
    label: 'Chairperson',
    icon: 'crown',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  PRESIDENT: {
    label: 'President',
    icon: 'crown',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  SECRETARY: {
    label: 'Secretary',
    icon: 'award',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.14)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  TREASURER: {
    label: 'Treasurer',
    icon: 'shieldCheck',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  CONVENER: {
    label: 'Convener',
    icon: 'sparkles',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.14)',
    borderColor: 'rgba(236, 72, 153, 0.4)',
  },
  COORDINATOR: {
    label: 'Coordinator',
    icon: 'zap',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.14)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  COMMITTEE_MEMBER: {
    label: 'Committee Member',
    icon: 'users',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.14)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  VICE_PRESIDENT: {
    label: 'Vice President',
    icon: 'crown',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.14)',
    borderColor: 'rgba(236, 72, 153, 0.4)',
  },
  JOINT_SECRETARY: {
    label: 'Joint Secretary',
    icon: 'award',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.14)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
};

export const CommitteeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Data states
  const [committees, setCommittees] = useState([]);
  const [committeeMembers, setCommitteeMembers] = useState([]);
  const [societyHomes, setSocietyHomes] = useState([]);
  const [homeOccupants, setHomeOccupants] = useState([]);
  const [userCommittees, setUserCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOccupants, setLoadingOccupants] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommitteeFilter, setSelectedCommitteeFilter] = useState('ALL');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter Dropdown overlays
  const [showCommitteeFilterPicker, setShowCommitteeFilterPicker] = useState(false);
  const [showPositionFilterPicker, setShowPositionFilterPicker] = useState(false);
  const [showStatusFilterPicker, setShowStatusFilterPicker] = useState(false);

  // Modals state
  const [isCreateCommitteeModalOpen, setIsCreateCommitteeModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [messagingMember, setMessagingMember] = useState(null);
  const [messageText, setMessageText] = useState('');

  // Form Dropdown overlays (inside modals)
  const [showFormCommitteePicker, setShowFormCommitteePicker] = useState(false);
  const [showFormHomePicker, setShowFormHomePicker] = useState(false);
  const [showFormOccupantPicker, setShowFormOccupantPicker] = useState(false);
  const [showFormPositionPicker, setShowFormPositionPicker] = useState(false);
  const [showFormStatusPicker, setShowFormStatusPicker] = useState(false);
  const [showEditCommitteePicker, setShowEditCommitteePicker] = useState(false);
  const [showEditPositionPicker, setShowEditPositionPicker] = useState(false);
  const [showEditStatusPicker, setShowEditStatusPicker] = useState(false);

  // Notifications
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Create Committee Form
  const [committeeFormData, setCommitteeFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
  });

  // Assign Member Form
  const [assignFormData, setAssignFormData] = useState({
    committee_id: '',
    home_id: '',
    home_number: '',
    user_id: '',
    name: '',
    phone: '',
    email: '',
    position: 'COMMITTEE_MEMBER',
    status: 'ACTIVE',
    responsibilities: '',
    can_create_announcements: false,
  });

  // Edit Member Form
  const [editFormData, setEditFormData] = useState({
    id: null,
    committee_id: '',
    position: 'COMMITTEE_MEMBER',
    status: 'ACTIVE',
    name: '',
    phone: '',
    email: '',
    responsibilities: '',
    can_create_announcements: false,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [comRes, memRes, homesRes] = await Promise.all([
        committeeApi.getCommittees().catch(() => ({ data: { committees: [] } })),
        committeeApi.getCommitteeMembers().catch(() => ({ data: { committeeMembers: [] } })),
        societyApi.getAllHomes().catch(() => ({ data: { homes: [] } })),
      ]);

      const comList = comRes.data?.committees || comRes.committees || [];
      const memList = memRes.data?.committeeMembers || memRes.data || [];
      const homeList = homesRes.data?.homes || homesRes.data || [];

      setCommittees(Array.isArray(comList) ? comList : []);
      setCommitteeMembers(Array.isArray(memList) ? memList : []);
      setSocietyHomes(Array.isArray(homeList) ? homeList : []);

      // Check if logged-in user is a committee member
      if (user && Array.isArray(memList)) {
        const myAppts = memList.filter(
          (m) =>
            m.user_id === user.id ||
            (m.phone && user.phone && m.phone.replace(/\D/g, '') === user.phone.replace(/\D/g, ''))
        );
        setUserCommittees(myAppts);
      }
    } catch (err) {
      console.log('Error loading committee data:', err);
      showToastError(err.message || 'Failed to fetch committee data.');
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

  // Open Create Committee Modal
  const handleOpenCreateCommittee = () => {
    setCommitteeFormData({
      name: '',
      description: '',
      status: 'ACTIVE',
    });
    setIsCreateCommitteeModalOpen(true);
  };

  // Submit Create Committee
  const handleCreateCommitteeSubmit = async () => {
    if (!committeeFormData.name.trim()) {
      showToastError('Please enter committee name.');
      return;
    }
    setSubmitting(true);
    try {
      await committeeApi.createCommittee(committeeFormData);
      showToastSuccess(`Committee "${committeeFormData.name}" created!`);
      setIsCreateCommitteeModalOpen(false);
      fetchInitialData();
    } catch (err) {
      showToastError(err.message || 'Failed to create committee.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Assign Member Modal
  const handleOpenAssignModal = () => {
    const firstComId = committees.length > 0 ? String(committees[0].id) : '';
    setAssignFormData({
      committee_id: firstComId,
      home_id: '',
      home_number: '',
      user_id: '',
      name: '',
      phone: '',
      email: '',
      position: 'COMMITTEE_MEMBER',
      status: 'ACTIVE',
      responsibilities: '',
      can_create_announcements: false,
    });
    setHomeOccupants([]);
    setIsAssignModalOpen(true);
  };

  // When Home is selected in Assign Member Modal
  const handleHomeChange = async (homeId) => {
    const selectedHome = societyHomes.find((h) => String(h.id) === String(homeId));
    const homeNumber = selectedHome ? selectedHome.home_number || selectedHome.flat_number : '';

    setAssignFormData((prev) => ({
      ...prev,
      home_id: homeId,
      home_number: homeNumber,
      user_id: '',
      name: '',
      phone: '',
      email: '',
    }));

    if (!homeId) {
      setHomeOccupants([]);
      return;
    }

    setLoadingOccupants(true);
    try {
      const res = await committeeApi.getHomeOccupants(homeId);
      const list = res.data?.occupants || res.data || [];
      setHomeOccupants(Array.isArray(list) ? list : []);

      if (list.length === 1) {
        const occ = list[0];
        setAssignFormData((prev) => ({
          ...prev,
          user_id: String(occ.user_id || occ.userId || occ.id),
          name: occ.full_name || occ.name || '',
          phone: occ.phone || '',
          email: occ.email || '',
        }));
      }
    } catch (err) {
      console.log('Error fetching occupants:', err);
      setHomeOccupants([]);
    } finally {
      setLoadingOccupants(false);
    }
  };

  // When Occupant is selected
  const handleOccupantSelect = (userId) => {
    const occ = homeOccupants.find((o) => String(o.user_id || o.userId || o.id) === String(userId));
    if (occ) {
      setAssignFormData((prev) => ({
        ...prev,
        user_id: userId,
        name: occ.full_name || occ.name || '',
        phone: occ.phone || '',
        email: occ.email || '',
      }));
    }
  };

  // Submit Assign Member
  const handleAssignSubmit = async () => {
    if (!assignFormData.committee_id) {
      showToastError('Please select a committee.');
      return;
    }
    if (!assignFormData.home_id) {
      showToastError('Please select a home number.');
      return;
    }
    if (!assignFormData.name) {
      showToastError('Please select a resident member.');
      return;
    }

    setSubmitting(true);
    try {
      await committeeApi.createCommitteeMember({
        committee_id: assignFormData.committee_id,
        user_id: assignFormData.user_id,
        name: assignFormData.name,
        phone: assignFormData.phone,
        email: assignFormData.email,
        position: assignFormData.position,
        home_number: assignFormData.home_number,
        home_id: assignFormData.home_id,
        status: assignFormData.status,
        responsibilities: assignFormData.responsibilities,
        can_create_announcements: assignFormData.can_create_announcements,
      });

      showToastSuccess(`Assigned ${assignFormData.name} to committee!`);
      setIsAssignModalOpen(false);
      fetchInitialData();
    } catch (err) {
      showToastError(err.message || 'Failed to assign committee member.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (member) => {
    setEditFormData({
      id: member.id,
      committee_id: String(member.committee_id || ''),
      position: member.position || 'COMMITTEE_MEMBER',
      status: member.status || 'ACTIVE',
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      responsibilities: member.responsibilities || '',
      can_create_announcements: Boolean(member.can_create_announcements),
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Member
  const handleEditSubmit = async () => {
    setSubmitting(true);
    try {
      await committeeApi.updateCommitteeMember(editFormData.id, editFormData);
      showToastSuccess(`Updated ${editFormData.name}'s details!`);
      setIsEditModalOpen(false);
      fetchInitialData();
    } catch (err) {
      showToastError(err.message || 'Failed to update member.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Member
  const handleDeleteMember = (memberId, memberName) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this committee?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await committeeApi.deleteCommitteeMember(memberId);
              showToastSuccess(`Removed ${memberName} from committee.`);
              fetchInitialData();
            } catch (err) {
              showToastError(err.message || 'Failed to delete member.');
            }
          },
        },
      ]
    );
  };

  // Phone Call
  const handleCall = (phone, name) => {
    if (!phone) {
      Alert.alert('Phone Unavailable', `No phone registered for ${name}`);
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call.');
    });
  };

  // Open Message Modal
  const handleOpenMessage = (member) => {
    setMessagingMember(member);
    setMessageText('');
  };

  // Send WhatsApp
  const handleSendWhatsApp = () => {
    if (!messagingMember?.phone) {
      Alert.alert('Phone Unavailable', 'No phone registered for this member.');
      return;
    }
    const cleanPhone = messagingMember.phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      messageText || `Hello ${messagingMember.name}, resident enquiry regarding ${messagingMember.committee_name || 'Society Committee'}.`
    )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp.');
    });
  };

  // Send SMS
  const handleSendSMS = () => {
    if (!messagingMember?.phone) {
      Alert.alert('Phone Unavailable', 'No phone registered for this member.');
      return;
    }
    const url = `sms:${messagingMember.phone}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(
      messageText || `Hello ${messagingMember.name}, regarding ${messagingMember.committee_name || 'Society Committee'}.`
    )}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open messaging app.');
    });
  };

  // Filtered Members Memo
  const filteredMembers = useMemo(() => {
    return committeeMembers.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const committee = (m.committee_name || '').toLowerCase();
      const home = String(m.home_number || m.flat_number || '').toLowerCase();
      const pos = (m.position || '').toUpperCase();
      const stat = (m.status || 'ACTIVE').toUpperCase();

      const matchesSearch =
        !searchTerm.trim() ||
        name.includes(searchTerm.toLowerCase()) ||
        committee.includes(searchTerm.toLowerCase()) ||
        home.includes(searchTerm.toLowerCase());

      const matchesCommittee =
        selectedCommitteeFilter === 'ALL' ||
        String(m.committee_id) === String(selectedCommitteeFilter) ||
        m.committee_name === selectedCommitteeFilter;

      const matchesPos = positionFilter === 'ALL' || pos === positionFilter;
      const matchesStatus = statusFilter === 'ALL' || stat === statusFilter;

      return matchesSearch && matchesCommittee && matchesPos && matchesStatus;
    });
  }, [committeeMembers, searchTerm, selectedCommitteeFilter, positionFilter, statusFilter]);

  // Selected Committee Label
  const selectedCommitteeObj = useMemo(() => {
    return committees.find(
      (c) => String(c.id) === String(selectedCommitteeFilter) || c.name === selectedCommitteeFilter
    );
  }, [committees, selectedCommitteeFilter]);

  const selectedCommitteeLabel =
    selectedCommitteeFilter === 'ALL'
      ? `All Wings (${committeeMembers.length})`
      : selectedCommitteeObj?.name || selectedCommitteeFilter;

  const positionLabel =
    positionFilter === 'ALL'
      ? 'All'
      : POSITION_CONFIG[positionFilter]?.label || positionFilter;

  const statusLabel =
    statusFilter === 'ALL'
      ? 'All'
      : statusFilter === 'ACTIVE'
        ? 'Active'
        : 'Inactive';

  // Render Committee Member Card
  const renderMemberCard = ({ item: m }) => {
    const cfg = POSITION_CONFIG[m.position] || POSITION_CONFIG.COMMITTEE_MEMBER;
    const isMe =
      m.user_id === user?.id ||
      (m.phone && user?.phone && m.phone.replace(/\D/g, '') === user?.phone.replace(/\D/g, ''));

    return (
      <View style={styles.memberCard}>
        {/* Card Header Row */}
        <View style={styles.cardHeaderRow}>
          {/* Avatar */}
          <View style={styles.avatarBox}>
            <Text style={styles.avatarInitialText}>
              {(m.name || 'M').charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Identity & Badges */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.nameRow}>
              <Text style={styles.memberNameText} numberOfLines={1}>
                {m.name}
              </Text>
              {isMe && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>YOU</Text>
                </View>
              )}
            </View>

            {/* Position Pill */}
            <View style={[styles.positionBadge, { backgroundColor: cfg.bgColor, borderColor: cfg.borderColor }]}>
              <CustomIcon name={cfg.icon} size={12} color={cfg.color} />
              <Text style={[styles.positionBadgeText, { color: cfg.color }]}>
                {m.position || cfg.label}
              </Text>
            </View>
          </View>

          {/* Residence & Status */}
          <View style={styles.rightBadgesCol}>
            <View style={styles.homeBadge}>
              <CustomIcon name="home" size={11} color={THEME.colors.clay} />
              <Text style={styles.homeBadgeText}>Home {m.home_number || 'N/A'}</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                m.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  m.status === 'ACTIVE' ? styles.textActive : styles.textInactive,
                ]}
              >
                {m.status || 'ACTIVE'}
              </Text>
            </View>
          </View>
        </View>

        {/* Committee Wing Tag */}
        <View style={styles.committeeWingRow}>
          <CustomIcon name="tag" size={12} color={THEME.colors.clay} />
          <Text style={styles.committeeWingText} numberOfLines={1}>
            {m.committee_name || 'General Society Committee'}
          </Text>
        </View>

        {/* Contact Info Details */}
        <View style={styles.contactDetailsBox}>
          {m.phone ? (
            <View style={styles.detailItemRow}>
              <CustomIcon name="phone" size={13} color={THEME.colors.textMuted} />
              <Text style={styles.detailItemText}>{m.phone}</Text>
            </View>
          ) : null}

          {m.email ? (
            <View style={styles.detailItemRow}>
              <CustomIcon name="mail" size={13} color={THEME.colors.textMuted} />
              <Text style={styles.detailItemText} numberOfLines={1}>{m.email}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions Row */}
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => handleCall(m.phone, m.name)}
            activeOpacity={0.8}
          >
            <CustomIcon name="phoneCall" size={14} color="#FFFFFF" />
            <Text style={styles.callBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.messageBtn}
            onPress={() => handleOpenMessage(m)}
            activeOpacity={0.8}
          >
            <CustomIcon name="messageSquare" size={14} color="#FFFFFF" />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>

          {isAdmin && (
            <View style={styles.adminActionGroup}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => handleOpenEditModal(m)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CustomIcon name="edit" size={14} color={THEME.colors.darkBrown} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionIconBtn, styles.deleteBtnBg]}
                onPress={() => handleDeleteMember(m.id, m.name)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CustomIcon name="trash" size={14} color="#DC2626" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <HeaderBar
        title="Society Committees & Directory"
        showBack
      // rightActionIcon="refresh"

      />

      <FlatList
        data={filteredMembers}
        keyExtractor={(item, index) => String(item.id || index)}
        renderItem={renderMemberCard}
        contentContainerStyle={styles.listContent}
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
        ListHeaderComponent={
          <View style={styles.headerComponentContainer}>
            {isAdmin && (
              <View style={styles.topActionBar}>
                <TouchableOpacity
                  style={styles.createComHeaderBtn}
                  onPress={handleOpenCreateCommittee}
                  activeOpacity={0.8}
                >
                  <CustomIcon name="folderPlus" size={14} color={THEME.colors.darkBrown} />
                  <Text style={styles.createComHeaderBtnText}>+ Create Committee</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.assignHeaderBtn}
                  onPress={handleOpenAssignModal}
                  activeOpacity={0.8}
                >
                  <CustomIcon name="plus" size={15} color="#FFFFFF" />
                  <Text style={styles.assignHeaderBtnText}>Assign Member</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Official Committee Appointment Banner (If user is appointed) */}
            {userCommittees && userCommittees.length > 0 && (
              <View style={styles.officialBanner}>
                <View style={styles.crownBox}>
                  <CustomIcon name="crown" size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.officialBannerPreTitle}>OFFICIAL COMMITTEE APPOINTMENT</Text>
                    <View style={styles.activeOfficePill}>
                      <Text style={styles.activeOfficePillText}>Active Office Bearer</Text>
                    </View>
                  </View>
                  <Text style={styles.officialMemberName}>
                    {user?.fullName || 'Resident Member'} —{' '}
                    <Text style={{ color: THEME.colors.clay }}>
                      {userCommittees.map((uc) => `${uc.committee_name || 'Society Committee'} (${uc.designation || uc.position || 'Member'})`).join(', ')}
                    </Text>
                  </Text>
                  <Text style={styles.officialSubText}>
                    Representing Home {user?.flatNumber || userCommittees[0]?.home_number || 'Unit'} • Recognized committee representative.
                  </Text>
                </View>
              </View>
            )}

            {/* Toast Alerts */}
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

            {/* Search Bar & Dropdown Filters (No card border, full width) */}
            <View style={styles.filterSection}>
              {/* 1. Full-width Search Input */}
              <View style={styles.searchBox}>
                <CustomIcon name="search" size={16} color={THEME.colors.clay} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by member name, committee, home..."
                  placeholderTextColor={THEME.colors.textDim}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                />
                {searchTerm ? (
                  <TouchableOpacity
                    onPress={() => setSearchTerm('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CustomIcon name="close" size={14} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {/* 3. Position and Status Dropdowns Row */}
              <View style={styles.dropdownRow}>
                {/* Position Filter */}
                <TouchableOpacity
                  style={styles.dropdownBtnHalf}
                  onPress={() => setShowPositionFilterPicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownHalfContent}>
                    <Text style={styles.dropdownLabel}>Position:</Text>
                    <Text style={styles.dropdownValueHalf} numberOfLines={1}>
                      {positionLabel}
                    </Text>
                  </View>
                  <CustomIcon name="chevronDown" size={13} color={THEME.colors.textMuted} />
                </TouchableOpacity>

                {/* Status Filter */}
                <TouchableOpacity
                  style={styles.dropdownBtnHalf}
                  onPress={() => setShowStatusFilterPicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownHalfContent}>
                    <Text style={styles.dropdownLabel}>Status:</Text>
                    <Text style={styles.dropdownValueHalf} numberOfLines={1}>
                      {statusLabel}
                    </Text>
                  </View>
                  <CustomIcon name="chevronDown" size={13} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={THEME.colors.clay} />
              <Text style={styles.loadingText}>Loading committee directory...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <CustomIcon name="users" size={48} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Committee Members Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchTerm || selectedCommitteeFilter !== 'ALL' || positionFilter !== 'ALL'
                  ? 'No members match the current search or filter criteria.'
                  : 'No resident members have been assigned to this committee yet.'}
              </Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={handleOpenAssignModal}
                >
                  <CustomIcon name="plus" size={14} color="#FFFFFF" />
                  <Text style={styles.emptyAddBtnText}>Assign First Member</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />

      {/* =========================================================================
          COMMITTEE WING FILTER PICKER MODAL
      ========================================================================== */}
      <Modal
        visible={showCommitteeFilterPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCommitteeFilterPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowCommitteeFilterPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerModalContent}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CustomIcon name="tag" size={16} color={THEME.colors.clay} />
                <Text style={styles.pickerModalTitle}>Filter by Committee Wing</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCommitteeFilterPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {/* Show All Option */}
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedCommitteeFilter === 'ALL' && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedCommitteeFilter('ALL');
                  setShowCommitteeFilterPicker(false);
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedCommitteeFilter === 'ALL' && { fontWeight: '800', color: THEME.colors.clay },
                    ]}
                  >
                    All Committee Wings
                  </Text>
                  <Text style={styles.pickerItemSubtext}>
                    {committeeMembers.length} total assigned members across all wings
                  </Text>
                </View>
                {selectedCommitteeFilter === 'ALL' && (
                  <CustomIcon name="check" size={16} color={THEME.colors.clay} />
                )}
              </TouchableOpacity>

              {/* Individual Committees */}
              {committees.map((c) => {
                const isSelected =
                  String(selectedCommitteeFilter) === String(c.id) ||
                  selectedCommitteeFilter === c.name;
                const memberCount = committeeMembers.filter(
                  (m) => String(m.committee_id) === String(c.id) || m.committee_name === c.name
                ).length;

                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedCommitteeFilter(c.id);
                      setShowCommitteeFilterPicker(false);
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={[
                          styles.pickerItemText,
                          isSelected && { fontWeight: '800', color: THEME.colors.clay },
                        ]}
                      >
                        {c.name}
                      </Text>
                      <Text style={styles.pickerItemSubtext}>
                        {memberCount} active {memberCount === 1 ? 'member' : 'members'}
                        {c.description ? ` • ${c.description}` : ''}
                      </Text>
                    </View>
                    {isSelected && (
                      <CustomIcon name="check" size={16} color={THEME.colors.clay} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quick Add Committee for Admin */}
            {isAdmin && (
              <TouchableOpacity
                style={styles.pickerCreateComBtn}
                onPress={() => {
                  setShowCommitteeFilterPicker(false);
                  setTimeout(() => handleOpenCreateCommittee(), 200);
                }}
              >
                <CustomIcon name="plus" size={14} color={THEME.colors.clay} />
                <Text style={styles.pickerCreateComBtnText}>Create New Committee Wing</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* =========================================================================
          POSITION FILTER PICKER MODAL
      ========================================================================== */}
      <Modal
        visible={showPositionFilterPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPositionFilterPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowPositionFilterPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerModalContent}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CustomIcon name="crown" size={16} color={THEME.colors.clay} />
                <Text style={styles.pickerModalTitle}>Filter by Position</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPositionFilterPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {[
                { label: 'All Positions', value: 'ALL' },
                { label: 'Head / Convener', value: 'HEAD' },
                { label: 'Chairperson', value: 'CHAIRPERSON' },
                { label: 'President', value: 'PRESIDENT' },
                { label: 'Secretary', value: 'SECRETARY' },
                { label: 'Treasurer', value: 'TREASURER' },
                { label: 'Convener', value: 'CONVENER' },
                { label: 'Coordinator', value: 'COORDINATOR' },
                { label: 'Committee Member', value: 'COMMITTEE_MEMBER' },
                { label: 'Vice President', value: 'VICE_PRESIDENT' },
                { label: 'Joint Secretary', value: 'JOINT_SECRETARY' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pickerItem, positionFilter === opt.value && styles.pickerItemSelected]}
                  onPress={() => {
                    setPositionFilter(opt.value);
                    setShowPositionFilterPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, positionFilter === opt.value && { fontWeight: '800', color: THEME.colors.clay }]}>
                    {opt.label}
                  </Text>
                  {positionFilter === opt.value && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* =========================================================================
          STATUS FILTER PICKER MODAL
      ========================================================================== */}
      <Modal
        visible={showStatusFilterPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowStatusFilterPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowStatusFilterPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerModalContent}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CustomIcon name="shieldCheck" size={16} color={THEME.colors.clay} />
                <Text style={styles.pickerModalTitle}>Filter by Status</Text>
              </View>
              <TouchableOpacity onPress={() => setShowStatusFilterPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'All Status', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Inactive', value: 'INACTIVE' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pickerItem, statusFilter === opt.value && styles.pickerItemSelected]}
                onPress={() => {
                  setStatusFilter(opt.value);
                  setShowStatusFilterPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, statusFilter === opt.value && { fontWeight: '800', color: THEME.colors.clay }]}>
                  {opt.label}
                </Text>
                {statusFilter === opt.value && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* =========================================================================
          MODAL 1: CREATE COMMITTEE WING (Admin Only)
      ========================================================================== */}
      <Modal
        visible={isCreateCommitteeModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsCreateCommitteeModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.formModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Society Committee</Text>
                <Text style={styles.modalSubtitle}>Define a new committee wing (e.g. Festival, Electricity, Water)</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCreateCommitteeModalOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <CustomIcon name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Quick Suggestions */}
              <View style={styles.presetSection}>
                <Text style={styles.presetSectionTitle}>Quick Suggestions (Tap to fill):</Text>
                <View style={styles.presetButtonsRow}>
                  {[
                    'Festival & Celebration Committee',
                    'Electricity Management Committee',
                    'Water & Sanitation Committee',
                    'Security & Surveillance Committee',
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={styles.presetBtn}
                      onPress={() => setCommitteeFormData((p) => ({ ...p, name: preset }))}
                    >
                      <Text style={styles.presetBtnText}>+ {preset.replace(' Committee', '')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Committee Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Festival & Celebration Committee"
                  placeholderTextColor={THEME.colors.textDim}
                  value={committeeFormData.name}
                  onChangeText={(val) => setCommitteeFormData((p) => ({ ...p, name: val }))}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description / Scope (Optional)</Text>
                <TextInput
                  style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Responsible for festival planning, stage decorations, and cultural programs."
                  placeholderTextColor={THEME.colors.textDim}
                  value={committeeFormData.description}
                  onChangeText={(val) => setCommitteeFormData((p) => ({ ...p, description: val }))}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Status</Text>
                <View style={styles.toggleRow}>
                  {['ACTIVE', 'INACTIVE'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.togglePill,
                        committeeFormData.status === st && styles.togglePillActive,
                      ]}
                      onPress={() => setCommitteeFormData((p) => ({ ...p, status: st }))}
                    >
                      <Text
                        style={[
                          styles.togglePillText,
                          committeeFormData.status === st && styles.togglePillTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCreateCommitteeModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateCommitteeSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Committee</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* =========================================================================
          MODAL 2: ASSIGN COMMITTEE MEMBER (Select Home -> Select Occupant -> Role)
      ========================================================================== */}
      <Modal
        visible={isAssignModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAssignModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.formModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign Committee Member</Text>
                <Text style={styles.modalSubtitle}>Select Home No, choose resident occupant, and assign designation</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAssignModalOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <CustomIcon name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Step 1: Select Committee */}
              <View style={styles.fieldGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>1. Select Committee *</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsAssignModalOpen(false);
                      handleOpenCreateCommittee();
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.clay }}>
                      + New Committee
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowFormCommitteePicker(true)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {(() => {
                      const found = committees.find((c) => String(c.id) === String(assignFormData.committee_id));
                      return found ? found.name : '-- Choose Committee --';
                    })()}
                  </Text>
                  <CustomIcon name="chevronRight" size={14} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Step 2: Select Home No */}
              <View style={styles.fieldGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.fieldLabel}>2. Select Home No *</Text>
                  <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '700' }}>
                    {societyHomes.length} Units Available
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowFormHomePicker(true)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {assignFormData.home_number
                      ? `Home ${assignFormData.home_number}`
                      : '-- Choose Home Number --'}
                  </Text>
                  <CustomIcon name="chevronRight" size={14} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Step 3: Select Resident Member */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>3. Select Resident Member * (Resident User)</Text>

                {loadingOccupants ? (
                  <View style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color={THEME.colors.clay} />
                    <Text style={{ fontSize: 12, color: THEME.colors.textMuted }}>
                      Loading occupants living in Home {assignFormData.home_number}...
                    </Text>
                  </View>
                ) : !assignFormData.home_id ? (
                  <Text style={{ fontSize: 11, color: THEME.colors.textDim, marginVertical: 4 }}>
                    ↑ Please select a Home No above to view its resident members.
                  </Text>
                ) : homeOccupants.length === 0 ? (
                  <Text style={{ fontSize: 11, color: '#DC2626', marginVertical: 4 }}>
                    No registered occupants found for Home {assignFormData.home_number}.
                  </Text>
                ) : (
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowFormOccupantPicker(true)}
                  >
                    <Text style={styles.dropdownBtnText}>
                      {assignFormData.name
                        ? `${assignFormData.name} (${assignFormData.phone || 'Resident'})`
                        : `-- Choose occupant for Home ${assignFormData.home_number} --`}
                    </Text>
                    <CustomIcon name="chevronRight" size={14} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Selected Occupant Banner */}
              {assignFormData.name ? (
                <View style={styles.selectedOccBanner}>
                  <CustomIcon name="checkCircle" size={14} color="#15803D" />
                  <Text style={styles.selectedOccBannerText}>
                    Selected: <Text style={{ fontWeight: '800' }}>{assignFormData.name}</Text> • Home: {assignFormData.home_number}
                  </Text>
                </View>
              ) : null}

              {/* Step 4 & 5: Position & Status */}
              <View style={styles.formRowTwoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>4. Position *</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowFormPositionPicker(true)}
                  >
                    <Text style={styles.dropdownBtnText} numberOfLines={1}>
                      {POSITION_CONFIG[assignFormData.position]?.label || assignFormData.position}
                    </Text>
                    <CustomIcon name="chevronRight" size={12} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>5. Status *</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowFormStatusPicker(true)}
                  >
                    <Text style={styles.dropdownBtnText}>{assignFormData.status}</Text>
                    <CustomIcon name="chevronRight" size={12} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Responsibilities */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Responsibilities / Note (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Leads festival planning, event stage setup"
                  placeholderTextColor={THEME.colors.textDim}
                  value={assignFormData.responsibilities}
                  onChangeText={(val) => setAssignFormData((p) => ({ ...p, responsibilities: val }))}
                />
              </View>

              {/* Announcement Permission Checkbox */}
              <TouchableOpacity
                style={styles.checkboxBanner}
                activeOpacity={0.8}
                onPress={() =>
                  setAssignFormData((p) => ({
                    ...p,
                    can_create_announcements: !p.can_create_announcements,
                  }))
                }
              >
                <View
                  style={[
                    styles.checkboxBox,
                    assignFormData.can_create_announcements && styles.checkboxBoxChecked,
                  ]}
                >
                  {assignFormData.can_create_announcements && (
                    <CustomIcon name="check" size={14} color="#FFFFFF" />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.checkboxTitle}>Grant Announcement Creation Permission</Text>
                  <Text style={styles.checkboxSubText}>
                    Allows this committee member to publish society announcements.
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsAssignModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAssignSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Assign Member</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Form Committee Dropdown Modal */}
      <Modal
        visible={showFormCommitteePicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFormCommitteePicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowFormCommitteePicker(false)}
        >
          <TouchableOpacity
            style={[styles.pickerModalContent, { maxWidth: 320 }]}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Committee</Text>
              <TouchableOpacity onPress={() => setShowFormCommitteePicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {committees.map((c) => {
                const isSelected = String(assignFormData.committee_id) === String(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setAssignFormData((p) => ({ ...p, committee_id: String(c.id) }));
                      setShowFormCommitteePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                      {c.name}
                    </Text>
                    {isSelected && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Form Home Dropdown Modal */}
      <Modal
        visible={showFormHomePicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFormHomePicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowFormHomePicker(false)}
        >
          <TouchableOpacity
            style={[styles.pickerModalContent, { maxWidth: 320 }]}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Home Number</Text>
              <TouchableOpacity onPress={() => setShowFormHomePicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {societyHomes.map((h) => {
                const isSelected = String(assignFormData.home_id) === String(h.id);
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      handleHomeChange(h.id);
                      setShowFormHomePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                      Home {h.home_number || h.flat_number} {h.block_or_tower ? `(${h.block_or_tower})` : ''}
                    </Text>
                    {isSelected && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Form Occupant Dropdown Modal */}
      <Modal
        visible={showFormOccupantPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFormOccupantPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowFormOccupantPicker(false)}
        >
          <TouchableOpacity
            style={[styles.pickerModalContent, { maxWidth: 320 }]}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Resident Occupant</Text>
              <TouchableOpacity onPress={() => setShowFormOccupantPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {homeOccupants.map((occ) => {
                const id = String(occ.user_id || occ.userId || occ.id);
                const isSelected = String(assignFormData.user_id) === id;
                const roleLabel =
                  occ.role_type === 'FAMILY_MEMBER'
                    ? 'Family Member'
                    : occ.role_type === 'OWNER'
                      ? 'Owner'
                      : occ.role_type === 'TENANT'
                        ? 'Tenant'
                        : occ.role_type || 'Resident';

                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      handleOccupantSelect(id);
                      setShowFormOccupantPicker(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                        {occ.full_name || occ.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: THEME.colors.textMuted }}>
                        {roleLabel} {occ.phone ? `• ${occ.phone}` : ''}
                      </Text>
                    </View>
                    {isSelected && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Form Position Dropdown Modal */}
      <Modal
        visible={showFormPositionPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFormPositionPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowFormPositionPicker(false)}
        >
          <TouchableOpacity
            style={[styles.pickerModalContent, { maxWidth: 320 }]}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Position</Text>
              <TouchableOpacity onPress={() => setShowFormPositionPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {[
                'HEAD',
                'CHAIRPERSON',
                'PRESIDENT',
                'SECRETARY',
                'TREASURER',
                'COORDINATOR',
                'COMMITTEE_MEMBER',
              ].map((pos) => {
                const isSelected = assignFormData.position === pos;
                const label = POSITION_CONFIG[pos]?.label || pos;
                return (
                  <TouchableOpacity
                    key={pos}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setAssignFormData((p) => ({ ...p, position: pos }));
                      setShowFormPositionPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                      {label}
                    </Text>
                    {isSelected && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Form Status Dropdown Modal */}
      <Modal
        visible={showFormStatusPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFormStatusPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowFormStatusPicker(false)}
        >
          <TouchableOpacity
            style={[styles.pickerModalContent, { maxWidth: 320 }]}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setShowFormStatusPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            {['ACTIVE', 'INACTIVE'].map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.pickerItem, assignFormData.status === st && styles.pickerItemSelected]}
                onPress={() => {
                  setAssignFormData((p) => ({ ...p, status: st }));
                  setShowFormStatusPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, assignFormData.status === st && { fontWeight: '800' }]}>
                  {st}
                </Text>
                {assignFormData.status === st && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* =========================================================================
          MODAL 3: EDIT COMMITTEE MEMBER (Admin Only)
      ========================================================================== */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.formModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Committee Member</Text>
                <Text style={styles.modalSubtitle}>Update designation & status for {editFormData.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <CustomIcon name="close" size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Member Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFormData.name}
                  onChangeText={(val) => setEditFormData((p) => ({ ...p, name: val }))}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Committee</Text>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setShowEditCommitteePicker(true)}
                >
                  <Text style={styles.dropdownBtnText}>
                    {(() => {
                      const found = committees.find((c) => String(c.id) === String(editFormData.committee_id));
                      return found ? found.name : '-- Select Committee --';
                    })()}
                  </Text>
                  <CustomIcon name="chevronRight" size={14} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Position</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowEditPositionPicker(true)}
                  >
                    <Text style={styles.dropdownBtnText} numberOfLines={1}>
                      {POSITION_CONFIG[editFormData.position]?.label || editFormData.position}
                    </Text>
                    <CustomIcon name="chevronRight" size={12} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <TouchableOpacity
                    style={styles.dropdownBtn}
                    onPress={() => setShowEditStatusPicker(true)}
                  >
                    <Text style={styles.dropdownBtnText}>{editFormData.status}</Text>
                    <CustomIcon name="chevronRight" size={12} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFormData.phone}
                  onChangeText={(val) => setEditFormData((p) => ({ ...p, phone: val }))}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFormData.email}
                  onChangeText={(val) => setEditFormData((p) => ({ ...p, email: val }))}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Responsibilities Note</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFormData.responsibilities}
                  onChangeText={(val) => setEditFormData((p) => ({ ...p, responsibilities: val }))}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleEditSubmit}
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Committee Dropdown Modal */}
      <Modal
        visible={showEditCommitteePicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEditCommitteePicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowEditCommitteePicker(false)}
        >
          <TouchableOpacity
            style={[styles.pickerModalContent, { maxWidth: 320 }]}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Committee</Text>
              <TouchableOpacity onPress={() => setShowEditCommitteePicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {committees.map((c) => {
                const isSelected = String(editFormData.committee_id) === String(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setEditFormData((p) => ({ ...p, committee_id: String(c.id) }));
                      setShowEditCommitteePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                      {c.name}
                    </Text>
                    {isSelected && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Position Dropdown Modal */}
      <Modal
        visible={showEditPositionPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEditPositionPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowEditPositionPicker(false)}
        >
          <TouchableOpacity
            style={[styles.pickerModalContent, { maxWidth: 320 }]}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Position</Text>
              <TouchableOpacity onPress={() => setShowEditPositionPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280 }}>
              {[
                'HEAD',
                'CHAIRPERSON',
                'PRESIDENT',
                'SECRETARY',
                'TREASURER',
                'COORDINATOR',
                'COMMITTEE_MEMBER',
              ].map((pos) => {
                const isSelected = editFormData.position === pos;
                const label = POSITION_CONFIG[pos]?.label || pos;
                return (
                  <TouchableOpacity
                    key={pos}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setEditFormData((p) => ({ ...p, position: pos }));
                      setShowEditPositionPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, isSelected && { fontWeight: '800' }]}>
                      {label}
                    </Text>
                    {isSelected && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Status Dropdown Modal */}
      <Modal
        visible={showEditStatusPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEditStatusPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowEditStatusPicker(false)}
        >
          <TouchableOpacity
            style={[styles.pickerModalContent, { maxWidth: 320 }]}
            activeOpacity={1}
            onPress={() => { }}
          >
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setShowEditStatusPicker(false)}>
                <CustomIcon name="close" size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>
            {['ACTIVE', 'INACTIVE'].map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.pickerItem, editFormData.status === st && styles.pickerItemSelected]}
                onPress={() => {
                  setEditFormData((p) => ({ ...p, status: st }));
                  setShowEditStatusPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, editFormData.status === st && { fontWeight: '800' }]}>
                  {st}
                </Text>
                {editFormData.status === st && <CustomIcon name="check" size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* =========================================================================
          MODAL 4: QUICK MESSAGE / WHATSAPP MODAL
      ========================================================================== */}
      <Modal
        visible={Boolean(messagingMember)}
        animationType="fade"
        transparent
        onRequestClose={() => setMessagingMember(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.formModalCard, { maxWidth: 380 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.msgIconCircle}>
                  <CustomIcon name="messageSquare" size={18} color={THEME.colors.clay} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Contact Committee Member</Text>
                  <Text style={styles.modalSubtitle}>
                    {messagingMember?.name} • {messagingMember?.committee_name || 'Committee'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setMessagingMember(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <CustomIcon name="close" size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <Text style={styles.presetSectionTitle}>Quick Preset Messages:</Text>
              <View style={styles.presetButtonsRow}>
                {[
                  'Regarding upcoming committee meeting agenda',
                  'Society maintenance update enquiry',
                  'Festival celebration participation query',
                  'Requesting committee review on flat notice',
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

              <View style={[styles.fieldGroup, { marginTop: 12 }]}>
                <Text style={styles.fieldLabel}>Message Content:</Text>
                <TextInput
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  numberOfLines={3}
                  placeholder="Type your message for this committee member..."
                  placeholderTextColor={THEME.colors.textDim}
                  value={messageText}
                  onChangeText={setMessageText}
                />
              </View>
            </ScrollView>

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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerComponentContainer: {
    marginBottom: 14,
  },

  /* Top Action Bar */
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  createComHeaderBtn: {
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
  createComHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  assignHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: THEME.radius.md,
    ...THEME.shadows.card,
  },
  assignHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Official Appointment Banner */
  officialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 14,
    ...THEME.shadows.card,
  },
  crownBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officialBannerPreTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  activeOfficePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  activeOfficePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  officialMemberName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 2,
  },
  officialSubText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
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

  /* Filter & Search Section (Borderless, full width) */
  filterSection: {
    marginBottom: 12,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: THEME.colors.darkBrown,
    paddingVertical: 0,
  },
  dropdownBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    paddingHorizontal: 12,
    height: 40,
  },
  dropdownLeftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdownBtnHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    paddingHorizontal: 12,
    height: 38,
  },
  dropdownHalfContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 6,
  },
  dropdownLabel: {
    fontSize: 11,
    color: THEME.colors.textDim,
    fontWeight: '600',
  },
  dropdownValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  dropdownValueHalf: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },

  /* Member Card */
  memberCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    marginBottom: 12,
    ...THEME.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  avatarInitialText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    flex: 1,
  },
  youBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  positionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    marginTop: 4,
  },
  positionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rightBadgesCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  homeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.sandWell,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  homeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textActive: {
    color: '#15803D',
  },
  textInactive: {
    color: '#94A3B8',
  },
  committeeWingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.sandWell,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAE0D5',
    marginTop: 10,
  },
  committeeWingText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.clay,
    flex: 1,
  },
  contactDetailsBox: {
    marginTop: 8,
    gap: 4,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailItemText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0E8DC',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    ...THEME.shadows.card,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adminActionGroup: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  actionIconBtn: {
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

  /* Empty State */
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
    maxWidth: 280,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    marginTop: 16,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
    zIndex: 10,
    elevation: 8,
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
    maxWidth: 300,
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
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
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
    flex: 1,
  },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },

  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: THEME.colors.sandWell,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  togglePillActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  togglePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  togglePillTextActive: {
    color: '#FFFFFF',
  },

  selectedOccBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: THEME.radius.md,
    padding: 10,
    marginBottom: 12,
  },
  selectedOccBannerText: {
    fontSize: 12,
    color: '#065F46',
  },

  /* Checkbox Banner */
  checkboxBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1.5,
    borderColor: '#EAE0D5',
    borderRadius: THEME.radius.md,
    padding: 12,
    marginTop: 6,
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
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkboxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
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
    minWidth: 110,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Contact Modal */
  msgIconCircle: {
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

  /* Overlay Pickers */
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
    zIndex: 20,
    elevation: 12,
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
  pickerItemSubtext: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  pickerCreateComBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.colors.clay,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
    backgroundColor: 'rgba(196, 154, 108, 0.08)',
  },
  pickerCreateComBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
});
