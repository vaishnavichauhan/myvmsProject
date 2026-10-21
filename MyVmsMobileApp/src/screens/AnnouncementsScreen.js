import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { announcementApi } from '../services/apiServices';
import {
  Megaphone,
  Pin,
  Sparkles,
  AlertTriangle,
  Wrench,
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Info,
  Paperclip,
  Search,
  X,
  ChevronLeft,
} from 'lucide-react-native';

const ANNOUNCEMENT_CONFIG = {
  GENERAL: {
    label: 'General Notice',
    icon: Megaphone,
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  FESTIVAL: {
    label: 'Festival & Events',
    icon: Sparkles,
    color: '#D97706',
    bgColor: 'rgba(217, 119, 6, 0.12)',
    borderColor: 'rgba(217, 119, 6, 0.35)',
  },
  EMERGENCY: {
    label: 'Emergency Alert',
    icon: AlertTriangle,
    color: '#DC2626',
    bgColor: 'rgba(220, 38, 38, 0.14)',
    borderColor: 'rgba(220, 38, 38, 0.45)',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    icon: Wrench,
    color: '#0284C7',
    bgColor: 'rgba(2, 132, 199, 0.12)',
    borderColor: 'rgba(2, 132, 199, 0.35)',
  },
  MEETING: {
    label: 'Society Meeting',
    icon: Users,
    color: '#7C3AED',
    bgColor: 'rgba(124, 58, 237, 0.12)',
    borderColor: 'rgba(124, 58, 237, 0.35)',
  },
  IMPORTANT: {
    label: 'Important Advisory',
    icon: ShieldCheck,
    color: '#EA580C',
    bgColor: 'rgba(234, 88, 12, 0.12)',
    borderColor: 'rgba(234, 88, 12, 0.35)',
  },
};

const getPriorityColor = (priority, isEmergency) => {
  const p = (priority || (isEmergency ? 'URGENT' : 'MEDIUM')).toUpperCase();
  switch (p) {
    case 'URGENT':
      return '#DC2626'; // Alert Red
    case 'HIGH':
      return '#EA580C'; // Flame Orange
    case 'MEDIUM':
      return '#D97706'; // Golden Amber
    case 'LOW':
      return '#16A34A'; // Forest Green
    default:
      return THEME.colors.clay;
  }
};

const formatAnnouncementDate = (dateStr) => {
  if (!dateStr) return 'Recent';
  try {
    const clean = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
    const d = new Date(clean);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
};

export const AnnouncementsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await announcementApi.getAnnouncements();
      const list = res?.data?.announcements || res?.announcements || res?.data || [];
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Error fetching announcements:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const categories = ['ALL', 'EMERGENCY', 'FESTIVAL', 'MAINTENANCE', 'MEETING', 'GENERAL'];

  const filtered = announcements.filter((item) => {
    const rawType = (item.type || item.category || 'GENERAL').toUpperCase();
    if (category !== 'ALL' && rawType !== category) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const title = (item.title || '').toLowerCase();
      const desc = (item.description || item.content || '').toLowerCase();
      const author = (item.created_by || item.posted_by || item.author_name || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || author.includes(q);
    }
    return true;
  });

  const renderAnnouncementItem = ({ item }) => {
    const rawType = (item.type || item.category || 'GENERAL').toUpperCase();
    const config = ANNOUNCEMENT_CONFIG[rawType] || ANNOUNCEMENT_CONFIG.GENERAL;
    const TypeIcon = config.icon;
    const isEmergency = rawType === 'EMERGENCY' || item.priority === 'URGENT' || item.is_emergency;
    const isFestival = rawType === 'FESTIVAL';
    const iconColor = getPriorityColor(item.priority, isEmergency);

    return (
      <View style={styles.cardWrapper}>
        {/* 1. TOP-LEFT BIG ANNOUNCEMENT ICON SLIDING UP OUTSIDE THE CARD */}
        <View style={styles.floatingIconContainer}>
          <View
            style={[

              {
                // backgroundColor: iconColor + '18',
                borderColor: iconColor,
                shadowColor: iconColor,
              },
            ]}
          >
            <Image
              source={require('../assets/images/anoucement.png')}
              style={[styles.floatingIconImg, { tintColor: iconColor }]}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* 2. PINNED NOTE CARD BODY */}
        <View
          style={[
            styles.cardBody,
            isEmergency && styles.cardBodyEmergency,
            isFestival && styles.cardBodyFestival,
          ]}
        >
          {/* 3. RIGHT SIDE HEADER: TITLE OF ANNOUNCEMENT & META */}
          <View style={styles.headerSection}>
            <View style={styles.metaRow}>
              {/* Type Badge */}
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: config.bgColor,
                    borderColor: config.borderColor,
                  },
                ]}
              >
                {/* Title */}
                <Text
                  style={[
                    styles.announcementTitle,
                    isEmergency && styles.announcementTitleEmergency,
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>

              {/* Date */}
              <View style={styles.dateRow}>
                <Calendar size={12} color={THEME.colors.clay} />
                <Text style={styles.dateText}>
                  {formatAnnouncementDate(item.date || item.created_at)}
                </Text>
              </View>
            </View>

            <Text style={[styles.typeBadgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>

          {/* 4. PINNED NOTE CARD BOX (Paper Card Box) */}
          <View style={styles.noteBox}>
            {/* Push Pin on Right Side */}
            <View style={styles.pushPinContainer}>
              <Pin size={22} color="#B45309" fill="#F59E0B" />
            </View>

            {/* Note Sub-header */}
            <View style={styles.noteHeaderRow}>
              <Info size={13} color={THEME.colors.clay} />
              <Text style={styles.noteHeaderText}>
                OFFICIAL CIRCULAR NOTES & MESSAGE
              </Text>
            </View>

            {/* Description Content */}
            <Text style={styles.noteBodyText}>
              {item.description || item.content}
            </Text>
          </View>

          {/* 5. OPTIONAL ATTACHMENT */}
          {item.attachment_url ? (
            <View style={styles.attachmentBox}>
              <Image
                source={{ uri: item.attachment_url }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
              <View style={styles.attachmentFooter}>
                <Paperclip size={12} color={THEME.colors.clay} />
                <Text style={styles.attachmentFooterText}>
                  Official Attachment
                </Text>
              </View>
            </View>
          ) : null}

          {/* 6. FOOTER: AUTHOR & DETAILS */}
          <View style={styles.cardFooter}>
            <View style={styles.authorRow}>
              <Text style={styles.postedByLabel}>Posted By:</Text>
              <Text style={styles.authorName}>
                {item.created_by || item.posted_by || item.author_name || 'Society Office'}
              </Text>
              {item.valid_until ? (
                <View style={styles.validUntilRow}>
                  <Clock size={11} color={THEME.colors.clay} />
                  <Text style={styles.validUntilText}>
                    Valid: {formatAnnouncementDate(item.valid_until)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Optional Committee Pill */}
            {(item.committee_name || item.committee_position) ? (
              <View style={styles.committeeRow}>
                {item.committee_name ? (
                  <View style={styles.committeePill}>
                    <Text style={styles.committeePillText}>
                      {item.committee_name}
                    </Text>
                  </View>
                ) : null}
                {item.committee_position ? (
                  <View style={styles.positionPill}>
                    <Text style={styles.positionPillText}>
                      {item.committee_position}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      {/* Top Dark Header (Identical to Gate Entry UI) */}
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
              <Text style={styles.headerTitle}>Announcements</Text>
            </View>
          </View>
        </View>

        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Search size={18} color={THEME.colors.clay} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search circulars, events, meetings..."
            placeholderTextColor="rgba(255, 255, 255, 0.55)"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setCategory(item)}
              style={[styles.tabChip, category === item && styles.tabChipActive]}
            >
              <Text style={[styles.tabText, category === item && styles.tabTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading announcements...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderAnnouncementItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAnnouncements();
              }}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Megaphone size={34} color={THEME.colors.clay} />
              </View>
              <Text style={styles.emptyTitle}>No Announcements Posted</Text>
              <Text style={styles.emptySubtitle}>There are no circulars or notices under this category.</Text>
            </View>
          }
        />
      )}
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
    marginBottom: 14,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  tabsWrapper: {
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(214, 194, 161, 0.4)',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    backgroundColor: 'rgba(214, 194, 161, 0.2)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabChipActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clayDark,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  tabTextActive: {
    color: THEME.colors.white,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  /* Card Layout */
  cardWrapper: {
    position: 'relative',
    paddingTop: 18,
    marginBottom: 16,
  },
  floatingIconContainer: {
    position: 'absolute',
    top: 4,
    left: 14,
    zIndex: 10,
    elevation: 6,
  },

  floatingIconImg: {
    width: 40,
    height: 40,
    transform: [{ rotate: '-6deg' }],
  },
  cardBody: {
    backgroundColor: '#FFFCF7',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(214, 194, 161, 0.65)',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: '#8B5A2B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardBodyEmergency: {
    borderColor: '#EF4444',
    borderWidth: 2,
    backgroundColor: '#FFF8F8',
  },
  cardBodyFestival: {
    backgroundColor: '#FFFDF5',
  },
  headerSection: {
    paddingLeft: 32,
    minHeight: 46,
    justifyContent: 'center',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  announcementTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#342C26',
    letterSpacing: -0.2,
    lineHeight: 21,
    textTransform: 'uppercase',
  },
  announcementTitleEmergency: {
    color: '#DC2626',
  },
  /* Pinned Note Box */
  noteBox: {
    marginTop: 6,
    padding: 13,
    backgroundColor: 'rgba(196, 154, 108, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.8)',
    borderStyle: 'dashed',
    position: 'relative',
  },
  pushPinContainer: {
    position: 'absolute',
    top: -10,
    right: 14,
    zIndex: 5,
    transform: [{ rotate: '18deg' }],
  },
  noteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  noteHeaderText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: THEME.colors.clayDark,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  noteBodyText: {
    fontSize: 13,
    color: '#403630',
    lineHeight: 19.5,
  },
  /* Attachment */
  attachmentBox: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(214, 194, 161, 0.6)',
    backgroundColor: THEME.colors.sandLight,
  },
  attachmentImage: {
    width: '100%',
    height: 160,
  },
  attachmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  attachmentFooterText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.clayDark,
  },
  /* Card Footer */
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
    gap: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  postedByLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#342C26',
  },
  validUntilRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  validUntilText: {
    fontSize: 11,
    color: THEME.colors.clayDark,
    fontWeight: '600',
  },
  committeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  committeePill: {
    backgroundColor: 'rgba(196, 154, 108, 0.16)',
    borderColor: 'rgba(214, 194, 161, 0.6)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  committeePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.clayDark,
  },
  positionPill: {
    backgroundColor: 'rgba(107, 142, 90, 0.14)',
    borderColor: 'rgba(107, 142, 90, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  positionPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
