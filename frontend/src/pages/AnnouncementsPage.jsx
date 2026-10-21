import React, { useState, useEffect } from 'react';
import {
  Bell,
  Pin,
  AlertTriangle,
  Sparkles,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit2,
  Share2,
  Paperclip,
  ExternalLink,
  Shield,
  ShieldCheck,
  Building,
  Users,
  Wrench,
  Info,
  ChevronRight,
  Eye,
  Check,
  Copy,
  Flame,
  Award,
  Crown,
} from 'lucide-react';
import { announcementApi } from '../api/announcementApi';
import { societyApi } from '../api/societyApi';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';
import EmergencyBanner from '../components/announcements/EmergencyBanner';

const ANNOUNCEMENT_TYPES = {
  GENERAL: {
    label: 'General Notice',
    icon: Bell,
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
    badgeColor: '#cbd5e1',
  },
  FESTIVAL: {
    label: 'Festival & Events',
    icon: Sparkles,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    badgeColor: '#fbbf24',
    bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)',
  },
  EMERGENCY: {
    label: 'Emergency Alert',
    icon: AlertTriangle,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    badgeColor: '#f87171',
    bgGradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(185, 28, 28, 0.08) 100%)',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    icon: Wrench,
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    badgeColor: '#22d3ee',
  },
  MEETING: {
    label: 'Society Meeting / AGM',
    icon: Users,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    badgeColor: '#a78bfa',
  },
  IMPORTANT: {
    label: 'Important Advisory',
    icon: ShieldCheck,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
    badgeColor: '#fb923c',
  },
};

