import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { PrimaryButton } from '../components/PrimaryButton';
import { visitorApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const SecurityGateScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [homeNumber, setHomeNumber] = useState('');
  const [purpose, setPurpose] = useState('Personal Visit');
  const [submitting, setSubmitting] = useState(false);

  const handleQuickCheckIn = async () => {
    if (!visitorName.trim() || !phone.trim() || !homeNumber.trim()) {
      Alert.alert('Validation Error', 'Please fill in visitor name, phone, and home number.');
      return;
    }

    setSubmitting(true);
    try {
      await visitorApi.createVisitorEntry({
        visitor_name: visitorName.trim(),
        phone_number: phone.trim(),
        home_number: homeNumber.trim(),
        purpose,
        gate_name: 'Main Gate',
      });
      Alert.alert('Pass Logged', `Visitor check-in created for Home ${homeNumber}. Clearance request sent.`);
      setVisitorName('');
      setPhone('');
      setHomeNumber('');
    } catch (err) {
      Alert.alert('Check-In Error', err.message || 'Failed to record entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Security Gate Console"
        subtitle="Gate 1 • Live Checkpoint Logging"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Gate Duty Banner */}
        <View style={styles.gateBanner}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ON DUTY</Text>
          </View>
          <Text style={styles.guardName}>Officer: {user?.fullName || 'Duty Officer'}</Text>
          <Text style={styles.shiftText}>Active Gate: Main Gate 1 • Morning Shift</Text>
        </View>

        {/* Quick Check-in Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Quick Visitor Check-In</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>VISITOR NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={THEME.colors.textDim}
              value={visitorName}
              onChangeText={setVisitorName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile"
              placeholderTextColor={THEME.colors.textDim}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>TARGET HOME / FLAT NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10 or 402"
              placeholderTextColor={THEME.colors.textDim}
              keyboardType="numeric"
              value={homeNumber}
              onChangeText={setHomeNumber}
            />
          </View>

          <PrimaryButton
            title="Log Check-In & Alert Resident"
            onPress={handleQuickCheckIn}
            loading={submitting}
            style={{ marginTop: 10 }}
          />
        </View>

        {/* Action Buttons to View Live Logs */}
        <View style={styles.logsRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Visitors')}
            style={styles.logCard}
          >
            <CustomIcon name="userCheck" size={24} color={THEME.colors.clay} />
            <Text style={styles.logCardTitle}>Active Visitors</Text>
            <Text style={styles.logCardSub}>View & Record Exit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('CourierDelivery')}
            style={styles.logCard}
          >
            <CustomIcon name="package" size={24} color={THEME.colors.skyBlueDark} />
            <Text style={styles.logCardTitle}>Delivery Logs</Text>
            <Text style={styles.logCardSub}>Swiggy, Zomato, Postal</Text>
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
    padding: 16,
    paddingBottom: 100,
  },
  gateBanner: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 16,
    ...THEME.shadows.card,
  },
  badge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  guardName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  shiftText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 16,
    ...THEME.shadows.card,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 6,
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
  },
  logsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  logCard: {
    flex: 1,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  logCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 8,
  },
  logCardSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
