import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { societyApi } from '../services/apiServices';

export const SettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [societyId, setSocietyId] = useState(1);
  const [societyName, setSocietyName] = useState('Suncity Paradise');
  const [societyCode, setSocietyCode] = useState('SUNCITY-01');
  const [address, setAddress] = useState('Plot No. 42, Sector 18, Palm Beach Road\nNavi Mumbai, Maharashtra - 400705');
  const [primaryPhone, setPrimaryPhone] = useState('+91 22 4567 8900');
  const [emergencyPhone, setEmergencyPhone] = useState('+91 22 4567 9999');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await societyApi.getSocieties();
      const first = Array.isArray(res.data) ? res.data[0] : (res.data?.societies?.[0] || res.data);
      if (first) {
        setSocietyId(first.id || 1);
        setSocietyName(first.name || 'Suncity Paradise');
        setSocietyCode(first.code || 'SUNCITY-01');
        if (first.address) setAddress(first.address);
        if (first.contact_number) setPrimaryPhone(first.contact_number);
        if (first.emergency_number) setEmergencyPhone(first.emergency_number);
      }
    } catch (err) {
      console.log('Error fetching society profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await societyApi.updateSociety(societyId, {
        name: societyName,
        code: societyCode,
        address,
        contact_number: primaryPhone,
        emergency_number: emergencyPhone,
      });
      Alert.alert('Settings Saved', 'Society profile configurations updated successfully.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Society Settings"
        subtitle="Configure society profile & helplines"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading configurations...</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Society Profile Configuration</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SOCIETY NAME</Text>
              <TextInput
                style={styles.input}
                value={societyName}
                onChangeText={setSocietyName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SOCIETY CODE</Text>
              <TextInput
                style={styles.input}
                value={societyCode}
                onChangeText={setSocietyCode}
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
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PRIMARY OFFICE PHONE</Text>
              <TextInput
                style={styles.input}
                value={primaryPhone}
                onChangeText={setPrimaryPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMERGENCY HELPLINE NUMBER</Text>
              <TextInput
                style={styles.input}
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                keyboardType="phone-pad"
              />
            </View>

            <PrimaryButton
              title="Save Changes"
              onPress={handleSave}
              loading={saving}
              style={{ marginTop: 12 }}
            />
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 16,
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
    height: 68,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
});
