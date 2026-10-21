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
import { societyApi } from '../services/apiServices';
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
  Building,
  Home,
  KeyRound,
} from 'lucide-react-native';

export const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, changePassword, isLoading } = useAuthStore();

  const [societyData, setSocietyData] = useState(null);
  const [loadingSociety, setLoadingSociety] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchSocietyData();
  }, [user]);

  const fetchSocietyData = async () => {
    try {
      setLoadingSociety(true);
      const res = await societyApi.getSocieties();
      const list = res?.data?.societies || (Array.isArray(res?.data) ? res.data : (res?.societies || []));
      if (list && list.length > 0) {
        const found = list.find((s) => s.id === user?.societyId) || list[0];
        setSocietyData(found);
      }
    } catch (err) {
      console.log('Error fetching society data:', err);
    } finally {
      setLoadingSociety(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSocietyData();
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

  // Get Admin Initials
  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
          {/* Subtle gradient dark overlay */}
          <View style={styles.heroGradientOverlay} />

          {/* Optional Floating Back Button if opened from stack */}
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.floatingBackBtn, { top: Math.max(insets.top, 16) }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Society Badge on top right of cover */}
          <View style={[styles.coverSocietyPill, { top: Math.max(insets.top, 16) }]}>
            <Building2 size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.coverSocietyPillText} numberOfLines={1}>
              {societyData?.name || user?.societyName || 'Suncity Paradise'}
            </Text>
          </View>
        </View>

        {/* ========================================================== */}
        {/* 2. PROFILE ICON: HALF ON IMAGE, HALF ON CARD               */}
        {/* ========================================================== */}
        <View style={styles.avatarOverlapContainer}>
          <View style={styles.avatarWrapper}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarPhoto} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitialsText}>
                  {getInitials(user?.fullName || user?.name || user?.full_name)}
                </Text>
              </View>
            )}


          </View>
        </View>

        {/* ========================================================== */}
        {/* BODY CONTENT WRAPPER                                       */}
        {/* ========================================================== */}
        <View style={styles.bodyContent}>
          {isAdmin ? (
            /* ======================================================== */
            /* 3. PERSONAL INFORMATION CARD (SYSTEM ADMINISTRATOR)      */
            /* ======================================================== */
            <View style={styles.glassCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionLabel}>SYSTEM ADMINISTRATOR</Text>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{user?.role || 'ADMIN'}</Text>
                </View>
              </View>

              {/* Admin Name */}
              <View style={styles.adminNameRow}>
                <Text style={styles.adminFullName}>
                  {user?.fullName || user?.name || user?.full_name || 'System Administrator'}
                </Text>
              </View>

              {/* Personal Contact Details */}
              <View style={styles.detailsGroup}>
                <View style={styles.detailItem}>
                  <View style={styles.detailIconBox}>
                    <Mail size={13} color={THEME.colors.clay} />
                  </View>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailVal} numberOfLines={1}>
                    {user?.email || 'admin@myvms.society'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <View style={[styles.detailIconBox, styles.detailIconBoxGreen]}>
                    <Phone size={13} color={THEME.colors.fernGreen} />
                  </View>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailVal} numberOfLines={1}>
                    {user?.phone || '+91 98765 43210'}
                  </Text>
                </View>
              </View>

              {/* ---------------------------------------------------- */}
              {/* BUTTON: CHANGE PASSWORD                              */}
              {/* ---------------------------------------------------- */}
              <TouchableOpacity
                style={styles.changePasswordBtn}
                onPress={() => setShowPasswordForm(!showPasswordForm)}
                activeOpacity={0.8}
              >
                <View style={styles.changePasswordBtnLeft}>
                  <View style={styles.keyIconWrap}>
                    <KeyRound size={15} color={THEME.colors.clay} />
                  </View>
                  <Text style={styles.changePasswordBtnText}>Change Password</Text>
                </View>
                {showPasswordForm ? (
                  <ChevronUp size={18} color={THEME.colors.clay} />
                ) : (
                  <ChevronDown size={18} color={THEME.colors.clay} />
                )}
              </TouchableOpacity>

              {/* Expandable Password Change Inputs */}
              {showPasswordForm && (
                <View style={styles.passwordExpandableBox}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder="Enter current password"
                      placeholderTextColor={THEME.colors.textDim}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder="Minimum 6 characters"
                      placeholderTextColor={THEME.colors.textDim}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder="Re-type new password"
                      placeholderTextColor={THEME.colors.textDim}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>

                  <PrimaryButton
                    title="Update Password"
                    onPress={handlePasswordChange}
                    loading={changingPass}
                    style={{ marginTop: 4 }}
                  />
                </View>
              )}
            </View>
          ) : (
            /* RESIDENT PERSONAL INFORMATION */
            <View style={styles.glassCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionLabel}>RESIDENT PERSONAL INFORMATION</Text>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{user?.role || 'RESIDENT'}</Text>
                </View>
              </View>

              <View style={styles.adminNameRow}>
                <Text style={styles.adminFullName}>
                  {user?.fullName || user?.full_name || 'Resident User'}
                </Text>
              </View>

              <View style={styles.detailsGroup}>
                <View style={styles.detailItem}>
                  <Phone size={15} color={THEME.colors.clay} style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailVal}>{user?.phone || 'Not linked'}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Home size={15} color={THEME.colors.clay} style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Unit / Home:</Text>
                  <Text style={styles.detailVal}>
                    {user?.flatNumber ? `Home ${user.flatNumber}` : 'Flat 10'}
                  </Text>
                </View>
              </View>

              {/* BUTTON: CHANGE PASSWORD */}
              <TouchableOpacity
                style={styles.changePasswordBtn}
                onPress={() => setShowPasswordForm(!showPasswordForm)}
                activeOpacity={0.8}
              >
                <View style={styles.changePasswordBtnLeft}>
                  <View style={styles.keyIconWrap}>
                    <KeyRound size={15} color={THEME.colors.clay} />
                  </View>
                  <Text style={styles.changePasswordBtnText}>Change Password</Text>
                </View>
                {showPasswordForm ? (
                  <ChevronUp size={18} color={THEME.colors.clay} />
                ) : (
                  <ChevronDown size={18} color={THEME.colors.clay} />
                )}
              </TouchableOpacity>

              {showPasswordForm && (
                <View style={styles.passwordExpandableBox}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder="Enter current password"
                      placeholderTextColor={THEME.colors.textDim}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>NEW PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder="Minimum 6 characters"
                      placeholderTextColor={THEME.colors.textDim}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      placeholder="Re-type new password"
                      placeholderTextColor={THEME.colors.textDim}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                  <PrimaryButton
                    title="Update Password"
                    onPress={handlePasswordChange}
                    loading={changingPass}
                    style={{ marginTop: 4 }}
                  />
                </View>
              )}
            </View>
          )}

          {/* ========================================================== */}
          {/* 4. ACTIVE SOCIETY INFORMATION CARD                         */}
          {/* ========================================================== */}
          <View style={styles.glassCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSectionLabel}>ACTIVE SOCIETY INFORMATION</Text>
            </View>

            <View style={styles.cardMainRow}>
              {/* Square Society Icon Badge with solid theme background */}
              <View style={styles.squareSocietyBadge}>
                <Building2 size={28} color="#FFFFFF" />
              </View>

              {/* Society Info */}
              <View style={styles.cardContentCol}>
                <View style={styles.nameBadgeRow}>
                  <Text style={styles.societyNameText} numberOfLines={1}>
                    {societyData?.name || user?.societyName || 'Suncity Paradise'}
                  </Text>
                  <View style={styles.codePill}>
                    <Text style={styles.codePillText}>
                      Code: {societyData?.code || 'SOC-001'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsGroup}>
                  {/* Address */}
                  <View style={styles.detailItemTop}>
                    <View style={styles.detailIconBox}>
                      <MapPin size={13} color={THEME.colors.clay} />
                    </View>
                    <Text style={styles.detailLabel}>Address:</Text>
                    <Text style={styles.detailValMultiline}>
                      {societyData?.address || 'Main Campus, Sector 4'}
                    </Text>
                  </View>

                  {/* Office Contact */}
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconBox}>
                      <Phone size={13} color={THEME.colors.clay} />
                    </View>
                    <Text style={styles.detailLabel}>Office:</Text>
                    <Text style={styles.detailVal} numberOfLines={1}>
                      {societyData?.contact_number || '+91 98765 43210'}
                    </Text>
                  </View>

                  {/* Helpline */}
                  <View style={styles.detailItem}>
                    <View style={[styles.detailIconBox, styles.detailIconBoxGreen]}>
                      <Phone size={13} color={THEME.colors.fernGreen} />
                    </View>
                    <Text style={styles.detailLabel}>Helpline:</Text>
                    <Text style={styles.detailVal} numberOfLines={1}>
                      {societyData?.emergency_number || '+91 91234 56789 / 112'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ========================================================== */}
          {/* 5. LOGOUT ACTION BUTTON                                    */}
          {/* ========================================================== */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.85}>
            <LogOut size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Sign Out from Device</Text>
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
    paddingBottom: 110,
  },

  /* 1. Hero Cover Image Banner */
  heroCoverWrapper: {
    width: '100%',
    height: 185,
    position: 'relative',
    backgroundColor: '#342C26',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroCoverImage: {
    width: '100%',
    height: '100%',
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52, 44, 38, 0.32)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    maxWidth: 200,
  },
  coverSocietyPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* 2. Avatar Overlap (Half on Hero, Half on Body) */
  avatarOverlapContainer: {
    alignItems: 'center',
    marginTop: -46, // Half of 92px height
    zIndex: 20,
    marginBottom: 8,
  },
  avatarWrapper: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: THEME.colors.clay,
    borderWidth: 4,
    borderColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#403630',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: 0.5,
  },
  avatarActiveBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#15803D',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Body Content */
  bodyContent: {
    paddingHorizontal: 16,
    gap: 16,
  },

  /* Glass Card */
  glassCard: {
    backgroundColor: THEME.colors.white,
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
    marginBottom: 12,
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
  adminNameRow: {
    marginBottom: 10,
  },
  adminFullName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },

  /* Details Group */
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
  detailIcon: {
    flexShrink: 0,
  },
  detailIconTop: {
    flexShrink: 0,
    marginTop: 2,
  },
  detailIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(196, 154, 108, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailIconBoxGreen: {
    backgroundColor: 'rgba(107, 142, 90, 0.16)',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    minWidth: 54,
  },
  detailVal: {
    fontSize: 13,
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

  /* Added Button: Change Password */
  changePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(196, 154, 108, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  changePasswordBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  keyIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(196, 154, 108, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePasswordBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.clayDark,
  },
  passwordExpandableBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    height: 46,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    fontSize: 14,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },

  /* Society Card Main Row */
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  squareSocietyBadge: {
    width: 60,
    height: 60,
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
    fontSize: 16,
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
  manageSocietyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(196, 154, 108, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.25)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  manageSocietyText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.clayDark,
    flex: 1,
  },

  /* 5. Logout Button */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    height: 50,
    gap: 8,
    marginTop: 4,
    ...THEME.shadows.card,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
});
