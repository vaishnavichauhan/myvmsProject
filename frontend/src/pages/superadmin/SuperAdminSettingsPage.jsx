import React, { useState } from 'react';
import { Settings, Shield, User, KeyRound, CheckCircle2, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function SuperAdminSettingsPage() {
  const { user } = useAuthStore();
  const [success, setSuccess] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '680px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Platform Settings & Super Admin Profile
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
          Master system settings, platform security controls, and administrator credentials.
        </p>
      </div>

      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.2rem',
            }}
          >
            SA
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>
              {user?.fullName || 'Master Platform Administrator'}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Role: <strong style={{ color: '#8B5CF6' }}>SUPER_ADMIN (Platform Owner)</strong> • {user?.phone || '9900000000'}
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Email:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user?.email || 'superadmin@myvms.com'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Multi-Society Access:</span>
            <span style={{ fontWeight: 600, color: '#10b981' }}>Unrestricted (All Societies)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Plan Entitlements:</span>
            <span style={{ fontWeight: 600, color: '#10b981' }}>All 10 Modules Enabled</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Platform Version:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>MYVMS Enterprise v2.4 (Multi-Tenant)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
