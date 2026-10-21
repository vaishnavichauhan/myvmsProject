import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { THEME } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { CustomIcon } from '../components/CustomIcon';
import { useAuthStore } from '../store/authStore';

export const LoginScreen = ({ navigation }) => {
  const [identifier, setIdentifier] = useState('9800000000');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Validation Error', 'Please enter both your Phone Number (or Email) and password.');
      return;
    }
    clearError();
    const result = await login(identifier, password);
    if (!result.success) {
      Alert.alert('Login Failed', result.message || 'Invalid credentials.');
    }
  };

  const quickFillCredentials = (phone, pass) => {
    setIdentifier(phone);
    setPassword(pass);
    clearError();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Back Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <CustomIcon name="chevronLeft" size={26} color={THEME.colors.darkBrown} />
          </TouchableOpacity>

          {/* Brand & Heading */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <CustomIcon name="lock" size={26} color={THEME.colors.clay} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in with your registered phone number or email address
            </Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <CustomIcon name="alert" size={16} color={THEME.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <View style={styles.card}>
            {/* Identifier Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER OR EMAIL</Text>
              <View style={styles.inputContainer}>
                <CustomIcon name="person" size={18} color={THEME.colors.clay} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 9800000000 or admin@myvms.com"
                  placeholderTextColor={THEME.colors.textDim}
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (error) clearError();
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputContainer}>
                <CustomIcon name="lock" size={18} color={THEME.colors.clay} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor={THEME.colors.textDim}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) clearError();
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              style={{ marginTop: 8 }}
            />
          </View>

          {/* Quick Demo Credentials */}
          <View style={styles.demoSection}>
            <Text style={styles.demoSectionTitle}>QUICK DEMO ROLES (TAP TO FILL)</Text>
            <View style={styles.demoGrid}>
              <TouchableOpacity
                onPress={() => quickFillCredentials('9800000000', 'Password@123')}
                style={styles.demoChip}
              >
                <Text style={styles.demoRole}>System Admin</Text>
                <Text style={styles.demoPhone}>9800000000</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => quickFillCredentials('1212121212', '123456')}
                style={styles.demoChip}
              >
                <Text style={styles.demoRole}>Resident (Owner)</Text>
                <Text style={styles.demoPhone}>1212121212</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => quickFillCredentials('1111122222', '123456')}
                style={styles.demoChip}
              >
                <Text style={styles.demoRole}>Security Guard</Text>
                <Text style={styles.demoPhone}>1111122222</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => quickFillCredentials('2121212121', '123456')}
                style={styles.demoChip}
              >
                <Text style={styles.demoRole}>Family Member</Text>
                <Text style={styles.demoPhone}>2121212121</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...THEME.shadows.card,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.errorBg,
    borderWidth: 1,
    borderColor: THEME.colors.errorBorder,
    borderRadius: THEME.radius.md,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 22,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.float,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  eyeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  demoSection: {
    marginTop: 24,
  },
  demoSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  demoChip: {
    width: '48%',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    padding: 10,
    alignItems: 'center',
  },
  demoRole: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  demoPhone: {
    fontSize: 11,
    color: THEME.colors.clayDark,
    marginTop: 2,
    fontWeight: '600',
  },
});
