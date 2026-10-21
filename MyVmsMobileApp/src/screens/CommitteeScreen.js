import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { committeeApi } from '../services/apiServices';

export const CommitteeScreen = ({ navigation }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCommittee();
  }, []);

  const fetchCommittee = async () => {
    try {
      const res = await committeeApi.getCommitteeMembers();
      const list = res.data?.committeeMembers || res.data || [];
      setMembers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Error fetching committee members:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {});
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <CustomIcon name="crown" size={22} color="#D97706" />
        </View>

        <View style={styles.headerText}>
          <Text style={styles.name}>{item.name || item.full_name || 'Committee Officer'}</Text>
          <Text style={styles.designation}>{item.designation || item.role || 'Member'}</Text>
        </View>

        {item.phone ? (
          <TouchableOpacity
            onPress={() => handleCall(item.phone)}
            style={styles.callBtn}
          >
            <CustomIcon name="phone" size={16} color={THEME.colors.clayDark} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Committee:</Text>
          <Text style={styles.detailVal}>{item.committee_name || 'Executive Committee'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Residence:</Text>
          <Text style={styles.detailVal}>Home {item.flat_number || item.home_number || '10'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Contact:</Text>
          <Text style={styles.detailVal}>{item.phone || 'Available via society office'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Managing Committee"
        subtitle="Elected society office bearers"
        showBack
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading committee directory...</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchCommittee();
              }}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="crown" size={42} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Committee Members</Text>
              <Text style={styles.emptySubtitle}>Society committee roster has not been published yet.</Text>
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
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
  designation: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 2,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.sandLight,
    alignItems: 'center',
    justifyContent: 'center',
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
