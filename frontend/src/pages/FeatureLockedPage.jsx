import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function FeatureLockedPage({ featureName = 'This Feature', featureCode }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const planName = user?.subscription?.planName || 'Current Plan';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        textAlign: 'center',
        padding: '32px 16px',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}
      >
        <Lock size={36} color="#ef4444" />
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '20px',
          background: 'rgba(196, 154, 108, 0.15)',
          color: 'var(--color-clay)',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        <Sparkles size={14} /> Subscription Upgrade Required
      </div>

      <h2
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: '10px',
        }}
      >
        {featureName} is not included in your plan
      </h2>

      <p
        style={{
          maxWidth: '520px',
          color: 'var(--text-dim)',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          marginBottom: '24px',
        }}
      >
        Your society is currently subscribed to <strong>{planName}</strong>, which does not have access
        to the <strong>{featureName}</strong> module. To enable this feature for all society residents,
        contact your Society Administrator or Super Admin to upgrade your subscription.
      </p>

      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          maxWidth: '460px',
          width: '100%',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left',
        }}
      >
        <ShieldAlert size={24} color="#f59e0b" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
          <div><strong>Module Code:</strong> {featureCode || 'RESTRICTED'}</div>
          <div><strong>Society:</strong> {user?.societyName || 'Assigned Society'}</div>
        </div>
      </div>

      <button
        onClick={() => navigate('/dashboard')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-clay)',
          color: '#ffffff',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(196, 154, 108, 0.35)',
        }}
      >
        <ArrowLeft size={16} /> Return to Dashboard
      </button>
    </div>
  );
}
