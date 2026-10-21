import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogOut, UserCheck, LogIn, KeyRound, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ROLE_CONFIG } from '../../constants/roles';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, changePassword } = useAuthStore();

  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState(null);
  const [passError, setPassError] = useState(null);
  const [submittingPass, setSubmittingPass] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
      if (res.success) {
        setPassMsg('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowChangePassModal(false);
          setPassMsg(null);
        }, 1800);
      } else {
        setPassError(res.message || 'Failed to change password.');
      }
    } catch (err) {
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setSubmittingPass(false);
    }
  };

  const roleMeta = user ? ROLE_CONFIG[user.role] : null;

  return (
    <nav className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '14px 24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--grad-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Building2 size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              MYVMS
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1 }}>Residential Society System</div>
          </div>
        </Link>

        {/* Right Section: User Profile or Auth Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* User Info or Auth Action */}
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-clay)'
                }}>
                  <UserCheck size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.fullName}</div>
                  <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge ${roleMeta?.badgeClass || ''}`} style={{ padding: '1px 6px', fontSize: '0.65rem' }}>
                      {roleMeta?.label || user.role}
                    </span>
                  </div>
                </div>
              </div>



              <button
                id="btn-navbar-logout"
                onClick={handleLogout}
                className="btn btn-outline"
                style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                title="Sign out"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link to="/login" id="btn-navbar-login" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <LogIn size={15} />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(64, 54, 48, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '26px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="var(--accent-amber)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Change Password</h3>
              </div>
              <button onClick={() => setShowChangePassModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Update your account password securely.
            </p>

            {passMsg && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <CheckCircle2 size={16} />
                <span>{passMsg}</span>
              </div>
            )}

            {passError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <AlertCircle size={16} />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit}>
              <div className="input-group">
                <label className="input-label">Current Password *</label>
                <input
                  type="password"
                  required
                  className="input-field"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">New Password * (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input-field"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button type="button" onClick={() => setShowChangePassModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" id="btn-submit-change-pass" className="btn btn-primary" disabled={submittingPass}>
                  {submittingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
