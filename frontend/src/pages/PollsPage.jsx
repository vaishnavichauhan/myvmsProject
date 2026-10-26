import React, { useState, useEffect, useMemo } from 'react';
import {
  Vote,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  X,
  Trash2,
  Lock,
  Layers,
  ArrowUpRight,
  Award,
  Sparkles,
  Wrench,
  PartyPopper,
  Flame,
  Home,
  User,
  Check,
  ShieldCheck,
  BarChart3,
  PieChart,
  HelpCircle,
  Trophy,
  Users,
  Timer,
} from 'lucide-react';
import { pollApi } from '../api/pollApi';
import { societyApi } from '../api/societyApi';
import { committeeApi } from '../api/committeeApi';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';

// Category Configuration & Theme Badges
const CATEGORY_MAP = {
  AMENITY: {
    label: 'Amenities & Facilities',
    icon: Sparkles,
    bg: 'rgba(2, 132, 199, 0.12)',
    color: '#0284C7',
    border: '#38BDF8',
  },
  FESTIVAL: {
    label: 'Festival & Celebrations',
    icon: PartyPopper,
    bg: 'rgba(139, 92, 246, 0.12)',
    color: '#8B5CF6',
    border: '#A78BFA',
  },
  MAINTENANCE: {
    label: 'Repairs & Infrastructure',
    icon: Wrench,
    bg: 'rgba(217, 119, 6, 0.12)',
    color: '#D97706',
    border: '#F59E0B',
  },
  RULES: {
    label: 'Society Rules & Bylaws',
    icon: ShieldCheck,
    bg: 'rgba(107, 142, 90, 0.12)',
    color: '#6B8E5A',
    border: '#86EFAC',
  },
  GENERAL: {
    label: 'General Opinion',
    icon: HelpCircle,
    bg: 'rgba(196, 154, 108, 0.15)',
    color: '#C49A6C',
    border: '#D6C2A1',
  },
};

