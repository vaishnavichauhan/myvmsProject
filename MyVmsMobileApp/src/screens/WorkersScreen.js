import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { PrimaryButton } from '../components/PrimaryButton';
import { workerApi } from '../services/apiServices';

export const WorkersScreen = ({ navigation }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [workerType, setWorkerType] = useState('MAID');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await workerApi.getHomeWorkers();
      const list = res.data?.workers || res.data || [];
      setWorkers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Error fetching workers:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddWorker = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Please enter both worker name and phone number.');
      return;
    }

    setSaving(true);
    try {
      await workerApi.createWorker({
        name: name.trim(),
        phone: phone.trim(),
        worker_type: workerType,
      });
      Alert.alert('Success', 'Domestic worker registered and assigned.');
      setModalVisible(false);
      setName('');
      setPhone('');
      fetchWorkers();
    } catch (err) {
      Alert.alert('Failed', err.message || 'Could not register worker.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorker = (id, workerName) => {
    Alert.alert('Remove Worker', `Are you sure you want to remove ${workerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await workerApi.deleteWorker(id);
            fetchWorkers();
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to remove worker.');
          }
        },
      },
    ]);
  };

  const workerTypes = ['MAID', 'COOK', 'DRIVER', 'CLEANER', 'SECURITY', 'GARDENER'];

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <CustomIcon name="briefcase" size={20} color={THEME.colors.fernGreen} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{item.name || item.full_name}</Text>
          <Text style={styles.phone}>{item.phone || 'No phone number'}</Text>
        </View>

        <TouchableOpacity
          onPress={() => handleDeleteWorker(item.id, item.name || item.full_name)}
          style={styles.deleteBtn}
        >
          <CustomIcon name="close" size={14} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.worker_type || 'DOMESTIC HELP'}</Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>GATE PASS ACTIVE</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Domestic Help & Workers"
        subtitle="Registered household staff & passes"
        showBack
        rightActionIcon="plus"
        onRightActionPress={() => setModalVisible(true)}
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading domestic workers...</Text>
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(item, index) => String(item.id || index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchWorkers();
              }}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="briefcase" size={42} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Workers Registered</Text>
              <Text style={styles.emptySubtitle}>Tap + in the header to register domestic help.</Text>
            </View>
          }
        />
      )}

      {/* Add Worker Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Domestic Helper</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <CustomIcon name="close" size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>HELPER FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={THEME.colors.textDim}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={THEME.colors.textDim}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ROLE / CATEGORY</Text>
              <View style={styles.typeChips}>
                {workerTypes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setWorkerType(t)}
                    style={[styles.typeChip, workerType === t && styles.typeChipActive]}
                  >
                    <Text style={[styles.typeChipText, workerType === t && styles.typeChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <PrimaryButton
              title="Assign Pass"
              onPress={handleAddWorker}
              loading={saving}
              color={THEME.colors.fernGreen}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
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
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(107, 142, 90, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  phone: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(214, 194, 161, 0.25)',
    marginVertical: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: 'rgba(107, 142, 90, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: 'rgba(107, 142, 90, 0.25)',
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.fernGreenDark,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    height: 46,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    fontSize: 14,
    color: THEME.colors.darkBrown,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.sandLight,
  },
  typeChipActive: {
    backgroundColor: THEME.colors.fernGreen,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  typeChipTextActive: {
    color: THEME.colors.white,
  },
});
