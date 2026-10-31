import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/authStore';
import { societyApi, familyMemberApi, authApi, gateApi } from '../services/apiServices';
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Lock,
  LogOut,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Shield,
  Building,
  Home,
  KeyRound,
  Layers,
  DoorOpen,
  BadgeCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronRight,
  Hash,
  FileText,
  PhoneCall,
} from 'lucide-react-native';

export const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, changePassword, isLoading } = useAuthStore();

  const [societyData, setSocietyData] = useState(null);
  const [residentHomeData, setResidentHomeData] = useState(null);
  const [assignedGateInfo, setAssignedGateInfo] = useState(null);
  const [loadingSociety, setLoadingSociety] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSecurity = user?.role === 'SECURITY';
  const isResident = !isAdmin && !isSecurity;

  // Role visual aesthetics matching frontend ProfilePage.jsx
  const getRoleTheme = (role) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'System Administrator',
          badgeText: 'ADMIN',
          bg: 'rgba(124, 58, 237, 0.12)',
          color: '#7c3aed',
          border: 'rgba(124, 58, 237, 0.3)',
          avatarBg: '#7c3aed',
        };
      case 'SECURITY':
        return {
          label: 'SECURITY',
          badgeText: 'SECURITY',
          bg: 'rgba(5, 150, 105, 0.12)',
          color: '#059669',
          border: 'rgba(5, 150, 105, 0.3)',
          avatarBg: '#059669',
        };
      case 'OWNER':
        return {
          label: 'Society Homeowner',
          badgeText: 'OWNER',
          bg: 'rgba(196, 154, 108, 0.15)',
          color: '#8c6035',
          border: 'rgba(196, 154, 108, 0.35)',
          avatarBg: THEME.colors.clay,
        };
      case 'TENANT':
        return {
          label: 'Resident Tenant',
          badgeText: 'TENANT',
          bg: 'rgba(13, 148, 136, 0.12)',
          color: '#0d9488',
          border: 'rgba(13, 148, 136, 0.3)',
          avatarBg: '#0d9488',
        };
      case 'FAMILY_MEMBER':
        return {
          label: 'Family Member',
          badgeText: 'RESIDENT',
          bg: 'rgba(217, 119, 6, 0.12)',
          color: '#d97706',
          border: 'rgba(217, 119, 6, 0.3)',
          avatarBg: '#d97706',
        };
      default:
        return {
          label: role || 'Resident User',
          badgeText: role || 'RESIDENT',
          bg: 'rgba(196, 154, 108, 0.15)',
          color: '#8c6035',
          border: 'rgba(196, 154, 108, 0.35)',
          avatarBg: THEME.colors.clay,
        };
    }
  };

  const roleTheme = getRoleTheme(user?.role);

  useEffect(() => {
    fetchSocietyData();
    fetchUserData();
  }, [user?.id, user?.role]);

  const fetchSocietyData = async () => {
    try {
      setLoadingSociety(true);
      const res = await societyApi.getSocieties();
      const list =
        res?.data?.societies ||
        (Array.isArray(res?.data) ? res.data : res?.societies || []);
      if (list && list.length > 0) {
        const found = list.find((s) => s.id === user?.societyId) || list[0];
        setSocietyData(found);
      } else if (user?.society && (user?.society?.id || user?.society?.name)) {
        setSocietyData(user.society);
      } else {
        setSocietyData(null);
      }
    } catch (err) {
      console.log('Error fetching society data:', err);
      if (user?.society && (user?.society?.id || user?.society?.name)) {
        setSocietyData(user.society);
      } else {
        setSocietyData(null);
      }
    } finally {
      setLoadingSociety(false);
      setRefreshing(false);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoadingUserData(true);
      if (isSecurity) {
        // Fetch Security profile & assigned gate station
        const [profileRes, assignedRes] = await Promise.allSettled([
          authApi.getProfile(),
          gateApi.getMyAssignedGate(),
        ]);

        if (
          profileRes.status === 'fulfilled' &&
          profileRes.value?.success &&
          profileRes.value?.data?.user
        ) {
          const u = profileRes.value.data.user;
          useAuthStore.setState({ user: u });
          if (u.society) {
            setSocietyData(u.society);
          }
        }

        if (
          assignedRes.status === 'fulfilled' &&
          assignedRes.value?.data?.gate
        ) {
          setAssignedGateInfo(assignedRes.value.data.gate);
        }
      } else if (isResident) {
        // Resident Home Dashboard & Profile
        const [dashRes, profileRes] = await Promise.allSettled([
          familyMemberApi.getMyHomeDashboard(),
          authApi.getProfile(),
        ]);

        if (
          dashRes.status === 'fulfilled' &&
          dashRes.value?.success &&
          dashRes.value?.data
        ) {
          setResidentHomeData(dashRes.value.data);
          const home = dashRes.value.data.home;
          if (home) {
            setSocietyData((prev) => prev || {
              name: home.society_name,
              code: home.society_code,
              address: home.society_address,
              contact_number: home.society_contact,
              emergency_number: home.society_emergency,
            });
          }
        }

        if (
          profileRes.status === 'fulfilled' &&
          profileRes.value?.success &&
          profileRes.value?.data?.user
        ) {
          const u = profileRes.value.data.user;
          useAuthStore.setState({ user: u });
          if (u.society) {
            setSocietyData(u.society);
          }
        }
      } else if (isAdmin) {
        const profileRes = await authApi.getProfile().catch(() => null);
        if (profileRes?.data?.user) {
          useAuthStore.setState({ user: profileRes.data.user });
          if (profileRes.data.user.society) {
            setSocietyData(profileRes.data.user.society);
          }
        }
      }
    } catch (err) {
      console.log('Error fetching user profile data:', err);
    } finally {
      setLoadingUserData(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSocietyData();
    fetchUserData();
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Validation Error', 'Both current and new passwords are required.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirmation do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Validation Error', 'New password must be different from current password.');
      return;
    }

    setChangingPass(true);
    const res = await changePassword(currentPassword, newPassword);
    setChangingPass(false);

    if (res.success) {
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } else {
      Alert.alert('Failed', res.message || 'Failed to update password.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  };

  // Get Initials for Avatar
  const getInitials = (name) => {
    if (!name) return isSecurity ? 'SG' : isAdmin ? 'AD' : 'RS';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Resident Home details resolution for Owner / Family Member
  const home = residentHomeData?.home || {};
  const primaryResident = residentHomeData?.primaryResident || {};

  // Email ID
  const emailDisplay =
    user?.email ||
    primaryResident?.email ||
    (isSecurity
      ? 'security@myvms.com'
      : `${(user?.fullName || user?.full_name || 'user').replace(/\s+/g, '.').toLowerCase()}@myvms.society`);

  // Phone
  const phoneDisplay = user?.phone || primaryResident?.phone || 'Not available';

  // Unit No / Gate Post resolution
  const rawUnit = home?.home_number || user?.unitNumber || user?.flatNumber;
  const unitNoDisplay = isSecurity
    ? assignedGateInfo?.name
      ? `${assignedGateInfo.name} (Gate Post)`
      : 'General Admin / Gate Post'
    : isAdmin
      ? 'Society Office / Admin Post'
      : rawUnit
        ? String(rawUnit).startsWith('Home') || String(rawUnit).startsWith('Unit')
          ? rawUnit
          : `Unit ${rawUnit}`
        : 'General Admin / Gate Post';

  // Wing / Block / Checkpoint resolution
  const wingDisplay = isSecurity
    ? assignedGateInfo?.location || 'Main Gate Checkpoint'
    : isAdmin
      ? 'Management Block'
      : home?.building_or_wing || user?.wing || user?.blockOrTower || 'Tower A';

  // Floor
  const rawFloor =
    home?.floor !== undefined && home?.floor !== null
      ? home.floor
      : user?.floor !== undefined && user?.floor !== null
        ? user.floor
        : null;

  const getOrdinal = (n) => {
    const num = parseInt(n, 10);
    if (isNaN(num)) return '';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const floorDisplay = isSecurity
    ? 'Ground Checkpoint'
    : isAdmin
      ? 'Ground Floor'
      : rawFloor === 0 || rawFloor === '0'
        ? 'Ground Floor'
        : rawFloor !== null
          ? `${rawFloor}${getOrdinal(rawFloor)} Floor`
          : 'Ground';

  // Occupancy Status matching frontend ProfilePage.jsx line 1093:
  // profile.residentType || profile.relationship || (profile.role === 'ADMIN' ? 'Head Administrator' : profile.role === 'SECURITY' ? 'Duty Guard' : 'Primary Resident')
  const occupancyStatusDisplay =
    user?.residentType ||
    user?.relationship ||
    (isAdmin ? 'Head Administrator' : isSecurity ? 'Duty Guard' : 'Primary Resident');

  // Society info resolution
  const hasSociety = Boolean(
    societyData?.id ||
    societyData?.name ||
    home?.society_name ||
    user?.society?.name ||
    user?.societyName
  );

  const activeSociety = hasSociety
    ? {
      name:
        societyData?.name ||
        home?.society_name ||
        user?.society?.name ||
        user?.societyName ||
        '',
      code:
        societyData?.code ||
        societyData?.society_code ||
        home?.society_code ||
        user?.society?.code ||
        user?.societyCode ||
        '',
      address:
        societyData?.address ||
        societyData?.address_line1 ||
        home?.society_address ||
        user?.society?.address ||
        user?.societyAddress ||
        'Not configured',
      contact_number:
        societyData?.contact_number ||
        societyData?.contact_phone ||
        home?.society_contact ||
        user?.society?.contact_number ||
        user?.societyContactNumber ||
        'Not provided',
      emergency_number:
        societyData?.emergency_number ||
        home?.society_emergency ||
        user?.society?.emergency_number ||
        user?.societyEmergencyNumber ||
        'Not provided',
    }
    : null;

  // Active Society Object for Admin & Profile
  const activeSocietyObj =
    societyData ||
    (user?.society && (user?.society?.name || user?.society?.id) ? user.society : null) ||
    (user?.societyDetails && (user?.societyDetails?.name || user?.societyDetails?.id) ? user.societyDetails : null) ||
    (activeSociety?.name ? activeSociety : null) ||
    null;

  // Format full address matching frontend SettingsPage.jsx
  const formattedAddress = activeSocietyObj
    ? [
        activeSocietyObj.address || activeSocietyObj.address_line1,
        activeSocietyObj.address_line2,
        activeSocietyObj.city,
        activeSocietyObj.state,
        activeSocietyObj.pincode ? `PIN: ${activeSocietyObj.pincode}` : null,
        activeSocietyObj.country && activeSocietyObj.country !== 'India' ? activeSocietyObj.country : null,
      ]
        .filter(Boolean)
        .join(', ') || activeSocietyObj.address || 'Address not registered'
    : 'Address not registered';

  // Society structure type formatting matching frontend SettingsPage.jsx
  const structureType = activeSocietyObj
    ? activeSocietyObj.society_type
      ? String(activeSocietyObj.society_type).replace(/_/g, ' ')
      : activeSocietyObj.property_configuration || 'Residential Gated Complex'
    : 'Residential Gated Complex';

  // Total Units matching frontend SettingsPage.jsx
  const totalUnits = activeSocietyObj
    ? activeSocietyObj.total_homes ?? activeSocietyObj.max_units ?? activeSocietyObj.total_units ?? 0
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ========================================================== */}
      {/* BODY CONTENT SCROLLVIEW                                    */}
      {/* ========================================================== */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.clay}
            colors={[THEME.colors.clay]}
          />
        }
      >
        {/* ========================================================== */}
        {/* 1. TOP SOCIETY HERO COVER IMAGE BANNER                     */}
        {/* ========================================================== */}
        <View style={styles.heroCoverWrapper}>
          <Image
            source={require('../assets/images/community-hero.jpg')}
            style={styles.heroCoverImage}
            resizeMode="cover"
          />
          <View style={styles.heroGradientOverlay} />

          {/* Optional Floating Back Button if opened from stack */}
          {navigation?.canGoBack && navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.floatingBackBtn, { top: Math.max(insets.top, 16) }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* ========================================================== */}
        {/* 2. PROFILE SQUIRCLE AVATAR OVERLAPPING COVER IMAGE         */}
        {/* (Top half inside hero image, identical to frontend)       */}
        {/* ========================================================== */}
        <View style={styles.avatarOverlapContainer}>
          {/* Squircle Avatar with rounded border matching frontend */}
          <View
            style={[
              styles.squircleAvatar,
              { backgroundColor: roleTheme.avatarBg },
            ]}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarPhoto} />
            ) : (
              <View style={styles.avatarMonogramWrap}>
                <Text style={styles.avatarInitialsText}>
                  {getInitials(user?.fullName || user?.name || user?.full_name)}
                </Text>
              </View>
            )}
          </View>

          {/* Account Identifier Card below avatar (same as frontend) */}
          <View style={styles.accountIdentifierCard}>
            <Text style={styles.accountIdText}>
              Account ID: <Text style={styles.accountIdBold}>#USR-{user?.id || '01'}</Text>
            </Text>
            <View style={styles.verifiedRow}>
              <BadgeCheck size={14} color={isSecurity ? '#059669' : isAdmin ? '#7c3aed' : '#059669'} />
              <Text
                style={[
                  styles.verifiedText,
                  { color: isSecurity ? '#059669' : isAdmin ? '#7c3aed' : '#059669' },
                ]}
              >
                {isSecurity
                  ? 'Verified Officer'
                  : isAdmin
                    ? 'Verified Administrator'
                    : 'Verified Resident'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bodyContent}>
          {/* ======================================================== */}
          {/* USER HEADER: NAME, ROLE BADGE & CHANGE PASSWORD BUTTON   */}
          {/* ======================================================== */}
          <View style={styles.userHeaderCard}>
            <View style={styles.userHeaderTopRow}>
              <View style={styles.userHeaderInfo}>
                <View style={styles.nameAndBadgeRow}>
                  <Text style={styles.userFullName} numberOfLines={1}>
                    {user?.fullName || user?.name || user?.full_name || 'Main Gate Security'}
                  </Text>
                  <View
                    style={[
                      styles.roleBadgePill,
                      {
                        backgroundColor: roleTheme.bg,
                        borderColor: roleTheme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.roleBadgePillText, { color: roleTheme.color }]}>
                      {roleTheme.badgeText}
                    </Text>
                  </View>
                </View>

                {/* Subtitle / Role description matching frontend */}
                <Text style={styles.userSubtitle} numberOfLines={2}>
                  <Text style={{ color: THEME.colors.textMuted }}>{roleTheme.label}</Text>
                  <Text style={{ color: THEME.colors.sand }}> • </Text>
                  <Text style={{ color: THEME.colors.clay, fontWeight: '700' }}>
                    {activeSociety?.name || 'No Society Registered'}
                  </Text>
                  {isSecurity && assignedGateInfo && (
                    <>
                      <Text style={{ color: THEME.colors.sand }}> • </Text>
                      <Text style={{ color: '#059669', fontWeight: '700' }}>
                        Station: {assignedGateInfo.name}
                      </Text>
                    </>
                  )}
                  {isResident && user?.flatNumber && (
                    <>
                      <Text style={{ color: THEME.colors.sand }}> • </Text>
                      <Text style={{ color: '#059669', fontWeight: '700' }}>
                        Unit {user.flatNumber} ({user.blockOrTower || 'Tower A'})
                      </Text>
                    </>
                  )}
                </Text>
              </View>

              {/* Change Password Toggle Button */}
              <TouchableOpacity
                id="btn-change-password-toggle"
                style={styles.changePasswordToggleBtn}
                onPress={() => setShowPasswordForm(!showPasswordForm)}
                activeOpacity={0.85}
              >
                <KeyRound size={15} color="#D6C2A1" />
                <Text style={styles.changePasswordToggleText}>
                  {showPasswordForm ? 'Close' : 'Change Password'}
                </Text>
                {showPasswordForm ? (
                  <ChevronUp size={16} color="#FFFFFF" />
                ) : (
                  <ChevronDown size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Expandable Password Change Inputs (Matching frontend) */}
            {showPasswordForm && (
              <View style={styles.passwordExpandableBox}>
                <View style={styles.passwordBoxHeader}>
                  <View style={styles.passwordIconBubble}>
                    <Lock size={16} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passwordBoxTitle}>Update Account Password</Text>
                    <Text style={styles.passwordBoxSub}>
                      Enter current password and choose a secure new password.
                    </Text>
                  </View>
                </View>

                {/* Current Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CURRENT PASSWORD *</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      secureTextEntry={!showCurrentPass}
                      placeholder="Current password"
                      placeholderTextColor={THEME.colors.textDim}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPass(!showCurrentPass)}
                      style={styles.eyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showCurrentPass ? (
                        <EyeOff size={16} color={THEME.colors.textMuted} />
                      ) : (
                        <Eye size={16} color={THEME.colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>NEW PASSWORD * (MIN 6 CHARS)</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      secureTextEntry={!showNewPass}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor={THEME.colors.textDim}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPass(!showNewPass)}
                      style={styles.eyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showNewPass ? (
                        <EyeOff size={16} color={THEME.colors.textMuted} />
                      ) : (
                        <Eye size={16} color={THEME.colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD *</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      secureTextEntry={!showConfirmPass}
                      placeholder="Re-enter new password"
                      placeholderTextColor={THEME.colors.textDim}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPass(!showConfirmPass)}
                      style={styles.eyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {showConfirmPass ? (
                        <EyeOff size={16} color={THEME.colors.textMuted} />
                      ) : (
                        <Eye size={16} color={THEME.colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.passwordActionRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    style={styles.passwordCancelBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.passwordCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePasswordChange}
                    disabled={changingPass}
                    style={styles.passwordSaveBtn}
                    activeOpacity={0.85}
                  >
                    <Lock size={14} color="#FFFFFF" />
                    <Text style={styles.passwordSaveText}>
                      {changingPass ? 'Updating...' : 'Save New Password'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ======================================================== */}
          {/* SECTION 1: PERSONAL DETAILS (Matches Frontend Section 1) */}
          {/* ======================================================== */}
          <View style={styles.glassCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.headerIconBox}>
                  <User size={16} color={THEME.colors.clay} />
                </View>
                <Text style={styles.cardTitle}>Personal Information</Text>
              </View>
              <View
                style={[
                  styles.rolePill,
                  {
                    backgroundColor: roleTheme.bg,
                    borderColor: roleTheme.border,
                  },
                ]}
              >
                <Text style={[styles.rolePillText, { color: roleTheme.color }]}>
                  {roleTheme.badgeText}
                </Text>
              </View>
            </View>

            <View style={styles.infoFieldsList}>
              {/* Full Legal Name */}
              <View style={styles.infoFieldBox}>
                <Text style={styles.infoFieldLabel}>Full Legal Name</Text>
                <Text style={styles.infoFieldValMain}>
                  {user?.fullName || user?.name || user?.full_name || 'Main Gate Security'}
                </Text>
              </View>

              {/* Primary Phone */}
              <View style={styles.infoFieldBox}>
                <View style={styles.infoFieldHeaderRow}>
                  <Text style={styles.infoFieldLabel}>Primary Phone</Text>
                  <View style={styles.verifiedTagPill}>
                    <Text style={styles.verifiedTagText}>VERIFIED</Text>
                  </View>
                </View>
                <View style={styles.iconValRow}>
                  <Phone size={14} color={THEME.colors.clay} />
                  <Text style={styles.infoFieldValText}>{phoneDisplay}</Text>
                </View>
              </View>

              {/* Official Email */}
              <View style={styles.infoFieldBox}>
                <Text style={styles.infoFieldLabel}>Official Email</Text>
                <View style={styles.iconValRow}>
                  <Mail size={14} color="#0284c7" />
                  <Text style={styles.infoFieldValText} numberOfLines={1}>
                    {emailDisplay}
                  </Text>
                </View>
              </View>

              {/* System Role */}
              <View style={styles.infoFieldBox}>
                <Text style={styles.infoFieldLabel}>System Role</Text>
                <Text style={[styles.infoFieldValRole, { color: roleTheme.color }]}>
                  {roleTheme.label}
                </Text>
              </View>
            </View>
          </View>

          {/* ======================================================== */}
          {/* SECTION 2 (ADMIN): ALLOCATED SOCIETY INFORMATION         */}
          {/* ======================================================== */}
          {isAdmin && (
            <View style={styles.glassCard}>
              {/* Card Header matching frontend */}
              <View style={styles.adminSocietyHeaderRow}>
                <View style={styles.adminHeaderLeft}>
                  <View style={styles.adminHeaderIconBox}>
                    <Building2 size={20} color={THEME.colors.clay} />
                  </View>
                  <View style={styles.adminHeaderTitles}>
                    <Text style={styles.cardTitle}>Allocated Society Information</Text>
                    <Text style={styles.cardSubtitle}>
                      Official registration, structure type, units capacity, and communication details
                    </Text>
                  </View>
                </View>
                {activeSocietyObj ? (
                  <View style={styles.activeStatusBadge}>
                    <View style={styles.activeStatusDot} />
                    <Text style={styles.activeStatusText}>
                      {activeSocietyObj.status || 'ACTIVE'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {activeSocietyObj ? (
                <>
                  {/* Society Top Banner matching frontend */}
                  <View style={styles.adminSocietyBanner}>
                    <View style={styles.adminBannerLeft}>
                      <View style={styles.adminBannerIconBox}>
                        <Building size={24} color={THEME.colors.clay} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.adminBannerSocietyName} numberOfLines={1}>
                          {activeSocietyObj.name}
                        </Text>
                        <View style={styles.adminBannerBadgesRow}>
                          {activeSocietyObj.code ? (
                            <View style={styles.adminBannerCodePill}>
                              <Text style={styles.adminBannerCodePillText}>
                                Code: {activeSocietyObj.code}
                              </Text>
                            </View>
                          ) : null}
                          {structureType ? (
                            <View style={styles.adminBannerTypePill}>
                              <Text style={styles.adminBannerTypePillText}>
                                {structureType}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={styles.adminBannerUnitsBox}>
                      <Text style={styles.adminBannerUnitsLabel}>TOTAL UNITS CAPACITY</Text>
                      <Text style={styles.adminBannerUnitsValue}>{totalUnits} Units</Text>
                    </View>
                  </View>

                  {/* 9 Information Tiles Grid matching frontend SettingsPage.jsx */}
                  <View style={styles.adminTilesList}>
                    {/* 1. Society Name */}
                    <View style={styles.adminTile}>
                      <View style={styles.adminTileIconBox}>
                        <Building2 size={18} color={THEME.colors.clay} />
                      </View>
                      <View style={styles.adminTileContent}>
                        <Text style={styles.adminTileLabel}>SOCIETY NAME</Text>
                        <Text style={styles.adminTileValue}>{activeSocietyObj.name || 'N/A'}</Text>
                      </View>
                    </View>

                    {/* 2. Society Code */}
                    <View style={styles.adminTile}>
                      <View style={styles.adminTileIconBox}>
                        <Hash size={18} color={THEME.colors.clay} />
                      </View>
                      <View style={styles.adminTileContent}>
                        <Text style={styles.adminTileLabel}>SOCIETY CODE</Text>
                        <View style={styles.adminCodeBadge}>
                          <Text style={styles.adminCodeBadgeText}>{activeSocietyObj.code || 'N/A'}</Text>
                        </View>
                      </View>
                    </View>

                    {/* 3. Registration Number */}
                    <View style={styles.adminTile}>
                      <View style={styles.adminTileIconBox}>
                        <FileText size={18} color={THEME.colors.clay} />
                      </View>
                      <View style={styles.adminTileContent}>
                        <Text style={styles.adminTileLabel}>REGISTRATION NUMBER</Text>
                        <Text style={styles.adminTileValue}>
                          {activeSocietyObj.registration_number || 'REG-PENDING'}
                        </Text>
                      </View>
                    </View>

                    {/* 4. Society Structure Type */}
                    <View style={styles.adminTile}>
                      <View style={styles.adminTileIconBox}>
                        <Layers size={18} color={THEME.colors.clay} />
                      </View>
                      <View style={styles.adminTileContent}>
                        <Text style={styles.adminTileLabel}>SOCIETY STRUCTURE TYPE</Text>
                        <Text style={[styles.adminTileValue, { textTransform: 'capitalize' }]}>
                          {structureType}
                        </Text>
                      </View>
                    </View>

                    {/* 5. Our Society Total Units */}
                    <View style={styles.adminTile}>
                      <View style={styles.adminTileIconBox}>
                        <Home size={18} color={THEME.colors.clay} />
                      </View>
                      <View style={styles.adminTileContent}>
                        <Text style={styles.adminTileLabel}>OUR SOCIETY TOTAL UNITS</Text>
                        <Text style={styles.adminTileValue}>
                          {totalUnits} Units
                          {activeSocietyObj.actual_homes_count != null ? (
                            <Text style={styles.adminActualHomesText}>
                              {' '}({activeSocietyObj.actual_homes_count} Homes Configured)
                            </Text>
                          ) : null}
                        </Text>
                      </View>
                    </View>

                    {/* 6. Email */}
                    <View style={styles.adminTile}>
                      <View style={styles.adminTileIconBox}>
                        <Mail size={18} color={THEME.colors.clay} />
                      </View>
                      <View style={styles.adminTileContent}>
                        <Text style={styles.adminTileLabel}>EMAIL</Text>
                        <Text style={[styles.adminTileValue, { color: THEME.colors.clay }]}>
                          {activeSocietyObj.contact_email || 'Not Provided'}
                        </Text>
                      </View>
                    </View>

                    {/* 7. Phone Number */}
                    <View style={styles.adminTile}>
                      <View style={styles.adminTileIconBox}>
                        <Phone size={18} color={THEME.colors.clay} />
                      </View>
                      <View style={styles.adminTileContent}>
                        <Text style={styles.adminTileLabel}>PHONE NUMBER</Text>
                        <Text style={[styles.adminTileValue, { color: THEME.colors.clay }]}>
                          {activeSocietyObj.contact_number || activeSocietyObj.contact_phone || 'Not Provided'}
                        </Text>
                      </View>
                    </View>

                    {/* 8. Emergency Number */}
                    <View style={[styles.adminTile, styles.adminTileEmergency]}>
                      <View style={[styles.adminTileIconBox, styles.adminTileIconBoxEmergency]}>
                        <PhoneCall size={18} color="#DC2626" />
                      </View>
                      <View style={styles.adminTileContent}>
                        <Text style={[styles.adminTileLabel, { color: '#DC2626' }]}>
                          EMERGENCY NUMBER
                        </Text>
                        <Text style={[styles.adminTileValue, { color: '#DC2626', fontWeight: '800' }]}>
                          {activeSocietyObj.emergency_number || 'Not Provided'}
                        </Text>
                      </View>
                    </View>

                    {/* 9. Society Address (Full Span) */}
                    <View style={styles.adminTile}>
                      <View style={styles.adminTileIconBox}>
                        <MapPin size={18} color={THEME.colors.clay} />
                      </View>
                      <View style={styles.adminTileContent}>
                        <Text style={styles.adminTileLabel}>SOCIETY ADDRESS</Text>
                        <Text style={[styles.adminTileValue, { lineHeight: 20 }]}>
                          {formattedAddress}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.noSocietyWrap}>
                  <View style={styles.noSocietyIconWrap}>
                    <Building2 size={24} color={THEME.colors.clay} />
                  </View>
                  <Text style={styles.noSocietyTitle}>No Society Registered</Text>
                  <Text style={styles.noSocietySub}>
                    Currently no active society profile is linked to this account.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* SECTION 2 (SECURITY): ALLOCATED SOCIETY INFORMATION      */}
          {/* ======================================================== */}
          {isSecurity && (
            <View style={styles.glassCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.headerIconBox,
                      { backgroundColor: 'rgba(5, 150, 105, 0.15)' },
                    ]}
                  >
                    <Shield size={16} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Allocated Society Information</Text>
                    <Text style={styles.cardSubtitle}>
                      Allocated society details, assigned checkpoint station, and emergency contacts
                    </Text>
                  </View>
                </View>
                <View style={styles.activeStatusBadge}>
                  <View style={styles.activeStatusDot} />
                  <Text style={styles.activeStatusText}>ON DUTY</Text>
                </View>
              </View>

              {activeSociety ? (
                <>
                  {/* Top Society & Station Summary Banner */}
                  <View style={styles.securityDutyBanner}>
                    <View style={styles.securityDutyBannerHeader}>
                      <ShieldCheck size={16} color="#059669" />
                      <Text style={styles.securityDutyBannerTitle}>ASSIGNED PATROL & GATE POST</Text>
                    </View>
                    <Text style={styles.securityDutyBannerText}>
                      Officer assigned to <Text style={{ fontWeight: '800', color: THEME.colors.darkBrown }}>{unitNoDisplay}</Text> at <Text style={{ fontWeight: '800', color: THEME.colors.darkBrown }}>{activeSociety.name}</Text>.
                    </Text>
                  </View>

                  <View style={[styles.infoFieldsList, { marginTop: 12 }]}>
                    {/* Residential Complex */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Allocated Residential Complex</Text>
                      <View style={styles.complexRow}>
                        <Text style={styles.infoFieldValMain} numberOfLines={1}>
                          {activeSociety.name}
                        </Text>
                        {activeSociety.code ? (
                          <View style={styles.codePillSmall}>
                            <Text style={styles.codePillSmallText}>Code: {activeSociety.code}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Assigned Duty Station / Post */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Assigned Duty Station / Post</Text>
                      <View style={styles.iconValRow}>
                        <DoorOpen size={15} color="#059669" />
                        <Text
                          style={[
                            styles.infoFieldValText,
                            { color: '#059669', fontWeight: '800' },
                          ]}
                        >
                          {unitNoDisplay}
                        </Text>
                      </View>
                    </View>

                    {/* Checkpoint Zone & Duty Level */}
                    <View style={styles.twoColRow}>
                      <View style={[styles.infoFieldBox, { flex: 1 }]}>
                        <Text style={styles.infoFieldLabel}>Checkpoint Zone</Text>
                        <Text style={styles.infoFieldValSub} numberOfLines={1}>
                          {wingDisplay}
                        </Text>
                      </View>

                      <View style={[styles.infoFieldBox, { flex: 1 }]}>
                        <Text style={styles.infoFieldLabel}>Duty Level</Text>
                        <Text style={styles.infoFieldValSub} numberOfLines={1}>
                          {floorDisplay}
                        </Text>
                      </View>
                    </View>

                    {/* Guard Duty Role */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Guard Duty Role</Text>
                      <View style={styles.occupancyBadge}>
                        <View
                          style={[
                            styles.occupancyDot,
                            { backgroundColor: '#059669' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.occupancyBadgeText,
                            { color: '#059669' },
                          ]}
                        >
                          {occupancyStatusDisplay}
                        </Text>
                      </View>
                    </View>

                    {/* Society Address */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Allocated Society Address</Text>
                      <View style={[styles.iconValRow, { alignItems: 'flex-start' }]}>
                        <MapPin size={15} color={THEME.colors.clay} style={{ marginTop: 2 }} />
                        <Text style={[styles.infoFieldValText, { flex: 1, lineHeight: 18 }]}>
                          {formattedAddress}
                        </Text>
                      </View>
                    </View>

                    {/* Society Office Contact */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Society Office Phone</Text>
                      <View style={styles.iconValRow}>
                        <Phone size={14} color={THEME.colors.clay} />
                        <Text style={styles.infoFieldValText}>
                          {activeSociety.contact_number || 'Not provided'}
                        </Text>
                      </View>
                    </View>

                    {/* Emergency Helpline */}
                    <View style={[styles.infoFieldBox, styles.adminTileEmergency]}>
                      <Text style={[styles.infoFieldLabel, { color: '#DC2626' }]}>
                        EMERGENCY HELPLINE
                      </Text>
                      <View style={styles.iconValRow}>
                        <PhoneCall size={14} color="#DC2626" />
                        <Text style={[styles.infoFieldValText, { color: '#DC2626', fontWeight: '800' }]}>
                          {activeSociety.emergency_number || 'Not provided'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.noSocietyWrap}>
                  <View style={styles.noSocietyIconWrap}>
                    <Shield size={24} color="#059669" />
                  </View>
                  <Text style={styles.noSocietyTitle}>No Society Allocated</Text>
                  <Text style={styles.noSocietySub}>
                    Currently no active society profile is linked to this security account.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* SECTION 2 (OWNER & FAMILY MEMBER): SOCIETY INFORMATION   */}
          {/* ======================================================== */}
          {!isAdmin && !isSecurity && (
            <View style={styles.glassCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View
                    style={[
                      styles.headerIconBox,
                      { backgroundColor: 'rgba(196, 154, 108, 0.16)' },
                    ]}
                  >
                    <Home size={16} color={THEME.colors.clay} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Society Information</Text>
                    <Text style={styles.cardSubtitle}>
                      Residential complex details, flat allocation, and society contact helplines
                    </Text>
                  </View>
                </View>
                <View style={styles.activeStatusBadge}>
                  <View style={styles.activeStatusDot} />
                  <Text style={styles.activeStatusText}>ACTIVE</Text>
                </View>
              </View>

              {activeSociety ? (
                <>
                  {/* Top Society Summary Banner for Resident */}
                  <View style={styles.adminSocietyBanner}>
                    <View style={styles.adminBannerLeft}>
                      <View style={styles.adminBannerIconBox}>
                        <Building size={24} color={THEME.colors.clay} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.adminBannerSocietyName} numberOfLines={1}>
                          {activeSociety.name}
                        </Text>
                        <View style={styles.adminBannerBadgesRow}>
                          {activeSociety.code ? (
                            <View style={styles.adminBannerCodePill}>
                              <Text style={styles.adminBannerCodePillText}>
                                Code: {activeSociety.code}
                              </Text>
                            </View>
                          ) : null}
                          <View style={styles.adminBannerTypePill}>
                            <Text style={styles.adminBannerTypePillText}>
                              {unitNoDisplay}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.infoFieldsList, { marginTop: 12 }]}>
                    {/* Residential Complex */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Residential Complex</Text>
                      <View style={styles.complexRow}>
                        <Text style={styles.infoFieldValMain} numberOfLines={1}>
                          {activeSociety.name}
                        </Text>
                        {activeSociety.code ? (
                          <View style={styles.codePillSmall}>
                            <Text style={styles.codePillSmallText}>Code: {activeSociety.code}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Allocated Unit / Flat */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Allocated Unit / Flat</Text>
                      <View style={styles.iconValRow}>
                        <Home size={15} color="#059669" />
                        <Text
                          style={[
                            styles.infoFieldValText,
                            { color: '#059669', fontWeight: '800' },
                          ]}
                        >
                          {unitNoDisplay}
                        </Text>
                      </View>
                    </View>

                    {/* Block / Tower & Floor Level */}
                    <View style={styles.twoColRow}>
                      <View style={[styles.infoFieldBox, { flex: 1 }]}>
                        <Text style={styles.infoFieldLabel}>Block / Tower</Text>
                        <Text style={styles.infoFieldValSub} numberOfLines={1}>
                          {wingDisplay}
                        </Text>
                      </View>

                      <View style={[styles.infoFieldBox, { flex: 1 }]}>
                        <Text style={styles.infoFieldLabel}>Floor Level</Text>
                        <Text style={styles.infoFieldValSub} numberOfLines={1}>
                          {floorDisplay}
                        </Text>
                      </View>
                    </View>

                    {/* Occupancy Status */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Occupancy Status</Text>
                      <View style={styles.occupancyBadge}>
                        <View
                          style={[
                            styles.occupancyDot,
                            { backgroundColor: '#16a34a' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.occupancyBadgeText,
                            { color: THEME.colors.fernGreenDark },
                          ]}
                        >
                          {occupancyStatusDisplay}
                        </Text>
                      </View>
                    </View>

                    {/* Society Address */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Society Address</Text>
                      <View style={[styles.iconValRow, { alignItems: 'flex-start' }]}>
                        <MapPin size={15} color={THEME.colors.clay} style={{ marginTop: 2 }} />
                        <Text style={[styles.infoFieldValText, { flex: 1, lineHeight: 18 }]}>
                          {formattedAddress}
                        </Text>
                      </View>
                    </View>

                    {/* Society Office Contact */}
                    <View style={styles.infoFieldBox}>
                      <Text style={styles.infoFieldLabel}>Society Office Phone</Text>
                      <View style={styles.iconValRow}>
                        <Phone size={14} color={THEME.colors.clay} />
                        <Text style={styles.infoFieldValText}>
                          {activeSociety.contact_number || 'Not provided'}
                        </Text>
                      </View>
                    </View>

                    {/* Emergency Helpline */}
                    <View style={[styles.infoFieldBox, styles.adminTileEmergency]}>
                      <Text style={[styles.infoFieldLabel, { color: '#DC2626' }]}>
                        EMERGENCY HELPLINE
                      </Text>
                      <View style={styles.iconValRow}>
                        <PhoneCall size={14} color="#DC2626" />
                        <Text style={[styles.infoFieldValText, { color: '#DC2626', fontWeight: '800' }]}>
                          {activeSociety.emergency_number || 'Not provided'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.noSocietyWrap}>
                  <View style={styles.noSocietyIconWrap}>
                    <Building2 size={24} color={THEME.colors.clay} />
                  </View>
                  <Text style={styles.noSocietyTitle}>No Society Configured</Text>
                  <Text style={styles.noSocietySub}>
                    Currently no active society profile is linked to this resident account.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* SECTION 4: SIGN OUT BUTTON                               */}
          {/* ======================================================== */}
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            activeOpacity={0.85}
          >
            <LogOut size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: 150,
  },

  /* 1. Hero Cover Image Banner */
  heroCoverWrapper: {
    width: '100%',
    height: 190,
    position: 'relative',
    backgroundColor: '#342C26',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroCoverImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52, 44, 38, 0.35)',
  },
  floatingBackBtn: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  coverSocietyPill: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    maxWidth: 220,
  },
  coverSocietyPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* 2. Squircle Avatar Overlapping Cover Image (Matching Frontend) */
  avatarOverlapContainer: {
    alignItems: 'center',
    marginTop: -52, // Half inside image, half in body
    zIndex: 20,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  squircleAvatar: {
    width: 104,
    height: 104,
    borderRadius: 26, // Squircle shape like frontend
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#403630',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 9,
    overflow: 'hidden',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarMonogramWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  avatarRoleText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  /* Account Identifier Card below avatar (Frontend Style) */
  accountIdentifierCard: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    ...THEME.shadows.card,
  },
  accountIdText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  accountIdBold: {
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* Body Content */
  bodyContent: {
    paddingHorizontal: 16,
    gap: 16,
    marginTop: 10,
  },

  /* User Header Card */
  userHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  userHeaderTopRow: {
    gap: 12,
  },
  userHeaderInfo: {
    gap: 4,
  },
  nameAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  userFullName: {
    fontSize: 19,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    letterSpacing: -0.3,
  },
  roleBadgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleBadgePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  userSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  changePasswordToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.darkBrown,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginTop: 6,
    ...THEME.shadows.button,
  },
  changePasswordToggleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Expandable Password Box */
  passwordExpandableBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.35)',
  },
  passwordBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  passwordIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordBoxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  passwordBoxSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  passwordInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 4,
  },
  passwordActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  passwordCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    backgroundColor: '#FFFFFF',
  },
  passwordCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  passwordSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: THEME.colors.clay,
  },
  passwordSaveText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Glass Card */
  glassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.25)',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(196, 154, 108, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  /* Fields List */
  infoFieldsList: {
    gap: 9,
  },
  infoFieldBox: {
    backgroundColor: '#FAF6EE',
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFE9E1',
  },
  infoFieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoFieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoFieldValMain: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  infoFieldValSub: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    marginTop: 1,
  },
  infoFieldValText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  infoFieldValRole: {
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 1,
  },
  iconValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  complexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 1,
  },
  codePillSmall: {
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  codePillSmallText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803D',
  },
  verifiedTagPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 9,
  },
  occupancyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(107, 142, 90, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.3)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  occupancyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  occupancyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  securityDutyBanner: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    gap: 3,
  },
  securityDutyBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityDutyBannerTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  securityDutyBannerText: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    lineHeight: 16,
  },

  /* Society Card Main Row */
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  squareSocietyBadge: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    flexShrink: 0,
    shadowColor: '#403630',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
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
  societyNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    flexShrink: 1,
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
  detailsGroup: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(196, 154, 108, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailIconBoxGreen: {
    backgroundColor: 'rgba(107, 142, 90, 0.16)',
  },
  detailLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    minWidth: 60,
  },
  detailVal: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    flex: 1,
    fontWeight: '500',
  },
  detailValMultiline: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    flex: 1,
    fontWeight: '500',
    lineHeight: 16,
  },

  /* Admin Active Society Information Styles */
  adminSocietyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  adminHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  adminHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminHeaderTitles: {
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  activeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  activeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#15803D',
  },
  activeStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  adminSocietyBanner: {
    backgroundColor: '#F6EFE6',
    borderWidth: 1,
    borderColor: '#E8DED1',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminBannerIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(196, 154, 108, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerSocietyName: {
    fontSize: 16.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  adminBannerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  adminBannerCodePill: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  adminBannerCodePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  adminBannerTypePill: {
    backgroundColor: 'rgba(107, 142, 90, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  adminBannerTypePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    textTransform: 'uppercase',
  },
  adminBannerUnitsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8DED1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminBannerUnitsLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  adminBannerUnitsValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  adminTilesList: {
    gap: 10,
  },
  adminTile: {
    backgroundColor: '#FAF6EE',
    borderWidth: 1,
    borderColor: '#EFE9E1',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  adminTileEmergency: {
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  adminTileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  adminTileIconBoxEmergency: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  adminTileContent: {
    flex: 1,
  },
  adminTileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  adminTileValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  adminActualHomesText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
  },
  adminCodeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 2,
  },
  adminCodeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  noSocietyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSocietyIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  noSocietyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 4,
  },
  noSocietySub: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  /* 4. Logout Button */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    height: 48,
    gap: 8,
    marginTop: 4,
    ...THEME.shadows.card,
  },
  logoutText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#DC2626',
  },
});
