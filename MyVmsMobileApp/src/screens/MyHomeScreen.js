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
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { familyMemberApi } from '../services/apiServices';
import {
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  Megaphone,
  Briefcase,
  Award,
  Shield,
  DoorOpen,
  Users,
  ArrowRight,
  LogIn,
} from 'lucide-react-native';

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
  const rawSecurityCount = data?.securityStaffCount;
  const securityStaffCount = rawSecurityCount !== undefined && rawSecurityCount !== null
    ? rawSecurityCount
    : (() => {
      const guardSet = new Set();
      gates.forEach((g) => {
        (g.assigned_guards || []).forEach((guard) => {
          if (guard.security_staff_id) guardSet.add(guard.security_staff_id);
          else if (guard.security_name) guardSet.add(guard.security_name);
        });
      });
      return guardSet.size || (gates.length > 0 ? 2 : 0);
    })();

  const rawGateStats = data?.gateEntryStats;
  const gateStats = rawGateStats || (() => {
    const list = data?.visitors || [];
    let inside = 0;
    let outside = 0;
    list.forEach((v) => {
      const isOut = v.status === 'EXITED' || v.status === 'CHECKED_OUT' || !!v.check_out_time;
      if (isOut) outside++;
      else inside++;
    });
    return {
      total: list.length,
      inside,
      outside,
    };
  })();

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

  // Permission items for the rectangle card
  const permItems = [
    { label: 'Courier', active: courierActive, color: '#0284c7' },
    { label: 'Delivery', active: deliveryActive, color: THEME.colors.fernGreenDark },
    { label: 'Visitor', active: visitorActive, color: THEME.colors.clay },
    { label: 'Worker', active: workerActive, color: '#D97706' },
  ];

  // 6 KPI cards in Community Overview:
  // 1) Announcements, 2) Workers, 3) Committee, 4) Security Staff, 5) Society Gates, 6) Gate Entry
  const kpiCards = [
    {
      id: 'announcements',
      title: 'Announcements',
      count: announcements.length,
      subtitle: 'Circulars, notices & events',
      icon: Megaphone,
      color: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      screen: 'Announcements',
    },
    {
      id: 'workers',
      title: 'Workers',
      count: homeWorkers.length,
      subtitle: 'Domestic helpers & staff',
      icon: Briefcase,
      color: THEME.colors.fernGreenDark,
      iconBg: 'rgba(107, 142, 90, 0.15)',
      screen: 'Workers',
    },
    {
      id: 'committee',
      title: 'Committee',
      count: committeeMembers.length,
      subtitle: 'Society office bearers',
      icon: Award,
      color: THEME.colors.clay,
      iconBg: 'rgba(196, 154, 108, 0.2)',
      screen: 'Committee',
    },
    {
      id: 'security',
      title: 'Security Staff',
      count: securityStaffCount,
      subtitle: 'Guards on duty',
      icon: Shield,
      color: '#0284c7',
      iconBg: 'rgba(135, 206, 235, 0.25)',
      screen: 'Gates',
    },
    {
      id: 'gates',
      title: 'Society Gates',
      count: gates.length,
      subtitle: 'Active checkpoints',
      icon: DoorOpen,
      color: '#8B5CF6',
      iconBg: 'rgba(139, 92, 246, 0.15)',
      screen: 'Gates',
    },
    {
      id: 'gate_entry',
      title: 'Gate Entry',
      count: gateStats.total,
      insideCount: gateStats.inside,
      outsideCount: gateStats.outside,
      subtitle: `${gateStats.inside} Inside · ${gateStats.outside} Outside`,
      icon: LogIn,
      color: '#0D9488',
      iconBg: 'rgba(13, 148, 136, 0.15)',
      screen: 'GateEntryTab',
    },
  ];

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
            LOWER CONTENT
            ======================================================== */}
        <View style={styles.bodyContent}>

          {loading && !data ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.clay} />
              <Text style={styles.loadingText}>Loading resident dashboard...</Text>
            </View>
          ) : (
            <>
              {/* ========================================================
                  1. SOCIETY DETAILS CARD
                  ======================================================== */}
              <View style={styles.societyCard}>
                <View style={styles.societyCardHeader}>
                  <Text style={styles.societyCardLabel}>ACTIVE SOCIETY INFORMATION</Text>
                </View>

                <View style={styles.societyDivider} />

                <View style={styles.societyMainRow}>
                  <View style={styles.societyBadge}>
                    <Building2 size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.societyInfoCol}>
                    <View style={styles.societyNameRow}>
                      <Text style={styles.societyName} numberOfLines={1}>
                        {home.society_name || data?.society?.name || user?.societyName || ''}
                      </Text>
                      <View style={styles.codePill}>
                        <Text style={styles.codePillText}>
                          Code: {home.society_code || user?.societyCode || user?.society?.code || ''}
                        </Text>
                      </View>
                    </View>

                    {/* Address */}
                    <View style={styles.societyDetailRow}>
                      <View style={styles.societyDetailIcon}>
                        <MapPin size={12} color={THEME.colors.clay} />
                      </View>
                      <Text style={styles.societyDetailLabel}>Address:</Text>
                      <Text style={styles.societyDetailValue} numberOfLines={2}>
                        {home.society_address || user?.societyAddress || 'Vishwamitry Township (Wing B), Behind Vishwamitri Township / Opp. Surya Darshan Township, Manjalpur, Vadodara, Gujarat 390011'}
                      </Text>
                    </View>

                    {/* Office Contact */}
                    <View style={styles.societyDetailRow}>
                      <View style={styles.societyDetailIcon}>
                        <Phone size={12} color={THEME.colors.clay} />
                      </View>
                      <Text style={styles.societyDetailLabel}>Office:</Text>
                      <Text style={styles.societyDetailValue} numberOfLines={1}>
                        {home.society_contact || user?.societyContactNumber || '1234567890'}
                      </Text>
                    </View>

                    {/* Helpline */}
                    <View style={styles.societyDetailRow}>
                      <View style={[styles.societyDetailIcon, { backgroundColor: 'rgba(107, 142, 90, 0.15)' }]}>
                        <Phone size={12} color={THEME.colors.fernGreen} />
                      </View>
                      <Text style={styles.societyDetailLabel}>Helpline:</Text>
                      <Text style={styles.societyDetailValue} numberOfLines={1}>
                        {home.society_emergency || user?.societyEmergencyNumber || '1234567899'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ========================================================
                  2. PERMISSIONS RECTANGLE CARD
                  ======================================================== */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Permissions')}
                style={styles.permCard}
              >
                <View style={styles.permCardTop}>
                  <View style={styles.permCardTitleRow}>
                    <View style={styles.permIconBox}>
                      <ShieldCheck size={18} color={THEME.colors.clay} />
                    </View>
                    <View>
                      <Text style={styles.permCardTitle}>Access Rules & Permissions</Text>
                      <Text style={styles.permCardSubtitle}>{activePermissionsCount} of 4 permissions active</Text>
                    </View>
                  </View>
                  <ArrowRight size={16} color={THEME.colors.clay} />
                </View>

                <View style={styles.permItemsRow}>
                  {permItems.map((item) => (
                    <View key={item.label} style={styles.permItem}>
                      <View style={[
                        styles.permDot,
                        { backgroundColor: item.active ? item.color : '#D1D5DB' },
                      ]} />
                      <Text style={[
                        styles.permItemLabel,
                        { color: item.active ? THEME.colors.darkBrown : THEME.colors.textDim },
                      ]}>
                        {item.label}
                      </Text>
                      <Text style={[
                        styles.permItemStatus,
                        { color: item.active ? '#16a34a' : '#DC2626' },
                      ]}>
                        {item.active ? 'ON' : 'OFF'}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              {/* ========================================================
                  3. FAMILY MEMBERS HORIZONTAL SCROLL
                  ======================================================== */}
              <View style={styles.familySection}>
                <View style={styles.familySectionHeader}>
                  <Text style={styles.familySectionTitle}>Family Members</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('FamilyMembers')}
                    style={styles.familySeeAllBtn}
                  >
                    <Text style={styles.familySeeAllText}>See All</Text>
                    <ArrowRight size={13} color={THEME.colors.clay} />
                  </TouchableOpacity>
                </View>

                {familyMembers.length === 0 ? (
                  <View style={styles.familyEmptyCard}>
                    <Users size={28} color={THEME.colors.textDim} />
                    <Text style={styles.familyEmptyText}>No family members registered</Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.familyScrollContent}
                  >
                    {familyMembers.map((member) => {
                      const initial = (member.full_name || 'F').charAt(0).toUpperCase();
                      return (
                        <TouchableOpacity
                          key={member.id}
                          activeOpacity={0.85}
                          onPress={() => navigation.navigate('FamilyMembers')}
                          style={styles.familyMemberCard}
                        >
                          <View style={styles.familyAvatar}>
                            <Text style={styles.familyAvatarText}>{initial}</Text>
                          </View>
                          <Text style={styles.familyMemberName} numberOfLines={1}>
                            {member.full_name || 'Family'}
                          </Text>
                          <Text style={styles.familyMemberRelation} numberOfLines={1}>
                            {member.relationship || 'Member'}
                          </Text>
                          <View style={[
                            styles.familyStatusBadge,
                            { backgroundColor: member.status === 'ACTIVE' ? 'rgba(107, 142, 90, 0.15)' : 'rgba(220, 38, 38, 0.1)' },
                          ]}>
                            <Text style={[
                              styles.familyStatusText,
                              { color: member.status === 'ACTIVE' ? THEME.colors.fernGreenDark : '#DC2626' },
                            ]}>
                              {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* ========================================================
                  4. KPI CARDS (5 cards in grid)
                  ======================================================== */}
              <View style={styles.kpiSection}>
                <View style={styles.kpiSectionHeader}>
                  <Text style={styles.kpiSectionTitle}>Community Overview</Text>
                  <Text style={styles.kpiSectionSubtitle}>Tap any card to view details</Text>
                </View>

                <View style={styles.kpiGrid}>
                  {kpiCards.map((card) => {
                    const IconComp = card.icon;

                    return (
                      <TouchableOpacity
                        key={card.id}
                        activeOpacity={0.82}
                        onPress={() => navigation.navigate(card.screen)}
                        style={styles.kpiCard}
                      >
                        <View style={styles.kpiCardHeader}>
                          <Text style={styles.kpiCardTitle} numberOfLines={1}>
                            {card.title}
                          </Text>
                          <View style={[styles.kpiIconBox, { backgroundColor: card.iconBg }]}>
                            <IconComp size={16} color={card.color} />
                          </View>
                        </View>

                        <Text style={[styles.kpiCardCount, { color: card.color }]}>
                          {card.count}
                        </Text>

                        {card.insideCount !== undefined ? (
                          <View style={styles.kpiGateStatsRow}>
                            <View style={styles.kpiGateBadgeIn}>
                              <View style={styles.kpiGateDotGreen} />
                              <Text style={styles.kpiGateBadgeTextIn}>
                                {card.insideCount} Inside
                              </Text>
                            </View>
                            <View style={styles.kpiGateBadgeOut}>
                              <View style={styles.kpiGateDotGray} />
                              <Text style={styles.kpiGateBadgeTextOut}>
                                {card.outsideCount} Outside
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.kpiCardFooter}>
                            <Text style={styles.kpiCardSubtitle} numberOfLines={1}>
                              {card.subtitle}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
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
    paddingTop: 10,
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

  /* ========================================
     1. SOCIETY DETAILS CARD
     ======================================== */
  societyCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    padding: 16,
    marginBottom: 14,
    ...THEME.shadows.card,
  },
  societyCardHeader: {
    marginBottom: 10,
  },
  societyCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clay,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  societyDivider: {
    height: 1,
    backgroundColor: THEME.colors.sand,
    marginBottom: 14,
  },
  societyMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  societyBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  societyInfoCol: {
    flex: 1,
  },
  societyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  societyName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  codePill: {
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
    borderRadius: THEME.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.3)',
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.fernGreenDark,
  },
  societyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  societyDetailIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  societyDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginRight: 4,
  },
  societyDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
    flex: 1,
  },

  /* ========================================
     2. PERMISSIONS RECTANGLE CARD
     ======================================== */
  permCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    padding: 16,
    marginBottom: 14,
    ...THEME.shadows.card,
  },
  permCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  permCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  permCardSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  permItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
    paddingTop: 12,
  },
  permItem: {
    alignItems: 'center',
    flex: 1,
  },
  permDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  permItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  permItemStatus: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  /* ========================================
     3. FAMILY MEMBERS HORIZONTAL SCROLL
     ======================================== */
  familySection: {
    marginBottom: 14,
  },
  familySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  familySectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  familySeeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  familySeeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  familyScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  familyMemberCard: {
    width: 120,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    padding: 14,
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  familyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E8D5C4',
  },
  familyAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  familyMemberName: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    textAlign: 'center',
    marginBottom: 2,
  },
  familyMemberRelation: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  familyStatusBadge: {
    borderRadius: THEME.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  familyStatusText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  familyEmptyCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    padding: 24,
    alignItems: 'center',
    ...THEME.shadows.card,
  },
  familyEmptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 8,
  },

  /* ========================================
     4. KPI CARDS 2-COLUMN GRID (5 cards)
     ======================================== */
  kpiSection: {
    marginBottom: 16,
  },
  kpiSectionHeader: {
    marginBottom: 12,
  },
  kpiSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#403630',
  },
  kpiSectionSubtitle: {
    fontSize: 11,
    color: '#7C6E65',
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  kpiCard: {
    width: '48.2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.5)',
    shadowColor: '#C49A6C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 124,
    justifyContent: 'space-between',
  },
  kpiCardFull: {
    width: '100%',
    minHeight: 92,
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  kpiFullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiFullLeft: {
    flex: 1,
    paddingRight: 10,
  },
  kpiFullTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiFullRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  kpiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kpiCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#403630',
    flex: 1,
    paddingRight: 4,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiCardCount: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 4,
  },
  kpiCardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
    paddingTop: 6,
    marginTop: 4,
  },
  kpiCardSubtitle: {
    fontSize: 10.5,
    color: '#7C6E65',
    lineHeight: 14,
  },
  kpiCardViewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
  },
  kpiCardViewText: {
    fontSize: 11,
    fontWeight: '800',
  },
  kpiGateStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
    paddingTop: 6,
    flexWrap: 'wrap',
  },
  kpiGateBadgeIn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  kpiGateDotGreen: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 3,
  },
  kpiGateBadgeTextIn: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#047857',
  },
  kpiGateBadgeOut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(100, 116, 139, 0.35)',
  },
  kpiGateDotGray: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#64748B',
    marginRight: 3,
  },
  kpiGateBadgeTextOut: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },
});