const ATTACHMENT_PRESETS = [
  { label: 'Festival Dandiya Banner', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80' },
  { label: 'Society Grounds', url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80' },
  { label: 'Clubhouse Gathering', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80' },
  { label: 'Maintenance Service', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
];

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Societies State
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState('ALL');

  // Permission: Can current user create/edit announcements?
  const [canCreate, setCanCreate] = useState(isAdmin);

  // Filters & Search
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'GENERAL',
    date: new Date().toISOString().slice(0, 10),
    attachment_url: '',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    society_id: '',
  });

  // Load Societies for Admin filter and selection
  useEffect(() => {
    const loadSocieties = async () => {
      try {
        const res = await societyApi.getSocieties();
        const list = res?.data?.societies || res?.societies || res?.data || [];
        setSocieties(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn('Could not load societies for announcements:', err);
      }
    };
    loadSocieties();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authoring permissions
      if (!isAdmin) {
        try {
          const permRes = await announcementApi.checkPermissions();
          if (permRes?.success || permRes?.data) {
            setCanCreate(Boolean(permRes.data?.canCreateAnnouncements || permRes.canCreateAnnouncements));
          }
        } catch {
          setCanCreate(false);
        }
      } else {
        setCanCreate(true);
      }

      // Fetch announcements
      const res = await announcementApi.getAnnouncements({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        society_id: selectedSocietyId === 'ALL' ? undefined : selectedSocietyId,
      });

      const list = res?.data?.announcements || res?.announcements || res?.data || [];
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setError(err?.message || err.response?.data?.message || 'Failed to load society announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedStatus, selectedSocietyId]);

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedAnnouncement(null);
    const defaultSocId = societies.length > 0 ? societies[0].id : (user?.societyId || '');
    setFormData({
      title: '',
      description: '',
      type: 'GENERAL',
      date: new Date().toISOString().slice(0, 10),
      attachment_url: '',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      society_id: defaultSocId,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setIsEditing(true);
    setSelectedAnnouncement(item);
    setFormData({
      title: item.title || '',
      description: item.description || item.content || '',
      type: item.type || 'GENERAL',
      date: item.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      attachment_url: item.attachment_url || '',
      status: item.status || 'ACTIVE',
      priority: item.priority || 'MEDIUM',
      society_id: item.society_id || (societies.length > 0 ? societies[0].id : ''),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (isEditing && selectedAnnouncement) {
        const res = await announcementApi.updateAnnouncement(selectedAnnouncement.id, formData);
        if (res?.success || res?.data) {
          showToast(`Announcement "${formData.title}" updated successfully!`);
          setIsModalOpen(false);
          fetchAnnouncements();
        }
      } else {
        const res = await announcementApi.createAnnouncement(formData);
        if (res?.success || res?.data) {
          showToast(`Announcement "${formData.title}" broadcasted successfully!`);
          setIsModalOpen(false);
          fetchAnnouncements();
        }
      }
    } catch (err) {
      alert(err?.message || err.response?.data?.message || 'Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await announcementApi.deleteAnnouncement(id);
      if (res?.success || res?.data) {
        showToast(`Announcement "${title}" removed.`);
        fetchAnnouncements();
      }
    } catch (err) {
      alert(err?.message || err.response?.data?.message || 'Failed to delete announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNotice = (item) => {
    const socSign = user?.societyName ? ` | ${user.societyName}` : '';
    const text = `📢 *${item.title}*\nType: ${item.type}\nDate: ${item.date || 'Recent'}\n\n${item.description || item.content}\n\n- Posted by ${item.created_by || item.posted_by}${socSign}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered List
  const filteredAnnouncements = announcements.filter((a) => {
    const matchesType = selectedType === 'ALL' || a.type === selectedType;
    const matchesSearch =
      !searchTerm ||
      (a.title && a.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.created_by && a.created_by.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesType && matchesSearch;
  });

  // Type count breakdown
  const emergencyCount = announcements.filter((a) => a.type === 'EMERGENCY' && a.status === 'ACTIVE').length;
  const festivalCount = announcements.filter((a) => a.type === 'FESTIVAL').length;
  const maintenanceCount = announcements.filter((a) => a.type === 'MAINTENANCE').length;
  const meetingCount = announcements.filter((a) => a.type === 'MEETING').length;
  const importantCount = announcements.filter((a) => a.type === 'IMPORTANT').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {successMsg && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            color: '#34d399',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* EMERGENCY ANNOUNCEMENT BANNER (Visually Prominent) */}
      <EmergencyBanner announcements={announcements} />

      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--color-white)',
          border: '1px solid var(--color-sand)',
          boxShadow: '0 4px 20px rgba(196, 154, 108, 0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(196, 154, 108, 0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>


            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '4px 0 8px 0', letterSpacing: '-0.02em', color: '#403630' }}>
              Society Announcements & Circulars
            </h1>
            <p style={{ color: 'var(--color-text)', fontSize: '0.95rem', maxWidth: '680px', lineHeight: 1.5 }}>
              Official circulars, festival invitations (Navratri, Diwali), emergency water/power alerts, maintenance schedules, and meeting resolutions.
            </p>
          </div>

          <div>
            {canCreate && (
              <button
                onClick={handleOpenCreateModal}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--color-clay)',
                  boxShadow: '0 4px 14px rgba(196, 154, 108, 0.35)',
                }}
              >
                <Plus size={18} /> Create Announcement
              </button>
            )}
          </div>
        </div>

        {/* Quick Highlights Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            onClick={() => setSelectedType('ALL')}
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: selectedType === 'ALL' ? '2px solid var(--primary)' : '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Circulars</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginTop: '2px' }}>
              {announcements.length}
            </div>
          </div>

          <div
            onClick={() => setSelectedType('EMERGENCY')}
            style={{
              background: emergencyCount > 0 ? 'rgba(239, 68, 68, 0.12)' : '#FFFFFF',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: emergencyCount > 0 ? '2px solid #ef4444' : '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>🚨 Emergency</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
              {emergencyCount} Active
            </div>
          </div>

          <div
            onClick={() => setSelectedType('FESTIVAL')}
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: selectedType === 'FESTIVAL' ? '2px solid #f59e0b' : '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#d97706', textTransform: 'uppercase', fontWeight: 700 }}>🪔 Festival & Events</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
              {festivalCount}
            </div>
          </div>

          <div
            onClick={() => setSelectedType('MAINTENANCE')}
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: selectedType === 'MAINTENANCE' ? '2px solid #06b6d4' : '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#0284c7', textTransform: 'uppercase', fontWeight: 700 }}>🔧 Maintenance</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
              {maintenanceCount}
            </div>
          </div>

          <div
            onClick={() => setSelectedType('MEETING')}
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: selectedType === 'MEETING' ? '2px solid #8b5cf6' : '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#7c3aed', textTransform: 'uppercase', fontWeight: 700 }}>👥 Meetings</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed', marginTop: '2px' }}>
              {meetingCount}
            </div>
          </div>

          <div
            onClick={() => setSelectedType('IMPORTANT')}
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: selectedType === 'IMPORTANT' ? '2px solid #ea580c' : '1px solid var(--border-card)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: '#ea580c', textTransform: 'uppercase', fontWeight: 700 }}>⚠️ Important</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ea580c', marginTop: '2px' }}>
              {importantCount}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search circulars by title, keyword, author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '38px', margin: 0, height: '40px' }}
          />
        </div>

        {/* Society Filter (if multiple societies available) */}
        {societies.length > 1 && (
          <select
            value={selectedSocietyId}
            onChange={(e) => setSelectedSocietyId(e.target.value)}
            className="input-field"
            style={{ width: 'auto', minWidth: '180px', margin: 0, height: '40px', backgroundColor: '#FFFFFF', color: 'var(--color-dark-brown)', border: '1px solid var(--border-card)' }}
          >
            <option value="ALL" style={{ backgroundColor: '#FFFFFF', color: '#403630' }}>All Societies</option>
            {societies.map((s) => (
              <option key={s.id} value={String(s.id)} style={{ backgroundColor: '#FFFFFF', color: '#403630' }}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['ALL', 'EMERGENCY', 'FESTIVAL', 'MAINTENANCE', 'MEETING', 'IMPORTANT', 'GENERAL'].map((typeKey) => {
            const isSelected = selectedType === typeKey;
            const typeConfig = ANNOUNCEMENT_TYPES[typeKey];
            const pillColor = typeConfig ? typeConfig.color : '#818cf8';

            return (
              <button
                key={typeKey}
                onClick={() => setSelectedType(typeKey)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? `1px solid ${pillColor}` : '1px solid rgba(214, 194, 161, 0.3)',
                  background: isSelected ? `${pillColor}22` : '#403630',
                  color: isSelected ? pillColor : 'var(--color-sand)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {typeKey === 'EMERGENCY' && <AlertTriangle size={13} color="#ef4444" />}
                {typeKey === 'FESTIVAL' && <Sparkles size={13} color="#f59e0b" />}
                {typeKey === 'MAINTENANCE' && <Wrench size={13} color="#06b6d4" />}
                {typeKey === 'MEETING' && <Users size={13} color="#8b5cf6" />}
                <span>{typeKey === 'ALL' ? 'All Types' : typeKey}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="pulse-indicator" style={{ width: '12px', height: '12px', marginBottom: '12px' }} />
          <div>Loading announcements and society circulars...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredAnnouncements.length === 0 && (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Bell size={48} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>No announcements found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
            {searchTerm || selectedType !== 'ALL'
              ? 'No circulars match your current filter selection.'
              : 'All clear! There are currently no active announcements in the society.'}
          </p>
          {canCreate && (
            <button onClick={handleOpenCreateModal} className="btn btn-primary">
              <Plus size={16} /> Create First Announcement
            </button>
          )}
        </div>
      )}

      {/* Announcements Feed Grid - Pinned Notes & Bulletins */}
      {!loading && filteredAnnouncements.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '34px 24px',
            marginTop: '10px',
          }}
        >
          {filteredAnnouncements.map((item) => {
            const config = ANNOUNCEMENT_TYPES[item.type] || ANNOUNCEMENT_TYPES.GENERAL;
            const TypeIcon = config.icon;
            const isEmergency = item.type === 'EMERGENCY' || item.priority === 'URGENT';
            const isFestival = item.type === 'FESTIVAL';
            const canModify = isAdmin || (canCreate && item.created_by_user_id === user?.id);

            // Priority-wise Announcement Icon Color
            const priorityKey = (item.priority || (isEmergency ? 'URGENT' : 'MEDIUM')).toUpperCase();
            const announcementIconColor =
              isEmergency || priorityKey === 'URGENT'
                ? '#dc2626' // Urgent / Emergency: Alert Red
                : priorityKey === 'HIGH'
                  ? '#ea580c' // High Priority: Bright Flame Orange
                  : priorityKey === 'MEDIUM'
                    ? '#d97706' // Medium Priority: Golden Amber
                    : priorityKey === 'LOW'
                      ? '#16a34a' // Low Priority: Calm Forest Green
                      : 'var(--color-clay)';

            return (
              <div
                key={item.id}
                style={{
                  position: 'relative',
                  overflow: 'visible',
                  paddingTop: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                {/* 1. TOP-LEFT BIG ANNOUNCEMENT ICON SLIDING UP OUTSIDE THE CARD (Priority-wise colored anoucement.png) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    left: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 4,
                    filter: `drop-shadow(0 4px 8px ${announcementIconColor}33) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.12))`,
                    transition: 'transform 0.25s ease',
                    pointerEvents: 'none',
                  }}
                  title={`Announcement (${priorityKey} Priority)`}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: announcementIconColor,
                      WebkitMaskImage: "url('/images/anoucement.png')",
                      maskImage: "url('/images/anoucement.png')",
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      display: 'inline-block',
                      transform: 'rotate(-4deg)',
                    }}
                    role="img"
                    aria-label="Announcement"
                  />
                </div>

                {/* 2. PINNED NOTE CARD BODY */}
                <div
                  className="glass-panel"
                  style={{
                    borderRadius: '24px',
                    border: isEmergency ? '2px solid #ef4444' : '1.5px solid var(--color-sand)',
                    background: isEmergency
                      ? '#FFF8F8'
                      : isFestival
                        ? '#FFFDF5'
                        : '#FFFCF7',
                    boxShadow: '0 10px 30px rgba(139, 90, 43, 0.08), 0 2px 6px rgba(0, 0, 0, 0.03)',
                    position: 'relative',
                    padding: '24px 24px 18px 24px',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    height: '100%',
                  }}
                >

                  {/* 3. RIGHT SIDE HEADER: TITLE OF ANNOUNCEMENT & META */}
                  <div
                    style={{
                      paddingLeft: '56px',
                      minHeight: '58px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Meta Row: Type Badge, Priority & Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>


                      {/* {item.priority && (
                        <span
                          style={{
                            background: item.priority === 'URGENT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(196, 154, 108, 0.15)',
                            color: item.priority === 'URGENT' ? '#dc2626' : 'var(--color-clay)',
                            border: item.priority === 'URGENT' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--color-sand)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.priority}
                        </span>
                      )} */}
                      <h2
                        style={{
                          fontSize: isEmergency ? '1.4rem' : '1.3rem',
                          fontWeight: 800,
                          margin: '2px 0 0 0',
                          color: isEmergency ? '#dc2626' : 'var(--color-dark-brown)',
                          letterSpacing: '-0.02em',
                          lineHeight: 1.25,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.title}
                      </h2>

                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginLeft: 'auto',
                          marginRight: '36px',
                        }}
                      >
                        <Calendar size={13} color="var(--color-clay)" />
                        <span>
                          {item.date ? new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                        </span>
                      </span>
                    </div>

                    {/* Right side Title of Announcement */}

                    <span
                      style={{
                        background: config.bgColor,
                        color: config.color,
                        border: `1px solid ${config.borderColor}`,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.725rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        textTransform: 'uppercase',
                        width: 'fit-content',
                        maxWidth: '100%',
                        alignSelf: 'flex-start',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <TypeIcon size={12} />
                      <span>{config.label || item.type}</span>
                    </span>
                  </div>

                  {/* 4. RELATED NOTES & CIRCULAR DETAILS (Paper Card Box) */}
                  <div
                    style={{
                      marginTop: '18px',
                      padding: '16px 18px',
                      background: 'rgba(196, 154, 108, 0.08)',
                      borderRadius: '16px',
                      border: '1px dashed var(--color-sand)',
                      position: 'relative',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Push Pin on Right Side */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '16px',
                        zIndex: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        filter: 'drop-shadow(0 3px 5px rgba(0, 0, 0, 0.22))',
                        transform: 'rotate(18deg)',
                      }}
                      title="Pinned Circular Note"
                    >
                      <Pin size={22} color="#b45309" fill="#f59e0b" />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--color-clay)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '8px',
                      }}
                    >
                      <Info size={13} />
                      <span>Official Circular Notes & Message</span>
                    </div>

                    <p
                      style={{
                        fontSize: '0.94rem',
                        color: 'var(--color-dark-brown)',
                        lineHeight: 1.65,
                        whiteSpace: 'pre-line',
                        margin: 0,
                        flex: 1,
                      }}
                    >
                      {item.description || item.content}
                    </p>
                  </div>

                  {/* 5. OPTIONAL ATTACHMENT */}
                  {item.attachment_url && (
                    <div
                      style={{
                        marginTop: '16px',
                        background: 'var(--color-background)',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        border: '1px solid var(--color-sand)',
                      }}
                    >
                      <img
                        src={item.attachment_url}
                        alt={item.title}
                        onClick={() => setPreviewImage(item.attachment_url)}
                        style={{
                          width: '100%',
                          maxHeight: '260px',
                          objectFit: 'cover',
                          cursor: 'pointer',
                          display: 'block',
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--color-clay)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <Paperclip size={13} />
                        <span>Official Attachment • Click to preview</span>
                      </div>
                    </div>
                  )}


                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '180px', marginTop: 2 }}>
                    {/* Line 1: Posted By and Author Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Posted By:</span>
                      <strong style={{ fontSize: '0.84rem', color: 'var(--color-dark-brown)' }}>
                        {item.created_by || item.posted_by || 'Society Office'}
                      </strong>
                      {item.valid_until && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '6px' }}>
                          <Clock size={11} color="var(--color-clay)" />
                          <span>Valid until: {new Date(item.valid_until).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Line 2: Committee Wing, Position & Flat with reduced font size */}
                    {(item.committee_name || item.committee_position || item.author_home_number) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {item.committee_name && (
                          <span
                            style={{
                              background: 'rgba(196, 154, 108, 0.15)',
                              color: 'var(--color-clay)',
                              border: '1px solid var(--color-sand)',
                              padding: '1px 7px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              lineHeight: 1.35,
                            }}
                          >
                            {item.committee_name}
                          </span>
                        )}
                        {item.committee_position && (
                          <span
                            style={{
                              background: 'rgba(107, 142, 90, 0.15)',
                              color: 'var(--color-fern-green)',
                              border: '1px solid rgba(107, 142, 90, 0.3)',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              lineHeight: 1.35,
                            }}
                          >
                            {item.committee_position}
                          </span>
                        )}
                        {item.author_home_number && (
                          <span
                            style={{
                              background: 'var(--color-background)',
                              color: 'var(--color-clay)',
                              border: '1px solid var(--color-sand)',
                              padding: '1px 6px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              lineHeight: 1.35,
                            }}
                          >
                            Home {item.author_home_number}
                          </span>
                        )}
                      </div>
                    )}
                  </div>


                  {/* </div> */}
                </div>
              </div>
            );
          })}
        </div>
      )
      }

      {/* CREATE & EDIT ANNOUNCEMENT MODAL (Admin & Authorized Committee Members only) */}
      {
        isModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
          >
            <div
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '620px',
                padding: '28px',
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1px solid var(--border-card)',
                boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                    {isEditing ? 'Edit Society Announcement' : 'Publish Society Announcement'}
                  </h3>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Broadcast circulars, festival notices, or emergency alerts to all residents
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Type Selection */}
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Announcement Type *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {['GENERAL', 'FESTIVAL', 'EMERGENCY', 'MAINTENANCE', 'MEETING', 'IMPORTANT'].map((t) => {
                      const isCurrent = formData.type === t;
                      const cfg = ANNOUNCEMENT_TYPES[t];
                      return (
                        <div
                          key={t}
                          onClick={() => setFormData({ ...formData, type: t })}
                          style={{
                            background: isCurrent ? `${cfg.color}15` : 'var(--bg-tertiary)',
                            border: isCurrent ? `2px solid ${cfg.color}` : '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 8px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: '0.78rem', color: isCurrent ? cfg.color : 'var(--text-main)' }}>
                            {t}
                          </div>
                          <div style={{ fontSize: '0.675rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {t === 'FESTIVAL' ? 'Navratri/Diwali' : t === 'EMERGENCY' ? 'Urgent Alert' : t}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Target Society Selection */}
                {societies.length > 0 && (
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Target Society *</label>
                    <select
                      value={formData.society_id}
                      onChange={(e) => setFormData({ ...formData, society_id: Number(e.target.value) || e.target.value })}
                      className="input-field"
                      required
                    >
                      {societies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code || 'SOC'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder={
                      formData.type === 'FESTIVAL'
                        ? 'e.g. Navratri Celebration'
                        : formData.type === 'EMERGENCY'
                          ? 'e.g. Water supply will be unavailable from 2 PM to 5 PM'
                          : 'e.g. Scheduled Elevator Maintenance'
                    }
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                  />
                </div>

                {/* Description */}
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Description / Notice Details *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder={
                      formData.type === 'FESTIVAL'
                        ? 'Navratri Dandiya & Garba Raas celebration with live orchestra...\n15 October\n8:00 PM\nSociety Ground'
                        : formData.type === 'EMERGENCY'
                          ? 'Water supply will be unavailable from 2 PM to 5 PM due to emergency main valve replacement.'
                          : 'Provide full details, timings, venues, and instructions for residents...'
                    }
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Date & Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="input-field"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="ACTIVE">ACTIVE (Visible to residents)</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                {/* Optional Attachment */}
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Attachment URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/... or document link"
                    value={formData.attachment_url}
                    onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                    className="input-field"
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', overflowX: 'auto' }}>
                    {ATTACHMENT_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, attachment_url: p.url })}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-muted)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emergency Notice Warning */}
                {formData.type === 'EMERGENCY' && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#f87171',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    <AlertTriangle size={18} />
                    <span>
                      Emergency alerts will be pinned as a prominent flashing banner at the top of all residents' dashboards.
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{
                      background: formData.type === 'EMERGENCY' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : undefined,
                    }}
                  >
                    {isEditing ? 'Save Changes' : 'Publish Announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Image Lightbox Modal */}
      {
        previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '20px',
              cursor: 'zoom-out',
            }}
          >
            <img
              src={previewImage}
              alt="Preview attachment"
              style={{
                maxWidth: '90%',
                maxHeight: '90vh',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              }}
            />
          </div>
        )
      }
    </div >
  );
}
