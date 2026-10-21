import React from 'react';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AccessDeniedPage({ moduleName }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const getHomeRoute = () => {
    if (user?.role === 'SECURITY') return '/dashboard/security';
    if (user?.role === 'ADMIN') return '/dashboard';
    if (user?.role === 'COMMITTEE_MEMBER') return '/dashboard/committee';
    return '/dashboard';
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        textAlign: 'center',
        padding: '30px 20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: 520,
          width: '100%',
          padding: '40px 32px',
          background: 'var(--color-white)',
          border: '1px solid var(--color-sand)',
          boxShadow: '0 10px 30px rgba(196, 154, 108, 0.12)',
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 20,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <ShieldAlert style={{ width: 36, height: 36, color: '#dc2626' }} />
        </div>

        <span
          style={{
            padding: '3px 12px',
            borderRadius: 9999,
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          403 Forbidden Access
        </span>

        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#403630', margin: '14px 0 8px 0' }}>
          Access Denied
        </h1>

        <p style={{ color: 'var(--color-text)', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: 24 }}>
          Your current account role (<strong>{user?.role || 'GUEST'}</strong>) does not have authorization to view or operate the <strong>{moduleName || 'requested'}</strong> module.
        </p>

        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            background: 'var(--color-background)',
            border: '1px solid var(--color-sand)',
            fontSize: '0.8rem',
            color: 'var(--color-text)',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textAlign: 'left',
          }}
        >
          <Lock style={{ width: 16, height: 16, color: '#dc2626', flexShrink: 0 }} />
          <span>Role-based routing enforced. Manual URL alteration does not grant permission.</span>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            style={{ padding: '10px 18px', fontSize: '0.875rem' }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span>Go Back</span>
          </button>

          <Link
            to={getHomeRoute()}
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.875rem' }}
          >
            <Home style={{ width: 16, height: 16 }} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
