import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronDown,
  Filter,
  Vote,
  BarChart3,
  CheckCircle2,
  Clock,
  Users,
  RefreshCw,
  Plus,
  HelpCircle,
  Shield,
  Award,
  Building2,
  Sparkles,
  Trash2,
  Search,
  X,
  Trophy,
  Calendar,
  AlertCircle,
  Check,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { pollApi, committeeApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';

// Category metadata with harmonious palettes matching web design system
const CATEGORY_MAP = {
  GENERAL: {
    label: 'General Opinion',
    color: '#0284C7',
    bg: 'rgba(2, 132, 199, 0.1)',
    border: 'rgba(2, 132, 199, 0.28)',
    icon: Vote,
  },
  MAINTENANCE: {
    label: 'Repairs & Infra',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.1)',
    border: 'rgba(217, 119, 6, 0.28)',
    icon: Building2,
  },
  AMENITY: {
    label: 'Amenities & Facilities',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.28)',
    icon: Sparkles,
  },
  RULES: {
    label: 'Society Rules & Bylaws',
    color: '#DC2626',
    bg: 'rgba(220, 38, 38, 0.1)',
    border: 'rgba(220, 38, 38, 0.28)',
    icon: Shield,
  },
  FESTIVAL: {
    label: 'Festivals & Events',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.1)',
    border: 'rgba(5, 150, 105, 0.28)',
    icon: Award,
  },
};

