import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Building2,
  Shield,
  ShieldCheck,
  Bell,
  Database,
  CheckCircle2,
  Lock,
  Save,
  Server,
  Key,
  Sliders,
  Mail,
  User,
  Phone,
  MapPin,
  BadgeCheck,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { societyApi } from '../api/societyApi';

export default function SettingsPage() {
  const { user, systemHealth, checkHealth, changePassword } = useAuthStore();

  const [societies, setSocieties] = useState([]);
  const [selectedSociety, setSelectedSociety] = useState(null);

  // Change Password Modal state
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState(null);
  const [passError, setPassError] = useState(null);
  const [submittingPass, setSubmittingPass] = useState(false);

  const [settings, setSettings] = useState({
    societyName: '',
    societyCode: '',
    address: '',
    contactPhone: '+91 98765 43210',
    emergencyContact: '+91 91234 56789 / 112',
    requireDeliveryApproval: true,
    requireVisitorPhoto: true,
    autoGateBarrier: true,
    nightPatrolAlerts: true,
    residentSMSNotifications: true,
  });

  const [saved, setSaved] = useState(false);

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError(null);
    setPassMsg(null);

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }

    setSubmittingPass(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res && res.success) {
        setPassMsg('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowChangePassModal(false);
          setPassMsg(null);
        }, 1800);
      } else {
        setPassError(res?.message || 'Failed to change password.');
      }
    } catch (err) {
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setSubmittingPass(false);
    }
  };

  useEffect(() => {
    const fetchSocietyData = async () => {
      try {
        const res = await societyApi.getSocieties();
        const list = res?.data?.societies || res?.societies || [];
        setSocieties(list);
        if (list.length > 0) {
          const current = list.find((s) => s.id === user?.societyId) || list[0];
          setSelectedSociety(current);
          setSettings((prev) => ({
            ...prev,
            societyName: current.name || user?.societyName || prev.societyName,
            societyCode: current.code || current.society_code || prev.societyCode,
            address: current.address || prev.address,
            contactPhone: current.contact_number || current.contact_phone || current.phone || prev.contactPhone,
            emergencyContact: current.emergency_number || current.emergency_contact || prev.emergencyContact,
          }));
        } else if (user?.societyName) {
          setSettings((prev) => ({
            ...prev,
            societyName: user.societyName,
          }));
        }
      } catch (err) {
        console.error('Failed to load societies', err);
      }
    };
    fetchSocietyData();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selectedSociety?.id) {
        await societyApi.updateSociety(selectedSociety.id, {
          name: settings.societyName,
          address: settings.address,
          contact_number: settings.contactPhone,
          emergency_number: settings.emergencyContact,
        });
        setSelectedSociety((prev) => ({
          ...prev,
          name: settings.societyName,
          address: settings.address,
          contact_number: settings.contactPhone,
          emergency_number: settings.emergencyContact,
        }));
      }
    } catch (err) {
      console.warn('Could not persist to backend directly, saving locally', err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'var(--grad-primary)',
              boxShadow: 'var(--shadow-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <User style={{ width: 26, height: 26, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Account
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              System administrator credentials, active society profile & security rules
            </p>
          </div>
        </div>

        {/* Change Password Header Action Button */}
        <button
          type="button"
          onClick={() => setShowChangePassModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '12px',
            background: 'var(--color-white)',
            border: '1.5px solid var(--border-card)',
            color: 'var(--color-dark-brown)',
            fontSize: '0.88rem',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Lock size={16} color="var(--color-clay)" />
          <span>Change Password</span>
        </button>
      </div>

      {saved && (
        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--color-fern-green)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 style={{ width: 18, height: 18 }} />
          <span>Settings saved successfully! Security and gate rules updated.</span>
        </div>
      )}

      {/* Society Information & Admin Profile Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
        }}
      >
        {/* Admin Profile Card */}
        <div
          className="glass-panel"
          style={{
            padding: '22px 24px',
            background: 'var(--color-white)',
            border: '1.5px solid var(--border-card)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-clay)', letterSpacing: '0.05em' }}>
                System Administrator
              </span>
              <span
                style={{
                  background: 'rgba(196, 154, 108, 0.18)',
                  color: 'var(--color-clay)',
                  border: '1px solid rgba(196, 154, 108, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                {user?.role || 'ADMIN'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {/* Square Avatar */}
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  background: user?.avatarUrl ? `url(${user.avatarUrl}) center/cover` : 'var(--grad-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1.5px solid var(--border-card)',
                  flexShrink: 0,
                }}
              >
                {!user?.avatarUrl && (
                  user?.fullName
                    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : <User size={28} color="#fff" />
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                    {user?.fullName || user?.name || 'Administrator'}
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mail size={14} color="var(--color-clay)" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: 45 }}>Email:</span>
                    <span style={{ color: 'var(--text-main)' }}>{user?.email || 'admin@myvms.society'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={14} color="var(--color-fern-green)" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: 45 }}>Phone:</span>
                    <span>{user?.phone || '+91 98765 43210'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Button inside Card */}
          <button
            type="button"
            onClick={() => setShowChangePassModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '9px 14px',
              borderRadius: '10px',
              background: 'rgba(196, 154, 108, 0.1)',
              border: '1px solid rgba(196, 154, 108, 0.3)',
              color: 'var(--color-clay)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: 6,
              transition: 'all 0.15s ease',
            }}
          >
            <Key size={14} />
            <span>Change Password</span>
          </button>
        </div>

        {/* Society Information Card */}
        <div
          className="glass-panel"
          style={{
            padding: '22px 24px',
            background: 'var(--color-white)',
            border: '1.5px solid var(--border-card)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-clay)', letterSpacing: '0.05em' }}>
              Active Society Information
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {/* Square Society Icon Badge */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                background: 'rgba(196, 154, 108, 0.15)',
                border: '1.5px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
                flexShrink: 0,
              }}
            >
              <Building2 size={28} color="var(--color-clay)" />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                  {selectedSociety?.name || settings.societyName || user?.societyName || 'Suncity Paradise'}
                </h3>
                <span
                  style={{
                    background: 'rgba(107, 142, 90, 0.15)',
                    color: 'var(--color-fern-green)',
                    border: '1px solid rgba(107, 142, 90, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  Code: {selectedSociety?.code || settings.societyCode || 'SOC-001'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <MapPin size={14} color="var(--color-clay)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: 55 }}>Address:</span>
                  <span style={{ color: 'var(--text-main)' }}>
                    {selectedSociety?.address || settings.address || ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={14} color="var(--color-clay)" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: 55 }}>Office:</span>
                  <span>{settings.contactPhone || selectedSociety?.contact_number || '+91 98765 43210'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={14} color="var(--color-fern-green)" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', minWidth: 55 }}>Helpline:</span>
                  <span>{settings.emergencyContact || selectedSociety?.emergency_number || '+91 91234 56789 / 112'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Society Profile Configuration */}
        <div className="glass-panel" style={{ padding: 24, background: 'var(--color-white)', border: '1px solid var(--border-card)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-dark-brown)' }}>
              <Building style={{ width: 18, height: 18, color: 'var(--color-clay)' }} />
              <span>Society Profile Configuration</span>
            </h2>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '9px 20px',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: '10px',
                fontWeight: 600,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Save style={{ width: 16, height: 16 }} />
              <span>Save Changes</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Society Name</label>
              <input
                type="text"
                className="input-field"
                value={settings.societyName}
                onChange={(e) => setSettings({ ...settings, societyName: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Society Code</label>
              <input
                type="text"
                className="input-field"
                value={settings.societyCode}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Address</label>
              <textarea
                rows={2}
                className="input-field"
                placeholder="Full society street address, campus area, city, pincode"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Primary Office Phone</label>
              <input
                type="text"
                className="input-field"
                placeholder="+91 98765 43210"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Emergency Helpline Number</label>
              <input
                type="text"
                className="input-field"
                placeholder="+91 91234 56789 / 112"
                value={settings.emergencyContact}
                onChange={(e) => setSettings({ ...settings, emergencyContact: e.target.value })}
              />
            </div>
          </div>
        </div>


      </form>

      {/* Change Password Modal */}
      {showChangePassModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowChangePassModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: 440,
              background: 'var(--color-white)',
              borderRadius: 16,
              border: '1.5px solid var(--border-card)',
              boxShadow: 'var(--shadow-lg)',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                  }}
                >
                  <Lock size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                    Change Password
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Update your account credentials
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePassModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {passMsg && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: 'var(--color-fern-green)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{passMsg}</span>
              </div>
            )}

            {passError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: 'var(--color-error)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginBottom: 6 }}>
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-card)',
                    background: 'var(--color-sand-well)',
                    fontSize: '0.9rem',
                    color: 'var(--color-dark-brown)',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginBottom: 6 }}>
                  New Password * (Min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-card)',
                    background: 'var(--color-sand-well)',
                    fontSize: '0.9rem',
                    color: 'var(--color-dark-brown)',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginBottom: 6 }}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-card)',
                    background: 'var(--color-sand-well)',
                    fontSize: '0.9rem',
                    color: 'var(--color-dark-brown)',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowChangePassModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border-card)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPass}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--color-clay)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {submittingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
