import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  CreditCard,
  Building2,
  CalendarCheck2,
  Gauge,
  Sparkles,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  RefreshCw,
  Landmark,
  BadgeCheck,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { subscriptionApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const SubscriptionBillingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billingData, setBillingData] = useState(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const res = await subscriptionApi.getSubscriptionBilling().catch(() => null);
      if (res?.data) {
        setBillingData(res.data);
      }
    } catch (err) {
      console.log('Error fetching subscription data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const plan = billingData?.subscription || {
    plan_name: user?.subscription?.planName || 'Basic Plan',
    billing_cycle: 'MONTHLY',
    price_snapshot: '1120.00',
    status: user?.subscription?.status || 'ACTIVE',
    start_date: user?.subscription?.startDate || '2026-10-27',
    end_date: user?.subscription?.endDate || '2027-10-27',
    auto_renew: 1,
  };

  const usage = billingData?.usage || {
    totalHomes: 2,
    maxHomes: 100,
    totalGates: 1,
    maxGates: 3,
    totalStaff: 6,
    maxStaff: 15,
  };

  const features = billingData?.features || [
    'RESIDENTS',
    'SOCIETY_FINANCE',
    'MAINTENANCE',
    'SPECIAL_CHARGES',
    'AMENITIES',
    'POLLS',
    'SECURITY_GATE',
    'VISITORS',
    'WORKERS',
    'COMMITTEE',
  ];

  const invoices = billingData?.invoices || [
    {
      id: 1,
      invoice_number: 'INV-2026-1001',
      billing_period: 'Oct 2026 - Nov 2026',
      amount: '1120.00',
      status: 'PAID',
      paid_at: '2026-10-27',
    },
  ];

  const homePercent = usage.maxHomes > 0 ? Math.min(100, Math.round((usage.totalHomes / usage.maxHomes) * 100)) : 10;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Subscription & Billing</Text>
            <Text style={styles.headerSubtitle}>Plan Limits & Platform Invoices</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setRefreshing(true);
              fetchSubscriptionData();
            }}
            style={styles.refreshBtn}
          >
            <RefreshCw size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Active Plan Ribbon Card */}
        <View style={styles.planRibbonCard}>
          <View style={styles.planRibbonHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.crownBubble}>
                <CreditCard size={20} color={THEME.colors.clay} />
              </View>
              <View>
                <Text style={styles.planTitle}>{plan.plan_name || 'Basic Society Plan'}</Text>
                <Text style={styles.planCycle}>
                  {plan.billing_cycle || 'MONTHLY'} BILLING CYCLE
                </Text>
              </View>
            </View>

            <View style={styles.planStatusPill}>
              <View style={styles.greenPulseDot} />
              <Text style={styles.planStatusText}>{plan.status || 'ACTIVE'}</Text>
            </View>
          </View>

          <View style={styles.planPriceRow}>
            <Text style={styles.planPrice}>
              ₹{Number(plan.price_snapshot || plan.price || 1120).toLocaleString()}
            </Text>
            <Text style={styles.planPricePeriod}> / month</Text>
          </View>

          <View style={styles.planDatesRow}>
            <Text style={styles.planDateText}>
              Valid from {String(plan.start_date || '2026-10-27').split('T')[0]} to{' '}
              {String(plan.end_date || '2027-10-27').split('T')[0]}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Body */}
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchSubscriptionData();
            }}
            tintColor={THEME.colors.clay}
            colors={[THEME.colors.clay]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading subscription & billing details...</Text>
          </View>
        ) : (
          <>
            {/* Section 1: Usage & Limits */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Gauge size={18} color={THEME.colors.clay} />
                <Text style={styles.sectionTitle}>Usage & Plan Limits</Text>
              </View>

              <View style={styles.card}>
                {/* Home Units Limit */}
                <View style={styles.limitItem}>
                  <View style={styles.limitTop}>
                    <Text style={styles.limitLabel}>Residential Units</Text>
                    <Text style={styles.limitValue}>
                      {usage.totalHomes} / {usage.maxHomes} Units ({homePercent}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${homePercent}%` }]} />
                  </View>
                </View>

                {/* Gates Limit */}
                <View style={[styles.limitItem, { borderTopWidth: 1, borderTopColor: 'rgba(214, 194, 161, 0.4)', paddingTop: 10 }]}>
                  <View style={styles.limitTop}>
                    <Text style={styles.limitLabel}>Security Gates</Text>
                    <Text style={styles.limitValue}>
                      {usage.totalGates} / {usage.maxGates} Gates
                    </Text>
                  </View>
                </View>

                {/* Security Staff Limit */}
                <View style={[styles.limitItem, { borderTopWidth: 1, borderTopColor: 'rgba(214, 194, 161, 0.4)', paddingTop: 10 }]}>
                  <View style={styles.limitTop}>
                    <Text style={styles.limitLabel}>Security Staff</Text>
                    <Text style={styles.limitValue}>
                      {usage.totalStaff} / {usage.maxStaff} Staff
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Section 2: Entitled Features */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Sparkles size={18} color="#0284C7" />
                <Text style={styles.sectionTitle}>Unlocked Platform Features</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.featuresGrid}>
                  {features.map((feat, idx) => (
                    <View key={idx} style={styles.featurePill}>
                      <BadgeCheck size={14} color="#10B981" />
                      <Text style={styles.featureText}>
                        {feat.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Section 3: Billing & Invoices */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Landmark size={18} color={THEME.colors.fernGreenDark} />
                <Text style={styles.sectionTitle}>Billing Invoices</Text>
              </View>

              {invoices.map((inv, idx) => {
                const isPaid = inv.status === 'PAID';
                return (
                  <View key={idx} style={styles.invoiceCard}>
                    <View style={styles.invoiceTop}>
                      <View>
                        <Text style={styles.invoiceNum}>{inv.invoice_number}</Text>
                        <Text style={styles.invoicePeriod}>{inv.billing_period}</Text>
                      </View>
                      <View
                        style={[
                          styles.invStatusPill,
                          {
                            backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            borderColor: isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                          },
                        ]}
                      >
                        <Text style={[styles.invStatusText, { color: isPaid ? '#10B981' : '#D97706' }]}>
                          {inv.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.invoiceBottom}>
                      <Text style={styles.invDate}>
                        {isPaid ? `Paid on ${inv.paid_at}` : 'Payment Pending'}
                      </Text>
                      <Text style={styles.invAmount}>
                        ₹{Number(inv.amount || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    backgroundColor: '#342C26',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...THEME.shadows.float,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  planRibbonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
  },
  planRibbonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  crownBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(196, 154, 108, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  planCycle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.clay,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  planStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  planStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#10B981',
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
  },
  planPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  planPricePeriod: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  planDatesRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  planDateText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 10,
    fontWeight: '600',
  },
  sectionWrap: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    padding: 16,
    gap: 12,
    ...THEME.shadows.card,
  },
  limitItem: {
    gap: 6,
  },
  limitTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  limitValue: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  progressBarBg: {
    height: 7,
    backgroundColor: THEME.colors.sandWell,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.clay,
    borderRadius: 4,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    textTransform: 'capitalize',
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    padding: 14,
    gap: 10,
    ...THEME.shadows.card,
  },
  invoiceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNum: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  invoicePeriod: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  invStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  invStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  invoiceBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.4)',
  },
  invDate: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  invAmount: {
    fontSize: 14.5,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
  },
});
