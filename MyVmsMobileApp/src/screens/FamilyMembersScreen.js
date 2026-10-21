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
import { PrimaryButton, OutlineButton } from '../components/PrimaryButton';
import { familyMemberApi } from '../services/apiServices';

export const FamilyMembersScreen = ({ navigation }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Spouse');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await familyMemberApi.getFamilyMembers();
      const list = res.data?.familyMembers || res.data || [];
      setMembers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.log('Error fetching family members:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddMember = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Please enter both full name and phone number.');
      return;
    }

    setSaving(true);
    try {
      await familyMemberApi.createFamilyMember({
        full_name: name.trim(),
        relationship,
        phone: phone.trim(),
      });
      Alert.alert('Success', 'Family member registered successfully.');
      setModalVisible(false);
      setName('');
      setPhone('');
      fetchMembers();
    } catch (err) {
      Alert.alert('Failed', err.message || 'Could not register family member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = (id, memberName) => {
    Alert.alert('Remove Member', `Are you sure you want to remove ${memberName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await familyMemberApi.deleteFamilyMember(id);
            fetchMembers();
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to remove member.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(item.full_name || 'F').charAt(0)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.phone}>{item.phone || 'No phone number'}</Text>
        </View>

        <TouchableOpacity
          onPress={() => handleDeleteMember(item.id, item.full_name)}
          style={styles.deleteBtn}
        >
          <CustomIcon name="close" size={14} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.badgeRow}>
        <View style={styles.relBadge}>
          <Text style={styles.relText}>{item.relationship || 'Family'}</Text>
        </View>

        {item.is_emergency_contact ? (
          <View style={styles.emergencyBadge}>
            <Text style={styles.emergencyText}>EMERGENCY CONTACT</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Family Members"
        subtitle="Registered household residents"
        showBack
        rightActionIcon="plus"
        onRightActionPress={() => setModalVisible(true)}
      />

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={THEME.colors.clay} />
          <Text style={styles.loadingText}>Loading family members...</Text>
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
                fetchMembers();
              }}
              colors={[THEME.colors.clay]}
              tintColor={THEME.colors.clay}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIcon name="users" size={42} color={THEME.colors.sand} />
              <Text style={styles.emptyTitle}>No Family Members Added</Text>
              <Text style={styles.emptySubtitle}>Tap + in the header to register family members.</Text>
            </View>
          }
        />
      )}

      {/* Add Member Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <CustomIcon name="close" size={20} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Priya Sharma"
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
              <Text style={styles.inputLabel}>RELATIONSHIP</Text>
              <View style={styles.relationTabs}>
                {['Spouse', 'Child', 'Parent', 'Sibling'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    onPress={() => setRelationship(rel)}
                    style={[styles.relChip, relationship === rel && styles.relChipActive]}
                  >
                    <Text style={[styles.relChipText, relationship === rel && styles.relChipTextActive]}>
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <PrimaryButton
              title="Save Member"
              onPress={handleAddMember}
              loading={saving}
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
    backgroundColor: 'rgba(196, 154, 108, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.clayDark,
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
  relBadge: {
    backgroundColor: THEME.colors.sandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  relText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  emergencyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  emergencyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
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
  relationTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.sandLight,
  },
  relChipActive: {
    backgroundColor: THEME.colors.clay,
  },
  relChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  relChipTextActive: {
    color: THEME.colors.white,
  },
});
