import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '24px' }}>
      <div className="glass-panel" style={{ padding: '48px 36px', maxWidth: '440px', width: '100%' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <AlertTriangle size={32} />
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
          The page or module you are looking for does not exist or has moved.
        </p>
        <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', padding: '10px 20px' }}>
          <Home size={16} />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
