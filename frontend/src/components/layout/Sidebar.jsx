import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileCheck2, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ROLES, ROLE_CONFIG } from '../../constants/roles';
import { ROLE_NAVIGATION } from '../../constants/navigation';

/**
 * Prompt 19 — Role-Based Navigation Sidebar
 * Renders the exact navigation items mandated for each role.
 */
export default function Sidebar() {
  const { user } = useAuthStore();
  const location = useLocation();
  const currentRole = user?.role || ROLES.OWNER;
  const roleConfig = ROLE_CONFIG[currentRole];

  // Get exact items for current role
  const navItems = ROLE_NAVIGATION[currentRole] || ROLE_NAVIGATION[ROLES.OWNER];

  // Current full path including search query string
  const currentFullPath = `${location.pathname}${location.search}`;

  /**
   * Precise active matching that supports query parameters
   * and prevents multi-tab auto-selection.
   */
  const isItemActive = (item) => {
    // 1. If item path contains query params (e.g. ?type=COURIER or ?action=visitor)
    if (item.path.includes('?')) {
      return currentFullPath === item.path;
    }

    // 2. If item path has no query params, but another nav item specifically matches currentFullPath:
    // the generic item must NOT be highlighted as active!
    const matchesSpecificOther = navItems.some(
      (other) => other !== item && other.path.includes('?') && other.path === currentFullPath
    );
    if (matchesSpecificOther) {
      return false;
    }

    // 3. Exact match for items with exact: true
    if (item.exact) {
      return location.pathname === item.path && !location.search;
    }

    // 4. Fallback path match
    return location.pathname === item.path;
  };

  return (
    <aside
      style={{
        width: '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-card)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        gap: '20px',
        minHeight: '100vh',
        overflowY: 'auto',
      }}
    >

      {/* Nav List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item);

          return (
            <Link
              key={item.title}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? '#ffffff' : 'var(--text-main)',
                background: isActive ? 'var(--color-clay)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer',
                textDecoration: 'none',
                boxShadow: isActive ? '0 2px 8px rgba(196, 154, 108, 0.35)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={17} color={isActive ? '#ffffff' : 'var(--color-clay)'} />
                <span>{item.title}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div
        style={{
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <FileCheck2 size={14} color="#10b981" />
        <span>MYVMS RBAC v1.0 • Authorized</span>
      </div>
    </aside>
  );
}
