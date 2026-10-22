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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { useAuthStore } from '../store/authStore';
import { familyMemberApi } from '../services/apiServices';
import {
  Users,
  Plus,
  Phone,
  Pencil,
  Trash,
  X,
  Heart,
  Crown,
  KeyRound,
  ShieldCheck,
  BadgeCheck,
  Check,
} from 'lucide-react-native';

const RELATIONSHIP_OPTIONS = [
  'Son',
  'Daughter',
  'Spouse',
  'Mother',
  'Father',
  'Sister',
  'Brother',
  'Other',
];

export const FamilyMembersScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'TENANT';

  const [members, setMembers] = useState([]);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [homeInfo, setHomeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Member Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addRelationship, setAddRelationship] = useState('Daughter');
  const [addPassword, setAddPassword] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit Member Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRelationship, setEditRelationship] = useState('Daughter');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await familyMemberApi.getFamilyMembers();
      const list = res.data?.familyMembers || (Array.isArray(res.data) ? res.data : []);
      setMembers(Array.isArray(list) ? list : []);

      if (res.data?.owner) {
        setOwnerInfo(res.data.owner);
      } else if (user?.role === 'OWNER') {
        setOwnerInfo({
          full_name: user.fullName || user.full_name || 'Home Owner',
          phone: user.phone || 'Primary Contact',
          home_number: user.flatNumber || user.unitNumber || '1',
          building_or_wing: user.blockOrTower || user.wing || 'Wing A',
          society_name: user.societyName || 'Residential Society',
        });
      }

      if (res.data?.home) {
        setHomeInfo(res.data.home);
      }
    } catch (err) {
      console.log('Error fetching family members:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenAddModal = () => {
    setAddName('');
    setAddPhone('');
    setAddRelationship('Daughter');
    setAddPassword('');
    setAddModalVisible(true);
  };

  const handleAddMember = async () => {
    if (!addName.trim() || !addPhone.trim()) {
      Alert.alert('Validation Error', 'Please enter full name and phone number.');
      return;
    }
    if (!addPassword || addPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setAdding(true);
    try {
      await familyMemberApi.createFamilyMember({
        full_name: addName.trim(),
        phone: addPhone.trim(),
        relationship: addRelationship,
        password: addPassword,
        status: 'ACTIVE',
      });
      Alert.alert('Success', `Family member "${addName.trim()}" registered successfully!`);
      setAddModalVisible(false);
      fetchMembers();
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Could not register family member.');
    } finally {
      setAdding(false);
    }
  };

  const handleOpenEditModal = (member) => {
    setSelectedMember(member);
    setEditName(member.full_name || '');
    setEditPhone(member.phone || '');
    setEditRelationship(member.relationship || 'Daughter');
    setEditStatus(member.status || 'ACTIVE');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      Alert.alert('Validation Error', 'Please enter full name and phone number.');
      return;
    }

    setSaving(true);
    try {
      await familyMemberApi.updateFamilyMember(selectedMember.id, {
        full_name: editName.trim(),
        name: editName.trim(),
        phone: editPhone.trim(),
        relationship: editRelationship,
        status: editStatus,
      });
      Alert.alert('Success', 'Family member details updated successfully!');
      setEditModalVisible(false);
      fetchMembers();
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Could not update family member details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = (id, memberName) => {
    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove family member "${memberName}"? They will lose mobile app access to this home.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await familyMemberApi.deleteFamilyMember(id);
              Alert.alert('Removed', `Family member "${memberName}" has been removed.`);
              fetchMembers();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to remove family member.');
            }
          },
        },
      ]
    );
  };

  const getRelationshipColor = (rel) => {
    const r = (rel || '').toLowerCase();
    if (r.includes('daughter') || r.includes('sister')) {
      return { bg: 'rgba(236, 72, 153, 0.12)', border: '#F472B6', text: '#BE185D', avatarBg: '#EC4899' };
    }
    if (r.includes('son') || r.includes('brother')) {
      return { bg: 'rgba(139, 92, 246, 0.12)', border: '#A78BFA', text: '#6D28D9', avatarBg: '#8B5CF6' };
    }
    if (r.includes('spouse') || r.includes('wife') || r.includes('husband')) {
      return { bg: 'rgba(244, 63, 94, 0.12)', border: '#FB7185', text: '#BE123C', avatarBg: '#F43F5E' };
    }
    if (r.includes('mother') || r.includes('father') || r.includes('parent')) {
      return { bg: 'rgba(5, 150, 105, 0.12)', border: '#34D399', text: '#047857', avatarBg: '#059669' };
    }
    return { bg: 'rgba(2, 132, 199, 0.12)', border: '#38BDF8', text: '#0369A1', avatarBg: '#0284C7' };
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Owner / Head Resident Card */}
      {ownerInfo && (
        <View style={styles.ownerCard}>
          <View style={styles.ownerCardHeader}>
            <View style={styles.ownerAvatar}>
              <Crown size={22} color="#FFFFFF" />
            </View>
            <View style={styles.ownerInfoCol}>
              <View style={styles.ownerNameRow}>
                <Text style={styles.ownerName} numberOfLines={1}>
                  {ownerInfo.full_name}
                </Text>
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>OWNER</Text>
                </View>
              </View>
              <Text style={styles.ownerLocation}>
                Flat {ownerInfo.home_number || '1'} • {ownerInfo.building_or_wing || 'Wing A'}
              </Text>
            </View>
          </View>

          <View style={styles.ownerDivider} />

          <View style={styles.ownerMetaRow}>
            <View style={styles.metaItem}>
              <Phone size={13} color="#059669" />
              <Text style={styles.metaText}>{ownerInfo.phone || 'Primary Contact'}</Text>
            </View>
            <View style={styles.metaItem}>
              <BadgeCheck size={13} color="#C49A6C" />
              <Text style={styles.metaText}>Primary Account Holder</Text>
            </View>
          </View>
        </View>
      )}

      {/* Section Title */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleLeft}>
          <Text style={styles.sectionTitle}>Household Profiles & Access</Text>
        </View>

        {isOwner && (
          <TouchableOpacity
            style={styles.addMemberBtn}
            onPress={handleOpenAddModal}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text style={styles.addMemberBtnText}>Add Member</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderMemberCard = ({ item }) => {
    const theme = getRelationshipColor(item.relationship);
    const initial = (item.full_name || 'F').charAt(0).toUpperCase();

    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          {/* Square Avatar with relationship styling */}
          <View style={[styles.avatarBox, { backgroundColor: theme.avatarBg }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>

          <View style={styles.memberInfoCol}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName} numberOfLines={1}>
                {item.full_name}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)' },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: item.status === 'ACTIVE' ? '#10B981' : '#EF4444' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: item.status === 'ACTIVE' ? '#047857' : '#DC2626' },
                  ]}
                >
                  {item.status || 'ACTIVE'}
                </Text>
              </View>
            </View>

            {/* Relationship Chip with Heart icon */}
            <View style={[styles.relChip, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Heart size={11} color={theme.text} />
              <Text style={[styles.relChipText, { color: theme.text }]}>
                Family Member ({item.relationship || 'Resident'})
              </Text>
            </View>
          </View>
        </View>

        {/* Member Details */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Phone size={13} color="#059669" />
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Phone: </Text>
              {item.phone || 'No phone registered'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <KeyRound size={13} color="#EC4899" />
            <Text style={[styles.detailText, { color: '#2563EB', fontWeight: '700' }]}>
              Independent App Login Active
            </Text>
          </View>
        </View>

        {/* Action Row: EDIT and DELETE icons / buttons for OWNER */}
        {isOwner && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleOpenEditModal(item)}
              activeOpacity={0.8}
            >
              <Pencil size={14} color="#2563EB" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteMember(item.id, item.full_name)}
              activeOpacity={0.8}
            >
              <Trash size={14} color="#DC2626" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Family Members"
        subtitle="Registered household residents"
        showBack
        rightActionIcon={isOwner ? 'plus' : null}
        onRightActionPress={isOwner ? handleOpenAddModal : null}
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
          renderItem={renderMemberCard}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
              <View style={styles.emptyIconCircle}>
                <Users size={36} color={THEME.colors.clay} />
              </View>
              <Text style={styles.emptyTitle}>No Family Members Added</Text>
              <Text style={styles.emptySubtitle}>
                {isOwner
                  ? 'Tap "Add" or the + icon in the header to register family members.'
                  : 'No family members are currently registered for this home.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ========================================================
          EDIT FAMILY MEMBER MODAL
          ======================================================== */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Family Member</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedMember?.full_name ? `Updating ${selectedMember.full_name}` : 'Update member profile'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  placeholderTextColor={THEME.colors.textDim}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>LOGIN PHONE NUMBER *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={THEME.colors.textDim}
                  keyboardType="phone-pad"
                  value={editPhone}
                  onChangeText={setEditPhone}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RELATIONSHIP</Text>
                <View style={styles.chipRow}>
                  {RELATIONSHIP_OPTIONS.map((rel) => {
                    const active = editRelationship === rel;
                    return (
                      <TouchableOpacity
                        key={rel}
                        onPress={() => setEditRelationship(rel)}
                        style={[styles.selectChip, active && styles.selectChipActive]}
                      >
                        <Text style={[styles.selectChipText, active && styles.selectChipTextActive]}>
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ACCOUNT STATUS</Text>
                <View style={styles.statusChipRow}>
                  {['ACTIVE', 'INACTIVE'].map((st) => {
                    const active = editStatus === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setEditStatus(st)}
                        style={[
                          styles.statusToggleChip,
                          active && (st === 'ACTIVE' ? styles.statusActiveChip : styles.statusInactiveChip),
                        ]}
                      >
                        {active && <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />}
                        <Text
                          style={[
                            styles.statusToggleText,
                            active && styles.statusToggleTextActive,
                          ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================
          ADD FAMILY MEMBER MODAL
          ======================================================== */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Family Member</Text>
                <Text style={styles.modalSubtitle}>Register household resident with mobile access</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={18} color={THEME.colors.darkBrown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Priya Sharma"
                  placeholderTextColor={THEME.colors.textDim}
                  value={addName}
                  onChangeText={setAddName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PHONE NUMBER (LOGIN ID) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={THEME.colors.textDim}
                  keyboardType="phone-pad"
                  value={addPhone}
                  onChangeText={setAddPhone}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>LOGIN PASSWORD * (MIN 6 CHARS)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter login password"
                  placeholderTextColor={THEME.colors.textDim}
                  secureTextEntry
                  value={addPassword}
                  onChangeText={setAddPassword}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>RELATIONSHIP</Text>
                <View style={styles.chipRow}>
                  {RELATIONSHIP_OPTIONS.map((rel) => {
                    const active = addRelationship === rel;
                    return (
                      <TouchableOpacity
                        key={rel}
                        onPress={() => setAddRelationship(rel)}
                        style={[styles.selectChip, active && styles.selectChipActive]}
                      >
                        <Text style={[styles.selectChipText, active && styles.selectChipTextActive]}>
                          {rel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddMember}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Register Member</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  listHeader: {
    marginBottom: 16,
  },

  // Owner Card (Gold / Amber / Clay Theme matching frontend)
  ownerCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.colors.clay,
    padding: 18,
    marginBottom: 20,
    ...THEME.shadows.card,
  },
  ownerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  ownerInfoCol: {
    flex: 1,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    flexShrink: 1,
  },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
  },
  ownerLocation: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  ownerDivider: {
    height: 1,
    backgroundColor: 'rgba(196, 154, 108, 0.25)',
    marginVertical: 12,
  },
  ownerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberCountBadge: {
    backgroundColor: 'rgba(196, 154, 108, 0.18)',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  memberCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    ...THEME.shadows.sm,
  },
  addMemberBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Family Member Card (Pink & Blue Theme matching frontend)
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...THEME.shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  memberInfoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  relChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  relChipText: {
    fontSize: 11,
    fontWeight: '800',
  },

  detailsRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  detailText: {
    fontSize: 12,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },

  // Action Buttons Row: EDIT and DELETE
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: THEME.radius.md,
    paddingVertical: 9,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: THEME.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
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
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.sandWell,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    marginTop: 4,
    lineHeight: 18,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.sandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  input: {
    height: 48,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    fontSize: 14,
    color: THEME.colors.darkBrown,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.sandLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectChipActive: {
    backgroundColor: THEME.colors.clay,
    borderColor: THEME.colors.clayDark,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  selectChipTextActive: {
    color: '#FFFFFF',
  },
  statusChipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusToggleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.sandLight,
  },
  statusActiveChip: {
    backgroundColor: '#059669',
  },
  statusInactiveChip: {
    backgroundColor: '#DC2626',
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  statusToggleTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.white,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadows.sm,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
