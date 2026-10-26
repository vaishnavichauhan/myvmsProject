import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag,
  DollarSign,
  Plus,
  Trash2,
  X,
  Palmtree,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { amenityApi } from '../../api/amenityApi';
import { useAuthStore } from '../../store/authStore';
import { ROLES } from '../../constants/roles';

export default function PricingPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [amenities, setAmenities] = useState([]);
  const [selectedAmenityId, setSelectedAmenityId] = useState('');
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Pricing Rule Modal
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    rule_name: 'Weekend Surcharge',
    rule_type: 'WEEKEND',
    rate_multiplier: 1.25,
    flat_rate: '',
    special_date: '',
  });
  const [ruleSubmitting, setRuleSubmitting] = useState(false);

  // Price Estimator Playground
  const [calcDate, setCalcDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [calcStart, setCalcStart] = useState('10:00');
  const [calcEnd, setCalcEnd] = useState('14:00');
  const [estimateResult, setEstimateResult] = useState(null);

  // Fetch Amenities
  useEffect(() => {
    async function loadAmenities() {
      try {
        setLoading(true);
        const res = await amenityApi.getAmenities();
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setAmenities(list);
        if (list.length > 0 && !selectedAmenityId) {
          setSelectedAmenityId(String(list[0].id));
        }
      } catch (err) {
        console.error('Failed to load amenities', err);
      } finally {
        setLoading(false);
      }
    }
    loadAmenities();
  }, []);

  // Fetch detailed amenity with pricing rules
  const fetchAmenityDetails = async () => {
    if (!selectedAmenityId) return;
    try {
      const res = await amenityApi.getAmenityById(selectedAmenityId);
      const data = res.data?.data || res.data || null;
      setSelectedAmenity(data);
      setPricingRules(data?.pricing_rules || []);

      // Run estimator
      runEstimator(selectedAmenityId, calcDate, calcStart, calcEnd);
    } catch (err) {
      console.error('Failed to load amenity pricing details', err);
    }
  };

  useEffect(() => {
    fetchAmenityDetails();
  }, [selectedAmenityId]);

  const runEstimator = async (amId, date, start, end) => {
    try {
      const res = await amenityApi.calculatePrice(amId, {
        booking_date: date,
        start_time: `${start}:00`,
        end_time: `${end}:00`,
      });
      setEstimateResult(res.data?.data || res.data || null);
    } catch {
      setEstimateResult(null);
    }
  };

  const handleEstimatorChange = (date, start, end) => {
    setCalcDate(date);
    setCalcStart(start);
    setCalcEnd(end);
    if (selectedAmenityId) {
      runEstimator(selectedAmenityId, date, start, end);
    }
  };

  // Add Pricing Rule
  const handleAddRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      setRuleSubmitting(true);
      await amenityApi.addPricingRule({
        amenity_id: selectedAmenityId,
        rule_name: ruleForm.rule_name,
        rule_type: ruleForm.rule_type,
        rate_multiplier: Number(ruleForm.rate_multiplier || 1.0),
        flat_rate: ruleForm.flat_rate ? Number(ruleForm.flat_rate) : null,
        special_date: ruleForm.special_date || null,
      });
      setIsAddRuleOpen(false);
      setRuleForm({ rule_name: 'Weekend Surcharge', rule_type: 'WEEKEND', rate_multiplier: 1.25, flat_rate: '', special_date: '' });
      fetchAmenityDetails();
    } catch (err) {
      alert('Failed to add pricing rule: ' + (err.response?.data?.message || err.message));
    } finally {
      setRuleSubmitting(false);
    }
  };

  // Remove Pricing Rule
  const handleDeleteRule = async (id) => {
    if (!window.confirm('Delete this pricing rule?')) return;
    try {
      await amenityApi.removePricingRule(id);
      fetchAmenityDetails();
    } catch (err) {
      alert('Failed to remove: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Breadcrumb */}
      <div>
        <div
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '6px',
          }}
        >
          <Link to="/dashboard" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
            Dashboard
          </Link>
          <span>/</span>
          <Link to="/dashboard/amenities" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
            Amenities
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--color-clay)', fontWeight: 600 }}>Pricing & Charges</span>
        </div>

        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: 0,
          }}
        >
          <Tag size={28} color="var(--color-clay)" />
          Pricing Models & Charge Schedules
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          Configure base fees, deposit policies, weekend multipliers, peak hours, and festival special charges.
        </p>
      </div>

      {/* Amenity Picker Bar */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1px solid var(--border-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Palmtree size={18} color="var(--color-clay)" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>Select Amenity:</span>
          <select
            value={selectedAmenityId}
            onChange={(e) => setSelectedAmenityId(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            {amenities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.category} - {a.booking_type})
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddRuleOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-clay)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Add Custom Pricing Rule
          </button>
        )}
      </div>

      {/* 2-Column Layout: Left = Current Amenity Tariff & Rules; Right = Interactive Breakdown Calculator */}
      {selectedAmenity && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Left Column: Active Base Tariff & Custom Rules */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Base Tariff Card */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-card)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                Base Tariff for {selectedAmenity.name}
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                  fontSize: '0.85rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Pricing Model</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{selectedAmenity.booking_type}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Access Classification</span>
                  <div style={{ fontWeight: 700, color: 'var(--color-clay)' }}>{selectedAmenity.access_type}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Standard Booking Fee</span>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' }}>
                    {selectedAmenity.booking_fee > 0 ? `₹${Number(selectedAmenity.booking_fee).toLocaleString()}` : 'Free'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Security Deposit (Refundable)</span>
                  <div style={{ fontWeight: 800, color: '#C49A6C', fontSize: '1.1rem' }}>
                    {selectedAmenity.security_deposit > 0 ? `₹${Number(selectedAmenity.security_deposit).toLocaleString()}` : 'None'}
                  </div>
                </div>
              </div>

              {/* Deposit Clarification Notice */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(196, 154, 108, 0.1)',
                  border: '1px solid rgba(196, 154, 108, 0.3)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                }}
              >
                <Info size={16} color="var(--color-clay)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>
                  <strong>Accounting Rule:</strong> Security deposits are tracked strictly as a refundable liability. They are never counted toward society income or revenue.
                </span>
              </div>
            </div>

            {/* Custom Rules List */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-card)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
                Active Pricing Rules & Multipliers
              </h3>

              {pricingRules.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  No special pricing rules active. Base tariff applies uniformly across all dates.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pricingRules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-card)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                          {rule.rule_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-clay)', marginTop: '2px' }}>
                          Type: {rule.rule_type} • Multiplier: {rule.rate_multiplier}x
                          {rule.flat_rate !== null && ` • Flat Rate: ₹${rule.flat_rate}`}
                          {rule.special_date && ` • Date: ${rule.special_date}`}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          style={{
                            padding: '6px 10px',
                            background: 'transparent',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#EF4444',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Price Breakdown Estimator */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-card)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={20} color="var(--color-clay)" />
              Real-Time Tariff Breakdown Estimator
            </h3>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '0.84rem' }}>
              Test how custom multipliers, duration, and weekend rules calculate the final booking fee and deposit.
            </p>

            {/* Estimator Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={calcDate}
                  onChange={(e) => handleEstimatorChange(e.target.value, calcStart, calcEnd)}
                  style={{
                    width: '100%',
                    padding: '7px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={calcStart}
                  onChange={(e) => handleEstimatorChange(calcDate, e.target.value, calcEnd)}
                  style={{
                    width: '100%',
                    padding: '7px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  End Time
                </label>
                <input
                  type="time"
                  value={calcEnd}
                  onChange={(e) => handleEstimatorChange(calcDate, calcStart, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                  }}
                />
              </div>
            </div>

            {/* Calculated Breakdown Box */}
            {estimateResult ? (
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-clay)' }}>
                  Breakdown Summary ({estimateResult.duration_hours} hours duration)
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Base Rate:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    ₹{estimateResult.base_fee} ({estimateResult.booking_type})
                  </span>
                </div>

                {estimateResult.rules_applied && estimateResult.rules_applied.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600 }}>Rules Applied:</span>
                    {estimateResult.rules_applied.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#D97706' }}>
                        <span>• {r.name}</span>
                        <span>{r.multiplier ? `${r.multiplier}x` : `₹${r.flat_rate}`}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Final Booking Fee:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    ₹{Number(estimateResult.calculated_fee).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Refundable Security Deposit:</span>
                  <span style={{ fontWeight: 700, color: '#C49A6C' }}>
                    ₹{Number(estimateResult.security_deposit).toLocaleString()}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    borderTop: '1px dashed var(--border-card)',
                    paddingTop: '10px',
                  }}
                >
                  <span style={{ color: 'var(--text-main)' }}>Total Payable:</span>
                  <span style={{ color: 'var(--color-clay)' }}>
                    ₹{Number(estimateResult.total_amount).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                Select valid start and end times to calculate estimated charges.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Rule Modal */}
      {isAddRuleOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-card)',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={20} color="var(--color-clay)" />
              Add Custom Pricing Rule
            </h3>

            <form onSubmit={handleAddRuleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Peak Surcharge, Diwali Special"
                  value={ruleForm.rule_name}
                  onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Rule Type
                  </label>
                  <select
                    value={ruleForm.rule_type}
                    onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="WEEKEND">Weekend (Saturday/Sunday)</option>
                    <option value="FESTIVAL_SPECIAL">Festival / Special Date</option>
                    <option value="PEAK_HOURS">Peak Hours</option>
                    <option value="CUSTOM">Custom Multiplier</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Rate Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="5.0"
                    value={ruleForm.rate_multiplier}
                    onChange={(e) => setRuleForm({ ...ruleForm, rate_multiplier: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              {ruleForm.rule_type === 'FESTIVAL_SPECIAL' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                    Special Festival Date
                  </label>
                  <input
                    type="date"
                    required
                    value={ruleForm.special_date}
                    onChange={(e) => setRuleForm({ ...ruleForm, special_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ruleSubmitting}
                  style={{
                    padding: '8px 22px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-clay)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {ruleSubmitting ? 'Saving...' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
