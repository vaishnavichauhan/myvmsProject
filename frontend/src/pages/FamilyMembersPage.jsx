import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Phone,
  Home,
  ShieldCheck,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  RefreshCw,
  Heart,
  Crown,
  User,
  BadgeCheck,
} from 'lucide-react';
import { familyMemberApi } from '../api/familyMemberApi';
import { useAuthStore } from '../store/authStore';

export default function FamilyMembersPage() {
  const { user } = useAuthStore();
  const isHeadResident = ['OWNER', 'TENANT', 'ADMIN'].includes(user?.role);

  const [familyMembers, setFamilyMembers] = useState([]);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [homeInfo, setHomeInfo] = useState(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Forms
  const [addForm, setAddForm] = useState({
    name: '',
    phone: '',
    relationship: 'Daughter',
    password: '',
    avatar_url: '',
    status: 'ACTIVE',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    relationship: 'Daughter',
    status: 'ACTIVE',
    avatar_url: '',
  });

  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await familyMemberApi.getFamilyMembers();
      const list = res.data?.familyMembers || [];
      setFamilyMembers(list);

      // 1. Resolve Owner / Primary Resident
      if (res.data?.owner) {
        setOwnerInfo(res.data.owner);
      } else if (user?.role === 'OWNER') {
        setOwnerInfo({
          full_name: user.fullName || 'Home Owner',
          phone: user.phone || 'N/A',
          resident_type: 'OWNER',
          status: 'ACTIVE',
          home_number: user.flatNumber || '1',
          building_or_wing: user.blockOrTower || 'Main Wing',
          society_name: user.societyName || 'Residential Society',
          avatar_url: user.avatarUrl || null,
        });
      } else if (list.length > 0 && list[0].primary_resident_name) {
        setOwnerInfo({
          full_name: list[0].primary_resident_name,
          phone: 'Registered Owner Contact',
          resident_type: 'OWNER',
          status: 'ACTIVE',
          home_number: list[0].home_number,
          building_or_wing: list[0].building_or_wing,
          society_name: list[0].society_name,
          avatar_url: null,
        });
      }

      // 2. Resolve Home Details
      if (res.data?.home) {
        setHomeInfo(res.data.home);
      } else if (list.length > 0) {
        setHomeInfo({
          home_number: list[0].home_number,
          building_or_wing: list[0].building_or_wing,
          society_name: list[0].society_name,
          primary_resident_name: list[0].primary_resident_name,
        });
      } else if (user?.flatNumber) {
        setHomeInfo({
          home_number: user.flatNumber,
          building_or_wing: user.blockOrTower,
          society_name: user.societyName,
          primary_resident_name: user.fullName,
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch family members.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await familyMemberApi.createFamilyMember(addForm);
      setSuccessMsg(`Family member "${addForm.name}" added successfully!`);
      setShowAddModal(false);
      setAddForm({
        name: '',
        phone: '',
        relationship: 'Daughter',
        password: '',
        avatar_url: '',
        status: 'ACTIVE',
      });
      fetchFamilyMembers();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add family member.');
    }
  };

  const handleEditMember = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await familyMemberApi.updateFamilyMember(selectedMember.id, editForm);
      setSuccessMsg('Family member details updated!');
      setShowEditModal(false);
      fetchFamilyMembers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update family member.');
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove family member "${member.full_name}"?`)) return;
    try {
      await familyMemberApi.deleteFamilyMember(member.id);
      setSuccessMsg('Family member removed successfully.');
      fetchFamilyMembers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove family member.');
    }
  };

  // Helper: Get Initials for circle avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper: Visual theme for relationships
  const getRelationshipTheme = (relationship) => {
    const rel = (relationship || '').toLowerCase();
    if (rel.includes('daughter') || rel.includes('sister')) {
      return {
        label: relationship || 'Daughter',
        color: '#ec4899',
        border: '#f472b6',
        bg: 'rgba(236, 72, 153, 0.1)',
        circleBg: 'linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(217, 70, 239, 0.24) 100%)',
        glow: 'rgba(236, 72, 153, 0.28)',
        icon: Heart,
      };
    }
    if (rel.includes('son') || rel.includes('brother')) {
      return {
        label: relationship || 'Son',
        color: '#8b5cf6',
        border: '#a78bfa',
        bg: 'rgba(139, 92, 246, 0.1)',
        circleBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.18) 0%, rgba(99, 102, 241, 0.24) 100%)',
        glow: 'rgba(139, 92, 246, 0.28)',
        icon: User,
      };
    }
    if (rel.includes('spouse') || rel.includes('wife') || rel.includes('husband')) {
      return {
        label: relationship || 'Spouse',
        color: '#f43f5e',
        border: '#fb7185',
        bg: 'rgba(244, 63, 94, 0.1)',
        circleBg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.18) 0%, rgba(251, 113, 133, 0.24) 100%)',
        glow: 'rgba(244, 63, 94, 0.28)',
        icon: Heart,
      };
    }
    if (rel.includes('mother') || rel.includes('father') || rel.includes('parent')) {
      return {
        label: relationship || 'Parent',
        color: '#059669',
        border: '#34d399',
        bg: 'rgba(5, 150, 105, 0.1)',
        circleBg: 'linear-gradient(135deg, rgba(5, 150, 105, 0.18) 0%, rgba(13, 148, 136, 0.24) 100%)',
        glow: 'rgba(5, 150, 105, 0.28)',
        icon: ShieldCheck,
      };
    }
    return {
      label: relationship || 'Family Member',
      color: '#0284c7',
      border: '#38bdf8',
      bg: 'rgba(2, 132, 199, 0.1)',
      circleBg: 'linear-gradient(135deg, rgba(2, 132, 199, 0.18) 0%, rgba(14, 165, 233, 0.24) 100%)',
      glow: 'rgba(2, 132, 199, 0.28)',
      icon: Users,
    };
  };

  // Filter members by search
  const filteredMembers = familyMembers.filter((m) =>
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.relationship?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if owner matches search
  const isOwnerMatch = !searchTerm ||
    ownerInfo?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ownerInfo?.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    'owner'.includes(searchTerm.toLowerCase());

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* 1. Top Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          background: 'var(--color-white)',
          border: '1px solid var(--color-sand)',
          boxShadow: '0 4px 20px rgba(196, 154, 108, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(168, 85, 247, 0.28)',
            }}
          >
            <Heart size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--color-dark-brown)' }}>
              Family Member Management
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {isHeadResident
                ? 'Home Owner profile followed by family member accounts with independent login access.'
                : 'View verified household members registered to your home.'}
            </p>
          </div>
        </div>

        {isHeadResident && (
          <button
            id="btn-add-family-member-modal"
            onClick={() => {
              setAddForm({
                name: '',
                phone: '',
                relationship: 'Daughter',
                password: '',
                avatar_url: '',
                status: 'ACTIVE',
              });
              setShowAddModal(true);
            }}
            className="btn btn-primary"
            style={{
              padding: '11px 20px',
              fontSize: '0.92rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(196, 154, 108, 0.28)',
            }}
          >
            <Plus size={18} />
            <span>Add Family Member</span>
          </button>
        )}
      </div>

      {/* 2. Messages */}
      {successMsg && (
        <div style={{ padding: '12px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#dc2626', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Search Bar (Reduced Width) */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 20px',
          background: 'var(--color-white)',
          border: '1px solid var(--color-sand)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 2px 10px rgba(196, 154, 108, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '270px', maxWidth: '100%' }}>
          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: '#FAF6EE',
              border: '1.5px solid var(--color-sand)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 10px',
              boxSizing: 'border-box',
            }}
          >
            <Search size={15} color="var(--color-clay)" style={{ marginRight: '6px', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.84rem',
                color: 'var(--color-dark-brown)',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                title="Clear"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              height: '34px',
              minWidth: 'auto',
            }}
          >
            <Search size={13} />
            <span>Search</span>
          </button>
        </div>

        <button
          onClick={fetchFamilyMembers}
          className="btn btn-outline"
          style={{
            padding: '7px 14px',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '36px',
            marginLeft: 'auto',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />

        </button>
      </div>

      {/* 4. Full Circle Cards Grid: Owner Card First, Member Cards Following After */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 700 }}>Loading household and family roster...</div>
        </div>
      ) : (!ownerInfo && filteredMembers.length === 0) ? (
        <div
          className="glass-panel"
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            background: 'var(--color-white)',
            border: '1px solid var(--color-sand)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <Users size={52} color="var(--color-clay)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: '0 0 6px 0' }}>
            No Household Profiles Found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto' }}>
            {isHeadResident
              ? 'Click "Add Family Member" above to register household members with independent credentials.'
              : 'No verified household members are registered for this residence.'}
          </p>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-dark-brown)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Household Profiles & Access
              </span>
              <span
                style={{
                  background: 'rgba(196, 154, 108, 0.15)',
                  color: 'var(--color-clay)',
                  border: '1px solid var(--color-sand)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {(ownerInfo && isOwnerMatch ? 1 : 0) + filteredMembers.length} Members
              </span>
            </div>

          </div>

          {/* Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '24px',
              alignItems: 'stretch',
            }}
          >
            {/* ==============================================================
                CARD 1: OWNER CARD (Perfect Owner Colors: Gold, Clay, Amber)
                ============================================================== */}
            {ownerInfo && isOwnerMatch && (
              <div
                className="glass-panel"
                style={{
                  background: 'linear-gradient(135deg, #FFFDF8 0%, #FAF2E4 50%, #F5E8D3 100%)',
                  border: '2px solid var(--color-clay, #C49A6C)',
                  borderRadius: '20px',
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  textAlign: 'left',
                  boxShadow: '0 8px 24px rgba(196, 154, 108, 0.2)',
                  position: 'relative',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(196, 154, 108, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(196, 154, 108, 0.2)';
                }}
              >
                {/* Top Section: SQUARE Avatar in Top Left Side Corner + Info to Right */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    width: '100%',
                    marginBottom: '14px',
                  }}
                >
                  {/* SQUARE AVATAR IN TOP LEFT CORNER (Perfect Owner Amber/Gold) */}
                  <div
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #C49A6C 0%, #D97706 100%)',
                      border: '2.5px solid #FFFFFF',
                      boxShadow: '0 4px 14px rgba(196, 154, 108, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {ownerInfo.avatar_url ? (
                      <img
                        src={ownerInfo.avatar_url}
                        alt={ownerInfo.full_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          color: '#FFFFFF',
                          letterSpacing: '0.02em',
                          textShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        }}
                      >
                        {getInitials(ownerInfo.full_name)}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name */}
                    <h3
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--color-dark-brown)',
                        margin: '0 0 2px 0',
                        wordBreak: 'break-word',
                        lineHeight: 1.25,
                      }}
                    >
                      {ownerInfo.full_name}
                    </h3>

                    {/* Role Pill */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'linear-gradient(135deg, rgba(196, 154, 108, 0.22) 0%, rgba(217, 119, 6, 0.22) 100%)',
                        color: '#8C5B23',
                        border: '1px solid rgba(196, 154, 108, 0.55)',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        marginTop: '3px',
                      }}
                    >
                      <Crown size={12} color="#D97706" />
                      <span>PRIMARY HOME OWNER</span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#8C5B23', fontWeight: 600, marginTop: '4px' }}>
                      Head Resident • Home Account
                    </div>
                  </div>
                </div>

                {/* Contact & Credentials Details */}
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.82rem',
                    color: 'var(--color-dark-brown)',
                    marginBottom: '16px',
                    textAlign: 'left',
                    padding: '0 4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone size={14} color="#059669" />
                    <span><strong>Phone:</strong> {ownerInfo.phone || 'Primary Contact'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={14} color="#C49A6C" />
                    <span>Head Resident • Authorizes Visitors & Workers</span>
                  </div>
                </div>

                {/* Bottom Footer Chip */}
                <div
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(196, 154, 108, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#8C5B23',
                  }}
                >
                  <BadgeCheck size={16} color="#059669" />
                  <span>Primary Society Account Holder</span>
                </div>
              </div>
            )}

            {/* ==============================================================
                CARDS 2+: MEMBER CARDS (Pink and Blue Linear Gradient Theme)
                ============================================================== */}
            {filteredMembers.map((fm) => {
              return (
                <div
                  key={fm.id}
                  className="glass-panel"
                  style={{
                    background: 'linear-gradient(135deg, #FFF0F6 0%, #FFFFFF 45%, #EEF4FF 100%) padding-box, linear-gradient(135deg, #EC4899 0%, #3B82F6 100%) border-box',
                    border: '2px solid transparent',
                    borderRadius: '20px',
                    padding: '22px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    textAlign: 'left',
                    boxShadow: '0 8px 24px rgba(236, 72, 153, 0.15), 0 4px 14px rgba(59, 130, 246, 0.15)',
                    position: 'relative',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(236, 72, 153, 0.24), 0 6px 18px rgba(59, 130, 246, 0.24)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(236, 72, 153, 0.15), 0 4px 14px rgba(59, 130, 246, 0.15)';
                  }}
                >
                  {/* Top Section: SQUARE Avatar in Top Left Side Corner + Info to Right */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      width: '100%',
                      marginBottom: '14px',
                    }}
                  >
                    {/* SQUARE AVATAR IN TOP LEFT CORNER (Pink & Blue Linear Gradient) */}
                    <div
                      style={{
                        width: '74px',
                        height: '74px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #EC4899 0%, #3B82F6 100%)',
                        border: '2.5px solid #FFFFFF',
                        boxShadow: '0 4px 14px rgba(236, 72, 153, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {fm.avatar_url ? (
                        <img
                          src={fm.avatar_url}
                          alt={fm.full_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: '1.8rem',
                            fontWeight: 900,
                            color: '#FFFFFF',
                            letterSpacing: '0.02em',
                            textShadow: '0 2px 4px rgba(0,0,0,0.15)',
                          }}
                        >
                          {getInitials(fm.full_name)}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name */}
                      <h3
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: 'var(--color-dark-brown)',
                          margin: '0 0 2px 0',
                          wordBreak: 'break-word',
                          lineHeight: 1.25,
                        }}
                      >
                        {fm.full_name}
                      </h3>

                      {/* Relationship Chip with Pink & Blue Gradient */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
                          color: '#BE185D',
                          border: '1px solid rgba(236, 72, 153, 0.4)',
                          padding: '3px 10px',
                          borderRadius: '10px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          marginTop: '3px',
                        }}
                      >
                        <Heart size={12} color="#EC4899" />
                        <span>Family Member ({fm.relationship})</span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, marginTop: '4px' }}>
                        Independent Resident Access
                      </div>
                    </div>
                  </div>

                  {/* Contact & App Login Status */}
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '0.82rem',
                      color: 'var(--color-dark-brown)',
                      marginBottom: '16px',
                      textAlign: 'left',
                      padding: '0 4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} color="#059669" />
                      <span><strong>Login Phone:</strong> {fm.phone || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <KeyRound size={14} color="#EC4899" />
                      <span>Independent App Login Active</span>
                    </div>
                  </div>

                  {/* Head Resident Actions (Edit / Remove) */}
                  {isHeadResident && (
                    <div
                      style={{
                        marginTop: 'auto',
                        width: '100%',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(236, 72, 153, 0.25)',
                        display: 'flex',
                        gap: '8px',
                      }}
                    >
                      <button
                        onClick={() => {
                          setSelectedMember(fm);
                          setEditForm({
                            name: fm.full_name,
                            phone: fm.phone || '',
                            relationship: fm.relationship,
                            status: fm.status,
                            avatar_url: fm.avatar_url || '',
                          });
                          setShowEditModal(true);
                        }}
                        className="btn btn-outline"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          borderColor: 'rgba(59, 130, 246, 0.4)',
                          color: '#2563eb',
                          background: '#FFFFFF',
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteMember(fm)}
                        className="btn btn-danger"
                        style={{
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Remove Family Member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: Add Family Member */}
      {/* ------------------------------------------------------------------ */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '28px', background: '#FFFFFF', border: '1px solid var(--color-sand)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: 0 }}>Add Family Member</h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Give household members independent login access to Home {homeInfo?.home_number || user?.flatNumber || '1'}
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember}>
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Vaishnavi"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Relationship *</label>
                  <select
                    className="input-field"
                    value={addForm.relationship}
                    onChange={(e) => setAddForm({ ...addForm, relationship: e.target.value })}
                  >
                    <option value="Daughter">Daughter</option>
                    <option value="Son">Son</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Sister">Sister</option>
                    <option value="Brother">Brother</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select
                    className="input-field"
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Phone Number * (Login ID)</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. 9876543211"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Password * (Login Pass)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="input-field"
                    placeholder="Min 6 characters"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Profile Photo URL (Optional)</label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://..."
                  value={addForm.avatar_url}
                  onChange={(e) => setAddForm({ ...addForm, avatar_url: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" id="btn-submit-add-family-member" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  Add Family Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL: Edit Family Member */}
      {/* ------------------------------------------------------------------ */}
      {showEditModal && selectedMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '26px', background: '#FFFFFF', border: '1px solid var(--color-sand)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--color-dark-brown)' }}>
                Edit Family Member: {selectedMember.full_name}
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditMember}>
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">Relationship</label>
                  <select
                    className="input-field"
                    value={editForm.relationship}
                    onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })}
                  >
                    <option value="Daughter">Daughter</option>
                    <option value="Son">Son</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Sister">Sister</option>
                    <option value="Brother">Brother</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select
                    className="input-field"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
