import React, { useState, useEffect } from 'react';
import {
  Home,
  Plus,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  DoorOpen,

  Layers,
  RefreshCw,
  AlertTriangle,
  User,
  Trash2,
  X,
  ChevronDown,
} from 'lucide-react';
import { societyApi } from '../api/societyApi';
import apiClient from '../api/apiClient';

export default function HomesPage() {
  const [homes, setHomes] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Forms
  const [newHome, setNewHome] = useState({
    society_id: '',
    home_number: '',
    building_or_wing: 'Wing A',
    floor: '1',
    home_type: '2BHK',
    occupancy_status: 'VACANT',
  });

  const [batchConfig, setBatchConfig] = useState({
    society_id: '',
    count: 10,
    startFrom: 1,
    prefix: 'Home ',
    building_or_wing: 'Wing A',
    home_type: '2BHK',
  });

  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [socRes, homesRes] = await Promise.all([
        societyApi.getSocieties(),
        apiClient.get('/homes'),
      ]);

      const socList = socRes.data?.societies || socRes.societies || [];
      setSocieties(socList);

      const homesList = homesRes.data?.homes || homesRes.homes || [];
      setHomes(homesList);

      if (socList.length > 0) {
        setNewHome((p) => ({ ...p, society_id: socList[0].id }));
        setBatchConfig((p) => ({ ...p, society_id: socList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load initial homes data:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load homes' });
    } finally {
      setLoading(false);
    }
  };

  const fetchHomes = async (socId = selectedSocietyId) => {
    setLoading(true);
    try {
      const params = {};
      if (socId && socId !== 'ALL') {
        params.societyId = socId;
      }
      const res = await apiClient.get('/homes', { params });
      const homesList = res.data?.homes || res.homes || (Array.isArray(res) ? res : []);
      setHomes(homesList);
    } catch (err) {
      console.error('Failed to load homes:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to load homes' });
    } finally {
      setLoading(false);
    }
  };

  const handleSocietyChange = (socId) => {
    setSelectedSocietyId(socId);
    fetchHomes(socId);
  };

  const handleCreateHome = async (e) => {
    e.preventDefault();
    const targetSocId = newHome.society_id || (selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0]?.id) || 1;
    try {
      await societyApi.createHome(targetSocId, newHome);
      setMessage({ type: 'success', text: `Unit ${newHome.home_number} created successfully!` });
      setShowAddModal(false);
      setNewHome({
        society_id: targetSocId,
        home_number: '',
        building_or_wing: 'Wing A',
        floor: '1',
        home_type: '2BHK',
        occupancy_status: 'VACANT',
      });
      fetchHomes(selectedSocietyId);
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create home' });
    }
  };

  const handleBatchGenerate = async (e) => {
    e.preventDefault();
    const targetSocId = batchConfig.society_id || (selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0]?.id) || 1;
    try {
      await societyApi.batchGenerateHomes(targetSocId, batchConfig);
      setMessage({ type: 'success', text: `Generated ${batchConfig.count} units successfully!` });
      setShowBatchModal(false);
      fetchHomes(selectedSocietyId);
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to batch generate homes' });
    }
  };

  const handleDeleteHome = async (home) => {
    if (!window.confirm(`Are you sure you want to delete Home ${home.home_number}? This cannot be undone.`)) {
      return;
    }
    try {
      await societyApi.deleteHome(home.id);
      setMessage({ type: 'success', text: `Home ${home.home_number} deleted successfully!` });
      fetchHomes(selectedSocietyId);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete home' });
    }
  };

  const filteredHomes = homes.filter((h) => {
    const matchesSearch =
      (h.home_number && String(h.home_number).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.building_or_wing && String(h.building_or_wing).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.society_name && String(h.society_name).toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'OCCUPIED')
      return matchesSearch && (h.occupancy_status === 'OCCUPIED_BY_OWNER' || h.occupancy_status === 'OCCUPIED_BY_TENANT');
    if (statusFilter === 'VACANT') return matchesSearch && h.occupancy_status === 'VACANT';
    return matchesSearch;
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
            <Home style={{ width: 26, height: 26, color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>
              Society Homes & Inventory
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Residential unit allocation, types, floor maps & occupancy tracking
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              if (societies.length > 0) {
                const defSoc = selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0].id;
                setBatchConfig((p) => ({ ...p, society_id: defSoc }));
              }
              setShowBatchModal(true);
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >

            <span>Batch Generate</span>
          </button>
          <button
            onClick={() => {
              if (societies.length > 0) {
                const defSoc = selectedSocietyId !== 'ALL' ? selectedSocietyId : societies[0].id;
                setNewHome((p) => ({ ...p, society_id: defSoc }));
              }
              setShowAddModal(true);
            }}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            <span>Add Single Home</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: message.type === 'success' ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {message.type === 'success' ? (
            <CheckCircle2 style={{ width: 18, height: 18, flexShrink: 0 }} />
          ) : (
            <AlertTriangle style={{ width: 18, height: 18, flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.9rem' }}>{message.text}</span>
        </div>
      )}

      {/* Controls: Society Selector & Search & Filters */}
      <div
        className="glass-panel"
        style={{
          padding: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
          {/* Society Selector or Active Badge */}
          {societies.length > 1 ? (
            <div style={{ minWidth: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} color="var(--accent-indigo)" />
              <select
                className="input-field"
                style={{ marginBottom: 0, padding: '8px 12px', fontSize: '0.85rem', fontWeight: 600 }}
                value={selectedSocietyId}
                onChange={(e) => handleSocietyChange(e.target.value)}
              >
                <option value="ALL">All Societies ({societies.length})</option>
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || `ID: ${s.id}`})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-sand)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--color-dark-brown)',
              }}
            >
              <Building2 size={16} color="var(--color-clay)" />
              <span>{societies[0]?.name || ''}</span>
            </div>
          )}

          {/* Search Bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search
              style={{
                width: 16,
                height: 16,
                position: 'absolute',
                left: 12,
                top: 12,
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Search by home #, wing, or society..."
              style={{ paddingLeft: 38, marginBottom: 0 }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {['ALL', 'OCCUPIED', 'VACANT'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className="btn"
              style={{
                padding: '6px 14px',
                fontSize: '0.825rem',
                borderRadius: 8,
                background: statusFilter === filter ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: statusFilter === filter ? '#fff' : 'var(--text-muted)',
              }}
            >
              {filter}
            </button>
          ))}
          <button
            onClick={() => fetchHomes(selectedSocietyId)}
            className="btn btn-secondary"
            style={{ padding: '6px 12px' }}
            title="Refresh Homes"
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading residential homes & inventory...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredHomes.length === 0 && (
        <div
          className="glass-panel"
          style={{
            padding: 48,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <DoorOpen style={{ width: 48, height: 48, color: 'var(--text-dim)', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>No Residential Units Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 440, margin: 0 }}>
            {searchTerm || statusFilter !== 'ALL'
              ? 'No units match your current search or filter criteria.'
              : 'There are no homes recorded in this society yet. Use "Add Single Home" or "Batch Generate" above to quickly create residential units.'}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <Plus size={15} />
              <span>Add Single Home</span>
            </button>
            <button onClick={() => setShowBatchModal(true)} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>

              <span>Batch Generate</span>
            </button>
          </div>
        </div>
      )}

      {/* Homes Grid */}
      {!loading && filteredHomes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {filteredHomes.map((home) => {
            const isOccupied =
              home.occupancy_status === 'OCCUPIED_BY_OWNER' || home.occupancy_status === 'OCCUPIED_BY_TENANT';
            return (
              <div
                key={home.id}
                className="glass-panel"
                style={{
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isOccupied ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        background: isOccupied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isOccupied ? '#34d399' : '#fbbf24',
                        border: `1px solid ${isOccupied ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}
                    >
                      {isOccupied ? 'OCCUPIED' : 'VACANT'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      {home.home_type || '2BHK'}
                    </span>
                  </div>

                  {home.society_name && (
                    <div style={{ fontSize: '0.725rem', color: 'var(--accent-indigo)', fontWeight: 600, marginBottom: 4 }}>
                      {home.society_name}
                    </div>
                  )}

                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: '2px 0 6px' }}>
                    Home {home.home_number}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    {home.building_or_wing || 'Main Wing'} • Floor {home.floor !== null ? home.floor : 1}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 10,
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.775rem',
                    color: isOccupied ? '#818cf8' : 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isOccupied ? <User style={{ width: 14, height: 14 }} /> : <DoorOpen style={{ width: 14, height: 14 }} />}
                    <span>{home.occupancy_status ? home.occupancy_status.replace(/_/g, ' ') : 'Ready for Allotment'}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteHome(home)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete Home Unit"
                  >
                    <Trash2 size={13} color="#f87171" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Single Home Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: 460, padding: 26, background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>Add Residential Unit</h2>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateHome}>
              {/* Target Society Selector */}
              <div className="input-group">
                <label className="input-label">Target Society *</label>
                <select
                  required
                  className="input-field"
                  value={newHome.society_id}
                  onChange={(e) => setNewHome({ ...newHome, society_id: e.target.value })}
                >
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || `ID: ${s.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Home Number *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 501, Villa 12, Home 102"
                  value={newHome.home_number}
                  onChange={(e) => setNewHome({ ...newHome, home_number: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Building / Wing</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Wing A, Tower 2"
                    value={newHome.building_or_wing}
                    onChange={(e) => setNewHome({ ...newHome, building_or_wing: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Floor</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 5"
                    value={newHome.floor}
                    onChange={(e) => setNewHome({ ...newHome, floor: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Home Type</label>
                  <select
                    className="input-field"
                    value={newHome.home_type}
                    onChange={(e) => setNewHome({ ...newHome, home_type: e.target.value })}
                  >
                    <option value="1BHK">1 BHK</option>
                    <option value="2BHK">2 BHK</option>
                    <option value="3BHK">3 BHK</option>
                    <option value="4BHK">4 BHK</option>
                    <option value="STUDIO">Studio</option>
                    <option value="PENTHOUSE">Penthouse</option>
                    <option value="VILLA">Villa</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Occupancy Status</label>
                  <select
                    className="input-field"
                    value={newHome.occupancy_status}
                    onChange={(e) => setNewHome({ ...newHome, occupancy_status: e.target.value })}
                  >
                    <option value="VACANT">VACANT</option>
                    <option value="OCCUPIED_BY_OWNER">Occupied by Owner</option>
                    <option value="OCCUPIED_BY_TENANT">Occupied by Tenant</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Generate Modal */}
      {showBatchModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: 460, padding: 26, background: '#FFFFFF', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-heading)' }}>Batch Generate Homes</h2>
              <button
                onClick={() => setShowBatchModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBatchGenerate}>
              {/* Target Society Selector */}
              <div className="input-group">
                <label className="input-label">Target Society *</label>
                <select
                  required
                  className="input-field"
                  value={batchConfig.society_id}
                  onChange={(e) => setBatchConfig({ ...batchConfig, society_id: e.target.value })}
                >
                  {societies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || `ID: ${s.id}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Prefix (e.g. "Home ", "Flat ", or leave empty)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Home "
                  value={batchConfig.prefix}
                  onChange={(e) => setBatchConfig({ ...batchConfig, prefix: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Start From Number</label>
                  <input
                    type="number"
                    className="input-field"
                    value={batchConfig.startFrom}
                    onChange={(e) => setBatchConfig({ ...batchConfig, startFrom: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Count of Units to Create</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    className="input-field"
                    value={batchConfig.count}
                    onChange={(e) => setBatchConfig({ ...batchConfig, count: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Building / Wing</label>
                  <input
                    type="text"
                    className="input-field"
                    value={batchConfig.building_or_wing}
                    onChange={(e) => setBatchConfig({ ...batchConfig, building_or_wing: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Home Type</label>
                  <select
                    className="input-field"
                    value={batchConfig.home_type}
                    onChange={(e) => setBatchConfig({ ...batchConfig, home_type: e.target.value })}
                  >
                    <option value="1BHK">1 BHK</option>
                    <option value="2BHK">2 BHK</option>
                    <option value="3BHK">3 BHK</option>
                    <option value="4BHK">4 BHK</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button type="button" onClick={() => setShowBatchModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate All
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