export const PollsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  // Screen Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [polls, setPolls] = useState([]);
  const [stats, setStats] = useState(null);
  const [userCommittees, setUserCommittees] = useState([]);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'MY_VOTES' | 'CLOSED'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const activeCatMeta =
    categoryFilter !== 'ALL' && CATEGORY_MAP[categoryFilter]
      ? CATEGORY_MAP[categoryFilter]
      : { label: 'All Categories', color: THEME.colors.clay, bg: 'rgba(196, 154, 108, 0.14)', icon: Filter };
  const ActiveCatIcon = activeCatMeta.icon;

  // Voting Selection State: { [pollId]: selectedOptionId }
  const [selectedVotes, setSelectedVotes] = useState({});
  const [submittingVoteId, setSubmittingVoteId] = useState(null);

  // Create Poll Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    durationDays: 7,
    committee_id: '',
    committee_name: '',
    options: ['', ''],
  });

  // Calculate top inset so back arrow and header are never cut off by camera cutout
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );

  // Authority & Role Calculation (Only Admin and Committee Members can create polls)
  const userRole = String(user?.role || '').toUpperCase();
  const isAdmin =
    user?.role === ROLES.ADMIN ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    userRole === 'ADMIN' ||
    userRole === 'SUPER_ADMIN';

  const isCommitteeMember =
    userRole === 'COMMITTEE_MEMBER' ||
    user?.role === ROLES.COMMITTEE_MEMBER ||
    (Array.isArray(userCommittees) && userCommittees.length > 0);

  const canCreate = Boolean(isAdmin || isCommitteeMember);

  useEffect(() => {
    fetchInitialMeta();
    fetchPollsData();
  }, []);

  const fetchInitialMeta = async () => {
    try {
      const permRes = await committeeApi.checkMyPermissions().catch(() => null);
      const permData = permRes?.data || permRes;
      const uComms = permData?.userCommittees || [];
      if (Array.isArray(uComms) && uComms.length > 0) {
        setUserCommittees(
          uComms.map((c) => ({
            id: c.committee_id || c.id,
            name: c.committee_name || c.name || 'Managing Committee',
          }))
        );
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchPollsData = async () => {
    try {
      const [pollsRes, statsRes] = await Promise.all([
        pollApi.getPolls({ society_id: user?.societyId }).catch(() => null),
        pollApi.getStats({ society_id: user?.societyId }).catch(() => null),
      ]);

      const rawPolls =
        pollsRes?.data?.polls ||
        pollsRes?.data ||
        pollsRes?.polls ||
        [];
      setPolls(Array.isArray(rawPolls) ? rawPolls : []);

      const rawStats = statsRes?.data?.stats || statsRes?.data || statsRes || null;
      if (rawStats) {
        setStats(rawStats);
      }
    } catch (err) {
      console.log('Error fetching polls:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtered Polls based on tab, category, and search query
  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      const isActive = poll.status === 'ACTIVE';
      const isClosed = poll.status === 'CLOSED' || poll.status === 'EXPIRED';
      const hasVoted = Boolean(poll.has_voted || poll.user_vote);

      // Tab filtering
      if (activeTab === 'ACTIVE' && !isActive) return false;
      if (activeTab === 'CLOSED' && !isClosed) return false;
      if (activeTab === 'MY_VOTES' && !hasVoted) return false;

      // Category filtering
      if (categoryFilter !== 'ALL' && poll.category !== categoryFilter) return false;

      // Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (poll.title || '').toLowerCase().includes(q);
        const descMatch = (poll.description || '').toLowerCase().includes(q);
        const creatorMatch = (
          (poll.committee_name || '') +
          ' ' +
          (poll.creator_member_name || '') +
          ' ' +
          (poll.created_by_name || '')
        )
          .toLowerCase()
          .includes(q);
        return titleMatch || descMatch || creatorMatch;
      }

      return true;
    });
  }, [polls, activeTab, categoryFilter, searchQuery]);

  // Statistics Computations
  const statsCounts = useMemo(() => {
    const total = stats?.total_polls ?? polls.length;
    const active =
      stats?.active_polls ??
      polls.filter((p) => p.status === 'ACTIVE').length;
    const closed =
      stats?.closed_polls ??
      polls.filter((p) => p.status === 'CLOSED' || p.status === 'EXPIRED').length;
    const myVotes =
      stats?.my_votes ??
      polls.filter((p) => p.has_voted || p.user_vote).length;
    const totalVotes =
      stats?.total_votes ??
      polls.reduce((acc, p) => acc + Number(p.total_votes || 0), 0);

    return { total, active, closed, myVotes, totalVotes };
  }, [stats, polls]);

  // Option Selection for Voting
  const handleSelectOption = (pollId, optionId) => {
    setSelectedVotes((prev) => ({
      ...prev,
      [pollId]: optionId,
    }));
  };

  // Submit Vote
  const handleCastVote = async (poll) => {
    const selectedOptionId = selectedVotes[poll.id];
    if (!selectedOptionId) {
      Alert.alert('Selection Required', 'Please select an option before casting your vote.');
      return;
    }

    const selectedOpt = (poll.options || []).find((o) => o.id === selectedOptionId);

    Alert.alert(
      'Confirm Vote',
      `Cast your official vote for:\n\n"${selectedOpt?.option_text || 'Selected Option'}"?\n\nOnce submitted, your vote cannot be changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Vote',
          onPress: async () => {
            try {
              setSubmittingVoteId(poll.id);
              const res = await pollApi.castVote(poll.id, selectedOptionId);
              Alert.alert('Vote Recorded', res?.message || 'Your vote has been recorded successfully.');
              await fetchPollsData();
            } catch (err) {
              Alert.alert('Notice', err?.message || 'Unable to record vote.');
            } finally {
              setSubmittingVoteId(null);
            }
          },
        },
      ]
    );
  };

  // Close Poll Early (Admin or Committee Creator)
  const handleClosePoll = (poll) => {
    Alert.alert(
      'Close Poll Early',
      `Are you sure you want to close "${poll.title}"?\n\nVoting will stop and final consensus results will be locked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close Poll',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const res = await pollApi.closePoll(poll.id);
              Alert.alert('Success', res?.message || 'Poll closed successfully.');
              await fetchPollsData();
            } catch (err) {
              Alert.alert('Error', err?.message || 'Failed to close poll.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Delete Poll (Admin only)
  const handleDeletePoll = (poll) => {
    Alert.alert(
      'Delete Poll',
      `Are you sure you want to permanently delete "${poll.title}" and all its recorded votes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              const res = await pollApi.deletePoll(poll.id);
              Alert.alert('Success', res?.message || 'Poll deleted successfully.');
              await fetchPollsData();
            } catch (err) {
              Alert.alert('Error', err?.message || 'Failed to delete poll.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Open Create Poll Modal
  const handleOpenCreateModal = () => {
    if (!canCreate) {
      Alert.alert(
        'Permission Notice',
        'Only Society Administrators and appointed Committee Members are authorized to create community polls & surveys.'
      );
      return;
    }
    let prefillCommId = '';
    let prefillCommName = '';
    if (isCommitteeMember && userCommittees.length > 0) {
      prefillCommId = String(userCommittees[0].id);
      prefillCommName = userCommittees[0].name;
    }

    setCreateForm({
      title: '',
      description: '',
      category: 'GENERAL',
      durationDays: 7,
      committee_id: prefillCommId,
      committee_name: prefillCommName,
      options: ['', ''],
    });
    setShowCreateModal(true);
  };

  // Option text change inside create modal
  const handleOptionChange = (index, text) => {
    const updated = [...createForm.options];
    updated[index] = text;
    setCreateForm({ ...createForm, options: updated });
  };

  // Add Option in create modal
  const handleAddOption = () => {
    if (createForm.options.length >= 8) {
      Alert.alert('Limit Reached', 'A maximum of 8 options is allowed per poll.');
      return;
    }
    setCreateForm({
      ...createForm,
      options: [...createForm.options, ''],
    });
  };

  // Remove Option in create modal
  const handleRemoveOption = (index) => {
    if (createForm.options.length <= 2) {
      Alert.alert('Required', 'A poll must have at least 2 selectable options.');
      return;
    }
    const updated = createForm.options.filter((_, i) => i !== index);
    setCreateForm({ ...createForm, options: updated });
  };

  // Submit Create Poll
  const handleCreatePollSubmit = async () => {
    if (!canCreate) {
      Alert.alert(
        'Permission Denied',
        'Only Society Administrators and appointed Committee Members are authorized to create community polls & surveys.'
      );
      return;
    }

    if (!createForm.title.trim()) {
      Alert.alert('Validation Error', 'Please enter a poll question or proposal title.');
      return;
    }

    const cleanOptions = createForm.options
      .map((opt) => (typeof opt === 'string' ? opt.trim() : ''))
      .filter(Boolean);

    if (cleanOptions.length < 2) {
      Alert.alert('Validation Error', 'Please provide at least 2 distinct option answers.');
      return;
    }

    // Compute end date string in YYYY-MM-DD HH:mm:ss format
    const endDateObj = new Date();
    endDateObj.setDate(endDateObj.getDate() + Number(createForm.durationDays || 7));
    const endDateStr = endDateObj.toISOString().slice(0, 19).replace('T', ' ');

    try {
      setActionLoading(true);
      const activeCommitteeId = isCommitteeMember && userCommittees.length > 0
        ? userCommittees[0].id
        : (createForm.committee_id || null);
      const activeCommitteeName = isCommitteeMember && userCommittees.length > 0
        ? userCommittees[0].name
        : (createForm.committee_name || null);

      const payload = {
        title: createForm.title.trim(),
        description: createForm.description ? createForm.description.trim() : null,
        category: createForm.category || 'GENERAL',
        end_date: endDateStr,
        society_id: user?.societyId || 1,
        committee_id: activeCommitteeId ? Number(activeCommitteeId) : null,
        committee_name: activeCommitteeName || null,
        options: cleanOptions,
      };

      const res = await pollApi.createPoll(payload);
      Alert.alert('Success', res?.message || 'Poll created successfully!');
      setShowCreateModal(false);
      await fetchPollsData();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to create poll.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ========================================================
          1. HEADER BAR (With camera hole punch safe-inset)
          ======================================================== */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs');
              }
            }}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={26} color={THEME.colors.darkBrown} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Polls & Surveys
            </Text>

          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* ========================================================
            4. SEARCH & ACTIONS ROW + STATUS TABS + CATEGORY DROPDOWN
            ======================================================== */}
        <View style={styles.filterSection}>
          {/* Search Box + Create Poll & Surveys Button Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={18} color={THEME.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search polls by title or topic..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {canCreate && (
              <TouchableOpacity
                style={styles.createPollInlineBtn}
                onPress={handleOpenCreateModal}
                activeOpacity={0.85}
              >
                <Plus size={15} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.createPollInlineBtnText}>Create Poll</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Status Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'ALL' && styles.tabBtnActive]}
              onPress={() => setActiveTab('ALL')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'ALL' && styles.tabBtnTextActive]}>
                All ({statsCounts.total})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
              onPress={() => setActiveTab('ACTIVE')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'ACTIVE' && styles.tabBtnTextActive]}>
                Active ({statsCounts.active})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'MY_VOTES' && styles.tabBtnActive]}
              onPress={() => setActiveTab('MY_VOTES')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'MY_VOTES' && styles.tabBtnTextActive]}>
                My Votes ({statsCounts.myVotes})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'CLOSED' && styles.tabBtnActive]}
              onPress={() => setActiveTab('CLOSED')}
            >
              <Text style={[styles.tabBtnText, activeTab === 'CLOSED' && styles.tabBtnTextActive]}>
                Closed ({statsCounts.closed})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Category Dropdown Selector */}
          <TouchableOpacity
            style={styles.categoryDropdownBtn}
            onPress={() => setShowCategoryPicker(true)}
            activeOpacity={0.75}
          >
            <View style={styles.categoryDropdownLeft}>
              <View style={[styles.catIconWrap, { backgroundColor: activeCatMeta.bg }]}>
                <ActiveCatIcon size={14} color={activeCatMeta.color} />
              </View>
              <Text style={styles.categoryDropdownLabel}>Category:</Text>
              <Text style={styles.categoryDropdownValue} numberOfLines={1}>
                {categoryFilter === 'ALL' ? 'All Categories' : activeCatMeta.label}
              </Text>
            </View>
            <ChevronDown size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ========================================================
            5. POLLS LIST / EMPTY STATE
            ======================================================== */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading community polls & surveys...</Text>
          </View>
        ) : filteredPolls.length === 0 ? (
          <View style={styles.emptyCard}>
            <HelpCircle size={44} color={THEME.colors.textMuted} />
            <Text style={styles.emptyTitle}>No Polls or Surveys Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? `No polls matched your search "${searchQuery}".`
                : activeTab === 'MY_VOTES'
                  ? "You haven't cast a vote on any active or archived polls yet."
                  : 'Polls allow administrators and committee members to gather resident consensus on community initiatives.'}
            </Text>
            {canCreate && (
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={handleOpenCreateModal}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.emptyCreateBtnText}>Create Poll & Surveys</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.pollsList}>
            {filteredPolls.map((poll) => {
              const catConf = CATEGORY_MAP[poll.category] || CATEGORY_MAP.GENERAL;
              const CatIcon = catConf.icon;
              const isClosed = poll.status === 'CLOSED' || poll.status === 'EXPIRED';
              const isActive = poll.status === 'ACTIVE';
              const hasVoted = Boolean(poll.has_voted || poll.user_vote);
              const canUserVote = isActive && !hasVoted;
              const totalVotes = Number(poll.total_votes || 0);
              const isSubmittingThis = submittingVoteId === poll.id;

              // Find highest vote count for winner badge if closed
              let highestVotes = -1;
              (poll.options || []).forEach((opt) => {
                const count = Number(opt.votes_count || 0);
                if (count > highestVotes) highestVotes = count;
              });

              return (
                <View key={poll.id} style={styles.pollCard}>
                  {/* Top Meta Badges */}
                  <View style={styles.pollCardHeader}>
                    <View style={styles.badgesRow}>
                      {/* Category Badge */}
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor: catConf.bg,
                            borderColor: catConf.border,
                          },
                        ]}
                      >
                        <CatIcon size={12} color={catConf.color} />
                        <Text style={[styles.categoryBadgeText, { color: catConf.color }]}>
                          {catConf.label}
                        </Text>
                      </View>

                      {/* Creator Attribution */}
                      <View style={styles.creatorBadge}>
                        {poll.created_by_type === 'COMMITTEE' || poll.committee_name ? (
                          <>
                            <Award size={11} color="#B45309" />
                            <Text style={styles.creatorBadgeText}>
                              Committee: {poll.committee_name || 'Managing Committee'}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Shield size={11} color="#047857" />
                            <Text style={[styles.creatorBadgeText, { color: '#047857' }]}>
                              By Society Admin
                            </Text>
                          </>
                        )}
                      </View>
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                          borderColor: isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.25)',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isActive ? '#10B981' : '#64748B' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isActive ? '#059669' : '#64748B' },
                        ]}
                      >
                        {isActive ? 'VOTING OPEN' : 'CLOSED'}
                      </Text>
                    </View>
                  </View>

                  {/* Question Title & Description */}
                  <View style={styles.titleSection}>
                    <Text style={styles.pollTitle}>{poll.title}</Text>
                    {poll.description ? (
                      <Text style={styles.pollDesc}>{poll.description}</Text>
                    ) : null}
                  </View>

                  {/* Options List */}
                  <View style={styles.optionsContainer}>
                    {(poll.options || []).map((opt) => {
                      const optVotes = Number(opt.votes_count || 0);
                      const percent =
                        totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                      const isSelectedInUI = selectedVotes[poll.id] === opt.id;
                      const isMyVotedChoice =
                        poll.user_vote && Number(poll.user_vote.option_id) === Number(opt.id);
                      const isWinner =
                        isClosed && totalVotes > 0 && optVotes === highestVotes;

                      // Interactive option selection when voting is open & user hasn't voted
                      if (canUserVote) {
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.interactiveOption,
                              isSelectedInUI && styles.interactiveOptionSelected,
                            ]}
                            onPress={() => handleSelectOption(poll.id, opt.id)}
                            activeOpacity={0.8}
                          >
                            <View
                              style={[
                                styles.radioCircle,
                                isSelectedInUI && styles.radioCircleSelected,
                              ]}
                            >
                              {isSelectedInUI && <View style={styles.radioInnerDot} />}
                            </View>

                            <Text
                              style={[
                                styles.optionText,
                                isSelectedInUI && styles.optionTextSelected,
                              ]}
                            >
                              {opt.option_text}
                            </Text>
                          </TouchableOpacity>
                        );
                      }

                      // Results Bar with Progress Fill
                      return (
                        <View
                          key={opt.id}
                          style={[
                            styles.resultOptionCard,
                            isMyVotedChoice && styles.resultOptionMyChoice,
                          ]}
                        >
                          {/* Animated Progress Fill */}
                          <View
                            style={[
                              styles.resultProgressBar,
                              {
                                width: `${Math.max(percent, 0)}%`,
                                backgroundColor: isMyVotedChoice
                                  ? 'rgba(16, 185, 129, 0.16)'
                                  : isWinner
                                    ? 'rgba(217, 119, 6, 0.14)'
                                    : 'rgba(214, 194, 161, 0.22)',
                              },
                            ]}
                          />

                          {/* Content Row */}
                          <View style={styles.resultContentRow}>
                            <View style={styles.resultLeftContent}>
                              {isMyVotedChoice && (
                                <CheckCircle2 size={16} color="#059669" strokeWidth={2.4} />
                              )}
                              {isWinner && (
                                <Trophy size={15} color="#D97706" strokeWidth={2.2} />
                              )}
                              <Text
                                style={[
                                  styles.resultOptionTitle,
                                  isMyVotedChoice && styles.resultOptionTitleMyChoice,
                                ]}
                              >
                                {opt.option_text}
                              </Text>

                              {isMyVotedChoice && (
                                <View style={styles.youVotedTag}>
                                  <Text style={styles.youVotedTagText}>You Voted</Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.resultRightContent}>
                              <Text style={styles.resultVotesCount}>
                                {optVotes} {optVotes === 1 ? 'vote' : 'votes'}
                              </Text>
                              <Text style={styles.resultPercentText}>{percent}%</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Cast My Vote Button (If voting open & option selected) */}
                  {canUserVote && (
                    <TouchableOpacity
                      style={[
                        styles.castVoteBtn,
                        !selectedVotes[poll.id] && styles.castVoteBtnDisabled,
                      ]}
                      onPress={() => handleCastVote(poll)}
                      disabled={!selectedVotes[poll.id] || isSubmittingThis}
                      activeOpacity={0.85}
                    >
                      {isSubmittingThis ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Vote size={18} color="#FFFFFF" strokeWidth={2.3} />
                          <Text style={styles.castVoteBtnText}>Cast My Vote</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Card Footer: Metadata & Management */}
                  <View style={styles.pollCardFooter}>
                    <View style={styles.footerMetaLeft}>
                      <View style={styles.footerMetaItem}>
                        <Users size={13} color={THEME.colors.textMuted} />
                        <Text style={styles.footerMetaText}>
                          {totalVotes} {totalVotes === 1 ? 'vote' : 'total votes'}
                        </Text>
                      </View>

                      {poll.end_date && (
                        <View style={styles.footerMetaItem}>
                          <Clock size={13} color={THEME.colors.textMuted} />
                          <Text style={styles.footerMetaText}>
                            {isActive ? 'Ends' : 'Ended'}{' '}
                            {String(poll.end_date).split('T')[0].split(' ')[0]}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Admin & Committee Management Actions */}
                    {canCreate && (
                      <View style={styles.footerActionsRight}>
                        {isActive && (
                          <TouchableOpacity
                            style={styles.closeEarlyBtn}
                            onPress={() => handleClosePoll(poll)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.closeEarlyBtnText}>Close Early</Text>
                          </TouchableOpacity>
                        )}

                        {isAdmin && (
                          <TouchableOpacity
                            style={styles.deletePollBtn}
                            onPress={() => handleDeletePoll(poll)}
                            activeOpacity={0.8}
                          >
                            <Trash2 size={14} color="#DC2626" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ========================================================
          6. CREATE POLL & SURVEYS MODAL (Admin & Committee Only)
          ======================================================== */}
      <Modal
        visible={Boolean(showCreateModal && canCreate)}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Poll & Surveys</Text>
                <Text style={styles.modalSubtitle}>
                  Publish a new consensus survey for society residents
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowCreateModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Authority Callout */}
              <View style={styles.modalAuthorityBanner}>
                {isCommitteeMember ? (
                  <Award size={18} color="#D97706" />
                ) : (
                  <Shield size={18} color="#059669" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalAuthorityTitle}>
                    {isCommitteeMember
                      ? `Creating as Committee: ${userCommittees[0]?.name || 'Managing Committee'}`
                      : 'Creating as: Society Administrator'}
                  </Text>
                  <Text style={styles.modalAuthorityDesc}>
                    {isCommitteeMember
                      ? `This poll will be published under "${userCommittees[0]?.name || 'Managing Committee'}" for all residents.`
                      : 'This poll will be published as an official society administration voting proposal.'}
                  </Text>
                </View>
              </View>

              {/* Poll Question Title */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Poll Question / Proposal Title <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Should we install EV fast chargers in Visitor Parking?"
                  placeholderTextColor="#9CA3AF"
                  value={createForm.title}
                  onChangeText={(text) => setCreateForm({ ...createForm, title: text })}
                />
              </View>

              {/* Category Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Category <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <View style={styles.categorySelectGrid}>
                  {Object.keys(CATEGORY_MAP).map((catKey) => {
                    const cat = CATEGORY_MAP[catKey];
                    const isSelected = createForm.category === catKey;
                    return (
                      <TouchableOpacity
                        key={catKey}
                        style={[
                          styles.catSelectBtn,
                          isSelected && {
                            backgroundColor: cat.color,
                            borderColor: cat.color,
                          },
                        ]}
                        onPress={() => setCreateForm({ ...createForm, category: catKey })}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.catSelectBtnText,
                            isSelected && { color: '#FFFFFF', fontWeight: '800' },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Expiration Duration Pills */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Voting Duration <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <View style={styles.durationPillsRow}>
                  {[3, 7, 14, 30].map((days) => {
                    const isSelected = createForm.durationDays === days;
                    return (
                      <TouchableOpacity
                        key={days}
                        style={[
                          styles.durationPill,
                          isSelected && styles.durationPillSelected,
                        ]}
                        onPress={() => setCreateForm({ ...createForm, durationDays: days })}
                      >
                        <Text
                          style={[
                            styles.durationPillText,
                            isSelected && styles.durationPillTextSelected,
                          ]}
                        >
                          {days} Days
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Dynamic Options List */}
              <View style={styles.formGroup}>
                <View style={styles.optionsHeaderRow}>
                  <Text style={styles.formLabel}>
                    Poll Options (Min 2, Max 8) <Text style={{ color: '#DC2626' }}>*</Text>
                  </Text>
                  {createForm.options.length < 8 && (
                    <TouchableOpacity
                      style={styles.addOptionBtn}
                      onPress={handleAddOption}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Plus size={14} color={THEME.colors.clay} strokeWidth={2.4} />
                      <Text style={styles.addOptionBtnText}>Add Option</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {createForm.options.map((opt, idx) => (
                  <View key={idx} style={styles.optionInputRow}>
                    <View style={styles.optionNumberCircle}>
                      <Text style={styles.optionNumberText}>{idx + 1}</Text>
                    </View>
                    <TextInput
                      style={styles.optionInput}
                      placeholder={`Option ${idx + 1} (e.g. ${idx === 0
                        ? 'Yes, approve immediately'
                        : idx === 1
                          ? 'No, defer to next AGM'
                          : 'Alternative proposal'
                        })`}
                      placeholderTextColor="#9CA3AF"
                      value={opt}
                      onChangeText={(text) => handleOptionChange(idx, text)}
                    />
                    {createForm.options.length > 2 && (
                      <TouchableOpacity
                        style={styles.removeOptionBtn}
                        onPress={() => handleRemoveOption(idx)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* Description / Additional Context */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Additional Context & Details (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Provide background context, estimated budget, or notes..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={createForm.description}
                  onChangeText={(text) => setCreateForm({ ...createForm, description: text })}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCreateModal(false)}
                disabled={actionLoading}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreatePollSubmit}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Vote size={17} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.modalSubmitBtnText}>Publish Poll & Surveys</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================
          CATEGORY DROPDOWN PICKER MODAL
          ======================================================== */}
      <Modal
        visible={showCategoryPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowCategoryPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerModalContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.pickerModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Filter size={18} color={THEME.colors.clay} />
                <Text style={styles.pickerModalTitle}>Select Category</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCategoryPicker(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {/* Option: All Categories */}
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  categoryFilter === 'ALL' && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setCategoryFilter('ALL');
                  setShowCategoryPicker(false);
                }}
              >
                <View style={styles.pickerItemLeft}>
                  <View style={[styles.pickerIconWrap, { backgroundColor: 'rgba(196, 154, 108, 0.15)' }]}>
                    <Filter size={16} color={THEME.colors.clay} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.pickerItemText,
                        categoryFilter === 'ALL' && styles.pickerItemTextActive,
                      ]}
                    >
                      All Categories
                    </Text>
                    <Text style={styles.pickerItemSub}>Show all community topics</Text>
                  </View>
                </View>
                {categoryFilter === 'ALL' && (
                  <Check size={18} color={THEME.colors.clay} strokeWidth={2.5} />
                )}
              </TouchableOpacity>

              {/* Individual Categories from CATEGORY_MAP */}
              {Object.keys(CATEGORY_MAP).map((catKey) => {
                const cat = CATEGORY_MAP[catKey];
                const isSelected = categoryFilter === catKey;
                const CatIcon = cat.icon;

                return (
                  <TouchableOpacity
                    key={catKey}
                    style={[
                      styles.pickerItem,
                      isSelected && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      setCategoryFilter(catKey);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View style={styles.pickerItemLeft}>
                      <View style={[styles.pickerIconWrap, { backgroundColor: cat.bg }]}>
                        <CatIcon size={16} color={cat.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.pickerItemText,
                            isSelected && { color: cat.color, fontWeight: '800' },
                          ]}
                        >
                          {cat.label}
                        </Text>
                        <Text style={styles.pickerItemSub}>
                          {catKey === 'GENERAL' && 'General feedback & proposals'}
                          {catKey === 'MAINTENANCE' && 'Infrastructure & renovations'}
                          {catKey === 'AMENITY' && 'Clubhouse, sports & facilities'}
                          {catKey === 'RULES' && 'Bylaws, parking & pet policies'}
                          {catKey === 'FESTIVAL' && 'Celebrations, cultural & parties'}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Check size={18} color={cat.color} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F6F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE5D9',
    ...THEME.shadows.subtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0ECE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0ECE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  // Authority & Create Button
  adminActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E2D5',
    ...THEME.shadows.subtle,
  },
  authorityRow: {
    marginBottom: 10,
  },
  authorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#E2DAC8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  authorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  createPollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.clay,
    paddingVertical: 12,
    borderRadius: 12,
    ...THEME.shadows.medium,
  },
  createPollBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // KPI Analytics Bar
  kpiContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E2D5',
    ...THEME.shadows.subtle,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  // Search & Filters
  filterSection: {
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DAC8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.darkBrown,
    padding: 0,
  },
  createPollInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    ...THEME.shadows.subtle,
  },
  createPollInlineBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EDE7DC',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...THEME.shadows.subtle,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  tabBtnTextActive: {
    color: THEME.colors.clay,
    fontWeight: '800',
  },
  categoryDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DAC8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...THEME.shadows.subtle,
  },
  categoryDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  catIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDropdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  categoryDropdownValue: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    flex: 1,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E2D5',
    ...THEME.shadows.card,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE1',
    marginBottom: 8,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  pickerItemSelected: {
    backgroundColor: '#F9F6F0',
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  pickerItemTextActive: {
    color: THEME.colors.clay,
    fontWeight: '800',
  },
  pickerItemSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },

  // Loading & Empty States
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E2D5',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
  },
  emptyCreateBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Poll Cards
  pollsList: {
    gap: 16,
  },
  pollCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E2D5',
    ...THEME.shadows.subtle,
  },
  pollCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5EFE6',
    borderWidth: 1,
    borderColor: '#E4D9C7',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  creatorBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8A532B',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  titleSection: {
    marginBottom: 14,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  pollDesc: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },

  // Interactive Options (for casting vote)
  optionsContainer: {
    gap: 9,
    marginBottom: 14,
  },
  interactiveOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FBF9F5',
    borderWidth: 1.5,
    borderColor: '#E8E2D5',
  },
  interactiveOptionSelected: {
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    borderColor: THEME.colors.clay,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C4B9A7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: THEME.colors.clay,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.clay,
  },
  optionText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },

  // Result Option Card
  resultOptionCard: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E2D5',
    backgroundColor: '#FBF9F5',
    overflow: 'hidden',
  },
  resultOptionMyChoice: {
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  resultProgressBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 10,
  },
  resultContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  resultLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  resultOptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
    flexShrink: 1,
  },
  resultOptionTitleMyChoice: {
    fontWeight: '800',
  },
  youVotedTag: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  youVotedTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resultRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  resultVotesCount: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  resultPercentText: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    minWidth: 36,
    textAlign: 'right',
  },

  // Cast Vote Button
  castVoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.clay,
    paddingVertical: 11,
    borderRadius: 11,
    marginBottom: 12,
    ...THEME.shadows.medium,
  },
  castVoteBtnDisabled: {
    backgroundColor: '#D1C6B4',
    elevation: 0,
    shadowOpacity: 0,
  },
  castVoteBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Card Footer
  pollCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#EBE5D9',
    gap: 8,
  },
  footerMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  footerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerMetaText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  footerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeEarlyBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeEarlyBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  deletePollBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 5,
    borderRadius: 6,
  },

  // ==========================================
  // CREATE POLL MODAL STYLES
  // ==========================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE5D9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0ECE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  modalAuthorityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#E8E0D0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalAuthorityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  modalAuthorityDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },

  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E2DAC8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: THEME.colors.darkBrown,
  },
  formTextArea: {
    height: 72,
  },

  categorySelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  catSelectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E2DAC8',
  },
  catSelectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },

  durationPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E2DAC8',
  },
  durationPillSelected: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  durationPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  optionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addOptionBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFEAE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E2DAC8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: THEME.colors.darkBrown,
  },
  removeOptionBtn: {
    padding: 6,
  },

  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBE5D9',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F0ECE1',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: THEME.colors.clay,
    ...THEME.shadows.medium,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
