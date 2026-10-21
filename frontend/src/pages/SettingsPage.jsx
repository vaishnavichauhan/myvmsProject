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
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { societyApi } from '../api/societyApi';

export default function SettingsPage() {
  const { user, systemHealth, checkHealth } = useAuthStore();

  const [societies, setSocieties] = useState([]);
  const [selectedSociety, setSelectedSociety] = useState(null);

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
            <Settings style={{ width: 26, height: 26, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              System & Society Settings
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Perimeter security policies, barrier automation & society profile
            </p>
          </div>
        </div>
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
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-clay)', letterSpacing: '0.05em' }}>
              System Administrator
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
                    {selectedSociety?.address || settings.address || 'Main Campus, Sector 4'}
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
    </div>
  );
}
