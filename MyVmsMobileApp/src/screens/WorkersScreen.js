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
  Briefcase,
  Plus,
  Phone,
  Clock,
  ShieldCheck,
  Edit2,
  Trash2,
  Search,
  X,
  RefreshCw,
  Home,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Key,
  Sparkles,
  Car,
  Wrench,
  Zap,
  Utensils,
  ChevronLeft,
  ChevronDown,
  Check,
  Building2,
  Info,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { workerApi, societyApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

// Worker category definitions matching frontend design
const WORKER_TYPES = [
  {
    value: 'ALL',
    label: 'All Workers',
    color: '#6E5D53',
    border: '#D6C2A1',
    bg: 'rgba(214, 194, 161, 0.22)',
    circleBg: '#F5EFEB',
    glow: 'rgba(196, 154, 108, 0.22)',
    icon: Briefcase,
  },
  {
    value: 'DRIVER',
    label: 'Driver',
    color: '#0284c7',
    border: '#38bdf8',
    bg: 'rgba(2, 132, 199, 0.12)',
    circleBg: '#F0F9FF',
    glow: 'rgba(2, 132, 199, 0.24)',
    icon: Car,
  },
  {
    value: 'MAID',
    label: 'Maid',
    color: '#9333ea',
    border: '#c084fc',
    bg: 'rgba(147, 51, 234, 0.12)',
    circleBg: '#FAF5FF',
    glow: 'rgba(147, 51, 234, 0.24)',
    icon: Sparkles,
  },
  {
    value: 'COOK',
    label: 'Cook',
    color: '#d97706',
    border: '#fbbf24',
    bg: 'rgba(217, 119, 6, 0.12)',
    circleBg: '#FFFBEB',
    glow: 'rgba(217, 119, 6, 0.24)',
    icon: Utensils,
  },
  {
    value: 'GARDENER',
    label: 'Gardener',
    color: '#059669',
    border: '#34d399',
    bg: 'rgba(5, 150, 105, 0.12)',
    circleBg: '#ECFDF5',
    glow: 'rgba(5, 150, 105, 0.24)',
    icon: Sparkles,
  },
  {
    value: 'CLEANER',
    label: 'Cleaner',
    color: '#0891b2',
    border: '#22d3ee',
    bg: 'rgba(8, 145, 178, 0.12)',
    circleBg: '#ECFEFF',
    glow: 'rgba(8, 145, 178, 0.24)',
    icon: Sparkles,
  },
  {
    value: 'PLUMBER',
    label: 'Plumber',
    color: '#2563eb',
    border: '#60a5fa',
    bg: 'rgba(37, 99, 235, 0.12)',
    circleBg: '#EFF6FF',
    glow: 'rgba(37, 99, 235, 0.24)',
    icon: Wrench,
  },
  {
    value: 'ELECTRICIAN',
    label: 'Electrician',
    color: '#ea580c',
    border: '#fb923c',
    bg: 'rgba(234, 88, 12, 0.12)',
    circleBg: '#FFF7ED',
    glow: 'rgba(234, 88, 12, 0.24)',
    icon: Zap,
  },
  {
    value: 'OTHER',
    label: 'Other Staff',
    color: '#C49A6C',
    border: '#D9C3B0',
    bg: 'rgba(196, 154, 108, 0.12)',
    circleBg: '#FAF6EE',
    glow: 'rgba(196, 154, 108, 0.24)',
    icon: Briefcase,
  },
];

export const WorkersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'RESIDENTIAL_ADMIN';
  const isResident = !isAdmin; // OWNER, TENANT, FAMILY_MEMBER

  // Data states
  const [workers, setWorkers] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showSocietyPicker, setShowSocietyPicker] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFormSocietyPicker, setShowFormSocietyPicker] = useState(false);
  const [showFormTypePicker, setShowFormTypePicker] = useState(false);
  const [showExistingWorkerPicker, setShowExistingWorkerPicker] = useState(false);

  // Resident Add Worker Modal State: tab between "EXISTING" and "NEW"
  const [addMode, setAddMode] = useState('EXISTING'); // 'EXISTING' | 'NEW'
  const [selectedWorkerType, setSelectedWorkerType] = useState('GARDENER');
  const [existingWorkersList, setExistingWorkersList] = useState([]);
  const [searchingExisting, setSearchingExisting] = useState(false);
  const [selectedExistingWorkerId, setSelectedExistingWorkerId] = useState('');

  // Resident Forms
  const [existingForm, setExistingForm] = useState({
    expected_time_in: '08:00',
    expected_time_out: '19:00',
  });

  const [newWorkerForm, setNewWorkerForm] = useState({
    name: '',
    phone: '',
    worker_type: 'GARDENER',
    address: '',
    photo_url: '',
    expected_time_in: '08:00',
    expected_time_out: '19:00',
  });

  // Notifications
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Register Helper Form (Admin)
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    worker_type: 'GARDENER',
    society_id: null,
    address: '',
    expected_time_in: '08:00',
    expected_time_out: '19:00',
    police_verified: true,
  });

  // Edit Helper Form
  const [editForm, setEditForm] = useState({
    id: null,
    assignment_id: null,
    name: '',
    phone: '',
    worker_type: 'GARDENER',
    address: '',
    expected_time_in: '08:00',
    expected_time_out: '19:00',
    status: 'ACTIVE',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const socRes = await societyApi.getSocieties().catch(() => ({ data: { societies: [] } }));
        const socList = socRes.data?.societies || socRes.societies || [];
        setSocieties(socList);
        if (socList.length > 0) {
          setRegisterForm((p) => ({ ...p, society_id: socList[0].id }));
        }
      }
      await fetchWorkers('ALL');
    } catch (err) {
      console.log('Error initializing worker data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async (socId = selectedSocietyId) => {
    try {
      const params = {};
      if (isAdmin && socId && socId !== 'ALL') {
        params.societyId = socId;
      }
      const res = await workerApi.getHomeWorkers(null, params);
      const list = res.data?.workers || res.data || res.workers || [];
      setWorkers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Error fetching workers:', err);
      showToastError(err.message || 'Failed to load workers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWorkers(selectedSocietyId);
  };

  const showToastSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const showToastError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  // Helper type counts
  const typeCounts = useMemo(() => {
    const counts = { ALL: workers.length };
    WORKER_TYPES.forEach((t) => {
      if (t.value !== 'ALL') {
        counts[t.value] = workers.filter(
          (w) => (w.worker_type || '').toUpperCase() === t.value
        ).length;
      }
    });
    return counts;
  }, [workers]);

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const name = w.full_name || w.name || '';
      const phone = w.phone || '';
      const pass = w.pass_code || '';
      const homes = w.all_assigned_homes || (w.home_number ? String(w.home_number) : '');
      const society = w.society_name || '';

      const matchesSearch =
        !searchTerm.trim() ||
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        phone.includes(searchTerm) ||
        pass.toLowerCase().includes(searchTerm.toLowerCase()) ||
        homes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        society.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === 'ALL' ||
        (w.worker_type || '').toUpperCase() === filterType;

      return matchesSearch && matchesType;
    });
  }, [workers, searchTerm, filterType]);

  // Derived metrics
  const allocatedCount = useMemo(() => {
    return workers.filter((w) => !!w.all_assigned_homes || !!w.home_number).length;
  }, [workers]);

  const poolCount = useMemo(() => {
    return workers.filter((w) => !w.all_assigned_homes && !w.home_number).length;
  }, [workers]);

  const verifiedCount = useMemo(() => {
    return workers.filter((w) => w.police_verified === true || w.police_verified === 1).length;
  }, [workers]);

  // Helpers
  const getInitials = (name) => {
    if (!name) return 'W';
    const parts = name.trim().split(/[\s-]+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const str = String(timeStr).slice(0, 5);
    const parts = str.split(':');
    if (parts.length < 2) return str;
    const hour = parseInt(parts[0], 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${parts[1]} ${ampm}`;
  };

  const getWorkerTypeBadge = (type) => {
    const match = WORKER_TYPES.find((t) => t.value === (type || '').toUpperCase());
    return (
      match || {
        value: type || 'OTHER',
        label: type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Domestic Staff',
        color: '#C49A6C',
        border: '#D9C3B0',
        bg: 'rgba(196, 154, 108, 0.12)',
        circleBg: '#FAF6EE',
        glow: 'rgba(196, 154, 108, 0.24)',
        icon: Briefcase,
      }
    );
  };

  const handleCallPhone = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Phone', `Contact: ${phoneNumber}`);
    });
  };

  // Resident fetch existing helpers
  const fetchExistingWorkersForDropdown = async (type, preselectId = null) => {
    setSearchingExisting(true);
    try {
      const targetSocId = isAdmin
        ? (selectedSocietyId !== 'ALL' ? selectedSocietyId : null)
        : (user?.societyId || null);

      const res = await workerApi.searchWorkers(type, null, null, targetSocId);
      const list = res.data?.workers || [];
      setExistingWorkersList(list);

      if (preselectId) {
        setSelectedExistingWorkerId(preselectId);
      } else {
        const firstAvailable = list.find((w) => !w.already_connected_to_my_home);
        setSelectedExistingWorkerId(firstAvailable ? String(firstAvailable.id || firstAvailable.worker_id) : list[0] ? String(list[0].id || list[0].worker_id) : '');
      }
    } catch (err) {
      console.error('Failed to search workers:', err);
    } finally {
      setSearchingExisting(false);
    }
  };

  const handleSelectResidentWorkerType = (type) => {
    setSelectedWorkerType(type);
    setNewWorkerForm((prev) => ({ ...prev, worker_type: type }));
    setShowFormTypePicker(false);
    if (addMode === 'EXISTING') {
      fetchExistingWorkersForDropdown(type);
    }
  };

  const handleTabChange = (mode) => {
    setAddMode(mode);
    if (mode === 'EXISTING' && existingWorkersList.length === 0) {
      fetchExistingWorkersForDropdown(selectedWorkerType);
    }
  };

  // Actions: Add Helper
  const handleOpenAddModal = (initialWorker = null) => {
    if (isResident) {
      const type = initialWorker?.worker_type || 'GARDENER';
      setSelectedWorkerType(type);
      setAddMode('EXISTING');
      setExistingForm({
        expected_time_in: '08:00',
        expected_time_out: '19:00',
      });
      setNewWorkerForm({
        name: '',
        phone: '',
        worker_type: type,
        address: '',
        photo_url: '',
        expected_time_in: '08:00',
        expected_time_out: '19:00',
      });
      if (initialWorker) {
        setSelectedExistingWorkerId(String(initialWorker.id || initialWorker.worker_id));
      } else {
        setSelectedExistingWorkerId('');
      }
      setShowExistingWorkerPicker(false);
      setShowFormTypePicker(false);
      setShowAddModal(true);
      fetchExistingWorkersForDropdown(type, initialWorker ? String(initialWorker.id || initialWorker.worker_id) : null);
    } else {
      const defaultSocId = (selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0]?.id) || 1;
      setRegisterForm({
        name: '',
        phone: '',
        worker_type: 'GARDENER',
        society_id: defaultSocId,
        address: '',
        expected_time_in: '08:00',
        expected_time_out: '19:00',
        police_verified: true,
      });
      setShowFormSocietyPicker(false);
      setShowFormTypePicker(false);
      setShowAddModal(true);
    }
  };

  // Resident: Link Existing Worker to My Home
  const handleAddExistingWorker = async () => {
    if (!selectedExistingWorkerId) {
      Alert.alert('Required', 'Please select an existing worker from the list.');
      return;
    }
    setSaving(true);
    try {
      await workerApi.addExistingWorker({
        worker_id: selectedExistingWorkerId,
        expected_time_in: existingForm.expected_time_in || '08:00',
        expected_time_out: existingForm.expected_time_out || '19:00',
      });
      showToastSuccess('Worker successfully assigned to your home!');
      setShowAddModal(false);
      fetchWorkers(selectedSocietyId);
    } catch (err) {
      showToastError(err.message || 'Failed to assign existing worker.');
    } finally {
      setSaving(false);
    }
  };

  // Resident: Create New Worker & Link to My Home
  const handleResidentCreateNewWorker = async () => {
    if (!newWorkerForm.name.trim()) {
      Alert.alert('Required', 'Please enter worker full name.');
      return;
    }
    if (!newWorkerForm.phone.trim() || newWorkerForm.phone.trim().length < 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit phone number.');
      return;
    }
    setSaving(true);
    try {
      await workerApi.createNewWorker({
        ...newWorkerForm,
        name: newWorkerForm.name.trim(),
        phone: newWorkerForm.phone.trim(),
        address: newWorkerForm.address ? newWorkerForm.address.trim() : '',
        worker_type: selectedWorkerType === 'ALL' ? 'GARDENER' : selectedWorkerType,
        expected_time_in: newWorkerForm.expected_time_in || '08:00',
        expected_time_out: newWorkerForm.expected_time_out || '19:00',
      });
      showToastSuccess(`Worker "${newWorkerForm.name}" registered and assigned to your home!`);
      setShowAddModal(false);
      setNewWorkerForm({
        name: '',
        phone: '',
        worker_type: 'GARDENER',
        address: '',
        photo_url: '',
        expected_time_in: '08:00',
        expected_time_out: '19:00',
      });
      fetchWorkers(selectedSocietyId);
    } catch (err) {
      showToastError(err.message || 'Failed to create worker.');
    } finally {
      setSaving(false);
    }
  };

  // Admin: Register Society Worker
  const handleRegisterWorker = async () => {
    if (!registerForm.name.trim()) {
      Alert.alert('Required', 'Please enter helper full name.');
      return;
    }
    if (!registerForm.phone.trim() || registerForm.phone.trim().length < 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setSaving(true);
    try {
      const targetSocId = registerForm.society_id || (selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0]?.id) || 1;
      const payload = {
        name: registerForm.name.trim(),
        phone: registerForm.phone.trim(),
        worker_type: registerForm.worker_type || 'GARDENER',
        address: registerForm.address ? registerForm.address.trim() : '',
        society_id: targetSocId,
        expected_time_in: registerForm.expected_time_in || '08:00',
        expected_time_out: registerForm.expected_time_out || '19:00',
        police_verified: true,
      };

      await workerApi.createWorker(payload);
      showToastSuccess(`Society helper "${registerForm.name}" registered successfully!`);
      setShowAddModal(false);
      setShowFormSocietyPicker(false);
      setShowFormTypePicker(false);
      fetchWorkers(selectedSocietyId);
    } catch (err) {
      showToastError(err.message || 'Failed to register helper.');
    } finally {
      setSaving(false);
    }
  };

  // Actions: Edit Helper
  const handleOpenEditModal = (worker) => {
    setEditForm({
      id: worker.worker_id || worker.id,
      assignment_id: worker.assignment_id || null,
      name: worker.full_name || worker.name || '',
      phone: worker.phone || '',
      worker_type: worker.worker_type || 'GARDENER',
      address: worker.address || '',
      expected_time_in: worker.expected_time_in ? String(worker.expected_time_in).slice(0, 5) : '08:00',
      expected_time_out: worker.expected_time_out ? String(worker.expected_time_out).slice(0, 5) : '19:00',
      status: worker.assignment_status || 'ACTIVE',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Required', 'Please enter helper name.');
      return;
    }

    setSaving(true);
    try {
      if (editForm.assignment_id) {
        await workerApi.updateAssignment(editForm.assignment_id, {
          expected_time_in: editForm.expected_time_in,
          expected_time_out: editForm.expected_time_out,
          status: editForm.status,
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
          worker_type: editForm.worker_type,
        });
      } else {
        await workerApi.createWorker({
          id: editForm.id,
          name: editForm.name,
          phone: editForm.phone,
          worker_type: editForm.worker_type,
          address: editForm.address,
          expected_time_in: editForm.expected_time_in,
          expected_time_out: editForm.expected_time_out,
        });
      }

      showToastSuccess('Worker details updated successfully!');
      setShowEditModal(false);
      fetchWorkers(selectedSocietyId);
    } catch (err) {
      showToastError(err.message || 'Failed to update helper.');
    } finally {
      setSaving(false);
    }
  };

  // Actions: Delete / Remove Helper
  const handleDeleteWorker = (worker) => {
    const workerName = worker.full_name || worker.name || 'Worker';
    const role = worker.worker_type || 'Helper';
    const isAssignment = !!worker.assignment_id;

    Alert.alert(
      'Remove Worker',
      `Are you sure you want to remove ${workerName} (${role})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isAssignment) {
                await workerApi.removeWorker(worker.assignment_id);
              } else {
                await workerApi.deleteWorker(worker.worker_id || worker.id);
              }
              showToastSuccess(`Worker "${workerName}" removed.`);
              fetchWorkers(selectedSocietyId);
            } catch (err) {
              showToastError(err.message || 'Failed to remove worker.');
            }
          },
        },
      ]
    );
  };

  // Actions: Assign unassigned worker to home (for residents)
  const handleAssignToMyHome = async (worker) => {
    try {
      await workerApi.addExistingWorker({
        worker_id: worker.worker_id || worker.id,
        expected_time_in: '08:00',
        expected_time_out: '19:00',
      });
      showToastSuccess(`${worker.full_name || worker.name} assigned to your home!`);
      fetchWorkers(selectedSocietyId);
    } catch (err) {
      showToastError(err.message || 'Failed to assign helper to home.');
    }
  };

  // Render individual Worker Card
  const renderWorkerCard = ({ item: w }) => {
    const badge = getWorkerTypeBadge(w.worker_type);
    const workerName = w.full_name || w.name || 'Unknown Worker';
    const assignedHomes = w.all_assigned_homes || (w.home_number ? String(w.home_number) : null);

    return (
      <View style={[styles.workerCard, { borderColor: badge.border }]}>
        {/* Top Header Row: Left Avatar + Right Name & Tag */}
        <View style={styles.cardTopRow}>
          {/* Square Avatar */}
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: badge.circleBg,
                borderColor: badge.border,
              },
            ]}
          >
            {w.photo_url ? (
              <Image source={{ uri: w.photo_url }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: badge.color }]}>
                {getInitials(workerName)}
              </Text>
            )}
          </View>

          {/* Right Information */}
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.workerNameText} numberOfLines={1}>
              {workerName}
            </Text>

            {/* Worker Type Pill */}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: badge.bg, borderColor: badge.border },
                ]}
              >
                <Text style={[styles.roleBadgeText, { color: badge.color }]}>
                  {badge.label.toUpperCase()}
                </Text>
              </View>

              {/* Police Verified Pill */}

            </View>

            {/* Society Name */}
            {w.society_name && (
              <View style={styles.societyRow}>
                <Building2 size={11} color={THEME.colors.textMuted} />
                <Text style={styles.societyText} numberOfLines={1}>
                  {w.society_name}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Gate Passcode Monospace Chip */}
        <View style={styles.gatePassContainer}>
          <Key size={13} color="#7c3aed" />
          <Text style={styles.gatePassLabel}>Gate Pass:</Text>
          <Text style={styles.gatePassCode}>{w.pass_code || 'PASS-STD'}</Text>
        </View>

        {/* Works For / Home Allocation Banner */}
        <View style={styles.homeBanner}>
          <Home size={14} color={THEME.colors.clay} style={{ flexShrink: 0 }} />
          <Text
            style={[
              styles.homeBannerText,
              { color: assignedHomes ? THEME.colors.darkBrown : THEME.colors.clay },
            ]}
            numberOfLines={1}
          >
            {assignedHomes
              ? assignedHomes
                .split(',')
                .map((h) => `Unit ${h.trim()}`)
                .join(', ')
              : 'Society Pool (Available)'}
          </Text>
        </View>

        {/* Contact & Duty Hours Details */}
        <View style={styles.detailsContainer}>
          {/* Phone */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => handleCallPhone(w.phone)}
            activeOpacity={0.7}
          >
            <Phone size={13} color="#059669" />
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={[styles.detailValue, { color: '#059669', textDecorationLine: 'underline' }]}>
              {w.phone || 'N/A'}
            </Text>
          </TouchableOpacity>

          {/* Duty Hours */}
          {(w.expected_time_in || w.expected_time_out) && (
            <View style={styles.detailRow}>
              <Clock size={13} color="#d97706" />
              <Text style={styles.detailLabel}>Duty Hours:</Text>
              <Text style={styles.detailValue}>
                {formatTime(w.expected_time_in) || '08:00 AM'} - {formatTime(w.expected_time_out) || '07:00 PM'}
              </Text>
            </View>
          )}

          {/* Address */}
          {!!w.address && (
            <View style={styles.detailRow}>
              <MapPin size={13} color={THEME.colors.clay} />
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {w.address}
              </Text>
            </View>
          )}
        </View>

        {/* Card Action Buttons Footer */}
        <View style={styles.cardActionsFooter}>
          {/* If resident viewing unassigned pool worker */}
          {!w.assignment_id && isResident && !isAdmin ? (
            <TouchableOpacity
              style={styles.btnAssignHome}
              onPress={() => handleOpenAddModal(w)}
              activeOpacity={0.8}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.btnAssignHomeText}>Assign to My Home</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.actionBtnDelete}
                onPress={() => handleDeleteWorker(w)}
                activeOpacity={0.75}
              >
                <Trash2 size={13} color="#DC2626" />
                {/* <Text style={styles.actionBtnDeleteText}>
                  {isAdmin ? 'Delete' : 'Remove'}
                </Text> */}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const currentTypeBadge = getWorkerTypeBadge(filterType);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ========================================================
          1. HEADER (WORKER MANAGEMENT)
          ======================================================== */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* Clean back arrow without border or box background */}
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
            <Text style={styles.headerTitle}>Worker Management</Text>
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
          4. SEARCH BAR & DROPDOWN FOR TYPE
          ======================================================== */}
      <View style={styles.filterSection}>
        {/* Search Input & Action Button Row */}
        <View style={styles.searchAndButtonRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={THEME.colors.textDim} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search helper name, phone, pass code, or home..."
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

          {/* Action button on right side of search */}
          <TouchableOpacity
            id="btn-register-helper"
            style={styles.btnRegisterHelper}
            activeOpacity={0.85}
            onPress={() => handleOpenAddModal()}
          >
            <Plus size={15} color="#FFFFFF" />
            <Text style={styles.btnRegisterHelperText} numberOfLines={1}>
              {isAdmin ? 'Register Society Helper' : 'Add Worker to Home'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dropdown for Type Trigger */}
        <View style={styles.dropdownRow}>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowTypePicker(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownBtnLeft}>
              <Briefcase size={14} color={currentTypeBadge.color} />
              <Text style={styles.dropdownBtnText} numberOfLines={1}>
                {currentTypeBadge.label} ({typeCounts[filterType] || 0})
              </Text>
            </View>
            <ChevronDown size={14} color={THEME.colors.darkBrown} />
          </TouchableOpacity>

          {/* Admin Society Dropdown if multiple */}
          {isAdmin && societies.length > 1 && (
            <TouchableOpacity
              style={[styles.dropdownBtn, { flex: 0.85 }]}
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
          5. MAIN LIST: CARD TYPE UI USING FLATLIST VERTICAL SCROLL
          ======================================================== */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading society workers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredWorkers}
          keyExtractor={(item, index) =>
            String(item.assignment_id || item.worker_id || item.id || index)
          }
          renderItem={renderWorkerCard}
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
              <Briefcase size={44} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Helpers Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchTerm || filterType !== 'ALL'
                  ? 'No workers match your filter or search criteria.'
                  : isAdmin
                  ? 'Tap "Register Society Helper" to add domestic workers.'
                  : 'Tap "+ Add Worker to Home" to assign helpers to your home.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => handleOpenAddModal()}
                activeOpacity={0.85}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>
                  {isAdmin ? 'Register Society Helper' : '+ Add Worker to Home'}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ========================================================
          6. MODAL: WORKER TYPE PICKER DROPDOWN
          ======================================================== */}
      <Modal visible={showTypePicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypePicker(false)}
        >
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select Worker Type</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <X size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {WORKER_TYPES.map((t) => {
                const isSelected = filterType === t.value;
                const count = typeCounts[t.value] || 0;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setFilterType(t.value);
                      setShowTypePicker(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={[
                          styles.pickerIconWrap,
                          { backgroundColor: t.bg, borderColor: t.border },
                        ]}
                      >
                        <Briefcase size={14} color={t.color} />
                      </View>
                      <Text
                        style={[
                          styles.pickerItemText,
                          isSelected && { color: THEME.colors.darkBrown, fontWeight: '800' },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.pickerItemCount}>({count})</Text>
                      {isSelected && <Check size={16} color={THEME.colors.clay} />}
                    </View>
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

            <ScrollView style={{ maxHeight: 340 }}>
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  selectedSocietyId === 'ALL' && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedSocietyId('ALL');
                  fetchWorkers('ALL');
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
                      fetchWorkers(s.id);
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
          8. MODAL: REGISTER HELPER / ADD WORKER TO HOME
          ======================================================== */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (showExistingWorkerPicker) {
            setShowExistingWorkerPicker(false);
          } else if (showFormSocietyPicker) {
            setShowFormSocietyPicker(false);
          } else if (showFormTypePicker) {
            setShowFormTypePicker(false);
          } else {
            setShowAddModal(false);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBottomOverlay}
        >
          <View style={styles.formModalSheet}>
            {/* Header */}
            <View style={styles.formModalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.formModalTitle}>
                  {isAdmin ? 'Register Society Helper' : 'Add Helper to My Home'}
                </Text>
                <Text style={styles.formModalSubtitle}>
                  {isAdmin
                    ? 'Register a verified worker into the society pool. No home number is assigned directly.'
                    : 'Connect an existing society worker or register a new helper for your home.'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowFormSocietyPicker(false);
                  setShowFormTypePicker(false);
                  setShowExistingWorkerPicker(false);
                  setShowAddModal(false);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 470 }}>
              {isAdmin ? (
                /* ======================================================== */
                /* VIEW A: ADMIN REGISTERS SOCIETY WORKER                    */
                /* ======================================================== */
                <View>
                  {/* Target Society Dropdown */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      TARGET SOCIETY <Text style={{ color: '#DC2626' }}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdownSelectInput}
                      onPress={() => setShowFormSocietyPicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownSelectInputText} numberOfLines={1}>
                        {societies.find((s) => s.id === registerForm.society_id)?.name ||
                          societies[0]?.name ||
                          'Select Society'}{' '}
                        (
                        {societies.find((s) => s.id === registerForm.society_id)?.code ||
                          `ID: ${registerForm.society_id || societies[0]?.id || 1}`}
                        )
                      </Text>
                      <ChevronDown size={16} color={THEME.colors.clay} />
                    </TouchableOpacity>
                  </View>

                  {/* Worker Type Dropdown */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      WORKER TYPE <Text style={{ color: '#DC2626' }}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdownSelectInput}
                      onPress={() => setShowFormTypePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownSelectInputText} numberOfLines={1}>
                        {WORKER_TYPES.find((t) => t.value === registerForm.worker_type)?.label ||
                          'Select Worker Type'}
                      </Text>
                      <ChevronDown size={16} color={THEME.colors.clay} />
                    </TouchableOpacity>
                  </View>

                  {/* Worker Full Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      WORKER FULL NAME <Text style={{ color: '#DC2626' }}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. BHURI"
                      placeholderTextColor={THEME.colors.textDim}
                      value={registerForm.name}
                      onChangeText={(val) => setRegisterForm((p) => ({ ...p, name: val }))}
                    />
                  </View>

                  {/* Mobile Number */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      PHONE NUMBER * (10 DIGITS)
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 9876543210"
                      placeholderTextColor={THEME.colors.textDim}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={registerForm.phone}
                      onChangeText={(val) => setRegisterForm((p) => ({ ...p, phone: val }))}
                    />
                  </View>

                  {/* Address / Local Details */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>ADDRESS / LOCAL DETAILS (OPTIONAL)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Staff Quarters, Nearby Area"
                      placeholderTextColor={THEME.colors.textDim}
                      value={registerForm.address}
                      onChangeText={(val) => setRegisterForm((p) => ({ ...p, address: val }))}
                    />
                  </View>

                  {/* Admin Notice Banner */}
                  <View style={styles.adminNoticeBox}>
                    <Info size={16} color="#D97706" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.adminNoticeTitle}>Admin Notice:</Text>
                      <Text style={styles.adminNoticeText}>
                        Admin registers helpers into the general society pool. No home number is assigned directly. Residents log in and assign helpers to their homes.
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                /* ======================================================== */
                /* VIEW B: RESIDENT (Select Existing OR Create New)         */
                /* ======================================================== */
                <View>
                  {/* Step 1: Worker Type Dropdown */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      WORKER TYPE <Text style={{ color: '#DC2626' }}>*</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.dropdownSelectInput}
                      onPress={() => setShowFormTypePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownSelectInputText} numberOfLines={1}>
                        {WORKER_TYPES.find((t) => t.value === selectedWorkerType)?.label || 'Gardener'}
                      </Text>
                      <ChevronDown size={16} color={THEME.colors.clay} />
                    </TouchableOpacity>
                  </View>

                  {/* Step 2: Tab Switcher: [ Select Existing ] OR [ + Create New Worker ] */}
                  <View style={styles.residentTabContainer}>
                    <TouchableOpacity
                      style={[
                        styles.residentTabBtn,
                        addMode === 'EXISTING' && styles.residentTabBtnActive,
                      ]}
                      onPress={() => handleTabChange('EXISTING')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.residentTabBtnText,
                          addMode === 'EXISTING' && styles.residentTabBtnTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        Select Existing {WORKER_TYPES.find((t) => t.value === selectedWorkerType)?.label || 'Worker'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.residentTabBtn,
                        addMode === 'NEW' && styles.residentTabBtnActive,
                      ]}
                      onPress={() => handleTabChange('NEW')}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.residentTabBtnText,
                          addMode === 'NEW' && styles.residentTabBtnTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        + Create New Worker
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* TAB 1: SELECT EXISTING WORKER */}
                  {addMode === 'EXISTING' && (
                    <View>
                      <View style={styles.inputGroup}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={[styles.inputLabel, { marginBottom: 0 }]}>
                            CHOOSE REGISTERED IN SOCIETY:
                          </Text>
                          <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{existingWorkersList.length} Found</Text>
                          </View>
                        </View>

                        {searchingExisting ? (
                          <View style={styles.searchingBox}>
                            <ActivityIndicator size="small" color={THEME.colors.clay} style={{ marginRight: 8 }} />
                            <Text style={styles.searchingText}>Searching society helpers...</Text>
                          </View>
                        ) : existingWorkersList.length === 0 ? (
                          <View style={styles.noWorkersBox}>
                            <Text style={styles.noWorkersText}>
                              No registered {WORKER_TYPES.find((t) => t.value === selectedWorkerType)?.label.toLowerCase()} found in society.
                            </Text>
                            <TouchableOpacity
                              style={styles.btnSwitchToNew}
                              onPress={() => setAddMode('NEW')}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.btnSwitchToNewText}>
                                + Register New {WORKER_TYPES.find((t) => t.value === selectedWorkerType)?.label} Instead
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.dropdownSelectInput}
                            onPress={() => setShowExistingWorkerPicker(true)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.dropdownSelectInputText} numberOfLines={1}>
                              {(() => {
                                const selected = existingWorkersList.find((w) => String(w.id || w.worker_id) === String(selectedExistingWorkerId));
                                if (!selected) return `-- Choose Worker (${existingWorkersList.length} Available) --`;
                                return `${selected.full_name || selected.name} — ${selected.phone} ${selected.already_connected_to_my_home ? '(In Home)' : ''}`;
                              })()}
                            </Text>
                            <ChevronDown size={16} color={THEME.colors.clay} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Duty Timings */}
                      <View style={styles.timeRow}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>EXPECTED TIME IN</Text>
                          <TextInput
                            style={styles.textInput}
                            value={existingForm.expected_time_in}
                            onChangeText={(val) => setExistingForm((p) => ({ ...p, expected_time_in: val }))}
                            placeholder="08:00"
                            placeholderTextColor={THEME.colors.textDim}
                          />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>EXPECTED TIME OUT</Text>
                          <TextInput
                            style={styles.textInput}
                            value={existingForm.expected_time_out}
                            onChangeText={(val) => setExistingForm((p) => ({ ...p, expected_time_out: val }))}
                            placeholder="19:00"
                            placeholderTextColor={THEME.colors.textDim}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* TAB 2: CREATE NEW WORKER */}
                  {addMode === 'NEW' && (
                    <View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          WORKER FULL NAME <Text style={{ color: '#DC2626' }}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Ramesh"
                          placeholderTextColor={THEME.colors.textDim}
                          value={newWorkerForm.name}
                          onChangeText={(val) => setNewWorkerForm((p) => ({ ...p, name: val }))}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>
                          PHONE NUMBER <Text style={{ color: '#DC2626' }}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. 9876543222"
                          placeholderTextColor={THEME.colors.textDim}
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={newWorkerForm.phone}
                          onChangeText={(val) => setNewWorkerForm((p) => ({ ...p, phone: val }))}
                        />
                      </View>

                      <View style={styles.timeRow}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>TIME IN</Text>
                          <TextInput
                            style={styles.textInput}
                            value={newWorkerForm.expected_time_in}
                            onChangeText={(val) => setNewWorkerForm((p) => ({ ...p, expected_time_in: val }))}
                            placeholder="08:00"
                            placeholderTextColor={THEME.colors.textDim}
                          />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                          <Text style={styles.inputLabel}>TIME OUT</Text>
                          <TextInput
                            style={styles.textInput}
                            value={newWorkerForm.expected_time_out}
                            onChangeText={(val) => setNewWorkerForm((p) => ({ ...p, expected_time_out: val }))}
                            placeholder="19:00"
                            placeholderTextColor={THEME.colors.textDim}
                          />
                        </View>
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>ADDRESS (OPTIONAL)</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="e.g. Local Staff Quarter, Village"
                          placeholderTextColor={THEME.colors.textDim}
                          value={newWorkerForm.address}
                          onChangeText={(val) => setNewWorkerForm((p) => ({ ...p, address: val }))}
                        />
                      </View>

                      <View style={styles.residentNoticeBox}>
                        <Sparkles size={16} color="#6366F1" style={{ marginTop: 2 }} />
                        <Text style={styles.residentNoticeText}>
                          When registered, this helper will be assigned to your home and will also be visible to the society admin.
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.formModalActions}>
              <TouchableOpacity
                style={styles.formCancelBtn}
                onPress={() => {
                  setShowFormSocietyPicker(false);
                  setShowFormTypePicker(false);
                  setShowExistingWorkerPicker(false);
                  setShowAddModal(false);
                }}
              >
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              {isAdmin ? (
                <TouchableOpacity
                  style={styles.formSubmitBtn}
                  onPress={handleRegisterWorker}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.formSubmitBtnText}>Register Society Helper</Text>
                  )}
                </TouchableOpacity>
              ) : addMode === 'EXISTING' ? (
                <TouchableOpacity
                  style={[
                    styles.formSubmitBtn,
                    (!selectedExistingWorkerId || existingWorkersList.length === 0 || saving) && { opacity: 0.6 },
                  ]}
                  onPress={handleAddExistingWorker}
                  disabled={!selectedExistingWorkerId || existingWorkersList.length === 0 || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.formSubmitBtnText}>Add Worker to My Home</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.formSubmitBtn}
                  onPress={handleResidentCreateNewWorker}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.formSubmitBtnText}>+ Create & Assign to My Home</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Target Society Picker Overlay */}
          {showFormSocietyPicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowFormSocietyPicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 330, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Target Society</Text>
                  <TouchableOpacity
                    onPress={() => setShowFormSocietyPicker(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {societies.map((s) => {
                    const isSelected = registerForm.society_id === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          setRegisterForm((p) => ({ ...p, society_id: s.id }));
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

          {/* Worker Type Picker Overlay */}
          {showFormTypePicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowFormTypePicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 330, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Select Worker Type</Text>
                  <TouchableOpacity
                    onPress={() => setShowFormTypePicker(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                  {WORKER_TYPES.filter((t) => t.value !== 'ALL').map((t) => {
                    const isSelected = (isResident ? selectedWorkerType : registerForm.worker_type) === t.value;
                    const IconComp = t.icon || Briefcase;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          if (isResident) {
                            handleSelectResidentWorkerType(t.value);
                          } else {
                            setRegisterForm((p) => ({ ...p, worker_type: t.value }));
                            setShowFormTypePicker(false);
                          }
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={[
                              styles.pickerIconWrap,
                              { backgroundColor: t.bg, borderColor: t.border },
                            ]}
                          >
                            <IconComp size={14} color={t.color} />
                          </View>
                          <Text
                            style={[
                              styles.pickerItemText,
                              isSelected && { color: THEME.colors.darkBrown, fontWeight: '800' },
                            ]}
                          >
                            {t.label}
                          </Text>
                        </View>
                        {isSelected && <Check size={16} color={THEME.colors.clay} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Existing Worker Picker Overlay for Resident */}
          {showExistingWorkerPicker && (
            <View style={styles.formPickerBackdrop}>
              <TouchableOpacity
                style={StyleSheet.absoluteFillObject}
                activeOpacity={1}
                onPress={() => setShowExistingWorkerPicker(false)}
              />
              <View style={[styles.pickerModalContent, { maxWidth: 350, zIndex: 10 }]}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>
                    Select {WORKER_TYPES.find((t) => t.value === selectedWorkerType)?.label || 'Worker'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowExistingWorkerPicker(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={18} color={THEME.colors.darkBrown} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                  {existingWorkersList.map((ew) => {
                    const isSelected = String(ew.id || ew.worker_id) === String(selectedExistingWorkerId);
                    const isAlreadyConnected = !!ew.already_connected_to_my_home;
                    return (
                      <TouchableOpacity
                        key={String(ew.id || ew.worker_id)}
                        style={[
                          styles.existingWorkerItem,
                          isSelected && styles.existingWorkerItemSelected,
                          isAlreadyConnected && { opacity: 0.5 },
                        ]}
                        disabled={isAlreadyConnected}
                        onPress={() => {
                          setSelectedExistingWorkerId(String(ew.id || ew.worker_id));
                          setShowExistingWorkerPicker(false);
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text
                            style={[
                              styles.existingWorkerItemName,
                              isSelected && { color: THEME.colors.clay, fontWeight: '800' },
                            ]}
                          >
                            {ew.full_name || ew.name}
                          </Text>
                          <Text style={styles.existingWorkerItemSub}>
                            📞 {ew.phone} • {ew.active_home_numbers ? `Works for Unit ${ew.active_home_numbers}` : 'Society Pool'}
                          </Text>
                        </View>
                        {isAlreadyConnected ? (
                          <View style={styles.alreadyConnectedBadge}>
                            <Text style={styles.alreadyConnectedBadgeText}>Already in Home</Text>
                          </View>
                        ) : isSelected ? (
                          <Check size={16} color={THEME.colors.clay} />
                        ) : null}
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
          9. MODAL: EDIT WORKER DETAILS
          ======================================================== */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBottomOverlay}
        >
          <View style={styles.formModalSheet}>
            {/* Header */}
            <View style={styles.formModalHeader}>
              <View>
                <Text style={styles.formModalTitle}>Edit Worker Details</Text>
                <Text style={styles.formModalSubtitle}>
                  Update duty shift timings, category, and contact details
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
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>HELPER FULL NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.name}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, name: val }))}
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="phone-pad"
                  value={editForm.phone}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, phone: val }))}
                />
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ROLE / CATEGORY</Text>
                <View style={styles.formChipGrid}>
                  {WORKER_TYPES.filter((t) => t.value !== 'ALL').map((t) => {
                    const isSelected = editForm.worker_type === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        onPress={() => setEditForm((p) => ({ ...p, worker_type: t.value }))}
                        style={[
                          styles.formRoleChip,
                          isSelected && {
                            backgroundColor: t.color,
                            borderColor: t.color,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.formRoleChipText,
                            isSelected && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Duty Shift Timings */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>DUTY ENTRY TIME</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="08:00"
                    placeholderTextColor={THEME.colors.textDim}
                    value={editForm.expected_time_in}
                    onChangeText={(val) => setEditForm((p) => ({ ...p, expected_time_in: val }))}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>DUTY EXIT TIME</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="19:00"
                    placeholderTextColor={THEME.colors.textDim}
                    value={editForm.expected_time_out}
                    onChangeText={(val) => setEditForm((p) => ({ ...p, expected_time_out: val }))}
                  />
                </View>
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>LOCAL ADDRESS / QUARTERS</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.address}
                  onChangeText={(val) => setEditForm((p) => ({ ...p, address: val }))}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.formModalActions}>
              <TouchableOpacity
                style={styles.formCancelBtn}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.formSubmitBtn}
                onPress={handleSaveEdit}
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
    paddingTop: 10,
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
  btnRegisterHelper: {
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
  btnRegisterHelperText: {
    fontSize: 12,
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

  /* Metrics Bar */
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

  /* Filter Section */
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
  typeChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  chipPillActive: {
    backgroundColor: THEME.colors.darkBrown,
    borderColor: THEME.colors.darkBrown,
  },
  chipPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  chipPillTextActive: {
    color: '#FFFFFF',
  },
  chipCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(214, 194, 161, 0.45)',
  },
  chipCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  chipCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  chipCountTextActive: {
    color: '#FFFFFF',
  },

  /* FlatList Content & Cards */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
  },
  workerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    padding: 16,
    marginBottom: 14,
    ...THEME.shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  avatarContainer: {
    width: 62,
    height: 62,
    borderRadius: 14,
    borderWidth: 2,
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
  avatarInitials: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  workerNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  societyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  societyText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },

  /* Gate Pass Monospace Chip */
  gatePassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  gatePassLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6d28d9',
  },
  gatePassCode: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#5b21b6',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },

  /* Home Banner */
  homeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF6EE',
    borderWidth: 1,
    borderColor: '#EFE9E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  homeBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  /* Details Container */
  detailsContainer: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  detailValue: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    flex: 1,
  },

  /* Card Action Buttons */
  cardActionsFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
    paddingTop: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  actionBtnEditText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  actionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  actionBtnDeleteText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  btnAssignHome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.clay,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnAssignHomeText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Loading & Empty States */
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

  /* Picker Modals */
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
  pickerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemText: {
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  pickerItemCount: {
    fontSize: 11,
    color: THEME.colors.textDim,
    fontWeight: '700',
  },

  /* Form Sheet Modals */
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
  formRoleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  formRoleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAF6EE',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFE9E1',
    marginVertical: 4,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
  },
  checkboxBoxActive: {
    backgroundColor: THEME.colors.fernGreenDark,
    borderColor: THEME.colors.fernGreenDark,
  },
  checkboxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  checkboxSubtitle: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    marginTop: 1,
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
  adminNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  adminNoticeTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#D97706',
    marginBottom: 2,
  },
  adminNoticeText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },
  formPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 99,
  },

  /* Resident Add Worker Modal Styles */
  residentTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3EDE7',
    padding: 4,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6DCD3',
  },
  residentTabBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentTabBtnActive: {
    backgroundColor: THEME.colors.clay,
    ...THEME.shadows.card,
  },
  residentTabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  residentTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  countBadgeText: {
    color: '#0891B2',
    fontSize: 11,
    fontWeight: '700',
  },
  searchingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: THEME.colors.sandWell,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    gap: 8,
  },
  searchingText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  noWorkersBox: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noWorkersText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  btnSwitchToNew: {
    borderWidth: 1,
    borderColor: THEME.colors.clay,
    backgroundColor: 'rgba(196, 154, 108, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnSwitchToNewText: {
    fontSize: 11.5,
    color: THEME.colors.clay,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  residentNoticeBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  residentNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#4338CA',
    lineHeight: 15,
  },
  existingWorkerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFEB',
  },
  existingWorkerItemSelected: {
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
  },
  existingWorkerItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  existingWorkerItemSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  alreadyConnectedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alreadyConnectedBadgeText: {
    color: '#059669',
    fontSize: 10.5,
    fontWeight: '700',
  },
});
