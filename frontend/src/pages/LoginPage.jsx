import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Building2, Lock, Phone, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ROLES, ROLE_CONFIG } from '../constants/roles';

// Admin credentials for sign in
const DEMO_ACCOUNTS = {
  [ROLES.ADMIN]: { phone: '9800000000', password: 'Password@123', label: 'Admin (System Administrator)' },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const [phoneOrEmail, setPhoneOrEmail] = useState('9800000000');
  const [password, setPassword] = useState('Password@123');
  const [selectedRole, setSelectedRole] = useState(ROLES.ADMIN);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && DEMO_ACCOUNTS[roleParam]) {
      handleSelectDemoRole(roleParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSelectDemoRole = (roleKey) => {
    setSelectedRole(roleKey);
    setPhoneOrEmail(DEMO_ACCOUNTS[roleKey].phone);
    setPassword(DEMO_ACCOUNTS[roleKey].password);
    clearError();
    setLocalError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!phoneOrEmail || !password) {
      setLocalError('Please enter both your Phone Number (or Email) and password.');
      return;
    }

    const res = await login(phoneOrEmail, password);
    if (res.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div
      className="app-container"
      style={{
        minHeight: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '30px 20px',
        background: 'var(--color-background)',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          overflow: 'hidden',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-card)',
          boxShadow: '0 16px 40px -10px rgba(64, 54, 48, 0.12)',
          background: 'var(--color-white)',
        }}
      >
        {/* Visual Brand Column with Architectural Image */}
        <div
          style={{
            position: 'relative',
            minHeight: '380px',
            background: `linear-gradient(180deg, rgba(64, 54, 48, 0.35) 0%, rgba(64, 54, 48, 0.75) 100%), url(/images/community-hero.jpg) center/cover no-repeat`,
            padding: '40px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#FFFFFF',
          }}
        >
          {/* Top Brand Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--color-clay)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <Building2 size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>MYVMS</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-sand)', letterSpacing: '0.04em' }}>COMMUNITY PLATFORM</div>
            </div>
          </div>

          {/* Center Message */}
          <div style={{ marginTop: 'auto', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.25, color: '#FFFFFF', marginBottom: '8px' }}>
              Smart Society Living
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.5 }}>
              Seamless resident authorizations, real-time security gate logging, domestic staff permits, and community circulars.
            </p>
          </div>


        </div>

        {/* Form Column */}
        <div style={{ padding: '38px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '4px' }}>
              Sign in to Portal
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Enter your registered phone number and credentials.
            </p>
          </div>

          {/* Quick Admin Access Fill Button */}
          <div style={{ marginBottom: '20px' }}>
            {Object.keys(DEMO_ACCOUNTS).map((roleKey) => {
              const isSelected = selectedRole === roleKey;
              return (
                <button
                  key={roleKey}
                  type="button"
                  id={`role-btn-${roleKey.toLowerCase()}`}
                  onClick={() => handleSelectDemoRole(roleKey)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-card)',
                    background: isSelected ? 'rgba(196, 154, 108, 0.16)' : 'var(--bg-tertiary)',
                    color: isSelected ? 'var(--color-dark-brown)' : 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} color="var(--color-clay)" />
                    <span>Auto-Fill Admin: <strong>{DEMO_ACCOUNTS[roleKey].phone}</strong></span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      background: 'var(--color-clay)',
                      color: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    Quick Fill
                  </span>
                </button>
              );
            })}
          </div>

          {/* Error Alert */}
          {(error || localError) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                color: '#DC2626',
                fontSize: '0.85rem',
                marginBottom: '18px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="input-phone">
                Phone Number (or Email)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-phone"
                  type="text"
                  className="input-field"
                  placeholder="e.g. 9800000000"
                  value={phoneOrEmail}
                  onChange={(e) => setPhoneOrEmail(e.target.value)}
                  required
                />
                <Phone size={16} color="var(--text-dim)" style={{ position: 'absolute', right: '14px', top: '14px' }} />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" htmlFor="input-password">
                  Password
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Default: Password@123</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-password"
                  type="password"
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', right: '14px', top: '14px' }} />
              </div>
            </div>

            <button
              type="submit"
              id="btn-login-submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Back Link */}
          <div style={{ textAlign: 'center', marginTop: '22px' }}>
            <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              ← Return to Society Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
