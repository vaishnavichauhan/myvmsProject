import React, { useState } from 'react';
import { AlertTriangle, Bell, Clock, ChevronRight, X, PhoneCall, ShieldAlert, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Visually Prominent Emergency Announcement Banner
 * Highlights active emergencies (e.g. Water supply outage, power grid issues, security alerts)
 * pinned at the top of resident & admin dashboards.
 */
export default function EmergencyBanner({ announcements = [] }) {
  const [dismissedIds, setDismissedIds] = useState([]);

  // Filter active emergency announcements that haven't been dismissed
  const emergencyList = announcements.filter(
    (a) =>
      (a.type === 'EMERGENCY' || a.priority === 'URGENT') &&
      a.status === 'ACTIVE' &&
      !dismissedIds.includes(a.id)
  );

  if (emergencyList.length === 0) {
    return null;
  }

  const handleDismiss = (id) => {
    setDismissedIds((prev) => [...prev, id]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
      {emergencyList.map((emergency) => (
        <div
          key={emergency.id}
          style={{
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.95) 100%)',
            border: '2px solid #ef4444',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.4), 0 8px 16px rgba(0, 0, 0, 0.4)',
            color: '#ffffff',
            padding: '16px 20px',
            position: 'relative',
            overflow: 'hidden',
            animation: 'pulseGlow 2.5s infinite alternate',
          }}
        >
          {/* Ambient diagonal warning stripes */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.04) 0, rgba(255, 255, 255, 0.04) 15px, transparent 15px, transparent 30px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
              {/* Flashing Alert Badge */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 15px rgba(255, 255, 255, 0.3)',
                }}
              >
                <ShieldAlert size={26} color="#ffffff" />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span
                    style={{
                      background: '#ffffff',
                      color: '#b91c1c',
                      fontWeight: 900,
                      fontSize: '0.725rem',
                      letterSpacing: '0.08em',
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  >
                    EMERGENCY ALERT
                  </span>

                  <span style={{ fontSize: '0.8rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    <span>{emergency.date ? new Date(emergency.date).toLocaleDateString() : 'Immediate Notice'}</span>
                  </span>

                  {emergency.created_by && (
                    <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                      • Authorized by: <strong>{emergency.created_by}</strong>
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 6px 0', letterSpacing: '-0.01em', color: '#ffffff' }}>
                  {emergency.title}
                </h4>

                {/* Description */}
                <p style={{ fontSize: '0.95rem', lineHeight: 1.5, margin: 0, color: 'rgba(255, 255, 255, 0.95)', fontWeight: 500 }}>
                  {emergency.description || emergency.content}
                </p>
              </div>
            </div>

            {/* Actions: View Details & Dismiss */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <Link
                to="/dashboard/notices"
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  color: '#ffffff',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>View Details</span>
                <ChevronRight size={14} />
              </Link>

              <button
                onClick={() => handleDismiss(emergency.id)}
                title="Dismiss banner"
                style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 0.8,
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
