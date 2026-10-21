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
  ActivityIndicator,
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
  ShieldCheck,
  Building,
  Home,
} from 'lucide-react-native';

export const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, changePassword, isLoading } = useAuthStore();

  const [societyData, setSocietyData] = useState(null);
  const [loadingSociety, setLoadingSociety] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      {/* Top Dark Header (Cohesive with Gate Entry & Announcements) */}
      <View style={[styles.darkHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeftCol}>
            {navigation.canGoBack() && (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeft size={22} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {isAdmin ? 'Account & Society' : 'Account & Security'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isAdmin
                  ? 'System administrator & active society details'
                  : 'Manage credentials & unit profile'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.clay}
            colors={[THEME.colors.clay]}
          />
        }
      >
        {isAdmin ? (
          /* ========================================================== */
          /* ADMIN ACCOUNT VIEW: FRONTEND IDENTICAL CONTENT             */
          /* ========================================================== */
          <View style={styles.adminCardsWrapper}>
            {/* 1. SYSTEM ADMINISTRATOR CARD */}
            <View style={styles.frontendGlassCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionLabel}>SYSTEM ADMINISTRATOR</Text>
                <View style={styles.adminVerifiedBadge}>
                  <ShieldCheck size={13} color={THEME.colors.clay} style={{ marginRight: 3 }} />
                  <Text style={styles.adminVerifiedText}>Active</Text>
                </View>
              </View>

              <View style={styles.cardMainRow}>
                {/* Square Avatar with Initials or Image */}
                <View style={styles.squareAvatar}>
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.squareAvatarText}>
                      {getInitials(user?.fullName || user?.name || user?.full_name)}
                    </Text>
                  )}
                </View>

                {/* Admin Info */}
                <View style={styles.cardContentCol}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {user?.fullName || user?.name || user?.full_name || 'Administrator'}
                    </Text>
                    <View style={styles.rolePill}>
                      <Text style={styles.rolePillText}>{user?.role || 'ADMIN'}</Text>
                    </View>
                  </View>

                  <View style={styles.detailsGroup}>
                    {/* Email */}
                    <View style={styles.detailItem}>
                      <Mail size={14} color={THEME.colors.clay} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailVal} numberOfLines={1}>
                        {user?.email || 'admin@myvms.society'}
                      </Text>
                    </View>

                    {/* Phone */}
                    <View style={styles.detailItem}>
                      <Phone size={14} color={THEME.colors.fernGreen} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailVal} numberOfLines={1}>
                        {user?.phone || '+91 98765 43210'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. ACTIVE SOCIETY INFORMATION CARD */}
            <View style={styles.frontendGlassCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionLabel}>ACTIVE SOCIETY INFORMATION</Text>
              </View>

              <View style={styles.cardMainRow}>
                {/* Square Society Icon Badge */}
                <View style={styles.squareSocietyBadge}>
                  <Building2 size={28} color={THEME.colors.clay} />
                </View>

                {/* Society Info */}
                <View style={styles.cardContentCol}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.profileName} numberOfLines={1}>
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
                      <MapPin size={14} color={THEME.colors.clay} style={styles.detailIconTop} />
                      <Text style={styles.detailLabel}>Address:</Text>
                      <Text style={styles.detailValMultiline}>
                        {societyData?.address || 'Main Campus, Sector 4'}
                      </Text>
                    </View>

                    {/* Office Contact */}
                    <View style={styles.detailItem}>
                      <Phone size={14} color={THEME.colors.clay} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Office:</Text>
                      <Text style={styles.detailVal} numberOfLines={1}>
                        {societyData?.contact_number || '+91 98765 43210'}
                      </Text>
                    </View>

                    {/* Helpline */}
                    <View style={styles.detailItem}>
                      <Phone size={14} color={THEME.colors.fernGreen} style={styles.detailIcon} />
                      <Text style={styles.detailLabel}>Helpline:</Text>
                      <Text style={styles.detailVal} numberOfLines={1}>
                        {societyData?.emergency_number || '+91 91234 56789 / 112'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quick shortcut to Edit Society Configurations */}
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={styles.manageSocietyBtn}
                activeOpacity={0.8}
              >
                <Building size={15} color={THEME.colors.clay} style={{ marginRight: 6 }} />
                <Text style={styles.manageSocietyText}>Configure Society Details & Helplines</Text>
                <ChevronLeft
                  size={16}
                  color={THEME.colors.clay}
                  style={{ transform: [{ rotate: '180deg' }] }}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ========================================================== */
          /* NON-ADMIN / RESIDENT VIEW                                  */
          /* ========================================================== */
          <View style={styles.residentProfileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.fullName || user?.full_name || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>

            <Text style={styles.residentProfileName}>
              {user?.fullName || user?.full_name || 'Resident User'}
            </Text>
            <View style={styles.residentRoleBadge}>
              <Text style={styles.residentRoleText}>{user?.role || 'RESIDENT'}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Phone size={16} color={THEME.colors.clay} />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoVal}>{user?.phone || 'Not linked'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Building2 size={16} color={THEME.colors.clay} />
              <Text style={styles.infoLabel}>Society:</Text>
              <Text style={styles.infoVal}>{user?.societyName || 'Suncity Paradise'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Home size={16} color={THEME.colors.clay} />
              <Text style={styles.infoLabel}>Unit / Home:</Text>
              <Text style={styles.infoVal}>
                {user?.flatNumber ? `Home ${user.flatNumber}` : 'Flat 10'}
              </Text>
            </View>
          </View>
        )}

        {/* ========================================================== */}
        {/* CHANGE PASSWORD CARD (SHARED)                              */}
        {/* ========================================================== */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Lock size={18} color={THEME.colors.clay} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <Text style={styles.sectionSubtitle}>Update your login credentials securely</Text>
            </View>
          </View>

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
            style={{ marginTop: 6 }}
          />
        </View>

        {/* ========================================================== */}
        {/* SIGN OUT ACTION                                            */}
        {/* ========================================================== */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <LogOut size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out from Device</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  /* Top Dark Header */
  darkHeader: {
    backgroundColor: '#342C26',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },

  /* Admin Cards Wrapper */
  adminCardsWrapper: {
    gap: 16,
    marginBottom: 16,
  },

  /* Frontend Identical Glass Card */
  frontendGlassCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
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

  /* Square Society Badge */
  squareSocietyBadge: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    flexShrink: 0,
    ...THEME.shadows.card,
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
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailIcon: {
    flexShrink: 0,
  },
  detailIconTop: {
    flexShrink: 0,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    minWidth: 54,
  },
  detailVal: {
    fontSize: 12,
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

  /* Manage Society Quick Button */
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

  /* Non-Admin Resident Card */
  residentProfileCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    marginBottom: 16,
    ...THEME.shadows.card,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.white,
  },
  residentProfileName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 4,
  },
  residentRoleBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 16,
  },
  residentRoleText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clayDark,
    letterSpacing: 0.5,
  },
  infoDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(214, 194, 161, 0.3)',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 6,
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    width: 90,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    flex: 1,
  },

  /* Password Section Card */
  sectionCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    marginBottom: 16,
    ...THEME.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 1,
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

  /* Sign Out Button */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: THEME.radius.md,
    height: 48,
    gap: 8,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
});
