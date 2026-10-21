import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { courierDeliveryApi } from '../services/apiServices';

export const CourierDeliveryScreen = ({ navigation }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const res = await courierDeliveryApi.getHistory();
      const list = res.data?.deliveries || res.data || [];
      setDeliveries(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Error fetching deliveries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApproval = async (id, decision) => {
    try {
      await courierDeliveryApi.respondToApproval(id, decision);
      Alert.alert('Updated', `Delivery has been ${decision.toLowerCase()}ed.`);
      fetchDeliveries();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update approval.');
    }
  };

  const renderItem = ({ item }) => {
    const isPending = (item.status || item.approval_status) === 'PENDING';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <CustomIcon name="package" size={22} color={THEME.colors.skyBlueDark} />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.company}>{item.company || item.service_provider || 'Delivery'}</Text>
            <Text style={styles.agentName}>Rider: {item.delivery_boy_name || item.agent_name || 'Delivery Partner'}</Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status || 'LOGGED'}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Target Home:</Text>
            <Text style={styles.detailVal}>Home {item.home_number || '10'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailVal}>{item.phone || item.phone_number || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailVal}>
              {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
            </Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => handleApproval(item.id, 'APPROVE')}
              style={[styles.actionBtn, styles.approveBtn]}
            >
              <CustomIcon name="check" size={14} color="#FFFFFF" />
              <Text style={styles.approveBtnText}>Approve Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleApproval(item.id, 'REJECT')}
              style={[styles.actionBtn, styles.rejectBtn]}
            >
              <CustomIcon name="close" size={12} color="#DC2626" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Courier & Deliveries"
        subtitle="Parcel arrivals & food delivery passes"
        showBack
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading delivery parcels...</Text>
        </View>
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDeliveries();
              }}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="package" size={42} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Deliveries Logged</Text>
              <Text style={styles.emptySubtitle}>There are no incoming parcels logged today.</Text>
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
  company: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  agentName: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: THEME.colors.sandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
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
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: THEME.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtn: {
    backgroundColor: THEME.colors.fernGreen,
  },
  approveBtnText: {
    color: THEME.colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
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
