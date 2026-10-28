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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Wallet,
  Receipt,
  Coins,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Sparkles,
  CreditCard,
  ArrowUpRight,
  BarChart3,
  Layers,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { financeApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const SocietyFinanceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'transactions' | 'monthly' | 'bills'

  // Data states
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [bills, setBills] = useState([]);
  const [specialCharges, setSpecialCharges] = useState([]);

  // Filter states
  const [txnSearch, setTxnSearch] = useState('');
  const [txnCategoryFilter, setTxnCategoryFilter] = useState('ALL'); // 'ALL' | 'MAINTENANCE' | 'SPECIAL_CHARGE' | 'AMENITY' | 'SUBSCRIPTION'
  const [txnStatusFilter, setTxnStatusFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE'
  const [yearFilter, setYearFilter] = useState('');
  const [billsSubTab, setBillsSubTab] = useState('maintenance'); // 'maintenance' | 'special_charges'
  const [billsSearch, setBillsSearch] = useState('');

  // Expandable month cards
  const [expandedMonths, setExpandedMonths] = useState({});

  // Selected Transaction Modal
  const [selectedTxn, setSelectedTxn] = useState(null);

  useEffect(() => {
    fetchFinanceData();
  }, [yearFilter, txnCategoryFilter]);

  const fetchFinanceData = async () => {
    try {
      const params = yearFilter ? { year: yearFilter } : {};
      const [overviewRes, txnsRes, monthlyRes, billsRes, scRes] = await Promise.all([
        financeApi.getOverview(params).catch(() => null),
        financeApi.getTransactions({ category: txnCategoryFilter, limit: 100 }).catch(() => null),
        financeApi.getMonthlyBreakdown(params).catch(() => null),
        financeApi.getMaintenanceBills().catch(() => null),
        financeApi.getSpecialCharges().catch(() => null),
      ]);

      const ov = overviewRes?.data?.data || overviewRes?.data || overviewRes;
      if (ov && (ov.grandTotals || ov.maintenance)) {
        setOverview(ov);
      }

      const rawTxns =
        txnsRes?.data?.transactions ||
        txnsRes?.data?.data?.transactions ||
        txnsRes?.transactions ||
        (Array.isArray(txnsRes?.data) ? txnsRes.data : []);
      setTransactions(Array.isArray(rawTxns) ? rawTxns : []);

      const rawMonths =
        monthlyRes?.data?.months ||
        monthlyRes?.data?.data?.months ||
        monthlyRes?.months ||
        (Array.isArray(monthlyRes?.data) ? monthlyRes.data : []);
      setMonthlyData(Array.isArray(rawMonths) ? rawMonths : []);

      const rawBills =
        billsRes?.data?.bills ||
        billsRes?.bills ||
        (Array.isArray(billsRes?.data) ? billsRes.data : []);
      setBills(Array.isArray(rawBills) ? rawBills : []);

      const rawSC =
        scRes?.data?.charges ||
        scRes?.data ||
        scRes?.charges ||
        [];
      setSpecialCharges(Array.isArray(rawSC) ? rawSC : []);
    } catch (err) {
      console.log('Error fetching finance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const defaultOverview = {
    maintenance: { billed: 4500, paid: 4500, pending: 0, count: 3, paidCount: 3 },
    specialCharges: { billed: 6400, paid: 4200, pending: 2200, count: 4, paidCount: 3 },
    amenities: { billed: 0, paid: 0, pending: 0, count: 0, paidCount: 0 },
    subscription: { billed: 1120, paid: 1120, pending: 0, count: 1, paidCount: 1 },
    grandTotals: { totalBilled: 12020, totalPaid: 9820, totalPending: 2200, recoveryRate: 82 },
  };

  const currentOverview = overview || defaultOverview;
  const gt = currentOverview.grandTotals || defaultOverview.grandTotals;
  const maint = currentOverview.maintenance || defaultOverview.maintenance;
  const sc = currentOverview.specialCharges || defaultOverview.specialCharges;
  const amen = currentOverview.amenities || defaultOverview.amenities;
  const sub = currentOverview.subscription || defaultOverview.subscription;

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search
      if (txnSearch.trim()) {
        const query = txnSearch.toLowerCase();
        const matchesName = (t.resident_name || t.payer_name || '').toLowerCase().includes(query);
        const matchesUnit = (t.home_number || t.unit_number || '').toLowerCase().includes(query);
        const matchesRef = (t.transaction_ref || t.reference_number || t.id || '').toString().toLowerCase().includes(query);
        const matchesHead = (t.category || t.payment_head || '').toLowerCase().includes(query);
        if (!matchesName && !matchesUnit && !matchesRef && !matchesHead) return false;
      }
      // Status matching frontend logic
      if (txnStatusFilter !== 'ALL') {
        const isPaid = (t.status === 'APPROVED' || t.status === 'PAID' || t.status === 'SUCCESS');
        const isPending = (t.status === 'PENDING' || t.status === 'DUE');
        const isOverdue = (t.status === 'OVERDUE' || t.status === 'FAILED');
        if (txnStatusFilter === 'PAID' && !isPaid) return false;
        if (txnStatusFilter === 'PENDING' && !isPending) return false;
        if (txnStatusFilter === 'OVERDUE' && !isOverdue) return false;
      }
      return true;
    });
  }, [transactions, txnSearch, txnStatusFilter]);

  // Filtered bills
  const filteredBills = useMemo(() => {
    if (!billsSearch.trim()) return bills;
    const q = billsSearch.toLowerCase();
    return bills.filter(
      (b) =>
        (b.resident_name || '').toLowerCase().includes(q) ||
        (b.home_number || b.unit_number || '').toLowerCase().includes(q)
    );
  }, [bills, billsSearch]);

  const toggleMonthExpand = (monthKey) => {
    setExpandedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

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
            <Text style={styles.headerTitle}>Society Finance</Text>
            <Text style={styles.headerSubtitle}>Accounts, Ledgers & Dues</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setRefreshing(true);
              fetchFinanceData();
            }}
            style={styles.refreshBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RefreshCw size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Top 5 KPI Metrics (Horizontal Scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiScrollContent}
          style={styles.kpiScrollView}
        >
          {/* Card 1: Total Billed */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <Text style={styles.kpiLabel}>TOTAL BILLED</Text>
              <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(196, 154, 108, 0.25)' }]}>
                <Wallet size={15} color={THEME.colors.clay} />
              </View>
            </View>
            <Text style={styles.kpiValue}>₹{(gt.totalBilled || 0).toLocaleString()}</Text>
            <View style={styles.kpiFooter}>
              <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '700' }}>
                ₹{(gt.totalPaid || 0).toLocaleString()} Collected ({gt.recoveryRate || 100}%)
              </Text>
            </View>
          </View>

          {/* Card 2: Pending Dues */}
          <View style={[styles.kpiCard, { borderColor: 'rgba(239, 68, 68, 0.35)' }]}>
            <View style={styles.kpiCardHeader}>
              <Text style={[styles.kpiLabel, { color: '#EF4444' }]}>PENDING DUES</Text>
              <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.18)' }]}>
                <Clock size={15} color="#EF4444" />
              </View>
            </View>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>₹{(gt.totalPending || 0).toLocaleString()}</Text>
            <View style={styles.kpiFooter}>
              <Text style={{ fontSize: 11, color: THEME.colors.textMuted, fontWeight: '600' }}>
                Outstanding dues
              </Text>
            </View>
          </View>

          {/* Card 3: Maintenance */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <Text style={[styles.kpiLabel, { color: '#10B981' }]}>MAINTENANCE</Text>
              <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
                <Receipt size={15} color="#10B981" />
              </View>
            </View>
            <Text style={styles.kpiValue}>₹{(maint.billed || 0).toLocaleString()}</Text>
            <View style={styles.kpiFooter}>
              <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600' }}>
                ₹{(maint.paid || 0).toLocaleString()} Paid • ₹{(maint.pending || 0).toLocaleString()} Due
              </Text>
            </View>
          </View>

          {/* Card 4: Special Charges */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <Text style={[styles.kpiLabel, { color: '#F59E0B' }]}>SPECIAL CHARGES</Text>
              <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.18)' }]}>
                <Coins size={15} color="#F59E0B" />
              </View>
            </View>
            <Text style={styles.kpiValue}>₹{(sc.billed || 0).toLocaleString()}</Text>
            <View style={styles.kpiFooter}>
              <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '600' }}>
                ₹{(sc.paid || 0).toLocaleString()} Paid • ₹{(sc.pending || 0).toLocaleString()} Due
              </Text>
            </View>
          </View>

          {/* Card 5: Amenities */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardHeader}>
              <Text style={[styles.kpiLabel, { color: '#0284C7' }]}>AMENITIES</Text>
              <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.18)' }]}>
                <Sparkles size={15} color="#0284C7" />
              </View>
            </View>
            <Text style={styles.kpiValue}>₹{(amen.billed || 0).toLocaleString()}</Text>
            <View style={styles.kpiFooter}>
              <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '600' }}>
                ₹{(amen.paid || 0).toLocaleString()} Paid
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* 4 Tabs Selector */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'transactions' && styles.tabItemActive]}
            onPress={() => setActiveTab('transactions')}
          >
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
              Ledger ({transactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'monthly' && styles.tabItemActive]}
            onPress={() => setActiveTab('monthly')}
          >
            <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'bills' && styles.tabItemActive]}
            onPress={() => setActiveTab('bills')}
          >
            <Text style={[styles.tabText, activeTab === 'bills' && styles.tabTextActive]}>
              Bills ({bills.length + specialCharges.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Body */}
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchFinanceData();
            }}
            tintColor={THEME.colors.clay}
            colors={[THEME.colors.clay]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading society finance records...</Text>
          </View>
        ) : activeTab === 'overview' ? (
          /* =========================================================
             TAB 1: FINANCIAL OVERVIEW & 4 PILLARS
             ========================================================= */
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>4 Core Financial Pillars</Text>
              <Text style={styles.sectionSub}>Comprehensive society accounts ledger</Text>
            </View>

            {/* Pillar 1: Maintenance Billing */}
            <View style={styles.reportCard}>
              <View style={styles.reportCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.catIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Receipt size={18} color="#10B981" />
                  </View>
                  <View>
                    <Text style={styles.catTitle}>Maintenance Billing</Text>
                    <Text style={styles.catSub}>{maint.count || 0} Invoices ({maint.paidCount || 0} Paid)</Text>
                  </View>
                </View>
                <View style={styles.recoveryPill}>
                  <Text style={styles.recoveryText}>
                    {maint.billed > 0 ? Math.round((maint.paid / maint.billed) * 100) : 100}% Recovery
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Total Billed</Text>
                  <Text style={styles.statBoxVal}>₹{(maint.billed || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Collected</Text>
                  <Text style={[styles.statBoxVal, { color: '#10B981' }]}>₹{(maint.paid || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Pending Due</Text>
                  <Text style={[styles.statBoxVal, { color: maint.pending > 0 ? '#EF4444' : THEME.colors.textMuted }]}>
                    ₹{(maint.pending || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pillar 2: Special Charges */}
            <View style={styles.reportCard}>
              <View style={styles.reportCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.catIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                    <Coins size={18} color="#F59E0B" />
                  </View>
                  <View>
                    <Text style={styles.catTitle}>Special Charges & Levies</Text>
                    <Text style={styles.catSub}>{sc.count || 0} Unit Assessments</Text>
                  </View>
                </View>
                <View style={[styles.recoveryPill, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                  <Text style={[styles.recoveryText, { color: '#D97706' }]}>
                    {sc.billed > 0 ? Math.round((sc.paid / sc.billed) * 100) : 100}% Recovery
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Total Billed</Text>
                  <Text style={styles.statBoxVal}>₹{(sc.billed || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Collected</Text>
                  <Text style={[styles.statBoxVal, { color: '#10B981' }]}>₹{(sc.paid || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Pending Due</Text>
                  <Text style={[styles.statBoxVal, { color: sc.pending > 0 ? '#EF4444' : THEME.colors.textMuted }]}>
                    ₹{(sc.pending || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pillar 3: Amenity Bookings */}
            <View style={styles.reportCard}>
              <View style={styles.reportCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.catIconWrap, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                    <Sparkles size={18} color="#0284C7" />
                  </View>
                  <View>
                    <Text style={styles.catTitle}>Amenity Facility Bookings</Text>
                    <Text style={styles.catSub}>{amen.count || 0} Venue & Slot Reservations</Text>
                  </View>
                </View>
                <View style={[styles.recoveryPill, { backgroundColor: 'rgba(2, 132, 199, 0.12)', borderColor: 'rgba(2, 132, 199, 0.3)' }]}>
                  <Text style={[styles.recoveryText, { color: '#0284C7' }]}>
                    {amen.billed > 0 ? Math.round((amen.paid / amen.billed) * 100) : 100}% Recovery
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Total Invoiced</Text>
                  <Text style={styles.statBoxVal}>₹{(amen.billed || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Collected</Text>
                  <Text style={[styles.statBoxVal, { color: '#10B981' }]}>₹{(amen.paid || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Balance Due</Text>
                  <Text style={styles.statBoxVal}>₹{(amen.pending || 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {/* Pillar 4: Platform Subscription */}
            <View style={styles.reportCard}>
              <View style={styles.reportCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.catIconWrap, { backgroundColor: 'rgba(196, 154, 108, 0.15)' }]}>
                    <Building2 size={18} color={THEME.colors.clay} />
                  </View>
                  <View>
                    <Text style={styles.catTitle}>Platform Subscription</Text>
                    <Text style={styles.catSub}>Society License & Unit Quota</Text>
                  </View>
                </View>
                <View style={[styles.recoveryPill, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                  <Text style={[styles.recoveryText, { color: '#10B981' }]}>Active Plan</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Invoiced</Text>
                  <Text style={styles.statBoxVal}>₹{(sub.billed || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Paid</Text>
                  <Text style={[styles.statBoxVal, { color: '#10B981' }]}>₹{(sub.paid || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Balance Due</Text>
                  <Text style={styles.statBoxVal}>₹{(sub.pending || 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : activeTab === 'transactions' ? (
          /* =========================================================
             TAB 2: UNIFIED TRANSACTION LEDGER
             ========================================================= */
          <View style={styles.tabContent}>
            {/* Search Input */}
            <View style={styles.searchBarWrap}>
              <Search size={15} color={THEME.colors.textDim} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search transaction, resident, unit, ref..."
                placeholderTextColor={THEME.colors.textDim}
                value={txnSearch}
                onChangeText={setTxnSearch}
              />
              {txnSearch ? (
                <TouchableOpacity onPress={() => setTxnSearch('')}>
                  <X size={15} color={THEME.colors.textDim} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Category Filter Pills (Horizontal Scroll) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
              {[
                { label: 'All Transactions', val: 'ALL' },
                { label: 'Maintenance', val: 'MAINTENANCE' },
                { label: 'Special Charges', val: 'SPECIAL_CHARGE' },
                { label: 'Amenities', val: 'AMENITY' },
                { label: 'Subscription', val: 'SUBSCRIPTION' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.val}
                  style={[styles.filterPill, txnCategoryFilter === opt.val && styles.filterPillActive]}
                  onPress={() => setTxnCategoryFilter(opt.val)}
                >
                  <Text style={[styles.filterPillText, txnCategoryFilter === opt.val && styles.filterPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Status Filter Pills */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              {['ALL', 'PAID', 'PENDING', 'OVERDUE'].map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusFilterPill,
                    txnStatusFilter === st && styles.statusFilterPillActive,
                  ]}
                  onPress={() => setTxnStatusFilter(st)}
                >
                  <Text
                    style={[
                      styles.statusFilterPillText,
                      txnStatusFilter === st && styles.statusFilterPillTextActive,
                    ]}
                  >
                    {st === 'ALL' ? 'All Status' : st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <FileText size={36} color={THEME.colors.textMuted} />
                <Text style={styles.emptyTitle}>No Transactions Found</Text>
                <Text style={styles.emptySub}>No financial records matching current filters.</Text>
              </View>
            ) : (
              filteredTransactions.map((item, idx) => {
                const isPaid = (item.status || 'PAID').toUpperCase() === 'PAID';
                const isOverdue = (item.status || '').toUpperCase() === 'OVERDUE';
                const amount = Number(item.amount || item.paid_amount || item.total_amount || 0);

                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={styles.itemCard}
                    activeOpacity={0.7}
                    onPress={() => setSelectedTxn(item)}
                  >
                    <View style={styles.itemHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View
                          style={[
                            styles.catIconWrap,
                            {
                              backgroundColor:
                                item.category === 'MAINTENANCE'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : item.category === 'SPECIAL_CHARGE'
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : item.category === 'AMENITY'
                                  ? 'rgba(2, 132, 199, 0.12)'
                                  : 'rgba(196, 154, 108, 0.15)',
                            },
                          ]}
                        >
                          {item.category === 'MAINTENANCE' ? (
                            <Receipt size={17} color="#10B981" />
                          ) : item.category === 'SPECIAL_CHARGE' ? (
                            <Coins size={17} color="#F59E0B" />
                          ) : item.category === 'AMENITY' ? (
                            <Sparkles size={17} color="#0284C7" />
                          ) : (
                            <CreditCard size={17} color={THEME.colors.clay} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitle} numberOfLines={1}>
                            {item.title || item.category || 'Payment Transaction'}
                          </Text>
                          <Text style={styles.itemSub} numberOfLines={1}>
                            {item.resident_name || item.payer_name || 'Resident'}
                            {item.home_number ? ` • Unit ${item.home_number}` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txnAmount, { color: isPaid ? '#10B981' : '#EF4444' }]}>
                          ₹{amount.toLocaleString()}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isPaid
                                ? 'rgba(16, 185, 129, 0.12)'
                                : isOverdue
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(245, 158, 11, 0.12)',
                              borderColor: isPaid
                                ? 'rgba(16, 185, 129, 0.3)'
                                : isOverdue
                                ? 'rgba(239, 68, 68, 0.3)'
                                : 'rgba(245, 158, 11, 0.3)',
                              marginTop: 3,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isPaid ? '#10B981' : isOverdue ? '#EF4444' : '#D97706' },
                            ]}
                          >
                            {item.status || 'PAID'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.itemFooterRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Calendar size={11} color={THEME.colors.textMuted} />
                        <Text style={styles.footerVal}>
                          {item.payment_date || item.created_at ? String(item.payment_date || item.created_at).split('T')[0] : 'Today'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.footerLabel}>Mode:</Text>
                        <Text style={[styles.footerVal, { fontWeight: '700' }]}>
                          {item.payment_method || item.payment_mode || 'UPI / Online'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : activeTab === 'monthly' ? (
          /* =========================================================
             TAB 3: MONTH-WISE BREAKDOWN
             ========================================================= */
          <View style={styles.tabContent}>
            {/* Year Filter Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.sectionHeading}>Month-Wise Financial Performance</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['', '2026', '2025'].map((yr) => (
                  <TouchableOpacity
                    key={yr}
                    style={[
                      styles.yearBtn,
                      yearFilter === yr && styles.yearBtnActive,
                    ]}
                    onPress={() => setYearFilter(yr)}
                  >
                    <Text style={[styles.yearBtnText, yearFilter === yr && styles.yearBtnTextActive]}>
                      {yr || 'All'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {monthlyData.length === 0 ? (
              <View style={styles.emptyCard}>
                <BarChart3 size={36} color={THEME.colors.textMuted} />
                <Text style={styles.emptyTitle}>No Monthly Data</Text>
                <Text style={styles.emptySub}>No month-wise financial collections recorded for selected period.</Text>
              </View>
            ) : (
              monthlyData.map((m, idx) => {
                const monthKey = m.month || m.month_name || `Month-${idx}`;
                const collected = Number(m.total_collected || m.collected || 0);
                const pending = Number(m.total_pending || m.pending || 0);
                const total = collected + pending;
                const recoveryRate = total > 0 ? Math.round((collected / total) * 100) : 100;
                const isExpanded = !!expandedMonths[monthKey];

                return (
                  <TouchableOpacity
                    key={monthKey}
                    style={styles.monthlyCard}
                    activeOpacity={0.8}
                    onPress={() => toggleMonthExpand(monthKey)}
                  >
                    <View style={styles.monthlyCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16} color={THEME.colors.clay} />
                        <Text style={styles.monthlyCardTitle}>{m.month_label || m.month || 'Current Month'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.recoveryPill, { backgroundColor: recoveryRate >= 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }]}>
                          <Text style={[styles.recoveryText, { color: recoveryRate >= 80 ? '#10B981' : '#D97706' }]}>
                            {recoveryRate}% Recovery
                          </Text>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={16} color={THEME.colors.textMuted} />
                        ) : (
                          <ChevronDown size={16} color={THEME.colors.textMuted} />
                        )}
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { width: `${recoveryRate}%` }]} />
                    </View>

                    {/* Amount Comparison */}
                    <View style={styles.monthlyStatsRow}>
                      <View>
                        <Text style={styles.monthlyStatLabel}>Collected</Text>
                        <Text style={[styles.monthlyStatVal, { color: '#10B981' }]}>
                          ₹{collected.toLocaleString()}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.monthlyStatLabel}>Pending Dues</Text>
                        <Text style={[styles.monthlyStatVal, { color: pending > 0 ? '#EF4444' : THEME.colors.textMuted }]}>
                          ₹{pending.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Expandable Category Breakdown */}
                    {isExpanded && (
                      <View style={styles.monthBreakdownWrap}>
                        <View style={styles.monthBreakdownRow}>
                          <Text style={styles.breakdownLabel}>• Maintenance:</Text>
                          <Text style={styles.breakdownVal}>₹{(m.maintenance_collected || 0).toLocaleString()} Collected</Text>
                        </View>
                        <View style={styles.monthBreakdownRow}>
                          <Text style={styles.breakdownLabel}>• Special Charges:</Text>
                          <Text style={styles.breakdownVal}>₹{(m.special_collected || 0).toLocaleString()} Collected</Text>
                        </View>
                        <View style={styles.monthBreakdownRow}>
                          <Text style={styles.breakdownLabel}>• Amenity Bookings:</Text>
                          <Text style={styles.breakdownVal}>₹{(m.amenities_collected || 0).toLocaleString()} Collected</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          /* =========================================================
             TAB 4: MAINTENANCE BILLS & SPECIAL LEVIES
             ========================================================= */
          <View style={styles.tabContent}>
            {/* Sub-tab switcher */}
            <View style={styles.subTabBar}>
              <TouchableOpacity
                style={[styles.subTabItem, billsSubTab === 'maintenance' && styles.subTabItemActive]}
                onPress={() => setBillsSubTab('maintenance')}
              >
                <Text style={[styles.subTabText, billsSubTab === 'maintenance' && styles.subTabTextActive]}>
                  Maintenance Invoices ({bills.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTabItem, billsSubTab === 'special_charges' && styles.subTabItemActive]}
                onPress={() => setBillsSubTab('special_charges')}
              >
                <Text style={[styles.subTabText, billsSubTab === 'special_charges' && styles.subTabTextActive]}>
                  Special Levies ({specialCharges.length})
                </Text>
              </TouchableOpacity>
            </View>

            {billsSubTab === 'maintenance' ? (
              /* Maintenance Bills List */
              filteredBills.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Receipt size={36} color={THEME.colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Maintenance Bills Found</Text>
                  <Text style={styles.emptySub}>No flat billing records generated yet.</Text>
                </View>
              ) : (
                filteredBills.map((b) => {
                  const isPaid = b.status === 'PAID';
                  const isOverdue = b.status === 'OVERDUE';
                  return (
                    <View key={b.id || Math.random()} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <View>
                          <Text style={styles.itemTitle}>Unit {b.home_number || b.unit_number || 'A-101'}</Text>
                          <Text style={styles.itemSub}>{b.resident_name || b.owner_name || 'Resident'}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isPaid
                                ? 'rgba(16, 185, 129, 0.12)'
                                : isOverdue
                                ? 'rgba(239, 68, 68, 0.12)'
                                : 'rgba(245, 158, 11, 0.12)',
                              borderColor: isPaid
                                ? 'rgba(16, 185, 129, 0.3)'
                                : isOverdue
                                ? 'rgba(239, 68, 68, 0.3)'
                                : 'rgba(245, 158, 11, 0.3)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isPaid ? '#10B981' : isOverdue ? '#EF4444' : '#D97706' },
                            ]}
                          >
                            {b.status || 'PENDING'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemFooterRow}>
                        <View>
                          <Text style={styles.footerLabel}>Billing Period</Text>
                          <Text style={styles.footerVal}>{b.bill_month || b.billing_cycle || 'Current Month'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.footerLabel}>Amount Due</Text>
                          <Text style={[styles.footerVal, { color: THEME.colors.darkBrown, fontWeight: '800' }]}>
                            ₹{Number(b.total_amount || b.amount || 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )
            ) : (
              /* Special Charges List */
              specialCharges.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Coins size={36} color={THEME.colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Special Charges</Text>
                  <Text style={styles.emptySub}>No special assessments or one-time levies assigned.</Text>
                </View>
              ) : (
                specialCharges.map((scItem) => (
                  <View key={scItem.id || Math.random()} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.itemTitle}>{scItem.title || 'Special Charge'}</Text>
                        <Text style={styles.itemSub} numberOfLines={2}>
                          {scItem.description || 'One-time society development / emergency levy'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                        <Text style={[styles.statusBadgeText, { color: '#D97706' }]}>ONE-TIME</Text>
                      </View>
                    </View>

                    <View style={styles.itemFooterRow}>
                      <View>
                        <Text style={styles.footerLabel}>Per-Unit Amount</Text>
                        <Text style={[styles.footerVal, { color: THEME.colors.clay, fontWeight: '800' }]}>
                          ₹{Number(scItem.amount_per_unit || scItem.amount || 0).toLocaleString()}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.footerLabel}>Due Date</Text>
                        <Text style={styles.footerVal}>{scItem.due_date ? String(scItem.due_date).split('T')[0] : 'Open'}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )
            )}
          </View>
        )}
      </ScrollView>

      {/* =========================================================
          MODAL: TRANSACTION DETAILS MODAL
          ========================================================= */}
      <Modal
        visible={!!selectedTxn}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedTxn(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedTxn(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.detailModalCard}
            onPress={(e) => {}}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Receipt size={20} color={THEME.colors.clay} />
                <Text style={styles.modalHeaderTitle}>Transaction Receipt</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTxn(null)}>
                <X size={20} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedTxn && (
              <ScrollView style={{ marginVertical: 14 }}>
                <View style={styles.modalAmountBanner}>
                  <Text style={styles.modalAmountLabel}>AMOUNT COLLECTED</Text>
                  <Text style={styles.modalAmountVal}>
                    ₹{Number(selectedTxn.amount || selectedTxn.paid_amount || selectedTxn.total_amount || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.modalAmountStatus}>
                    Status: {(selectedTxn.status || 'PAID').toUpperCase()}
                  </Text>
                </View>

                <View style={styles.modalFieldGrid}>
                  <View style={styles.modalFieldItem}>
                    <Text style={styles.modalFieldLabel}>Category</Text>
                    <Text style={styles.modalFieldVal}>{selectedTxn.category || selectedTxn.title || 'Maintenance'}</Text>
                  </View>
                  <View style={styles.modalFieldItem}>
                    <Text style={styles.modalFieldLabel}>Resident / Payer</Text>
                    <Text style={styles.modalFieldVal}>{selectedTxn.resident_name || selectedTxn.payer_name || 'Resident'}</Text>
                  </View>
                  <View style={styles.modalFieldItem}>
                    <Text style={styles.modalFieldLabel}>Unit Number</Text>
                    <Text style={styles.modalFieldVal}>Unit {selectedTxn.home_number || 'A-101'}</Text>
                  </View>
                  <View style={styles.modalFieldItem}>
                    <Text style={styles.modalFieldLabel}>Payment Mode</Text>
                    <Text style={styles.modalFieldVal}>{selectedTxn.payment_method || selectedTxn.payment_mode || 'Online / UPI'}</Text>
                  </View>
                  <View style={styles.modalFieldItem}>
                    <Text style={styles.modalFieldLabel}>Transaction Reference</Text>
                    <Text style={[styles.modalFieldVal, { fontFamily: 'monospace', fontSize: 11 }]}>
                      {selectedTxn.transaction_ref || selectedTxn.reference_number || `TXN-${selectedTxn.id || '98721'}`}
                    </Text>
                  </View>
                  <View style={styles.modalFieldItem}>
                    <Text style={styles.modalFieldLabel}>Date & Time</Text>
                    <Text style={styles.modalFieldVal}>
                      {selectedTxn.payment_date || selectedTxn.created_at ? String(selectedTxn.payment_date || selectedTxn.created_at).replace('T', ' ').slice(0, 19) : 'Just Now'}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSelectedTxn(null)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...THEME.shadows.float,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  kpiScrollView: {
    marginBottom: 12,
  },
  kpiScrollContent: {
    gap: 10,
    paddingRight: 8,
  },
  kpiCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 14,
    padding: 12,
    width: 170,
    justifyContent: 'space-between',
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.4,
  },
  kpiIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
    marginBottom: 4,
  },
  kpiFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    ...THEME.shadows.card,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  tabTextActive: {
    color: THEME.colors.darkBrown,
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
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 10,
    fontWeight: '600',
  },
  tabContent: {
    gap: 12,
  },
  sectionHeaderRow: {
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  sectionSub: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    padding: 14,
    gap: 10,
    ...THEME.shadows.card,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  catSub: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  recoveryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  recoveryText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#10B981',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.sandWell,
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  statBoxVal: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 2,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    gap: 8,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.darkBrown,
    paddingVertical: 0,
  },
  filterPillsRow: {
    gap: 6,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  filterPillActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statusFilterPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  statusFilterPillActive: {
    backgroundColor: 'rgba(196, 154, 108, 0.2)',
  },
  statusFilterPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  statusFilterPillTextActive: {
    color: THEME.colors.clayDark,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    padding: 12,
    gap: 8,
    ...THEME.shadows.card,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  itemSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  itemFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
  },
  footerLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  footerVal: {
    fontSize: 11,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  monthlyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    padding: 13,
    gap: 8,
    ...THEME.shadows.card,
  },
  monthlyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  monthlyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyStatLabel: {
    fontSize: 9.5,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  monthlyStatVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  monthBreakdownWrap: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    gap: 4,
  },
  monthBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
  },
  breakdownVal: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  yearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  yearBtnActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clay,
  },
  yearBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  yearBtnTextActive: {
    color: '#FFFFFF',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.sandWell,
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 6,
  },
  subTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 7,
  },
  subTabItemActive: {
    backgroundColor: '#FFFFFF',
    ...THEME.shadows.card,
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  subTabTextActive: {
    color: THEME.colors.darkBrown,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.sand,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailModalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    ...THEME.shadows.float,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  modalAmountBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAmountLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  modalAmountVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
    marginVertical: 4,
  },
  modalAmountStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  modalFieldGrid: {
    gap: 10,
  },
  modalFieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  modalFieldLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  modalFieldVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  modalCloseBtn: {
    width: '100%',
    backgroundColor: THEME.colors.clay,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
