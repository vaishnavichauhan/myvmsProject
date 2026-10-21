import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { THEME } from '../constants/theme';
import { PrimaryButton, OutlineButton } from '../components/PrimaryButton';
import { CustomIcon } from '../components/CustomIcon';

export const LandingScreen = ({ navigation }) => {
  const features = [
    {
      icon: 'shield',
      title: 'Real-Time Gate Security',
      desc: 'Instant visitor clearance notifications, pass approvals, and secure check-in logging.',
      color: THEME.colors.clay,
    },
    {
      icon: 'users',
      title: 'Household Management',
      desc: 'Manage family members, domestic helpers, and unit authorizations in one place.',
      color: THEME.colors.fernGreen,
    },
    {
      icon: 'package',
      title: 'Courier & Parcel Logging',
      desc: 'Never miss an arrival from Swiggy, Zomato, Amazon, or postal delivery services.',
      color: THEME.colors.skyBlueDark,
    },
    {
      icon: 'bell',
      title: 'Society Circulars',
      desc: 'Stay informed with emergency alerts, maintenance schedules, and meeting circulars.',
      color: THEME.colors.error,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <CustomIcon name="building" size={26} color={THEME.colors.clay} />
          </View>
          <Text style={styles.brandTitle}>MYVMS</Text>
          <Text style={styles.brandSubtitle}>Residential Society Management</Text>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>SMART SOCIETY LIVING</Text>
          </View>
          <Text style={styles.heroHeading}>
            Connected Community & Seamless Gate Access
          </Text>
          <Text style={styles.heroDescription}>
            The unified portal for Residents, Society Management Committees, and Security Personnel.
          </Text>

          <View style={styles.ctaContainer}>
            <PrimaryButton
              title="Sign In to Portal"
              onPress={() => navigation.navigate('Login')}
              icon="arrowRight"
              style={styles.primaryBtn}
            />
          </View>
        </View>

        {/* Key Features Section */}
        <Text style={styles.sectionTitle}>Key Capabilities</Text>

        {features.map((feat, idx) => (
          <View key={idx} style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: `${feat.color}1A` }]}>
              <CustomIcon name={feat.icon} size={24} color={feat.color} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>{feat.title}</Text>
              <Text style={styles.featureDesc}>{feat.desc}</Text>
            </View>
          </View>
        ))}

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            MYVMS • Enterprise MySQL 2 • Role-Based Access Control
          </Text>
        </View>
      </ScrollView>
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
  brandHeader: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.white,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...THEME.shadows.card,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 28,
    ...THEME.shadows.float,
  },
  heroBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: THEME.radius.full,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clayDark,
    letterSpacing: 0.5,
  },
  heroHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    lineHeight: 28,
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  ctaContainer: {
    marginTop: 6,
  },
  primaryBtn: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 14,
  },
  featureCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 16,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
