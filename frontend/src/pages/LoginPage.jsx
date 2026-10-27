import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Building2,
  Lock,
  Phone,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  User,
  Users,
  Shield,
  Home,
  Sparkles,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ROLES, ROLE_CONFIG } from '../constants/roles';
import { authApi } from '../api/authApi';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();

  const [phoneOrEmail, setPhoneOrEmail] = useState('9900000000');
  const [password, setPassword] = useState('123456');
  const [activeUserPhone, setActiveUserPhone] = useState('9900000000');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Dynamic user list
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [loggingInUserId, setLoggingInUserId] = useState(null);

  // Fetch all active users from database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await authApi.getTestUsers();
        if (res.data?.users && res.data.users.length > 0) {
          setUsersList(res.data.users);
          const firstUser = res.data.users[0];
          setPhoneOrEmail(firstUser.phone);
          setPassword(firstUser.password || '123456');
          setActiveUserPhone(firstUser.phone);
        } else {
          setUsersList([]);
        }
      } catch (err) {
        console.warn('Failed to load portal accounts:', err.message);
        setUsersList([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam) {
      const match = usersList.find((u) => u.role === roleParam);
      if (match) {
        handleSelectUser(match);
      }
    }
  }, [searchParams, usersList]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSelectUser = (userItem) => {
    setActiveUserPhone(userItem.phone);
    setPhoneOrEmail(userItem.phone);
    setPassword(userItem.password || '123456');
    clearError();
    setLocalError(null);
  };

  const handleQuickLogin = async (userItem) => {
    handleSelectUser(userItem);
    setLoggingInUserId(userItem.id);
    clearError();
    setLocalError(null);

    const res = await login(userItem.phone, userItem.password || '123456');
    setLoggingInUserId(null);
    if (res.success) {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!phoneOrEmail || !password) {
      setLocalError('Please enter both your Phone Number and password.');
      return;
    }

    const res = await login(phoneOrEmail, password);
    if (res.success) {
      navigate('/dashboard');
    }
  };

  // Filtered users
  const filteredUsers = usersList.filter((u) => {
    if (selectedRoleFilter === 'ALL') return true;
    return u.role === selectedRoleFilter;
  });

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case ROLES.ADMIN:
        return { bg: 'rgba(251, 113, 133, 0.15)', color: '#fb7185', label: 'Admin' };
      case ROLES.OWNER:
        return { bg: 'rgba(129, 140, 248, 0.15)', color: '#818cf8', label: 'Owner' };
      case ROLES.TENANT:
        return { bg: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee', label: 'Tenant' };
      case ROLES.SECURITY:
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Security' };
      case ROLES.COMMITTEE_MEMBER:
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Committee' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', label: role };
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
          maxWidth: '1080px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          overflow: 'hidden',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-card)',
          boxShadow: '0 20px 50px -10px rgba(64, 54, 48, 0.16)',
          background: 'var(--color-white)',
        }}
      >
        {/* Left Column: Quick Test Users Selection */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-card)',
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '680px',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(196, 154, 108, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-clay)',
                }}
              >
                <Zap size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Test Accounts
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click to fill or test any portal instantly
                </div>
              </div>
            </div>

            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'rgba(196, 154, 108, 0.12)',
                color: 'var(--color-clay)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {filteredUsers.length} Users
            </span>
          </div>

          {/* Role Filter Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['ALL', ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.SECURITY].map((role) => {
              const isSelected = selectedRoleFilter === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRoleFilter(role)}
                  style={{
                    background: isSelected ? 'var(--color-clay)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-full)',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {role === 'ALL' ? 'All Roles' : role}
                </button>
              );
            })}
          </div>

          {/* User Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Loading accounts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active accounts found
              </div>
            ) : (
              filteredUsers.map((userItem) => {
                const isSelected = activeUserPhone === userItem.phone;
                const isLoggingIn = loggingInUserId === userItem.id;
                const badge = getRoleBadgeStyle(userItem.role);

                return (
                  <div
                    key={userItem.id}
                    onClick={() => handleSelectUser(userItem)}
                    style={{
                      border: isSelected ? '1.5px solid var(--color-clay)' : '1px solid var(--border-card)',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(196, 154, 108, 0.08)' : 'var(--bg-primary)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '0.86rem',
                            color: 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {userItem.full_name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>📱 <strong>{userItem.phone}</strong></span>
                        <span>🔑 {userItem.password || '123456'}</span>
                        {userItem.flat_number && (
                          <span>• 🏠 {userItem.flat_number}</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(userItem);
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-card)',
                          color: 'var(--text-main)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Fill in credentials"
                      >
                        Fill
                      </button>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickLogin(userItem);
                        }}
                        style={{
                          background: 'var(--color-clay)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          boxShadow: '0 2px 6px rgba(196, 154, 108, 0.3)',
                        }}
                        title="1-Click Login"
                      >
                        {isLoggingIn ? (
                          <span>...</span>
                        ) : (
                          <>
                            <span>Login</span>
                            <ArrowRight size={11} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Sign In Form */}
        <div style={{ padding: '38px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Top Brand Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--color-clay)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(196, 154, 108, 0.35)',
              }}
            >
              <Building2 size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-dark-brown)' }}>
                MYVMS
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-clay)', letterSpacing: '0.04em', fontWeight: 700 }}>
                SOCIETY MANAGEMENT SYSTEM
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '4px' }}>
              Sign in
            </h3>

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
                Phone Number
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
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  id="btn-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: showPassword ? 'var(--color-clay)' : 'var(--text-dim)',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
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
                  <span>Sign In</span>
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
