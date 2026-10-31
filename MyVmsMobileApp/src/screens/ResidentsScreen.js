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
  StatusBar,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';

// Dynamic getters to avoid require-time crash if native modules aren't linked in running APK
const getRNFS = () => {
  try {
    const { NativeModules } = require('react-native');
    if (!NativeModules.RNFSManager || !NativeModules.RNFSManager.writeFile) {
      return null;
    }
    const fs = require('react-native-fs');
    return fs;
  } catch (e) {
    return null;
  }
};

const getDocumentPicker = () => {
  try {
    const { TurboModuleRegistry } = require('react-native');
    if (TurboModuleRegistry && typeof TurboModuleRegistry.get === 'function') {
      const mod = TurboModuleRegistry.get('RNDocumentPicker');
      if (!mod) return null;
    }
    const dp = require('@react-native-documents/picker');
    return dp;
  } catch (e) {
    return null;
  }
};
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
  Eye,
  EyeOff,
  UserPlus,
  ShieldCheck,
  Award,
  Download,
  Upload,
  FileSpreadsheet,
  MessageSquare,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { residentApi, societyApi, homeApi, adminApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const CONFIG_OPTIONS = ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE'];

export const parsePropertyConfigs = (configStr) => {
  if (!configStr) return ['2BHK'];
  if (Array.isArray(configStr)) return configStr;
  const parts = String(configStr)
    .split(/[,/]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return parts.length > 0 ? parts : ['2BHK'];
};

const defaultCreateForm = {
  society_id: '',
  home_number: '',
  society_type: 'FLAT',
  building_or_wing: '',
  floor: '',
  home_type: '2BHK',
  name: '',
  phone: '',
  email: '',
  password: '123456',
  resident_type: 'OWNER',
  move_in_date: new Date().toISOString().split('T')[0],
  max_family_members: '2',
  status: 'ACTIVE',
};

export const ResidentsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isAdmin = !user?.role || user?.role === 'ADMIN' || user?.role === 'RESIDENTIAL_ADMIN' || user?.role === 'SUPER_ADMIN';

  // Active Tab: 'UNIT_LIST' | 'USER_LIST'
  const [activeTab, setActiveTab] = useState('UNIT_LIST');

  // Data state
  const [residents, setResidents] = useState([]);
  const [homes, setHomes] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [societyUsers, setSocietyUsers] = useState([]);
  const [maxUnitsLimit, setMaxUnitsLimit] = useState(null);
  const [maxUsersLimit, setMaxUsersLimit] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters for Unit List
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OCCUPIED' | 'VACANT'
  const [residentTypeFilter, setResidentTypeFilter] = useState('ALL'); // 'ALL' | 'OWNER' | 'TENANT'

  // Filters for User List
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL'); // 'ALL' | 'OWNER' | 'TENANT' | 'FAMILY_MEMBER' | 'ADMIN'
  const [userStatusFilter, setUserStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Pickers / Modals
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showUserRolePicker, setShowUserRolePicker] = useState(false);
  const [showUserStatusPicker, setShowUserStatusPicker] = useState(false);

  // Action Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigPicker, setShowConfigPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importParsing, setImportParsing] = useState(false);
  const [importInputText, setImportInputText] = useState('');
  const [importParsedRows, setImportParsedRows] = useState([]);
  const [importError, setImportError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const [selectedResident, setSelectedResident] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Notifications
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    resident_type: 'OWNER',
    status: 'ACTIVE',
  });
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resRes, socRes, homesRes, usersRes, dashRes] = await Promise.all([
        residentApi.getResidents().catch(() => ({ data: { residents: [] } })),
        societyApi.getSocieties().catch(() => ({ data: { societies: [] } })),
        societyApi.getAllHomes().catch(() => ({ data: { homes: [] } })),
        residentApi.getSocietyUsers().catch(() => ({ data: { users: [] } })),
        adminApi.getAdminDashboard().catch(() => null),
      ]);

      const socList = socRes.data?.societies || socRes.societies || [];
      setSocieties(socList);

      const allResidents = resRes.data?.residents || resRes.residents || [];
      setResidents(allResidents);

      const allHomes = homesRes.data?.homes || homesRes.homes || (Array.isArray(homesRes.data) ? homesRes.data : []);
      setHomes(allHomes);

      const allUsers = usersRes.data?.users || usersRes.users || [];
      setSocietyUsers(allUsers);

      const planLimits = dashRes?.data?.data?.subscription?.plan_limits || dashRes?.data?.subscription?.plan_limits;
      if (planLimits) {
        if (planLimits.MAX_UNITS !== undefined) setMaxUnitsLimit(planLimits.MAX_UNITS);
        if (planLimits.MAX_USERS !== undefined) setMaxUsersLimit(planLimits.MAX_USERS);
      }

      if (socList.length > 0) {
        const cur = socList[0];
        const configs = parsePropertyConfigs(cur.property_configuration);
        setCreateForm((prev) => ({
          ...prev,
          society_id: cur.id,
          building_or_wing: cur.society_type === 'BUNGALOW' ? 'Row 1' : 'Wing A',
          home_type: configs[0] || '2BHK',
        }));
      }
    } catch (err) {
      console.log('Error fetching initial resident data:', err);
      showToastError(err.message || 'Failed to fetch residents and units.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const currentSociety = societies[0] || null;
  const isFlat = currentSociety?.society_type === 'FLAT';
  const totalSocietyHomes = currentSociety ? (currentSociety.total_homes || homes.length || 10) : 0;
  const societyConfigs = useMemo(() => {
    return parsePropertyConfigs(currentSociety?.property_configuration);
  }, [currentSociety]);

  // -------------------------------------------------------------
  // Units Data Construction (Exact Parity with Web ResidentsPage)
  // -------------------------------------------------------------
  const allUnitsData = useMemo(() => {
    if (!currentSociety) {
      return [];
    }

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
          home_type: h.home_type || societyConfigs[0] || '2BHK',
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
        expectedSlots.push({ rawNumber: `A-${100 + i}`, tower: 'A', floor: 1 });
      }
      for (let i = 1; i <= towerBCount; i++) {
        expectedSlots.push({ rawNumber: `B-${200 + i}`, tower: 'B', floor: 1 });
      }
    } else {
      for (let i = 1; i <= totalSocietyHomes; i++) {
        expectedSlots.push({ rawNumber: String(i), tower: null, floor: null });
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
        home_type: societyConfigs[0] || '2BHK',
        isConfigured: false,
        isOccupied: !!res,
        resident: res,
      };
    });
  }, [homes, residents, currentSociety, totalSocietyHomes, isFlat, societyConfigs]);

  // Filtered Units
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
        (statusFilter === 'VACANT' && !u.isOccupied);

      const matchesType =
        residentTypeFilter === 'ALL' ||
        (u.resident && (u.resident.resident_type === residentTypeFilter || u.resident.role === residentTypeFilter));

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allUnitsData, searchTerm, statusFilter, residentTypeFilter]);

  // Filtered Users (for Tab 2: User List)
  const filteredUsers = useMemo(() => {
    return (societyUsers || []).filter((u) => {
      const q = userSearchTerm.toLowerCase();
      const name = String(u.full_name || u.name || '').toLowerCase();
      const phone = String(u.phone || '');
      const email = String(u.email || '').toLowerCase();
      const homeNo = String(u.home_number || u.unit || '').toLowerCase();
      const rel = String(u.relationship || '').toLowerCase();

      const matchesSearch =
        userSearchTerm === '' ||
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        homeNo.includes(q) ||
        rel.includes(q);

      const roleUpper = String(u.role || u.resident_type || '').toUpperCase();
      const matchesRole =
        userRoleFilter === 'ALL' ||
        (userRoleFilter === 'OWNER' && roleUpper === 'OWNER') ||
        (userRoleFilter === 'TENANT' && roleUpper === 'TENANT') ||
        (userRoleFilter === 'FAMILY_MEMBER' && roleUpper === 'FAMILY_MEMBER') ||
        (userRoleFilter === 'ADMIN' && (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN'));

      const statusUpper = String(u.status || 'ACTIVE').toUpperCase();
      const matchesStatus =
        userStatusFilter === 'ALL' ||
        (userStatusFilter === 'ACTIVE' && statusUpper === 'ACTIVE') ||
        (userStatusFilter === 'INACTIVE' && statusUpper === 'INACTIVE');

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [societyUsers, userSearchTerm, userRoleFilter, userStatusFilter]);

  const occupiedCount = allUnitsData.filter((u) => u.isOccupied).length;
  const vacantCount = allUnitsData.length - occupiedCount;

  // Toast Helpers
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
    const defaultType = unitObj?.home_type || societyConfigs[0] || '2BHK';
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
      max_family_members: '2',
      password: '123456',
    });
    setShowConfigPicker(false);
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
    const cleanPhone = String(createForm?.phone || '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit Mobile Phone Number.');
      return;
    }
    if (!createForm?.password || String(createForm.password).length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters long.');
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
        phone: cleanPhone,
        email: createForm.email ? createForm.email.trim() : null,
        password: createForm.password || '123456',
        resident_type: createForm.resident_type || 'OWNER',
        move_in_date: createForm.move_in_date || new Date().toISOString().split('T')[0],
        max_family_members: parseInt(createForm.max_family_members, 10) || 2,
        status: createForm.status || 'ACTIVE',
      });

      setShowCreateModal(false);
      setShowConfigPicker(false);
      setCreateForm(defaultCreateForm);
      showToastSuccess(`Resident "${createForm.name}" registered for Unit ${hNum}!`);
      await fetchInitialData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to register resident.');
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
    const cleanPhone = String(editForm.phone || '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit Phone Number.');
      return;
    }

    setSubmitting(true);
    try {
      await residentApi.updateResident(selectedResident.id, {
        name: editForm.name.trim(),
        phone: cleanPhone,
        email: editForm.email ? editForm.email.trim() : null,
        resident_type: editForm.resident_type,
        status: editForm.status,
      });
      setShowEditModal(false);
      showToastSuccess('Resident details updated successfully!');
      await fetchInitialData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to update resident.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Resident / User Status
  const handleToggleStatus = (res) => {
    const newStatus = res.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    Alert.alert(
      'Change Account Status',
      `Change account status for "${res.full_name || res.name}" to ${newStatus}?`,
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
              Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to update status.');
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
      const targetId = selectedResident?.id || selectedUser?.id;
      await residentApi.resetResidentPassword(targetId, newPasswordInput);
      setShowResetPasswordModal(false);
      setNewPasswordInput('');
      showToastSuccess('Password reset successfully!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Resident
  const handleDeleteResident = (res) => {
    Alert.alert(
      'Remove Resident',
      `Are you sure you want to remove resident "${res.full_name || res.name}"? This removes their login account and frees the unit.`,
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
              Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete resident.');
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
              Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete unit.');
            }
          },
        },
      ]
    );
  };

  // Helper for Phone Calling
  const handleMakeCall = (phone) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('Error', 'Unable to dial phone number.');
    });
  };

  // Helper for WhatsApp Messaging
  const handleOpenWhatsApp = (phone) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${clean}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Notice', 'WhatsApp is not installed or cannot be opened.');
    });
  };

  // Helper to normalize any date format into YYYY-MM-DD
  const normalizeToDateString = (val) => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (val instanceof Date && !isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (typeof val === 'number' || (!isNaN(val) && String(val).trim().length === 5 && !String(val).includes('-') && !String(val).includes('/'))) {
      const num = Number(val);
      if (!isNaN(num) && num > 10000 && num < 100000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const targetDate = new Date(excelEpoch.getTime() + num * 86400000);
        if (!isNaN(targetDate.getTime())) {
          return targetDate.toISOString().split('T')[0];
        }
      }
    }
    const str = String(val).trim();
    if (!str) return new Date().toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parts = str.split(/[/.-]/);
    if (parts.length === 3) {
      let [p1, p2, p3] = parts.map((p) => p.trim());
      if (p3.length === 2) {
        const yr = parseInt(p3, 10);
        p3 = yr < 50 ? `20${p3.padStart(2, '0')}` : `19${p3.padStart(2, '0')}`;
      }
      if (p1.length === 4) {
        return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      }
      if (p3.length === 4) {
        const num1 = parseInt(p1, 10);
        const num2 = parseInt(p2, 10);
        let month = num1 > 12 ? num2 : num1;
        let day = num1 > 12 ? num1 : num2;
        return `${p3}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    return new Date().toISOString().split('T')[0];
  };

  // Helper to normalize row objects from Excel / CSV (exact frontend matching logic)
  const parseRawRows = (rawRows) => {
    const isBung = (currentSociety?.society_type || '').toUpperCase() === 'BUNGALOW';
    return rawRows.map((row, index) => {
      const getVal = (patterns) => {
        const foundKey = Object.keys(row).find((k) => {
          const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          return patterns.some((p) => lower.includes(p));
        });
        return foundKey ? String(row[foundKey]).trim() : '';
      };

      const srno = getVal(['srno', 'sr', 'serial']) || (index + 1);
      const unit = getVal(['unit', 'unitno']);
      const home_no = getVal(['homeno', 'home', 'flatno', 'flat']) || unit || String(100 + index + 1);
      const rawHomeType = getVal(['hometype']) || (isBung ? 'bunglow' : 'flat');
      const home_type = rawHomeType.toLowerCase().includes('bung') ? 'bunglow' : 'flat';
      const tower = isBung ? null : (getVal(['tower', 'block', 'wing']) || 'Tower A');
      const floor = isBung ? null : (parseInt(getVal(['floor', 'flor']), 10) || 1);
      const property_configuration = getVal(['propertyconfiguration', 'configuration', 'config']) || '2bhk';
      const user_name = getVal(['username', 'residentname', 'name', 'user']) || `Resident ${home_no}`;
      const resident_type = getVal(['residenttype', 'resident', 'type']) || 'Owner';
      const phone_number = getVal(['phonenumber', 'phone', 'mobile']) || '';
      const email_id = getVal(['emailid', 'email', 'mail']) || '';
      const rawMoveInDate = getVal(['moveindate', 'movein', 'date']);
      const move_in_date = normalizeToDateString(rawMoveInDate);
      const password = getVal(['password', 'pass']) || 'Password@123';
      const rawFamily = getVal(['maxfamilymembers', 'familymembers', 'maxfamily', 'familyaccount', 'family']);
      const max_family_members = rawFamily !== '' && !isNaN(parseInt(rawFamily, 10)) ? Math.max(0, parseInt(rawFamily, 10)) : 1;

      return {
        srno,
        unit: unit || home_no,
        home_no,
        home_type,
        tower,
        floor,
        property_configuration,
        user_name,
        resident_type: resident_type.toLowerCase() === 'tenant' ? 'Tenant' : 'Owner',
        phone_number,
        email_id,
        move_in_date,
        password,
        max_family_members,
      };
    }).filter((r) => r.home_no || r.user_name || r.phone_number);
  };

  // Helper for Exporting Residents & Units Excel (.xlsx) Template
  const handleExportExcel = async () => {
    try {
      const isFlat = (currentSociety?.society_type || 'FLAT').toUpperCase() === 'FLAT';
      const societyName = currentSociety?.name || 'society';
      const cleanName = societyName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const maxUnits = parseInt(currentSociety?.max_units || currentSociety?.total_homes || 3, 10);
      const count = Math.max(1, Math.min(maxUnits, 10));
      const todayStr = new Date().toISOString().split('T')[0];
      const homeTypeVal = isFlat ? 'flat' : 'bunglow';

      let headers = [];
      if (isFlat) {
        headers = [
          'Sr No.',
          'Unit',
          'Home No',
          'Home Type',
          'Tower',
          'Floor',
          'Property Configuration',
          'User Name',
          'Resident Type',
          'Phone Number',
          'Email ID',
          'Move In Date (YYYY-MM-DD)',
          'Password',
          'Max Family Members (Create Account No)',
        ];
      } else {
        headers = [
          'Sr No.',
          'Unit',
          'Home No',
          'Home Type',
          'Property Configuration',
          'User Name',
          'Resident Type',
          'Phone Number',
          'Email ID',
          'Move In Date (YYYY-MM-DD)',
          'Password',
          'Max Family Members (Create Account No)',
        ];
      }

      const rowsData = [headers];

      if (homes && homes.length > 0) {
        homes.slice(0, count).forEach((u, idx) => {
          const res = u.resident;
          const uNum = String(u.home_number || 101 + idx);
          const userName = res?.name || (idx === 0 ? 'Ramesh Patel' : `Resident ${uNum}`);
          const phone = res?.phone || `98765432${String(10 + idx).slice(-2)}`;
          const email = res?.email || `resident${uNum}@example.com`;
          const moveIn = res?.move_in_date ? String(res.move_in_date).split('T')[0] : todayStr;
          const resType = res?.resident_type === 'TENANT' ? 'Tenant' : 'Owner';
          const familyQuota = res?.max_family_members !== undefined ? res.max_family_members : 1;

          if (isFlat) {
            rowsData.push([
              idx + 1,
              uNum,
              uNum,
              homeTypeVal,
              u.building_or_wing || 'Tower A',
              u.floor || 1,
              u.home_type || '2bhk',
              userName,
              resType,
              phone,
              email,
              moveIn,
              'Password@123',
              familyQuota,
            ]);
          } else {
            rowsData.push([
              idx + 1,
              uNum,
              uNum,
              homeTypeVal,
              u.home_type || '2bhk',
              userName,
              resType,
              phone,
              email,
              moveIn,
              'Password@123',
              familyQuota,
            ]);
          }
        });
      } else {
        for (let i = 1; i <= count; i++) {
          const unitNo = isFlat ? String(100 + i) : String(i);
          const samplePhone = `98765432${String(10 + i).slice(-2)}`;
          const sampleEmail = `resident${unitNo}@example.com`;
          const sampleName = i === 1 ? 'Ramesh Patel' : `Resident ${unitNo}`;

          if (isFlat) {
            rowsData.push([
              i,
              unitNo,
              unitNo,
              homeTypeVal,
              'Tower A',
              1,
              '2bhk',
              sampleName,
              'Owner',
              samplePhone,
              sampleEmail,
              todayStr,
              'Password@123',
              1,
            ]);
          } else {
            rowsData.push([
              i,
              unitNo,
              unitNo,
              homeTypeVal,
              '2bhk',
              sampleName,
              'Owner',
              samplePhone,
              sampleEmail,
              todayStr,
              'Password@123',
              1,
            ]);
          }
        }
      }

      const RNFS = getRNFS();
      if (RNFS && RNFS.writeFile) {
        // Generate real .xlsx Excel file using xlsx library
        const ws = XLSX.utils.aoa_to_sheet(rowsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Residents_Template');
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

        const dir = RNFS.CachesDirectoryPath || RNFS.DocumentDirectoryPath;
        const fileName = `${cleanName}_residents_import_sheet.xlsx`;
        const filePath = `${dir}/${fileName}`;
        await RNFS.writeFile(filePath, wbout, 'base64');

        await Share.share({
          title: fileName,
          url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
          message: `Download Excel Sheet for Residents & Units (${societyName})`,
        });
        showToastSuccess('Excel sheet exported successfully.');
      } else {
        // Fallback share if native FS not linked in running build
        const csvContent = rowsData.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        await Share.share({
          title: `${cleanName}_residents_template`,
          message: `Residents & Units Excel Template for ${societyName}:\n\n${csvContent}`,
        });
        showToastSuccess('Excel template shared successfully.');
      }
    } catch (err) {
      if (err.message && !err.message.includes('dismissed')) {
        Alert.alert('Export Notice', err.message || 'Excel export complete.');
      }
    }
  };

  // Helper for picking Excel / CSV file using @react-native-documents/picker and parsing with xlsx & react-native-fs
  const handlePickExcelFile = async () => {
    const docPicker = getDocumentPicker();
    const RNFS = getRNFS();

    if (!docPicker || !docPicker.pick) {
      Alert.alert(
        'Pick Excel File',
        'Native file picker is available once native build is compiled. For immediate testing, load sample Excel template with 1 click.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Load Sample Data', onPress: handleLoadSampleTemplate },
        ]
      );
      return;
    }

    try {
      setImportParsing(true);
      setImportError(null);

      const res = await docPicker.pick({
        mode: 'open',
        type: [docPicker.types.xlsx, docPicker.types.xls, docPicker.types.csv, docPicker.types.allFiles],
      });

      const file = Array.isArray(res) ? res[0] : res;
      if (!file || !file.uri) {
        setImportParsing(false);
        return;
      }

      setImportFile(file);

      let rawRows = [];
      const uri = file.uri;

      if (RNFS && RNFS.readFile) {
        try {
          const base64Data = await RNFS.readFile(uri, 'base64');
          const workbook = XLSX.read(base64Data, { type: 'base64', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        } catch (e1) {
          try {
            const textData = await RNFS.readFile(uri, 'utf8');
            const workbook = XLSX.read(textData, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
          } catch (e2) {
            throw new Error('Unable to read selected spreadsheet file: ' + (e2.message || e1.message));
          }
        }
      } else {
        throw new Error('Native file reader module is not available.');
      }

      if (!rawRows || rawRows.length === 0) {
        throw new Error('Please select a valid Excel sheet with resident rows.');
      }

      const normalized = parseRawRows(rawRows);
      if (normalized.length === 0) {
        throw new Error('No valid resident or unit records found in the uploaded file.');
      }

      setImportParsedRows(normalized);
    } catch (err) {
      if (docPicker && docPicker.isErrorWithCode && docPicker.isErrorWithCode(err) && err.code === docPicker.errorCodes.OPERATION_CANCELED) {
        // User cancelled picker
      } else {
        setImportError(err.message || 'Failed to parse Excel file.');
      }
    } finally {
      setImportParsing(false);
    }
  };

  const handleLoadSampleTemplate = () => {
    const isFlat = (currentSociety?.society_type || 'FLAT').toUpperCase() === 'FLAT';
    const count = Math.min(3, parseInt(currentSociety?.max_units || currentSociety?.total_homes || 3, 10));
    const todayStr = new Date().toISOString().split('T')[0];
    const sampleRows = [];

    for (let i = 1; i <= count; i++) {
      const uNum = isFlat ? String(100 + i) : String(i);
      sampleRows.push({
        srno: i,
        unit: uNum,
        home_no: uNum,
        home_type: isFlat ? 'flat' : 'bunglow',
        tower: isFlat ? 'Tower A' : null,
        floor: isFlat ? 1 : null,
        property_configuration: '2bhk',
        user_name: i === 1 ? 'Ramesh Patel' : `Resident ${uNum}`,
        resident_type: 'Owner',
        phone_number: `987654321${i}`,
        email_id: `resident${uNum}@example.com`,
        move_in_date: todayStr,
        password: 'Password@123',
        max_family_members: 1,
      });
    }

    setImportFile({ name: 'sample_residents_template.xlsx', size: 1024 });
    setImportParsedRows(sampleRows);
    setImportError(null);
  };

  const handleExecuteImport = async () => {
    if (importParsedRows.length === 0) {
      setImportError('Please select an Excel sheet with valid resident rows.');
      return;
    }

    const maxUnits = maxUnitsLimit || parseInt(currentSociety?.max_units || currentSociety?.total_homes || 3, 10);
    const maxUsers = maxUsersLimit || (currentSociety?.max_users ? parseInt(currentSociety.max_users, 10) : null);

    const homeNoTotalCount = importParsedRows.length;
    const familyMemberAccountTotal = importParsedRows.reduce(
      (sum, r) => sum + (parseInt(r.max_family_members, 10) || 0),
      0
    );
    const totalAccounts = homeNoTotalCount + familyMemberAccountTotal;

    if (homeNoTotalCount > maxUnits) {
      setImportError(`Our society max unit is ${maxUnits}. File contains ${homeNoTotalCount} units.`);
      return;
    }

    if (maxUsers && totalAccounts > maxUsers) {
      setImportError(`Our society max user is ${maxUsers}. Total user accounts (${totalAccounts}) exceeds max user limit.`);
      return;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      const activeSocId = currentSociety?.id || 1;
      const res = await residentApi.importBatchResidents({
        society_id: activeSocId,
        residents: importParsedRows,
      });

      const count = res.data?.imported_count ?? importParsedRows.length;
      showToastSuccess(`Import complete! Successfully imported ${count} resident(s).`);
      setShowImportModal(false);
      setImportFile(null);
      setImportParsedRows([]);
      await fetchInitialData();
    } catch (err) {
      setImportError(err.response?.data?.message || err.message || 'Failed to import residents.');
    } finally {
      setIsImporting(false);
    }
  };

  // -------------------------------------------------------------
  // Render Unit List Item (Tab 1)
  // -------------------------------------------------------------
  const renderUnitCard = ({ item: u }) => {
    const res = u.resident;
    const isOcc = u.isOccupied;
    const pureNum = String(u.rawNumber || u.displayNumber || '').replace(/^(home|flat|unit|villa)\s*/i, '').trim() || u.displayNumber;

    return (
      <View style={[styles.unitCard, isOcc ? styles.unitCardOccupied : styles.unitCardVacant]}>
        {/* Card Header: Unit Number, Home Number, Config & Occupancy Badge */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.unitInfoLeft}>
            <View style={[styles.unitIconWrap, isOcc ? styles.unitIconWrapGreen : styles.unitIconWrapAmber]}>
              {isOcc ? <Home size={18} color={THEME.colors.fernGreenDark} /> : <DoorOpen size={18} color={THEME.colors.clayDark} />}
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.unitNumberText}>Unit {pureNum}</Text>
                <View style={styles.homePillBadge}>
                  <Text style={styles.homePillBadgeText}>Home {pureNum}</Text>
                </View>
                <View style={styles.homeTypePill}>
                  <Text style={styles.homeTypePillText}>{u.home_type || '2BHK'}</Text>
                </View>
              </View>
              {u.building_or_wing ? (
                <Text style={styles.unitSubText}>
                  {String(u.building_or_wing).toLowerCase().startsWith('tower') ? u.building_or_wing : `Tower ${u.building_or_wing}`}
                  {u.floor ? ` • Floor ${u.floor}` : ''}
                </Text>
              ) : (u.floor ? (
                <Text style={styles.unitSubText}>Floor {u.floor}</Text>
              ) : null)}
            </View>
          </View>

          {/* Occupancy Status Badge */}
          <View style={[styles.occupancyBadge, isOcc ? styles.badgeOccupied : styles.badgeVacant]}>
            {isOcc ? <CheckCircle2 size={12} color={THEME.colors.fernGreenDark} /> : <DoorOpen size={12} color={THEME.colors.clayDark} />}
            <Text style={[styles.occupancyBadgeText, isOcc ? styles.textOccupied : styles.textVacant]}>
              {isOcc ? 'OCCUPIED' : 'VACANT'}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        {isOcc && res ? (
          <View style={styles.cardResidentBody}>
            <View style={styles.resNameRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.residentNameText}>{res.full_name || res.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <View style={[styles.rolePill, res.resident_type === 'TENANT' ? styles.rolePillTenant : styles.rolePillOwner]}>
                    <Text style={[styles.rolePillText, res.resident_type === 'TENANT' ? styles.roleTextTenant : styles.roleTextOwner]}>
                      {res.resident_type || 'OWNER'}
                    </Text>
                  </View>
                  <View style={[styles.statusDotPill, res.status === 'INACTIVE' ? styles.statusPillInactive : styles.statusPillActive]}>
                    <View style={[styles.statusDot, res.status === 'INACTIVE' ? { backgroundColor: '#ef4444' } : { backgroundColor: '#10b981' }]} />
                    <Text style={styles.statusDotText}>{res.status || 'ACTIVE'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Contact Details & Info */}
            <View style={styles.resContactCol}>
              <View style={styles.resContactItem}>
                <Phone size={13} color={THEME.colors.clay} />
                <Text style={styles.resContactText}>{res.phone || '—'}</Text>
              </View>

              {res.email ? (
                <View style={styles.resContactItem}>
                  <Mail size={13} color={THEME.colors.textMuted} />
                  <Text style={styles.resContactText} numberOfLines={1}>{res.email}</Text>
                </View>
              ) : null}

              {res.move_in_date ? (
                <View style={styles.resContactItem}>
                  <Calendar size={13} color={THEME.colors.textMuted} />
                  <Text style={styles.resContactSubText}>Moved in: {res.move_in_date.split('T')[0]}</Text>
                </View>
              ) : null}

              {/* Max Family Accounts */}
              <View style={styles.maxFamilyRow}>
                <Users size={13} color={THEME.colors.fernGreenDark} />
                <Text style={styles.maxFamilyText}>
                  Max Family Accounts: <Text style={{ fontWeight: '800', color: THEME.colors.darkBrown }}>{res.max_family_members !== undefined ? res.max_family_members : 2}</Text>
                </Text>
              </View>
            </View>

            {/* Quick Actions Row */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.actionBtnDetails}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedUser(res);
                  setShowUserDetailsModal(true);
                }}
              >
                <Eye size={13} color={THEME.colors.darkBrown} />
                <Text style={styles.actionBtnDetailsText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cardVacantBody}>
            <Text style={styles.vacantHintText}>Ready for resident allotment</Text>
            <View style={[styles.maxFamilyRow, { marginTop: 4, marginBottom: 8 }]}>
              <Users size={12} color={THEME.colors.textMuted} />
              <Text style={[styles.maxFamilyText, { color: THEME.colors.textMuted }]}>
                Max Family Accounts: <Text style={{ fontWeight: '700' }}>{u.max_family_members !== undefined ? u.max_family_members : 2}</Text>
              </Text>
            </View>
            {isAdmin && (
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.actionBtnAssign}
                  activeOpacity={0.8}
                  onPress={() => handleOpenCreateModal(u)}
                >
                  <UserPlus size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnAssignText}>Add Resident</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnDelete}
                  activeOpacity={0.7}
                  onPress={() => handleDeleteUnit(u)}
                >
                  <Trash2 size={13} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // -------------------------------------------------------------
  // Render User List Item (Tab 2: Society Accounts)
  // -------------------------------------------------------------
  const renderUserCard = ({ item: userItem }) => {
    const roleUpper = String(userItem.role || userItem.resident_type || 'OWNER').toUpperCase();
    const isOwner = roleUpper === 'OWNER';
    const isTenant = roleUpper === 'TENANT';
    const isFamily = roleUpper === 'FAMILY_MEMBER';
    const isAdm = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN';

    const initials = String(userItem.full_name || userItem.name || 'U')
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <View style={styles.userCard}>
        {/* Top Row: Avatar, Name & Role Badge */}
        <View style={styles.userCardHeader}>
          <View style={styles.userAvatarWrap}>
            <Text style={styles.userAvatarText}>{initials}</Text>
          </View>

          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Text style={styles.userNameTitle} numberOfLines={1}>
              {userItem.full_name || userItem.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <View
                style={[
                  styles.rolePill,
                  isOwner && styles.rolePillOwner,
                  isTenant && styles.rolePillTenant,
                  isFamily && styles.rolePillFamily,
                  isAdm && styles.rolePillAdmin,
                ]}
              >
                <Text
                  style={[
                    styles.rolePillText,
                    isOwner && styles.roleTextOwner,
                    isTenant && styles.roleTextTenant,
                    isFamily && styles.roleTextFamily,
                    isAdm && styles.roleTextAdmin,
                  ]}
                >
                  {isFamily ? 'FAMILY MEMBER' : roleUpper}
                </Text>
              </View>

              <View style={[styles.statusDotPill, userItem.status === 'INACTIVE' ? styles.statusPillInactive : styles.statusPillActive]}>
                <View style={[styles.statusDot, userItem.status === 'INACTIVE' ? { backgroundColor: '#ef4444' } : { backgroundColor: '#10b981' }]} />
                <Text style={styles.statusDotText}>{userItem.status || 'ACTIVE'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* User Details Grid */}
        <View style={styles.userDetailsGrid}>
          {userItem.relationship ? (
            <View style={styles.userMetaRow}>
              <Users size={12} color={THEME.colors.clay} />
              <Text style={styles.userMetaText}>
                Relationship: <Text style={{ fontWeight: '700' }}>{userItem.relationship}</Text>
                {userItem.primary_resident_name ? ` (Linked: ${userItem.primary_resident_name})` : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.userMetaRow}>
            <Home size={12} color={THEME.colors.clay} />
            <Text style={styles.userMetaText}>
              Unit: <Text style={{ fontWeight: '700' }}>{userItem.home_number || userItem.unit || '—'}</Text>
              {userItem.building_or_wing ? ` (${userItem.building_or_wing}${userItem.floor ? ` • Floor ${userItem.floor}` : ''})` : ''}
            </Text>
          </View>

          <View style={styles.userMetaRow}>
            <Phone size={12} color={THEME.colors.textMuted} />
            <Text style={styles.userMetaText}>{userItem.phone || '—'}</Text>
          </View>

          {userItem.email ? (
            <View style={styles.userMetaRow}>
              <Mail size={12} color={THEME.colors.textMuted} />
              <Text style={styles.userMetaText} numberOfLines={1}>{userItem.email}</Text>
            </View>
          ) : null}
        </View>

        {/* User Action Row */}
        <View style={styles.userCardActions}>
          <TouchableOpacity
            style={styles.btnUserDetails}
            activeOpacity={0.7}
            onPress={() => {
              setSelectedUser(userItem);
              setShowUserDetailsModal(true);
            }}
          >
            <Eye size={13} color={THEME.colors.darkBrown} />
            <Text style={styles.btnUserDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top, 14) + 4 }]}>
        <View style={styles.topHeaderRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={24} color={THEME.colors.darkBrown} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.screenTitle} numberOfLines={1}>
              Resident Management
            </Text>
          </View>
        </View>

        {/* Dedicated Excel Action Buttons (Export Excel Sheet & Import Excel Sheet) */}
        <View style={styles.excelActionBar}>
          <TouchableOpacity
            style={styles.btnExcelActionSecondary}
            activeOpacity={0.8}
            onPress={handleExportExcel}
          >
            <Download size={14} color="#15803d" />
            <Text style={styles.btnExcelActionSecondaryText}>Export Excel Sheet</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              style={styles.btnExcelActionPrimary}
              activeOpacity={0.8}
              onPress={() => {
                setImportFile(null);
                setImportInputText('');
                setImportParsedRows([]);
                setImportError(null);
                setShowImportModal(true);
              }}
            >
              <Upload size={14} color={THEME.colors.clayDark} />
              <Text style={styles.btnExcelActionPrimaryText}>Import Excel Sheet</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Toast Alerts */}
        {successMsg && (
          <View style={styles.toastSuccess}>
            <CheckCircle2 size={15} color="#15803d" />
            <Text style={styles.toastSuccessText}>{successMsg}</Text>
          </View>
        )}
        {errorMsg && (
          <View style={styles.toastError}>
            <AlertCircle size={15} color="#b91c1c" />
            <Text style={styles.toastErrorText}>{errorMsg}</Text>
          </View>
        )}



        {/* Tab Switcher (Unit List vs User List) */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'UNIT_LIST' && styles.tabBtnActive]}
            onPress={() => setActiveTab('UNIT_LIST')}
            activeOpacity={0.8}
          >
            <Building2 size={16} color={activeTab === 'UNIT_LIST' ? THEME.colors.darkBrown : THEME.colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'UNIT_LIST' && styles.tabBtnTextActive]}>
              Unit List
            </Text>
            <View style={[styles.tabBadge, activeTab === 'UNIT_LIST' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'UNIT_LIST' && styles.tabBadgeTextActive]}>
                {allUnitsData.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'USER_LIST' && styles.tabBtnActive]}
            onPress={() => setActiveTab('USER_LIST')}
            activeOpacity={0.8}
          >
            <Users size={16} color={activeTab === 'USER_LIST' ? THEME.colors.darkBrown : THEME.colors.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'USER_LIST' && styles.tabBtnTextActive]}>
              User List
            </Text>
            <View style={[styles.tabBadge, activeTab === 'USER_LIST' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'USER_LIST' && styles.tabBadgeTextActive]}>
                {societyUsers.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List Area */}
      {activeTab === 'UNIT_LIST' ? (
        <View style={{ flex: 1 }}>
          {/* Unit Filters Row */}
          <View style={styles.filterSection}>
            <View style={styles.searchBarWrap}>
              <Search size={15} color={THEME.colors.textDim} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search unit, resident, phone..."
                placeholderTextColor={THEME.colors.textDim}
                value={searchTerm}
                onChangeText={setSearchTerm}
                clearButtonMode="while-editing"
              />
              {searchTerm ? (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <X size={15} color={THEME.colors.textDim} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterPillsRow}>
              {/* Occupancy Filter */}
              <TouchableOpacity
                style={styles.filterDropdownBtn}
                onPress={() => setShowStatusPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterDropdownBtnText}>
                  {statusFilter === 'ALL' ? 'All Units' : (statusFilter === 'OCCUPIED' ? 'Occupied' : 'Vacant')}
                </Text>
                <ChevronDown size={14} color={THEME.colors.clay} />
              </TouchableOpacity>

              {/* Resident Type Filter */}
              <TouchableOpacity
                style={styles.filterDropdownBtn}
                onPress={() => setShowTypePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterDropdownBtnText}>
                  {residentTypeFilter === 'ALL' ? 'All Types' : (residentTypeFilter === 'OWNER' ? 'Owner' : 'Tenant')}
                </Text>
                <ChevronDown size={14} color={THEME.colors.clay} />
              </TouchableOpacity>
            </View>
          </View>

          {/* FlatList for Units */}
          <FlatList
            data={filteredUnits}
            keyExtractor={(item) => String(item.id || item.rawNumber)}
            renderItem={renderUnitCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={fetchInitialData} colors={[THEME.colors.clay]} />
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={THEME.colors.clay} />
                  <Text style={styles.loadingText}>Loading units...</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <DoorOpen size={44} color={THEME.colors.textDim} style={{ opacity: 0.6, marginBottom: 12 }} />
                  <Text style={styles.emptyTitle}>No matching units found</Text>
                  <Text style={styles.emptySub}>Try adjusting search criteria or add new unit.</Text>
                </View>
              )
            }
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* User Filters Row */}
          <View style={styles.filterSection}>
            <View style={styles.searchBarWrap}>
              <Search size={15} color={THEME.colors.textDim} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name, phone, email, unit..."
                placeholderTextColor={THEME.colors.textDim}
                value={userSearchTerm}
                onChangeText={setUserSearchTerm}
                clearButtonMode="while-editing"
              />
              {userSearchTerm ? (
                <TouchableOpacity onPress={() => setUserSearchTerm('')}>
                  <X size={15} color={THEME.colors.textDim} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.filterPillsRow}>
              {/* User Role Filter */}
              <TouchableOpacity
                style={styles.filterDropdownBtn}
                onPress={() => setShowUserRolePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterDropdownBtnText}>
                  {userRoleFilter === 'ALL'
                    ? 'All Roles'
                    : userRoleFilter === 'FAMILY_MEMBER'
                      ? 'Family'
                      : userRoleFilter}
                </Text>
                <ChevronDown size={14} color={THEME.colors.clay} />
              </TouchableOpacity>

              {/* User Status Filter */}
              <TouchableOpacity
                style={styles.filterDropdownBtn}
                onPress={() => setShowUserStatusPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterDropdownBtnText}>
                  {userStatusFilter === 'ALL' ? 'All Status' : userStatusFilter}
                </Text>
                <ChevronDown size={14} color={THEME.colors.clay} />
              </TouchableOpacity>
            </View>
          </View>

          {/* FlatList for Users */}
          <FlatList
            data={filteredUsers}
            keyExtractor={(item, index) => String(item.id || item.phone || index)}
            renderItem={renderUserCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={fetchInitialData} colors={[THEME.colors.clay]} />
            }
            ListEmptyComponent={
              loading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={THEME.colors.clay} />
                  <Text style={styles.loadingText}>Loading accounts...</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Users size={44} color={THEME.colors.textDim} style={{ opacity: 0.6, marginBottom: 12 }} />
                  <Text style={styles.emptyTitle}>No matching accounts</Text>
                  <Text style={styles.emptySub}>No members found with current filters.</Text>
                </View>
              )
            }
          />
        </View>
      )}

      {/* ========================================================
          MODAL: CREATE RESIDENT & RESIDENTIAL UNIT
          ======================================================== */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
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
                <Text style={styles.modalHeaderSub}>Unit allocation & primary login credentials</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
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
              <View style={styles.sectionHeaderBox}>
                <Building2 size={15} color={THEME.colors.clay} />
                <Text style={styles.sectionHeaderText}>1. RESIDENTIAL UNIT</Text>
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Home / Unit No *</Text>
                  <TextInput
                    style={styles.input}
                    value={createForm.home_number}
                    onChangeText={(v) => setCreateForm({ ...createForm, home_number: v })}
                    placeholder="e.g. 101, A-102"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Society Type</Text>
                  <View style={styles.toggleRow}>
                    {['FLAT', 'BUNGALOW'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.toggleBtn, createForm.society_type === st && styles.toggleBtnActive]}
                        onPress={() => setCreateForm({ ...createForm, society_type: st })}
                      >
                        <Text style={[styles.toggleBtnText, createForm.society_type === st && styles.toggleBtnTextActive]}>
                          {st === 'BUNGALOW' ? 'Bungalow' : 'Flat'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {createForm.society_type === 'FLAT' && (
                <View style={styles.formRowTwoCol}>
                  <View style={[styles.inputGroup, styles.formColHalf]}>
                    <Text style={styles.inputLabel}>Tower / Wing</Text>
                    <TextInput
                      style={styles.input}
                      value={createForm.building_or_wing}
                      onChangeText={(v) => setCreateForm({ ...createForm, building_or_wing: v })}
                      placeholder="e.g. A, B, Tower 1"
                      placeholderTextColor={THEME.colors.textDim}
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.formColHalf]}>
                    <Text style={styles.inputLabel}>Floor</Text>
                    <TextInput
                      style={styles.input}
                      value={createForm.floor}
                      onChangeText={(v) => setCreateForm({ ...createForm, floor: v })}
                      keyboardType="numeric"
                      placeholder="e.g. 1, 2"
                      placeholderTextColor={THEME.colors.textDim}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Property Configuration *</Text>
                <TouchableOpacity
                  style={styles.dropdownSelectInput}
                  onPress={() => setShowConfigPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownSelectInputText}>
                    {createForm.home_type === 'PENTHOUSE' ? 'Penthouse' : createForm.home_type}
                  </Text>
                  <ChevronDown size={16} color={THEME.colors.clay} />
                </TouchableOpacity>
              </View>

              {/* SECTION 2: RESIDENT ACCOUNT */}
              <View style={[styles.sectionHeaderBox, { marginTop: 14 }]}>
                <UserPlus size={15} color={THEME.colors.fernGreenDark} />
                <Text style={[styles.sectionHeaderText, { color: THEME.colors.fernGreenDark }]}>
                  2. RESIDENT ACCOUNT & CREDENTIALS
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Resident Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={createForm.name}
                  onChangeText={(v) => setCreateForm({ ...createForm, name: v })}
                  placeholder="e.g. Rajesh Sharma"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Resident Type *</Text>
                  <View style={styles.toggleRow}>
                    {['OWNER', 'TENANT'].map((rt) => (
                      <TouchableOpacity
                        key={rt}
                        style={[styles.toggleBtn, createForm.resident_type === rt && styles.toggleBtnActive]}
                        onPress={() => setCreateForm({ ...createForm, resident_type: rt })}
                      >
                        <Text style={[styles.toggleBtnText, createForm.resident_type === rt && styles.toggleBtnTextActive]}>
                          {rt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Account Status</Text>
                  <View style={styles.toggleRow}>
                    {['ACTIVE', 'INACTIVE'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.toggleBtn, createForm.status === st && styles.toggleBtnActive]}
                        onPress={() => setCreateForm({ ...createForm, status: st })}
                      >
                        <Text style={[styles.toggleBtnText, createForm.status === st && styles.toggleBtnTextActive]}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile Phone Number * (Login ID)</Text>
                <TextInput
                  style={styles.input}
                  value={createForm.phone}
                  onChangeText={(v) => setCreateForm({ ...createForm, phone: v })}
                  keyboardType="phone-pad"
                  placeholder="10-digit mobile number"
                  placeholderTextColor={THEME.colors.textDim}
                  maxLength={15}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password * (Default: 123456)</Text>
                <View style={styles.passInputWrap}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0 }]}
                    secureTextEntry={!showPasswordText}
                    value={createForm.password}
                    onChangeText={(v) => setCreateForm({ ...createForm, password: v })}
                    placeholder="Min 6 characters"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswordText(!showPasswordText)}
                    style={{ paddingHorizontal: 12 }}
                  >
                    {showPasswordText ? <EyeOff size={16} color={THEME.colors.textMuted} /> : <Eye size={16} color={THEME.colors.textMuted} />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Email (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={createForm.email}
                    onChangeText={(v) => setCreateForm({ ...createForm, email: v })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="resident@example.com"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Move-In Date</Text>
                  <TextInput
                    style={styles.input}
                    value={createForm.move_in_date}
                    onChangeText={(v) => setCreateForm({ ...createForm, move_in_date: v })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Max Family Accounts Allowed *</Text>
                <TextInput
                  style={styles.input}
                  value={String(createForm.max_family_members)}
                  onChangeText={(v) => setCreateForm({ ...createForm, max_family_members: v })}
                  keyboardType="numeric"
                  placeholder="2"
                  placeholderTextColor={THEME.colors.textDim}
                />
                <Text style={styles.inputHint}>Quota allocated to this unit for family member accounts.</Text>
              </View>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setShowCreateModal(false)}
                disabled={submitting}
              >
                <Text style={styles.btnModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnModalSubmit}
                onPress={handleCreateResident}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnModalSubmitText}>Register Resident & Unit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          MODAL: EDIT RESIDENT
          ======================================================== */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
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
                <Text style={styles.modalHeaderSub}>Update resident account profile</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalFormScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(v) => setEditForm({ ...editForm, name: v })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(v) => setEditForm({ ...editForm, phone: v })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.email}
                  onChangeText={(v) => setEditForm({ ...editForm, email: v })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Resident Type</Text>
                  <View style={styles.toggleRow}>
                    {['OWNER', 'TENANT'].map((rt) => (
                      <TouchableOpacity
                        key={rt}
                        style={[styles.toggleBtn, editForm.resident_type === rt && styles.toggleBtnActive]}
                        onPress={() => setEditForm({ ...editForm, resident_type: rt })}
                      >
                        <Text style={[styles.toggleBtnText, editForm.resident_type === rt && styles.toggleBtnTextActive]}>
                          {rt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.toggleRow}>
                    {['ACTIVE', 'INACTIVE'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.toggleBtn, editForm.status === st && styles.toggleBtnActive]}
                        onPress={() => setEditForm({ ...editForm, status: st })}
                      >
                        <Text style={[styles.toggleBtnText, editForm.status === st && styles.toggleBtnTextActive]}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setShowEditModal(false)}
                disabled={submitting}
              >
                <Text style={styles.btnModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnModalSubmit}
                onPress={handleEditResident}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnModalSubmitText}>Save Changes</Text>
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
          <View style={[styles.formModalCard, { maxWidth: 380 }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>Reset Password</Text>
                <Text style={styles.modalHeaderSub}>
                  For: {selectedResident?.full_name || selectedUser?.full_name || 'Resident'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowResetPasswordModal(false)}>
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 14 }}>
              <Text style={styles.inputLabel}>New Password (Min 6 Characters) *</Text>
              <View style={styles.passInputWrap}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0 }]}
                  secureTextEntry={!showPasswordText}
                  value={newPasswordInput}
                  onChangeText={setNewPasswordInput}
                  placeholder="Enter new password"
                  placeholderTextColor={THEME.colors.textDim}
                />
                <TouchableOpacity
                  onPress={() => setShowPasswordText(!showPasswordText)}
                  style={{ paddingHorizontal: 12 }}
                >
                  {showPasswordText ? <EyeOff size={16} color={THEME.colors.textMuted} /> : <Eye size={16} color={THEME.colors.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setShowResetPasswordModal(false)}
                disabled={submitting}
              >
                <Text style={styles.btnModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnModalSubmit}
                onPress={handleResetPassword}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnModalSubmitText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          MODAL: USER DETAILS (READ-ONLY)
          ======================================================== */}
      <Modal
        visible={showUserDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUserDetailsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.formModalCard, { maxHeight: '85%' }]}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(196, 154, 108, 0.18)' }]}>
                  <Users size={18} color={THEME.colors.clay} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                    User Details
                  </Text>
                  <Text style={styles.modalHeaderSub}>Resident Information (Read-Only)</Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setShowUserDetailsModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Read-Only Details Grid */}
            <ScrollView style={styles.modalFormScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.detailGridRow}>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailItemLabel}>USER NAME</Text>
                  <Text style={styles.detailItemValue}>{selectedUser?.full_name || selectedUser?.name || '—'}</Text>
                </View>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailItemLabel}>USER TYPE / ROLE</Text>
                  <View style={[styles.rolePill, { alignSelf: 'flex-start', marginTop: 2 }]}>
                    <Text style={styles.rolePillText}>
                      {selectedUser?.role || selectedUser?.resident_type || 'OWNER'}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedUser?.relationship ? (
                <View style={styles.detailFullItem}>
                  <Text style={styles.detailItemLabel}>RELATIONSHIP & ACCOUNT MAPPING</Text>
                  <Text style={styles.detailItemValue}>
                    {selectedUser.relationship}
                    {selectedUser.primary_resident_name ? ` (Linked to: ${selectedUser.primary_resident_name})` : ''}
                  </Text>
                </View>
              ) : null}

              <View style={styles.detailGridRow}>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailItemLabel}>PHONE NUMBER (LOGIN ID)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Phone size={12} color={THEME.colors.clay} />
                    <Text style={styles.detailItemValue}>{selectedUser?.phone || '—'}</Text>
                  </View>
                </View>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailItemLabel}>EMAIL ID</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Mail size={12} color={THEME.colors.textMuted} />
                    <Text style={styles.detailItemValue} numberOfLines={1}>{selectedUser?.email || '—'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailGridRow}>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailItemLabel}>MOVE-IN / JOINED DATE</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Calendar size={12} color={THEME.colors.textMuted} />
                    <Text style={styles.detailItemValue}>
                      {(selectedUser?.move_in_date || selectedUser?.created_at || '').split('T')[0] || '—'}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailGridItem}>
                  <Text style={styles.detailItemLabel}>HOME NO. / UNIT</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Home size={12} color={THEME.colors.clay} />
                    <Text style={styles.detailItemValue}>
                      {selectedUser?.home_number || selectedUser?.unit || '—'}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedUser?.role !== 'FAMILY_MEMBER' ? (
                <View style={styles.detailFullItem}>
                  <Text style={styles.detailItemLabel}>MAX FAMILY ACCOUNTS ALLOWED</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Users size={13} color={THEME.colors.fernGreenDark} />
                    <Text style={[styles.detailItemValue, { color: THEME.colors.fernGreenDark, fontWeight: '700' }]}>
                      {selectedUser?.max_family_members !== undefined ? selectedUser.max_family_members : 2} accounts allocated
                    </Text>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            {/* Strictly Close Button Only */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(214, 194, 161, 0.3)' }}>
              <TouchableOpacity
                style={styles.btnModalCloseFull}
                onPress={() => setShowUserDetailsModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnModalCloseFullText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================
          FILTER PICKER MODALS
          ======================================================== */}
      {/* 1. Unit Status Picker */}
      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Filter by Occupancy</Text>
            {[
              { label: `All Units (${allUnitsData.length})`, val: 'ALL' },
              { label: `Occupied (${occupiedCount})`, val: 'OCCUPIED' },
              { label: `Vacant (${vacantCount})`, val: 'VACANT' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.val}
                style={[styles.pickerItem, statusFilter === opt.val && styles.pickerItemActive]}
                onPress={() => {
                  setStatusFilter(opt.val);
                  setShowStatusPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, statusFilter === opt.val && styles.pickerItemTextActive]}>
                  {opt.label}
                </Text>
                {statusFilter === opt.val && <Check size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 2. Resident Type Picker */}
      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Filter by Resident Type</Text>
            {[
              { label: 'All Resident Types', val: 'ALL' },
              { label: 'Owner Only', val: 'OWNER' },
              { label: 'Tenant Only', val: 'TENANT' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.val}
                style={[styles.pickerItem, residentTypeFilter === opt.val && styles.pickerItemActive]}
                onPress={() => {
                  setResidentTypeFilter(opt.val);
                  setShowTypePicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, residentTypeFilter === opt.val && styles.pickerItemTextActive]}>
                  {opt.label}
                </Text>
                {residentTypeFilter === opt.val && <Check size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 3. User Role Picker */}
      <Modal visible={showUserRolePicker} transparent animationType="fade" onRequestClose={() => setShowUserRolePicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowUserRolePicker(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Filter by Member Role</Text>
            {[
              { label: 'All Roles', val: 'ALL' },
              { label: 'Owners', val: 'OWNER' },
              { label: 'Tenants', val: 'TENANT' },
              { label: 'Family Members', val: 'FAMILY_MEMBER' },
              { label: 'Admins', val: 'ADMIN' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.val}
                style={[styles.pickerItem, userRoleFilter === opt.val && styles.pickerItemActive]}
                onPress={() => {
                  setUserRoleFilter(opt.val);
                  setShowUserRolePicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, userRoleFilter === opt.val && styles.pickerItemTextActive]}>
                  {opt.label}
                </Text>
                {userRoleFilter === opt.val && <Check size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 4. User Status Picker */}
      <Modal visible={showUserStatusPicker} transparent animationType="fade" onRequestClose={() => setShowUserStatusPicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowUserStatusPicker(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Filter by Status</Text>
            {[
              { label: 'All Status', val: 'ALL' },
              { label: 'Active Only', val: 'ACTIVE' },
              { label: 'Inactive Only', val: 'INACTIVE' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.val}
                style={[styles.pickerItem, userStatusFilter === opt.val && styles.pickerItemActive]}
                onPress={() => {
                  setUserStatusFilter(opt.val);
                  setShowUserStatusPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, userStatusFilter === opt.val && styles.pickerItemTextActive]}>
                  {opt.label}
                </Text>
                {userStatusFilter === opt.val && <Check size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 5. Config Picker for Create Modal */}
      <Modal visible={showConfigPicker} transparent animationType="fade" onRequestClose={() => setShowConfigPicker(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setShowConfigPicker(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select Property Configuration</Text>
            {societyConfigs.map((cfg) => (
              <TouchableOpacity
                key={cfg}
                style={[styles.pickerItem, createForm.home_type === cfg && styles.pickerItemActive]}
                onPress={() => {
                  setCreateForm({ ...createForm, home_type: cfg });
                  setShowConfigPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, createForm.home_type === cfg && styles.pickerItemTextActive]}>
                  {cfg === 'PENTHOUSE' ? 'Penthouse' : cfg}
                </Text>
                {createForm.home_type === cfg && <Check size={16} color={THEME.colors.clay} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================
          MODAL: IMPORT RESIDENTS & UNITS FROM EXCEL
          ======================================================== */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isImporting) setShowImportModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.formModalCard, { height: '88%', maxHeight: '94%', padding: 18 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(107, 142, 90, 0.15)' }]}>
                  <FileSpreadsheet size={20} color={THEME.colors.fernGreenDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalHeaderTitle, { fontSize: 15, lineHeight: 19 }]} numberOfLines={2}>
                    Import Residents & Units from Excel
                  </Text>
                  <Text style={styles.modalHeaderSub} numberOfLines={1}>
                    Society: <Text style={{ fontWeight: '700', color: THEME.colors.darkBrown }}>{currentSociety?.name || 'Current Society'}</Text> &nbsp;|&nbsp; Max Units Allowed: <Text style={{ fontWeight: '700', color: THEME.colors.clay }}>{currentSociety?.max_units || currentSociety?.total_homes || 3}</Text>
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowImportModal(false)}
                disabled={isImporting}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1, marginVertical: 8 }}
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Error Banner */}
              {importError && (
                <View style={styles.importErrorBanner}>
                  <AlertCircle size={15} color="#dc2626" />
                  <Text style={styles.importErrorBannerText}>{importError}</Text>
                </View>
              )}

              {/* Upload Drop Zone (Matching Frontend) */}
              <TouchableOpacity
                style={styles.importDropZone}
                activeOpacity={0.8}
                onPress={handlePickExcelFile}
              >
                {importFile ? (
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(21, 128, 61, 0.12)', alignItems: 'center', justifyContent: 'center' }}>
                      <FileSpreadsheet size={24} color="#15803d" />
                    </View>
                    <Text style={[styles.importDropZoneTitle, { color: '#15803d' }]} numberOfLines={1}>
                      {importFile.name || 'Excel File Selected'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700' }}>
                      ✓ {importParsedRows.length} Unit(s) Loaded from Excel File
                    </Text>
                    <Text style={{ fontSize: 10, color: THEME.colors.textMuted, marginTop: 2 }}>
                      Tap here to choose a different spreadsheet file
                    </Text>
                  </View>
                ) : importParsedRows.length > 0 ? (
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(196, 154, 108, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <FileSpreadsheet size={24} color={THEME.colors.clay} />
                    </View>
                    <Text style={styles.importDropZoneTitle}>
                      ✓ Sample Template Loaded ({importParsedRows.length} Units)
                    </Text>
                    <Text style={{ fontSize: 10, color: THEME.colors.textMuted, marginTop: 2 }}>
                      Tap here to pick an actual .xlsx / .csv file from your device
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <Upload size={32} color={THEME.colors.clay} />
                    <Text style={styles.importDropZoneTitle}>
                      Click or Tap to Select Excel File (.xlsx, .xls, .csv)
                    </Text>
                    <Text style={styles.importDropZoneSub}>
                      Rows inside: srno, unit, home no, home type, tower, floor, property configuration, user name, resident type, phone number, email id, move in date, password, max family members
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Parsing status spinner */}
              {importParsing && (
                <View style={{ paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                  <ActivityIndicator size="small" color={THEME.colors.clay} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.colors.textMuted }}>
                    Reading Excel worksheet...
                  </Text>
                </View>
              )}

              {/* Quick Template Download Link & Quick Sample Action (Matching Frontend) */}
              <View style={styles.importTemplateRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                  <Text style={styles.importTemplateLabel}>Need template?</Text>
                  <TouchableOpacity
                    onPress={handleExportExcel}
                    activeOpacity={0.7}
                    style={styles.importTemplateBtn}
                  >
                    <Download size={13} color="#15803d" />
                    <Text style={styles.importTemplateBtnText}>
                      Download Template
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleLoadSampleTemplate}
                  activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <FileSpreadsheet size={12} color={THEME.colors.clay} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.clay, textDecorationLine: 'underline' }}>
                    Load Sample Data
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Metrics Summary Strip & Preview Table (Matching Frontend) */}
              {importParsedRows.length > 0 && (() => {
                const maxUnits = maxUnitsLimit || parseInt(currentSociety?.max_units || currentSociety?.total_homes || 3, 10);
                const maxUsers = maxUsersLimit || (currentSociety?.max_users ? parseInt(currentSociety.max_users, 10) : null);
                const homeNoTotalCount = importParsedRows.length;
                const familyMemberAccountTotal = importParsedRows.reduce(
                  (sum, r) => sum + (parseInt(r.max_family_members, 10) || 0),
                  0
                );
                const totalAccounts = homeNoTotalCount + familyMemberAccountTotal;
                const isUnitsValid = homeNoTotalCount <= maxUnits;
                const isUsersValid = !maxUsers || totalAccounts <= maxUsers;
                const canImport = isUnitsValid && isUsersValid;

                return (
                  <View style={{ marginBottom: 14 }}>
                    {/* 3 Metrics Cards (Matching Frontend) */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
                    >
                      {/* Metric 1: Units */}
                      <View style={[styles.importMetricCard, {
                        backgroundColor: isUnitsValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        borderColor: isUnitsValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                      }]}>
                        <Text style={styles.importMetricCardLabel}>HOME UNITS IN FILE</Text>
                        <Text style={[styles.importMetricCardVal, { color: isUnitsValid ? '#059669' : '#dc2626' }]}>
                          {homeNoTotalCount} / {maxUnits}
                        </Text>
                        <Text style={[styles.importMetricCardHint, { color: isUnitsValid ? '#059669' : '#dc2626' }]}>
                          {isUnitsValid ? '✓ Within Society Max Units' : `✕ Exceeds Max Units (${maxUnits})`}
                        </Text>
                      </View>

                      {/* Metric 2: Family Accounts */}
                      <View style={[styles.importMetricCard, {
                        backgroundColor: 'rgba(196, 154, 108, 0.12)',
                        borderColor: 'rgba(196, 154, 108, 0.3)',
                      }]}>
                        <Text style={styles.importMetricCardLabel}>FAMILY ACCOUNTS QUOTA</Text>
                        <Text style={[styles.importMetricCardVal, { color: THEME.colors.clayDark }]}>
                          +{familyMemberAccountTotal} accounts
                        </Text>
                        <Text style={[styles.importMetricCardHint, { color: THEME.colors.textMuted }]}>
                          Home-wise assigned to residents
                        </Text>
                      </View>

                      {/* Metric 3: Total Accounts */}
                      <View style={[styles.importMetricCard, {
                        backgroundColor: isUsersValid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        borderColor: isUsersValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                      }]}>
                        <Text style={styles.importMetricCardLabel}>TOTAL PROJECTED USERS</Text>
                        <Text style={[styles.importMetricCardVal, { color: isUsersValid ? '#059669' : '#dc2626' }]}>
                          {totalAccounts} {maxUsers ? `/ ${maxUsers}` : ''}
                        </Text>
                        <Text style={[styles.importMetricCardHint, { color: isUsersValid ? '#059669' : '#dc2626' }]}>
                          {isUsersValid
                            ? `✓ Within Max Users Limit (${maxUsers || 'Unlimited'})`
                            : `✕ Exceeds Max Users Limit (${maxUsers})`}
                        </Text>
                      </View>
                    </ScrollView>

                    {/* Prominent Validation Alerts (Matching Frontend) */}
                    {!isUnitsValid && (
                      <View style={styles.importValidationAlertError}>
                        <AlertCircle size={16} color="#dc2626" />
                        <Text style={styles.importValidationAlertErrorText}>
                          Our society max unit is {maxUnits}. Your Excel sheet contains {homeNoTotalCount} units. Cannot import file.
                        </Text>
                      </View>
                    )}

                    {!isUsersValid && (
                      <View style={styles.importValidationAlertError}>
                        <AlertCircle size={16} color="#dc2626" />
                        <Text style={styles.importValidationAlertErrorText}>
                          Our society max user is {maxUsers}. Total user accounts in file (Home primary residents: {homeNoTotalCount} + Max family member accounts: {familyMemberAccountTotal} = {totalAccounts}) exceeds our society max user limit. Cannot import file.
                        </Text>
                      </View>
                    )}

                    {canImport && (
                      <View style={styles.importValidationAlertSuccess}>
                        <CheckCircle2 size={16} color="#059669" />
                        <Text style={styles.importValidationAlertSuccessText}>
                          ✓ Validation Passed: Home units ({homeNoTotalCount}/{maxUnits}) and total projected accounts ({totalAccounts}/{maxUsers || 'Unlimited'}) are within our society limits.
                        </Text>
                      </View>
                    )}

                    {/* Preview Table Header */}
                    <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.colors.darkBrown, marginTop: 8, marginBottom: 6 }}>
                      Preview Table ({importParsedRows.length} units to import):
                    </Text>

                    {/* Full Preview Table with Horizontal Scroll (Matching Frontend Table Columns) */}
                    <View style={styles.importTableContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled>
                        <View>
                          {/* Table Head */}
                          <View style={styles.importTableRowHeader}>
                            <Text style={[styles.importTableCellHeader, { width: 45 }]}>Sr No.</Text>
                            <Text style={[styles.importTableCellHeader, { width: 95 }]}>Unit / Home No</Text>
                            <Text style={[styles.importTableCellHeader, { width: 75 }]}>Home Type</Text>
                            <Text style={[styles.importTableCellHeader, { width: 95 }]}>Tower & Floor</Text>
                            <Text style={[styles.importTableCellHeader, { width: 70 }]}>Configuration</Text>
                            <Text style={[styles.importTableCellHeader, { width: 110 }]}>User Name</Text>
                            <Text style={[styles.importTableCellHeader, { width: 85 }]}>Resident Type</Text>
                            <Text style={[styles.importTableCellHeader, { width: 100 }]}>Phone</Text>
                            <Text style={[styles.importTableCellHeader, { width: 130 }]}>Email</Text>
                            <Text style={[styles.importTableCellHeader, { width: 115, backgroundColor: 'rgba(196, 154, 108, 0.18)', color: THEME.colors.darkBrown }]}>
                              Max Family Accounts
                            </Text>
                            <Text style={[styles.importTableCellHeader, { width: 95 }]}>Password</Text>
                          </View>

                          {/* Table Body */}
                          {importParsedRows.map((row, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.importTableRow,
                                idx % 2 === 1 && { backgroundColor: '#F9FAFB' },
                                canImport && { borderLeftWidth: 3, borderLeftColor: '#10B981' },
                              ]}
                            >
                              <Text style={[styles.importTableCell, { width: 45 }]}>{row.srno || idx + 1}</Text>
                              <Text style={[styles.importTableCell, { width: 95, fontWeight: '700' }]}>{row.unit || row.home_no}</Text>
                              <Text style={[styles.importTableCell, { width: 75, textTransform: 'capitalize' }]}>{row.home_type}</Text>
                              <Text style={[styles.importTableCell, { width: 95 }]}>{row.tower || '—'} - Flr {row.floor || 1}</Text>
                              <Text style={[styles.importTableCell, { width: 70 }]}>{row.property_configuration || '2bhk'}</Text>
                              <Text style={[styles.importTableCell, { width: 110, fontWeight: '600' }]}>{row.user_name}</Text>
                              <Text style={[styles.importTableCell, { width: 85 }]}>{row.resident_type}</Text>
                              <Text style={[styles.importTableCell, { width: 100, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10 }]}>{row.phone_number}</Text>
                              <Text style={[styles.importTableCell, { width: 130, fontSize: 10 }]}>{row.email_id || '—'}</Text>
                              <Text style={[styles.importTableCell, { width: 115, fontWeight: '700', color: THEME.colors.clayDark, backgroundColor: 'rgba(196, 154, 108, 0.08)' }]}>
                                {row.max_family_members !== undefined ? row.max_family_members : 1} accounts
                              </Text>
                              <Text style={[styles.importTableCell, { width: 95, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 10 }]}>{row.password}</Text>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                );
              })()}
            </ScrollView>

            {/* Modal Actions (Matching Frontend Footer) */}
            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setShowImportModal(false)}
                disabled={isImporting}
              >
                <Text style={styles.btnModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              {(() => {
                const maxUnits = maxUnitsLimit || parseInt(currentSociety?.max_units || currentSociety?.total_homes || 3, 10);
                const maxUsers = maxUsersLimit || (currentSociety?.max_users ? parseInt(currentSociety.max_users, 10) : null);
                const homeNoTotalCount = importParsedRows.length;
                const familyMemberAccountTotal = importParsedRows.reduce(
                  (sum, r) => sum + (parseInt(r.max_family_members, 10) || 0),
                  0
                );
                const totalAccounts = homeNoTotalCount + familyMemberAccountTotal;
                const isUnitsValid = homeNoTotalCount <= maxUnits;
                const isUsersValid = !maxUsers || totalAccounts <= maxUsers;
                const canImport = isUnitsValid && isUsersValid && importParsedRows.length > 0;

                return (
                  <TouchableOpacity
                    style={[
                      styles.btnModalSubmit,
                      (!canImport || isImporting) && { opacity: 0.5 },
                    ]}
                    onPress={handleExecuteImport}
                    disabled={isImporting || !canImport}
                  >
                    {isImporting ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.btnModalSubmitText}>Importing...</Text>
                      </View>
                    ) : !canImport && importParsedRows.length > 0 ? (
                      <Text style={styles.btnModalSubmitText}>Cannot Import (Limits Exceeded)</Text>
                    ) : (
                      <Text style={styles.btnModalSubmitText}>
                        {importParsedRows.length > 0
                          ? `Confirm & Import ${importParsedRows.length} Residents`
                          : 'Select Excel File First'}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })()}
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
  topHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.4)',
    paddingBottom: 0,
    ...THEME.shadows.subtle,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    ...THEME.shadows.subtle,
  },
  primaryAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  toastSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  toastSuccessText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
    flex: 1,
  },
  toastError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  toastErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
    flex: 1,
  },
  metricsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.4)',
    minWidth: 128,
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 1,
  },
  metricLimitText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textDim,
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
    backgroundColor: '#FFFFFF',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: THEME.colors.darkBrown,
    backgroundColor: 'rgba(196, 154, 108, 0.06)',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  tabBtnTextActive: {
    color: THEME.colors.darkBrown,
    fontWeight: '800',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(214, 194, 161, 0.25)',
  },
  tabBadgeActive: {
    backgroundColor: THEME.colors.darkBrown,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.background,
    gap: 8,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.5)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textDark,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterDropdownBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterDropdownBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 12,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },

  /* Unit Card Styles */
  unitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.4)',
    padding: 14,
    ...THEME.shadows.subtle,
  },
  unitCardOccupied: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.fernGreenDark,
  },
  unitCardVacant: {
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.clay,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitIconWrapGreen: {
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
  },
  unitIconWrapAmber: {
    backgroundColor: 'rgba(196, 154, 108, 0.18)',
  },
  unitNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  homeTypePill: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  homeTypePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  unitSubText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  occupancyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeOccupied: {
    backgroundColor: 'rgba(107, 142, 90, 0.12)',
  },
  badgeVacant: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
  },
  occupancyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textOccupied: {
    color: THEME.colors.fernGreenDark,
  },
  textVacant: {
    color: THEME.colors.clayDark,
  },
  cardResidentBody: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
  },
  resNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  residentNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rolePillOwner: {
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
  },
  roleTextOwner: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.fernGreenDark,
  },
  rolePillTenant: {
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
  },
  roleTextTenant: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
  },
  rolePillFamily: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  roleTextFamily: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7c3aed',
  },
  rolePillAdmin: {
    backgroundColor: 'rgba(196, 154, 108, 0.2)',
  },
  roleTextAdmin: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  statusDotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(214, 194, 161, 0.15)',
  },
  statusPillActive: {},
  statusPillInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textDark,
  },
  resContactCol: {
    marginTop: 8,
    gap: 4,
  },
  resContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resContactText: {
    fontSize: 12,
    color: THEME.colors.textDark,
  },
  resContactSubText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.2)',
  },
  actionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(214, 194, 161, 0.25)',
  },
  actionBtnEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  actionBtnKey: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  actionBtnKeyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  circleCallBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWhatsAppBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(214, 194, 161, 0.25)',
  },
  actionBtnDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  btnModalWhatsApp: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    borderRadius: 10,
    paddingVertical: 12,
  },
  btnModalWhatsAppText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  actionBtnPower: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(214, 194, 161, 0.15)',
  },
  actionBtnDelete: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  cardVacantBody: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
  },
  vacantHintText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  actionBtnAssign: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.clay,
    paddingVertical: 7,
    borderRadius: 6,
  },
  actionBtnAssignText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* User Card Styles (Tab 2) */
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.4)',
    padding: 14,
    ...THEME.shadows.subtle,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1.5,
    borderColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  userNameTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  userDetailsGrid: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
    gap: 4,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userMetaText: {
    fontSize: 12,
    color: THEME.colors.textDark,
  },
  userCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.2)',
  },
  btnUserDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(214, 194, 161, 0.2)',
  },
  btnUserDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  btnUserPass: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  btnUserPassText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  btnUserPower: {
    padding: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(214, 194, 161, 0.15)',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  formModalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    ...THEME.shadows.modal,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.3)',
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  modalHeaderSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  modalFormScroll: {
    marginVertical: 12,
  },
  sectionHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clay,
    letterSpacing: 0.5,
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
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    fontSize: 13,
    color: THEME.colors.textDark,
    backgroundColor: '#FFFFFF',
  },
  inputHint: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 3,
  },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  formColHalf: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.4)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  toggleBtnActive: {
    backgroundColor: THEME.colors.clay,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  dropdownSelectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  dropdownSelectInputText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
  },
  passInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.5)',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
  },
  btnModalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(214, 194, 161, 0.25)',
  },
  btnModalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  btnModalSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: THEME.colors.clay,
  },
  btnModalSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Detail Items in User Details Modal */
  detailGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  detailGridItem: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: THEME.colors.sandWell,
  },
  detailFullItem: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: THEME.colors.sandWell,
    marginBottom: 8,
  },
  detailItemLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  detailItemValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },

  /* Pickers */
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...THEME.shadows.modal,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.3)',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
  },
  pickerItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textDark,
  },
  pickerItemTextActive: {
    color: THEME.colors.clay,
    fontWeight: '800',
  },
  // Dedicated Excel Action Bar
  excelActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  btnExcelActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(21, 128, 61, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.25)',
  },
  btnExcelActionSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  btnExcelActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.35)',
  },
  btnExcelActionPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.clayDark,
  },
  // Import Modal Styles (Matching Frontend Design)
  importDropZone: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: 'rgba(196, 154, 108, 0.6)',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F2',
    marginBottom: 10,
  },
  importDropZoneTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 8,
    textAlign: 'center',
  },
  importDropZoneSub: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  importTemplateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  importTemplateLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  importTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  importTemplateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    textDecorationLine: 'underline',
  },
  importErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 12,
  },
  importErrorBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },
  importTextarea: {
    height: 75,
    textAlignVertical: 'top',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#FAF7F2',
  },
  importMetricCard: {
    width: 170,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  importMetricCardLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  importMetricCardVal: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  importMetricCardHint: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  importValidationAlertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginBottom: 10,
  },
  importValidationAlertErrorText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    lineHeight: 15,
  },
  importValidationAlertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    marginBottom: 10,
  },
  importValidationAlertSuccessText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    lineHeight: 15,
  },
  importTableContainer: {
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.4)',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  importTableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3EFEA',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.4)',
  },
  importTableCellHeader: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    borderRightWidth: 1,
    borderRightColor: 'rgba(214, 194, 161, 0.25)',
  },
  importTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  importTableCell: {
    paddingVertical: 7,
    paddingHorizontal: 8,
    fontSize: 11,
    color: THEME.colors.textDark,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.04)',
  },
  modalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
    backgroundColor: '#FFFFFF',
  },
  homePillBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
  },
  homePillBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clayDark,
  },
  maxFamilyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(107, 142, 90, 0.1)',
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  maxFamilyText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.fernGreenDark,
  },
  btnModalCloseFull: {
    width: '100%',
    backgroundColor: THEME.colors.clay,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnModalCloseFullText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default ResidentsScreen;
