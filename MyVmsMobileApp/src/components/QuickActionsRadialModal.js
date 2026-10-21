import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';
import {
  Building2,
  Users,
  Briefcase,
  ShieldCheck,
  DoorOpen,
  Award,
  X,
  UserCheck,
  Package,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Animated Radial / Fan-out Quick Actions Menu
 * Inspired by modern radial floating navigation (Ali Celebi Pinterest style).
 * Displays 6 modules for ADMIN (Society, Resident, Workers, Security, Gates, Committee)
 * with the exact icons matching the frontend navigation reference.
 */
export const QuickActionsRadialModal = ({ visible, onClose, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isAdmin = user?.role === ROLES.ADMIN || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(animValue, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }).start();
    } else {
      animValue.setValue(0);
    }
  }, [visible]);

  const handleDismiss = (targetScreen) => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      if (targetScreen) {
        navigation.navigate(targetScreen);
      }
    });
  };

  // 6 Admin Quick Actions matching frontend icons exactly
  const adminActions = [
    {
      id: 'society',
      title: 'Society',
      icon: Building2,
      screen: 'Settings',
      color: '#C49A6C', // Clay Brown
    },
    {
      id: 'resident',
      title: 'Resident',
      icon: Users,
      screen: 'Residents',
      color: '#0284C7', // Sky Blue
    },
    {
      id: 'workers',
      title: 'Workers',
      icon: Briefcase,
      screen: 'Workers',
      color: '#D97706', // Amber
    },
    {
      id: 'security',
      title: 'Security',
      icon: ShieldCheck,
      screen: 'SecurityGate',
      color: '#10B981', // Emerald
    },
    {
      id: 'gates',
      title: 'Gates',
      icon: DoorOpen,
      screen: 'Gates',
      color: '#8B5CF6', // Purple
    },
    {
      id: 'committee',
      title: 'Committee',
      icon: Award,
      screen: 'Committee',
      color: '#F59E0B', // Gold
    },
  ];

  // Resident / Non-Admin Quick Actions
  const residentActions = [
    {
      id: 'visitors',
      title: 'Visitor Pass',
      icon: UserCheck,
      screen: 'Visitors',
      color: '#0284C7',
    },
    {
      id: 'courier',
      title: 'Deliveries',
      icon: Package,
      screen: 'CourierDelivery',
      color: '#10B981',
    },
    {
      id: 'family',
      title: 'Family',
      icon: Users,
      screen: 'FamilyMembers',
      color: '#C49A6C',
    },
    {
      id: 'workers',
      title: 'Workers',
      icon: Briefcase,
      screen: 'Workers',
      color: '#D97706',
    },
  ];

  const actions = isAdmin ? adminActions : residentActions;

  // Split into 2 tiers of 3 items for a balanced radial fan-out arc
  const topTier = actions.slice(0, 3);
  const bottomTier = actions.slice(3, 6);

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const contentScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  const contentTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const closeRotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => handleDismiss()}>
      <View style={styles.modalRoot}>
        {/* Semi-transparent dark blur backdrop */}
        <TouchableWithoutFeedback onPress={() => handleDismiss()}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Floating Radial Fan-out Container */}
        <Animated.View
          style={[
            styles.radialWrapper,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ scale: contentScale }, { translateY: contentTranslateY }],
              opacity: backdropOpacity,
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Header Title */}
          <View style={styles.headerInfo}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>
                {isAdmin ? 'ADMIN QUICK NAVIGATION' : 'QUICK SHORTCUTS'}
              </Text>
            </View>
            <Text style={styles.menuTitle}>Fast Actions</Text>
            <Text style={styles.menuSubtitle}>Tap any module to open instantly</Text>
          </View>

          {/* Radial Buttons Container (2-tier fan-out arc) */}
          <View style={styles.fanOutCluster}>
            {/* Tier 1: Top Arc (3 buttons) */}
            <View style={styles.tierRowTop}>
              {topTier.map((item) => (
                <View key={item.id} style={styles.actionItemContainer}>
                  <TouchableOpacity
                    onPress={() => handleDismiss(item.screen)}
                    style={[styles.circularButton, { borderColor: `${item.color}55` }]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconInnerCircle, { backgroundColor: `${item.color}15` }]}>
                      <item.icon size={25} color={item.color} />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.labelPill}>
                    <Text style={styles.labelPillText}>{item.title}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Tier 2: Lower Arc (3 buttons) */}
            {bottomTier.length > 0 && (
              <View style={styles.tierRowBottom}>
                {bottomTier.map((item) => (
                  <View key={item.id} style={styles.actionItemContainer}>
                    <TouchableOpacity
                      onPress={() => handleDismiss(item.screen)}
                      style={[styles.circularButton, { borderColor: `${item.color}55` }]}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.iconInnerCircle, { backgroundColor: `${item.color}15` }]}>
                        <item.icon size={25} color={item.color} />
                      </View>
                    </TouchableOpacity>
                    <View style={styles.labelPill}>
                      <Text style={styles.labelPillText}>{item.title}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Center Close Floating Action Button (replacing the + button) */}
            <View style={styles.closeBtnWrapper}>
              <TouchableOpacity
                onPress={() => handleDismiss()}
                activeOpacity={0.85}
                style={styles.closeButton}
              >
                <Animated.View style={{ transform: [{ rotate: closeRotate }] }}>
                  <X size={26} color="#FFFFFF" strokeWidth={2.8} />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22, 17, 14, 0.72)',
  },
  radialWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryPill: {
    backgroundColor: 'rgba(196, 154, 108, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 108, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  categoryPillText: {
    color: '#D6C2A1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  menuSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },

  /* Fan-out cluster */
  fanOutCluster: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tierRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '94%',
    marginBottom: 16,
  },
  tierRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '88%',
    marginBottom: 22,
  },
  actionItemContainer: {
    alignItems: 'center',
    width: 80,
  },
  circularButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 9,
    marginBottom: 6,
  },
  iconInnerCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  labelPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  /* Center Close Button */
  closeBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  closeButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: THEME.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
});
