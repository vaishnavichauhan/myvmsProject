import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Mail,
  FileText,
  Lock,
} from 'lucide-react';
import { societyApi } from '../api/societyApi';
import { useAuthStore } from '../store/authStore';

export const CONFIG_OPTIONS = ['1BHK', '2BHK', '3BHK', '4BHK', 'PENTHOUSE'];

export const parseSocietyConfigs = (configStr) => {
  if (!configStr) return ['2BHK'];
  if (Array.isArray(configStr)) return configStr;
  const parts = String(configStr)
    .split(/[,/]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return parts.length > 0 ? parts : ['2BHK'];
};

export default function SocietiesPage() {
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
    registration_number: '',
    contact_email: '',
    society_type: 'BUNGALOW',
    property_configuration: '2BHK',
    total_homes: 10,
    contact_number: '',
    emergency_number: '',
    status: 'ACTIVE',
  });

  const togglePropertyConfig = (cfg) => {
    const current = parseSocietyConfigs(societyForm.property_configuration);
    let updated;
    if (current.includes(cfg)) {
      if (current.length === 1) return; // Keep at least one configuration
      updated = current.filter((c) => c !== cfg);
    } else {
      updated = [...current, cfg];
    }
    setSocietyForm((prev) => ({ ...prev, property_configuration: updated.join(', ') }));
  };

  // Dynamic preview configuration for Create Society Modal
  const [bungalowStartNo, setBungalowStartNo] = useState('1');
  const [bungalowEndNo, setBungalowEndNo] = useState('10');
  const [flatTowers, setFlatTowers] = useState([]);

  const handleAddTower = () => {
    setFlatTowers((prev) => {
      let next;
      const currentTotal = parseInt(societyForm.total_homes, 10) || 10;
      if (prev.length === 0) {
        // Default allocation: Start Home No 1 and End Home No is total unit
        next = [
          {
            id: Date.now() + 1,
            name: 'A',
            floor: '1',
            startNo: '1',
            endNo: String(currentTotal),
            count: currentTotal,
          },
        ];
      } else {
        const index = prev.length;
        const letter = String.fromCharCode(65 + index); // 'B', 'C', etc.
        const floor = '1';
        const startNo = '1';
        const count = 5;
        const endNo = '5';

        next = [
          ...prev,
          {
            id: Date.now() + Math.random(),
            name: letter,
            floor: floor,
            startNo: startNo,
            endNo: endNo,
            count: count,
          },
        ];
      }
      const sumUnits = next.reduce((acc, t) => acc + (parseInt(t.count, 10) || 1), 0);
      setSocietyForm((f) => ({ ...f, total_homes: sumUnits }));
      return next;
    });
  };

  const handleUpdateTower = (id, field, value) => {
    setFlatTowers((prev) => {
      const updatedList = prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [field]: value };
        if (field === 'startNo') {
          const s = parseInt(value, 10);
          const c = parseInt(t.count, 10) || 5;
          if (!isNaN(s)) {
            updated.endNo = String(s + c - 1);
          }
        } else if (field === 'endNo') {
          const e = parseInt(value, 10);
          const s = parseInt(t.startNo, 10) || 101;
          if (!isNaN(e) && e >= s) {
            updated.count = e - s + 1;
          }
        }
        return updated;
      });
      const sumUnits = updatedList.reduce((acc, t) => acc + (parseInt(t.count, 10) || 5), 0);
      setSocietyForm((f) => ({ ...f, total_homes: sumUnits }));
      return updatedList;
    });
  };

  const handleRemoveTower = (id) => {
    setFlatTowers((prev) => {
      const next = prev.filter((t) => t.id !== id);
      const sumUnits = next.reduce((acc, t) => acc + (parseInt(t.count, 10) || 5), 0);
      setSocietyForm((f) => ({ ...f, total_homes: sumUnits || 10 }));
      return next;
    });
  };

  const renderUnitAllocationPreview = () => {
    const bStart = parseInt(bungalowStartNo, 10) || 1;
    const bEndVal = parseInt(bungalowEndNo, 10);
    const totalUnitsNum = (!isNaN(bEndVal) && bEndVal >= bStart)
      ? (bEndVal - bStart + 1)
      : Math.max(1, parseInt(societyForm.total_homes, 10) || 10);
    const bEnd = !isNaN(bEndVal) && bEndVal >= bStart ? bEndVal : (bStart + totalUnitsNum - 1);
    const isBungalow = societyForm.society_type === 'BUNGALOW';
    const isFlat = societyForm.society_type === 'FLAT';

    return (
      <div
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Case 1: BUNGALOW */}
        {isBungalow && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Home size={16} color="var(--color-clay)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-dark-brown)', textTransform: 'uppercase' }}>
                  Bungalow Units Allocation
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', background: 'rgba(196, 154, 108, 0.2)', color: 'var(--color-dark-brown)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                {societyForm.property_configuration} • {totalUnitsNum} Total Units
              </span>
            </div>

            {/* start home no & end home no */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: '0.78rem' }}>Start Home No *</label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  style={{ background: '#FFFFFF', fontWeight: 700, color: 'var(--color-dark-brown)' }}
                  value={bungalowStartNo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBungalowStartNo(val);
                    const s = parseInt(val, 10);
                    const c = parseInt(societyForm.total_homes, 10) || 10;
                    if (!isNaN(s)) {
                      setBungalowEndNo(String(s + c - 1));
                    }
                  }}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: '0.78rem' }}>End Home No</label>
                <input
                  type="number"
                  min={bStart}
                  className="input-field"
                  style={{ background: '#FFFFFF', fontWeight: 700, color: 'var(--color-dark-brown)' }}
                  value={bungalowEndNo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBungalowEndNo(val);
                    const endNum = parseInt(val, 10);
                    const s = parseInt(bungalowStartNo, 10) || 1;
                    if (!isNaN(endNum) && endNum >= s) {
                      setSocietyForm((prev) => ({ ...prev, total_homes: endNum - s + 1 }));
                    }
                  }}
                />
              </div>
            </div>

            {/* After section inside: show small icon "home" for 1 to total units */}
            <div style={{ background: '#FFFFFF', borderRadius: '8px', padding: '12px', border: '1px solid rgba(214, 194, 161, 0.4)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Home Units Preview ({bStart} to {bEnd}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '100px', overflowY: 'auto', paddingRight: '4px' }}>
                {Array.from({ length: totalUnitsNum }, (_, i) => bStart + i).map((num) => (
                  <div
                    key={num}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '60px',
                      padding: '7px 4px',
                      background: 'rgba(196, 154, 108, 0.12)',
                      border: '1px solid rgba(196, 154, 108, 0.3)',
                      borderRadius: '7px',
                      textAlign: 'center',
                      gap: '4px',
                    }}
                  >
                    <Home size={15} color="var(--color-clay)" />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-dark-brown)', lineHeight: 1.1 }}>
                      Home {num}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Case 2: FLAT */}
        {isFlat && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} color="var(--accent-amber)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-dark-brown)', textTransform: 'uppercase' }}>
                  Flat Tower & Floor Allocation
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', background: 'rgba(217, 119, 6, 0.14)', color: 'var(--accent-amber)', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                {societyForm.property_configuration} • {flatTowers.length > 0 ? flatTowers.reduce((sum, t) => sum + (parseInt(t.count, 10) || 5), 0) : totalUnitsNum} Total Units
              </span>
            </div>

            {/* If no towers added yet, show button: "Add Tower and Floor" */}
            {flatTowers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '22px 16px', background: '#FFFFFF', borderRadius: '8px', border: '2px dashed var(--accent-amber)' }}>
                <button
                  type="button"
                  id="btn-add-tower-and-flor"
                  onClick={handleAddTower}
                  className="btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    background: 'var(--accent-amber)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} />
                  <span>Add Tower and Floor</span>
                </button>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Click to configure Tower Name, Floor, Start/End Home numbers, and unit icons.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {flatTowers.map((tower) => {
                  const tStart = parseInt(tower.startNo, 10) || 1;
                  const tCount = Math.max(1, parseInt(tower.count, 10) || 1);
                  const tEnd = tower.endNo !== undefined ? tower.endNo : String(tStart + tCount - 1);

                  return (
                    <div
                      key={tower.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '12px',
                        border: '1px solid rgba(214, 194, 161, 0.4)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-dark-brown)', textTransform: 'uppercase' }}>
                          Tower {tower.name} • Floor {tower.floor} ({tCount} Units)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTower(tower.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '2px 6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                          }}
                          title="Remove this Tower"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tower Name</label>
                          <input
                            type="text"
                            className="input-field"
                            style={{ padding: '6px 10px', fontSize: '0.82rem', fontWeight: 800, background: 'var(--bg-tertiary)' }}
                            value={tower.name}
                            onChange={(e) => handleUpdateTower(tower.id, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Floor Name</label>
                          <input
                            type="text"
                            className="input-field"
                            style={{ padding: '6px 10px', fontSize: '0.82rem', fontWeight: 800, background: 'var(--bg-tertiary)' }}
                            value={tower.floor}
                            onChange={(e) => handleUpdateTower(tower.id, 'floor', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Start Home No</label>
                          <input
                            type="number"
                            className="input-field"
                            style={{ padding: '6px 10px', fontSize: '0.82rem', fontWeight: 800, background: '#FFFFFF', color: 'var(--color-dark-brown)' }}
                            value={tower.startNo}
                            onChange={(e) => handleUpdateTower(tower.id, 'startNo', e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>End Home No</label>
                          <input
                            type="number"
                            min={tStart}
                            className="input-field"
                            style={{ padding: '6px 10px', fontSize: '0.82rem', fontWeight: 800, background: '#FFFFFF', color: 'var(--color-dark-brown)' }}
                            value={tEnd}
                            onChange={(e) => handleUpdateTower(tower.id, 'endNo', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* After section inside show small icon home */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '110px', overflowY: 'auto', paddingRight: '4px' }}>
                        {Array.from({ length: tCount }, (_, i) => tStart + i).map((num) => (
                          <div
                            key={num}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '60px',
                              padding: '6px 5px',
                              background: 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              borderRadius: '7px',
                              textAlign: 'center',
                              gap: '3px',
                            }}
                          >
                            <Home size={14} color="var(--accent-amber)" />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-dark-brown)', lineHeight: 1.1 }}>
                              {tower.name}-{num}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* After show another tower/flor create button */}
                <button
                  type="button"
                  id="btn-add-another-tower-flor"
                  onClick={handleAddTower}
                  className="btn btn-outline"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px dashed var(--accent-amber)',
                    color: 'var(--color-dark-brown)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    background: 'rgba(217, 119, 6, 0.06)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} color="var(--accent-amber)" />
                  <span>+ Add Another Tower / Floor</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
        registration_number: '',
        contact_email: '',
        society_type: 'BUNGALOW',
        property_configuration: '2BHK',
        total_homes: 10,
        contact_number: '',
        emergency_number: '',
        status: 'ACTIVE',
      });
      setBungalowStartNo('1');
      setBungalowEndNo('10');
      setFlatTowers([]);
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
      const sumFlatUnits = flatTowers.reduce((acc, t) => acc + (parseInt(t.count, 10) || 5), 0);
      const specifiedTotal = parseInt(societyForm.total_homes, 10) || 10;
      const finalTotalHomes = societyForm.society_type === 'FLAT' && flatTowers.length > 0
        ? sumFlatUnits
        : specifiedTotal;

      const payload = {
        ...societyForm,
        total_homes: finalTotalHomes,
        bungalow_start_no: bungalowStartNo,
        towers: flatTowers,
        tower_a_name: flatTowers[0]?.name || 'A',
        tower_a_floor: flatTowers[0]?.floor || '1',
        tower_a_start: flatTowers[0]?.startNo || '1',
        tower_b_name: flatTowers[1]?.name || 'B',
        tower_b_floor: flatTowers[1]?.floor || '1',
        tower_b_start: flatTowers[1]?.startNo || '1',
      };
      await societyApi.createSociety(payload);
      setSuccessMsg('Society created successfully!');
      setShowCreateModal(false);
      setSocietyForm({
        name: '',
        address: '',
        registration_number: '',
        contact_email: '',
        society_type: 'BUNGALOW',
        property_configuration: '2BHK',
        total_homes: 10,
        contact_number: '',
        emergency_number: '',
        status: 'ACTIVE',
      });
      setBungalowStartNo('1');
      setBungalowEndNo('10');
      setFlatTowers([]);
      fetchSocieties();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Error creating society.');
    }
  };

  const handleOpenEdit = async (soc) => {
    setSelectedSociety(soc);
    setSocietyForm({
      name: soc.name || '',
      code: soc.code || '',
      address: soc.address || '',
      registration_number: soc.registration_number || '',
      contact_email: soc.contact_email || '',
      society_type: soc.society_type || 'BUNGALOW',
      property_configuration: soc.property_configuration || '2BHK',
      total_homes: soc.total_homes || 10,
      contact_number: soc.contact_number || '',
      emergency_number: soc.emergency_number || '',
      status: soc.status || 'ACTIVE',
    });

    try {
      const res = await societyApi.getHomesBySociety(soc.id);
      const homes = res.data?.homes || [];
      if (soc.society_type === 'FLAT') {
        if (homes.length > 0) {
          const towerMap = new Map();
          homes.forEach((h) => {
            const rawWing = (h.building_or_wing || '').replace(/^Tower\s*/i, '').trim() || 'A';
            if (!towerMap.has(rawWing)) {
              towerMap.set(rawWing, []);
            }
            towerMap.get(rawWing).push(h);
          });
          const loadedTowers = Array.from(towerMap.entries()).map(([tName, tHomes], idx) => {
            const floor = tHomes[0]?.floor || '1';
            const nums = tHomes
              .map((h) => {
                const match = String(h.home_number).match(/(\d+)$/);
                return match ? parseInt(match[1], 10) : null;
              })
              .filter((n) => n !== null)
              .sort((a, b) => a - b);

            const startNo = nums.length > 0 ? String(nums[0]) : '1';
            const endNo = nums.length > 0 ? String(nums[nums.length - 1]) : String(tHomes.length);
            return {
              id: Date.now() + idx,
              name: tName,
              floor: String(floor),
              startNo: startNo,
              endNo: endNo,
              count: tHomes.length,
            };
          });
          setFlatTowers(
            loadedTowers.length > 0
              ? loadedTowers
              : [
                  {
                    id: Date.now(),
                    name: 'A',
                    floor: '1',
                    startNo: '1',
                    endNo: String(soc.total_homes || 10),
                    count: soc.total_homes || 10,
                  },
                ]
          );
        } else {
          setFlatTowers([
            {
              id: Date.now(),
              name: 'A',
              floor: '1',
              startNo: '1',
              endNo: String(soc.total_homes || 10),
              count: soc.total_homes || 10,
            },
          ]);
        }
      } else {
        if (homes.length > 0) {
          const nums = homes
            .map((h) => {
              const match = String(h.home_number).match(/(\d+)$/);
              return match ? parseInt(match[1], 10) : null;
            })
            .filter((n) => n !== null)
            .sort((a, b) => a - b);
          const s = nums.length > 0 ? nums[0] : 1;
          const count = parseInt(soc.total_homes, 10) || 10;
          setBungalowStartNo(String(s));
          setBungalowEndNo(String(s + count - 1));
        } else {
          setBungalowStartNo('1');
          setBungalowEndNo(String(soc.total_homes || 10));
        }
      }
    } catch {
      setBungalowStartNo('1');
      setBungalowEndNo(String(soc.total_homes || 10));
      setFlatTowers([
        {
          id: Date.now(),
          name: 'A',
          floor: '1',
          startNo: '1',
          endNo: String(soc.total_homes || 10),
          count: soc.total_homes || 10,
        },
      ]);
    }

    setShowEditModal(true);
  };

  const handleEditSociety = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const specifiedTotal = parseInt(societyForm.total_homes, 10);
      const sumFlatUnits = flatTowers.length > 0
        ? flatTowers.reduce((acc, t) => acc + (parseInt(t.count, 10) || 0), 0)
        : 0;

      const finalTotalHomes = !isNaN(specifiedTotal) && specifiedTotal > 0
        ? specifiedTotal
        : (sumFlatUnits > 0 ? sumFlatUnits : 10);

      const payload = {
        ...societyForm,
        total_homes: finalTotalHomes,
        max_units: finalTotalHomes,
        towers: flatTowers,
        bungalow_start_no: bungalowStartNo,
      };

      // Society Name, Unique Society Code, and Society Structure Type are superAdmin created, so Admin cannot modify them
      if (!isSuperAdmin) {
        delete payload.name;
        delete payload.code;
        delete payload.society_type;
      }

      await societyApi.updateSociety(selectedSociety.id, payload);
      setSuccessMsg('Society updated successfully!');
      setShowEditModal(false);
      fetchSocieties();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error updating society.');
    }
  };

  const handleDeleteSociety = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will permanently remove the society and all its units.`)) return;
    try {
      await societyApi.deleteSociety(id, true);
      setSuccessMsg('Society deleted successfully.');
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
                  registration_number: '',
                  contact_email: '',
                  society_type: 'BUNGALOW',
                  property_configuration: '2BHK',
                  total_homes: 10,
                  contact_number: '',
                  emergency_number: '',
                  status: 'ACTIVE',
                });
                setBungalowStartNo('1');
                setBungalowEndNo('10');
                setFlatTowers([]);
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
                  registration_number: '',
                  contact_email: '',
                  society_type: 'BUNGALOW',
                  property_configuration: '2BHK',
                  total_homes: 10,
                  contact_number: '',
                  emergency_number: '',
                  status: 'ACTIVE',
                });
                setBungalowStartNo('1');
                setBungalowEndNo('10');
                setFlatTowers([]);
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
            const configuredHomes = Number(soc.total_homes || soc.max_units || 0);
            const actualCount = soc.actual_homes_count !== undefined && soc.actual_homes_count !== null
              ? Number(soc.actual_homes_count)
              : configuredHomes;
            const totalUnits = configuredHomes > 0 ? configuredHomes : actualCount;
            const occupiedUnits = soc.occupied_homes_count ?? 0;
            const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
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

                        {/* Registration Number */}
                        {soc.registration_number && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(99, 102, 241, 0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <FileText size={17} color="#4f46e5" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Registration Number
                              </div>
                              <div style={{ fontSize: '0.92rem', color: 'var(--color-dark-brown)', fontWeight: 600 }}>
                                {soc.registration_number}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Contact Email */}
                        {soc.contact_email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(217, 119, 6, 0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Mail size={17} color="var(--accent-amber)" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Contact Email
                              </div>
                              <div style={{ fontSize: '0.92rem', color: 'var(--color-dark-brown)', fontWeight: 600 }}>
                                {soc.contact_email}
                              </div>
                            </div>
                          </div>
                        )}

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
                        <span>Manage Homes ({totalUnits})</span>
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
                          Total Units
                        </div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-dark-brown)', lineHeight: 1.2 }}>
                          {totalUnits}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {totalUnits} homes configured
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
                          Type & Config
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-dark-brown)', lineHeight: 1.2 }}>
                          {societyType === 'BUNGALOW' ? 'Bungalow' : 'Flat'} {soc.property_configuration ? `• ${soc.property_configuration}` : ''}
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
      {showCreateModal && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px 16px',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '660px',
              maxHeight: 'calc(100vh - 48px)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 50px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              margin: 'auto',
            }}
          >
            {/* Header (pinned) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                background: '#FFFFFF',
                flexShrink: 0,
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: 0 }}>
                Create New Residential Society
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {societies.length >= 1 ? (
              <div style={{ padding: '24px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
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
              <>
                {/* Scrollable Form Body */}
                <div style={{ padding: '20px 24px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
                  <form id="form-create-society" onSubmit={handleCreateSociety}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="input-group">
                        <label className="input-label">Registration Number</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. MH/2023/REC/09871"
                          value={societyForm.registration_number}
                          onChange={(e) => setSocietyForm({ ...societyForm, registration_number: e.target.value })}
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Contact Email</label>
                        <input
                          type="email"
                          className="input-field"
                          placeholder="e.g. society.office@example.com"
                          value={societyForm.contact_email}
                          onChange={(e) => setSocietyForm({ ...societyForm, contact_email: e.target.value })}
                        />
                      </div>
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
                          id="select-create-society-type"
                          className="input-field"
                          value={societyForm.society_type}
                          onChange={(e) => {
                            const newType = e.target.value;
                            const currentTotal = parseInt(societyForm.total_homes, 10) || 10;
                            if (newType === 'FLAT' && flatTowers.length === 0) {
                              setFlatTowers([
                                {
                                  id: Date.now(),
                                  name: 'A',
                                  floor: '1',
                                  startNo: '1',
                                  endNo: String(currentTotal),
                                  count: currentTotal,
                                },
                              ]);
                            }
                            setSocietyForm({ ...societyForm, society_type: newType });
                          }}
                        >
                          <option value="BUNGALOW">Bungalow</option>
                          <option value="FLAT">Flat</option>
                        </select>
                      </div>

                      <div className="input-group">
                        <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Property Configuration *</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-clay)', fontWeight: 700 }}>
                            {parseSocietyConfigs(societyForm.property_configuration).length} selected
                          </span>
                        </label>
                        <input type="hidden" id="select-create-property-config" value={societyForm.property_configuration} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {CONFIG_OPTIONS.map((cfg) => {
                            const isSelected = parseSocietyConfigs(societyForm.property_configuration).includes(cfg);
                            return (
                              <button
                                key={cfg}
                                type="button"
                                id={`btn-create-cfg-${cfg.toLowerCase()}`}
                                onClick={() => togglePropertyConfig(cfg)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  border: isSelected ? '1.5px solid var(--color-clay)' : '1px solid var(--border-card)',
                                  backgroundColor: isSelected ? 'var(--color-clay)' : '#FFFFFF',
                                  color: isSelected ? '#FFFFFF' : 'var(--color-dark-brown)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  boxShadow: isSelected ? '0 2px 6px rgba(196, 154, 108, 0.35)' : 'none',
                                }}
                              >
                                <span>{isSelected ? '✓' : '+'}</span>
                                <span>{cfg === 'PENTHOUSE' ? 'Penthouse' : cfg}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="input-group">
                        <label className="input-label">Total Units *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          className="input-field"
                          value={societyForm.total_homes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSocietyForm({ ...societyForm, total_homes: val });
                            const c = parseInt(val, 10);
                            if (!isNaN(c) && c > 0) {
                              if (societyForm.society_type === 'BUNGALOW') {
                                const s = parseInt(bungalowStartNo, 10) || 1;
                                setBungalowEndNo(String(s + c - 1));
                              } else if (societyForm.society_type === 'FLAT') {
                                setFlatTowers((prev) => {
                                  if (prev.length === 1) {
                                    const s = parseInt(prev[0].startNo, 10) || 1;
                                    return [
                                      {
                                        ...prev[0],
                                        count: c,
                                        endNo: String(s + c - 1),
                                      },
                                    ];
                                  }
                                  return prev;
                                });
                              }
                            }
                          }}
                        />
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
                    </div>

                    {/* ----------------------------------------------------------------- */}
                    {/* Unit Numbering & Home Icon Structure Preview (Bungalow vs Flat)  */}
                    {/* ----------------------------------------------------------------- */}
                    {renderUnitAllocationPreview()}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="input-group" style={{ marginBottom: 0 }}>
                        <label className="input-label">Contact Number</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="+91 22 26401122"
                          value={societyForm.contact_number}
                          onChange={(e) => setSocietyForm({ ...societyForm, contact_number: e.target.value })}
                        />
                      </div>

                      <div className="input-group" style={{ marginBottom: 0 }}>
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
                  </form>
                </div>

                {/* Pinned Footer */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    padding: '14px 24px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                    style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="form-create-society"
                    id="btn-submit-create-society"
                    className="btn btn-primary"
                    style={{ padding: '8px 22px', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    Save Society
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Edit Society */}
      {/* ---------------------------------------------------- */}
      {showEditModal && selectedSociety && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px 16px',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '660px',
              maxHeight: 'calc(100vh - 48px)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 24px 50px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              margin: 'auto',
            }}
          >
            {/* Header (pinned) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                background: '#FFFFFF',
                flexShrink: 0,
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-dark-brown)', margin: 0 }}>
                Edit Society: {selectedSociety.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
              <form id="form-edit-society" onSubmit={handleEditSociety}>
                {/* Super Admin Provisioned Fields (Locked for Admin) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="input-group">
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Society Name *</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-clay)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Lock size={10} /> SuperAdmin Created
                      </span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      className="input-field"
                      style={{
                        backgroundColor: 'var(--bg-main, #f8fafc)',
                        cursor: 'not-allowed',
                        opacity: 0.85,
                        borderColor: 'var(--border-subtle)',
                        fontWeight: 600,
                      }}
                      value={societyForm.name}
                      title="Society Name was created by SuperAdmin and cannot be modified."
                    />
                    <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      Locked: Set by Super Admin.
                    </small>
                  </div>

                  <div className="input-group">
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Unique Society Code *</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-clay)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Lock size={10} /> SuperAdmin Created
                      </span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      className="input-field"
                      style={{
                        backgroundColor: 'var(--bg-main, #f8fafc)',
                        cursor: 'not-allowed',
                        opacity: 0.85,
                        borderColor: 'var(--border-subtle)',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                      }}
                      value={selectedSociety?.code || societyForm.code || 'N/A'}
                      title="Unique Society Code was created by SuperAdmin and cannot be modified."
                    />
                    <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      Locked: Set by Super Admin.
                    </small>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Registration Number</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. MH/2023/REC/09871"
                      value={societyForm.registration_number}
                      onChange={(e) => setSocietyForm({ ...societyForm, registration_number: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Contact Email</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="e.g. society.office@example.com"
                      value={societyForm.contact_email}
                      onChange={(e) => setSocietyForm({ ...societyForm, contact_email: e.target.value })}
                    />
                  </div>
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
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Society Structure Type *</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--color-clay)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Lock size={10} /> SuperAdmin Created
                      </span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      id="select-edit-society-type"
                      className="input-field"
                      style={{
                        backgroundColor: 'var(--bg-main, #f8fafc)',
                        cursor: 'not-allowed',
                        opacity: 0.85,
                        borderColor: 'var(--border-subtle)',
                        fontWeight: 600,
                      }}
                      value={
                        societyForm.society_type === 'FLAT'
                          ? 'Flat / Apartment Complex'
                          : societyForm.society_type === 'BUNGALOW'
                          ? 'Bungalow / Row House'
                          : societyForm.society_type === 'GATED_COMMUNITY'
                          ? 'Gated Community / Mixed'
                          : societyForm.society_type === 'COMMERCIAL'
                          ? 'Commercial Complex'
                          : (societyForm.society_type || 'Flat')
                      }
                      title="Society Structure Type was created by SuperAdmin and cannot be modified."
                    />
                    <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                      Locked: Structure is fixed by Super Admin.
                    </small>
                  </div>

                  <div className="input-group">
                    <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Property Configuration *</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-clay)', fontWeight: 700 }}>
                        {parseSocietyConfigs(societyForm.property_configuration).length} selected
                      </span>
                    </label>
                    <input type="hidden" id="select-edit-property-config" value={societyForm.property_configuration} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {CONFIG_OPTIONS.map((cfg) => {
                        const isSelected = parseSocietyConfigs(societyForm.property_configuration).includes(cfg);
                        return (
                          <button
                            key={cfg}
                            type="button"
                            id={`btn-edit-cfg-${cfg.toLowerCase()}`}
                            onClick={() => togglePropertyConfig(cfg)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              border: isSelected ? '1.5px solid var(--color-clay)' : '1px solid var(--border-card)',
                              backgroundColor: isSelected ? 'var(--color-clay)' : '#FFFFFF',
                              color: isSelected ? '#FFFFFF' : 'var(--color-dark-brown)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: isSelected ? '0 2px 6px rgba(196, 154, 108, 0.35)' : 'none',
                            }}
                          >
                            <span>{isSelected ? '✓' : '+'}</span>
                            <span>{cfg === 'PENTHOUSE' ? 'Penthouse' : cfg}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label">Total Units *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="input-field"
                      value={societyForm.total_homes}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSocietyForm({ ...societyForm, total_homes: val });
                        const c = parseInt(val, 10);
                        if (!isNaN(c) && c > 0) {
                          if (societyForm.society_type === 'BUNGALOW') {
                            const s = parseInt(bungalowStartNo, 10) || 1;
                            setBungalowEndNo(String(s + c - 1));
                          } else if (societyForm.society_type === 'FLAT') {
                            setFlatTowers((prev) => {
                              if (prev.length === 1) {
                                const s = parseInt(prev[0].startNo, 10) || 1;
                                return [
                                  {
                                    ...prev[0],
                                    count: c,
                                    endNo: String(s + c - 1),
                                  },
                                ];
                              }
                              return prev;
                            });
                          }
                        }
                      }}
                    />
                    <small style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', lineHeight: 1.3 }}>
                      Note: Changing Total Units updates total & vacant capacity. Occupied Units is strictly determined by registered residents assigned in the Residents section.
                    </small>
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
                </div>

                {/* Unit Numbering & Allocation Preview */}
                {renderUnitAllocationPreview()}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="input-label">Contact Number</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="+91 22 26401122"
                      value={societyForm.contact_number}
                      onChange={(e) => setSocietyForm({ ...societyForm, contact_number: e.target.value })}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
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
              </form>
            </div>

            {/* Pinned Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '14px 24px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="form-edit-society"
                className="btn btn-primary"
                style={{ padding: '8px 22px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                Update Society
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ---------------------------------------------------- */}
      {/* DRAWER / MODAL: Manage Homes in Selected Society */}
      {/* ---------------------------------------------------- */}
      {showManageHomesModal && selectedSociety && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '20px' }}>
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
        </div>,
        document.body
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-MODAL: Add Single Home */}
      {/* ---------------------------------------------------- */}
      {showAddHomeModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '16px', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', maxHeight: 'min(92vh, 650px)', overflowY: 'auto', padding: '24px', background: '#FFFFFF', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 48px rgba(0,0,0,0.35)', margin: 'auto' }}>
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
        </div>,
        document.body
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-MODAL: Batch Generate Homes (Home 1 .. Home 100) */}
      {/* ---------------------------------------------------- */}
      {showBatchHomesModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '16px', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', maxHeight: 'min(92vh, 650px)', overflowY: 'auto', padding: '24px', background: '#FFFFFF', borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 48px rgba(0,0,0,0.35)', margin: 'auto' }}>
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
        </div>,
        document.body
      )}

    </div>
  );
}
