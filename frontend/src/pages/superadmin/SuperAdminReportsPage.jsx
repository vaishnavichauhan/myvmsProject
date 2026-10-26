import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  Shield,
  Activity,
  Calendar,
  Building2,
  Users,
  Home,
  RefreshCw,
  Clock,
} from 'lucide-react';
import superAdminApi from '../../api/superAdminApi';

export default function SuperAdminReportsPage() {
  const [logs, setLogs] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [logsRes, overviewRes] = await Promise.all([
        superAdminApi.getAuditLogs({ limit: 50 }),
        superAdminApi.getOverview(),
      ]);

      if (logsRes.success) setLogs(logsRes.data.logs || []);
      if (overviewRes.success) setOverview(overviewRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const stats = overview?.stats || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Platform Reports & Audit Logs
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
          Historical platform records, capacity analytics, and administrative audit trails.
        </p>
      </div>

      {/* Analytics Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Societies Onboarded</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {stats.totalSocieties || 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: '4px' }}>{stats.activeSocieties || 0} currently active</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Residential Units</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
            {stats.totalUnits || 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>Across all residential properties</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Total Registered Accounts</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {stats.totalUsers || 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>Residents, staff & security</div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', padding: '18px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Annualized Run-Rate (ARR)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#8B5CF6', marginTop: '4px' }}>
            ₹{(Number(stats.monthlyRecurringRevenue || 0) * 12).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>Based on current active subscriptions</div>
        </div>
      </div>

      {/* Platform Administrative Audit Trail */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--color-clay)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Administrative Action Audit Trail
            </h2>
          </div>

          <button
            onClick={fetchReports}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-main)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-card)' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Timestamp</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Action</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Target Type</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Society</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', fontWeight: 700 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid var(--border-card)',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(196, 154, 108, 0.15)',
                          color: 'var(--color-clay)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem' }}>
                      {log.target_type} {log.target_id ? `#${log.target_id}` : ''}
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                      {log.society_name || 'Platform Wide'}
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
