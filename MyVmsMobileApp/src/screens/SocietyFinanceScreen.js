import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { useAuthStore } from '../store/authStore';

export const SocietyFinanceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const userRole = String(user?.role || '').toUpperCase();
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

  // Cards based on role:
  // Admin only: "Account Overview"
  // All users (including owner, family member, resident): "Maintenance" and "Special Charges"
  const allCards = [
    {
      id: 'account_overview',
      title: 'Account Overview',
      adminOnly: true,
      onPress: () => navigation.navigate('AccountOverview'),
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      adminOnly: false,
      onPress: () => navigation.navigate('MaintenanceBilling'),
    },
    {
      id: 'special_charges',
      title: 'Special Charges',
      adminOnly: false,
      onPress: () => navigation.navigate('SpecialCharges'),
    },
  ];

  const financeCards = allCards.filter((card) => !card.adminOnly || isAdmin);

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
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Society Finance</Text>
            <Text style={styles.headerSubtitle}>Financial Management</Text>
          </View>
        </View>
      </View>

      {/* Main Body: ONLY THE THREE CARDS (Inside each card: ONLY title and right arrow) */}
      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsContainer}>
          {financeCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.financeCard}
              activeOpacity={0.75}
              onPress={card.onPress}
            >
              <Text style={styles.cardTitle}>{card.title}</Text>
              <ChevronRight size={22} color={THEME.colors.clay} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...THEME.shadows.float,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  scrollBody: {
    padding: 16,
    paddingTop: 20,
  },
  cardsContainer: {
    gap: 14,
  },
  financeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(196, 154, 108, 0.3)',
    ...THEME.shadows.card,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    letterSpacing: -0.2,
  },
});
