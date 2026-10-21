import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { societyApi } from '../services/apiServices';

export const ResidentsScreen = ({ navigation }) => {
  const [homes, setHomes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      const res = await societyApi.getAllHomes();
      const list = res.data?.homes || res.data || [];
      setHomes(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Error fetching residents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = homes.filter((h) => {
    const q = search.toLowerCase();
    const homeNo = String(h.home_number || h.flat_number || '').toLowerCase();
    const resident = String(h.primary_resident_name || h.owner_name || '').toLowerCase();
    return homeNo.includes(q) || resident.includes(q);
  });

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <CustomIcon name="home" size={20} color={THEME.colors.clay} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.homeNumber}>
            {item.home_number?.toString().startsWith('Home') ? item.home_number : `Home ${item.home_number || '10'}`}
          </Text>
          <Text style={styles.residentName}>
            {item.primary_resident_name || item.owner_name || 'Occupied Resident'}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.occupancy_status || 'OCCUPIED'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Type: {item.home_type || '2BHK'}</Text>
        <Text style={styles.metaLabel}>Intercom: #{item.intercom_number || item.id || '101'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Resident Directory"
        subtitle="Homes, owners & occupants roster"
        showBack
      />

      <View style={styles.searchBar}>
        <CustomIcon name="search" size={16} color={THEME.colors.clay} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by home or resident name..."
          placeholderTextColor={THEME.colors.textDim}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading resident directory...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchResidents();
              }}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="users" size={42} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Homes Found</Text>
              <Text style={styles.emptySubtitle}>No units matched your query.</Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
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
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.sandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  homeNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  residentName: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.clayDark,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(214, 194, 161, 0.25)',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
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
