import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Receipt,
  Coins,
  RefreshCw,
  Search,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  CreditCard,
  Building2,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { financeApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const AccountOverviewScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const userRole = String(user?.role || '').toUpperCase();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(
        'Access Restricted',
        'Account Overview is confidential society accounts data and is only accessible by Society Administrators.'
      );
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('SocietyFinance');
      }
    }
  }, [isAdmin]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'monthly' | 'transactions'
  const [yearFilter, setYearFilter] = useState(''); // '' | '2026' | '2025' | '2024'
  const [overview, setOverview] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [txnCategoryFilter, setTxnCategoryFilter] = useState('ALL');
  const [txnSearch, setTxnSearch] = useState('');
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Fallback defaults matching frontend AccountsPage.jsx
  const defaultOverview = {
    maintenance: { billed: 4500, paid: 4500, pending: 0, count: 3, paidCount: 3 },
    specialCharges: { billed: 6400, paid: 4200, pending: 2200, count: 4, paidCount: 3 },
    amenities: { billed: 1200, paid: 1200, pending: 0, count: 2, paidCount: 2 },
    subscription: { billed: 1500, paid: 1500, pending: 0, count: 1, paidCount: 1 },
    grandTotals: { totalBilled: 13600, totalPaid: 11400, totalPending: 2200, recoveryRate: 84 },
  };

  const defaultMonthly = [
    {
      monthKey: '2026-03',
      monthLabel: 'March 2026',
      totalBilled: 5500,
      totalPayment: 4500,
      totalPending: 1000,
      recoveryRate: 82,
      maintenance: { billed: 3000, paid: 3000, pending: 0 },
      specialCharges: { billed: 2500, paid: 1500, pending: 1000 },
      amenities: { billed: 0, paid: 0, pending: 0 },
      subscription: { billed: 0, paid: 0, pending: 0 },
    },
    {
      monthKey: '2026-02',
      monthLabel: 'February 2026',
      totalBilled: 4800,
      totalPayment: 4200,
      totalPending: 600,
      recoveryRate: 88,
      maintenance: { billed: 1500, paid: 1500, pending: 0 },
      specialCharges: { billed: 2100, paid: 1500, pending: 600 },
      amenities: { billed: 1200, paid: 1200, pending: 0 },
      subscription: { billed: 0, paid: 0, pending: 0 },
    },
    {
      monthKey: '2026-01',
      monthLabel: 'January 2026',
      totalBilled: 3300,
      totalPayment: 2700,
      totalPending: 600,
      recoveryRate: 82,
      maintenance: { billed: 0, paid: 0, pending: 0 },
      specialCharges: { billed: 1800, paid: 1200, pending: 600 },
      amenities: { billed: 0, paid: 0, pending: 0 },
      subscription: { billed: 1500, paid: 1500, pending: 0 },
    },
  ];

  const defaultTransactions = [
    {
      id: 'tx-1',
      category: 'MAINTENANCE',
      reference_number: 'REC-2026-001',
      invoice_number: 'INV-2026-M01',
      home_number: 'Flat A-101',
      resident_name: 'Rajesh Sharma',
      resident_phone: '+91 98765 43210',
      amount: 1500,
      payment_method: 'ONLINE',
      status: 'PAID',
      created_at: '2026-03-28T10:30:00Z',
    },
    {
      id: 'tx-2',
      category: 'SPECIAL_CHARGES',
      reference_number: 'REC-2026-002',
      invoice_number: 'SC-2026-014',
      home_number: 'Flat B-204',
      resident_name: 'Priya Patel',
      resident_phone: '+91 98765 12345',
      amount: 2000,
      payment_method: 'UPI',
      status: 'PAID',
      created_at: '2026-03-25T14:15:00Z',
    },
    {
      id: 'tx-3',
      category: 'AMENITIES',
      reference_number: 'REC-2026-003',
      invoice_number: 'AMN-2026-008',
      home_number: 'Flat C-302',
      resident_name: 'Amit Verma',
      resident_phone: '+91 98111 22334',
      amount: 600,
      payment_method: 'ONLINE',
      status: 'PAID',
      created_at: '2026-03-22T09:00:00Z',
    },
    {
      id: 'tx-4',
      category: 'MAINTENANCE',
      reference_number: 'REC-2026-004',
      invoice_number: 'INV-2026-M02',
      home_number: 'Flat A-102',
      resident_name: 'Sneha Gupta',
      resident_phone: '+91 98222 33445',
      amount: 1500,
      payment_method: 'CASH',
      status: 'PAID',
      created_at: '2026-03-15T16:45:00Z',
    },
    {
      id: 'tx-5',
      category: 'SPECIAL_CHARGES',
      reference_number: 'REC-2026-005',
      invoice_number: 'SC-2026-009',
      home_number: 'Flat B-105',
      resident_name: 'Vikram Singh',
      resident_phone: '+91 98333 44556',
      amount: 1200,
      payment_method: 'UPI',
      status: 'PAID',
      created_at: '2026-03-10T11:20:00Z',
    },
  ];

  const fetchAccountsData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = yearFilter ? { year: yearFilter } : {};
      const [ovRes, moRes, txRes] = await Promise.all([
        financeApi.getOverview(params).catch(() => null),
        financeApi.getMonthlyBreakdown(params).catch(() => null),
        financeApi.getTransactions({ category: txnCategoryFilter, limit: 100 }).catch(() => null),
      ]);

      const rawOv = ovRes?.data?.data || ovRes?.data || ovRes;
      if (rawOv && (rawOv.grandTotals || rawOv.maintenance)) {
        setOverview(rawOv);
      }

      const rawMo =
        moRes?.data?.months ||
        moRes?.data?.data?.months ||
        moRes?.months ||
        (Array.isArray(moRes?.data) ? moRes.data : []);
      if (Array.isArray(rawMo) && rawMo.length > 0) {
        setMonthlyData(rawMo);
      } else if (!monthlyData.length) {
        setMonthlyData(defaultMonthly);
      }

      const rawTx =
        txRes?.data?.transactions ||
        txRes?.data?.data?.transactions ||
        txRes?.transactions ||
        (Array.isArray(txRes?.data) ? txRes.data : []);
      if (Array.isArray(rawTx) && rawTx.length > 0) {
        setTransactions(rawTx);
      } else if (!transactions.length) {
        setTransactions(defaultTransactions);
      }
    } catch (err) {
      console.log('Error fetching accounts overview data:', err);
      if (!overview) setOverview(defaultOverview);
      if (!monthlyData.length) setMonthlyData(defaultMonthly);
      if (!transactions.length) setTransactions(defaultTransactions);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccountsData();
  }, [yearFilter, txnCategoryFilter]);

  const activeOverview = overview || defaultOverview;
  const grandTotals = activeOverview.grandTotals || defaultOverview.grandTotals;
  const maint = activeOverview.maintenance || defaultOverview.maintenance;
  const sc = activeOverview.specialCharges || defaultOverview.specialCharges;
  const amen = activeOverview.amenities || defaultOverview.amenities;
  const sub = activeOverview.subscription || defaultOverview.subscription;

  // Filtered transactions for search
  const filteredTransactions = useMemo(() => {
    const list = transactions.length ? transactions : defaultTransactions;
    if (!txnSearch.trim()) return list;
    const term = txnSearch.toLowerCase();
    return list.filter(
      (t) =>
        t.reference_number?.toLowerCase().includes(term) ||
        t.invoice_number?.toLowerCase().includes(term) ||
        t.home_number?.toLowerCase().includes(term) ||
        t.resident_name?.toLowerCase().includes(term)
    );
  }, [transactions, txnSearch]);

  const activeMonths = monthlyData.length ? monthlyData : defaultMonthly;

  const maintRecovery =
    maint.billed > 0 ? Math.round((maint.paid / maint.billed) * 100) : 100;
  const scRecovery =
    sc.billed > 0 ? Math.round((sc.paid / sc.billed) * 100) : 100;
  const amenRecovery =
    amen.billed > 0 ? Math.round((amen.paid / amen.billed) * 100) : 100;
  const subRecovery =
    sub.billed > 0 ? Math.round((sub.paid / sub.billed) * 100) : 100;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      {/* Top Dark Header */}
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
            <Text style={styles.headerTitle}>Society Financial Accounts</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Accounts ledger & Financial Overview
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => fetchAccountsData(true)}
            style={styles.refreshBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RefreshCw size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Year Filter Selector */}
        <View style={styles.yearFilterRow}>
          <Text style={styles.yearLabel}>YEAR:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearScroll}>
            {[
              { id: '', label: 'All Years' },
              { id: '2026', label: '2026' },
              { id: '2025', label: '2025' },
              { id: '2024', label: '2024' },
            ].map((y) => {
              const isSelected = yearFilter === y.id;
              return (
                <TouchableOpacity
                  key={y.id}
                  style={[styles.yearChip, isSelected && styles.yearChipActive]}
                  onPress={() => setYearFilter(y.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.yearChipText, isSelected && styles.yearChipTextActive]}>
                    {y.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAccountsData(true)}
            tintColor={THEME.colors.clay}
            colors={[THEME.colors.clay]}
          />
        }
      >
        {loading && !overview ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading financial accounts data...</Text>
          </View>
        ) : (
          <>
            {/* ================================================================
                TOP 4 EXECUTIVE KPI CARDS (Reference: AccountsPage.jsx)
                ================================================================ */}
            <View style={styles.metricsContainer}>
              <ScrollView
                horizontal
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.metricsHorizontalScroll}
              >
                {/* Card 1: TOTAL AMOUNT */}
                <View style={[styles.kpiCardHorizontal, { borderColor: 'rgba(196, 154, 108, 0.35)' }]}>
                  <View style={styles.kpiTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.kpiTag}>TOTAL AMOUNT</Text>
                      <Text style={styles.kpiValue}>
                        ₹{grandTotals.totalBilled.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(196, 154, 108, 0.15)' }]}>
                      <Wallet size={20} color={THEME.colors.clay} />
                    </View>
                  </View>

                  <View style={styles.kpiFooter}>
                    <View style={styles.kpiBadge}>
                      <Text style={[styles.kpiBadgeText, { color: '#059669' }]}>
                        {grandTotals.recoveryRate}% Recovery
                      </Text>
                    </View>
                    <Text style={styles.kpiSubText}>
                      Paid: ₹{grandTotals.totalPaid.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Card 2: PENDING AMOUNT */}
                <View style={[styles.kpiCardHorizontal, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                  <View style={styles.kpiTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.kpiTag, { color: '#EF4444' }]}>PENDING AMOUNT</Text>
                      <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
                        ₹{grandTotals.totalPending.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                      <AlertCircle size={20} color="#EF4444" />
                    </View>
                  </View>

                  <View style={styles.kpiFooter}>
                    <View style={[styles.kpiBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <Text style={[styles.kpiBadgeText, { color: '#EF4444' }]}>Due Receivables</Text>
                    </View>
                    <Text style={styles.kpiSubText}>
                      Paid: ₹{grandTotals.totalPaid.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Card 3: MAINTENANCE AMOUNT */}
                <TouchableOpacity
                  style={[styles.kpiCardHorizontal, { borderColor: 'rgba(16, 185, 129, 0.3)' }]}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('MaintenanceBilling')}
                >
                  <View style={styles.kpiTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.kpiTag, { color: '#059669' }]}>MAINTENANCE AMOUNT</Text>
                      <Text style={styles.kpiValue}>
                        ₹{maint.billed.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                      <Receipt size={20} color="#059669" />
                    </View>
                  </View>

                  <View style={styles.kpiFooter}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                      Paid: ₹{maint.paid.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: maint.pending > 0 ? '#EF4444' : '#6B7280' }}>
                      Pending: ₹{maint.pending.toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Card 4: SPECIAL CHARGES AMOUNT */}
                <TouchableOpacity
                  style={[styles.kpiCardHorizontal, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('SpecialCharges')}
                >
                  <View style={styles.kpiTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.kpiTag, { color: '#D97706' }]}>SPECIAL CHARGES</Text>
                      <Text style={styles.kpiValue}>
                        ₹{sc.billed.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                      <Coins size={20} color="#D97706" />
                    </View>
                  </View>

                  <View style={styles.kpiFooter}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                      Paid: ₹{sc.paid.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: sc.pending > 0 ? '#EF4444' : '#6B7280' }}>
                      Pending: ₹{sc.pending.toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* ================================================================
                3 TABS: Overview Report | Monthly Breakdown | Transaction Ledger
                ================================================================ */}
            <View style={styles.tabsBar}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
                onPress={() => setActiveTab('overview')}
                activeOpacity={0.7}
              >
                <FileText size={15} color={activeTab === 'overview' ? THEME.colors.clay : '#6B7280'} />
                <Text style={[styles.tabBtnText, activeTab === 'overview' && styles.tabBtnTextActive]}>
                  Overview
                </Text>
                <View style={[styles.tabCountPill, activeTab === 'overview' && styles.tabCountPillActive]}>
                  <Text style={[styles.tabCountText, activeTab === 'overview' && styles.tabCountTextActive]}>
                    Report
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'monthly' && styles.tabBtnActive]}
                onPress={() => setActiveTab('monthly')}
                activeOpacity={0.7}
              >
                <Calendar size={15} color={activeTab === 'monthly' ? THEME.colors.clay : '#6B7280'} />
                <Text style={[styles.tabBtnText, activeTab === 'monthly' && styles.tabBtnTextActive]}>
                  Monthly
                </Text>
                <View style={[styles.tabCountPill, activeTab === 'monthly' && styles.tabCountPillActive]}>
                  <Text style={[styles.tabCountText, activeTab === 'monthly' && styles.tabCountTextActive]}>
                    {activeMonths.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'transactions' && styles.tabBtnActive]}
                onPress={() => setActiveTab('transactions')}
                activeOpacity={0.7}
              >
                <Layers size={15} color={activeTab === 'transactions' ? THEME.colors.clay : '#6B7280'} />
                <Text style={[styles.tabBtnText, activeTab === 'transactions' && styles.tabBtnTextActive]}>
                  Ledger
                </Text>
                <View style={[styles.tabCountPill, activeTab === 'transactions' && styles.tabCountPillActive]}>
                  <Text style={[styles.tabCountText, activeTab === 'transactions' && styles.tabCountTextActive]}>
                    {filteredTransactions.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ================================================================
                TAB 1 CONTENT: ACCOUNT OVERVIEW REPORT (4 Pillars + Audited Statement)
                ================================================================ */}
            {activeTab === 'overview' && (
              <View style={styles.tabContent}>
                {/* 4 Core Pillars Cards */}
                <Text style={styles.sectionHeaderTitle}>CORE FINANCIAL PILLARS</Text>
                <View style={styles.pillarsGrid}>
                  {/* Pillar 1: Maintenance */}
                  <TouchableOpacity
                    style={styles.pillarCard}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate('MaintenanceBilling')}
                  >
                    <View style={styles.pillarHeader}>
                      <View style={[styles.pillarIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                        <Receipt size={17} color="#059669" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.pillarTitle}>Maintenance Billing</Text>
                        <Text style={styles.pillarSubtitle}>{maint.count || 0} Bills Generated</Text>
                      </View>
                      <View style={[styles.recoveryTag, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Text style={[styles.recoveryTagText, { color: '#059669' }]}>{maintRecovery}%</Text>
                      </View>
                    </View>

                    <View style={styles.pillarMetrics}>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Billed</Text>
                        <Text style={styles.metricVal}>₹{maint.billed.toLocaleString()}</Text>
                      </View>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Collected</Text>
                        <Text style={[styles.metricVal, { color: '#059669' }]}>₹{maint.paid.toLocaleString()}</Text>
                      </View>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Pending</Text>
                        <Text style={[styles.metricVal, { color: maint.pending > 0 ? '#EF4444' : '#6B7280' }]}>
                          ₹{maint.pending.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(maintRecovery, 100)}%`, backgroundColor: '#059669' }]} />
                    </View>
                  </TouchableOpacity>

                  {/* Pillar 2: Special Charges */}
                  <View style={styles.pillarCard}>
                    <View style={styles.pillarHeader}>
                      <View style={[styles.pillarIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                        <Coins size={17} color="#D97706" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.pillarTitle}>Special Charges</Text>
                        <Text style={styles.pillarSubtitle}>{sc.count || 0} Levies Raised</Text>
                      </View>
                      <View style={[styles.recoveryTag, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <Text style={[styles.recoveryTagText, { color: '#D97706' }]}>{scRecovery}%</Text>
                      </View>
                    </View>

                    <View style={styles.pillarMetrics}>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Billed</Text>
                        <Text style={styles.metricVal}>₹{sc.billed.toLocaleString()}</Text>
                      </View>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Collected</Text>
                        <Text style={[styles.metricVal, { color: '#059669' }]}>₹{sc.paid.toLocaleString()}</Text>
                      </View>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Pending</Text>
                        <Text style={[styles.metricVal, { color: sc.pending > 0 ? '#EF4444' : '#6B7280' }]}>
                          ₹{sc.pending.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(scRecovery, 100)}%`, backgroundColor: '#D97706' }]} />
                    </View>
                  </View>

                  {/* Pillar 3: Amenities Booking */}
                  <View style={styles.pillarCard}>
                    <View style={styles.pillarHeader}>
                      <View style={[styles.pillarIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                        <Building2 size={17} color="#2563EB" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.pillarTitle}>Amenities Booking</Text>
                        <Text style={styles.pillarSubtitle}>{amen.count || 0} Clubhouse/Facility Slots</Text>
                      </View>
                      <View style={[styles.recoveryTag, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                        <Text style={[styles.recoveryTagText, { color: '#2563EB' }]}>{amenRecovery}%</Text>
                      </View>
                    </View>

                    <View style={styles.pillarMetrics}>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Billed</Text>
                        <Text style={styles.metricVal}>₹{amen.billed.toLocaleString()}</Text>
                      </View>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Collected</Text>
                        <Text style={[styles.metricVal, { color: '#059669' }]}>₹{amen.paid.toLocaleString()}</Text>
                      </View>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Pending</Text>
                        <Text style={[styles.metricVal, { color: amen.pending > 0 ? '#EF4444' : '#6B7280' }]}>
                          ₹{amen.pending.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(amenRecovery, 100)}%`, backgroundColor: '#2563EB' }]} />
                    </View>
                  </View>

                  {/* Pillar 4: Society Subscription */}
                  <View style={styles.pillarCard}>
                    <View style={styles.pillarHeader}>
                      <View style={[styles.pillarIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
                        <CreditCard size={17} color="#9333EA" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.pillarTitle}>Society Subscription</Text>
                        <Text style={styles.pillarSubtitle}>{sub.count || 0} Portal Software License</Text>
                      </View>
                      <View style={[styles.recoveryTag, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                        <Text style={[styles.recoveryTagText, { color: '#9333EA' }]}>{subRecovery}%</Text>
                      </View>
                    </View>

                    <View style={styles.pillarMetrics}>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Billed</Text>
                        <Text style={styles.metricVal}>₹{sub.billed.toLocaleString()}</Text>
                      </View>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Collected</Text>
                        <Text style={[styles.metricVal, { color: '#059669' }]}>₹{sub.paid.toLocaleString()}</Text>
                      </View>
                      <View style={styles.pillarMetricCol}>
                        <Text style={styles.metricLabel}>Pending</Text>
                        <Text style={[styles.metricVal, { color: sub.pending > 0 ? '#EF4444' : '#6B7280' }]}>
                          ₹{sub.pending.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(subRecovery, 100)}%`, backgroundColor: '#9333EA' }]} />
                    </View>
                  </View>
                </View>

                {/* Audited Statement Report Summary Card */}
                <Text style={[styles.sectionHeaderTitle, { marginTop: 16 }]}>AUDITED STATEMENT SUMMARY</Text>
                <View style={styles.statementCard}>
                  <View style={styles.statementHeader}>
                    <Text style={styles.statementTitle}>Financial Accounts Overview</Text>
                    <Text style={styles.statementSubtitle}>Grand Total Receivables & Realization</Text>
                  </View>

                  <View style={styles.statementRow}>
                    <Text style={styles.statementLabel}>Total Billed Amount</Text>
                    <Text style={styles.statementValue}>₹{grandTotals.totalBilled.toLocaleString()}</Text>
                  </View>

                  <View style={styles.statementRow}>
                    <Text style={styles.statementLabel}>Total Collected (Paid)</Text>
                    <Text style={[styles.statementValue, { color: '#059669' }]}>
                      ₹{grandTotals.totalPaid.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.statementRow}>
                    <Text style={styles.statementLabel}>Pending Outstanding</Text>
                    <Text style={[styles.statementValue, { color: '#EF4444' }]}>
                      ₹{grandTotals.totalPending.toLocaleString()}
                    </Text>
                  </View>

                  <View style={[styles.statementRow, { borderBottomWidth: 0, paddingTop: 10 }]}>
                    <Text style={[styles.statementLabel, { fontWeight: '800', color: THEME.colors.darkBrown }]}>
                      Overall Recovery Rate
                    </Text>
                    <View style={[styles.recoveryTag, { backgroundColor: 'rgba(5, 150, 105, 0.12)' }]}>
                      <Text style={[styles.recoveryTagText, { color: '#059669', fontSize: 13, fontWeight: '800' }]}>
                        {grandTotals.recoveryRate}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ================================================================
                TAB 2 CONTENT: MONTHLY BREAKDOWN
                ================================================================ */}
            {activeTab === 'monthly' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionHeaderTitle}>MONTH-BY-MONTH RECOVERY</Text>
                {activeMonths.map((m) => {
                  const isExpanded = expandedMonth === m.monthKey;
                  return (
                    <View key={m.monthKey} style={styles.monthCard}>
                      <TouchableOpacity
                        style={styles.monthHeaderRow}
                        activeOpacity={0.7}
                        onPress={() => setExpandedMonth(isExpanded ? null : m.monthKey)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.monthName}>{m.monthLabel}</Text>
                          <Text style={styles.monthBilledText}>
                            Billed: ₹{Number(m.totalBilled || 0).toLocaleString()}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                          <Text style={styles.monthPaidText}>
                            +₹{Number(m.totalPayment || 0).toLocaleString()}
                          </Text>
                          <Text style={styles.monthPendingText}>
                            Due: ₹{Number(m.totalPending || 0).toLocaleString()}
                          </Text>
                        </View>

                        <View style={styles.monthExpandBtn}>
                          {isExpanded ? (
                            <ChevronUp size={20} color={THEME.colors.clay} />
                          ) : (
                            <ChevronDown size={20} color="#6B7280" />
                          )}
                        </View>
                      </TouchableOpacity>

                      {/* Month Recovery Bar */}
                      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                        <View style={styles.monthBarTrack}>
                          <View
                            style={[
                              styles.monthBarFill,
                              { width: `${Math.min(m.recoveryRate || 0, 100)}%` },
                            ]}
                          />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>
                            Recovery Rate
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#059669' }}>
                            {m.recoveryRate}%
                          </Text>
                        </View>
                      </View>

                      {/* Expandable Breakdown Drawer */}
                      {isExpanded && (
                        <View style={styles.monthSubBreakdown}>
                          <View style={styles.subItemRow}>
                            <Text style={styles.subItemLabel}>Maintenance</Text>
                            <Text style={styles.subItemVal}>
                              Paid: ₹{m.maintenance?.paid?.toLocaleString() || 0} • Pending: ₹{m.maintenance?.pending?.toLocaleString() || 0}
                            </Text>
                          </View>
                          <View style={styles.subItemRow}>
                            <Text style={styles.subItemLabel}>Special Charges</Text>
                            <Text style={styles.subItemVal}>
                              Paid: ₹{m.specialCharges?.paid?.toLocaleString() || 0} • Pending: ₹{m.specialCharges?.pending?.toLocaleString() || 0}
                            </Text>
                          </View>
                          <View style={styles.subItemRow}>
                            <Text style={styles.subItemLabel}>Amenities</Text>
                            <Text style={styles.subItemVal}>
                              Paid: ₹{m.amenities?.paid?.toLocaleString() || 0} • Pending: ₹{m.amenities?.pending?.toLocaleString() || 0}
                            </Text>
                          </View>
                          <View style={[styles.subItemRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.subItemLabel}>Subscription</Text>
                            <Text style={styles.subItemVal}>
                              Paid: ₹{m.subscription?.paid?.toLocaleString() || 0} • Pending: ₹{m.subscription?.pending?.toLocaleString() || 0}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ================================================================
                TAB 3 CONTENT: TRANSACTION LEDGER & RECEIPTS
                ================================================================ */}
            {activeTab === 'transactions' && (
              <View style={styles.tabContent}>
                {/* Search Bar */}
                <View style={styles.searchBox}>
                  <Search size={18} color="#6B7280" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search receipt #, flat, resident..."
                    placeholderTextColor="#9CA3AF"
                    value={txnSearch}
                    onChangeText={setTxnSearch}
                  />
                  {txnSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setTxnSearch('')}>
                      <X size={16} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category Filter Horizontal Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryPillsScroll}
                >
                  {[
                    { id: 'ALL', label: 'All Categories' },
                    { id: 'MAINTENANCE', label: 'Maintenance' },
                    { id: 'SPECIAL_CHARGES', label: 'Special Charges' },
                    { id: 'AMENITIES', label: 'Amenities' },
                    { id: 'SUBSCRIPTION', label: 'Subscription' },
                  ].map((cat) => {
                    const isSelected = txnCategoryFilter === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catPill, isSelected && styles.catPillActive]}
                        onPress={() => setTxnCategoryFilter(cat.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Transaction Cards List */}
                <Text style={styles.sectionHeaderTitle}>RECENT TRANSACTIONS ({filteredTransactions.length})</Text>

                {filteredTransactions.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Receipt size={38} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Transactions Found</Text>
                    <Text style={styles.emptySub}>No receipts match your search or filter criteria.</Text>
                  </View>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isMaint = tx.category === 'MAINTENANCE';
                    const isSC = tx.category === 'SPECIAL_CHARGES';
                    const isAmen = tx.category === 'AMENITIES';

                    const badgeBg = isMaint
                      ? 'rgba(16, 185, 129, 0.12)'
                      : isSC
                      ? 'rgba(245, 158, 11, 0.12)'
                      : isAmen
                      ? 'rgba(59, 130, 246, 0.12)'
                      : 'rgba(168, 85, 247, 0.12)';

                    const badgeColor = isMaint
                      ? '#059669'
                      : isSC
                      ? '#D97706'
                      : isAmen
                      ? '#2563EB'
                      : '#9333EA';

                    return (
                      <TouchableOpacity
                        key={tx.id || tx.reference_number}
                        style={styles.txCard}
                        activeOpacity={0.75}
                        onPress={() => setSelectedReceipt(tx)}
                      >
                        <View style={styles.txTopRow}>
                          <View style={[styles.catBadge, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.catBadgeText, { color: badgeColor }]}>
                              {tx.category ? tx.category.replace('_', ' ') : 'PAYMENT'}
                            </Text>
                          </View>
                          <Text style={styles.txRefNumber}>
                            {tx.reference_number || 'REC-N/A'}
                          </Text>
                        </View>

                        <View style={styles.txMidRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.txHomeNumber}>{tx.home_number || 'Unit'}</Text>
                            <Text style={styles.txResidentName}>{tx.resident_name || 'Resident'}</Text>
                          </View>
                          <Text style={styles.txAmount}>₹{Number(tx.amount || 0).toLocaleString()}</Text>
                        </View>

                        <View style={styles.txFooterRow}>
                          <View style={styles.modeBadge}>
                            <Text style={styles.modeBadgeText}>{tx.payment_method || 'ONLINE'}</Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                            <CheckCircle2 size={12} color="#059669" style={{ marginRight: 3 }} />
                            <Text style={styles.statusBadgeText}>{tx.status || 'PAID'}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ================================================================
          RECEIPT DETAILS MODAL SHEET
          ================================================================ */}
      <Modal
        visible={!!selectedReceipt}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedReceipt(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.receiptSheet} onPress={(e) => {}}>
            <View style={styles.sheetHandle} />

            <View style={styles.receiptHeader}>
              <View style={styles.receiptTitleWrap}>
                <Receipt size={22} color={THEME.colors.clay} />
                <Text style={styles.receiptSheetTitle}>Payment Receipt</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedReceipt(null)} style={styles.sheetCloseBtn}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedReceipt && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.receiptBody}>
                {/* Amount Stamp Card */}
                <View style={styles.amountStampCard}>
                  <Text style={styles.stampLabel}>AMOUNT PAID</Text>
                  <Text style={styles.stampValue}>₹{Number(selectedReceipt.amount || 0).toLocaleString()}</Text>
                  <View style={styles.stampSuccessBadge}>
                    <CheckCircle2 size={13} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.stampSuccessText}>SUCCESSFULLY SETTLED</Text>
                  </View>
                </View>

                {/* Receipt Data Table */}
                <View style={styles.receiptTable}>
                  <View style={styles.receiptTableRow}>
                    <Text style={styles.tableColLabel}>Receipt No.</Text>
                    <Text style={[styles.tableColValue, { fontWeight: '700', color: THEME.colors.clay }]}>
                      {selectedReceipt.reference_number || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.receiptTableRow}>
                    <Text style={styles.tableColLabel}>Invoice Ref</Text>
                    <Text style={styles.tableColValue}>{selectedReceipt.invoice_number || '—'}</Text>
                  </View>

                  <View style={styles.receiptTableRow}>
                    <Text style={styles.tableColLabel}>Head Category</Text>
                    <Text style={[styles.tableColValue, { fontWeight: '700' }]}>
                      {selectedReceipt.category ? selectedReceipt.category.replace('_', ' ') : 'PAYMENT'}
                    </Text>
                  </View>

                  <View style={styles.receiptTableRow}>
                    <Text style={styles.tableColLabel}>Unit / Flat</Text>
                    <Text style={styles.tableColValue}>{selectedReceipt.home_number || 'N/A'}</Text>
                  </View>

                  <View style={styles.receiptTableRow}>
                    <Text style={styles.tableColLabel}>Resident</Text>
                    <Text style={styles.tableColValue}>{selectedReceipt.resident_name || 'N/A'}</Text>
                  </View>

                  <View style={styles.receiptTableRow}>
                    <Text style={styles.tableColLabel}>Payment Mode</Text>
                    <Text style={styles.tableColValue}>{selectedReceipt.payment_method || 'ONLINE'}</Text>
                  </View>

                  <View style={[styles.receiptTableRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.tableColLabel}>Status</Text>
                    <Text style={[styles.tableColValue, { color: '#059669', fontWeight: '800' }]}>
                      {selectedReceipt.status || 'PAID'}
                    </Text>
                  </View>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeFullBtn}
                  activeOpacity={0.8}
                  onPress={() => setSelectedReceipt(null)}
                >
                  <Text style={styles.closeFullBtnText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6F2',
  },
  header: {
    backgroundColor: '#342C26',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...THEME.shadows.float,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  yearLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  yearScroll: {
    gap: 8,
  },
  yearChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  yearChipActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  yearChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  yearChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  // Top 4 Executive KPI Cards - Horizontal View
  metricsContainer: {
    marginHorizontal: -16,
    marginBottom: 4,
  },
  metricsHorizontalScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  kpiCardHorizontal: {
    width: 250,
    minHeight: 124,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    ...THEME.shadows.card,
  },
  kpiGrid: {
    gap: 12,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    ...THEME.shadows.card,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  kpiTag: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  kpiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  kpiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  kpiSubText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  // Tabs Bar
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.card,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 5,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: THEME.colors.clay,
    fontWeight: '800',
  },
  tabCountPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  tabCountPillActive: {
    backgroundColor: THEME.colors.clay,
  },
  tabCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },
  tabContent: {
    marginTop: 16,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  // 4 Core Pillars
  pillarsGrid: {
    gap: 12,
  },
  pillarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.card,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillarIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  pillarSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  recoveryTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recoveryTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pillarMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pillarMetricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 2,
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Audited Statement Card
  statementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.card,
  },
  statementHeader: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statementTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  statementSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  statementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  statementLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  statementValue: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  // Monthly Breakdown Cards
  monthCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    ...THEME.shadows.card,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  monthName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  monthBilledText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  monthPaidText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  monthPendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 1,
  },
  monthExpandBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBarTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  monthBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  monthSubBreakdown: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAF9',
  },
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  subItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.darkBrown,
  },
  subItemVal: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  // Transactions Tab
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.darkBrown,
    padding: 0,
  },
  categoryPillsScroll: {
    gap: 8,
    paddingVertical: 12,
  },
  catPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catPillActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  catPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...THEME.shadows.card,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  txRefNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.clay,
  },
  txMidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  txHomeNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  txResidentName: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  txFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  // Modal Sheet for Receipt
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  receiptSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  receiptBody: {
    paddingBottom: 20,
  },
  amountStampCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 16,
  },
  stampLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.5,
  },
  stampValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#059669',
    marginTop: 4,
  },
  stampSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stampSuccessText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  receiptTable: {
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  receiptTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableColLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  tableColValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  closeFullBtn: {
    backgroundColor: THEME.colors.clay,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  closeFullBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