export default function PollsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;
  const isCommitteeMember = user?.role === ROLES.COMMITTEE_MEMBER;
  const canCreate = isAdmin || isCommitteeMember;

  // Active Society State
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState(user?.societyId ? String(user.societyId) : '');

  // Committees
  const [committees, setCommittees] = useState([]);
  const [userCommittees, setUserCommittees] = useState([]);

  // Filter State
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'MY_VOTES' | 'CLOSED'
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data State
  const [polls, setPolls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Voting Selection State: { [pollId]: selectedOptionId }
  const [selectedVotes, setSelectedVotes] = useState({});

  // Create Poll Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    end_date: '',
    committee_id: '',
    committee_name: '',
    society_id: selectedSocietyId || '1',
    options: ['', ''],
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const showError = (err) => {
    const text = err?.message || (typeof err === 'string' ? err : 'An error occurred');
    setErrorMsg(text);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  useEffect(() => {
    fetchInitialMeta();
  }, []);

  useEffect(() => {
    if (selectedSocietyId) {
      loadPolls();
    }
  }, [selectedSocietyId]);

  const fetchInitialMeta = async () => {
    try {
      const socRes = await societyApi.getSocieties();
      const rawSoc = socRes?.data?.societies || socRes?.societies || socRes?.data || socRes || [];
      const socList = Array.isArray(rawSoc) ? rawSoc : (Array.isArray(rawSoc?.societies) ? rawSoc.societies : []);
      setSocieties(socList);

      let currentSocId = selectedSocietyId;
      if (!currentSocId && socList.length > 0) {
        currentSocId = String(socList[0].id);
        setSelectedSocietyId(currentSocId);
      }

      // Fetch Committees
      const commRes = await committeeApi.getCommittees({ society_id: currentSocId || 1 });
      const rawComm = commRes?.data?.committees || commRes?.committees || commRes?.data || commRes || [];
      const commList = Array.isArray(rawComm) ? rawComm : (Array.isArray(rawComm?.committees) ? rawComm.committees : []);
      setCommittees(commList);

      // User's committee
      if (isCommitteeMember) {
        try {
          const permRes = await committeeApi.checkMyPermissions();
          const permData = permRes?.data || permRes;
          if (permData?.committee_id) {
            setUserCommittees([
              {
                id: permData.committee_id,
                name: permData.committee_name || 'Managing Committee',
              },
            ]);
          }
        } catch (_) {}
      }
    } catch (e) {
      console.error('Failed to load initial metadata', e);
    }
  };

  const loadPolls = async () => {
    setLoading(true);
    try {
      const societyId = selectedSocietyId || '1';
      const [pollsRes, statsRes] = await Promise.all([
        pollApi.getAllPolls({ society_id: societyId }),
        pollApi.getStats({ society_id: societyId }).catch(() => ({})),
      ]);

      setPolls(pollsRes?.data || pollsRes || []);
      setStats(statsRes?.data || statsRes || null);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const defaultEndDate = today.toISOString().slice(0, 16);

    let prefillCommId = '';
    let prefillCommName = '';
    if (isCommitteeMember && userCommittees.length > 0) {
      prefillCommId = String(userCommittees[0].id);
      prefillCommName = userCommittees[0].name;
    }

    setCreateFormData({
      title: '',
      description: '',
      category: 'GENERAL',
      end_date: defaultEndDate,
      committee_id: prefillCommId,
      committee_name: prefillCommName,
      society_id: selectedSocietyId || '1',
      options: ['', ''],
    });
    setShowCreateModal(true);
  };

  // Handle Option input change
  const handleOptionChange = (index, value) => {
    const updated = [...createFormData.options];
    updated[index] = value;
    setCreateFormData({ ...createFormData, options: updated });
  };

  // Add Option
  const handleAddOption = () => {
    if (createFormData.options.length >= 8) {
      showError('Maximum 8 options allowed per poll.');
      return;
    }
    setCreateFormData({
      ...createFormData,
      options: [...createFormData.options, ''],
    });
  };

  // Remove Option
  const handleRemoveOption = (index) => {
    if (createFormData.options.length <= 2) {
      showError('A poll must have at least 2 selectable options.');
      return;
    }
    const updated = createFormData.options.filter((_, i) => i !== index);
    setCreateFormData({ ...createFormData, options: updated });
  };

  // Submit Create Poll
  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!createFormData.title.trim()) {
      showError('Please enter a poll question / title.');
      return;
    }
    if (!createFormData.end_date) {
      showError('Please set an expiration date.');
      return;
    }

    const cleanOptions = createFormData.options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      showError('Please provide at least 2 non-empty options.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...createFormData,
        society_id: Number(createFormData.society_id || selectedSocietyId || 1),
        committee_id: createFormData.committee_id ? Number(createFormData.committee_id) : null,
        options: cleanOptions,
      };

      const res = await pollApi.createPoll(payload);
      showToast(res?.message || 'Poll created successfully!');
      setShowCreateModal(false);
      loadPolls();
    } catch (err) {
      showError(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Select Option for voting
  const handleSelectOption = (pollId, optionId) => {
    setSelectedVotes((prev) => ({
      ...prev,
      [pollId]: optionId,
    }));
  };

  // Submit Vote
  const handleCastVote = async (pollId) => {
    const selectedOptionId = selectedVotes[pollId];
    if (!selectedOptionId) {
      showError('Please select an option before casting your vote.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await pollApi.castVote(pollId, selectedOptionId);
      showToast(res?.message || 'Your vote has been recorded successfully!');
      loadPolls();
    } catch (err) {
      showError(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Close Poll Early
  const handleClosePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to close this poll early? No further votes will be accepted.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await pollApi.closePoll(pollId);
      showToast(res?.message || 'Poll closed successfully.');
      loadPolls();
    } catch (err) {
      showError(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Poll
  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to permanently delete this poll and all its recorded votes?')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await pollApi.deletePoll(pollId);
      showToast(res?.message || 'Poll deleted successfully.');
      loadPolls();
    } catch (err) {
      showError(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Polls
  const filteredPolls = useMemo(() => {
    return polls.filter((p) => {
      // Tab filter
      if (activeTab === 'ACTIVE') {
        if (p.status !== 'ACTIVE') return false;
      } else if (activeTab === 'CLOSED') {
        if (p.status !== 'CLOSED' && p.status !== 'EXPIRED') return false;
      } else if (activeTab === 'MY_VOTES') {
        if (!p.has_voted) return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        const matchComm = p.committee_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchComm) return false;
      }

      return true;
    });
  }, [polls, activeTab, categoryFilter, searchQuery]);

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'var(--color-fern-green)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            background: '#DC2626',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          border: '1px solid var(--border-card)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-clay) 0%, #B08253 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(196, 154, 108, 0.35)',
              color: '#ffffff',
            }}
          >
            <Vote size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>
                Polls & Surveys
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 9px',
                  borderRadius: '12px',
                  background: 'rgba(196, 154, 108, 0.15)',
                  color: 'var(--color-clay)',
                  fontWeight: 600,
                  border: '1px solid var(--border-card)',
                }}
              >
                Community Governance
              </span>
              {canCreate && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 9px',
                    borderRadius: '12px',
                    background: 'rgba(107, 142, 90, 0.12)',
                    color: 'var(--color-fern-green)',
                    fontWeight: 600,
                  }}
                >
                  Authorized to Create Polls
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Participate in society decision-making, amenities improvement surveys, and community resolutions.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Society Selector (for Admin) */}
          {isAdmin && Array.isArray(societies) && societies.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="var(--text-dim)" />
              <select
                value={selectedSocietyId}
                onChange={(e) => setSelectedSocietyId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {societies.map((soc) => (
                  <option key={soc.id} value={soc.id}>
                    {soc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Create Button (ONLY ADMIN AND COMMITTEE MEMBER) */}
          {canCreate && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-clay)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-clay)')}
            >
              <Plus size={18} />
              <span>Create Poll & Survey</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(107, 142, 90, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-fern-green)',
            }}
          >
            <Timer size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Active Polls
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              {stats?.active_polls || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Open for resident voting</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(2, 132, 199, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284C7',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Total Votes Cast
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              {stats?.total_votes || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Community opinions submitted</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(196, 154, 108, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-clay)',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              My Participation
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--color-clay)' }}>
              {stats?.my_votes_count || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Polls voted by you</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(217, 119, 6, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <BarChart3 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Total Surveys
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-heading)' }}>
              {stats?.total_polls || polls.length || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Historical & active combined</div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-card)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Surveys' },
            { id: 'ACTIVE', label: 'Active Now' },
            { id: 'MY_VOTES', label: 'Voted by Me' },
            { id: 'CLOSED', label: 'Closed / Concluded' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: activeTab === tab.id ? 'none' : '1px solid var(--border-subtle)',
                background: activeTab === tab.id ? 'var(--color-clay)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Search & Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="AMENITY">Amenities & Facilities</option>
            <option value="FESTIVAL">Festival & Celebrations</option>
            <option value="MAINTENANCE">Repairs & Infrastructure</option>
            <option value="RULES">Society Rules & Bylaws</option>
            <option value="GENERAL">General Opinion</option>
          </select>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-secondary)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              width: '240px',
            }}
          >
            <Search size={15} color="var(--text-dim)" />
            <input
              type="text"
              placeholder="Search polls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.82rem',
                width: '100%',
                color: 'var(--text-main)',
              }}
            />
            {searchQuery && (
              <X size={14} color="var(--text-dim)" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <Vote size={32} color="var(--color-clay)" style={{ animation: 'spin 2s linear infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Loading Polls & Community Surveys...</p>
        </div>
      ) : filteredPolls.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '60px 24px',
            textAlign: 'center',
            border: '1px dashed var(--border-card)',
          }}
        >
          <Vote size={44} color="var(--color-clay)" style={{ opacity: 0.6 }} />
          <h3 style={{ margin: '14px 0 6px 0', fontSize: '1.15rem', color: 'var(--text-heading)' }}>
            No Polls or Surveys Found
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
            Polls allow administrators and committee members to gather resident feedback and opinions on society initiatives.
          </p>
          {canCreate && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                marginTop: '18px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-clay)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Plus size={16} />
              <span>Create First Poll</span>
            </button>
          )}
        </div>
      ) : (
        /* Poll Cards Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
          {filteredPolls.map((poll) => {
            const catConf = CATEGORY_MAP[poll.category] || CATEGORY_MAP.GENERAL;
            const CatIcon = catConf.icon;
            const isClosed = poll.status === 'CLOSED' || poll.status === 'EXPIRED';
            const isActive = poll.status === 'ACTIVE';
            const hasVoted = poll.has_voted;
            const canUserVote = isActive && !hasVoted;
            const totalVotes = Number(poll.total_votes || 0);

            // Find highest voted option
            let highestVoteCount = -1;
            (poll.options || []).forEach((opt) => {
              if (opt.votes_count > highestVoteCount) highestVoteCount = opt.votes_count;
            });

            const endDateObj = new Date(poll.end_date);
            const isExpiringSoon = isActive && endDateObj.getTime() - Date.now() < 48 * 60 * 60 * 1000;

            return (
              <div
                key={poll.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-card)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '18px',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                {/* Card Top: Badges & Status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: catConf.bg,
                        color: catConf.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: `1px solid ${catConf.border}`,
                      }}
                    >
                      <CatIcon size={13} />
                      <span>{catConf.label}</span>
                    </span>

                    {poll.committee_name && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(196, 154, 108, 0.12)',
                          color: 'var(--color-clay)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Award size={12} />
                        <span>{poll.committee_name}</span>
                      </span>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: isActive
                        ? 'rgba(107, 142, 90, 0.15)'
                        : 'rgba(148, 163, 184, 0.15)',
                      color: isActive ? 'var(--color-fern-green)' : '#64748b',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: isActive ? '#10b981' : '#64748b',
                      }}
                    />
                    <span>{poll.status}</span>
                  </span>
                </div>

                {/* Question Title & Description */}
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.35 }}>
                    {poll.title}
                  </h3>
                  {poll.description && (
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {poll.description}
                    </p>
                  )}
                </div>

                {/* Poll Options (Interactive or Results) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {poll.options.map((opt) => {
                    const isMyChoice = poll.user_vote && Number(poll.user_vote.option_id) === Number(opt.id);
                    const isSelectedInUI = selectedVotes[poll.id] === opt.id;
                    const isWinner = isClosed && totalVotes > 0 && opt.votes_count === highestVoteCount;

                    // If user hasn't voted and poll is active -> render clickable voting option
                    if (canUserVote) {
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(poll.id, opt.id)}
                          style={{
                            padding: '11px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: isSelectedInUI ? '2px solid var(--color-clay)' : '1px solid var(--border-subtle)',
                            background: isSelectedInUI ? 'rgba(196, 154, 108, 0.12)' : 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isSelectedInUI ? '5px solid var(--color-clay)' : '2px solid var(--border-card)',
                              background: '#ffffff',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: '0.88rem', fontWeight: isSelectedInUI ? 700 : 500, color: 'var(--text-heading)' }}>
                            {opt.option_text}
                          </span>
                        </div>
                      );
                    }

                    // Otherwise (user voted or poll closed) -> render results bar
                    return (
                      <div
                        key={opt.id}
                        style={{
                          position: 'relative',
                          borderRadius: 'var(--radius-md)',
                          border: isMyChoice ? '1px solid var(--color-fern-green)' : '1px solid var(--border-subtle)',
                          background: 'var(--bg-secondary)',
                          overflow: 'hidden',
                          padding: '10px 14px',
                        }}
                      >
                        {/* Progress Fill Background */}
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${opt.percentage}%`,
                            background: isMyChoice
                              ? 'rgba(107, 142, 90, 0.18)'
                              : isWinner
                              ? 'rgba(196, 154, 108, 0.2)'
                              : 'rgba(214, 194, 161, 0.22)',
                            transition: 'width 0.5s ease-out',
                            zIndex: 1,
                          }}
                        />

                        {/* Text and stats layer */}
                        <div
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isMyChoice && <CheckCircle2 size={15} color="var(--color-fern-green)" />}
                            {isWinner && <Trophy size={14} color="#D97706" />}
                            <span style={{ fontSize: '0.86rem', fontWeight: isMyChoice ? 700 : 500, color: 'var(--text-heading)' }}>
                              {opt.option_text}
                            </span>
                            {isMyChoice && (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: 'var(--color-fern-green)',
                                  color: '#ffffff',
                                  fontWeight: 700,
                                }}
                              >
                                You Voted
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                              {opt.votes_count} {opt.votes_count === 1 ? 'vote' : 'votes'}
                            </span>
                            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-heading)', minWidth: '36px', textAlign: 'right' }}>
                              {opt.percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Voting Button for Active Polls */}
                {canUserVote && (
                  <button
                    onClick={() => handleCastVote(poll.id)}
                    disabled={actionLoading || !selectedVotes[poll.id]}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      background: selectedVotes[poll.id] ? 'var(--color-clay)' : 'var(--bg-secondary)',
                      color: selectedVotes[poll.id] ? '#ffffff' : 'var(--text-dim)',
                      border: selectedVotes[poll.id] ? 'none' : '1px solid var(--border-subtle)',
                      fontWeight: 600,
                      fontSize: '0.86rem',
                      cursor: selectedVotes[poll.id] ? 'pointer' : 'not-allowed',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: selectedVotes[poll.id] ? '0 2px 8px rgba(196, 154, 108, 0.35)' : 'none',
                    }}
                  >
                    <Vote size={16} />
                    <span>Cast My Vote</span>
                  </button>
                )}

                {/* Footer Info & Admin Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                    color: 'var(--text-dim)',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={13} />
                      <span>{totalVotes} total votes</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isExpiringSoon ? '#DC2626' : 'inherit' }}>
                      <Clock size={13} />
                      <span>
                        {isActive
                          ? `Ends ${new Date(poll.end_date).toLocaleDateString('en-GB')}`
                          : `Closed on ${new Date(poll.end_date).toLocaleDateString('en-GB')}`}
                      </span>
                    </span>
                  </div>

                  {/* Creator / Admin Controls */}
                  {canCreate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isActive && (
                        <button
                          onClick={() => handleClosePoll(poll.id)}
                          title="Close poll early"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'transparent',
                            color: '#D97706',
                            border: '1px solid rgba(217, 119, 6, 0.3)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Close Early
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => handleDeletePoll(poll.id)}
                          title="Delete poll"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            background: 'transparent',
                            color: '#DC2626',
                            border: '1px solid rgba(220, 38, 38, 0.3)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          CREATE POLL MODAL (ADMIN & COMMITTEE MEMBER ONLY)
          ======================================================== */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '620px',
              border: '1px solid var(--border-card)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-clay)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Vote size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    Create Poll & Survey
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Gather community votes on society resolutions and initiatives
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePoll} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Permission Badge Notice */}
              <div
                style={{
                  background: 'rgba(196, 154, 108, 0.12)',
                  border: '1px solid var(--border-card)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Award size={16} color="var(--color-clay)" />
                <span>
                  <strong>Authorized:</strong> You are creating this poll as{' '}
                  <strong>{isAdmin ? 'System Administrator' : 'Committee Member'}</strong>. All society residents can cast their vote.
                </span>
              </div>

              {/* Society Selector (if Admin & multiple) */}
              {isAdmin && Array.isArray(societies) && societies.length > 1 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Society *
                  </label>
                  <select
                    value={createFormData.society_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, society_id: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.86rem',
                    }}
                  >
                    {societies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title / Question */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Poll Question / Proposal Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Should the society install solar rooftop panels for common area lighting?"
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              {/* Category & Committee */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <select
                    value={createFormData.category}
                    onChange={(e) => setCreateFormData({ ...createFormData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.86rem',
                    }}
                  >
                    <option value="AMENITY">Amenities & Facilities</option>
                    <option value="FESTIVAL">Festival & Celebrations</option>
                    <option value="MAINTENANCE">Repairs & Infrastructure</option>
                    <option value="RULES">Society Rules & Bylaws</option>
                    <option value="GENERAL">General Opinion</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Committee Attribution
                  </label>
                  <select
                    value={createFormData.committee_id}
                    onChange={(e) => {
                      const selected = committees.find((c) => String(c.id) === e.target.value);
                      setCreateFormData({
                        ...createFormData,
                        committee_id: e.target.value,
                        committee_name: selected?.name || '',
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.86rem',
                    }}
                  >
                    <option value="">General Management Committee</option>
                    {committees.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* End Date (Deadline) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Poll Expiration Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={createFormData.end_date}
                  onChange={(e) => setCreateFormData({ ...createFormData, end_date: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              {/* Dynamic Options List */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Poll Options (Minimum 2) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-clay)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Option</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {createFormData.options.map((opt, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'rgba(196, 154, 108, 0.15)',
                          color: 'var(--color-clay)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        placeholder={`Option ${index + 1} (e.g. Yes, strongly approve)`}
                        value={opt}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        required
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-main)',
                          fontSize: '0.86rem',
                        }}
                      />
                      {createFormData.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Description Context */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Additional Context / Details (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide background context, estimated costs, or committee notes..."
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.86rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-card)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-clay)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
                    opacity: actionLoading ? 0.7 : 1,
                  }}
                >
                  {actionLoading ? 'Publishing...' : 'Publish Poll to Society'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
