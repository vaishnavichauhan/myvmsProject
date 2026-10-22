import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import {
  Layers,
  Clock,
  Activity,
  Users,
  Truck,
  Home,
  Shield,
  Bell,
  Car,
  Settings,
  FileText,
  UserCheck,
  Building2,
  DoorOpen,
  Award,
  ShieldCheck,
  Briefcase,
  Megaphone,
} from 'lucide-react-native';
import { adminApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const AdminDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  const fetchAdminDashboard = async () => {
    try {
      const res = await adminApi.getAdminDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.log('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const stats = data?.stats || data?.metrics || {
    totalHomes: 2,
    occupiedHomes: 2,
    vacantHomes: 0,
    owners: 2,
    tenants: 0,
    familyMembers: 2,
    securityStaff: 6,
    workers: 0,
    committeeMembers: 1,
    announcements: 0,
    todayVisitors: 0,
    todayDeliveries: 0,
    todayGateEntries: 0,
  };
  const metrics = data?.metrics || data?.stats || {};
  const occupancy = data?.occupancyBreakdown || data?.occupancy || {
    total: 2,
    occupied: 2,
    vacant: 0,
    ownerOccupied: 2,
    tenantOccupied: 0,
    occupancyPercentage: 100,
  };

  const totalHomesCount = stats.totalHomes || occupancy.total || 2;
  const ownerCount = occupancy.ownerOccupied !== undefined ? occupancy.ownerOccupied : (stats.owners || 2);
  const tenantCount = occupancy.tenantOccupied !== undefined ? occupancy.tenantOccupied : (stats.tenants || 0);
  const vacantCount = occupancy.vacant !== undefined ? occupancy.vacant : (stats.vacantHomes || 0);
  const occupiedCount = occupancy.occupied !== undefined ? occupancy.occupied : (ownerCount + tenantCount);

  const ownerPercent = totalHomesCount > 0 ? Math.round((ownerCount / totalHomesCount) * 100) : 0;
  const tenantPercent = totalHomesCount > 0 ? Math.round((tenantCount / totalHomesCount) * 100) : 0;
  const vacantPercent = totalHomesCount > 0 ? Math.round((vacantCount / totalHomesCount) * 100) : 0;
  const occupancyPercent = occupancy.occupancyPercentage !== undefined
    ? occupancy.occupancyPercentage
    : (totalHomesCount > 0 ? Math.round((occupiedCount / totalHomesCount) * 100) : 100);

  const totalResidents = (stats.owners || 0) + (stats.tenants || 0) + (stats.familyMembers || 0);
  const staffTotal = (stats.securityStaff || 0) + (stats.workers || 0);

  const activities = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
  const visitorCount = activities.filter((a) => a.type?.startsWith('VISITOR')).length || (stats.todayVisitors || 0);
  const deliveryCount = activities.filter((a) => a.type?.startsWith('DELIVERY')).length || (stats.todayDeliveries || 0);
  const residentCount = activities.filter((a) => a.type === 'NEW_RESIDENT').length || (stats.owners || 0);
  const workerCount = activities.filter((a) => a.type === 'NEW_WORKER').length || (stats.workers || stats.securityStaff || 0);
  const announcementCount = activities.filter((a) => a.type === 'COMMITTEE_ANNOUNCEMENT').length || 0;
  const totalActivitiesCount = activities.length > 0
    ? activities.length
    : (visitorCount + deliveryCount + residentCount + workerCount + announcementCount);

  const societyStatCards = [
    {
      id: 'total-homes',
      title: 'Total Homes',
      value: stats.totalHomes ?? totalHomesCount,
      subtitle: 'All registered units in society',
      valueColor: '#403630',
      icon: Building2,
      iconColor: THEME.colors.clay,
      iconBg: 'rgba(196, 154, 108, 0.15)',
      screen: 'Settings',
    },
    {
      id: 'occupied-homes',
      title: 'Occupied Homes',
      value: stats.occupiedHomes ?? occupiedCount,
      subtitle: `${occupancyPercent}% Occupancy rate`,
      valueColor: THEME.colors.fernGreenDark,
      icon: Home,
      iconColor: THEME.colors.fernGreenDark,
      iconBg: 'rgba(107, 142, 90, 0.15)',
      screen: 'Residents',
    },
    {
      id: 'vacant-homes',
      title: 'Vacant Homes',
      value: stats.vacantHomes ?? vacantCount,
      subtitle: `${vacantPercent}% Ready for allotment`,
      valueColor: THEME.colors.clay,
      icon: DoorOpen,
      iconColor: THEME.colors.clay,
      iconBg: 'rgba(214, 194, 161, 0.25)',
      screen: 'Residents',
    },
    {
      id: 'owners',
      title: 'Owners',
      value: stats.owners ?? ownerCount,
      subtitle: 'Primary property deed holders',
      valueColor: '#403630',
      icon: Award,
      iconColor: THEME.colors.clay,
      iconBg: 'rgba(196, 154, 108, 0.18)',
      screen: 'Residents',
    },
    {
      id: 'tenants',
      title: 'Tenants',
      value: stats.tenants ?? tenantCount,
      subtitle: 'Verified active lease holders',
      valueColor: '#0284c7',
      icon: Users,
      iconColor: '#0284c7',
      iconBg: 'rgba(135, 206, 235, 0.25)',
      screen: 'Residents',
    },
    // {
    //   id: 'family-members',
    //   title: 'Family Members',
    //   value: stats.familyMembers ?? 2,
    //   subtitle: 'Verified household dependents',
    //   valueColor: '#403630',
    //   icon: UserCheck,
    //   iconColor: THEME.colors.clay,
    //   iconBg: 'rgba(196, 154, 108, 0.15)',
    //   screen: 'FamilyMembers',
    // },
    {
      id: 'security-staff',
      title: 'Security Staff',
      value: stats.securityStaff ?? 2,
      subtitle: 'Guards & gate supervisors',
      valueColor: '#0284c7',
      icon: ShieldCheck,
      iconColor: '#0284c7',
      iconBg: 'rgba(135, 206, 235, 0.25)',
      screen: 'Gates',
    },
    {
      id: 'workers',
      title: 'Workers',
      value: stats.workers ?? 4,
      subtitle: 'Drivers, maids & daily helpers',
      valueColor: THEME.colors.fernGreenDark,
      icon: Briefcase,
      iconColor: THEME.colors.fernGreenDark,
      iconBg: 'rgba(107, 142, 90, 0.15)',
      screen: 'Workers',
    },
    {
      id: 'committee-members',
      title: 'Committee Members',
      value: stats.committeeMembers ?? 1,
      subtitle: 'President, Secretary, Treasurer',
      valueColor: THEME.colors.clay,
      icon: Award,
      iconColor: THEME.colors.clay,
      iconBg: 'rgba(196, 154, 108, 0.2)',
      screen: 'Committee',
    },
    {
      id: 'announcements',
      title: 'Announcements',
      value: stats.announcements ?? (announcementCount || 0),
      subtitle: 'Circulars, notices & events',
      valueColor: '#f59e0b',
      icon: Megaphone,
      iconColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      screen: 'Announcements',
    },
    {
      id: 'today-visitors',
      title: "Today's Visitors",
      value: stats.todayVisitors ?? 0,
      subtitle: 'Guest passes logged today',
      valueColor: THEME.colors.fernGreenDark,
      icon: Users,
      iconColor: THEME.colors.fernGreenDark,
      iconBg: 'rgba(107, 142, 90, 0.15)',
      screen: 'Visitors',
    },
    {
      id: 'today-deliveries',
      title: "Today's Deliveries",
      value: stats.todayDeliveries ?? 0,
      subtitle: 'Packages & parcel agents',
      valueColor: THEME.colors.clay,
      icon: Truck,
      iconColor: THEME.colors.clay,
      iconBg: 'rgba(196, 154, 108, 0.15)',
      screen: 'CourierDelivery',
    },
    {
      id: 'today-gate-entries',
      title: "Today's Gate Entries",
      value: stats.todayGateEntries ?? 0,
      subtitle: 'Perimeter barrier audit logs',
      valueColor: '#0284c7',
      icon: Activity,
      iconColor: '#0284c7',
      iconBg: 'rgba(135, 206, 235, 0.25)',
      screen: 'Gates',
    },
  ];

  const quickShortcuts = [
    { name: 'Society Settings', screen: 'Settings', icon: Settings, label: 'Configure rules, policies & permissions' },
    { name: 'Audit Reports', screen: 'Reports', icon: FileText, label: 'Export activity records & analytics' },
  ];

  const userInitial = (user?.fullName || user?.full_name || 'A').charAt(0).toUpperCase();

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
            onRefresh={() => {
              setRefreshing(true);
              fetchAdminDashboard();
            }}
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
                {user?.fullName || 'System Administrator'}
              </Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>
                  ADMIN
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

        {/* Lower Body Content */}
        <View style={styles.bodyContent}>
          {loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={THEME.colors.clay} />
              <Text style={styles.loadingText}>Fetching admin analytics...</Text>
            </View>
          ) : (
            <>
              {/* Society Overview Metrics - 3 Interactive Cards with Horizontal Scrollbar */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.sectionIconBox}>
                    <Layers size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.sectionTitleCol}>
                    <Text style={styles.sectionHeading}>Society Overview Metrics</Text>
                    <Text style={styles.sectionSubHeading} numberOfLines={1}>
                      Visual analytics & operational counters
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView
                horizontal
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                persistentScrollbar={true}
                snapToInterval={317}
                decelerationRate="fast"
                contentContainerStyle={styles.cardsScrollContent}
                style={styles.cardsScrollView}
              >
                {/* ========================================================
                    Card 1: Society Occupancy Status
                    ======================================================== */}
                <View style={styles.overviewCard}>
                  <View>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardTitleCol}>
                        <Text style={styles.cardMainTitle}>Society Occupancy Status</Text>
                        <Text style={styles.cardSubtitle}>
                          Total Real Estate Capacity: {totalHomesCount} Units
                        </Text>
                      </View>
                      <View style={styles.greenBadge}>
                        <Text style={styles.greenBadgeText}>{occupancyPercent}% Occupied</Text>
                      </View>
                    </View>

                    {/* Segmented Distribution Bar */}
                    <View style={styles.segmentedBar}>
                      {ownerPercent > 0 && (
                        <View style={[styles.barSegment, { width: `${ownerPercent}%`, backgroundColor: THEME.colors.clay }]} />
                      )}
                      {tenantPercent > 0 && (
                        <View style={[styles.barSegment, { width: `${tenantPercent}%`, backgroundColor: THEME.colors.skyBlue }]} />
                      )}
                      {vacantPercent > 0 && (
                        <View style={[styles.barSegment, { width: `${vacantPercent}%`, backgroundColor: THEME.colors.sand }]} />
                      )}
                    </View>

                    {/* Legend */}
                    <View style={styles.legendRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: THEME.colors.clay }]} />
                        <Text style={styles.legendLabel}>Owner: </Text>
                        <Text style={styles.legendBold}>{ownerCount} ({ownerPercent}%)</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: THEME.colors.skyBlue }]} />
                        <Text style={styles.legendLabel}>Tenant: </Text>
                        <Text style={styles.legendBold}>{tenantCount} ({tenantPercent}%)</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: THEME.colors.sand }]} />
                        <Text style={styles.legendLabel}>Vacant: </Text>
                        <Text style={styles.legendBold}>{vacantCount} ({vacantPercent}%)</Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer Well */}
                  <View style={styles.cardFooterWell}>
                    <Text style={styles.cardFooterLabel}>Allotment Velocity</Text>
                    <Text style={[styles.cardFooterValue, { color: THEME.colors.fernGreenDark }]}>
                      {stats.liveUnits ? `${stats.liveUnits} of ${stats.totalUnits || totalHomesCount} Units Live` : '6 of 7 Units Live'}
                    </Text>
                  </View>
                </View>

                {/* ========================================================
                    Card 2: Community Population
                    ======================================================== */}
                <View style={styles.overviewCard}>
                  <View>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardTitleCol}>
                        <Text style={styles.cardMainTitle}>Community Population</Text>
                        <Text style={styles.cardSubtitle}>
                          Residents, Staff & Committee Members
                        </Text>
                      </View>
                      <View style={styles.clayBadge}>
                        <Text style={styles.clayBadgeText}>{totalResidents} Residents Total</Text>
                      </View>
                    </View>

                    {/* 3 Demographic Progress Rows */}
                    <View style={styles.demographicList}>
                      <View style={styles.demoItem}>
                        <View style={styles.demoItemHeader}>
                          <Text style={styles.demoItemLabel}>Residents (Owners & Tenants)</Text>
                          <Text style={styles.demoItemValue}>{(stats.owners || 0) + (stats.tenants || 0)}</Text>
                        </View>
                        <View style={styles.demoTrack}>
                          <View style={[styles.demoFill, { width: `${Math.min(100, Math.max(10, (((stats.owners || 0) + (stats.tenants || 0)) / 15) * 100))}%`, backgroundColor: THEME.colors.clay }]} />
                        </View>
                      </View>

                      <View style={styles.demoItem}>
                        <View style={styles.demoItemHeader}>
                          <Text style={styles.demoItemLabel}>Household Family Members</Text>
                          <Text style={styles.demoItemValue}>{stats.familyMembers || 0}</Text>
                        </View>
                        <View style={styles.demoTrack}>
                          <View style={[styles.demoFill, { width: `${Math.min(100, Math.max(10, ((stats.familyMembers || 0) / 15) * 100))}%`, backgroundColor: THEME.colors.skyBlueDark }]} />
                        </View>
                      </View>

                      <View style={styles.demoItem}>
                        <View style={styles.demoItemHeader}>
                          <Text style={styles.demoItemLabel}>Security & Helpers (Staff)</Text>
                          <Text style={styles.demoItemValue}>{staffTotal}</Text>
                        </View>
                        <View style={styles.demoTrack}>
                          <View style={[styles.demoFill, { width: `${Math.min(100, Math.max(10, (staffTotal / 15) * 100))}%`, backgroundColor: THEME.colors.fernGreenDark }]} />
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Footer Well */}
                  <View style={styles.cardFooterWell}>
                    <Text style={styles.cardFooterLabel}>Committee Board</Text>
                    <Text style={[styles.cardFooterValue, { color: THEME.colors.clay }]}>
                      {stats.committeeMembers || 1} Active Members
                    </Text>
                  </View>
                </View>

                {/* ========================================================
                    Card 3: Today's Gate Movement
                    ======================================================== */}
                <View style={styles.overviewCard}>
                  <View>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.cardTitleCol}>
                        <Text style={styles.cardMainTitle}>Today's Gate Movement</Text>
                        <Text style={styles.cardSubtitle}>
                          Perimeter Security Barrier Activity
                        </Text>
                      </View>
                      <View style={styles.skyBadge}>
                        <Text style={styles.skyBadgeText}>{stats.todayGateEntries || 0} Gate Passes</Text>
                      </View>
                    </View>

                    {/* 3 Metric Stat Boxes in Row */}
                    <View style={styles.gateBoxesRow}>
                      <View style={[styles.gateBox, { backgroundColor: 'rgba(107, 142, 90, 0.1)', borderColor: 'rgba(107, 142, 90, 0.25)' }]}>
                        <Text style={[styles.gateBoxNum, { color: THEME.colors.fernGreenDark }]}>{stats.todayVisitors || 0}</Text>
                        <Text style={styles.gateBoxLabel}>Visitors</Text>
                      </View>

                      <View style={[styles.gateBox, { backgroundColor: 'rgba(196, 154, 108, 0.12)', borderColor: THEME.colors.sand }]}>
                        <Text style={[styles.gateBoxNum, { color: THEME.colors.clay }]}>{stats.todayDeliveries || 0}</Text>
                        <Text style={styles.gateBoxLabel}>Deliveries</Text>
                      </View>

                      <View style={[styles.gateBox, { backgroundColor: 'rgba(135, 206, 235, 0.15)', borderColor: 'rgba(135, 206, 235, 0.4)' }]}>
                        <Text style={[styles.gateBoxNum, { color: THEME.colors.skyBlueDark }]}>{stats.todayGateEntries || 0}</Text>
                        <Text style={styles.gateBoxLabel}>Barrier Logs</Text>
                      </View>
                    </View>
                  </View>

                  {/* Footer Well */}
                  <View style={styles.cardFooterWell}>
                    <Text style={styles.cardFooterLabel}>Gate Shift</Text>
                    <Text style={[styles.cardFooterValue, { color: THEME.colors.fernGreenDark }]}>
                      Main Gate 1 • Armed
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* ========================================================
                  Recent Activity Audit Section - Horizontal Scroll
                  ======================================================== */}
              <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.sectionIconBox, { backgroundColor: THEME.colors.clay }]}>
                    <Clock size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.sectionTitleCol}>
                    <Text style={styles.sectionHeading}>Recent Activity</Text>
                    <Text style={styles.sectionSubHeading} numberOfLines={1}>
                      Audit overview & total log count of recorded society events
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView
                horizontal
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                persistentScrollbar={true}
                contentContainerStyle={styles.cardsScrollContent}
                style={styles.cardsScrollView}
              >
                {/* Main Total Activities Card */}
                <View style={styles.activityFeaturedCard}>
                  <View style={styles.activityFeaturedTopRow}>
                    <View style={styles.activityFeaturedIconBox}>
                      <Activity size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.activityCounterPill}>
                      <Text style={styles.activityCounterPillText}>Total Audit</Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.activityFeaturedUpperLabel}>TOTAL SYSTEM ACTIVITIES</Text>
                    <View style={styles.activityFeaturedNumRow}>
                      <Text style={styles.activityFeaturedBigNum}>{totalActivitiesCount}</Text>
                      <Text style={styles.activityFeaturedEventsLabel}>Recorded Events</Text>
                    </View>
                  </View>

                  <View style={styles.activityCardFooterWell}>
                    <Text style={styles.activityCardFooterText}>Real-time activity audit counter</Text>
                  </View>
                </View>

                {/* Breakdown Card 1: Visitor Entries */}
                <View style={styles.activityMiniCard}>
                  <View>
                    <View style={[styles.activityMiniIconBox, { backgroundColor: 'rgba(196, 154, 108, 0.15)' }]}>
                      <Users size={20} color={THEME.colors.clay} />
                    </View>
                    <Text style={styles.activityMiniLabel}>VISITOR ENTRIES</Text>
                    <Text style={styles.activityMiniCount}>{visitorCount}</Text>
                  </View>
                  <View style={styles.activityMiniFooter}>
                    <Text style={styles.activityMiniFooterText}>Gate check-ins</Text>
                  </View>
                </View>

                {/* Breakdown Card 2: Deliveries */}
                <View style={styles.activityMiniCard}>
                  <View>
                    <View style={[styles.activityMiniIconBox, { backgroundColor: 'rgba(196, 154, 108, 0.15)' }]}>
                      <Truck size={20} color={THEME.colors.clay} />
                    </View>
                    <Text style={styles.activityMiniLabel}>DELIVERIES</Text>
                    <Text style={styles.activityMiniCount}>{deliveryCount}</Text>
                  </View>
                  <View style={styles.activityMiniFooter}>
                    <Text style={styles.activityMiniFooterText}>Courier drop-offs</Text>
                  </View>
                </View>

                {/* Breakdown Card 3: Residents */}
                <View style={styles.activityMiniCard}>
                  <View>
                    <View style={[styles.activityMiniIconBox, { backgroundColor: 'rgba(107, 142, 90, 0.15)' }]}>
                      <Home size={20} color={THEME.colors.fernGreenDark} />
                    </View>
                    <Text style={styles.activityMiniLabel}>RESIDENTS</Text>
                    <Text style={styles.activityMiniCount}>{residentCount}</Text>
                  </View>
                  <View style={styles.activityMiniFooter}>
                    <Text style={styles.activityMiniFooterText}>Owners & tenants</Text>
                  </View>
                </View>

                {/* Breakdown Card 4: Workers & Staff */}
                <View style={styles.activityMiniCard}>
                  <View>
                    <View style={[styles.activityMiniIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
                      <Shield size={20} color={THEME.colors.skyBlueDark} />
                    </View>
                    <Text style={styles.activityMiniLabel}>WORKERS & STAFF</Text>
                    <Text style={styles.activityMiniCount}>{workerCount}</Text>
                  </View>
                  <View style={styles.activityMiniFooter}>
                    <Text style={styles.activityMiniFooterText}>Service personnel</Text>
                  </View>
                </View>

                {/* Breakdown Card 5: Announcements */}
                <View style={styles.activityMiniCard}>
                  <View>
                    <View style={[styles.activityMiniIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                      <Bell size={20} color="#ca8a04" />
                    </View>
                    <Text style={styles.activityMiniLabel}>ANNOUNCEMENTS</Text>
                    <Text style={styles.activityMiniCount}>{announcementCount}</Text>
                  </View>
                  <View style={styles.activityMiniFooter}>
                    <Text style={styles.activityMiniFooterText}>Circulars posted</Text>
                  </View>
                </View>
              </ScrollView>

              {/* ========================================================
                  Society Management Modules - 12 Metric Cards (Frontend Design)
                  ======================================================== */}
              <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.sectionIconBox, { backgroundColor: THEME.colors.darkBrown }]}>
                    <Building2 size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.sectionTitleCol}>
                    <Text style={styles.sectionHeading}>Society Management Modules</Text>
                    <Text style={styles.sectionSubHeading} numberOfLines={1}>
                      Key operational counters & society modules
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.statCardsGrid}>
                {societyStatCards.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => navigation.navigate(item.screen)}
                      style={styles.statModuleCard}
                      activeOpacity={0.8}
                    >
                      <View style={styles.statCardHeader}>
                        <Text style={styles.statCardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={[styles.statCardIconBox, { backgroundColor: item.iconBg }]}>
                          <IconComponent size={16} color={item.iconColor} />
                        </View>
                      </View>

                      <Text style={[styles.statCardValue, { color: item.valueColor }]}>
                        {item.value}
                      </Text>

                      <Text style={styles.statCardSubtitle} numberOfLines={2}>
                        {item.subtitle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
    paddingBottom: 110,
  },
  /* Top Dark Header Section */
  darkHeader: {
    backgroundColor: '#342C26',
    paddingHorizontal: 20,
    paddingBottom: 104, // Space for top half of overlapping card
  },
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
  bodyContent: {
    padding: 16,
    paddingTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  sectionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    ...THEME.shadows.card,
  },
  sectionTitleCol: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  sectionSubHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  swipeBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.16)',
    borderWidth: 1,
    borderColor: THEME.colors.clay,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
  },
  swipeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clayDark,
  },

  /* 3 Horizontal Overview Cards */
  cardsScrollView: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  cardsScrollContent: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  overviewCard: {
    width: 305,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    justifyContent: 'space-between',
    ...THEME.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  cardMainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  greenBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.3)',
  },
  greenBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.fernGreenDark,
  },
  clayBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
  },
  clayBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  skyBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(135, 206, 235, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.4)',
  },
  skyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.skyBlueDark,
  },

  /* Segmented Bar & Legend */
  segmentedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: THEME.colors.background,
    marginBottom: 12,
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  legendBold: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },

  /* Demographics list */
  demographicList: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 14,
  },
  demoItem: {
    flexDirection: 'column',
  },
  demoItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  demoItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  demoItemValue: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  demoTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.background,
    overflow: 'hidden',
  },
  demoFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Gate Boxes */
  gateBoxesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  gateBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  gateBoxNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  gateBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  /* Card Footer Well */
  cardFooterWell: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardFooterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  cardFooterValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  statCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: 12,
  },
  statModuleCard: {
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
    minHeight: 126,
    justifyContent: 'space-between',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#403630',
    flex: 1,
    paddingRight: 4,
  },
  statCardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardValue: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 4,
  },
  statCardSubtitle: {
    fontSize: 10.5,
    color: '#7C6E65',
    lineHeight: 14,
  },
  quickShortcutsRow: {
    marginTop: 14,
    marginBottom: 24,
    gap: 10,
  },
  quickShortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.4)',
    shadowColor: '#C49A6C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  quickShortcutIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickShortcutName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#403630',
  },
  quickShortcutLabel: {
    fontSize: 11,
    color: '#7C6E65',
    marginTop: 2,
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

  /* Recent Activity Section & Cards */
  activityFeaturedCard: {
    width: 275,
    minHeight: 165,
    backgroundColor: '#FAF6EE',
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    borderRadius: THEME.radius.xl,
    padding: 16,
    justifyContent: 'space-between',
    ...THEME.shadows.card,
  },
  activityFeaturedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityFeaturedIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.card,
  },
  activityCounterPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    backgroundColor: 'rgba(196, 154, 108, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.35)',
  },
  activityCounterPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.clayDark,
  },
  activityFeaturedUpperLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.clay,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  activityFeaturedNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 3,
  },
  activityFeaturedBigNum: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
  },
  activityFeaturedEventsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  activityCardFooterWell: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.45)',
  },
  activityCardFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  activityMiniCard: {
    width: 165,
    minHeight: 165,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: THEME.radius.xl,
    padding: 16,
    justifyContent: 'space-between',
    ...THEME.shadows.card,
  },
  activityMiniIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activityMiniLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  activityMiniCount: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 4,
  },
  activityMiniFooter: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.35)',
  },
  activityMiniFooterText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
});
