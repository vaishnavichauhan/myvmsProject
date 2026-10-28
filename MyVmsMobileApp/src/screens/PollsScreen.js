import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Vote,
  BarChart3,
  CheckCircle2,
  Clock,
  Users,
  RefreshCw,
  Plus,
  HelpCircle,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { pollApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const PollsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'closed'

  const [polls, setPolls] = useState([]);
  const [stats, setStats] = useState(null);
  const [votedPolls, setVotedPolls] = useState({});

  useEffect(() => {
    fetchPollsData();
  }, []);

  const fetchPollsData = async () => {
    try {
      const [pollsRes, statsRes] = await Promise.all([
        pollApi.getPolls().catch(() => null),
        pollApi.getStats().catch(() => null),
      ]);

      const rawPolls =
        pollsRes?.data?.polls ||
        pollsRes?.data ||
        pollsRes?.polls ||
        [];
      setPolls(Array.isArray(rawPolls) ? rawPolls : []);

      const rawStats = statsRes?.data?.stats || statsRes?.data || statsRes || null;
      if (rawStats) setStats(rawStats);
    } catch (err) {
      console.log('Error fetching polls:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVote = async (pollId, optionIndex, optionTitle) => {
    Alert.alert(
      'Confirm Vote',
      `Submit your vote for:\n"${optionTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cast Vote',
          onPress: async () => {
            try {
              const res = await pollApi.castVote(pollId, optionIndex);
              if (res.success) {
                Alert.alert('Success', 'Your vote has been recorded.');
                setVotedPolls((prev) => ({ ...prev, [pollId]: optionIndex }));
                fetchPollsData();
              } else {
                Alert.alert('Notice', res.message || 'Vote recorded.');
                setVotedPolls((prev) => ({ ...prev, [pollId]: optionIndex }));
                fetchPollsData();
              }
            } catch (e) {
              Alert.alert('Notice', e.message || 'You have already voted or this poll is closed.');
            }
          },
        },
      ]
    );
  };

  // Demo fallback polls if none in backend yet
  const defaultPolls = [
    {
      id: 1,
      title: 'Diwali Festival Grand Celebration Budget & Decor',
      description: 'Vote on the proposed community entertainment, lighting, and cultural celebration plan.',
      status: 'ACTIVE',
      total_votes: 38,
      expires_at: '2026-11-05',
      options: [
        { title: 'Full Illumination & Cultural Gala (₹50,000)', votes: 24 },
        { title: 'Standard Lighting & Sweet Distribution (₹25,000)', votes: 12 },
        { title: 'Basic Courtyard Decor Only (₹10,000)', votes: 2 },
      ],
    },
    {
      id: 2,
      title: 'Electric Vehicle (EV) Charging Stations Installation',
      description: 'Should the society install 4 dedicated dual-gun EV charging slots in Visitor Parking Area?',
      status: 'ACTIVE',
      total_votes: 45,
      expires_at: '2026-11-15',
      options: [
        { title: 'Yes, Install 4 fast chargers immediately', votes: 32 },
        { title: 'Install only 2 chargers for now', votes: 10 },
        { title: 'No, defer to next AGM', votes: 3 },
      ],
    },
    {
      id: 3,
      title: 'Gymnasium Equipment Upgrade & Extended Timings',
      description: 'Poll on extending gym closing time to 11:00 PM and purchasing dual rowing machines.',
      status: 'CLOSED',
      total_votes: 52,
      expires_at: '2026-10-20',
      options: [
        { title: 'Approve extended hours & equipment', votes: 44 },
        { title: 'Keep existing hours and machines', votes: 8 },
      ],
    },
  ];

  const displayPolls = polls.length > 0 ? polls : defaultPolls;
  const filteredPolls = displayPolls.filter((p) =>
    activeTab === 'active' ? p.status === 'ACTIVE' : p.status !== 'ACTIVE'
  );

  const totalPollsCount = displayPolls.length;
  const activePollsCount = displayPolls.filter((p) => p.status === 'ACTIVE').length;
  const totalVotesCount = displayPolls.reduce((acc, p) => acc + Number(p.total_votes || 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Polls & Surveys</Text>
            <Text style={styles.headerSubtitle}>Community Voting & Opinions</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setRefreshing(true);
              fetchPollsData();
            }}
            style={styles.refreshBtn}
          >
            <RefreshCw size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Counter Pills */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>{activePollsCount}</Text>
            <Text style={styles.statLabel}>Active Polls</Text>
          </View>

          <View style={styles.statPill}>
            <Text style={styles.statNum}>{totalVotesCount}</Text>
            <Text style={styles.statLabel}>Total Votes</Text>
          </View>

          <View style={styles.statPill}>
            <Text style={styles.statNum}>{totalPollsCount}</Text>
            <Text style={styles.statLabel}>All Surveys</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'active' && styles.tabItemActive]}
            onPress={() => setActiveTab('active')}
          >
            <Vote size={15} color={activeTab === 'active' ? THEME.colors.clay : THEME.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              Active ({activePollsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'closed' && styles.tabItemActive]}
            onPress={() => setActiveTab('closed')}
          >
            <BarChart3 size={15} color={activeTab === 'closed' ? THEME.colors.clay : THEME.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'closed' && styles.tabTextActive]}>
              Past Surveys ({displayPolls.length - activePollsCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Body */}
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPollsData();
            }}
            tintColor={THEME.colors.clay}
            colors={[THEME.colors.clay]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading society polls & surveys...</Text>
          </View>
        ) : filteredPolls.length === 0 ? (
          <View style={styles.emptyCard}>
            <HelpCircle size={36} color={THEME.colors.textMuted} />
            <Text style={styles.emptyTitle}>No {activeTab === 'active' ? 'Active' : 'Past'} Polls</Text>
            <Text style={styles.emptySub}>
              {activeTab === 'active'
                ? 'No community voting is currently in progress.'
                : 'No archived polls or past community surveys available.'}
            </Text>
          </View>
        ) : (
          <View style={styles.pollsList}>
            {filteredPolls.map((poll) => {
              const isActive = poll.status === 'ACTIVE';
              const totalVotes = Number(poll.total_votes || 0);
              const options = Array.isArray(poll.options) ? poll.options : [];

              return (
                <View key={poll.id || Math.random()} style={styles.pollCard}>
                  {/* Top Poll Info */}
                  <View style={styles.pollCardTop}>
                    <View style={styles.pollHeaderLeft}>
                      <View style={styles.pollIconBox}>
                        <Vote size={18} color={THEME.colors.clay} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pollTitle}>{poll.title}</Text>
                        <Text style={styles.pollSub} numberOfLines={2}>
                          {poll.description || 'Community survey & resident opinion poll'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          borderColor: isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isActive ? '#10B981' : '#EF4444' },
                        ]}
                      >
                        {isActive ? 'VOTING OPEN' : 'CLOSED'}
                      </Text>
                    </View>
                  </View>

                  {/* Options List with Progress Bars */}
                  <View style={styles.optionsWrap}>
                    {options.map((opt, idx) => {
                      const optVotes = Number(opt.votes || 0);
                      const percent = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                      const hasVotedThis = votedPolls[poll.id] === idx;

                      return (
                        <TouchableOpacity
                          key={idx}
                          disabled={!isActive}
                          onPress={() => handleVote(poll.id, idx, opt.title || `Option ${idx + 1}`)}
                          style={[
                            styles.optionItem,
                            hasVotedThis && styles.optionItemVoted,
                          ]}
                          activeOpacity={0.8}
                        >
                          {/* Percentage fill background bar */}
                          <View
                            style={[
                              styles.optionProgressBar,
                              { width: `${Math.max(percent, 0)}%` },
                              hasVotedThis && { backgroundColor: 'rgba(196, 154, 108, 0.25)' },
                            ]}
                          />

                          <View style={styles.optionContentRow}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text
                                style={[
                                  styles.optionTitle,
                                  hasVotedThis && { color: THEME.colors.clay, fontWeight: '800' },
                                ]}
                              >
                                {opt.title || `Option ${idx + 1}`}
                              </Text>
                              <Text style={styles.optionVotesText}>
                                {optVotes} {optVotes === 1 ? 'vote' : 'votes'} ({percent}%)
                              </Text>
                            </View>

                            {hasVotedThis ? (
                              <CheckCircle2 size={18} color={THEME.colors.clay} />
                            ) : isActive ? (
                              <View style={styles.voteBubble}>
                                <Text style={styles.voteBubbleText}>Vote</Text>
                              </View>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Poll Footer */}
                  <View style={styles.pollFooter}>
                    <View style={styles.pollFooterLeft}>
                      <Users size={13} color={THEME.colors.textMuted} />
                      <Text style={styles.pollFooterText}>{totalVotes} Total Votes Cast</Text>
                    </View>

                    {poll.expires_at && (
                      <View style={styles.pollFooterRight}>
                        <Clock size={13} color={THEME.colors.textMuted} />
                        <Text style={styles.pollFooterText}>
                          Ends {String(poll.expires_at).split('T')[0]}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
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
  header: {
    backgroundColor: '#342C26',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...THEME.shadows.float,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    ...THEME.shadows.card,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabTextActive: {
    color: THEME.colors.darkBrown,
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 10,
    fontWeight: '600',
  },
  pollsList: {
    gap: 14,
  },
  pollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    padding: 16,
    gap: 12,
    ...THEME.shadows.card,
  },
  pollCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  pollHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  pollIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    lineHeight: 19,
  },
  pollSub: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  optionsWrap: {
    gap: 8,
  },
  optionItem: {
    position: 'relative',
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: 10,
    overflow: 'hidden',
    padding: 12,
  },
  optionItemVoted: {
    borderColor: THEME.colors.clay,
  },
  optionProgressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(214, 194, 161, 0.28)',
  },
  optionContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  optionVotesText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  voteBubble: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: THEME.colors.darkBrown,
  },
  voteBubbleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.4)',
  },
  pollFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pollFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pollFooterText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
