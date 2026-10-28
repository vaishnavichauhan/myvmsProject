import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { societyApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';
import {
  Building2,
  Building,
  Mail,
  Phone,
  PhoneCall,
  MapPin,
  ShieldCheck,
  ChevronLeft,
  CheckCircle2,
  UserCheck,
  Key,
  Layers,
  Edit2,
  Home,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
  Plus,
  Search,
  Download,
} from 'lucide-react-native';

export const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'RESIDENTIAL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const scrollViewRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Society details & stats
  const [societyId, setSocietyId] = useState(null);
  const [societyName, setSocietyName] = useState('');
  const [societyCode, setSocietyCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [societyType, setSocietyType] = useState('FLAT');
  const [propertyConfig, setPropertyConfig] = useState('2BHK');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [totalHomes, setTotalHomes] = useState(0);
  const [maxUnits, setMaxUnits] = useState(0);
  const [exportUnitsCount, setExportUnitsCount] = useState('10');
  const [actualHomesCount, setActualHomesCount] = useState(0);
  const [occupiedHomesCount, setOccupiedHomesCount] = useState(0);
  const [vacantHomesCount, setVacantHomesCount] = useState(0);

  const [societyStatus, setSocietyStatus] = useState('ACTIVE');

  // Edit / Create Modal State & Form Fields (exact match with frontend SocietiesPage)
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCreatingSociety, setIsCreatingSociety] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPincode, setEditPincode] = useState('');
  const [editRegistrationNumber, setEditRegistrationNumber] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editSocietyType, setEditSocietyType] = useState('FLAT');
  const [editPropertyConfig, setEditPropertyConfig] = useState('2BHK');
  const [editTotalHomes, setEditTotalHomes] = useState('10');
  const [bungalowStartNo, setBungalowStartNo] = useState('1');
  const [bungalowEndNo, setBungalowEndNo] = useState('10');
  const [flatTowers, setFlatTowers] = useState([]);
  const [editPhone, setEditPhone] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');

  // Manage Homes Modal State & Filters
  const [showManageHomesModal, setShowManageHomesModal] = useState(false);
  const [societyHomes, setSocietyHomes] = useState([]);
  const [homeSearchText, setHomeSearchText] = useState('');
  const [homeStatusFilter, setHomeStatusFilter] = useState('ALL'); // 'ALL' | 'OCCUPIED' | 'VACANT'
  const [loadingHomes, setLoadingHomes] = useState(false);

  // Add Single Home State
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [newHomeNumber, setNewHomeNumber] = useState('');
  const [newBuildingOrWing, setNewBuildingOrWing] = useState('');
  const [newFloor, setNewFloor] = useState('');
  const [newHomeType, setNewHomeType] = useState('2BHK');
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [submittingHome, setSubmittingHome] = useState(false);

  // Batch Generate Homes State
  const [showBatchHomesModal, setShowBatchHomesModal] = useState(false);
  const [batchCount, setBatchCount] = useState('20');
  const [batchStartFrom, setBatchStartFrom] = useState('1');
  const [batchPrefix, setBatchPrefix] = useState('Home ');
  const [batchBuildingOrWing, setBatchBuildingOrWing] = useState('');
  const [batchHomeType, setBatchHomeType] = useState('2BHK');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Dynamic preview configuration for Bungalow and Flat
  const bungalowUnits = React.useMemo(() => {
    const s = parseInt(bungalowStartNo, 10);
    const e = parseInt(bungalowEndNo, 10);
    if (isNaN(s) || isNaN(e) || e < s) return [];
    const limit = Math.min(e - s + 1, 40);
    const arr = [];
    for (let i = 0; i < limit; i++) {
      arr.push(s + i);
    }
    return arr;
  }, [bungalowStartNo, bungalowEndNo]);

  const flatUnits = React.useMemo(() => {
    const units = [];
    (flatTowers || []).forEach((t) => {
      const s = parseInt(t.startNo, 10);
      const e = parseInt(t.endNo, 10);
      if (!isNaN(s) && !isNaN(e) && e >= s) {
        const count = Math.min(e - s + 1, 30);
        for (let i = 0; i < count; i++) {
          const num = s + i;
          units.push({
            id: `${t.name}-${num}`,
            tower: t.name,
            floor: t.floor,
            number: `${t.name}-${num}`,
          });
        }
      }
    });
    return units;
  }, [flatTowers]);

  const filteredHomes = React.useMemo(() => {
    return (societyHomes || []).filter((h) => {
      const q = homeSearchText.toLowerCase();
      const num = String(h.home_number || h.flat_number || h.id || '').toLowerCase();
      const wing = String(h.building_or_wing || '').toLowerCase();
      const matchesSearch = homeSearchText === '' || num.includes(q) || wing.includes(q);

      const isOccupied =
        h.occupancy_status === 'OCCUPIED_BY_OWNER' || h.occupancy_status === 'OCCUPIED_BY_TENANT';
      const matchesStatus =
        homeStatusFilter === 'ALL' ||
        (homeStatusFilter === 'OCCUPIED' && isOccupied) ||
        (homeStatusFilter === 'VACANT' && !isOccupied);

      return matchesSearch && matchesStatus;
    });
  }, [societyHomes, homeSearchText, homeStatusFilter]);

  const handleAddTower = () => {
    setFlatTowers((prev) => {
      let next;
      const currentTotal = parseInt(editTotalHomes, 10) || 10;
      if (!prev || prev.length === 0) {
        next = [
          {
            id: Date.now() + 1,
            name: 'A',
            floor: '1',
            startNo: '1',
            endNo: String(currentTotal),
            count: currentTotal,
          },
        ];
      } else {
        const index = prev.length;
        const letter = String.fromCharCode(65 + index);
        next = [
          ...prev,
          {
            id: Date.now() + Math.random(),
            name: letter,
            floor: '1',
            startNo: '1',
            endNo: '5',
            count: 5,
          },
        ];
      }
      const sumUnits = next.reduce((acc, t) => acc + (parseInt(t.count, 10) || 1), 0);
      setEditTotalHomes(String(sumUnits));
      return next;
    });
  };

  const handleUpdateTower = (id, field, value) => {
    setFlatTowers((prev) => {
      const updatedList = (prev || []).map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [field]: value };
        if (field === 'startNo') {
          const s = parseInt(value, 10);
          const c = parseInt(t.count, 10) || 5;
          if (!isNaN(s)) {
            updated.endNo = String(s + c - 1);
          }
        } else if (field === 'endNo') {
          const e = parseInt(value, 10);
          const s = parseInt(t.startNo, 10) || 1;
          if (!isNaN(e) && e >= s) {
            updated.count = e - s + 1;
          }
        }
        return updated;
      });
      const sumUnits = updatedList.reduce((acc, t) => acc + (parseInt(t.count, 10) || 5), 0);
      setEditTotalHomes(String(sumUnits));
      return updatedList;
    });
  };

  const handleRemoveTower = (id) => {
    setFlatTowers((prev) => {
      const next = (prev || []).filter((t) => t.id !== id);
      const sumUnits = next.reduce((acc, t) => acc + (parseInt(t.count, 10) || 5), 0);
      setEditTotalHomes(String(sumUnits || 10));
      return next;
    });
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setRefreshing(true);
      const res = await societyApi.getSocieties();
      const list =
        res?.data?.societies ||
        (Array.isArray(res?.data) ? res.data : (res?.societies || []));

      if (list && list.length > 0) {
        const found = list.find((s) => s.id === user?.societyId) || list[0];
        setSocietyId(found.id || 1);
        setSocietyName(found.name || user?.societyName || '');
        setSocietyCode(found.code || found.society_code || '');
        if (found.address) setAddress(found.address);
        if (found.city) setCity(found.city);
        if (found.state) setStateName(found.state);
        if (found.pincode) setPincode(found.pincode);
        if (found.registration_number) setRegistrationNumber(found.registration_number);
        if (found.contact_email) setContactEmail(found.contact_email);
        if (found.contact_number) setPrimaryPhone(found.contact_number);
        if (found.emergency_number) setEmergencyPhone(found.emergency_number);
        if (found.society_type) setSocietyType(found.society_type);
        if (found.property_configuration) setPropertyConfig(found.property_configuration);
        if (found.total_homes) setTotalHomes(found.total_homes);
        const socMaxUnits = found.max_units || found.total_homes || 10;
        setMaxUnits(socMaxUnits);
        setExportUnitsCount(String(found.total_homes || found.max_units || 10));
        if (found.status) setSocietyStatus(found.status);

        // Sync modal form fields
        setEditName(found.name || user?.societyName || '');
        setEditCode(found.code || found.society_code || '');
        if (found.address) setEditAddress(found.address);
        if (found.city) setEditCity(found.city);
        if (found.state) setEditState(found.state);
        if (found.pincode) setEditPincode(found.pincode);
        setEditRegistrationNumber(found.registration_number || '');
        setEditContactEmail(found.contact_email || '');
        setEditSocietyType(found.society_type || 'FLAT');
        setEditPropertyConfig(found.property_configuration || '2BHK');
        setEditTotalHomes(String(found.total_homes || 10));
        setBungalowStartNo('1');
        setBungalowEndNo(String(found.total_homes || 10));
        if (found.contact_number) setEditPhone(found.contact_number);
        if (found.emergency_number) setEditEmergency(found.emergency_number);
        setEditStatus(found.status || 'ACTIVE');

        // Fetch homes to enrich counts like frontend SocietiesPage does
        try {
          let homes = [];
          try {
            const homesRes = await societyApi.getHomesBySociety(found.id);
            homes =
              homesRes?.data?.homes ||
              homesRes?.data?.data?.homes ||
              (Array.isArray(homesRes?.data) ? homesRes.data : (homesRes?.homes || []));
          } catch (_) { }

          if (!homes || homes.length === 0) {
            try {
              const allRes = await societyApi.getAllHomes();
              const allList =
                allRes?.data?.homes ||
                allRes?.data?.data?.homes ||
                (Array.isArray(allRes?.data) ? allRes.data : (allRes?.homes || []));
              if (Array.isArray(allList) && allList.length > 0) {
                const filtered = allList.filter(
                  (h) => !h.society_id || String(h.society_id) === String(found.id)
                );
                homes = filtered.length > 0 ? filtered : allList;
              }
            } catch (_) { }
          }

          setSocietyHomes(homes);
          const occupied = homes.filter(
            (h) =>
              h.occupancy_status === 'OCCUPIED_BY_OWNER' ||
              h.occupancy_status === 'OCCUPIED_BY_TENANT'
          ).length;
          const vacant = homes.filter((h) => h.occupancy_status === 'VACANT').length;

          const totalUnits = found.total_homes || found.actual_homes_count || homes.length || 0;
          const occupiedCount =
            found.occupied_homes_count !== undefined && found.occupied_homes_count !== null
              ? found.occupied_homes_count
              : occupied;
          const vacantCount =
            found.vacant_homes_count !== undefined && found.vacant_homes_count !== null
              ? found.vacant_homes_count
              : Math.max(0, totalUnits - occupiedCount);

          setActualHomesCount(homes.length);
          setOccupiedHomesCount(occupiedCount);
          setVacantHomesCount(vacantCount);
        } catch (e) {
          console.log('Homes count fallback in SettingsScreen:', e);
          const totalUnits = found.total_homes || found.actual_homes_count || 0;
          const occupied = found.occupied_homes_count ?? 0;
          const vacant =
            found.vacant_homes_count !== undefined && found.vacant_homes_count !== null
              ? found.vacant_homes_count
              : Math.max(0, totalUnits - occupied);
          setActualHomesCount(found.actual_homes_count || totalUnits);
          setOccupiedHomesCount(occupied);
          setVacantHomesCount(vacant);
        }
      } else {
        setSocietyId(null);
        setSocietyName('');
        setSocietyCode('');
        setAddress('');
        setPrimaryPhone('');
        setEmergencyPhone('');
        setSocietyType('FLAT');
        setTotalHomes(0);
        setActualHomesCount(0);
        setOccupiedHomesCount(0);
        setVacantHomesCount(0);
        setSocietyHomes([]);
      }
    } catch (err) {
      console.log('Error fetching society profile in SettingsScreen:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenEdit = () => {
    setIsCreatingSociety(false);
    setEditRegistrationNumber(registrationNumber || '');
    setEditContactEmail(contactEmail || '');
    setEditAddress(address || '');
    setEditTotalHomes(String(maxUnits || totalHomes || 10));
    setEditPhone(primaryPhone || '');
    setEditEmergency(emergencyPhone || '');
    setShowEditModal(true);
  };

  const handleOpenCreateSociety = () => {
    setIsCreatingSociety(true);
    setEditRegistrationNumber('');
    setEditContactEmail('');
    setEditAddress('');
    setEditTotalHomes('10');
    setEditPhone('');
    setEditEmergency('');
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editAddress.trim()) {
      Alert.alert('Required', 'Please enter a society address.');
      return;
    }
    const unitsVal = parseInt(editTotalHomes, 10) || 1;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload = {
        name: societyName,
        code: societyCode,
        registration_number: editRegistrationNumber.trim(),
        contact_email: editContactEmail.trim(),
        address: editAddress.trim(),
        society_type: societyType,
        max_units: unitsVal,
        total_homes: unitsVal,
        status: societyStatus || 'ACTIVE',
        contact_number: editPhone.trim(),
        emergency_number: editEmergency.trim(),
      };

      await societyApi.updateSociety(societyId, payload);
      Alert.alert('Success', 'Society updated successfully!');

      setRegistrationNumber(editRegistrationNumber.trim());
      setContactEmail(editContactEmail.trim());
      setAddress(editAddress.trim());
      setTotalHomes(unitsVal);
      setMaxUnits(unitsVal);
      setPrimaryPhone(editPhone.trim());
      setEmergencyPhone(editEmergency.trim());
      setSaveSuccess(true);
      setShowEditModal(false);
      fetchProfile();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Error updating society.');
    } finally {
      setSaving(false);
    }
  };

  // Manage Homes Handlers
  const handleOpenManageHomes = () => {
    setShowManageHomesModal(true);
    fetchSocietyHomes(societyId);
  };

  const fetchSocietyHomes = async (targetId) => {
    setLoadingHomes(true);
    try {
      const activeId = targetId || societyId || 1;
      let list = [];
      try {
        const res = await societyApi.getHomesBySociety(activeId);
        list =
          res?.data?.homes ||
          res?.data?.data?.homes ||
          (Array.isArray(res?.data) ? res.data : (res?.homes || []));
      } catch (errSoc) {
        console.log('getHomesBySociety error:', errSoc?.message);
      }

      // If empty or failed, fallback to getAllHomes
      if (!list || list.length === 0) {
        try {
          const allRes = await societyApi.getAllHomes();
          const allList =
            allRes?.data?.homes ||
            allRes?.data?.data?.homes ||
            (Array.isArray(allRes?.data) ? allRes.data : (allRes?.homes || []));
          if (Array.isArray(allList) && allList.length > 0) {
            const filtered = allList.filter(
              (h) => !h.society_id || String(h.society_id) === String(activeId)
            );
            list = filtered.length > 0 ? filtered : allList;
          }
        } catch (errAll) {
          console.log('getAllHomes fallback error:', errAll?.message);
        }
      }

      setSocietyHomes(list || []);
      setActualHomesCount((list || []).length);
    } catch (err) {
      console.log('Error fetching homes in Manage Homes:', err);
    } finally {
      setLoadingHomes(false);
    }
  };

  const handleDeleteHome = (homeId, homeNumber) => {
    Alert.alert(
      'Delete Home',
      `Delete home ${homeNumber || ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await societyApi.deleteHome(homeId);
              await fetchSocietyHomes(societyId);
              await fetchProfile();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete home.');
            }
          },
        },
      ]
    );
  };

  const handleAddSingleHome = async () => {
    if (!newHomeNumber.trim()) {
      Alert.alert('Required', 'Please enter a home number.');
      return;
    }
    setSubmittingHome(true);
    try {
      const addedNumber = newHomeNumber.trim();
      const activeId = societyId || 1;
      await societyApi.createHome(activeId, {
        home_number: addedNumber,
        building_or_wing: newBuildingOrWing.trim(),
        floor: newFloor.trim(),
        home_type: newHomeType,
        status: newStatus || 'ACTIVE',
      });
      setShowAddHomeModal(false);
      setNewHomeNumber('');
      setNewBuildingOrWing('');
      setNewFloor('');
      setNewHomeType('2BHK');
      setNewStatus('ACTIVE');
      await fetchSocietyHomes(activeId);
      await fetchProfile();
      Alert.alert('Success', `Home ${addedNumber} added!`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add home.');
    } finally {
      setSubmittingHome(false);
    }
  };

  const handleBatchGenerateHomes = async () => {
    const countNum = parseInt(batchCount, 10);
    if (isNaN(countNum) || countNum < 1) {
      Alert.alert('Invalid Count', 'Please enter a valid count of homes to create.');
      return;
    }
    setSubmittingBatch(true);
    try {
      const activeId = societyId || 1;
      const res = await societyApi.batchGenerateHomes(activeId, {
        count: countNum,
        startFrom: parseInt(batchStartFrom, 10) || 1,
        prefix: batchPrefix,
        building_or_wing: batchBuildingOrWing.trim(),
        home_type: batchHomeType,
      });
      setShowBatchHomesModal(false);
      setBatchCount('20');
      setBatchStartFrom('1');
      setBatchPrefix('Home ');
      setBatchBuildingOrWing('');
      setBatchHomeType('2BHK');
      await fetchSocietyHomes(activeId);
      await fetchProfile();
      Alert.alert('Success', res?.data?.message || 'Batch generation complete!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to batch generate homes.');
    } finally {
      setSubmittingBatch(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const isFlat = (societyType || 'FLAT').toUpperCase() === 'FLAT';
      const parsedCount = parseInt(exportUnitsCount, 10);
      const maxAllowed = parseInt(maxUnits || totalHomes || 100, 10);
      const count = isNaN(parsedCount) || parsedCount < 1 ? 1 : Math.min(parsedCount, maxAllowed);

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

      const rows = [headers.join(',')];
      const todayStr = new Date().toISOString().split('T')[0];
      const homeTypeVal = isFlat ? 'flat' : 'bunglow';

      for (let i = 1; i <= count; i++) {
        const unitNo = isFlat ? String(100 + i) : String(i);
        const samplePhone = `98765432${String(10 + i).slice(-2)}`;
        const sampleEmail = `resident${unitNo}@example.com`;
        const sampleName = i === 1 ? 'Ramesh Patel' : `Resident ${unitNo}`;

        if (isFlat) {
          rows.push([
            i,
            `"${unitNo}"`,
            `"${unitNo}"`,
            `"${homeTypeVal}"`,
            `"Tower A"`,
            1,
            `"2bhk"`,
            `"${sampleName}"`,
            `"Owner"`,
            `"${samplePhone}"`,
            `"${sampleEmail}"`,
            `"${todayStr}"`,
            `"Password@123"`,
            1,
          ].join(','));
        } else {
          rows.push([
            i,
            `"${unitNo}"`,
            `"${unitNo}"`,
            `"${homeTypeVal}"`,
            `"2bhk"`,
            `"${sampleName}"`,
            `"Owner"`,
            `"${samplePhone}"`,
            `"${sampleEmail}"`,
            `"${todayStr}"`,
            `"Password@123"`,
            1,
          ].join(','));
        }
      }

      const csvContent = rows.join('\n');
      await Share.share({
        title: `${societyName || 'Society'}_Residents_Template.csv`,
        message: csvContent,
      });
    } catch (err) {
      if (err.message && !err.message.includes('dismissed')) {
        Alert.alert('Export Notice', 'Excel template generated successfully.');
      }
    }
  };

  // const handleDeleteSociety = () => {
  //   Alert.alert(
  //     'Delete Society',
  //     `Are you sure you want to permanently delete "${societyName}"? All associated units and society data will be deleted.`,
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       {
  //         text: 'Delete Permanently',
  //         style: 'destructive',
  //         onPress: async () => {
  //           try {
  //             await societyApi.deleteSociety(societyId, true);
  //             Alert.alert('Society Deleted', 'The society has been permanently deleted from the database.');
  //             fetchProfile();
  //           } catch (err) {
  //             Alert.alert('Error', err.message || 'Failed to delete society.');
  //           }
  //         },
  //       },
  //     ]
  //   );
  // };

  // Get Admin Initials
  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayTotalUnits = totalHomes || actualHomesCount || 50;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ========================================================
          TOP WHITE HEADER
          ======================================================== */}
      <View style={[styles.whiteHeader, { paddingTop: Math.max(insets.top, 14) + 4 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={24} color={THEME.colors.darkBrown} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Society Management
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading society details...</Text>
          </View>
        ) : (
          <View style={styles.contentWrapper}>
            {/* ========================================================
                1. TOP PART: COMMUNITY HERO IMAGE (FULL WIDTH)
                ======================================================== */}
            <View style={styles.heroCard}>
              <Image
                source={require('../assets/images/community-hero.jpg')}
                style={styles.heroImage}
                resizeMode="cover"
              />

              {/* Gradient Dark Overlay */}
              <View style={styles.heroGradientOverlay} />
            </View>

            {/* Inner Content with padding */}
            <View style={styles.innerContent}>
              {/* Success Alert Banner */}
              {saveSuccess && (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={16} color="#15803D" style={{ marginRight: 6 }} />
                  <Text style={styles.successBannerText}>
                    Settings saved successfully! Society information updated.
                  </Text>
                </View>
              )}

              {!societyId ? (
                <View style={[styles.frontendGlassCard, { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 }]}>
                  <View style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: 'rgba(196, 154, 108, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                    <Building2 size={30} color={THEME.colors.clay} />
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: THEME.colors.textDark, marginBottom: 8, textAlign: 'center' }}>
                    No Society Registered
                  </Text>
                  <Text style={{ fontSize: 13, color: THEME.colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 16, maxWidth: 300 }}>
                    There is currently no active society registered in the database. Please create a society first to configure homes and details.
                  </Text>
                  {isAdmin && (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: THEME.colors.darkBrown,
                        paddingHorizontal: 18,
                        paddingVertical: 12,
                        borderRadius: 10,
                      }}
                      onPress={handleOpenCreateSociety}
                      activeOpacity={0.8}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                        Create Residential Society
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {/* ========================================================
                      2. SMALL HORIZONTAL KPI CARDS (SCROLLABLE ROW)
                      Frontend identical metrics: Total Unit, Occupied, Vacant, Type
                      ======================================================== */}
                  <View style={styles.kpiSection}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.kpiScrollContainer}
                    >
                      {/* KPI Card 1: Total Unit */}
                      <View style={styles.kpiCard}>
                        <View style={styles.kpiCardTopRow}>
                          <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(196, 154, 108, 0.16)' }]}>
                            <Building2 size={20} color={THEME.colors.clay} />
                          </View>
                        </View>
                        <Text style={styles.kpiLabel}>TOTAL</Text>
                        <Text style={styles.kpiValueDark}>{displayTotalUnits}</Text>
                      </View>

                      {/* KPI Card 2: Occupied Unit */}
                      <View style={styles.kpiCard}>
                        <View style={styles.kpiCardTopRow}>
                          <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(107, 142, 90, 0.16)' }]}>
                            <UserCheck size={20} color={THEME.colors.fernGreen} />
                          </View>
                        </View>
                        <Text style={styles.kpiLabel}>OCCUPIED</Text>
                        <Text style={styles.kpiValueGreen}>{occupiedHomesCount}</Text>
                      </View>

                      {/* KPI Card 3: Vacant Unit */}
                      <View style={styles.kpiCard}>
                        <View style={styles.kpiCardTopRow}>
                          <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(135, 206, 235, 0.22)' }]}>
                            <Key size={20} color={THEME.colors.skyBlueDark} />
                          </View>
                        </View>
                        <Text style={styles.kpiLabel}>VACANT</Text>
                        <Text style={styles.kpiValueDark}>{vacantHomesCount}</Text>
                      </View>

                      {/* KPI Card 4: Type */}
                      <View style={styles.kpiCard}>
                        <View style={styles.kpiCardTopRow}>
                          <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(214, 194, 161, 0.3)' }]}>
                            <Layers size={20} color={THEME.colors.darkBrown} />
                          </View>
                        </View>
                        <Text style={styles.kpiLabel}>TYPE & CONFIG</Text>
                        <Text
                          style={styles.kpiTypeValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                        >
                          {societyType === 'BUNGALOW' ? 'Bungalow' : 'Flat'} {propertyConfig ? `• ${propertyConfig}` : ''}
                        </Text>
                      </View>
                    </ScrollView>
                  </View>

                  {/* ========================================================
                    3. SOCIETY INFORMATION CARD
                    Identical to frontend SocietiesPage.jsx Right-side Info
                    ======================================================== */}
                  <View style={styles.frontendGlassCard}>
                    {/* Sub-label & Society Name */}
                    <View style={styles.socInfoHeader}>
                      <View style={styles.socInfoLabelRow}>
                        <Text style={styles.cardSectionLabel}>SOCIETY INFORMATION</Text>
                        <View style={styles.codePill}>
                          <Text style={styles.codePillText}>Code: {societyCode}</Text>
                        </View>
                      </View>
                      <Text style={styles.socInfoTitle}>{societyName}</Text>
                      {/* Accent Divider Bar */}
                      <View style={styles.accentDivider} />
                    </View>

                    {/* Basic Info Rows */}
                    <View style={styles.detailsGroup}>
                      {/* 1. Address Row */}
                      <View style={styles.detailItemTop}>
                        <View style={styles.detailIconBox}>
                          <MapPin size={16} color={THEME.colors.clay} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>SOCIETY ADDRESS</Text>
                          <Text style={styles.detailValMultiline}>
                            {address || 'Address not configured'}
                          </Text>
                        </View>
                      </View>

                      {/* 2. Society Structure Type */}
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                          <Layers size={16} color="#4f46e5" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>SOCIETY STRUCTURE TYPE</Text>
                          <Text style={[styles.detailVal, { fontWeight: '700' }]}>
                            {societyType === 'BUNGALOW' ? 'Bungalow' : 'Flat'}
                          </Text>
                        </View>
                      </View>

                      {/* 3. max Units */}
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                          <Building2 size={16} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>MAX UNITS</Text>
                          <Text style={[styles.detailVal, { fontWeight: '800' }]}>
                            {maxUnits || totalHomes || actualHomesCount || 10}
                          </Text>
                        </View>
                      </View>

                      {/* 4. Status */}
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIconBox, styles.detailIconBoxGreen]}>
                          <CheckCircle2 size={16} color={THEME.colors.fernGreenDark} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>STATUS</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <View style={[styles.statusBadgeDot, { backgroundColor: societyStatus === 'ACTIVE' ? '#22c55e' : '#f59e0b' }]} />
                            <Text style={[styles.detailVal, { fontWeight: '700', color: societyStatus === 'ACTIVE' ? '#15803d' : '#b45309' }]}>
                              {societyStatus || 'ACTIVE'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* 5. Contact Number Row */}
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIconBox, styles.detailIconBoxGreen]}>
                          <Phone size={16} color={THEME.colors.fernGreen} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>CONTACT NUMBER</Text>
                          <Text style={styles.detailVal}>
                            {primaryPhone || 'Not provided'}
                          </Text>
                        </View>
                      </View>

                      {/* 6. Emergency Helpline Row */}
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIconBox, styles.detailIconBoxRose]}>
                          <PhoneCall size={16} color={THEME.colors.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>EMERGENCY HELPLINE</Text>
                          <Text style={styles.emergencyVal}>
                            {emergencyPhone || 'Not provided'}
                          </Text>
                        </View>
                      </View>

                      {/* 7. Registration Number Row */}
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIconBox, { backgroundColor: 'rgba(124, 58, 237, 0.12)' }]}>
                          <ShieldCheck size={16} color="#7c3aed" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>REGISTRATION NUMBER</Text>
                          <Text style={styles.detailVal}>
                            {registrationNumber || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      {/* 8. Contact Email Row */}
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                          <Mail size={16} color="#0284c7" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>CONTACT EMAIL</Text>
                          <Text style={styles.detailVal}>
                            {contactEmail || 'Not provided'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Units Export & Actions Section (Exact replica of frontend SocietiesPage lines 1135-1240) */}
                    <View style={styles.exportAndActionsCard}>
                      {/* Left/Top: Our Society Total Units Input & Export Excel Button */}
                      <View style={styles.exportSection}>
                        <View style={styles.exportHeaderRow}>
                          <View style={styles.exportLabelRow}>
                            <Building2 size={15} color={THEME.colors.clay} />
                            <Text style={styles.exportLabelText}>Our Society Total Units:</Text>
                          </View>
                          <View style={styles.exportControlRow}>
                            <TextInput
                              style={styles.exportInput}
                              keyboardType="number-pad"
                              value={String(exportUnitsCount)}
                              onChangeText={(text) => {
                                const num = parseInt(text, 10);
                                const maxAllowed = parseInt(maxUnits || totalHomes || 100, 10);
                                if (!isNaN(num)) {
                                  setExportUnitsCount(String(Math.max(1, Math.min(num, maxAllowed))));
                                } else {
                                  setExportUnitsCount(text);
                                }
                              }}
                              onBlur={() => {
                                const num = parseInt(exportUnitsCount, 10);
                                const maxAllowed = parseInt(maxUnits || totalHomes || 100, 10);
                                if (isNaN(num) || num < 1) {
                                  setExportUnitsCount(String(Math.min(totalHomes || 1, maxAllowed)));
                                }
                              }}
                            />
                            <Text style={styles.exportMaxText}>
                              (Max: {maxUnits || totalHomes || 100})
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.btnExportExcel}
                          activeOpacity={0.8}
                          onPress={handleExportExcel}
                        >
                          <Download size={15} color="#15803D" />
                          <Text style={styles.btnExportExcelText}>Export Excel Sheet</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Right/Bottom: Admin Action Buttons */}
                      <View style={styles.socActionRow}>
                        <TouchableOpacity
                          style={styles.btnOutline}
                          activeOpacity={0.8}
                          onPress={handleOpenEdit}
                        >
                          <Edit2 size={14} color={THEME.colors.clayDark} />
                          <Text style={styles.btnOutlineText}>Edit Details</Text>
                        </TouchableOpacity>

                        {/* <TouchableOpacity
                          style={styles.btnDanger}
                          activeOpacity={0.8}
                          onPress={handleDeleteSociety}
                        >
                          <Trash2 size={16} color={THEME.colors.error} />
                        </TouchableOpacity> */}
                      </View>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================================
          EDIT SOCIETY DETAILS MODAL DIALOG (IDENTICAL TO FRONTEND)
          Fields:
          1. Society Name *
          2. Society Address *
          3. Society Type (FLAT / BUNGALOW)
          4. Total Homes
          5. Contact Number
          6. Emergency Number
          7. Status (ACTIVE / INACTIVE / SUSPENDED)
          Buttons: Cancel and Update Society
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
          <View style={styles.subModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <Building size={18} color={THEME.colors.clay} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {`Edit Society: ${societyName}`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Modal Form Scroll Body */}
            <ScrollView
              style={styles.modalScrollBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Registration Number & Contact Email */}
              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Registration Number</Text>
                  <TextInput
                    style={styles.input}
                    value={editRegistrationNumber}
                    onChangeText={setEditRegistrationNumber}
                    placeholder="e.g. REG-12345"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Contact Email</Text>
                  <TextInput
                    style={styles.input}
                    value={editContactEmail}
                    onChangeText={setEditContactEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="society@example.com"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>
              </View>

              {/* Society Address * */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Society Address *</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  multiline
                  numberOfLines={2}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Street / Campus address"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              {/* max Units * */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>max Units *</Text>
                <TextInput
                  style={styles.input}
                  value={editTotalHomes}
                  onChangeText={setEditTotalHomes}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              {/* Contact Number & Emergency Number */}
              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Contact Number</Text>
                  <TextInput
                    style={styles.input}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    placeholder="+91 22 4567 8900"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Emergency Number</Text>
                  <TextInput
                    style={styles.input}
                    value={editEmergency}
                    onChangeText={setEditEmergency}
                    keyboardType="phone-pad"
                    placeholder="108"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Bottom Action Row: Cancel and Update Society */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
                onPress={() => setShowEditModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalUpdateBtn}
                activeOpacity={0.8}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalUpdateBtnText}>
                    Update Society
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          MANAGE HOMES MODAL (IDENTICAL TO FRONTEND SOCIETIES PAGE)
          Header with Batch Generate & Add Single Home buttons
          ======================================================== */}
      <Modal
        visible={showManageHomesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManageHomesModal(false)}
      >
        <View style={styles.manageHomesBackdrop}>
          <View style={styles.manageHomesCard}>
            {/* Modal Header */}
            <View style={styles.manageHomesHeader}>
              <View style={styles.manageHomesHeaderTop}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.manageHomesTitle} numberOfLines={1}>
                    Homes in {societyName}
                  </Text>
                  <Text style={styles.manageHomesSubtitle}>
                    Total configured: {societyHomes.length} units ({societyType})
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setShowManageHomesModal(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Action Buttons Bar matching frontend header actions */}
              <View style={styles.manageHomesHeaderButtonsRow}>
                <TouchableOpacity
                  style={styles.btnBatchGenerate}
                  activeOpacity={0.8}
                  onPress={() => setShowBatchHomesModal(true)}
                >
                  <Text style={styles.btnBatchGenerateText}>
                    Batch Generate (e.g. Home 1..100)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnAddSingleHome}
                  activeOpacity={0.8}
                  onPress={() => setShowAddHomeModal(true)}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.btnAddSingleHomeText}>Add Single Home</Text>
                </TouchableOpacity>
              </View>

              {/* Search & Status Filter Controls */}
              <View style={{ marginTop: 10, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(214, 194, 161, 0.4)', paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Search size={14} color={THEME.colors.textDim} />
                  <TextInput
                    style={{ flex: 1, fontSize: 12, color: THEME.colors.textDark, paddingLeft: 6 }}
                    placeholder="Search home number..."
                    placeholderTextColor={THEME.colors.textDim}
                    value={homeSearchText}
                    onChangeText={setHomeSearchText}
                  />
                  {homeSearchText ? (
                    <TouchableOpacity onPress={() => setHomeSearchText('')}>
                      <X size={14} color={THEME.colors.textDim} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { label: `All (${societyHomes.length})`, val: 'ALL' },
                    { label: 'Occupied', val: 'OCCUPIED' },
                    { label: 'Vacant', val: 'VACANT' },
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.val}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: homeStatusFilter === f.val ? THEME.colors.clay : 'rgba(214, 194, 161, 0.2)',
                      }}
                      onPress={() => setHomeStatusFilter(f.val)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: homeStatusFilter === f.val ? '#FFFFFF' : THEME.colors.textMuted }}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Homes List */}
            <ScrollView
              style={styles.manageHomesScroll}
              contentContainerStyle={styles.manageHomesScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {loadingHomes ? (
                <View style={styles.manageHomesCenter}>
                  <ActivityIndicator size="small" color={THEME.colors.clay} />
                  <Text style={styles.manageHomesLoadingText}>Loading homes...</Text>
                </View>
              ) : filteredHomes.length === 0 ? (
                <View style={styles.manageHomesEmpty}>
                  <Home size={36} color={THEME.colors.textDim} style={{ opacity: 0.5, marginBottom: 10 }} />
                  <Text style={styles.manageHomesEmptyTitle}>No matching homes found.</Text>
                  <Text style={styles.manageHomesEmptySub}>
                    Use "Add Single Home" or "Batch Generate" above to create homes.
                  </Text>
                </View>
              ) : (
                <View style={styles.homesGrid}>
                  {filteredHomes.map((h, idx) => {
                    const isOccupied =
                      h.occupancy_status === 'OCCUPIED_BY_OWNER' ||
                      h.occupancy_status === 'OCCUPIED_BY_TENANT';
                    const homeNum =
                      h.home_number ||
                      h.flat_number ||
                      (h.id ? String(h.id) : `Unit ${idx + 1}`);
                    return (
                      <View key={String(h.id || h.home_number || idx)} style={styles.homeCardItem}>
                        <View>
                          <View style={styles.homeCardTop}>
                            <Text style={styles.homeCardNumber} numberOfLines={1}>
                              {homeNum}
                            </Text>
                            <View style={styles.homeTypePill}>
                              <Text style={styles.homeTypePillText}>{h.home_type || '2BHK'}</Text>
                            </View>
                          </View>

                          <Text style={styles.homeCardWing} numberOfLines={1}>
                            {h.building_or_wing ? h.building_or_wing : 'Main Wing'}
                            {h.floor !== undefined && h.floor !== null && h.floor !== ''
                              ? ` • Floor ${h.floor}`
                              : ''}
                          </Text>

                          <Text
                            style={[
                              styles.homeOccupancyStatus,
                              isOccupied ? styles.statusOccupied : styles.statusVacant,
                            ]}
                            numberOfLines={1}
                          >
                            {h.occupancy_status || 'VACANT'}
                          </Text>
                        </View>

                        <View style={styles.homeCardDeleteRow}>
                          <TouchableOpacity
                            style={styles.homeDeleteBtn}
                            onPress={() => handleDeleteHome(h.id, homeNum)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Trash2 size={13} color="#f43f5e" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.manageHomesFooter}>
              <TouchableOpacity
                style={styles.manageHomesCloseBtn}
                onPress={() => setShowManageHomesModal(false)}
              >
                <Text style={styles.manageHomesCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================
          SUB-MODAL: ADD SINGLE HOME
          ======================================================== */}
      <Modal
        visible={showAddHomeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAddHomeModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.subModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <Home size={18} color={THEME.colors.clay} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    Add Home to {societyName}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddHomeModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 6 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Home Number *</Text>
                <TextInput
                  style={styles.input}
                  value={newHomeNumber}
                  onChangeText={setNewHomeNumber}
                  placeholder="e.g. Home 1, Home 10, Flat 402, Villa 3"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Building / Wing</Text>
                  <TextInput
                    style={styles.input}
                    value={newBuildingOrWing}
                    onChangeText={setNewBuildingOrWing}
                    placeholder="e.g. Wing A, Tower 1"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Floor</Text>
                  <TextInput
                    style={styles.input}
                    value={newFloor}
                    onChangeText={setNewFloor}
                    placeholder="e.g. 1"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Home Type</Text>
                <View style={styles.homeTypeSelectorRow}>
                  {[
                    '1BHK',
                    '2BHK',
                    '3BHK',
                    '4BHK',
                    'BUNGALOW',
                    'VILLA',
                    'PENTHOUSE',
                    'STUDIO',
                  ].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.homeTypeChoiceBtn,
                        newHomeType === type && styles.homeTypeChoiceBtnActive,
                      ]}
                      onPress={() => setNewHomeType(type)}
                    >
                      <Text
                        style={[
                          styles.homeTypeChoiceText,
                          newHomeType === type && styles.homeTypeChoiceTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.homeTypeSelectorRow}>
                  {['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.homeTypeChoiceBtn,
                        newStatus === st && styles.homeTypeChoiceBtnActive,
                      ]}
                      onPress={() => setNewStatus(st)}
                    >
                      <Text
                        style={[
                          styles.homeTypeChoiceText,
                          newStatus === st && styles.homeTypeChoiceTextActive,
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
                onPress={() => setShowAddHomeModal(false)}
                disabled={submittingHome}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalUpdateBtn}
                onPress={handleAddSingleHome}
                disabled={submittingHome}
              >
                {submittingHome ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalUpdateBtnText}>Save Home</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          SUB-MODAL: BATCH GENERATE HOMES (HOME 1 .. HOME 100)
          ======================================================== */}
      <Modal
        visible={showBatchHomesModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBatchHomesModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.subModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconWrap}>
                  <Layers size={18} color={THEME.colors.clay} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    Batch Generate Homes
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowBatchHomesModal(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 6 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.batchInfoText}>
                Rapidly generate sequential homes (e.g. Home 1 to Home 100) in one click without duplicate numbers.
              </Text>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Number of Homes *</Text>
                  <TextInput
                    style={styles.input}
                    value={batchCount}
                    onChangeText={setBatchCount}
                    placeholder="20"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Start From *</Text>
                  <TextInput
                    style={styles.input}
                    value={batchStartFrom}
                    onChangeText={setBatchStartFrom}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>
              </View>

              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Prefix Label</Text>
                  <TextInput
                    style={styles.input}
                    value={batchPrefix}
                    onChangeText={setBatchPrefix}
                    placeholder="e.g. 'Home ' or 'Flat '"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Building / Wing</Text>
                  <TextInput
                    style={styles.input}
                    value={batchBuildingOrWing}
                    onChangeText={setBatchBuildingOrWing}
                    placeholder="e.g. Tower A"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Home Type</Text>
                <View style={styles.homeTypeSelectorRow}>
                  {['1BHK', '2BHK', '3BHK', '4BHK', 'BUNGALOW', 'VILLA'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.homeTypeChoiceBtn,
                        batchHomeType === type && styles.homeTypeChoiceBtnActive,
                      ]}
                      onPress={() => setBatchHomeType(type)}
                    >
                      <Text
                        style={[
                          styles.homeTypeChoiceText,
                          batchHomeType === type && styles.homeTypeChoiceTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowBatchHomesModal(false)}
                disabled={submittingBatch}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalUpdateBtn}
                onPress={handleBatchGenerateHomes}
                disabled={submittingBatch}
              >
                {submittingBatch ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalUpdateBtnText}>
                    Generate {batchCount || ''} Homes
                  </Text>
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

  /* Top White Header */
  whiteHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 8,
    paddingLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    letterSpacing: -0.2,
  },

  scrollContent: {
    paddingBottom: 40,
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  contentWrapper: {
    width: '100%',
  },
  innerContent: {
    padding: 16,
    gap: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.35)',
    borderRadius: 12,
    padding: 12,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    flex: 1,
  },

  /* ========================================================
     1. HERO CARD (FULL WIDTH)
     ======================================================== */
  heroCard: {
    width: '100%',
    height: 220,
    overflow: 'hidden',
    backgroundColor: '#2A221C',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(42, 34, 28, 0.25)',
  },
  heroTopBadgeRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 34, 28, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 16,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 5,
  },
  heroStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroBottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(42, 34, 28, 0.75)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  heroSocietyName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCodeBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.35)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.6)',
  },
  heroCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
  },
  heroCategoryText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },

  /* ========================================================
     2. SMALL HORIZONTAL KPI CARDS
     ======================================================== */
  kpiSection: {
    marginTop: 2,
  },
  kpiSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  kpiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kpiHeaderIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clay,
    letterSpacing: 0.8,
  },
  kpiSwipeHint: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textDim,
  },
  kpiScrollContainer: {
    gap: 10,
    paddingRight: 10,
  },
  kpiCard: {
    width: 100,
    backgroundColor: THEME.colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  kpiCardTopRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiPill: {
    backgroundColor: 'rgba(196, 154, 108, 0.14)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kpiPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.clayDark,
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: THEME.colors.textDim,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  kpiValueDark: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 2,
    lineHeight: 26,
    textAlign: 'center',
  },
  kpiValueGreen: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.fernGreen,
    marginTop: 2,
    lineHeight: 26,
    textAlign: 'center',
  },
  kpiTypeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 4,
    lineHeight: 18,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  kpiSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },

  /* ========================================================
     3. FRONTEND IDENTICAL SOCIETY INFORMATION CARD
     ======================================================== */
  frontendGlassCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  socInfoHeader: {
    marginBottom: 16,
  },
  socInfoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  socInfoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    textTransform: 'capitalize',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  accentDivider: {
    width: 42,
    height: 3.5,
    backgroundColor: THEME.colors.clay,
    borderRadius: 2,
  },
  detailSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  emergencyVal: {
    fontSize: 13,
    color: THEME.colors.error,
    fontWeight: '800',
  },
  statusBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  exportAndActionsCard: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.4)',
  },
  exportSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.5)',
    padding: 12,
    marginBottom: 12,
  },
  exportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  exportLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textDark,
  },
  exportControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textDark,
    textAlign: 'center',
    minWidth: 58,
  },
  exportMaxText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textDim,
  },
  btnExportExcel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(21, 128, 61, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.35)',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  btnExportExcelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  socActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 142, 90, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  btnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.fernGreenDark,
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  btnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.clayDark,
  },
  btnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  /* Card Header Row */
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.25)',
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clay,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  adminVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
  },
  adminVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },

  /* Square Avatar */
  squareAvatar: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    flexShrink: 0,
    ...THEME.shadows.card,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  squareAvatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 0.5,
  },

  /* Card Content Column */
  cardContentCol: {
    flex: 1,
    minWidth: 0,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    flexShrink: 1,
  },
  rolePill: {
    backgroundColor: 'rgba(196, 154, 108, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.clayDark,
    textTransform: 'uppercase',
  },
  codePill: {
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },

  /* Detail Rows Group */
  detailsGroup: {
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(196, 154, 108, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailIconBoxGreen: {
    backgroundColor: 'rgba(107, 142, 90, 0.14)',
  },
  detailIconBoxRose: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
  },
  detailIconBoxMini: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailLabelCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    minWidth: 46,
  },
  detailVal: {
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  detailValMultiline: {
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '500',
    lineHeight: 18,
  },
  detailValCompact: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    flex: 1,
    fontWeight: '500',
  },

  /* ========================================================
     5. FORM CARD
     ======================================================== */
  formCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  formIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  formSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textDim,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    height: 46,
    backgroundColor: THEME.colors.sandWell,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: THEME.colors.darkBrown,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    fontWeight: '600',
  },
  textarea: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },

  /* Edit Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.float,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.3)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.sandWell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    maxHeight: 380,
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  modalUpdateBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.card,
  },
  modalUpdateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  /* Manage Homes Modal Styles */
  manageHomesBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  manageHomesCard: {
    width: '100%',
    maxWidth: 480,
    height: '84%',
    maxHeight: '88%',
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.float,
    display: 'flex',
    flexDirection: 'column',
  },
  manageHomesHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.3)',
    backgroundColor: THEME.colors.white,
  },
  manageHomesHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  manageHomesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  manageHomesSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  manageHomesHeaderButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  btnBatchGenerate: {
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnBatchGenerateText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  btnAddSingleHome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnAddSingleHomeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  manageHomesScroll: {
    flex: 1,
  },
  manageHomesScrollContent: {
    padding: 14,
  },
  manageHomesCenter: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageHomesLoadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  manageHomesEmpty: {
    paddingVertical: 36,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  manageHomesEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 4,
  },
  manageHomesEmptySub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  homesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  homeCardItem: {
    width: '48%',
    backgroundColor: THEME.colors.sandWell,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    padding: 12,
    marginBottom: 10,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  homeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  homeCardNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    flex: 1,
  },
  homeTypePill: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  homeTypePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0891b2',
  },
  homeCardWing: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  homeOccupancyStatus: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusOccupied: {
    color: '#15803D',
  },
  statusVacant: {
    color: THEME.colors.textDim,
  },
  homeCardDeleteRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 6,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
  },
  homeDeleteBtn: {
    padding: 3,
  },
  manageHomesFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
    backgroundColor: THEME.colors.white,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  manageHomesCloseBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  manageHomesCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },

  /* Sub-Modal Common Styles */
  subModalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.float,
  },
  batchInfoText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 17,
    marginBottom: 14,
  },
  formRowTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  formColHalf: {
    flex: 1,
  },

  /* Home Type Selector Buttons */
  homeTypeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  homeTypeChoiceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  homeTypeChoiceBtnActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  homeTypeChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  homeTypeChoiceTextActive: {
    color: '#FFFFFF',
  },
});

export default SettingsScreen;
