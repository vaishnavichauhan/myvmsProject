import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { familyMemberApi } from '../services/apiServices';
import { MetricCard } from '../components/MetricCard';
import { EmergencyBanner } from '../components/EmergencyBanner';

export const MyHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await familyMemberApi.getMyHomeDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.log('Error loading resident dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const home = data?.home || {};
  const familyMembers = data?.familyMembers || [];
  const homeWorkers = data?.homeWorkers || [];
  const permissions = Array.isArray(data?.permissions) ? data.permissions : [];
  const committeeMembers = data?.committeeMembers || [];
  const announcements = data?.announcements || [];
  const gates = data?.gates || [];
  const visitors = data?.visitors || [];

  const homeNumberDisplay = home.home_number || user?.flatNumber || '10';

  let residentTypeDisplay = 'Resident';
  if (user?.role === 'FAMILY_MEMBER') {
    residentTypeDisplay = user?.relationship ? `Family (${user.relationship})` : 'Family Member';
  } else if (user?.role === 'OWNER') {
    residentTypeDisplay = 'Owner';
  } else if (user?.role === 'TENANT') {
    residentTypeDisplay = 'Tenant';
  }

  // Active permissions count
  const loggedInPerm = permissions.find(
    (p) => p.user_id === user?.id || (p.full_name && user?.fullName && p.full_name.toLowerCase() === user.fullName.toLowerCase())
  ) || permissions[0] || {};

  const courierActive = loggedInPerm.courier_permission !== undefined ? Boolean(loggedInPerm.courier_permission) : true;
  const deliveryActive = loggedInPerm.delivery_permission !== undefined ? Boolean(loggedInPerm.delivery_permission) : true;
  const visitorActive = loggedInPerm.visitor_permission !== undefined ? Boolean(loggedInPerm.visitor_permission) : true;
  const workerActive = loggedInPerm.worker_permission !== undefined ? Boolean(loggedInPerm.worker_permission) : true;
  const activePermissionsCount = [courierActive, deliveryActive, visitorActive, workerActive].filter(Boolean).length;

  const userInitial = (user?.fullName || user?.full_name || 'R').charAt(0).toUpperCase();

  return (
    <View style={styles.screenWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.colors.clay]}
            tintColor={THEME.colors.clay}
          />
        }
      >
        {/* ========================================================
            TOP DARK HEADER SECTION
            ======================================================== */}
        <View style={[styles.darkHeader, { paddingTop: Math.max(insets.top, 14) }]}>
          {/* Left Side: User Avatar, Name, and Role */}
          <View style={styles.userProfileRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarInitial}>{userInitial}</Text>
            </View>

            <View style={styles.userInfoCol}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName || user?.full_name || 'Resident'}
              </Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>
                  {residentTypeDisplay} • Home {homeNumberDisplay}
                </Text>
              </View>
            </View>
          </View>

          {/* ========================================================
              HERO TITLE: Modern, Secure & Connected / Residential Living
              ======================================================== */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitleWhite}>Modern, Secure & Connected</Text>
            <Text style={styles.heroTitleClay}>Residential Living</Text>
          </View>
        </View>

        {/* ========================================================
            HERO CARD OVERLAP: Half on dark top part, half on body
            ======================================================== */}
        <View style={styles.heroCardOverlapWrapper}>
          <View style={styles.heroCard}>
            <Image
              source={require('../assets/images/community-hero.jpg')}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* ========================================================
            LOWER CONTENT: Emergency Banner & 7 Metric Cards
            ======================================================== */}
        <View style={styles.bodyContent}>
          {/* Emergency Banner */}
          <EmergencyBanner announcements={announcements} />

          {/* Section Heading */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overview & Community Modules</Text>
            <Text style={styles.sectionSubtitle}>Tap any card to view details</Text>
          </View>

          {/* Loading Indicator */}
          {loading && !data ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.clay} />
              <Text style={styles.loadingText}>Loading resident dashboard...</Text>
            </View>
          ) : (
            <View style={styles.metricsContainer}>
              {/* 1. Announcements */}
              <MetricCard
                title="Announcements"
                count={announcements.length}
                subtitle="Active Circulars"
                iconName="bell"
                accentColor="#ef4444"
                bgLight="rgba(239, 68, 68, 0.12)"
                borderLight="rgba(239, 68, 68, 0.3)"
                onPress={() => navigation.navigate('Announcements')}
              />

              {/* 2. Committee */}
              <MetricCard
                title="Committee"
                count={committeeMembers.length}
                subtitle="Office Bearers"
                iconName="crown"
                accentColor="#f59e0b"
                bgLight="rgba(245, 158, 11, 0.12)"
                borderLight="rgba(245, 158, 11, 0.3)"
                onPress={() => navigation.navigate('Committee')}
              />

              {/* 3. Security Gates */}
              <MetricCard
                title="Security Gates"
                count={gates.length}
                subtitle="Active Checkpoints"
                iconName="shield"
                accentColor="#0284c7"
                bgLight="rgba(135, 206, 235, 0.22)"
                borderLight="rgba(135, 206, 235, 0.4)"
                onPress={() => navigation.navigate('Gates')}
              />

              {/* 4. Family Members */}
              <MetricCard
                title="Family Members"
                count={familyMembers.length || 3}
                subtitle="Household Residents"
                iconName="users"
                accentColor={THEME.colors.clay}
                bgLight="rgba(196, 154, 108, 0.15)"
                borderLight={THEME.colors.sand}
                onPress={() => navigation.navigate('FamilyMembers')}
              />

              {/* 5. Home Workers */}
              <MetricCard
                title="Home Workers"
                count={homeWorkers.length || 2}
                subtitle="Domestic Helpers"
                iconName="briefcase"
                accentColor={THEME.colors.fernGreen}
                bgLight="rgba(107, 142, 90, 0.15)"
                borderLight="rgba(107, 142, 90, 0.3)"
                onPress={() => navigation.navigate('Workers')}
              />

              {/* 6. Permissions */}
              <MetricCard
                title="Permissions"
                count={`${activePermissionsCount} / 4`}
                subtitle="Active Access Rules"
                iconName="check"
                accentColor={THEME.colors.clay}
                bgLight="rgba(196, 154, 108, 0.15)"
                borderLight={THEME.colors.sand}
                onPress={() => navigation.navigate('Permissions')}
              />

              {/* 7. Visitors */}
              <MetricCard
                title="Visitors"
                count={visitors.length}
                subtitle="Logged Entries"
                iconName="userCheck"
                accentColor="#0284c7"
                bgLight="rgba(135, 206, 235, 0.22)"
                borderLight="rgba(135, 206, 235, 0.4)"
                onPress={() => navigation.navigate('Visitors')}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110, // Margin for floating curved tab bar
  },

  /* Top Dark Header Section */
  darkHeader: {
    backgroundColor: '#342C26',
    paddingHorizontal: 20,
    paddingBottom: 104, // Space for top half of overlapping card
  },

  /* Left Side: Avatar, Name, and Role */
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    ...THEME.shadows.card,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  userInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  roleTag: {
    backgroundColor: 'rgba(196, 154, 108, 0.22)',
    borderWidth: 1,
    borderColor: '#C49A6C',
    borderRadius: THEME.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E8D5C4',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  /* Hero Title: Modern, Secure & Connected / Residential Living */
  heroTitleContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  heroTitleWhite: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  heroTitleClay: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.clay, // #C49A6C
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginTop: 2,
  },

  /* Overlapping Hero Card: Half on dark top part, half on body */
  heroCardOverlapWrapper: {
    paddingHorizontal: 20,
    marginTop: -90, // Pulls the 180px card up so 50% is on dark header, 50% on body
    marginBottom: 14,
    zIndex: 10,
    elevation: 8,
  },
  heroCard: {
    width: '100%',
    height: 180,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#2A221C',
    borderWidth: 1.5,
    borderColor: 'rgba(214, 194, 161, 0.45)',
    ...THEME.shadows.float,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  /* Lower Body Content */
  bodyContent: {
    padding: 16,
    paddingTop: 18,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  metricsContainer: {
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
});
