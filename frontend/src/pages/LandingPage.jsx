import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Shield,
  KeyRound,
  Users2,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  UserCheck,
  Bell,
  CheckCircle2,
  Smartphone,
  QrCode,
  Download,
  Star,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  Lock,
  Layers,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ROLES, ROLE_CONFIG } from '../constants/roles';
import Navbar from '../components/layout/Navbar';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, checkHealth } = useAuthStore();

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const rolesList = [
    {
      role: ROLES.ADMIN,
      title: 'Society Administrator',
      desc: 'Centralized command center for managing society settings, residential flats, user accounts, and security audit logs.',
      icon: Shield,
    },
    {
      role: ROLES.OWNER,
      title: 'Property Owner',
      desc: 'Comprehensive flat management with ownership records, maintenance tracking, tenant assignments, and voting resolutions.',
      icon: KeyRound,
    },
    {
      role: ROLES.TENANT,
      title: 'Tenant Resident',
      desc: 'Smart residential living with digital visitor passes, parcel delivery alerts, maintenance complaints, and society notices.',
      icon: Users2,
    },
    {
      role: ROLES.FAMILY_MEMBER,
      title: 'Family Member',
      desc: 'Convenient home access, delivery agent pre-approvals, vehicle registrations, and stay updated with community happenings.',
      icon: Users2,
    },
    {
      role: ROLES.SECURITY,
      title: 'Gate Security Guard',
      desc: 'High-speed security console for visitor check-in, OTP verification, courier arrivals, domestic workers, and vehicle logs.',
      icon: Shield,
    },
    {
      role: ROLES.COMMITTEE_MEMBER,
      title: 'Management Committee',
      desc: 'Society governance portal for financial budgets, general body meetings, vendor tenders, and community rules.',
      icon: Building2,
    },
  ];

  return (
    <div className="app-container">
      <Navbar />

      <main className="main-content" style={{ padding: '48px 24px 80px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Hero Section */}
          <section style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h1 style={{
              fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)',
              lineHeight: 1.18,
              fontWeight: 800,
              marginBottom: '18px',
              color: 'var(--color-dark-brown)',
              letterSpacing: '-0.025em',
            }}>
              Modern, Secure & Connected <br />
              <span style={{ color: 'var(--color-clay)' }}>Residential Living</span>
            </h1>

            {/* Architectural Community Visual Showcase */}
            <div
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-lg)',
                aspectRatio: '16/9',
                maxHeight: '480px',
                width: '100%',
                background: '#FAF5ED',
              }}
            >
              <img
                src="/images/community-hero.jpg"
                alt="Modern luxury gated residential community with warm sandstone architecture and lush landscaped gardens"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(64, 54, 48, 0.75) 0%, rgba(64, 54, 48, 0.1) 45%, transparent 100%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  left: '24px',
                  right: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  flexWrap: 'wrap',
                  gap: '12px',
                  color: '#FFFFFF',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Residential Excellence
                  </div>
                </div>
              </div>
            </div>

            {/* Full Width Banner After Image */}
            <div
              className="glass-panel"
              style={{
                width: '100%',
                marginTop: '28px',
                padding: '24px 32px',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border-card)',
                background: '#FFFFFF',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '24px',
                textAlign: 'left',
              }}
            >
              <p
                style={{
                  fontSize: '1.1rem',
                  color: 'var(--color-dark-brown)',
                  margin: 0,
                  maxWidth: '740px',
                  lineHeight: 1.6,
                  fontWeight: 500,
                  flex: '1 1 360px',
                }}
              >
                Experience smarter society living with effortless visitor management, community updates, home services, and everything your neighborhood needs in one place.
              </p>

              <button
                id="btn-hero-dashboard"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                className="btn btn-primary"
                style={{
                  padding: '14px 28px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{isAuthenticated ? 'Enter Dashboard' : 'Open Society Portal'}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </section>

          {/* Application Information & Core Features */}
          <section style={{ marginBottom: '64px' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--color-clay)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '8px'
              }}>
                Smart Society Ecosystem
              </div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '12px' }}>
                Everything Your Society Needs in One Platform
              </h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto', fontSize: '1rem', lineHeight: 1.6 }}>
                MyVms replaces legacy manual paper registers with an intuitive, real-time digital management system designed for residents, management committees, and security personnel.
              </p>
            </div>

            {/* 4 Feature Pillars */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              <div
                className="glass-panel"
                style={{
                  padding: '28px',
                  borderRadius: 'var(--radius-lg)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(196, 154, 108, 0.16)',
                  color: 'var(--color-clay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px'
                }}>
                  <ShieldCheck size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '8px' }}>
                  Smart Visitor Passes
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Pre-approve family, friends, and cabs with instant OTP gatepasses. Security guards verify visitors in seconds, eliminating gate congestion.
                </p>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '28px',
                  borderRadius: 'var(--radius-lg)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(135, 206, 235, 0.25)',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px'
                }}>
                  <PackageCheck size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '8px' }}>
                  Courier & Delivery Hub
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Log delivery agents from Amazon, Swiggy, Zomato, and Blinkit. Residents receive immediate notifications to allow gate entry or authorize parcel drops.
                </p>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '28px',
                  borderRadius: 'var(--radius-lg)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(107, 142, 90, 0.16)',
                  color: 'var(--color-fern-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px'
                }}>
                  <UserCheck size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '8px' }}>
                  Daily Staff Tracking
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Maintain digital attendance for domestic staff, maids, drivers, and maintenance workers. Track real-time inside/outside society status at a glance.
                </p>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '28px',
                  borderRadius: 'var(--radius-lg)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(196, 154, 108, 0.16)',
                  color: 'var(--color-clay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '18px'
                }}>
                  <Bell size={24} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '8px' }}>
                  Notice Board & Alerts
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                  Publish official society announcements, emergency circulars, and water/power maintenance schedules. Connect directly with Management Committee members.
                </p>
              </div>
            </div>

            {/* Quick Application Highlights Banner */}

          </section>

          {/* User Roles Showcase */}
          <section style={{ marginBottom: '60px' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '8px' }}>
                Multi-Role Architecture
              </h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                Manage your home, stay updated with society announcements, approve visitors, register domestic workers, and connect with your community — all from one place.
              </p>
            </div>

            <div className="grid-cols-auto">
              {rolesList.map((item) => {
                const config = ROLE_CONFIG[item.role];
                const Icon = item.icon;

                return (
                  <div
                    key={item.role}
                    className="glass-panel"
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-card)',
                      background: '#FFFFFF',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(196, 154, 108, 0.16)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-clay)',
                      }}>
                        <Icon size={20} />
                      </div>
                      <span className={`badge ${config?.badgeClass}`}>
                        {item.role}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '8px' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ========================================================
              OUR HIGHLIGHTS SECTION
              1) Unlimited Licenses -> No per-user fees, unlimited residents
              2) No Hidden Charges -> Transparent pricing with no surprises
              3) Feature-Rich Product -> Complete ERP with 50+ modules included
              ======================================================== */}
          <section id="our-highlights" style={{ marginBottom: '72px' }}>
            <div style={{ textAlign: 'center', marginBottom: '38px' }}>


              <h2
                style={{
                  fontSize: 'clamp(2rem, 3.2vw, 2.6rem)',
                  fontWeight: 800,
                  color: 'var(--color-dark-brown)',
                  letterSpacing: '-0.025em',
                  margin: '0 0 12px',
                }}
              >
                Our Highlights
              </h2>

              <p
                style={{
                  color: 'var(--text-muted)',
                  maxWidth: '640px',
                  margin: '0 auto',
                  fontSize: '1rem',
                  lineHeight: 1.6,
                }}
              >
                Engineered for residential communities that demand complete transparency, unlimited scale, and enterprise-grade capability without surprises.
              </p>
            </div>

            {/* 3 Prominent Highlights Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px',
              }}
            >
              {/* Highlight 1: Unlimited Licenses */}
              <div
                className="glass-panel"
                style={{
                  padding: '34px 30px',
                  borderRadius: 'var(--radius-xl)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-card)',
                  boxShadow: '0 6px 20px rgba(196, 154, 108, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'var(--color-clay)',
                  }}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'rgba(196, 154, 108, 0.16)',
                        color: 'var(--color-clay)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users2 size={26} />
                    </div>


                  </div>

                  <h3
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: 'var(--color-dark-brown)',
                      margin: '0 0 8px',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Unlimited Licenses
                  </h3>

                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--color-clay)',
                      marginBottom: '14px',
                      lineHeight: 1.4,
                    }}
                  >
                    No per-user fees, unlimited residents
                  </div>

                  <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    Empower your entire community without worrying about tiered seat licenses. Onboard every flat owner, family member, tenant, and domestic helper with zero user caps.
                  </p>
                </div>


              </div>

              {/* Highlight 2: No Hidden Charges */}
              <div
                className="glass-panel"
                style={{
                  padding: '34px 30px',
                  borderRadius: 'var(--radius-xl)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-card)',
                  boxShadow: '0 6px 20px rgba(196, 154, 108, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'var(--color-fern-green)',
                  }}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'rgba(107, 142, 90, 0.16)',
                        color: 'var(--color-fern-green)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ShieldCheck size={26} />
                    </div>


                  </div>

                  <h3
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: 'var(--color-dark-brown)',
                      margin: '0 0 8px',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    No Hidden Charges
                  </h3>

                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--color-fern-green)',
                      marginBottom: '14px',
                      lineHeight: 1.4,
                    }}
                  >
                    Transparent pricing with no surprises
                  </div>

                  <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    Clear, upfront pricing with absolutely no hidden convenience fees, surprise setup surcharges, SMS markups, or lock-in penalties. What you see is what you pay.
                  </p>
                </div>


              </div>

              {/* Highlight 3: Feature-Rich Product */}
              <div
                className="glass-panel"
                style={{
                  padding: '34px 30px',
                  borderRadius: 'var(--radius-xl)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-card)',
                  boxShadow: '0 6px 20px rgba(196, 154, 108, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: '#0284C7',
                  }}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'rgba(135, 206, 235, 0.22)',
                        color: '#0284C7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Layers size={26} />
                    </div>


                  </div>

                  <h3
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      color: 'var(--color-dark-brown)',
                      margin: '0 0 8px',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Feature-Rich Product
                  </h3>

                  <div
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#0284C7',
                      marginBottom: '14px',
                      lineHeight: 1.4,
                    }}
                  >
                    Complete ERP with 50+ modules included
                  </div>

                  <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                    A full-scale society management system containing visitor gatepasses, parcel drop tracking, domestic worker attendance, emergency broadcasts, and committee governance.
                  </p>
                </div>


              </div>
            </div>
          </section>

          {/* ========================================================
              MOBILE APP SHOWCASE SECTION (Android & iOS)
              Reference: https://ind.adda.io/
              ======================================================== */}
          <section
            id="mobile-apps-section"
            className="glass-panel"
            style={{
              marginBottom: '72px',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              background: '#FFFFFF',
              border: '1px solid var(--border-card)',
              boxShadow: '0 8px 30px rgba(196, 154, 108, 0.1)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                alignItems: 'center',
                gap: '40px',
                padding: '44px 40px',
              }}
            >
              {/* Left Column: Details & Store Badges */}
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(196, 154, 108, 0.16)',
                    border: '1px solid var(--color-sand)',
                    color: 'var(--color-clay)',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '16px',
                  }}
                >
                  <Smartphone size={16} />
                  <span>Available on Mobile • Android & iOS</span>
                </div>

                <h2
                  style={{
                    fontSize: 'clamp(2rem, 3.2vw, 2.6rem)',
                    fontWeight: 800,
                    color: 'var(--color-dark-brown)',
                    lineHeight: 1.2,
                    letterSpacing: '-0.025em',
                    marginBottom: '16px',
                  }}
                >
                  Smart Society Living in Your Pocket
                </h2>

                <p
                  style={{
                    fontSize: '1.02rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    marginBottom: '26px',
                  }}
                >
                  Empower your residents, gate security officers, and facility managers with our high-speed mobile application. Approve visitors with 1-tap, authorize deliveries from your couch, and stay connected with community updates anywhere.
                </p>

                {/* 4 Feature Points */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(107, 142, 90, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-fern-green)',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--color-dark-brown)', fontSize: '0.95rem' }}>
                        1-Tap Instant Gate Approvals:
                      </strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                        Receive real-time push notifications when visitors, taxis, or couriers arrive and approve entry with a single tap.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(107, 142, 90, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-fern-green)',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--color-dark-brown)', fontSize: '0.95rem' }}>
                        Digital QR Gate Passes:
                      </strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                        Pre-invite family, party guests, and service contractors with auto-generated contactless QR passes.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(107, 142, 90, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-fern-green)',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--color-dark-brown)', fontSize: '0.95rem' }}>
                        Daily Staff & Maid In/Out Alerts:
                      </strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                        Know the exact moment your maid, driver, or cook enters or leaves the residential complex.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(107, 142, 90, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-fern-green)',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <strong style={{ color: 'var(--color-dark-brown)', fontSize: '0.95rem' }}>
                        Zero-Exposure Resident Privacy (DPDP Compliant):
                      </strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                        Resident mobile numbers remain strictly confidential and masked from visitors and security desks.
                      </span>
                    </div>
                  </div>
                </div>

                {/* App Store & Google Play Download Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {/* Google Play Button */}
                  <a
                    href="#download-android"
                    onClick={(e) => { e.preventDefault(); alert('MyVMS Android app download link will be dispatched to your registered mobile number!'); }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: '#1A1817',
                      color: '#FFFFFF',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M3.609 1.814L13.793 12 3.61 22.186A1.94 1.94 0 0 1 3 20.767V3.233c0-.573.226-1.096.609-1.42z" fill="#00E676" />
                      <path d="M17.18 8.613L4.853 1.5A1.97 1.97 0 0 0 3.61 1.814l10.183 10.186 3.387-3.387z" fill="#FFD54F" />
                      <path d="M3.61 22.186c.367.314.862.43 1.243.214l12.327-7.113-3.387-3.387L3.61 22.186z" fill="#F44336" />
                      <path d="M20.914 10.76l-3.734-2.147-3.387 3.387 3.387 3.387 3.734-2.147a1.43 1.43 0 0 0 0-2.48z" fill="#03A9F4" />
                    </svg>
                    <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                      <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#D6C2A1' }}>
                        GET IT ON
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                        Google Play
                      </div>
                    </div>
                  </a>

                  {/* Apple App Store Button */}
                  <a
                    href="#download-ios"
                    onClick={(e) => { e.preventDefault(); alert('MyVMS iOS app download link will be dispatched to your registered mobile number!'); }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: '#1A1817',
                      color: '#FFFFFF',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.06-.51 2.68-1.26z" />
                    </svg>
                    <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                      <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#D6C2A1' }}>
                        Download on the
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                        App Store
                      </div>
                    </div>
                  </a>

                  {/* Rating Badge */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(196, 154, 108, 0.1)',
                      border: '1px solid var(--color-sand)',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', color: '#F59E0B' }}>
                      <Star size={16} fill="#F59E0B" />
                      <Star size={16} fill="#F59E0B" />
                      <Star size={16} fill="#F59E0B" />
                      <Star size={16} fill="#F59E0B" />
                      <Star size={16} fill="#F59E0B" />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-dark-brown)' }}>
                      4.9 Rating (50K+ Residents)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Mockup Showcase */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '540px',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(64, 54, 48, 0.18)',
                    border: '4px solid #FFFFFF',
                    background: '#FAF5ED',
                  }}
                >
                  <img
                    src="/images/mobile-app-showcase.jpg"
                    alt="MyVMS Android and iOS mobile application interface"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />

                  {/* Floating Badges */}



                </div>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ========================================================
          ENTERPRISE FOOTER SECTION
          Reference: https://ind.adda.io/
          With prominent "Powered by Jeenweb Technology"
          ======================================================== */}
      <footer
        style={{
          background: '#1F1A17',
          color: '#FFFFFF',
          borderTop: '1px solid rgba(214, 194, 161, 0.25)',
          marginTop: 'auto',
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '64px 24px 32px',
          }}
        >
          {/* 5-Column Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '40px',
              marginBottom: '54px',
            }}
          >
            {/* Column 1: Brand & Contact Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--color-clay)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 12px rgba(196, 154, 108, 0.3)',
                  }}
                >
                  <Building2 size={22} />
                </div>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                  MyVms
                </span>
              </div>

              <p style={{ color: '#D6C2A1', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '20px' }}>
                India's intelligent community operations & visitor management platform. Trusted for verified security, resident convenience, and residential governance.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#E5DCD0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} color="var(--color-clay)" />
                  <span>support@jeenweb.com</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={14} color="var(--color-clay)" />
                  <span>+91 (022) 4893 2770</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={14} color="var(--color-clay)" />
                  <span>Vadodara</span>
                </div>
              </div>
            </div>

            {/* Column 2: Platform Solutions */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-sand)', marginBottom: '18px' }}>
                Platform Solutions
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                <li><a href="#solutions" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Resident Super App</a></li>
                <li><a href="#solutions" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Gatekeeper Security Console</a></li>
                <li><a href="#solutions" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Society Administration ERP</a></li>
                <li><a href="#solutions" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Domestic Worker Attendance</a></li>
                <li><a href="#solutions" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Parcel & Courier Drop Hub</a></li>
                <li><a href="#solutions" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Notice Board & Circulars</a></li>
              </ul>
            </div>

            {/* Column 3: Community Roles */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-sand)', marginBottom: '18px' }}>
                Role Portals
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                <li><a href="#roles" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Property Owner Portal</a></li>
                <li><a href="#roles" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Tenant Living Space</a></li>
                <li><a href="#roles" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Family Member Passes</a></li>
                <li><a href="#roles" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Security Guard Terminal</a></li>
                <li><a href="#roles" style={{ color: '#D6C2A1', textDecoration: 'none' }}>Governing Council / Committee</a></li>
                <li><a href="#roles" style={{ color: '#D6C2A1', textDecoration: 'none' }}>System Administrator</a></li>
              </ul>
            </div>
            {/* Column 5: Compliance & Trust */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-sand)', marginBottom: '18px' }}>
                Governance & Trust
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D6C2A1' }}>
                  <ShieldCheck size={14} color="var(--color-fern-green)" /> DPDP Act 2023 Compliant
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D6C2A1' }}>
                  <Lock size={14} color="var(--color-fern-green)" /> ISO 27001 Certified Security
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D6C2A1' }}>
                  <CheckCircle2 size={14} color="var(--color-fern-green)" /> Zero Data Monetization
                </li>
                <li style={{ color: '#D6C2A1' }}>Society Bylaws Compatible</li>
                <li style={{ color: '#D6C2A1' }}>Audit Trail Logging</li>
                <li style={{ color: '#D6C2A1' }}>Emergency Disaster Dispatch</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Powered by Jeenweb Technology */}
          <div
            style={{
              paddingTop: '26px',
              borderTop: '1px solid rgba(214, 194, 161, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Copyright */}
            <div style={{ fontSize: '0.85rem', color: '#D6C2A1' }}>
              © 2026 <strong>MyVms</strong> Community Living Systems. All rights reserved.
            </div>

            {/* POWERED BY JEENWEB TECHNOLOGY BADGE */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(196, 154, 108, 0.18)',
                border: '1px solid rgba(196, 154, 108, 0.4)',
                padding: '7px 18px',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)',
              }}
            >

              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.02em' }}>
                Powered by <span style={{ color: '#E8CA9D' }}>Jeenweb Technology</span>
              </span>
            </div>


          </div>
        </div>
      </footer>
    </div>
  );
}
