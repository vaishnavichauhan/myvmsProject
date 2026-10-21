import React, { useState, useEffect } from 'react';
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
  MapPin,
  ShieldCheck,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react-native';

export const SettingsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [societyId, setSocietyId] = useState(1);
  const [societyName, setSocietyName] = useState('Suncity Paradise');
  const [societyCode, setSocietyCode] = useState('SOC-001');
  const [address, setAddress] = useState('Plot No. 42, Sector 18, Palm Beach Road, Navi Mumbai');
  const [primaryPhone, setPrimaryPhone] = useState('+91 22 4567 8900');
  const [emergencyPhone, setEmergencyPhone] = useState('+91 22 4567 9999');

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await societyApi.getSocieties();
      const list = res?.data?.societies || (Array.isArray(res?.data) ? res.data : (res?.societies || []));
      if (list && list.length > 0) {
        const found = list.find((s) => s.id === user?.societyId) || list[0];
        setSocietyId(found.id || 1);
        setSocietyName(found.name || user?.societyName || 'Suncity Paradise');
        setSocietyCode(found.code || 'SOC-001');
        if (found.address) setAddress(found.address);
        if (found.contact_number) setPrimaryPhone(found.contact_number);
        if (found.emergency_number) setEmergencyPhone(found.emergency_number);
      }
    } catch (err) {
      console.log('Error fetching society profile in SettingsScreen:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await societyApi.updateSociety(societyId, {
        name: societyName,
        code: societyCode,
        address,
        contact_number: primaryPhone,
        emergency_number: emergencyPhone,
      });
      setSaveSuccess(true);
      Alert.alert('Settings Saved', 'Society profile configurations updated successfully.');
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
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

      {/* Top Dark Header */}
      <View style={[styles.darkHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeftCol}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Society Settings</Text>
              <Text style={styles.headerSubtitle}>
                Configure society profile, rules & helplines
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading configurations...</Text>
          </View>
        ) : (
          <View style={styles.contentWrapper}>
            {/* Success Alert Banner */}
            {saveSuccess && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={16} color="#15803D" style={{ marginRight: 6 }} />
                <Text style={styles.successBannerText}>
                  Settings saved successfully! Society info updated.
                </Text>
              </View>
            )}

            {/* ========================================================== */}
            {/* FRONTEND IDENTICAL OVERVIEW CARDS                          */}
            {/* ========================================================== */}

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
                      <View style={styles.detailIconBox}>
                        <Mail size={13} color={THEME.colors.clay} />
                      </View>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailVal} numberOfLines={1}>
                        {user?.email || 'admin@myvms.society'}
                      </Text>
                    </View>

                    {/* Phone */}
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
                  <Building2 size={28} color="#FFFFFF" />
                </View>

                {/* Society Info */}
                <View style={styles.cardContentCol}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {societyName || 'Suncity Paradise'}
                    </Text>
                    <View style={styles.codePill}>
                      <Text style={styles.codePillText}>
                        Code: {societyCode || 'SOC-001'}
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
                        {address || 'Main Campus, Sector 4'}
                      </Text>
                    </View>

                    {/* Office Contact */}
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconBox}>
                        <Phone size={13} color={THEME.colors.clay} />
                      </View>
                      <Text style={styles.detailLabel}>Office:</Text>
                      <Text style={styles.detailVal} numberOfLines={1}>
                        {primaryPhone || '+91 98765 43210'}
                      </Text>
                    </View>

                    {/* Helpline */}
                    <View style={styles.detailItem}>
                      <View style={[styles.detailIconBox, styles.detailIconBoxGreen]}>
                        <Phone size={13} color={THEME.colors.fernGreen} />
                      </View>
                      <Text style={styles.detailLabel}>Helpline:</Text>
                      <Text style={styles.detailVal} numberOfLines={1}>
                        {emergencyPhone || '+91 91234 56789 / 112'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ========================================================== */}
            {/* 3. SOCIETY PROFILE CONFIGURATION FORM                      */}
            {/* ========================================================== */}
            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <View style={styles.formIconWrap}>
                  <Building size={18} color={THEME.colors.clay} />
                </View>
                <View>
                  <Text style={styles.formTitle}>Society Profile Configuration</Text>
                  <Text style={styles.formSubtitle}>Update legal name, address & emergency phone numbers</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SOCIETY NAME</Text>
                <TextInput
                  style={styles.input}
                  value={societyName}
                  onChangeText={setSocietyName}
                  placeholder="e.g. Suncity Paradise"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SOCIETY CODE</Text>
                <TextInput
                  style={styles.input}
                  value={societyCode}
                  onChangeText={setSocietyCode}
                  placeholder="e.g. SOC-001"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              {/* Address 2-line textarea */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SOCIETY ADDRESS (2 LINES)</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  multiline
                  numberOfLines={2}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street, Campus, City, Pincode"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PRIMARY OFFICE PHONE</Text>
                <TextInput
                  style={styles.input}
                  value={primaryPhone}
                  onChangeText={setPrimaryPhone}
                  keyboardType="phone-pad"
                  placeholder="+91 22 4567 8900"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMERGENCY HELPLINE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  keyboardType="phone-pad"
                  placeholder="+91 22 4567 9999 / 112"
                  placeholderTextColor={THEME.colors.textDim}
                />
              </View>

              <PrimaryButton
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                style={{ marginTop: 10 }}
              />
            </View>
          </View>
        )}
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
    paddingBottom: 40,
  },
  centerLoading: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  contentWrapper: {
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

  /* Form Card */
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
  textarea: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
});
