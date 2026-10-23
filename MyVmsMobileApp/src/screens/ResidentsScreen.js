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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Users,
  UserCheck,
  Plus,
  Phone,
  Mail,
  Home,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Power,
  RefreshCw,
  Building2,
  DoorOpen,
  Calendar,
  ChevronLeft,
  ChevronDown,
  Check,
  Lock,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { residentApi, societyApi, homeApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

const UNIT_TYPES = [
  '1BHK',
  '2BHK',
  '3BHK',
  '4BHK',
  'BUNGALOW',
  'VILLA',
  'PENTHOUSE',
  'STUDIO',
  'OTHER',
];

const defaultCreateForm = {
  society_id: 1,
  home_number: '',
  society_type: 'FLAT',
  building_or_wing: '',
  floor: '',
  home_type: '2BHK',
  name: '',
  phone: '',
  email: '',
  password: '',
  resident_type: 'OWNER',
  move_in_date: new Date().toISOString().split('T')[0],
  status: 'ACTIVE',
};

export const ResidentsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isAdmin = !user?.role || user?.role === 'ADMIN' || user?.role === 'RESIDENTIAL_ADMIN';

  // Data state
  const [residents, setResidents] = useState([]);
  const [homes, setHomes] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OCCUPIED' | 'VACANT' | 'UNIT_<num>'
  const [residentTypeFilter, setResidentTypeFilter] = useState('ALL'); // 'ALL' | 'OWNER' | 'TENANT'

  // Filter Modals
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Action Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUnitTypePicker, setShowUnitTypePicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);

  // Notifications
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Create Resident Form
  const [createForm, setCreateForm] = useState(defaultCreateForm);

  // Edit Resident Form
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    resident_type: 'OWNER',
    status: 'ACTIVE',
  });

  // Reset Password State
  const [newPasswordInput, setNewPasswordInput] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resRes, socRes, homesRes] = await Promise.all([
        residentApi.getResidents().catch(() => ({ data: { residents: [] } })),
        societyApi.getSocieties().catch(() => ({ data: { societies: [] } })),
        societyApi.getAllHomes().catch(() => ({ data: { homes: [] } })),
      ]);

      const socList = socRes.data?.societies || socRes.societies || [];
      setSocieties(socList);

      const allResidents = resRes.data?.residents || resRes.residents || [];
      setResidents(allResidents);

      const allHomes = homesRes.data?.homes || homesRes.homes || (Array.isArray(homesRes.data) ? homesRes.data : []);
      setHomes(allHomes);

      if (socList.length > 0) {
        setCreateForm((prev) => ({
          ...prev,
          society_id: socList[0].id,
          building_or_wing: socList[0].society_type === 'BUNGALOW' ? 'Row 1' : 'Wing A',
          home_type: socList[0].society_type === 'BUNGALOW' ? 'BUNGALOW' : '2BHK',
        }));
      }
    } catch (err) {
      console.log('Error fetching initial resident data:', err);
      setErrorMsg(err.message || 'Failed to fetch residents and unit data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const currentSociety = societies[0] || null;
  const isFlat = currentSociety?.society_type === 'FLAT';
  const totalSocietyHomes = currentSociety ? (currentSociety.total_homes || homes.length || 10) : 0;

  // -------------------------------------------------------------
  // Auto-generate Row & Column Units data (Parity with frontend)
  // -------------------------------------------------------------
  const allUnitsData = useMemo(() => {
    // If no society has been created yet, do not generate or display any units
    if (!currentSociety) {
      return [];
    }

    const homeByNum = new Map();
    (homes || []).forEach((h) => {
      if (!h || !h.home_number) return;
      const raw = String(h.home_number).trim();
      const lower = raw.toLowerCase();
      homeByNum.set(lower, h);
      const pureNum = lower.replace(/^(home|flat|unit|villa)\s*/i, '').trim();
      homeByNum.set(pureNum, h);
      homeByNum.set(lower.replace(/[-\s]/g, ''), h);
    });

    const resByHomeId = new Map();
    const resByHomeNum = new Map();
    (residents || []).forEach((r) => {
      if (!r) return;
      if (r.home_id) resByHomeId.set(r.home_id, r);
      if (r.home_number) {
        const raw = String(r.home_number).trim();
        const lower = raw.toLowerCase();
        resByHomeNum.set(lower, r);
        const pureNum = lower.replace(/^(home|flat|unit|villa)\s*/i, '').trim();
        resByHomeNum.set(pureNum, r);
        resByHomeNum.set(lower.replace(/[-\s]/g, ''), r);
      }
    });

    const societyHomes = (homes || []).filter(
      (h) => !h.society_id || String(h.society_id) === String(currentSociety.id)
    );

    if (societyHomes.length > 0) {
      const sortedHomes = [...societyHomes].sort((a, b) => {
        const wingA = String(a.building_or_wing || '').toUpperCase();
        const wingB = String(b.building_or_wing || '').toUpperCase();
        if (wingA !== wingB) return wingA.localeCompare(wingB);
        const numA = parseInt(String(a.home_number).replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.home_number).replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      return sortedHomes.map((h, index) => {
        const rawNum = String(h.home_number || '').trim();
        const lower = rawNum.toLowerCase();
        const pureNum = lower.replace(/^(home|flat|unit|villa)\s*/i, '').trim();
        const res =
          resByHomeId.get(h.id) ||
          resByHomeNum.get(lower) ||
          resByHomeNum.get(pureNum) ||
          resByHomeNum.get(lower.replace(/[-\s]/g, '')) ||
          null;

        return {
          id: h.id,
          home_id: h.id,
          displayNumber: rawNum,
          rawNumber: rawNum,
          slotNumber: index + 1,
          building_or_wing: h.building_or_wing || null,
          floor: h.floor !== null && h.floor !== undefined && String(h.floor).trim() !== '' ? h.floor : null,
          society_type: currentSociety.society_type || 'BUNGALOW',
          home_type: h.home_type || currentSociety?.property_configuration || '2BHK',
          isConfigured: true,
          isOccupied: !!res,
          resident: res,
        };
      });
    }

    // Fallback if homes not yet configured in DB
    const expectedSlots = [];
    if (isFlat) {
      const towerACount = Math.ceil(totalSocietyHomes / 2);
      const towerBCount = totalSocietyHomes - towerACount;

      for (let i = 1; i <= towerACount; i++) {
        expectedSlots.push({
          rawNumber: `A-${100 + i}`,
          tower: 'A',
          floor: 1,
        });
      }
      for (let i = 1; i <= towerBCount; i++) {
        expectedSlots.push({
          rawNumber: `B-${200 + i}`,
          tower: 'B',
          floor: 1,
        });
      }
    } else {
      for (let i = 1; i <= totalSocietyHomes; i++) {
        expectedSlots.push({
          rawNumber: String(i),
          tower: null,
          floor: null,
        });
      }
    }

    return expectedSlots.map((slot, index) => {
      const targetStr = slot.rawNumber.toLowerCase();
      const res =
        resByHomeNum.get(targetStr) ||
        resByHomeNum.get(targetStr.replace(/[-\s]/g, '')) ||
        resByHomeNum.get(`home ${targetStr}`) ||
        null;

      return {
        id: `auto-slot-${index + 1}`,
        home_id: null,
        displayNumber: slot.rawNumber,
        rawNumber: slot.rawNumber,
        slotNumber: index + 1,
        building_or_wing: slot.tower || null,
        floor: slot.floor,
        society_type: currentSociety.society_type || 'BUNGALOW',
        home_type: currentSociety?.property_configuration || '2BHK',
        isConfigured: false,
        isOccupied: !!res,
        resident: res,
      };
    });
  }, [homes, residents, currentSociety, totalSocietyHomes, isFlat]);

  // Filtered rows for the list
  const filteredUnits = useMemo(() => {
    return allUnitsData.filter((u) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        (u.displayNumber && u.displayNumber.toLowerCase().includes(q)) ||
        (u.rawNumber && String(u.rawNumber).toLowerCase().includes(q)) ||
        (u.building_or_wing && u.building_or_wing.toLowerCase().includes(q)) ||
        (u.resident?.full_name && u.resident.full_name.toLowerCase().includes(q)) ||
        (u.resident?.phone && u.resident.phone.includes(searchTerm)) ||
        (u.resident?.email && u.resident.email.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'OCCUPIED' && u.isOccupied) ||
        (statusFilter === 'VACANT' && !u.isOccupied) ||
        (statusFilter.startsWith('UNIT_') && String(u.rawNumber) === statusFilter.replace('UNIT_', ''));

      const matchesType =
        residentTypeFilter === 'ALL' ||
        (u.resident && u.resident.resident_type === residentTypeFilter);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allUnitsData, searchTerm, statusFilter, residentTypeFilter]);

  const occupiedCount = allUnitsData.filter((u) => u.isOccupied).length;
  const vacantCount = allUnitsData.length - occupiedCount;

  // Notification helper
  const showToastSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showToastError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Open Create Resident Modal
  const handleOpenCreateModal = (unitOrNumber = '') => {
    const unitObj = typeof unitOrNumber === 'object' && unitOrNumber !== null ? unitOrNumber : null;
    const prefillUnitNumber = unitObj ? (unitObj.rawNumber || unitObj.displayNumber) : unitOrNumber;
    const defaultType = unitObj?.home_type || currentSociety?.property_configuration || (currentSociety?.society_type === 'BUNGALOW' ? '2BHK' : '2BHK');
    const defaultSocietyType = currentSociety?.society_type || 'FLAT';

    let wing = unitObj?.building_or_wing || '';
    let floorVal = unitObj?.floor !== null && unitObj?.floor !== undefined ? String(unitObj.floor) : '';

    if (defaultSocietyType === 'FLAT' && prefillUnitNumber) {
      if (!wing) {
        const match = String(prefillUnitNumber).match(/^([A-Za-z]+)[-_]/);
        if (match) wing = match[1];
      }
      if (!floorVal) {
        const numPart = String(prefillUnitNumber).replace(/^[A-Za-z]+[-_]/, '');
        if (numPart.length >= 3) {
          floorVal = numPart.slice(0, -2);
        } else {
          floorVal = '1';
        }
      }
    }

    setCreateForm({
      ...defaultCreateForm,
      society_id: currentSociety?.id || 1,
      home_number: prefillUnitNumber ? String(prefillUnitNumber).replace(/^(home|flat|unit|villa)\s*/i, '').trim() : '',
      society_type: defaultSocietyType,
      building_or_wing: wing,
      floor: floorVal,
      home_type: defaultType,
      move_in_date: new Date().toISOString().split('T')[0],
    });
    setShowUnitTypePicker(false);
    setShowCreateModal(true);
  };

  // Submit Create Resident
  const handleCreateResident = async () => {
    const hNum = String(createForm?.home_number || '').trim();
    if (!hNum) {
      Alert.alert('Required', 'Please enter a Home / Flat Number.');
      return;
    }
    if (!createForm?.name?.trim()) {
      Alert.alert('Required', 'Resident Full Name is required.');
      return;
    }
    if (!createForm?.phone?.trim()) {
      Alert.alert('Required', 'Resident Phone Number is required for login.');
      return;
    }

    setSubmitting(true);
    try {
      const activeSocId = createForm?.society_id || currentSociety?.id || 1;

      // Check if home already exists in DB
      let targetHome = (homes || []).find(
        (h) => h?.home_number && String(h.home_number).toLowerCase() === hNum.toLowerCase()
      );

      // If unit does not exist in DB, create it first
      if (!targetHome) {
        const homeRes = await societyApi.createHome(activeSocId, {
          home_number: hNum,
          building_or_wing: createForm.building_or_wing || null,
          floor: createForm.floor !== '' && createForm.floor !== null ? Number(createForm.floor) : null,
          home_type: createForm.home_type || '2BHK',
          occupancy_status: 'VACANT',
        });
        targetHome = homeRes.data?.home || homeRes.home || homeRes.data;
      }

      const targetHomeId = targetHome?.id || targetHome?.insertId;

      await residentApi.createResident({
        home_id: targetHomeId,
        home_number: hNum,
        society_id: activeSocId,
        building_or_wing: createForm.building_or_wing || null,
        floor: createForm.floor !== '' && createForm.floor !== null ? Number(createForm.floor) : null,
        home_type: createForm.home_type,
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email ? createForm.email.trim() : null,
        password: createForm.password || 'Password@123',
        resident_type: createForm.resident_type || 'OWNER',
        move_in_date: createForm.move_in_date || new Date().toISOString().split('T')[0],
        status: createForm.status || 'ACTIVE',
      });

      setShowCreateModal(false);
      setShowUnitTypePicker(false);
      setCreateForm(defaultCreateForm);
      showToastSuccess(`Resident "${createForm.name}" registered for Unit ${hNum}!`);
      await fetchInitialData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to register resident.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Resident
  const handleEditResident = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Required', 'Full Name is required.');
      return;
    }
    if (!editForm.phone.trim()) {
      Alert.alert('Required', 'Phone Number is required.');
      return;
    }

    setSubmitting(true);
    try {
      await residentApi.updateResident(selectedResident.id, editForm);
      setShowEditModal(false);
      showToastSuccess('Resident details updated successfully!');
      await fetchInitialData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update resident.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Resident Status
  const handleToggleStatus = (res) => {
    const newStatus = res.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    Alert.alert(
      'Change Status',
      `Change resident status to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await residentApi.updateResidentStatus(res.id, newStatus);
              showToastSuccess(`Status updated to ${newStatus}`);
              await fetchInitialData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to update status.');
            }
          },
        },
      ]
    );
  };

  // Reset Password
  const handleResetPassword = async () => {
    if (!newPasswordInput || newPasswordInput.length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters long.');
      return;
    }
    setSubmitting(true);
    try {
      await residentApi.resetResidentPassword(selectedResident.id, newPasswordInput);
      setShowResetPasswordModal(false);
      setNewPasswordInput('');
      showToastSuccess('Password reset successfully!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Resident
  const handleDeleteResident = (res) => {
    Alert.alert(
      'Remove Resident',
      `Are you sure you want to remove resident "${res.full_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await residentApi.deleteResident(res.id);
              showToastSuccess('Resident removed successfully.');
              await fetchInitialData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete resident.');
            }
          },
        },
      ]
    );
  };

  // Delete Vacant Unit / Home
  const handleDeleteUnit = (u) => {
    Alert.alert(
      'Delete Unit',
      `Are you sure you want to delete ${u.displayNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (u.home_id) {
                await homeApi.deleteHome(u.home_id);
              }
              if (currentSociety && currentSociety.id && currentSociety.total_homes > 0) {
                const newTotal = Math.max(0, currentSociety.total_homes - 1);
                await societyApi.updateSociety(currentSociety.id, {
                  total_homes: newTotal,
                });
              }
              showToastSuccess(`${u.displayNumber} deleted successfully.`);
              await fetchInitialData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete unit.');
            }
          },
        },
      ]
    );
  };

  // Status Filter Label
  const getStatusFilterLabel = () => {
    if (statusFilter === 'ALL') return `All Units (${allUnitsData.length})`;
    if (statusFilter === 'OCCUPIED') return `Occupied (${occupiedCount})`;
    if (statusFilter === 'VACANT') return `Vacant (${vacantCount})`;
    if (statusFilter.startsWith('UNIT_')) return `Unit ${statusFilter.replace('UNIT_', '')}`;
    return 'All Units';
  };

  // Type Filter Label
  const getTypeFilterLabel = () => {
    if (residentTypeFilter === 'ALL') return 'All Types';
    if (residentTypeFilter === 'OWNER') return 'Owner';
    if (residentTypeFilter === 'TENANT') return 'Tenant';
    return 'All Types';
  };

  // -------------------------------------------------------------
  // Render Unit & Resident Card (FlatList Item)
  // -------------------------------------------------------------
  const renderUnitCard = ({ item: u }) => {
    const res = u.resident;
    const isOcc = u.isOccupied;
    const cleanNum = String(u.rawNumber).replace(/^(home|flat|unit|villa)\s*/i, '').trim() || u.rawNumber;

    return (
      <View style={[styles.unitCard, isOcc ? styles.unitCardOccupied : styles.unitCardVacant]}>
        {/* Card Header: Unit, Home, Type, Configuration, Occupancy */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.unitInfoLeft}>
            <View
              style={[
                styles.unitIconWrap,
                isOcc ? styles.unitIconWrapGreen : styles.unitIconWrapAmber,
              ]}
            >
              {isFlat ? (
                <Building2 size={18} color={isOcc ? THEME.colors.fernGreenDark : '#d97706'} />
              ) : (
                <Home size={18} color={isOcc ? THEME.colors.fernGreenDark : THEME.colors.clayLight || '#b45309'} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {/* 1. Unit Slot Badge */}
                <View style={{ backgroundColor: 'rgba(196, 154, 108, 0.16)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.colors.darkBrown }}>
                    Unit {u.slotNumber}
                  </Text>
                </View>

                {/* 2. Home Number */}
                <Text style={styles.unitNumberText}>Home {cleanNum}</Text>

                {/* 3. Type Badge */}
                <View style={{ backgroundColor: isFlat ? 'rgba(217, 119, 6, 0.12)' : 'rgba(107, 142, 90, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: isFlat ? '#b45309' : THEME.colors.fernGreenDark }}>
                    {isFlat ? 'Flat' : 'Bungalow'}
                  </Text>
                </View>

                {/* 6. Property Configuration */}
                <View style={styles.unitTypePill}>
                  <Text style={styles.unitTypePillText}>{u.home_type}</Text>
                </View>
              </View>

              {/* 4 & 5. Tower & Floor (only if Flat) */}
              {isFlat && (
                <Text style={styles.unitWingFloorText}>
                  {u.building_or_wing ? `Tower ${String(u.building_or_wing).replace(/^Tower\s*/i, '')}` : 'Tower —'} • {u.floor ? `Floor ${u.floor}` : 'Floor 1'}
                </Text>
              )}
            </View>
          </View>

          {/* 7. Occupancy Badge */}
          <View
            style={[
              styles.occupancyBadge,
              isOcc ? styles.occupancyBadgeGreen : styles.occupancyBadgeAmber,
            ]}
          >
            <Text
              style={[
                styles.occupancyBadgeText,
                isOcc ? styles.occupancyBadgeTextGreen : styles.occupancyBadgeTextAmber,
              ]}
            >
              {isOcc ? 'OCCUPIED' : 'VACANT'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Card Body: Resident Information or Vacant Notice */}
        {isOcc && res ? (
          <View style={styles.residentBody}>
            {/* 8. Resident Name & 9. Resident Type Badge */}
            <View style={styles.resNameRow}>
              <Text style={styles.resNameText} numberOfLines={1}>
                {res.full_name}
              </Text>
              <View
                style={[
                  styles.resTypeBadge,
                  res.resident_type === 'OWNER'
                    ? styles.resTypeBadgeOwner
                    : styles.resTypeBadgeTenant,
                ]}
              >
                <Text
                  style={[
                    styles.resTypeBadgeText,
                    res.resident_type === 'OWNER'
                      ? styles.resTypeBadgeTextOwner
                      : styles.resTypeBadgeTextTenant,
                  ]}
                >
                  {res.resident_type}
                </Text>
              </View>
            </View>

            {/* 10. Phone Number & Status */}
            <View style={styles.resMetaRow}>
              <View style={styles.resMetaItem}>
                <Phone size={13} color={THEME.colors.fernGreen} />
                <Text style={styles.resPhoneText}>{res.phone || '—'}</Text>
              </View>

              <View
                style={[
                  styles.statusChip,
                  res.status === 'ACTIVE' ? styles.statusChipActive : styles.statusChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    res.status === 'ACTIVE' ? styles.statusChipTextActive : styles.statusChipTextInactive,
                  ]}
                >
                  {res.status}
                </Text>
              </View>
            </View>

            {/* 11. Email */}
            <View style={[styles.resMetaItem, { marginTop: 4 }]}>
              <Mail size={13} color="#d97706" />
              <Text style={[styles.resEmailText, { color: res.email ? THEME.colors.darkBrown : THEME.colors.textDim }]} numberOfLines={1}>
                {res.email || '—'}
              </Text>
            </View>

            {/* 12. Move-in Date */}
            <View style={[styles.resMetaItem, { marginTop: 4 }]}>
              <Calendar size={13} color={THEME.colors.textDim} />
              <Text style={styles.resDateText}>
                Move-in: {res.move_in_date ? res.move_in_date.split('T')[0] : '—'}
              </Text>
            </View>

            {/* 13. Actions Toolbar for Occupied Card */}
            {isAdmin && (
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.actionBtnOutline}
                  onPress={() => {
                    setSelectedResident(res);
                    setEditForm({
                      name: res.full_name,
                      phone: res.phone,
                      email: res.email || '',
                      resident_type: res.resident_type,
                      status: res.status,
                    });
                    setShowEditModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Edit2 size={13} color={THEME.colors.clayDark} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnSecondary}
                  onPress={() => {
                    setSelectedResident(res);
                    setNewPasswordInput('');
                    setShowResetPasswordModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <KeyRound size={13} color="#d97706" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnOutline}
                  onPress={() => handleToggleStatus(res)}
                  activeOpacity={0.7}
                >
                  <Power
                    size={13}
                    color={res.status === 'ACTIVE' ? '#e11d48' : '#15803d'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnDanger}
                  onPress={() => handleDeleteResident(res)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={13} color="#e11d48" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.vacantBody}>
            <View style={styles.vacantNoticeRow}>
              <Text style={styles.vacantNoticeText}>— Vacant Unit — Available for allocation</Text>
            </View>

            {isAdmin && (
              <View style={styles.vacantActionsRow}>
                <TouchableOpacity
                  style={styles.createResidentForUnitBtn}
                  onPress={() => handleOpenCreateModal(u.rawNumber)}
                  activeOpacity={0.8}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.createResidentForUnitBtnText}>Create Resident</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteUnitBtn}
                  onPress={() => handleDeleteUnit(u)}
                  activeOpacity={0.8}
                >
                  <Trash2 size={13} color="#e11d48" />
                  <Text style={styles.deleteUnitBtnText}>Delete Unit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ========================================================
          1. HEADER (RESIDENT MANAGEMENT)
          ======================================================== */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={26} color={THEME.colors.darkBrown} />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingLeft: 6 }}>
            <Text style={styles.headerTitle}>Resident Management</Text>

          </View>


        </View>

        {/* Primary Action Button: "Create Resident" */}

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
          4. SEARCH BAR & DROPDOWN FILTERS
          ======================================================== */}
      <View style={styles.filterSection}>
        {/* Search Input & Action Button Row */}
        <View style={styles.searchAndButtonRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={THEME.colors.textDim} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search unit number, resident or phone..."
              placeholderTextColor={THEME.colors.textDim}
              value={searchTerm}
              onChangeText={setSearchTerm}
              clearButtonMode="while-editing"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={THEME.colors.textDim} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Dropdown Filters Row */}
        <View style={styles.dropdownRow}>
          {/* Unit Dropdown Trigger */}
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowStatusPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownBtnText} numberOfLines={1}>
              {getStatusFilterLabel()}
            </Text>
            <ChevronDown size={14} color={THEME.colors.darkBrown} />
          </TouchableOpacity>

          {/* Type Dropdown Trigger */}
          <TouchableOpacity
            style={[styles.dropdownBtn, { minWidth: 110 }]}
            onPress={() => setShowTypePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownBtnText} numberOfLines={1}>
              {getTypeFilterLabel()}
            </Text>
            <ChevronDown size={14} color={THEME.colors.darkBrown} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ========================================================
          5. MAIN CONTENT: CARD TYPE UI USING FLATLIST
          ======================================================== */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading resident directory...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUnits}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUnitCard}
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
            <View style={styles.emptyContainer}>
              <Home size={44} color={THEME.colors.sand} style={{ opacity: 0.7, marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>
                {allUnitsData.length === 0 ? 'No Residential Units' : 'No Matching Units'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {allUnitsData.length === 0
                  ? 'There are currently no residential units in this society.'
                  : 'No units or residents match your search / filter criteria.'}
              </Text>
              {allUnitsData.length === 0 && isAdmin && (
                <TouchableOpacity
                  style={[styles.createResidentForUnitBtn, { marginTop: 14, paddingHorizontal: 18 }]}
                  onPress={() => handleOpenCreateModal('1')}
                  activeOpacity={0.8}
                >
                  <Plus size={15} color="#FFFFFF" />
                  <Text style={styles.createResidentForUnitBtnText}>Create Resident / Unit</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ========================================================
          MODAL: UNIT STATUS / SELECTION DROPDOWN
          ======================================================== */}
      <Modal
        visible={showStatusPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowStatusPicker(false)}
        >
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Filter by Unit</Text>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                <X size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              <TouchableOpacity
                style={[styles.pickerItem, statusFilter === 'ALL' && styles.pickerItemActive]}
                onPress={() => {
                  setStatusFilter('ALL');
                  setShowStatusPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, statusFilter === 'ALL' && styles.pickerItemTextActive]}>
                  All Units ({allUnitsData.length})
                </Text>
                {statusFilter === 'ALL' && <Check size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerItem, statusFilter === 'OCCUPIED' && styles.pickerItemActive]}
                onPress={() => {
                  setStatusFilter('OCCUPIED');
                  setShowStatusPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, statusFilter === 'OCCUPIED' && styles.pickerItemTextActive]}>
                  Occupied Units ({occupiedCount})
                </Text>
                {statusFilter === 'OCCUPIED' && <Check size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerItem, statusFilter === 'VACANT' && styles.pickerItemActive]}
                onPress={() => {
                  setStatusFilter('VACANT');
                  setShowStatusPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, statusFilter === 'VACANT' && styles.pickerItemTextActive]}>
                  Vacant Units ({vacantCount})
                </Text>
                {statusFilter === 'VACANT' && <Check size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>

              <View style={styles.pickerSectionDivider}>
                <Text style={styles.pickerSectionTitle}>Specific Units</Text>
              </View>

              {allUnitsData.map((u) => {
                const pure = String(u.rawNumber).replace(/^(home|flat|unit|villa)\s*/i, '').trim() || u.rawNumber;
                const isSelected = statusFilter === `UNIT_${u.rawNumber}`;
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => {
                      setStatusFilter(`UNIT_${u.rawNumber}`);
                      setShowStatusPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                      Unit {pure} ({u.isOccupied ? 'Occupied' : 'Vacant'})
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
          MODAL: RESIDENT TYPE DROPDOWN
          ======================================================== */}
      <Modal
        visible={showTypePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowTypePicker(false)}
        >
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Filter by Type</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <X size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.pickerItem, residentTypeFilter === 'ALL' && styles.pickerItemActive]}
              onPress={() => {
                setResidentTypeFilter('ALL');
                setShowTypePicker(false);
              }}
            >
              <Text style={[styles.pickerItemText, residentTypeFilter === 'ALL' && styles.pickerItemTextActive]}>
                All Types
              </Text>
              {residentTypeFilter === 'ALL' && <Check size={16} color={THEME.colors.clay} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerItem, residentTypeFilter === 'OWNER' && styles.pickerItemActive]}
              onPress={() => {
                setResidentTypeFilter('OWNER');
                setShowTypePicker(false);
              }}
            >
              <Text style={[styles.pickerItemText, residentTypeFilter === 'OWNER' && styles.pickerItemTextActive]}>
                Owner
              </Text>
              {residentTypeFilter === 'OWNER' && <Check size={16} color={THEME.colors.clay} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerItem, residentTypeFilter === 'TENANT' && styles.pickerItemActive]}
              onPress={() => {
                setResidentTypeFilter('TENANT');
                setShowTypePicker(false);
              }}
            >
              <Text style={[styles.pickerItemText, residentTypeFilter === 'TENANT' && styles.pickerItemTextActive]}>
                Tenant
              </Text>
              {residentTypeFilter === 'TENANT' && <Check size={16} color={THEME.colors.clay} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================
          MODAL: CREATE RESIDENT & ASSIGN UNIT
          ======================================================== */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (showUnitTypePicker) {
            setShowUnitTypePicker(false);
          } else {
            setShowCreateModal(false);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.formModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>Create Resident</Text>
                <Text style={styles.modalHeaderSub}>Register account & assign residential unit</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowUnitTypePicker(false);
                  setShowCreateModal(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalFormScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* SECTION 1: RESIDENTIAL UNIT */}
              <Text style={styles.formSectionHeader}>1. RESIDENTIAL UNIT</Text>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    <Lock size={12} color={THEME.colors.textMuted} />
                    <Text style={styles.inputLabel}>Home No</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'rgba(214, 194, 161, 0.2)', color: THEME.colors.textDark, fontWeight: '700' }]}
                    editable={false}
                    value={createForm?.home_number ? String(createForm.home_number) : ''}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    <Lock size={12} color={THEME.colors.textMuted} />
                    <Text style={styles.inputLabel}>Type</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: 'rgba(214, 194, 161, 0.2)', color: THEME.colors.textDark, fontWeight: '700' }]}
                    editable={false}
                    value={createForm?.society_type === 'BUNGALOW' || currentSociety?.society_type === 'BUNGALOW' ? 'Bungalow' : 'Flat'}
                  />
                </View>
              </View>

              {/* Tower & Floor (ONLY shown if FLAT) - Non-changeable */}
              {(createForm?.society_type === 'FLAT' || isFlat) && (
                <View style={styles.formRowTwoCol}>
                  <View style={[styles.inputGroup, styles.formColHalf]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      <Lock size={12} color={THEME.colors.textMuted} />
                      <Text style={styles.inputLabel}>Tower</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: 'rgba(214, 194, 161, 0.2)', color: THEME.colors.textDark, fontWeight: '700' }]}
                      editable={false}
                      value={
                        createForm?.building_or_wing
                          ? (String(createForm.building_or_wing).toLowerCase().startsWith('tower')
                              ? createForm.building_or_wing
                              : `Tower ${String(createForm.building_or_wing).replace(/^Tower\s*/i, '')}`)
                          : '—'
                      }
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.formColHalf]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      <Lock size={12} color={THEME.colors.textMuted} />
                      <Text style={styles.inputLabel}>Floor</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: 'rgba(214, 194, 161, 0.2)', color: THEME.colors.textDark, fontWeight: '700' }]}
                      editable={false}
                      value={
                        createForm?.floor !== '' && createForm?.floor !== null && createForm?.floor !== undefined
                          ? (String(createForm.floor).toLowerCase().startsWith('floor')
                              ? String(createForm.floor)
                              : `Floor ${createForm.floor}`)
                          : '—'
                      }
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Configuration</Text>
                <TouchableOpacity
                  style={styles.dropdownSelectInput}
                  onPress={() => setShowUnitTypePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownSelectInputText} numberOfLines={1}>
                    {createForm?.home_type === 'PENTHOUSE' ? 'Penthouse' : (createForm?.home_type || '2BHK')}
                  </Text>
                  <ChevronDown size={16} color={THEME.colors.clay} />
                </TouchableOpacity>
              </View>

              {/* SECTION 2: RESIDENT ACCOUNT */}
              <Text style={[styles.formSectionHeader, { marginTop: 12 }]}>2. RESIDENT ACCOUNT</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Resident Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={THEME.colors.textDim}
                  value={createForm?.name || ''}
                  onChangeText={(v) => setCreateForm({ ...(createForm || defaultCreateForm), name: v })}
                />
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Phone (Login ID) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="9876543210"
                    keyboardType="phone-pad"
                    placeholderTextColor={THEME.colors.textDim}
                    value={createForm?.phone || ''}
                    onChangeText={(v) => setCreateForm({ ...(createForm || defaultCreateForm), phone: v })}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Email (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="name@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={THEME.colors.textDim}
                    value={createForm?.email || ''}
                    onChangeText={(v) => setCreateForm({ ...(createForm || defaultCreateForm), email: v })}
                  />
                </View>
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Password@123"
                    placeholderTextColor={THEME.colors.textDim}
                    value={createForm?.password || ''}
                    onChangeText={(v) => setCreateForm({ ...(createForm || defaultCreateForm), password: v })}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Resident Type</Text>
                  <View style={styles.choiceChipsRow}>
                    {['OWNER', 'TENANT'].map((rt) => (
                      <TouchableOpacity
                        key={rt}
                        style={[
                          styles.chipBtn,
                          createForm?.resident_type === rt && styles.chipBtnActive,
                        ]}
                        onPress={() => setCreateForm({ ...(createForm || defaultCreateForm), resident_type: rt })}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            createForm?.resident_type === rt && styles.chipTextActive,
                          ]}
                        >
                          {rt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Move-in Date */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <Calendar size={13} color={THEME.colors.textDim} />
                  <Text style={styles.inputLabel}>Move-In Date</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={THEME.colors.textDim}
                  value={createForm?.move_in_date || ''}
                  onChangeText={(v) => setCreateForm({ ...(createForm || defaultCreateForm), move_in_date: v })}
                />
              </View>
            </ScrollView>

            {/* Modal Actions Row */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowUnitTypePicker(false);
                  setShowCreateModal(false);
                }}
                disabled={submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateResident}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Create Resident</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Unit Type Dropdown Picker Overlay */}
          {showUnitTypePicker && (
            <View style={styles.unitTypePickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowUnitTypePicker(false)}
              />
              <View style={[styles.pickerCard, { maxWidth: 320, zIndex: 10 }]}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle}>Select Property Configuration</Text>
                  <TouchableOpacity
                    onPress={() => setShowUnitTypePicker(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE'].map((t) => {
                    const isSelected = createForm?.home_type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                        onPress={() => {
                          setCreateForm({ ...(createForm || defaultCreateForm), home_type: t });
                          setShowUnitTypePicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                          {t === 'PENTHOUSE' ? 'Penthouse' : t}
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
          MODAL: EDIT RESIDENT
          ======================================================== */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.formModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>Edit Resident</Text>
                <Text style={styles.modalHeaderSub}>Update resident details & account</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(v) => setEditForm({ ...editForm, name: v })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={editForm.phone}
                  onChangeText={(v) => setEditForm({ ...editForm, phone: v })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={editForm.email}
                  onChangeText={(v) => setEditForm({ ...editForm, email: v })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Resident Type</Text>
                <View style={styles.choiceChipsRow}>
                  {['OWNER', 'TENANT'].map((rt) => (
                    <TouchableOpacity
                      key={rt}
                      style={[
                        styles.chipBtn,
                        editForm.resident_type === rt && styles.chipBtnActive,
                      ]}
                      onPress={() => setEditForm({ ...editForm, resident_type: rt })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          editForm.resident_type === rt && styles.chipTextActive,
                        ]}
                      >
                        {rt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.choiceChipsRow}>
                  {['ACTIVE', 'INACTIVE'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.chipBtn,
                        editForm.status === st && styles.chipBtnActive,
                      ]}
                      onPress={() => setEditForm({ ...editForm, status: st })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          editForm.status === st && styles.chipTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleEditResident}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Update Resident</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          MODAL: RESET PASSWORD
          ======================================================== */}
      <Modal
        visible={showResetPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.formModalCard, { maxHeight: 300 }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>Reset Password</Text>
                <Text style={styles.modalHeaderSub}>
                  For {selectedResident?.full_name} ({selectedResident?.phone})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowResetPasswordModal(false)}>
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password (min 6 characters) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor={THEME.colors.textDim}
                secureTextEntry
                value={newPasswordInput}
                onChangeText={setNewPasswordInput}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowResetPasswordModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#d97706' }]}
                onPress={handleResetPassword}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Reset Password</Text>
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

  /* 1. Header Styles */
  header: {
    backgroundColor: THEME.colors.white,
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
  headerSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
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
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnCreateResident: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    gap: 6,
    ...THEME.shadows.card,
  },
  btnCreateResidentText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
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

  /* Quick Metrics Bar */
  metricsBar: {
    marginVertical: 10,
  },
  metricsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    gap: 10,
    minWidth: 125,
    ...THEME.shadows.card,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.colors.textDim,
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 1,
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
  dropdownBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },

  /* List & Cards */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  unitCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
    ...THEME.shadows.card,
  },
  unitCardOccupied: {
    backgroundColor: THEME.colors.white,
    borderColor: THEME.colors.sand,
  },
  unitCardVacant: {
    backgroundColor: '#fffdfa',
    borderColor: 'rgba(217, 119, 6, 0.25)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  unitInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  unitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitIconWrapGreen: {
    backgroundColor: 'rgba(107, 142, 90, 0.16)',
  },
  unitIconWrapAmber: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
  },
  unitNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  unitTypePill: {
    backgroundColor: 'rgba(196, 154, 108, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unitTypePillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  unitWingFloorText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  occupancyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  occupancyBadgeGreen: {
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
  },
  occupancyBadgeAmber: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
  },
  occupancyBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  occupancyBadgeTextGreen: {
    color: THEME.colors.fernGreenDark,
  },
  occupancyBadgeTextAmber: {
    color: '#b45309',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(214, 194, 161, 0.25)',
    marginVertical: 10,
  },

  /* Occupied Body */
  residentBody: {
    gap: 4,
  },
  resNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resNameText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    flex: 1,
  },
  resTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resTypeBadgeOwner: {
    backgroundColor: 'rgba(196, 154, 108, 0.2)',
  },
  resTypeBadgeTenant: {
    backgroundColor: 'rgba(6, 182, 212, 0.16)',
  },
  resTypeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  resTypeBadgeTextOwner: {
    color: THEME.colors.clayDark,
  },
  resTypeBadgeTextTenant: {
    color: '#0891b2',
  },
  resMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  resMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resPhoneText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
  },
  resEmailText: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  resDateText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusChipActive: {
    backgroundColor: 'rgba(21, 128, 61, 0.12)',
  },
  statusChipInactive: {
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
  },
  statusChipText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusChipTextActive: {
    color: '#15803D',
  },
  statusChipTextInactive: {
    color: '#e11d48',
  },

  /* Card Action Toolbar */
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },

  /* Vacant Body */
  vacantBody: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  vacantNoticeRow: {
    marginBottom: 8,
  },
  vacantNoticeText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: THEME.colors.textDim,
  },
  createResidentForUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    ...THEME.shadows.card,
  },
  createResidentForUnitBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  vacantActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  deleteUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deleteUnitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e11d48',
  },

  /* Empty & Loading States */
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  /* Modal Pickers (Unit & Type) */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: THEME.colors.white,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.float,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.3)',
    marginBottom: 6,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(196, 154, 108, 0.14)',
  },
  pickerItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
  },
  pickerItemTextActive: {
    color: THEME.colors.clayDark,
    fontWeight: '800',
  },
  pickerSectionDivider: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: THEME.colors.sandWell,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  pickerSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.clayDark,
    textTransform: 'uppercase',
  },

  /* Form Modals (Create / Edit / Reset Password) */
  formModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.float,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.3)',
    marginBottom: 10,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  modalHeaderSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  modalFormScroll: {
    maxHeight: 420,
  },
  formSectionHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.clay,
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    marginBottom: 4,
  },
  input: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    backgroundColor: THEME.colors.sandWell,
    paddingHorizontal: 12,
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  formColHalf: {
    flex: 1,
  },
  choiceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  chipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  chipBtnActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: THEME.colors.sandWell,
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
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.card,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dropdownSelectInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    backgroundColor: THEME.colors.sandWell,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSelectInputText: {
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '700',
  },
  unitTypePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99,
  },
});

export default ResidentsScreen;
