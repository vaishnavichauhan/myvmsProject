import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Building,
  CheckCircle2,
  AlertCircle,
  Lock,
  Key,
  Mail,
  Phone,
  PhoneCall,
  MapPin,
  FileText,
  Layers,
  Home,
  Hash,
  X,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { societyApi } from '../api/societyApi';

export default function SettingsPage() {
  const { user, changePassword } = useAuthStore();

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
        } else if (user?.societyDetails) {
          setSelectedSociety(user.societyDetails);
        }
      } catch (err) {
        console.error('Failed to load societies', err);
        if (user?.societyDetails) {
          setSelectedSociety(user.societyDetails);
        }
      }
    };
    fetchSocietyData();
  }, [user]);

  // Format full address
  const formattedAddress = selectedSociety
    ? [
      selectedSociety.address || selectedSociety.address_line1,
      selectedSociety.address_line2,
      selectedSociety.city,
      selectedSociety.state,
      selectedSociety.pincode ? `PIN: ${selectedSociety.pincode}` : null,
      selectedSociety.country && selectedSociety.country !== 'India' ? selectedSociety.country : null,
    ]
      .filter(Boolean)
      .join(', ') || 'Address not registered'
    : '';

  // Society structure type formatting
  const structureType = selectedSociety
    ? selectedSociety.society_type
      ? String(selectedSociety.society_type).replace(/_/g, ' ')
      : selectedSociety.property_configuration || 'Residential Gated Complex'
    : '';

  // Total Units
  const totalUnits = selectedSociety
    ? selectedSociety.total_homes ?? selectedSociety.max_units ?? 0
    : 0;

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 28px',
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
              width: 50,
              height: 50,
              borderRadius: 14,
              background: 'var(--grad-primary)',
              boxShadow: 'var(--shadow-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <User style={{ width: 24, height: 24, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Admin Profile
            </h1>
            <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Administrator credentials & active society profile details
            </p>
          </div>
        </div>
      </div>

      {/* Admin Profile Overview Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          background: 'var(--color-white)',
          border: '1.5px solid var(--border-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 280, flex: 1 }}>
          {/* Square Avatar */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: user?.avatarUrl ? `url(${user.avatarUrl}) center/cover` : 'var(--grad-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.35rem',
              boxShadow: 'var(--shadow-sm)',
              border: '1.5px solid var(--border-card)',
              flexShrink: 0,
            }}
          >
            {!user?.avatarUrl && (
              user?.fullName
                ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : <User size={30} color="#fff" />
            )}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                {user?.fullName || user?.name || 'Administrator'}
              </h2>
              <span
                style={{
                  background: 'rgba(196, 154, 108, 0.18)',
                  color: 'var(--color-clay)',
                  border: '1px solid rgba(196, 154, 108, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                {user?.role || 'ADMIN'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 8, flexWrap: 'wrap', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} color="var(--color-clay)" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user?.email || 'admin@myvms.society'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={14} color="var(--color-fern-green)" style={{ flexShrink: 0 }} />
                <span>{user?.phone || '+91 98765 43210'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Button inside Card */}
        <button
          type="button"
          onClick={() => setShowChangePassModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '10px',
            background: 'rgba(196, 154, 108, 0.12)',
            border: '1px solid rgba(196, 154, 108, 0.35)',
            color: 'var(--color-clay)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
        >
          <Key size={15} />
          <span>Change Password</span>
        </button>
      </div>

      {/* Active Society Information Card */}
      <div
        className="glass-panel"
        style={{
          padding: '26px 28px',
          background: 'var(--color-white)',
          border: '1.5px solid var(--border-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(196, 154, 108, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-clay)',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                Active Society Information
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Official registration, structure type, units capacity, and communication details
              </span>
            </div>
          </div>

          {selectedSociety && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: 'rgba(107, 142, 90, 0.15)',
                  color: 'var(--color-fern-green)',
                  border: '1px solid rgba(107, 142, 90, 0.35)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-fern-green)' }} />
                {selectedSociety.status || 'ACTIVE'}
              </span>
            </div>
          )}
        </div>

        {selectedSociety ? (
          <>
            {/* Society Top Banner */}
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 14,
                background: 'var(--color-sand-well)',
                border: '1px solid var(--border-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: 'rgba(196, 154, 108, 0.2)',
                    border: '1px solid var(--border-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Building size={26} color="var(--color-clay)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                    {selectedSociety.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    {selectedSociety.code && (
                      <span
                        style={{
                          background: 'rgba(196, 154, 108, 0.15)',
                          color: 'var(--color-clay)',
                          border: '1px solid rgba(196, 154, 108, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        Code: {selectedSociety.code}
                      </span>
                    )}
                    {structureType && (
                      <span
                        style={{
                          background: 'rgba(107, 142, 90, 0.12)',
                          color: 'var(--color-fern-green)',
                          border: '1px solid rgba(107, 142, 90, 0.25)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {structureType}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Total Units Capacity
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                    {totalUnits} Units
                  </div>
                </div>
              </div>
            </div>

            {/* Information Tiles Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 14,
              }}
            >
              {/* 1. Society Name */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--color-sand-well)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Society Name
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2, wordBreak: 'break-word' }}>
                    {selectedSociety.name || 'N/A'}
                  </div>
                </div>
              </div>

              {/* 2. Society Code */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--color-sand-well)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                    flexShrink: 0,
                  }}
                >
                  <Hash size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Society Code
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2 }}>
                    <span
                      style={{
                        background: 'rgba(196, 154, 108, 0.15)',
                        color: 'var(--color-clay)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(196, 154, 108, 0.3)',
                        display: 'inline-block',
                      }}
                    >
                      {selectedSociety.code || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Registration Number */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--color-sand-well)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Registration Number
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2 }}>
                    {selectedSociety.registration_number || 'REG-PENDING'}
                  </div>
                </div>
              </div>

              {/* 4. Society Structure Type */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--color-sand-well)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                    flexShrink: 0,
                  }}
                >
                  <Layers size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Society Structure Type
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2, textTransform: 'capitalize' }}>
                    {structureType}
                  </div>
                </div>
              </div>

              {/* 5. Our Society Total Units */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--color-sand-well)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                    flexShrink: 0,
                  }}
                >
                  <Home size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Our Society Total Units
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2 }}>
                    {totalUnits} Units
                    {selectedSociety.actual_homes_count != null && (
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>
                        ({selectedSociety.actual_homes_count} Homes Configured)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 6. Email */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--color-sand-well)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                    flexShrink: 0,
                  }}
                >
                  <Mail size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Email
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2, wordBreak: 'break-all' }}>
                    {selectedSociety.contact_email ? (
                      <a href={`mailto:${selectedSociety.contact_email}`} style={{ color: 'var(--color-clay)', textDecoration: 'none' }}>
                        {selectedSociety.contact_email}
                      </a>
                    ) : (
                      'Not Provided'
                    )}
                  </div>
                </div>
              </div>

              {/* 7. Phone Number */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--color-sand-well)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                    flexShrink: 0,
                  }}
                >
                  <Phone size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Phone Number
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-dark-brown)', marginTop: 2 }}>
                    {selectedSociety.contact_number || selectedSociety.contact_phone ? (
                      <a href={`tel:${selectedSociety.contact_number || selectedSociety.contact_phone}`} style={{ color: 'var(--color-clay)', textDecoration: 'none' }}>
                        {selectedSociety.contact_number || selectedSociety.contact_phone}
                      </a>
                    ) : (
                      'Not Provided'
                    )}
                  </div>
                </div>
              </div>

              {/* 8. Emergency Number */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.04)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(239, 68, 68, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-error)',
                    flexShrink: 0,
                  }}
                >
                  <PhoneCall size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-error)', letterSpacing: '0.04em' }}>
                    Emergency Number
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-error)', marginTop: 2 }}>
                    {selectedSociety.emergency_number ? (
                      <a href={`tel:${selectedSociety.emergency_number}`} style={{ color: 'var(--color-error)', textDecoration: 'none' }}>
                        {selectedSociety.emergency_number}
                      </a>
                    ) : (
                      'Not Provided'
                    )}
                  </div>
                </div>
              </div>

              {/* 9. Society Address (Full Span) */}
              <div
                style={{
                  gridColumn: '1 / -1',
                  padding: '16px 18px',
                  borderRadius: 12,
                  background: 'var(--color-sand-well)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'rgba(196, 154, 108, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-clay)',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <MapPin size={20} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Society Address
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-dark-brown)', marginTop: 4, lineHeight: 1.5 }}>
                    {formattedAddress}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: 'rgba(196, 154, 108, 0.1)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-clay)',
                }}
              >
                <Building2 size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-dark-brown)' }}>
                  No Society Registered
                </h4>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Currently no active society profile is linked to this account.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/societies"
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} />
              <span>Register Society</span>
            </Link>
          </div>
        )}
      </div>

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
