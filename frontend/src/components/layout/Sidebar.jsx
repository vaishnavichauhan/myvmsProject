import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileCheck2,
  Shield,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ROLES, ROLE_CONFIG } from '../../constants/roles';
import { ROLE_NAVIGATION } from '../../constants/navigation';

/**
 * Prompt 19 — Role-Based Navigation Sidebar
 * Renders the exact navigation items mandated for each role with collapsible support.
 */
export default function Sidebar() {
  const { user } = useAuthStore();
  const location = useLocation();
  const currentRole = user?.role || ROLES.OWNER;
  const roleConfig = ROLE_CONFIG[currentRole];

  // Collapsible sidebar state with local storage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('myvms_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('myvms_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Get exact items for current role
  const navItems = ROLE_NAVIGATION[currentRole] || ROLE_NAVIGATION[ROLES.OWNER];

  // Current full path including search query string
  const currentFullPath = `${location.pathname}${location.search}`;

  // Expandable group state for items with children (default open)
  const [expandedGroups, setExpandedGroups] = useState({
    'Society Finance': true,
    'Amenities & Bookings': true,
  });

  const toggleGroup = (title) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  // Filter items based on society subscription feature entitlements
  const allowedNavItems = navItems.filter((item) => {
    if (currentRole === ROLES.SUPER_ADMIN) return true;
    if (!item.feature) return true;
    if (!user?.features) return true; // fallback if features not loaded yet
    return user.features.includes(item.feature);
  });

  /**
   * Precise active matching that supports query parameters
   * and prevents multi-tab auto-selection.
   */
  const isItemActive = (item) => {
    // 1. If item has children, it's active if any child is active
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path);
    }

    // 2. If item path contains query params (e.g. ?type=COURIER or ?action=visitor)
    if (item.path.includes('?')) {
      return currentFullPath === item.path;
    }

    // 3. If item path has no query params, but another nav item specifically matches currentFullPath:
    const matchesSpecificOther = navItems.some(
      (other) => other !== item && other.path.includes('?') && other.path === currentFullPath
    );
    if (matchesSpecificOther) {
      return false;
    }

    // 4. Exact match for items with exact: true
    if (item.exact) {
      return location.pathname === item.path && !location.search;
    }

    // 5. Fallback path match
    return location.pathname === item.path;
  };

  return (
    <aside
      style={{
        width: isCollapsed ? '72px' : '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-card)',
        display: 'flex',
        flexDirection: 'column',
        padding: isCollapsed ? '16px 8px' : '20px 14px',
        gap: '14px',
        minHeight: '100vh',
        overflowY: 'auto',
        transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), padding 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
      }}
    >
      {/* Top Header: Role Badge & Collapse Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--color-clay)',
              }}
            >
              {roleConfig?.label || currentRole}
            </span>
          </div>
        )}
        <button
          type="button"
          id="btn-sidebar-collapse-toggle"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: isCollapsed ? 'rgba(196, 154, 108, 0.12)' : 'transparent',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px',
            color: 'var(--color-dark-brown)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = isCollapsed ? 'rgba(196, 154, 108, 0.12)' : 'transparent')
          }
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {allowedNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item);

          // If item has children (e.g., Society Finance -> Maintenance, Special Charges)
          if (item.children && item.children.length > 0) {
            const isGroupOpen = expandedGroups[item.title] ?? true;
            const hasActiveChild = item.children.some((c) => location.pathname === c.path);

            // Collapsed Mode for Grouped Items: Icon linking to first child with title tooltip
            if (isCollapsed) {
              const firstChildPath = item.children[0]?.path || item.path;
              return (
                <Link
                  key={item.title}
                  to={firstChildPath}
                  title={`${item.title}: ${item.children.map((c) => c.title).join(', ')}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 0',
                    borderRadius: 'var(--radius-md)',
                    color: hasActiveChild ? '#ffffff' : 'var(--text-main)',
                    background: hasActiveChild ? 'var(--color-clay)' : 'transparent',
                    position: 'relative',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    boxShadow: hasActiveChild ? '0 2px 8px rgba(196, 154, 108, 0.35)' : 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!hasActiveChild) e.currentTarget.style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!hasActiveChild) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={18} color={hasActiveChild ? '#ffffff' : 'var(--color-clay)'} />
                  {hasActiveChild && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 5,
                        right: 8,
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#ffffff',
                      }}
                    />
                  )}
                </Link>
              );
            }

            // Expanded Mode for Grouped Items
            return (
              <div
                key={item.title}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  borderRadius: 'var(--radius-md)',
                  background: hasActiveChild ? 'rgba(196, 154, 108, 0.08)' : 'transparent',
                  border: hasActiveChild ? '1px solid rgba(196, 154, 108, 0.22)' : '1px solid transparent',
                  padding: '3px',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Parent Row: Society Finance */}
                <div
                  onClick={() => toggleGroup(item.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    color: hasActiveChild ? 'var(--color-clay)' : 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!hasActiveChild) e.currentTarget.style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!hasActiveChild) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <Icon size={17} color={hasActiveChild ? 'var(--color-clay)' : 'var(--text-dim)'} />
                    <span>{item.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {hasActiveChild && (
                      <span
                        style={{
                          fontSize: '0.58rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: 'var(--color-clay)',
                          color: '#ffffff',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Active
                      </span>
                    )}
                    {isGroupOpen ? (
                      <ChevronDown size={14} color="var(--text-dim)" />
                    ) : (
                      <ChevronRight size={14} color="var(--text-dim)" />
                    )}
                  </div>
                </div>

                {/* Sub-Rows inside Society Finance */}
                {isGroupOpen && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      paddingLeft: '12px',
                      borderLeft: '2px solid rgba(196, 154, 108, 0.3)',
                      marginLeft: '14px',
                      marginTop: '2px',
                      marginBottom: '4px',
                    }}
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildCurrent = location.pathname === child.path;

                      return (
                        <Link
                          key={child.title}
                          to={child.path}
                          aria-current={isChildCurrent ? 'page' : undefined}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            borderRadius: 'var(--radius-sm)',
                            color: isChildCurrent ? '#ffffff' : 'var(--text-main)',
                            background: isChildCurrent ? 'var(--color-clay)' : 'transparent',
                            fontWeight: isChildCurrent ? 700 : 500,
                            fontSize: '0.8rem',
                            transition: 'all var(--transition-fast)',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            boxShadow: isChildCurrent ? '0 2px 6px rgba(196, 154, 108, 0.35)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChildIcon size={14} color={isChildCurrent ? '#ffffff' : 'var(--color-clay)'} />
                            <span>{child.title}</span>
                          </div>
                          {child.badge && (
                            <span
                              style={{
                                fontSize: '0.58rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: isChildCurrent ? 'rgba(255,255,255,0.25)' : 'rgba(196, 154, 108, 0.12)',
                                color: isChildCurrent ? '#ffffff' : 'var(--color-clay)',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                              }}
                            >
                              {child.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Single row item
          return (
            <Link
              key={item.title}
              to={item.path}
              title={isCollapsed ? item.title : undefined}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px 0' : '10px 14px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? '#ffffff' : 'var(--text-main)',
                background: isActive ? 'var(--color-clay)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer',
                textDecoration: 'none',
                boxShadow: isActive ? '0 2px 8px rgba(196, 154, 108, 0.35)' : 'none',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : '10px' }}>
                <Icon size={17} color={isActive ? '#ffffff' : 'var(--color-clay)'} />
                {!isCollapsed && <span>{item.title}</span>}
              </div>
              {!isCollapsed && item.badge && (
                <span
                  style={{
                    fontSize: '0.62rem',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(196, 154, 108, 0.12)',
                    color: isActive ? '#ffffff' : 'var(--color-clay)',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.badge}
                </span>
              )}
              {isCollapsed && item.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 8,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isActive ? '#ffffff' : 'var(--color-clay)',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div
        style={{
          paddingTop: '14px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isCollapsed ? 'center' : 'stretch',
          gap: '4px',
        }}
      >
        {isCollapsed ? (
          <div
            title={
              currentRole === ROLES.SUPER_ADMIN
                ? 'Platform Owner • Super Admin'
                : `${user?.subscription?.planName || 'Society Member'} • Authorized`
            }
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <FileCheck2 size={18} color="#10b981" />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileCheck2 size={14} color="#10b981" />
              <span>
                {currentRole === ROLES.SUPER_ADMIN
                  ? 'Platform Owner • Super Admin'
                  : `${user?.subscription?.planName || 'Society Member'} • Authorized`}
              </span>
            </div>
            {user?.subscription?.status && currentRole !== ROLES.SUPER_ADMIN && (
              <div
                style={{
                  fontSize: '0.65rem',
                  color: user.subscription.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                  paddingLeft: '20px',
                }}
              >
                Plan: {user.subscription.status}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
