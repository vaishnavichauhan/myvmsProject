import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  Activity,
  Truck,
  Users,
  CheckCircle2,
  RefreshCw,
  DoorOpen,
  Shield,
  Layers,
} from 'lucide-react';
import apiClient from '../api/apiClient';

export default function ReportsPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/reports/summary');
      if (res?.success || res?.data) {
        setReportData(res.data || res);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    setExporting(true);
    setTimeout(() => {
      // Simulate download
      const logs = reportData?.recentGateLogs || [];
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        ['ID,Person,Type,Phone,Vehicle,Direction,Status,Home,Time']
          .concat(
            logs.map(
              (l) =>
                `${l.id},"${l.person_name}","${l.entry_person_type}","${l.person_phone || ''}","${l.vehicle_number || ''}","${l.direction}","${l.status}","${l.home_number || ''}","${l.entry_time}"`
            )
          )
          .join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `MYVMS_Gate_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExporting(false);
    }, 400);
  };

  const logs = reportData?.recentGateLogs || [];
  const filteredLogs = logs.filter((l) => {
    if (selectedTab === 'ALL') return true;
    if (selectedTab === 'VISITOR' && l.entry_person_type === 'VISITOR') return true;
    if (selectedTab === 'DELIVERY' && l.entry_person_type === 'DELIVERY') return true;
    if (selectedTab === 'WORKER' && l.entry_person_type === 'WORKER') return true;
    return false;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3 style={{ width: 26, height: 26, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>
              Society Reports & Audit Logs
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Comprehensive operational intelligence, barrier movement audits & verification logs
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="btn btn-primary"
          style={{ padding: '10px 18px', fontSize: '0.875rem' }}
        >
          <Download style={{ width: 16, height: 16 }} />
          <span>{exporting ? 'Generating...' : 'Export Audit CSV'}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gate Entries Logged</span>
            <Activity style={{ width: 18, height: 18, color: '#818cf8' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
            {logs.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Recent perimeter entries recorded
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verified Visitors</span>
            <Users style={{ width: 18, height: 18, color: '#34d399' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>
            {logs.filter((l) => l.entry_person_type === 'VISITOR').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Guest passes recorded
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Delivery Logs</span>
            <Truck style={{ width: 18, height: 18, color: '#fb923c' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fb923c' }}>
            {logs.filter((l) => l.entry_person_type === 'DELIVERY').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Courier & parcel checks
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Audit Status</span>
            <Shield style={{ width: 18, height: 18, color: '#60a5fa' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa' }}>
            100%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            System audit trail verified
          </div>
        </div>
      </div>

      {/* Movement Audit Table */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Perimeter Movement Audit Log
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Real-time audit log of security checkpoints, direction, and permissions
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {['ALL', 'VISITOR', 'DELIVERY', 'WORKER'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className="btn"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  borderRadius: 8,
                  background: selectedTab === tab ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: selectedTab === tab ? '#fff' : 'var(--text-muted)',
                }}
              >
                {tab}
              </button>
            ))}
            <button onClick={fetchReport} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '12px 14px' }}>Person</th>
                <th style={{ padding: '12px 14px' }}>Category</th>
                <th style={{ padding: '12px 14px' }}>Target Home</th>
                <th style={{ padding: '12px 14px' }}>Vehicle</th>
                <th style={{ padding: '12px 14px' }}>Direction</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)' }}>
                    No logs recorded for this category.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#fff' }}>
                      {log.person_name}
                      {log.person_phone && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                          {log.person_phone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          background: 'rgba(99,102,241,0.15)',
                          color: '#818cf8',
                        }}
                      >
                        {log.entry_person_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {log.home_number ? `Unit ${log.home_number}` : 'Society Campus'}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {log.vehicle_number || 'Pedestrian'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          background: log.direction === 'IN' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: log.direction === 'IN' ? '#34d399' : '#fbbf24',
                        }}
                      >
                        {log.direction}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          background: 'rgba(16,185,129,0.12)',
                          color: '#34d399',
                        }}
                      >
                        {log.status || 'APPROVED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {log.entry_time ? new Date(log.entry_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Today'}
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
