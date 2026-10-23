import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  Home,
  Building2,
  Key,
  CheckCircle2,
  AlertCircle,
  Lock,
  Calendar,
  Clock,
  Camera,
  Edit3,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  BadgeCheck,
  Check,
  Sparkles,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/authApi';

export default function ProfilePage() {
  const { user: authUser } = useAuthStore();

  // Profile data state (loaded from server, initialized with authStore)
  const [profile, setProfile] = useState(authUser || {});
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState(null);

  // Avatar / Profile Edit Mode
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarBgColor, setAvatarBgColor] = useState(() => {
    return localStorage.getItem('myvms_avatar_bg') || 'linear-gradient(135deg, #403630 0%, #2A221E 100%)';
  });

  // Password Change Form Visibility
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Fetch full updated profile on mount
  const fetchUserProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await authApi.getProfile();
      if (res?.data?.user) {
        setProfile(res.data.user);
        setAvatarInputUrl(res.data.user.avatarUrl || '');
      }
    } catch {
      // Fallback to authUser if network is unavailable
      if (authUser) {
        setProfile(authUser);
        setAvatarInputUrl(authUser.avatarUrl || '');
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Compute initials for the square avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Active Member';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  // Role visual aesthetics
  const getRoleTheme = (role) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'System Administrator',
          badgeText: 'ADMIN',
          bg: 'rgba(124, 58, 237, 0.12)',
          color: '#7c3aed',
          border: 'rgba(124, 58, 237, 0.3)',
          gradient: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        };
      case 'SECURITY':
        return {
          label: 'Gate Security Officer',
          badgeText: 'SECURITY',
          bg: 'rgba(5, 150, 105, 0.12)',
          color: '#059669',
          border: 'rgba(5, 150, 105, 0.3)',
          gradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
        };
      case 'OWNER':
        return {
          label: 'Society Homeowner',
          badgeText: 'OWNER',
          bg: 'rgba(196, 154, 108, 0.15)',
          color: '#8c6035',
          border: 'rgba(196, 154, 108, 0.35)',
          gradient: 'linear-gradient(135deg, #403630 0%, #2A221E 100%)',
        };
      case 'TENANT':
        return {
          label: 'Resident Tenant',
          badgeText: 'TENANT',
          bg: 'rgba(13, 148, 136, 0.12)',
          color: '#0d9488',
          border: 'rgba(13, 148, 136, 0.3)',
          gradient: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
        };
      case 'FAMILY_MEMBER':
        return {
          label: 'Family Member',
          badgeText: 'RESIDENT',
          bg: 'rgba(217, 119, 6, 0.12)',
          color: '#d97706',
          border: 'rgba(217, 119, 6, 0.3)',
          gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
        };
      case 'COMMITTEE_MEMBER':
        return {
          label: 'Management Committee',
          badgeText: 'COMMITTEE',
          bg: 'rgba(168, 85, 247, 0.12)',
          color: '#9333ea',
          border: 'rgba(168, 85, 247, 0.3)',
          gradient: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
        };
      default:
        return {
          label: role || 'Resident User',
          badgeText: role || 'RESIDENT',
          bg: 'rgba(196, 154, 108, 0.15)',
          color: '#8c6035',
          border: 'rgba(196, 154, 108, 0.35)',
          gradient: 'linear-gradient(135deg, #403630 0%, #C49A6C 100%)',
        };
    }
  };

  const roleTheme = getRoleTheme(profile.role);

  // Avatar presets
  const AVATAR_PRESETS = [
    { label: 'Default Monogram', url: '' },
    { label: 'Admin Executive', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80' },
    { label: 'Professional Guard', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80' },
    { label: 'Resident Avatar', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80' },
  ];

  // Avatar Background Color Presets
  const AVATAR_BG_PRESETS = [
    { label: 'Signature Dark Brown', gradient: 'linear-gradient(135deg, #403630 0%, #2A221E 100%)' },
    { label: 'Warm Terracotta', gradient: 'linear-gradient(135deg, #C49A6C 0%, #8C6035 100%)' },
    { label: 'Emerald Green', gradient: 'linear-gradient(135deg, #10B981 0%, #065F46 100%)' },
    { label: 'Royal Violet', gradient: 'linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)' },
    { label: 'Ocean Blue', gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' },
    { label: 'Amber Gold', gradient: 'linear-gradient(135deg, #D97706 0%, #78350F 100%)' },
    { label: 'Sunset Crimson', gradient: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' },
    { label: 'Midnight Slate', gradient: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' },
  ];

  // Save Avatar URL
  const handleSaveAvatar = async (urlToSave) => {
    setSavingAvatar(true);
    setProfileNotice(null);
    try {
      const res = await authApi.updateProfile({ avatarUrl: urlToSave });
      if (res?.data?.user) {
        setProfile(res.data.user);
      } else {
        setProfile((prev) => ({ ...prev, avatarUrl: urlToSave }));
      }
      setIsEditingAvatar(false);
      setProfileNotice({ type: 'success', text: 'Square avatar photo updated successfully!' });
      setTimeout(() => setProfileNotice(null), 4000);
    } catch (err) {
      setProfileNotice({ type: 'error', text: err.message || 'Failed to update avatar photo.' });
    } finally {
      setSavingAvatar(false);
    }
  };

  // Submit Password Change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setSubmittingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Account password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess(null);
      }, 2500);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Top Header Banner */}


      {/* Global Notification Banner if profile updated */}
      {profileNotice && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: profileNotice.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${profileNotice.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            color: profileNotice.type === 'error' ? '#dc2626' : '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {profileNotice.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{profileNotice.text}</span>
          </div>
          <button
            onClick={() => setProfileNotice(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =========================================================
          PROFILE MASTER CARD
          - Top Section: Society Image Rectangle
          - Left Side: Avatar Square with Border Radius, Top Half Inside Image
          - Right Side: User Details, Change Password Button, Personal & Residential Details
          ========================================================= */}
      <div
        className="glass-panel"
        style={{
          background: '#FFFFFF',
          border: '1.5px solid var(--color-sand, #D6C2A1)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(64, 54, 48, 0.08)',
        }}
      >
        {/* 1. TOP SECTION: Society Image Rectangle */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            overflow: 'hidden',
            background: '#FAF6EE',
          }}
        >
          <img
            src="/images/community-hero.jpg"
            alt="Residential Society Campus"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        {/* 2. PROFILE BODY (AVATAR OVERLAPPING + RIGHT SIDE INFORMATION) */}
        <div
          style={{
            padding: '0 32px 32px 32px',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '32px',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            {/* =========================================================
                LEFT SIDE: SQUARE AVATAR WITH BORDER RADIUS
                "top part haf inside image" -> marginTop: '-80px'
                ========================================================= */}
            <div
              style={{
                flex: '0 0 160px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: '-80px', // Top half inside the society image!
                position: 'relative',
                zIndex: 10,
              }}
            >
              {/* Square Avatar Container with smooth rounded corners (squircle) */}
              <div
                style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '32px', // Squircle shape exactly like reference image
                  border: '5px solid #FFFFFF',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)',
                  overflow: 'hidden',
                  background: avatarBgColor || roleTheme.gradient,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName || 'User Avatar'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      userSelect: 'none',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '3.4rem',
                        fontWeight: 900,
                        lineHeight: 1,
                        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    >
                      {getInitials(profile.fullName)}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        opacity: 0.95,
                        marginTop: 6,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {profile.role || 'MEMBER'}
                    </span>
                  </div>
                )}
              </div>






              {/* Expandable Avatar Edit Form */}
              {isEditingAvatar && (
                <div
                  style={{
                    width: '230px',
                    background: '#FFFFFF',
                    padding: 14,
                    borderRadius: 14,
                    border: '1.5px solid var(--color-sand)',
                    boxShadow: '0 8px 24px rgba(64, 54, 48, 0.12)',
                    marginTop: 10,
                    textAlign: 'left',
                    zIndex: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                      Update Profile Photo
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingAvatar(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Direct Image URL:
                    </label>
                    <input
                      type="url"
                      placeholder="https://.../photo.jpg"
                      value={avatarInputUrl}
                      onChange={(e) => setAvatarInputUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        border: '1px solid var(--color-clay)',
                        borderRadius: 6,
                        marginTop: 4,
                        background: '#FFFFFF',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                      Quick Avatars:
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {AVATAR_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatarInputUrl(p.url);
                            handleSaveAvatar(p.url);
                          }}
                          style={{
                            padding: '3px 7px',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            background: avatarInputUrl === p.url ? 'var(--color-clay)' : '#FFFFFF',
                            color: avatarInputUrl === p.url ? '#FFFFFF' : 'var(--color-dark-brown)',
                            border: '1px solid var(--color-sand)',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={savingAvatar}
                    onClick={() => handleSaveAvatar(avatarInputUrl)}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '7px', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    {savingAvatar ? 'Saving...' : 'Apply Photo'}
                  </button>
                </div>
              )}

              {/* Account Identifier Card below avatar */}
              <div
                style={{
                  marginTop: '14px',
                  width: '100%',
                  background: '#FAF6EE',
                  borderRadius: '12px',
                  border: '1px solid #EAE0D5',
                  padding: '10px 12px',
                  fontSize: '0.76rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  textAlign: 'center',
                }}
              >
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                  Account ID: <strong style={{ color: 'var(--color-dark-brown)' }}>#USR-{profile.id || '01'}</strong>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#059669', fontWeight: 800 }}>
                  <BadgeCheck size={14} />
                  <span>Verified Resident</span>
                </div>
              </div>
            </div>

            {/* =========================================================
                RIGHT SIDE: ALL INFORMATION (PERSONAL & RESIDENTIAL)
                + CHANGE PASSWORD BUTTON
                ========================================================= */}
            <div
              style={{
                flex: '1 1 520px',
                minWidth: '300px',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Header Row: Name, PRO/Role Badge & Change Password Button (Like Reference Image!) */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1.5px solid #F0E8DC',
                }}
              >
                <div>
                  {/* Name + Role Badge (e.g. "Irene Brooks PRO ⚡") */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: '1.85rem',
                        fontWeight: 900,
                        color: 'var(--color-dark-brown)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {profile.fullName || 'Vaishnavi Shah'}
                    </h1>
                    <span
                      style={{
                        background: roleTheme.gradient,
                        color: '#FFFFFF',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        padding: '4px 12px',
                        borderRadius: '20px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <span>{roleTheme.badgeText || 'RESIDENT'}</span>

                    </span>
                  </div>

                  {/* Subtitle / Role description */}
                  <div
                    style={{
                      fontSize: '0.92rem',
                      color: 'var(--text-muted)',
                      marginTop: '6px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>{roleTheme.label}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--color-clay)', fontWeight: 700 }}>
                      {profile.societyName || 'No Society Registered'}
                    </span>
                    {profile.flatNumber && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}>
                          Unit {profile.flatNumber} ({profile.blockOrTower || 'Tower A'})
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Change Password Button in Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    id="btn-change-password-toggle"
                    onClick={() => {
                      setShowPasswordForm(!showPasswordForm);
                      setPasswordSuccess(null);
                      setPasswordError(null);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 18px',
                      borderRadius: '12px',
                      background: showPasswordForm ? '#2A221E' : 'var(--color-dark-brown)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(64, 54, 48, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {showPasswordForm ? (
                      <>
                        <X size={15} />
                        <span>Close Password Form</span>
                      </>
                    ) : (
                      <>
                        <Key size={15} color="#D6C2A1" />
                        <span>Change Password</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Password Change Form */}
              {showPasswordForm && (
                <div
                  style={{
                    background: '#FAF6EE',
                    border: '1.5px solid var(--color-sand)',
                    borderRadius: 16,
                    padding: '20px',
                    boxShadow: '0 4px 16px rgba(64, 54, 48, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'rgba(217, 119, 6, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d97706',
                      }}
                    >
                      <Key size={17} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--color-dark-brown)' }}>
                        Update Account Password
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Enter your current password and choose a secure new password.
                      </div>
                    </div>
                  </div>

                  <form
                    onSubmit={handlePasswordChange}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                    }}
                  >
                    {passwordSuccess && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#059669',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>{passwordSuccess}</span>
                      </div>
                    )}

                    {passwordError && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#dc2626',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <AlertCircle size={16} />
                        <span>{passwordError}</span>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {/* Current Password */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Current Password *
                        </label>
                        <div style={{ position: 'relative', marginTop: 4 }}>
                          <input
                            type={showCurrentPass ? 'text' : 'password'}
                            required
                            placeholder="Current password"
                            value={passwordForm.currentPassword}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                            }
                            style={{
                              width: '100%',
                              padding: '9px 38px 9px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1.5px solid var(--color-sand)',
                              background: '#FFFFFF',
                              fontSize: '0.88rem',
                              color: 'var(--color-dark-brown)',
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          New Password * (Min 6 chars)
                        </label>
                        <div style={{ position: 'relative', marginTop: 4 }}>
                          <input
                            type={showNewPass ? 'text' : 'password'}
                            required
                            placeholder="Min 6 characters"
                            value={passwordForm.newPassword}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                            }
                            style={{
                              width: '100%',
                              padding: '9px 38px 9px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1.5px solid var(--color-sand)',
                              background: '#FFFFFF',
                              fontSize: '0.88rem',
                              color: 'var(--color-dark-brown)',
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Confirm New Password *
                        </label>
                        <div style={{ position: 'relative', marginTop: 4 }}>
                          <input
                            type={showConfirmPass ? 'text' : 'password'}
                            required
                            placeholder="Re-enter password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                            }
                            style={{
                              width: '100%',
                              padding: '9px 38px 9px 12px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1.5px solid var(--color-sand)',
                              background: '#FFFFFF',
                              fontSize: '0.88rem',
                              color: 'var(--color-dark-brown)',
                              boxSizing: 'border-box',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          setPasswordError(null);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '8px 16px', fontWeight: 600, fontSize: '0.82rem' }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={submittingPassword}
                        className="btn btn-primary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 18px',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                        }}
                      >
                        <Lock size={15} />
                        <span>{submittingPassword ? 'Updating...' : 'Save New Password'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TWO SECTIONS: Personal Details & Residential Allocation */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '18px',
                }}
              >
                {/* SECTION 1: Personal & Contact Details */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid var(--color-sand, #D6C2A1)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 2px 10px rgba(64, 54, 48, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid #F0E8DC' }}>
                    <User size={18} color="var(--color-clay)" />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                      Personal Details
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Full Name */}
                    <div style={{ background: '#FAF6EE', padding: '10px 14px', borderRadius: 10, border: '1px solid #EFE9E1' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                        Full Legal Name
                      </span>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginTop: 2 }}>
                        {profile.fullName || 'Not specified'}
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div style={{ background: '#FAF6EE', padding: '10px 14px', borderRadius: 10, border: '1px solid #EFE9E1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          Primary Phone
                        </span>
                        <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#059669', background: 'rgba(16, 185, 129, 0.12)', padding: '1px 6px', borderRadius: 4 }}>
                          VERIFIED
                        </span>
                      </div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={14} color="var(--color-clay)" />
                        <span>{profile.phone || 'Not available'}</span>
                      </div>
                    </div>

                    {/* Email */}
                    <div style={{ background: '#FAF6EE', padding: '10px 14px', borderRadius: 10, border: '1px solid #EFE9E1' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                        Official Email
                      </span>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, wordBreak: 'break-all' }}>
                        <Mail size={14} color="#0284c7" />
                        <span>{profile.email || `${profile.phone || 'user'}@myvms.society`}</span>
                      </div>
                    </div>

                    {/* Role */}
                    <div style={{ background: '#FAF6EE', padding: '10px 14px', borderRadius: 10, border: '1px solid #EFE9E1' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                        System Role
                      </span>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: roleTheme.color, marginTop: 2 }}>
                        {profile.role || 'RESIDENT'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Society & Residence Allocation */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid var(--color-sand, #D6C2A1)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 2px 10px rgba(64, 54, 48, 0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid #F0E8DC' }}>
                    <Home size={18} color="#059669" />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                      Society & Residence Allocation
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Society Name */}
                    <div style={{ background: '#FAF6EE', padding: '10px 14px', borderRadius: 10, border: '1px solid #EFE9E1' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                        Residential Complex
                      </span>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginTop: 2 }}>
                        {profile.societyName || 'No Society Registered'}
                      </div>
                    </div>

                    {/* Allocated Unit / Flat */}
                    <div style={{ background: '#FAF6EE', padding: '10px 14px', borderRadius: 10, border: '1px solid #EFE9E1' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                        Allocated Unit / Flat
                      </span>
                      <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#059669', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Home size={14} />
                        <span>{profile.flatNumber ? `Unit ${profile.flatNumber}` : 'General Admin / Gate Post'}</span>
                      </div>
                    </div>

                    {/* Block or Tower & Floor */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: '#FAF6EE', padding: '10px 14px', borderRadius: 10, border: '1px solid #EFE9E1' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                          Block / Tower
                        </span>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2 }}>
                          {profile.blockOrTower || 'Tower A'}
                        </div>
                      </div>

                      <div style={{ background: '#FAF6EE', padding: '10px 14px', borderRadius: 10, border: '1px solid #EFE9E1' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                          Floor Level
                        </span>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2 }}>
                          {profile.floor ? `${profile.floor} Floor` : 'Ground'}
                        </div>
                      </div>
                    </div>

                    {/* Resident Type */}
                    <div style={{ background: '#FAF6EE', padding: '10px 14px', borderRadius: 10, border: '1px solid #EFE9E1' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block' }}>
                        Occupancy Status
                      </span>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: roleTheme.color, marginTop: 2 }}>
                        {profile.residentType || profile.relationship || (profile.role === 'ADMIN' ? 'Head Administrator' : profile.role === 'SECURITY' ? 'Duty Guard' : 'Primary Resident')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
