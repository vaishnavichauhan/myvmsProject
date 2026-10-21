import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/authStore';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout, changePassword, isLoading } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

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

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Account & Security"
        subtitle="Manage credentials & society profile"
        showBack={navigation.canGoBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(user?.fullName || user?.full_name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.profileName}>{user?.fullName || user?.full_name || 'Resident User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role || 'RESIDENT'}</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <CustomIcon name="phone" size={16} color={THEME.colors.clay} />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoVal}>{user?.phone || 'Not linked'}</Text>
          </View>

          <View style={styles.infoRow}>
            <CustomIcon name="building" size={16} color={THEME.colors.clay} />
            <Text style={styles.infoLabel}>Society:</Text>
            <Text style={styles.infoVal}>{user?.societyName || 'Suncity Paradise'}</Text>
          </View>

          <View style={styles.infoRow}>
            <CustomIcon name="home" size={16} color={THEME.colors.clay} />
            <Text style={styles.infoLabel}>Unit / Home:</Text>
            <Text style={styles.infoVal}>{user?.flatNumber ? `Home ${user.flatNumber}` : 'Flat 10'}</Text>
          </View>
        </View>

        {/* Change Password Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <CustomIcon name="lock" size={20} color={THEME.colors.clay} />
            <Text style={styles.sectionTitle}>Change Password</Text>
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

        {/* Sign Out Action */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <CustomIcon name="logOut" size={18} color="#DC2626" />
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
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    marginBottom: 18,
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
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 16,
  },
  roleText: {
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
  sectionCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 18,
    ...THEME.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
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
