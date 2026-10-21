import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Building2,
  Plus,
  Home,
  Phone,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  Layers,

  X,
  RefreshCw,
  MapPin,
  ShieldAlert,
  UserCheck,
  Key,
  PhoneCall,
} from 'lucide-react';
import { societyApi } from '../api/societyApi';
import { useAuthStore } from '../store/authStore';

export default function SocietiesPage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSociety, setSelectedSociety] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageHomesModal, setShowManageHomesModal] = useState(false);
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [showBatchHomesModal, setShowBatchHomesModal] = useState(false);

  // Forms
  const [societyForm, setSocietyForm] = useState({
    name: '',
    address: '',
    society_type: 'FLAT',
    total_homes: 50,
    contact_number: '',
    emergency_number: '',
    status: 'ACTIVE',
  });

  const [homeForm, setHomeForm] = useState({
    home_number: '',
    building_or_wing: '',
    floor: '',
    home_type: '2BHK',
    status: 'ACTIVE',
  });

  const [batchForm, setBatchForm] = useState({
    count: 20,
    startFrom: 1,
    prefix: 'Home ',
    building_or_wing: 'Wing A',
    home_type: '2BHK',
  });

  const [societyHomes, setSocietyHomes] = useState([]);
  const [loadingHomes, setLoadingHomes] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchSocieties();
  }, []);

  const fetchSocieties = async () => {
    setLoading(true);
    try {
      const res = await societyApi.getSocieties();
      const rawSocieties = res.data?.societies || [];

      // Ensure occupied_homes_count and vacant_homes_count are populated
      const enriched = await Promise.all(
        rawSocieties.map(async (soc) => {
          if (soc.occupied_homes_count !== undefined && soc.occupied_homes_count !== null) {
            return soc;
          }
          try {
            const homesRes = await societyApi.getHomesBySociety(soc.id);
            const homes = homesRes.data?.homes || [];
            const occupied = homes.filter(
              (h) => h.occupancy_status === 'OCCUPIED_BY_OWNER' || h.occupancy_status === 'OCCUPIED_BY_TENANT'
            ).length;
            const vacant = homes.filter((h) => h.occupancy_status === 'VACANT').length;
            return {
              ...soc,
              actual_homes_count: homes.length,
              occupied_homes_count: occupied,
              vacant_homes_count: vacant,
            };
          } catch (_) {
            return soc;
          }
        })
      );

      setSocieties(enriched);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load societies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.openCreate && societies.length === 0 && !loading && isAdmin) {
      setSocietyForm({
        name: '',
        address: '',
        society_type: 'FLAT',
        total_homes: 50,
        contact_number: '',
        emergency_number: '',
        status: 'ACTIVE',
      });
      setShowCreateModal(true);
    }
  }, [location.state, societies.length, loading, isAdmin]);

  const handleOpenHomes = async (society) => {
    setSelectedSociety(society);
    setShowManageHomesModal(true);
    fetchHomes(society.id);
  };

  const fetchHomes = async (societyId) => {
    setLoadingHomes(true);
    try {
      const res = await societyApi.getHomesBySociety(societyId);
      setSocietyHomes(res.data?.homes || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load homes.');
    } finally {
      setLoadingHomes(false);
    }
  };

  const handleCreateSociety = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (societies.length >= 1) {
      setErrorMsg('Only one society can be registered. The system is configured for a single residential society.');
      return;
    }

    try {
      await societyApi.createSociety(societyForm);
      setSuccessMsg('Society created successfully!');
      setShowCreateModal(false);
      setSocietyForm({
        name: '',
        address: '',
        society_type: 'FLAT',
        total_homes: 50,
        contact_number: '',
        emergency_number: '',
        status: 'ACTIVE',
      });
      fetchSocieties();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Error creating society.');
    }
  };

  const handleOpenEdit = (soc) => {
    setSelectedSociety(soc);
    setSocietyForm({
      name: soc.name,
      address: soc.address || '',
      society_type: soc.society_type,
      total_homes: soc.total_homes,
      contact_number: soc.contact_number || '',
      emergency_number: soc.emergency_number || '',
      status: soc.status,
    });
    setShowEditModal(true);
  };

  const handleEditSociety = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await societyApi.updateSociety(selectedSociety.id, societyForm);
      setSuccessMsg('Society updated successfully!');
      setShowEditModal(false);
      fetchSocieties();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Error updating society.');
    }
  };

  const handleDeleteSociety = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await societyApi.deleteSociety(id, false);
      setSuccessMsg('Society deactivated.');
      fetchSocieties();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete society.');
    }
  };

  const handleAddHome = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await societyApi.createHome(selectedSociety.id, homeForm);
      setSuccessMsg(`Home ${homeForm.home_number} added!`);
      setShowAddHomeModal(false);
      setHomeForm({ home_number: '', building_or_wing: '', floor: '', home_type: '2BHK', status: 'ACTIVE' });
      fetchHomes(selectedSociety.id);
      fetchSocieties();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add home.');
    }
  };

  const handleBatchGenerate = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await societyApi.batchGenerateHomes(selectedSociety.id, batchForm);
      setSuccessMsg(res.data?.message || 'Batch generation complete!');
      setShowBatchHomesModal(false);
      fetchHomes(selectedSociety.id);
      fetchSocieties();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to batch generate homes.');
    }
  };

  const handleDeleteHome = async (homeId) => {
    if (!window.confirm('Delete this home?')) return;
    try {
      await societyApi.deleteHome(homeId);
      fetchHomes(selectedSociety.id);
      fetchSocieties();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete home.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--grad-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <Building2 size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: 0 }}>Society Management</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Residential complex infrastructure, unit portfolio, and governance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchSocieties}
            className="btn btn-outline"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
            title="Refresh society details"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {isAdmin && societies.length === 0 && (
            <button
              id="btn-create-society"
              onClick={() => {
                setSocietyForm({
                  name: '',
                  address: '',
                  society_type: 'FLAT',
                  total_homes: 50,
                  contact_number: '',
                  emergency_number: '',
                  status: 'ACTIVE',
                });
                setShowCreateModal(true);
              }}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.9rem' }}
            >
              <Plus size={16} />
              <span>Create New Society</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Societies Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />
          <div>Loading society details...</div>
        </div>
      ) : societies.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-card)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(196, 154, 108, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Building2 size={32} color="var(--color-clay)" />
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-dark-brown)', marginBottom: '6px' }}>
            No Society Registered Yet
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 20px' }}>
            Register your residential society to govern units, manage resident admissions, and gate activities.
          </p>
          {isAdmin && (
            <button
              id="btn-create-society-empty"
              onClick={() => {
                setSocietyForm({
                  name: '',
                  address: '',
                  society_type: 'FLAT',
                  total_homes: 50,
                  contact_number: '',
                  emergency_number: '',
                  status: 'ACTIVE',
                });
                setShowCreateModal(true);
              }}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.9rem' }}
            >
              <Plus size={16} />
              <span>Register Society</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {societies.map((soc) => {
            const totalUnits = soc.total_homes || soc.actual_homes_count || 0;
            const occupiedUnits = soc.occupied_homes_count ?? 0;
            const vacantUnits = soc.vacant_homes_count ?? Math.max(0, (soc.actual_homes_count || 0) - occupiedUnits);
            const societyType = soc.society_type || 'FLAT';

            return (
              <div
                key={soc.id}
                className="glass-panel"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-card)',
                  boxShadow: 'var(--shadow-md)',
                  background: 'var(--color-white)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all var(--transition-normal)',
                }}
              >
                {/* SECTION 1: Top Split (Left side image, Right side basic society information) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Left Side: Image */}
                  <div
                    style={{
                      position: 'relative',
                      minHeight: '280px',
                      maxHeight: '380px',
                      background: 'var(--bg-tertiary)',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src="/images/community-hero.jpg"
                      alt={soc.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    {/* Gradient Overlay for visual depth */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(64, 54, 48, 0.65) 0%, rgba(64, 54, 48, 0.1) 40%, transparent 100%)',
                        pointerEvents: 'none',
                      }}
                    />



                  </div>

                  {/* Right Side: Basic Society Information */}
                  <div
                    style={{
                      padding: '28px 32px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: 'var(--color-white)',
                    }}
                  >
                    <div>
                      {/* Sub-label & Society Name */}
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-clay)', letterSpacing: '0.05em', marginBottom: '4px' }}>
                        Society Information
                      </div>
                      <h2
                        style={{
                          fontSize: '1.75rem',
                          fontWeight: 800,
                          color: 'var(--color-dark-brown)',
                          lineHeight: 1.25,
                          margin: '0 0 12px 0',
                          textTransform: 'capitalize',
                        }}
                      >
                        {soc.name}
                      </h2>

                      {/* Accent Divider */}
                      <div style={{ width: '40px', height: '3px', background: 'var(--color-clay)', borderRadius: '2px', marginBottom: '18px' }} />

                      {/* Basic Info Rows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                        {/* Address */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(196, 154, 108, 0.14)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: '2px',
                            }}
                          >
                            <MapPin size={17} color="var(--color-clay)" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Address
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--color-dark-brown)', lineHeight: 1.45, fontWeight: 500 }}>
                              {soc.address || 'Address not configured'}
                            </div>
                          </div>
                        </div>

                        {/* Contact Number */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(107, 142, 90, 0.14)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Phone size={17} color="var(--color-fern-green)" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Contact Number
                            </div>
                            <div style={{ fontSize: '0.92rem', color: 'var(--color-dark-brown)', fontWeight: 600 }}>
                              {soc.contact_number ? soc.contact_number : <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>Not provided</span>}
                            </div>
                          </div>
                        </div>

                        {/* Emergency Contact */}
                        {soc.emergency_number && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(220, 38, 38, 0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <PhoneCall size={17} color="var(--accent-rose)" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Emergency Helpline
                              </div>
                              <div style={{ fontSize: '0.92rem', color: 'var(--accent-rose)', fontWeight: 700 }}>
                                {soc.emergency_number}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        paddingTop: '16px',
                        borderTop: '1px solid var(--border-subtle)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        id={`btn-manage-homes-${soc.id}`}
                        onClick={() => handleOpenHomes(soc)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Home size={15} color="var(--color-fern-green)" />
                        <span>Manage Homes ({soc.actual_homes_count || 0})</span>
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            id={`btn-edit-soc-${soc.id}`}
                            onClick={() => handleOpenEdit(soc)}
                            className="btn btn-outline"
                            style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            title="Edit Society"
                          >
                            <Edit2 size={14} />
                            <span>Edit Details</span>
                          </button>

                          <button
                            id={`btn-del-soc-${soc.id}`}
                            onClick={() => handleDeleteSociety(soc.id, soc.name)}
                            className="btn btn-danger"
                            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            title="Delete / Deactivate Society"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: After Section — Small Cards */}
                <div
                  style={{
                    padding: '22px 28px',
                    background: 'var(--bg-tertiary)',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {/* Small Card 1: Total Unit */}
                    <div
                      style={{
                        background: 'var(--color-white)',
                        padding: '16px 18px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'rgba(196, 154, 108, 0.16)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Building2 size={20} color="var(--color-clay)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Total Unit
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-dark-brown)', lineHeight: 1.2 }}>
                          {totalUnits}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {soc.actual_homes_count || 0} units configured
                        </div>
                      </div>
                    </div>

                    {/* Small Card 2: Occupied Unit */}
                    <div
                      style={{
                        background: 'var(--color-white)',
                        padding: '16px 18px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'rgba(107, 142, 90, 0.16)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <UserCheck size={20} color="var(--color-fern-green)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Occupied Unit
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-fern-green)', lineHeight: 1.2 }}>
                          {occupiedUnits}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Active residents
                        </div>
                      </div>
                    </div>

                    {/* Small Card 3: Vacant Unit */}
                    <div
                      style={{
                        background: 'var(--color-white)',
                        padding: '16px 18px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'rgba(135, 206, 235, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Key size={20} color="var(--accent-cyan)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Vacant Unit
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-dark-brown)', lineHeight: 1.2 }}>
                          {vacantUnits}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Available units
                        </div>
                      </div>
                    </div>

                    {/* Small Card 4: Type */}
                    <div
                      style={{
                        background: 'var(--color-white)',
                        padding: '16px 18px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'rgba(214, 194, 161, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Layers size={20} color="var(--color-dark-brown)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Type
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-dark-brown)', lineHeight: 1.2 }}>
                          {societyType}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {societyType === 'BUNGALOW' ? 'Villas / Row Houses' : 'Flats & Apartments'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Create Society */}
      {/* ---------------------------------------------------- */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '28px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Create New Residential Society</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {societies.length >= 1 ? (
              <div>
                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(196, 154, 108, 0.12)',
                    border: '1px solid var(--color-sand)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-dark-brown)',
                    marginBottom: '20px',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Single Society Mode:</strong> Society <strong>"{societies[0]?.name}"</strong> is already registered. The system allows an administrator to manage only one society. You can edit the existing society’s configuration instead.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      handleOpenEdit(societies[0]);
                    }}
                    className="btn btn-primary"
                  >
                    Edit Registered Society
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSociety}>
                <div className="input-group">
                  <label className="input-label">Society Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Palm Grove Residency"
                    value={societyForm.name}
                    onChange={(e) => setSocietyForm({ ...societyForm, name: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Society Address *</label>
                  <textarea
                    required
                    rows={2}
                    className="input-field"
                    placeholder="Full street address, area, city, pincode"
                    value={societyForm.address}
                    onChange={(e) => setSocietyForm({ ...societyForm, address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Society Type *</label>
                    <select
                      className="input-field"
                      value={societyForm.society_type}
                      onChange={(e) => setSocietyForm({ ...societyForm, society_type: e.target.value })}
                    >
                      <option value="FLAT">FLAT (Apartments)</option>
                      <option value="BUNGALOW">BUNGALOW (Villas/Row)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Total Homes *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="input-field"
                      value={societyForm.total_homes}
                      onChange={(e) => setSocietyForm({ ...societyForm, total_homes: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Contact Number</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="+91 22 26401122"
                      value={societyForm.contact_number}
                      onChange={(e) => setSocietyForm({ ...societyForm, contact_number: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Emergency Number</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="+91 22 26409999"
                      value={societyForm.emergency_number}
                      onChange={(e) => setSocietyForm({ ...societyForm, emergency_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select
                    className="input-field"
                    value={societyForm.status}
                    onChange={(e) => setSocietyForm({ ...societyForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" id="btn-submit-create-society" className="btn btn-primary">
                    Save Society
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Edit Society */}
      {/* ---------------------------------------------------- */}
      {showEditModal && selectedSociety && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '28px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Edit Society: {selectedSociety.name}</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSociety}>
              <div className="input-group">
                <label className="input-label">Society Name *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={societyForm.name}
                  onChange={(e) => setSocietyForm({ ...societyForm, name: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Society Address *</label>
                <textarea
                  required
                  rows={2}
                  className="input-field"
                  value={societyForm.address}
                  onChange={(e) => setSocietyForm({ ...societyForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Society Type</label>
                  <select
                    className="input-field"
                    value={societyForm.society_type}
                    onChange={(e) => setSocietyForm({ ...societyForm, society_type: e.target.value })}
                  >
                    <option value="FLAT">FLAT</option>
                    <option value="BUNGALOW">BUNGALOW</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Total Homes</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={societyForm.total_homes}
                    onChange={(e) => setSocietyForm({ ...societyForm, total_homes: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-group">
                  <label className="input-label">Contact Number</label>
                  <input
                    type="text"
                    className="input-field"
                    value={societyForm.contact_number}
                    onChange={(e) => setSocietyForm({ ...societyForm, contact_number: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Emergency Number</label>
                  <input
                    type="text"
                    className="input-field"
                    value={societyForm.emergency_number}
                    onChange={(e) => setSocietyForm({ ...societyForm, emergency_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Status</label>
                <select
                  className="input-field"
                  value={societyForm.status}
                  onChange={(e) => setSocietyForm({ ...societyForm, status: e.target.value })}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Society
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* DRAWER / MODAL: Manage Homes in Selected Society */}
      {/* ---------------------------------------------------- */}
      {showManageHomesModal && selectedSociety && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Homes in {selectedSociety.name}</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total configured: {societyHomes.length} units ({selectedSociety.society_type})
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {isAdmin && (
                  <>
                    <button
                      id="btn-open-batch-homes"
                      onClick={() => setShowBatchHomesModal(true)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >

                      <span>Batch Generate (e.g. Home 1..100)</span>
                    </button>

                    <button
                      id="btn-open-single-home"
                      onClick={() => setShowAddHomeModal(true)}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      <Plus size={14} />
                      <span>Add Single Home</span>
                    </button>
                  </>
                )}

                <button onClick={() => setShowManageHomesModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '6px' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Homes List */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {loadingHomes ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading homes...</div>
              ) : societyHomes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Home size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <p>No homes created yet in this society.</p>
                  <p style={{ fontSize: '0.8rem' }}>Use "Add Single Home" or "Batch Generate" above to create homes.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {societyHomes.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-card)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {h.home_number}
                          </span>
                          <span style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {h.home_type}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                          {h.building_or_wing ? `${h.building_or_wing}` : 'Main Wing'}
                          {h.floor ? ` • Floor ${h.floor}` : ''}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: h.occupancy_status === 'VACANT' ? 'var(--text-dim)' : '#34d399', fontWeight: 600 }}>
                          {h.occupancy_status}
                        </div>
                      </div>

                      {isAdmin && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <button
                            onClick={() => handleDeleteHome(h.id)}
                            style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }}
                            title="Delete Home"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-tertiary)' }}>
              <button onClick={() => setShowManageHomesModal(false)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-MODAL: Add Single Home */}
      {/* ---------------------------------------------------- */}
      {showAddHomeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Add Home to {selectedSociety.name}</h3>
              <button onClick={() => setShowAddHomeModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddHome}>
              <div className="input-group">
                <label className="input-label">Home Number *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Home 1, Home 10, Flat 402, Villa 3"
                  value={homeForm.home_number}
                  onChange={(e) => setHomeForm({ ...homeForm, home_number: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">Building / Wing</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Wing A, Tower 1"
                    value={homeForm.building_or_wing}
                    onChange={(e) => setHomeForm({ ...homeForm, building_or_wing: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Floor</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 1"
                    value={homeForm.floor}
                    onChange={(e) => setHomeForm({ ...homeForm, floor: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">Home Type</label>
                  <select
                    className="input-field"
                    value={homeForm.home_type}
                    onChange={(e) => setHomeForm({ ...homeForm, home_type: e.target.value })}
                  >
                    <option value="1BHK">1BHK</option>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                    <option value="4BHK">4BHK</option>
                    <option value="BUNGALOW">BUNGALOW</option>
                    <option value="VILLA">VILLA</option>
                    <option value="PENTHOUSE">PENTHOUSE</option>
                    <option value="STUDIO">STUDIO</option>
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label">Status</label>
                  <select
                    className="input-field"
                    value={homeForm.status}
                    onChange={(e) => setHomeForm({ ...homeForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowAddHomeModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" id="btn-submit-single-home" className="btn btn-primary">
                  Save Home
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-MODAL: Batch Generate Homes (Home 1 .. Home 100) */}
      {/* ---------------------------------------------------- */}
      {showBatchHomesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '24px', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                <h3 style={{ fontSize: '1.15rem' }}>Batch Generate Homes</h3>
              </div>
              <button onClick={() => setShowBatchHomesModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Rapidly generate sequential homes (e.g. <strong>Home 1</strong> to <strong>Home 100</strong>) in one click without duplicate numbers.
            </p>

            <form onSubmit={handleBatchGenerate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">Number of Homes *</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    className="input-field"
                    value={batchForm.count}
                    onChange={(e) => setBatchForm({ ...batchForm, count: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Start From *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input-field"
                    value={batchForm.startFrom}
                    onChange={(e) => setBatchForm({ ...batchForm, startFrom: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="input-group">
                  <label className="input-label">Prefix Label</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 'Home ' or 'Flat '"
                    value={batchForm.prefix}
                    onChange={(e) => setBatchForm({ ...batchForm, prefix: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Building / Wing</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Tower A"
                    value={batchForm.building_or_wing}
                    onChange={(e) => setBatchForm({ ...batchForm, building_or_wing: e.target.value })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Home Type</label>
                <select
                  className="input-field"
                  value={batchForm.home_type}
                  onChange={(e) => setBatchForm({ ...batchForm, home_type: e.target.value })}
                >
                  <option value="1BHK">1BHK</option>
                  <option value="2BHK">2BHK</option>
                  <option value="3BHK">3BHK</option>
                  <option value="4BHK">4BHK</option>
                  <option value="BUNGALOW">BUNGALOW</option>
                  <option value="VILLA">VILLA</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowBatchHomesModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" id="btn-submit-batch-generate" className="btn btn-primary">
                  Generate {batchForm.count} Homes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
