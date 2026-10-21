import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Animated Radial Half-Circle Quick Actions Menu
 * Inspired by modern radial floating navigation (Ali Celebi Pinterest style).
 * Displays pure circular icon buttons radiating in a half-circle (semi-circle arc)
 * above the center navigation action button without text labels.
 * Matches frontend module icons:
 * Society, Resident, Workers, Security, Gates, Committee
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
        tension: 48,
        useNativeDriver: true,
      }).start();
    } else {
      animValue.setValue(0);
    }
  }, [visible]);

  const handleDismiss = (targetScreen) => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      if (targetScreen) {
        navigation.navigate(targetScreen);
      }
    });
  };

  // 6 Admin Quick Actions matching frontend icons & colors
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

  // Responsive half-circle radius
  const RADIUS = Math.min(SCREEN_WIDTH * 0.35, 130);

  // Compute half-circle arc coordinates
  const actionItemsWithCoords = useMemo(() => {
    const count = actions.length;
    if (count === 0) return [];
    if (count === 1) {
      return [{ ...actions[0], targetX: 0, targetY: -RADIUS }];
    }
    const startAngle = 165;
    const endAngle = 15;
    const step = (startAngle - endAngle) / (count - 1);

    return actions.map((item, index) => {
      const angleDeg = startAngle - index * step;
      const angleRad = (angleDeg * Math.PI) / 180;
      const targetX = RADIUS * Math.cos(angleRad);
      const targetY = -RADIUS * Math.sin(angleRad);
      return {
        ...item,
        angleDeg,
        targetX,
        targetY,
      };
    });
  }, [actions, RADIUS]);

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const closeRotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  if (!visible) return null;

  const centerBottom = Math.max(insets.bottom, 10) + 25;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => handleDismiss()}
    >
      <View style={styles.modalRoot}>
        {/* Semi-transparent dark blur backdrop */}
        <TouchableWithoutFeedback onPress={() => handleDismiss()}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Center Anchor Point - Aligned with the bottom tab bar plus button */}
        <View
          style={[styles.centerAnchor, { bottom: centerBottom }]}
          pointerEvents="box-none"
        >
          {/* Half-Circle Radiating Module Buttons */}
          {actionItemsWithCoords.map((item) => {
            const translateX = animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, item.targetX],
            });

            const translateY = animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, item.targetY],
            });

            const scale = animValue.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [0.1, 1.1, 1],
            });

            const opacity = animValue.interpolate({
              inputRange: [0, 0.25, 1],
              outputRange: [0, 1, 1],
            });

            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.radialItemWrapper,
                  {
                    transform: [{ translateX }, { translateY }, { scale }],
                    opacity,
                  },
                ]}
                pointerEvents="box-none"
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => handleDismiss(item.screen)}
                  activeOpacity={0.8}
                  style={[
                    styles.circularButton,
                    {
                      borderColor: item.color,
                      shadowColor: item.color,
                    },
                  ]}
                >
                  <View style={[styles.iconInnerCircle, { backgroundColor: `${item.color}15` }]}>
                    <item.icon size={24} color={item.color} strokeWidth={2.4} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {/* Center Close Floating Action Button (X) */}
          <View style={styles.closeBtnWrapper}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close quick actions"
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
    backgroundColor: 'rgba(22, 17, 14, 0.70)',
  },
  centerAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialItemWrapper: {
    position: 'absolute',
    width: 52,
    height: 52,
    top: 1,
    left: (SCREEN_WIDTH - 52) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 9,
  },
  iconInnerCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnWrapper: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: THEME.colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: THEME.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
});
