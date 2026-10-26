import React, { useState, useEffect } from 'react';
import { Sparkles, Layers, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import superAdminApi from '../../api/superAdminApi';

export default function SuperAdminFeaturesPage() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getPlatformFeatures();
      if (res.success) {
        setFeatures(Array.isArray(res.data) ? res.data : (res.data?.features || []));
      }
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Platform Feature Registry
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
          Registered application modules that can be packaged into subscription plans and granted to societies.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {loading ? (
          <div style={{ gridColumn: '1 / -1', padding: '50px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Loading registered features...
          </div>
        ) : (
          features.map((feat) => (
            <div
              key={feat.code}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  {feat.code}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                  }}
                >
                  ACTIVE
                </span>
              </div>

              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                {feat.name}
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                {feat.description || 'Core platform functionality available for society subscription plans.'}
              </p>

              <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                Category: <strong>{feat.module_group || 'CORE'}</strong>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
