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
} from 'lucide-react-native';

export const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
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
  const [totalHomes, setTotalHomes] = useState(0);
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
  const [editSocietyType, setEditSocietyType] = useState('FLAT');
  const [editPropertyConfig, setEditPropertyConfig] = useState('2BHK');
  const [editTotalHomes, setEditTotalHomes] = useState('10');
  const [bungalowStartNo, setBungalowStartNo] = useState('1');
  const [bungalowEndNo, setBungalowEndNo] = useState('10');
  const [flatTowers, setFlatTowers] = useState([]);
  const [editPhone, setEditPhone] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');

  // Manage Homes Modal State
  const [showManageHomesModal, setShowManageHomesModal] = useState(false);
  const [societyHomes, setSocietyHomes] = useState([]);
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
        if (found.contact_number) setPrimaryPhone(found.contact_number);
        if (found.emergency_number) setEmergencyPhone(found.emergency_number);
        if (found.society_type) setSocietyType(found.society_type);
        if (found.property_configuration) setPropertyConfig(found.property_configuration);
        if (found.total_homes) setTotalHomes(found.total_homes);
        if (found.status) setSocietyStatus(found.status);

        // Sync modal form fields
        setEditName(found.name || user?.societyName || '');
        setEditCode(found.code || found.society_code || '');
        if (found.address) setEditAddress(found.address);
        if (found.city) setEditCity(found.city);
        if (found.state) setEditState(found.state);
        if (found.pincode) setEditPincode(found.pincode);
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
    setEditName(societyName);
    setEditCode(societyCode);
    setEditAddress(address);
    setEditCity(city);
    setEditState(stateName);
    setEditPincode(pincode);
    setEditSocietyType(societyType || 'FLAT');
    setEditPropertyConfig(propertyConfig || '2BHK');
    setEditTotalHomes(totalHomes ? String(totalHomes) : '10');
    setBungalowStartNo('1');
    setBungalowEndNo(totalHomes ? String(totalHomes) : '10');
    setEditPhone(primaryPhone);
    setEditEmergency(emergencyPhone);
    setEditStatus(societyStatus || 'ACTIVE');

    if ((societyType || 'FLAT') === 'FLAT') {
      const towerMap = new Map();
      (societyHomes || []).forEach((h) => {
        const wing = h.building_or_wing ? String(h.building_or_wing).replace(/^Tower\s*/i, '').trim() : 'A';
        const fl = h.floor !== null && h.floor !== undefined ? String(h.floor) : '1';
        const key = `${wing}-${fl}`;
        const num = parseInt(String(h.home_number).replace(/^[A-Za-z]+[-_]/, ''), 10) || 1;
        if (!towerMap.has(key)) {
          towerMap.set(key, { name: wing, floor: fl, min: num, max: num });
        } else {
          const cur = towerMap.get(key);
          cur.min = Math.min(cur.min, num);
          cur.max = Math.max(cur.max, num);
        }
      });
      if (towerMap.size > 0) {
        const towers = Array.from(towerMap.values()).map((t, idx) => ({
          id: Date.now() + idx,
          name: t.name,
          floor: t.floor,
          startNo: String(t.min),
          endNo: String(t.max),
          count: t.max - t.min + 1,
        }));
        setFlatTowers(towers);
      } else {
        const curTot = totalHomes || 10;
        const half = Math.ceil(curTot / 2);
        setFlatTowers([
          { id: 1, name: 'A', floor: '1', startNo: '1', endNo: String(half), count: half },
          { id: 2, name: 'B', floor: '1', startNo: '1', endNo: String(curTot - half), count: curTot - half },
        ]);
      }
    }
    setShowEditModal(true);
  };

  const handleOpenCreateSociety = () => {
    setIsCreatingSociety(true);
    setEditName('');
    setEditCode('');
    setEditAddress('');
    setEditCity('');
    setEditState('');
    setEditPincode('');
    setEditSocietyType('FLAT');
    setEditPropertyConfig('2BHK');
    setEditTotalHomes('10');
    setBungalowStartNo('1');
    setBungalowEndNo('10');
    setFlatTowers([
      { id: 1, name: 'A', floor: '1', startNo: '1', endNo: '5', count: 5 },
      { id: 2, name: 'B', floor: '1', startNo: '1', endNo: '5', count: 5 },
    ]);
    setEditPhone('');
    setEditEmergency('');
    setEditStatus('ACTIVE');
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter a society name.');
      return;
    }
    if (!editAddress.trim()) {
      Alert.alert('Required', 'Please enter a society address.');
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload = {
        name: editName.trim(),
        society_code: editCode.trim().toUpperCase() || undefined,
        address: editAddress.trim(),
        city: editCity.trim() || undefined,
        state: editState.trim() || undefined,
        pincode: editPincode.trim() || undefined,
        society_type: editSocietyType,
        property_configuration: editPropertyConfig,
        total_homes: parseInt(editTotalHomes, 10) || totalHomes || 10,
        contact_number: editPhone.trim(),
        emergency_number: editEmergency.trim(),
        status: editStatus || 'ACTIVE',
      };

      if (isCreatingSociety) {
        const res = await societyApi.createSociety(payload);
        const newSoc = res?.data?.society || res?.society || res?.data;
        const newSocId = newSoc?.id || newSoc?.insertId;

        // Auto-generate initial homes if society created
        if (newSocId) {
          if (editSocietyType === 'BUNGALOW') {
            const s = parseInt(bungalowStartNo, 10) || 1;
            const e = parseInt(bungalowEndNo, 10) || (parseInt(editTotalHomes, 10) || 10);
            for (let i = s; i <= e; i++) {
              await societyApi.createHome(newSocId, {
                home_number: String(i),
                building_or_wing: null,
                floor: null,
                home_type: editPropertyConfig || '2BHK',
                occupancy_status: 'VACANT',
              });
            }
          } else if (editSocietyType === 'FLAT' && flatTowers.length > 0) {
            for (const t of flatTowers) {
              const s = parseInt(t.startNo, 10) || 1;
              const e = parseInt(t.endNo, 10) || (s + (parseInt(t.count, 10) || 5) - 1);
              for (let i = s; i <= e; i++) {
                await societyApi.createHome(newSocId, {
                  home_number: `${t.name}-${i}`,
                  building_or_wing: t.name,
                  floor: parseInt(t.floor, 10) || 1,
                  home_type: editPropertyConfig || '2BHK',
                  occupancy_status: 'VACANT',
                });
              }
            }
          }
        }
        Alert.alert('Success', 'Residential Society created successfully!');
      } else {
        await societyApi.updateSociety(societyId, payload);
        Alert.alert('Success', 'Society updated successfully!');
      }

      setSocietyName(editName.trim());
      if (editCode) setSocietyCode(editCode.trim().toUpperCase());
      setAddress(editAddress.trim());
      setCity(editCity.trim());
      setStateName(editState.trim());
      setPincode(editPincode.trim());
      setSocietyType(editSocietyType);
      setPropertyConfig(editPropertyConfig);
      setTotalHomes(parseInt(editTotalHomes, 10) || totalHomes || 10);
      setPrimaryPhone(editPhone.trim());
      setEmergencyPhone(editEmergency.trim());
      setSocietyStatus(editStatus || 'ACTIVE');
      setSaveSuccess(true);
      setShowEditModal(false);
      fetchProfile();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      Alert.alert('Error', err.message || 'Error saving society.');
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

  const handleDeleteSociety = () => {
    Alert.alert(
      'Delete Society',
      `Are you sure you want to permanently delete "${societyName}"? All associated units and society data will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await societyApi.deleteSociety(societyId, true);
              Alert.alert('Society Deleted', 'The society has been permanently deleted from the database.');
              fetchProfile();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete society.');
            }
          },
        },
      ]
    );
  };

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
                      {/* Address Row */}
                      <View style={styles.detailItemTop}>
                        <View style={styles.detailIconBox}>
                          <MapPin size={16} color={THEME.colors.clay} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>ADDRESS</Text>
                          <Text style={styles.detailValMultiline}>
                            {address || 'Address not configured'}
                          </Text>
                        </View>
                      </View>

                      {/* Contact Number Row */}
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

                      {/* Emergency Helpline Row */}
                      <View style={styles.detailItem}>
                        <View style={[styles.detailIconBox, styles.detailIconBoxRose]}>
                          <PhoneCall size={16} color={THEME.colors.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailSubLabel}>EMERGENCY HELPLINE</Text>
                          <Text style={styles.emergencyVal}>
                            {emergencyPhone || '112 / Not provided'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.socActionRow}>
                      <TouchableOpacity
                        style={styles.btnSecondary}
                        activeOpacity={0.8}
                        onPress={handleOpenManageHomes}
                      >
                        <Home size={15} color={THEME.colors.fernGreenDark} />
                        <Text style={styles.btnSecondaryText}>
                          Homes ({societyHomes.length || actualHomesCount || 0})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.btnOutline}
                        activeOpacity={0.8}
                        onPress={handleOpenEdit}
                      >
                        <Edit2 size={14} color={THEME.colors.clayDark} />
                        <Text style={styles.btnOutlineText}>Edit</Text>
                      </TouchableOpacity>

                      {isAdmin && (
                        <TouchableOpacity
                          style={[styles.btnOutline, { borderColor: THEME.colors.clay }]}
                          activeOpacity={0.8}
                          onPress={handleOpenCreateSociety}
                        >
                          <Plus size={14} color={THEME.colors.clay} />
                          <Text style={[styles.btnOutlineText, { color: THEME.colors.clay }]}>New</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.btnDanger}
                        activeOpacity={0.8}
                        onPress={handleDeleteSociety}
                      >
                        <Trash2 size={15} color={THEME.colors.error} />
                      </TouchableOpacity>
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
                    {isCreatingSociety ? 'Create New Residential Society' : `Edit Society: ${societyName}`}
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
              {/* Society Name * */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Society Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. Royal Palms Residency"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              {/* Society Code * */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Society Code * (Unique Key)</Text>
                <TextInput
                  style={styles.input}
                  value={editCode}
                  onChangeText={(v) => setEditCode(v.toUpperCase())}
                  autoCapitalize="characters"
                  placeholder="e.g. RVS01"
                  placeholderTextColor={THEME.colors.textDim}
                />
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

              {/* 3-Column Row: City, State, Pincode */}
              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={editCity}
                    onChangeText={setEditCity}
                    placeholder="e.g. Mumbai"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={editState}
                    onChangeText={setEditState}
                    placeholder="e.g. Maharashtra"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pincode</Text>
                <TextInput
                  style={styles.input}
                  value={editPincode}
                  onChangeText={setEditPincode}
                  keyboardType="numeric"
                  placeholder="e.g. 400001"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              {/* 2-Column Row: Society Type & Total Units */}
              <View style={styles.formRowTwoCol}>
                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Society Type *</Text>
                  <View style={styles.homeTypeSelectorRow}>
                    {['FLAT', 'BUNGALOW'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.homeTypeChoiceBtn,
                          editSocietyType === st && styles.homeTypeChoiceBtnActive,
                        ]}
                        onPress={() => setEditSocietyType(st)}
                      >
                        <Text
                          style={[
                            styles.homeTypeChoiceText,
                            editSocietyType === st && styles.homeTypeChoiceTextActive,
                          ]}
                        >
                          {st === 'BUNGALOW' ? 'Bungalow' : 'Flat'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.formColHalf]}>
                  <Text style={styles.inputLabel}>Total Units *</Text>
                  <TextInput
                    style={styles.input}
                    value={editTotalHomes}
                    onChangeText={(val) => {
                      setEditTotalHomes(val);
                      if (editSocietyType === 'BUNGALOW') {
                        setBungalowEndNo(val || '10');
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>
              </View>

              {/* SECTION: BUNGALOW ALLOCATION */}
              {editSocietyType === 'BUNGALOW' && (
                <View style={{ backgroundColor: 'rgba(196, 154, 108, 0.08)', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(196, 154, 108, 0.2)' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: THEME.colors.clay, marginBottom: 8, textTransform: 'uppercase' }}>
                    Bungalow Home Units Allocation
                  </Text>
                  <View style={styles.formRowTwoCol}>
                    <View style={[styles.inputGroup, styles.formColHalf]}>
                      <Text style={styles.inputLabel}>Start Home No</Text>
                      <TextInput
                        style={styles.input}
                        value={bungalowStartNo}
                        onChangeText={setBungalowStartNo}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor={THEME.colors.textDim}
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.formColHalf]}>
                      <Text style={styles.inputLabel}>End Home No</Text>
                      <TextInput
                        style={styles.input}
                        value={bungalowEndNo}
                        onChangeText={setBungalowEndNo}
                        keyboardType="numeric"
                        placeholder="10"
                        placeholderTextColor={THEME.colors.textDim}
                      />
                    </View>
                  </View>

                  {/* Home Units Preview (Bungalow) */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.textDark, marginBottom: 6 }}>
                      Home Units Preview ({bungalowUnits.length} homes):
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {bungalowUnits.map((num) => (
                        <View
                          key={num}
                          style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 58,
                            paddingVertical: 6,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: 'rgba(196, 154, 108, 0.3)',
                          }}
                        >
                          <Home size={14} color={THEME.colors.clay} style={{ marginBottom: 2 }} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.colors.darkBrown }}>
                            Home {num}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* SECTION: FLAT TOWER & FLOOR ALLOCATION */}
              {editSocietyType === 'FLAT' && (
                <View style={{ backgroundColor: 'rgba(217, 119, 6, 0.06)', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(217, 119, 6, 0.2)' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#b45309', textTransform: 'uppercase' }}>
                      Flat Tower & Floor Allocation
                    </Text>
                    <TouchableOpacity
                      onPress={handleAddTower}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: '#d97706',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                      }}
                      activeOpacity={0.8}
                    >
                      <Plus size={12} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>Add Tower & Floor</Text>
                    </TouchableOpacity>
                  </View>

                  {/* List of Towers */}
                  {flatTowers.map((tower, idx) => (
                    <View
                      key={tower.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(217, 119, 6, 0.2)',
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: THEME.colors.darkBrown }}>
                          Tower {tower.name} • Floor {tower.floor} ({tower.count} units)
                        </Text>
                        {flatTowers.length > 1 && (
                          <TouchableOpacity onPress={() => handleRemoveTower(tower.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Trash2 size={13} color="#e11d48" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={styles.formRowTwoCol}>
                        <View style={[styles.inputGroup, styles.formColHalf, { marginBottom: 6 }]}>
                          <Text style={[styles.inputLabel, { fontSize: 10 }]}>Tower Name</Text>
                          <TextInput
                            style={[styles.input, { height: 38, fontSize: 12 }]}
                            value={tower.name}
                            onChangeText={(v) => handleUpdateTower(tower.id, 'name', v.toUpperCase())}
                            placeholder="A"
                          />
                        </View>
                        <View style={[styles.inputGroup, styles.formColHalf, { marginBottom: 6 }]}>
                          <Text style={[styles.inputLabel, { fontSize: 10 }]}>Floor</Text>
                          <TextInput
                            style={[styles.input, { height: 38, fontSize: 12 }]}
                            value={String(tower.floor)}
                            onChangeText={(v) => handleUpdateTower(tower.id, 'floor', v)}
                            keyboardType="numeric"
                            placeholder="1"
                          />
                        </View>
                      </View>

                      <View style={styles.formRowTwoCol}>
                        <View style={[styles.inputGroup, styles.formColHalf, { marginBottom: 0 }]}>
                          <Text style={[styles.inputLabel, { fontSize: 10 }]}>Start Home No</Text>
                          <TextInput
                            style={[styles.input, { height: 38, fontSize: 12 }]}
                            value={String(tower.startNo)}
                            onChangeText={(v) => handleUpdateTower(tower.id, 'startNo', v)}
                            keyboardType="numeric"
                            placeholder="101"
                          />
                        </View>
                        <View style={[styles.inputGroup, styles.formColHalf, { marginBottom: 0 }]}>
                          <Text style={[styles.inputLabel, { fontSize: 10 }]}>End Home No</Text>
                          <TextInput
                            style={[styles.input, { height: 38, fontSize: 12 }]}
                            value={String(tower.endNo)}
                            onChangeText={(v) => handleUpdateTower(tower.id, 'endNo', v)}
                            keyboardType="numeric"
                            placeholder="105"
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={handleAddTower}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: '#d97706',
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      marginTop: 4,
                    }}
                    activeOpacity={0.7}
                  >
                    <Plus size={13} color="#d97706" />
                    <Text style={{ color: '#d97706', fontSize: 11, fontWeight: '700' }}>
                      + Add Another Tower & Floor
                    </Text>
                  </TouchableOpacity>

                  {/* Flat Units Preview */}
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.textDark, marginBottom: 6 }}>
                      Flat Units Preview ({flatUnits.length} units):
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {flatUnits.map((u) => (
                        <View
                          key={u.id}
                          style={{
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 66,
                            paddingVertical: 6,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: 'rgba(217, 119, 6, 0.25)',
                          }}
                        >
                          <Building2 size={13} color="#d97706" style={{ marginBottom: 2 }} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: THEME.colors.darkBrown }}>
                            Home {u.number}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Property Configuration */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Property Configuration</Text>
                <View style={styles.homeTypeSelectorRow}>
                  {['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE'].map((cfg) => (
                    <TouchableOpacity
                      key={cfg}
                      style={[
                        styles.homeTypeChoiceBtn,
                        editPropertyConfig === cfg && styles.homeTypeChoiceBtnActive,
                      ]}
                      onPress={() => setEditPropertyConfig(cfg)}
                    >
                      <Text
                        style={[
                          styles.homeTypeChoiceText,
                          editPropertyConfig === cfg && styles.homeTypeChoiceTextActive,
                        ]}
                      >
                        {cfg === 'PENTHOUSE' ? 'Penthouse' : cfg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 2-Column Row: Contact Number & Emergency Number */}
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
                    placeholder="112"
                    placeholderTextColor={THEME.colors.textDim}
                  />
                </View>
              </View>

              {/* Status */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status</Text>
                <View style={styles.homeTypeSelectorRow}>
                  {['ACTIVE', 'INACTIVE', 'SUSPENDED'].map((stat) => (
                    <TouchableOpacity
                      key={stat}
                      style={[
                        styles.homeTypeChoiceBtn,
                        editStatus === stat && styles.homeTypeChoiceBtnActive,
                      ]}
                      onPress={() => setEditStatus(stat)}
                    >
                      <Text
                        style={[
                          styles.homeTypeChoiceText,
                          editStatus === stat && styles.homeTypeChoiceTextActive,
                        ]}
                      >
                        {stat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Bottom Action Row: Cancel and Update/Create Society Buttons */}
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
                    {isCreatingSociety ? 'Create Society' : 'Save Changes'}
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
              ) : societyHomes.length === 0 ? (
                <View style={styles.manageHomesEmpty}>
                  <Home size={36} color={THEME.colors.textDim} style={{ opacity: 0.5, marginBottom: 10 }} />
                  <Text style={styles.manageHomesEmptyTitle}>No homes created yet in this society.</Text>
                  <Text style={styles.manageHomesEmptySub}>
                    Use "Add Single Home" or "Batch Generate" above to create homes.
                  </Text>
                </View>
              ) : (
                <View style={styles.homesGrid}>
                  {societyHomes.map((h, idx) => {
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
  socActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.35)',
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
