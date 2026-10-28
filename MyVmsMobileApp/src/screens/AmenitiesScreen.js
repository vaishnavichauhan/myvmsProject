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
  Sparkles,
  CalendarCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  MapPin,
  RefreshCw,
  Building2,
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Info,
  Shield,
  CreditCard,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { amenityApi, societyApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const AMENITY_CATEGORIES = [
  'ALL',
  'Clubhouse',
  'Community Hall',
  'Gym',
  'Swimming Pool',
  'Sports Court',
  'Garden',
  'Party Lawn',
  'Indoor Games Room',
  'Other',
];

export const BOOKING_STATUSES = [
  'ALL',
  'PENDING_APPROVAL',
  'APPROVED',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
];

export const AmenitiesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'COMMITTEE_MEMBER';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('amenities'); // 'amenities' | 'bookings'

  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');

  // Modals state
  const [isAmenityModalOpen, setIsAmenityModalOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [amenityFormSubmitting, setAmenityFormSubmitting] = useState(false);
  const [amenityFormData, setAmenityFormData] = useState({
    name: '',
    category: 'Clubhouse',
    description: '',
    location_or_building: '',
    max_capacity: '50',
    access_type: 'PAID', // 'FREE' | 'PAID'
    booking_fee: '500',
    security_deposit: '1000',
    opening_time: '06:00',
    closing_time: '22:00',
    status: 'ACTIVE',
  });

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedAmenityForBooking, setSelectedAmenityForBooking] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    amenity_id: '',
    booking_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '14:00',
    purpose: '',
    expected_guests: '10',
    additional_notes: '',
  });

  // Detail Modal State
  const [viewingBooking, setViewingBooking] = useState(null);
  const [viewingAmenity, setViewingAmenity] = useState(null);

  // Reject / Cancel Reason Modal
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [actionType, setActionType] = useState('REJECT'); // 'REJECT' | 'CANCEL'
  const [targetBookingId, setTargetBookingId] = useState(null);
  const [reasonText, setReasonText] = useState('');
  const [reasonSubmitting, setReasonSubmitting] = useState(false);

  useEffect(() => {
    fetchAmenitiesData();
  }, []);

  const fetchAmenitiesData = async () => {
    try {
      const [amenitiesRes, bookingsRes] = await Promise.all([
        amenityApi.getAmenities().catch(() => null),
        amenityApi.getBookings().catch(() => null),
      ]);

      const rawAmenities =
        amenitiesRes?.data?.amenities ||
        amenitiesRes?.data?.data ||
        amenitiesRes?.data ||
        amenitiesRes?.amenities ||
        [];
      setAmenities(Array.isArray(rawAmenities) ? rawAmenities : []);

      const rawBookings =
        bookingsRes?.data?.bookings ||
        bookingsRes?.data?.data ||
        bookingsRes?.data ||
        bookingsRes?.bookings ||
        [];
      setBookings(Array.isArray(rawBookings) ? rawBookings : []);
    } catch (err) {
      console.log('Error fetching amenities:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filtered Amenities
  const filteredAmenities = useMemo(() => {
    return amenities.filter((item) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        (item.category && item.category.toUpperCase() === selectedCategory.toUpperCase());
      const matchSearch =
        !searchQuery.trim() ||
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.location_or_building && item.location_or_building.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [amenities, selectedCategory, searchQuery]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((item) => {
      const statusUpper = (item.status || '').toUpperCase();
      let matchStatus = true;
      if (bookingStatusFilter !== 'ALL') {
        if (bookingStatusFilter === 'PENDING_APPROVAL') {
          matchStatus = statusUpper === 'PENDING' || statusUpper === 'PENDING_APPROVAL';
        } else {
          matchStatus = statusUpper === bookingStatusFilter;
        }
      }
      const matchSearch =
        !searchQuery.trim() ||
        (item.amenity_name && item.amenity_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.resident_name && item.resident_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.user_name && item.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.home_number && String(item.home_number).toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.purpose && item.purpose.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [bookings, bookingStatusFilter, searchQuery]);

  // Handle Open Create / Edit Amenity Modal
  const handleOpenAmenityModal = (amenity = null) => {
    if (amenity) {
      setEditingAmenity(amenity);
      setAmenityFormData({
        name: amenity.name || '',
        category: amenity.category || 'Clubhouse',
        description: amenity.description || '',
        location_or_building: amenity.location_or_building || '',
        max_capacity: String(amenity.max_capacity || amenity.capacity || '50'),
        access_type: amenity.access_type || (amenity.fee > 0 ? 'PAID' : 'FREE'),
        booking_fee: String(amenity.booking_fee || amenity.fee || '0'),
        security_deposit: String(amenity.security_deposit || '0'),
        opening_time: amenity.opening_time || amenity.open_time || '06:00',
        closing_time: amenity.closing_time || amenity.close_time || '22:00',
        status: amenity.status || 'ACTIVE',
      });
    } else {
      setEditingAmenity(null);
      setAmenityFormData({
        name: '',
        category: 'Clubhouse',
        description: '',
        location_or_building: '',
        max_capacity: '50',
        access_type: 'PAID',
        booking_fee: '500',
        security_deposit: '1000',
        opening_time: '06:00',
        closing_time: '22:00',
        status: 'ACTIVE',
      });
    }
    setIsAmenityModalOpen(true);
  };

  // Submit Amenity Form
  const handleSubmitAmenity = async () => {
    if (!amenityFormData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter a facility name.');
      return;
    }
    try {
      setAmenityFormSubmitting(true);
      const payload = {
        name: amenityFormData.name.trim(),
        category: amenityFormData.category,
        description: amenityFormData.description.trim(),
        location_or_building: amenityFormData.location_or_building.trim(),
        max_capacity: Number(amenityFormData.max_capacity) || 50,
        access_type: amenityFormData.access_type,
        booking_fee: amenityFormData.access_type === 'FREE' ? 0 : Number(amenityFormData.booking_fee) || 0,
        security_deposit: Number(amenityFormData.security_deposit) || 0,
        opening_time: amenityFormData.opening_time || '06:00',
        closing_time: amenityFormData.closing_time || '22:00',
        status: amenityFormData.status,
      };

      if (editingAmenity) {
        await amenityApi.updateAmenity(editingAmenity.id, payload);
        Alert.alert('Success', 'Facility updated successfully.');
      } else {
        await amenityApi.createAmenity(payload);
        Alert.alert('Success', 'New facility created successfully.');
      }
      setIsAmenityModalOpen(false);
      fetchAmenitiesData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to save amenity.');
    } finally {
      setAmenityFormSubmitting(false);
    }
  };

  // Delete Amenity
  const handleDeleteAmenity = (amenity) => {
    Alert.alert(
      'Delete Facility',
      `Are you sure you want to remove "${amenity.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await amenityApi.deleteAmenity(amenity.id);
              Alert.alert('Deleted', 'Facility removed.');
              fetchAmenitiesData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete facility.');
            }
          },
        },
      ]
    );
  };

  // Open Booking Modal for an Amenity
  const handleOpenBookingModal = (amenity) => {
    setSelectedAmenityForBooking(amenity);
    setBookingFormData({
      amenity_id: amenity.id,
      booking_date: new Date().toISOString().split('T')[0],
      start_time: amenity.opening_time || amenity.open_time || '10:00',
      end_time: '14:00',
      purpose: '',
      expected_guests: '10',
      additional_notes: '',
    });
    setIsBookingModalOpen(true);
  };

  // Submit Booking Request
  const handleSubmitBooking = async () => {
    if (!bookingFormData.purpose.trim()) {
      Alert.alert('Validation Error', 'Please enter the purpose of this reservation.');
      return;
    }
    try {
      setBookingSubmitting(true);
      const payload = {
        amenity_id: selectedAmenityForBooking.id,
        booking_date: bookingFormData.booking_date,
        start_time: bookingFormData.start_time,
        end_time: bookingFormData.end_time,
        purpose: bookingFormData.purpose.trim(),
        expected_guests: Number(bookingFormData.expected_guests) || 1,
        additional_notes: bookingFormData.additional_notes.trim(),
      };

      await amenityApi.createBooking(payload);
      Alert.alert('Success', 'Booking request submitted successfully.');
      setIsBookingModalOpen(false);
      fetchAmenitiesData();
      setActiveTab('bookings');
    } catch (err) {
      Alert.alert('Booking Error', err.response?.data?.message || err.message || 'Failed to submit booking.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Quick Approve Booking
  const handleApproveBooking = (bookingId) => {
    Alert.alert(
      'Approve Booking',
      'Are you sure you want to approve this reservation request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await amenityApi.approveBooking(bookingId);
              Alert.alert('Approved', 'Booking has been approved.');
              fetchAmenitiesData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || err.message || 'Approval failed.');
            }
          },
        },
      ]
    );
  };

  // Open Reject / Cancel Reason Modal
  const handleOpenReasonModal = (bookingId, type) => {
    setTargetBookingId(bookingId);
    setActionType(type);
    setReasonText('');
    setReasonModalVisible(true);
  };

  // Submit Reject / Cancel
  const handleSubmitReason = async () => {
    if (!reasonText.trim()) {
      Alert.alert('Reason Required', `Please provide a reason for ${actionType === 'REJECT' ? 'rejection' : 'cancellation'}.`);
      return;
    }
    try {
      setReasonSubmitting(true);
      if (actionType === 'REJECT') {
        await amenityApi.rejectBooking(targetBookingId, reasonText.trim());
        Alert.alert('Rejected', 'Booking has been rejected.');
      } else {
        await amenityApi.cancelBooking(targetBookingId, reasonText.trim());
        Alert.alert('Cancelled', 'Booking has been cancelled.');
      }
      setReasonModalVisible(false);
      fetchAmenitiesData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Action failed.');
    } finally {
      setReasonSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#342C26" />

      {/* Header */}
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
            <Text style={styles.headerTitle}>Amenities & Bookings</Text>
            <Text style={styles.headerSubtitle}>Clubhouse, Sports, Lawn & Gym</Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => {
                setRefreshing(true);
                fetchAmenitiesData();
              }}
              style={styles.headerIconBtn}
            >
              <RefreshCw size={17} color="#FFFFFF" />
            </TouchableOpacity>

            {isAdmin && activeTab === 'amenities' && (
              <TouchableOpacity
                onPress={() => handleOpenAmenityModal(null)}
                style={styles.headerAddBtn}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.headerAddBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'amenities' && styles.tabItemActive]}
            onPress={() => setActiveTab('amenities')}
          >
            <Sparkles size={15} color={activeTab === 'amenities' ? THEME.colors.clay : THEME.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'amenities' && styles.tabTextActive]}>
              Facilities ({amenities.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'bookings' && styles.tabItemActive]}
            onPress={() => setActiveTab('bookings')}
          >
            <CalendarCheck2 size={15} color={activeTab === 'bookings' ? THEME.colors.clay : THEME.colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
              Bookings ({bookings.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={16} color={THEME.colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder={
              activeTab === 'amenities'
                ? 'Search facility name or location...'
                : 'Search resident, unit # or amenity...'
            }
            placeholderTextColor={THEME.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Filter Pills */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsScroll}>
          {activeTab === 'amenities'
            ? AMENITY_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                  >
                    <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })
            : BOOKING_STATUSES.map((st) => {
                const active = bookingStatusFilter === st;
                return (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setBookingStatusFilter(st)}
                    style={[styles.filterPill, active && styles.filterPillActive]}
                  >
                    <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                      {st.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
        </ScrollView>
      </View>

      {/* Main Content Body */}
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAmenitiesData();
            }}
            tintColor={THEME.colors.clay}
            colors={[THEME.colors.clay]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading facilities & bookings...</Text>
          </View>
        ) : activeTab === 'amenities' ? (
          /* TAB 1: AMENITIES CATALOG */
          <View style={styles.listContainer}>
            {filteredAmenities.length === 0 ? (
              <View style={styles.emptyCard}>
                <Sparkles size={36} color={THEME.colors.textMuted} />
                <Text style={styles.emptyTitle}>No Facilities Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery || selectedCategory !== 'ALL'
                    ? 'No amenities match your search criteria.'
                    : 'Tap "+ Add" to create society amenities.'}
                </Text>
              </View>
            ) : (
              filteredAmenities.map((a) => {
                const isFree = a.access_type === 'FREE' || !a.booking_fee || Number(a.booking_fee || a.fee) === 0;
                const isActive = (a.status || 'ACTIVE').toUpperCase() === 'ACTIVE';

                return (
                  <View key={a.id || Math.random()} style={styles.amenityCard}>
                    {/* Header Row */}
                    <View style={styles.amenityCardTop}>
                      <View style={styles.amenityIconWrap}>
                        <Sparkles size={20} color={THEME.colors.clay} />
                      </View>

                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.amenityTitle}>{a.name}</Text>
                        </View>
                        <Text style={styles.amenityCategoryBadge}>{a.category || 'Recreation'}</Text>
                        {a.location_or_building ? (
                          <View style={styles.locationRow}>
                            <MapPin size={11} color={THEME.colors.textMuted} />
                            <Text style={styles.locationText}>{a.location_or_building}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            borderColor: isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: isActive ? '#10B981' : '#EF4444' },
                          ]}
                        >
                          {a.status || 'ACTIVE'}
                        </Text>
                      </View>
                    </View>

                    {/* Description */}
                    {a.description ? (
                      <Text style={styles.amenityDesc} numberOfLines={2}>
                        {a.description}
                      </Text>
                    ) : null}

                    {/* Highlights Row */}
                    <View style={styles.amenityDetailsRow}>
                      <View style={styles.amenityDetailItem}>
                        <Clock size={12} color={THEME.colors.textMuted} />
                        <Text style={styles.amenityDetailText}>
                          {a.opening_time || a.open_time || '06:00'} - {a.closing_time || a.close_time || '22:00'}
                        </Text>
                      </View>

                      <View style={styles.amenityDetailItem}>
                        <Users size={12} color={THEME.colors.textMuted} />
                        <Text style={styles.amenityDetailText}>
                          {a.max_capacity || a.capacity ? `Max ${a.max_capacity || a.capacity}` : 'Standard'}
                        </Text>
                      </View>

                      <View style={styles.amenityDetailItem}>
                        <Tag size={12} color={isFree ? '#10B981' : THEME.colors.clay} />
                        <Text
                          style={[
                            styles.amenityDetailText,
                            { color: isFree ? '#10B981' : THEME.colors.clay, fontWeight: '800' },
                          ]}
                        >
                          {isFree ? 'Free Access' : `₹${Number(a.booking_fee || a.fee).toLocaleString()}`}
                        </Text>
                      </View>
                    </View>

                    {/* Actions Row */}
                    <View style={styles.amenityCardActions}>
                      <TouchableOpacity
                        onPress={() => handleOpenBookingModal(a)}
                        style={styles.bookFacilityBtn}
                      >
                        <CalendarCheck2 size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.bookFacilityBtnText}>Book Facility</Text>
                      </TouchableOpacity>

                      {isAdmin && (
                        <View style={styles.adminActionIcons}>
                          <TouchableOpacity
                            onPress={() => handleOpenAmenityModal(a)}
                            style={styles.iconActionBtn}
                          >
                            <Edit2 size={15} color={THEME.colors.clay} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDeleteAmenity(a)}
                            style={[styles.iconActionBtn, { borderColor: 'rgba(239, 68, 68, 0.25)' }]}
                          >
                            <Trash2 size={15} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* TAB 2: BOOKINGS LIST */
          <View style={styles.listContainer}>
            {filteredBookings.length === 0 ? (
              <View style={styles.emptyCard}>
                <CalendarCheck2 size={36} color={THEME.colors.textMuted} />
                <Text style={styles.emptyTitle}>No Reservations Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery || bookingStatusFilter !== 'ALL'
                    ? 'No bookings match your current filter.'
                    : 'Facility reservations by residents will appear here.'}
                </Text>
              </View>
            ) : (
              filteredBookings.map((b) => {
                const status = (b.status || 'PENDING').toUpperCase();
                const isConfirmed = status === 'CONFIRMED' || status === 'APPROVED';
                const isPending = status === 'PENDING' || status === 'PENDING_APPROVAL';
                const isRejected = status === 'REJECTED' || status === 'CANCELLED';

                const statusColor = isConfirmed ? '#10B981' : isPending ? '#D97706' : '#EF4444';
                const statusBg = isConfirmed
                  ? 'rgba(16, 185, 129, 0.12)'
                  : isPending
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)';
                const statusBorder = isConfirmed
                  ? 'rgba(16, 185, 129, 0.3)'
                  : isPending
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)';

                return (
                  <TouchableOpacity
                    key={b.id || Math.random()}
                    activeOpacity={0.88}
                    onPress={() => setViewingBooking(b)}
                    style={styles.bookingCard}
                  >
                    <View style={styles.bookingCardHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.bookingAmenityName}>
                          {b.amenity_name || 'Clubhouse / Facility'}
                        </Text>
                        <Text style={styles.bookingResident}>
                          {b.resident_name || b.user_name || 'Resident'}
                          {b.home_number ? ` • Unit ${b.home_number}` : ''}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor: statusBg,
                            borderColor: statusBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.statusPillText, { color: statusColor }]}>
                          {status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    {b.purpose ? (
                      <View style={styles.purposeBox}>
                        <Text style={styles.purposeLabel}>Purpose:</Text>
                        <Text style={styles.purposeText} numberOfLines={1}>
                          {b.purpose}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.bookingInfoRow}>
                      <View>
                        <Text style={styles.bookingMetaLabel}>Date</Text>
                        <Text style={styles.bookingMetaVal}>
                          {b.booking_date ? String(b.booking_date).split('T')[0] : 'Upcoming'}
                        </Text>
                      </View>

                      <View>
                        <Text style={styles.bookingMetaLabel}>Time Slot</Text>
                        <Text style={styles.bookingMetaVal}>
                          {b.start_time && b.end_time
                            ? `${b.start_time} - ${b.end_time}`
                            : b.slot_start && b.slot_end
                            ? `${b.slot_start} - ${b.slot_end}`
                            : 'Standard'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.bookingMetaLabel}>Total Fee</Text>
                        <Text style={[styles.bookingMetaVal, { color: THEME.colors.clay, fontWeight: '800' }]}>
                          ₹{Number(b.total_amount || b.amount || b.booking_fee || 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Admin Action Buttons if Pending */}
                    {isPending && isAdmin && (
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          onPress={() => handleApproveBooking(b.id)}
                          style={styles.approveBtn}
                        >
                          <CheckCircle2 size={14} color="#10B981" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleOpenReasonModal(b.id, 'REJECT')}
                          style={styles.rejectBtn}
                        >
                          <XCircle size={14} color="#EF4444" />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Cancel option for Confirmed/Approved */}
                    {isConfirmed && isAdmin && (
                      <View style={[styles.actionButtonsRow, { justifyContent: 'flex-end' }]}>
                        <TouchableOpacity
                          onPress={() => handleOpenReasonModal(b.id, 'CANCEL')}
                          style={[styles.rejectBtn, { flex: 0, paddingHorizontal: 16 }]}
                        >
                          <XCircle size={13} color="#EF4444" />
                          <Text style={styles.rejectBtnText}>Cancel Booking</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: ADD / EDIT AMENITY */}
      <Modal
        visible={isAmenityModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAmenityModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setIsAmenityModalOpen(false)}
          />
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { maxHeight: '88%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingAmenity ? 'Edit Facility' : 'Create Society Facility'}
                </Text>
                <Text style={styles.modalSub}>Clubhouse, Gym, Sports or Event Space</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAmenityModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Name */}
              <Text style={styles.inputLabel}>Facility Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Grand Banquet Hall & Lawn"
                placeholderTextColor={THEME.colors.textMuted}
                value={amenityFormData.name}
                onChangeText={(val) => setAmenityFormData({ ...amenityFormData, name: val })}
              />

              {/* Category Picker */}
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {AMENITY_CATEGORIES.filter((c) => c !== 'ALL').map((cat) => {
                  const isSel = amenityFormData.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setAmenityFormData({ ...amenityFormData, category: cat })}
                      style={[styles.catPickBtn, isSel && styles.catPickBtnActive]}
                    >
                      <Text style={[styles.catPickBtnText, isSel && styles.catPickBtnTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Location */}
              <Text style={styles.inputLabel}>Location / Landmark</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Block B, Ground Floor"
                placeholderTextColor={THEME.colors.textMuted}
                value={amenityFormData.location_or_building}
                onChangeText={(val) => setAmenityFormData({ ...amenityFormData, location_or_building: val })}
              />

              {/* Capacity & Access Type */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Max Capacity</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="number-pad"
                    placeholder="e.g. 50"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={amenityFormData.max_capacity}
                    onChangeText={(val) => setAmenityFormData({ ...amenityFormData, max_capacity: val })}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Access Type</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      onPress={() => setAmenityFormData({ ...amenityFormData, access_type: 'PAID' })}
                      style={[
                        styles.toggleBtn,
                        amenityFormData.access_type === 'PAID' && styles.toggleBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleBtnText,
                          amenityFormData.access_type === 'PAID' && styles.toggleBtnTextActive,
                        ]}
                      >
                        Paid
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setAmenityFormData({ ...amenityFormData, access_type: 'FREE' })}
                      style={[
                        styles.toggleBtn,
                        amenityFormData.access_type === 'FREE' && styles.toggleBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.toggleBtnText,
                          amenityFormData.access_type === 'FREE' && styles.toggleBtnTextActive,
                        ]}
                      >
                        Free
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Fee & Deposit */}
              {amenityFormData.access_type === 'PAID' && (
                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Booking Fee (₹)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={amenityFormData.booking_fee}
                      onChangeText={(val) => setAmenityFormData({ ...amenityFormData, booking_fee: val })}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.inputLabel}>Security Deposit (₹)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={amenityFormData.security_deposit}
                      onChangeText={(val) => setAmenityFormData({ ...amenityFormData, security_deposit: val })}
                    />
                  </View>
                </View>
              )}

              {/* Timings */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Opening Time</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="06:00"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={amenityFormData.opening_time}
                    onChangeText={(val) => setAmenityFormData({ ...amenityFormData, opening_time: val })}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Closing Time</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="22:00"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={amenityFormData.closing_time}
                    onChangeText={(val) => setAmenityFormData({ ...amenityFormData, closing_time: val })}
                  />
                </View>
              </View>

              {/* Description */}
              <Text style={styles.inputLabel}>Description / Rules</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                multiline
                placeholder="Guidelines, air-conditioning, cleanliness rules..."
                placeholderTextColor={THEME.colors.textMuted}
                value={amenityFormData.description}
                onChangeText={(val) => setAmenityFormData({ ...amenityFormData, description: val })}
              />

              {/* Status */}
              <Text style={styles.inputLabel}>Facility Status</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  onPress={() => setAmenityFormData({ ...amenityFormData, status: 'ACTIVE' })}
                  style={[styles.toggleBtn, amenityFormData.status === 'ACTIVE' && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, amenityFormData.status === 'ACTIVE' && styles.toggleBtnTextActive]}>
                    ACTIVE
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAmenityFormData({ ...amenityFormData, status: 'INACTIVE' })}
                  style={[styles.toggleBtn, amenityFormData.status === 'INACTIVE' && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, amenityFormData.status === 'INACTIVE' && styles.toggleBtnTextActive]}>
                    INACTIVE
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmitAmenity}
                disabled={amenityFormSubmitting}
                style={[styles.modalSubmitBtn, amenityFormSubmitting && { opacity: 0.6 }]}
              >
                {amenityFormSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {editingAmenity ? 'Save Facility Changes' : 'Create Facility'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL 2: BOOK FACILITY */}
      <Modal
        visible={isBookingModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsBookingModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setIsBookingModalOpen(false)}
          />
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { maxHeight: '86%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reserve Facility</Text>
                <Text style={styles.modalSub}>{selectedAmenityForBooking?.name || 'Society Amenity'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsBookingModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* Facility Preview Card */}
              {selectedAmenityForBooking && (
                <View style={styles.bookingPreviewCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.previewCardTitle}>{selectedAmenityForBooking.name}</Text>
                    <Text style={styles.previewCardFee}>
                      {selectedAmenityForBooking.booking_fee > 0
                        ? `₹${Number(selectedAmenityForBooking.booking_fee).toLocaleString()}`
                        : 'Free Access'}
                    </Text>
                  </View>
                  <Text style={styles.previewCardSub}>
                    Hours: {selectedAmenityForBooking.opening_time || '06:00'} -{' '}
                    {selectedAmenityForBooking.closing_time || '22:00'} • Deposit: ₹
                    {Number(selectedAmenityForBooking.security_deposit || 0).toLocaleString()}
                  </Text>
                </View>
              )}

              {/* Booking Date */}
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="2026-11-01"
                placeholderTextColor={THEME.colors.textMuted}
                value={bookingFormData.booking_date}
                onChangeText={(val) => setBookingFormData({ ...bookingFormData, booking_date: val })}
              />

              {/* Slot Timings */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Start Time *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10:00"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={bookingFormData.start_time}
                    onChangeText={(val) => setBookingFormData({ ...bookingFormData, start_time: val })}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>End Time *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="14:00"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={bookingFormData.end_time}
                    onChangeText={(val) => setBookingFormData({ ...bookingFormData, end_time: val })}
                  />
                </View>
              </View>

              {/* Purpose */}
              <Text style={styles.inputLabel}>Event Purpose / Occasion *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Birthday Party, Family Gathering, Society Yoga"
                placeholderTextColor={THEME.colors.textMuted}
                value={bookingFormData.purpose}
                onChangeText={(val) => setBookingFormData({ ...bookingFormData, purpose: val })}
              />

              {/* Expected Guests */}
              <Text style={styles.inputLabel}>Expected Number of Guests</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="number-pad"
                placeholder="10"
                placeholderTextColor={THEME.colors.textMuted}
                value={bookingFormData.expected_guests}
                onChangeText={(val) => setBookingFormData({ ...bookingFormData, expected_guests: val })}
              />

              {/* Additional Notes */}
              <Text style={styles.inputLabel}>Special Requests / Notes</Text>
              <TextInput
                style={[styles.textInput, { height: 65, textAlignVertical: 'top' }]}
                multiline
                placeholder="Catering setup, sound system, extra chairs..."
                placeholderTextColor={THEME.colors.textMuted}
                value={bookingFormData.additional_notes}
                onChangeText={(val) => setBookingFormData({ ...bookingFormData, additional_notes: val })}
              />

              {/* Fee Estimate Summary */}
              {selectedAmenityForBooking && (
                <View style={styles.estimateBox}>
                  <View style={styles.estimateRow}>
                    <Text style={styles.estimateLabel}>Facility Charge</Text>
                    <Text style={styles.estimateVal}>
                      ₹{Number(selectedAmenityForBooking.booking_fee || selectedAmenityForBooking.fee || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.estimateRow}>
                    <Text style={styles.estimateLabel}>Security Deposit (Refundable)</Text>
                    <Text style={styles.estimateVal}>
                      ₹{Number(selectedAmenityForBooking.security_deposit || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={[styles.estimateRow, { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', paddingTop: 6, marginTop: 4 }]}>
                    <Text style={[styles.estimateLabel, { fontWeight: '700', color: THEME.colors.text }]}>Total Payable</Text>
                    <Text style={[styles.estimateVal, { fontWeight: '800', color: THEME.colors.clay, fontSize: 16 }]}>
                      ₹{(Number(selectedAmenityForBooking.booking_fee || selectedAmenityForBooking.fee || 0) + Number(selectedAmenityForBooking.security_deposit || 0)).toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmitBooking}
                disabled={bookingSubmitting}
                style={[styles.modalSubmitBtn, bookingSubmitting && { opacity: 0.6 }]}
              >
                {bookingSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Confirm & Submit Reservation</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL 3: BOOKING DETAILS */}
      <Modal
        visible={!!viewingBooking}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setViewingBooking(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setViewingBooking(null)}
          />
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { maxHeight: '82%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Booking Information</Text>
                <Text style={styles.modalSub}>Reservation #{viewingBooking?.id}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setViewingBooking(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {viewingBooking && (
              <ScrollView contentContainerStyle={styles.modalScrollBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Facility</Text>
                  <Text style={styles.detailValue}>{viewingBooking.amenity_name || 'Amenity'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Resident</Text>
                  <Text style={styles.detailValue}>
                    {viewingBooking.resident_name || viewingBooking.user_name || 'Resident'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Home / Unit</Text>
                  <Text style={styles.detailValue}>Unit {viewingBooking.home_number || 'A-101'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {viewingBooking.booking_date ? String(viewingBooking.booking_date).split('T')[0] : '—'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Slot</Text>
                  <Text style={styles.detailValue}>
                    {viewingBooking.start_time && viewingBooking.end_time
                      ? `${viewingBooking.start_time} - ${viewingBooking.end_time}`
                      : 'Standard'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Purpose</Text>
                  <Text style={styles.detailValue}>{viewingBooking.purpose || 'Personal Event'}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Amount</Text>
                  <Text style={[styles.detailValue, { color: THEME.colors.clay, fontWeight: '800' }]}>
                    ₹{Number(viewingBooking.total_amount || viewingBooking.amount || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { fontWeight: '700' }]}>{viewingBooking.status}</Text>
                </View>

                {viewingBooking.rejection_reason ? (
                  <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <Text style={[styles.detailLabel, { color: '#EF4444' }]}>Rejection Reason:</Text>
                    <Text style={{ fontSize: 13, color: THEME.colors.text, marginTop: 4 }}>
                      {viewingBooking.rejection_reason}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={() => setViewingBooking(null)}
                  style={[styles.modalSubmitBtn, { marginTop: 18 }]}
                >
                  <Text style={styles.modalSubmitBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL 4: REJECT / CANCEL REASON MODAL */}
      <Modal
        visible={reasonModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setReasonModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setReasonModalVisible(false)}
          />
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {actionType === 'REJECT' ? 'Reject Reservation' : 'Cancel Reservation'}
                </Text>
                <Text style={styles.modalSub}>Provide reason to inform the resident</Text>
              </View>
              <TouchableOpacity
                onPress={() => setReasonModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalScrollBody}>
              <Text style={styles.inputLabel}>Reason *</Text>
              <TextInput
                style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                multiline
                placeholder="e.g. Facility under scheduled maintenance, slot clash, or rules violation..."
                placeholderTextColor={THEME.colors.textMuted}
                value={reasonText}
                onChangeText={setReasonText}
              />

              <TouchableOpacity
                onPress={handleSubmitReason}
                disabled={reasonSubmitting}
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: '#EF4444' },
                  reasonSubmitting && { opacity: 0.6 },
                ]}
              >
                {reasonSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    Confirm {actionType === 'REJECT' ? 'Rejection' : 'Cancellation'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
  header: {
    backgroundColor: '#342C26',
    paddingHorizontal: 16,
    paddingBottom: 14,
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
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  headerAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    ...THEME.shadows.card,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#342C26',
    fontWeight: '800',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(52, 44, 38, 0.08)',
    ...THEME.shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.text,
    paddingVertical: 0,
  },
  filterBar: {
    paddingVertical: 6,
  },
  filterPillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(52, 44, 38, 0.08)',
  },
  filterPillActive: {
    backgroundColor: '#342C26',
    borderColor: '#342C26',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 12,
    fontWeight: '500',
  },
  listContainer: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52, 44, 38, 0.06)',
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  amenityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 44, 38, 0.07)',
    ...THEME.shadows.card,
  },
  amenityCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  amenityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(196, 154, 108, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  amenityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: -0.2,
  },
  amenityCategoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.clay,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  locationText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  amenityDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 8,
    lineHeight: 17,
  },
  amenityDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  amenityDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amenityDetailText: {
    fontSize: 11,
    color: THEME.colors.text,
    fontWeight: '600',
  },
  amenityCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 44, 38, 0.06)',
  },
  bookFacilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.clay,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  bookFacilityBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  adminActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 44, 38, 0.07)',
    ...THEME.shadows.card,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bookingAmenityName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  bookingResident: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  purposeBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  purposeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginRight: 6,
  },
  purposeText: {
    fontSize: 12,
    color: THEME.colors.text,
    fontWeight: '600',
    flex: 1,
  },
  bookingInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 44, 38, 0.06)',
  },
  bookingMetaLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bookingMetaVal: {
    fontSize: 12,
    color: THEME.colors.text,
    fontWeight: '700',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(52, 44, 38, 0.06)',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    gap: 6,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    paddingBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: THEME.colors.text,
  },
  catPickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  catPickBtnActive: {
    backgroundColor: THEME.colors.clay,
  },
  catPickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  catPickBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    ...THEME.shadows.card,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  toggleBtnTextActive: {
    color: '#342C26',
    fontWeight: '800',
  },
  modalSubmitBtn: {
    backgroundColor: THEME.colors.clay,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    ...THEME.shadows.card,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bookingPreviewCard: {
    backgroundColor: 'rgba(196, 154, 108, 0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.25)',
  },
  previewCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  previewCardFee: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.clay,
  },
  previewCardSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  estimateBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  estimateLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  estimateVal: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  detailLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: THEME.colors.text,
    fontWeight: '700',
  },
});
