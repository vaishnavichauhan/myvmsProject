import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { gateApi } from '../services/apiServices';

export const GatesScreen = ({ navigation }) => {
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchGates();
  }, []);

  const fetchGates = async () => {
    try {
      const res = await gateApi.getGates();
      const list = res.data?.gates || res.data || [];
      setGates(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Error fetching gates:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconCircle}>
          <CustomIcon name="shield" size={22} color={THEME.colors.skyBlueDark} />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.name}>{item.name || item.gate_name || 'Society Gate'}</Text>
          <Text style={styles.type}>{item.gate_type || 'Main Entry Point'}</Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status || 'ACTIVE'}</Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Assigned Staff:</Text>
          <Text style={styles.detailVal}>
            {item.assigned_guard_name || item.guard_name || 'On Duty Staff'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Shift:</Text>
          <Text style={styles.detailVal}>{item.shift || 'General Shift'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Gate ID:</Text>
          <Text style={styles.detailVal}>GATE-{item.id || '101'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Society Gates & Checkpoints"
        subtitle="Physical checkpoints & guard assignments"
        showBack
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading society gates...</Text>
        </View>
      ) : (
        <FlatList
          data={gates}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchGates();
              }}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="shield" size={42} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Gates Configured</Text>
              <Text style={styles.emptySubtitle}>Society checkpoint roster is currently empty.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 12,
    ...THEME.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(135, 206, 235, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  type: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  detailsGrid: {
    backgroundColor: THEME.colors.sandWell,
    borderRadius: THEME.radius.md,
    padding: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
});
