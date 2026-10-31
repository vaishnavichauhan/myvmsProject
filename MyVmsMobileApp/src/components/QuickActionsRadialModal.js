import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';
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
  Landmark,
  Sparkles,
  Vote,
  Wallet,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Animated Radial Half-Circle Quick Actions Menu
 * Inspired by modern radial floating navigation (Ali Celebi Pinterest style).
 * Displays pure circular icon buttons radiating in a half-circle (semi-circle arc)
 * above the center navigation action button without text labels.
 * Matches frontend module icons:
 * Society, Resident, Finance, Workers, Security, Gates, Committee, Polls
 */
export const QuickActionsRadialModal = ({ visible, onClose, navigation }) => {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation();
  const activeNav = navigation || rootNav;
  const { user } = useAuthStore();
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
        try {
          if (navigation?.navigate) {
            navigation.navigate(targetScreen);
          } else if (navigation?.getParent()?.navigate) {
            navigation.getParent().navigate(targetScreen);
          } else if (rootNav?.navigate) {
            rootNav.navigate(targetScreen);
          }
        } catch (e) {
          console.log('Radial navigation error:', e);
        }
      }
    });
  };

  const isSecurity = user?.role === ROLES.SECURITY || user?.role === 'SECURITY';
  const isAdmin = user?.role === ROLES.ADMIN || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  if (isSecurity) {
    return null;
  }

  // Admin Quick Actions matching frontend icons & colors
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
      id: 'finance',
      title: 'Finance',
      icon: Landmark,
      screen: 'SocietyFinance',
      color: '#059669', // Emerald
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
      color: '#10B981', // Mint/Emerald
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
    {
      id: 'polls',
      title: 'Polls & Surveys',
      icon: Vote,
      screen: 'Polls',
      color: '#6366F1', // Indigo / Purple
    },
  ];

  // Resident / Owner / Family Member Quick Actions (finance, worker, committee, security/gate, polls)
  const residentActions = [
    {
      id: 'finance',
      title: 'Finance',
      icon: Landmark,
      screen: 'SocietyFinance',
      color: '#059669', // Emerald
    },
    {
      id: 'workers',
      title: 'Workers',
      icon: Briefcase,
      screen: 'Workers',
      color: '#D97706', // Amber
    },
    {
      id: 'committee',
      title: 'Committee',
      icon: Award,
      screen: 'Committee',
      color: '#F59E0B', // Gold
    },
    {
      id: 'security_gate',
      title: 'Security / Gate',
      icon: DoorOpen,
      screen: 'Gates',
      color: '#0284C7', // Sky Blue
    },
    {
      id: 'polls',
      title: 'Polls & Surveys',
      icon: Vote,
      screen: 'Polls',
      color: '#6366F1', // Indigo
    },
  ];

  const actions = isAdmin ? adminActions : residentActions;

  // Responsive half-circle radius dynamically adjusted for item count
  const RADIUS = actions.length >= 8
    ? Math.min(SCREEN_WIDTH * 0.43, 158)
    : actions.length >= 7
      ? Math.min(SCREEN_WIDTH * 0.39, 142)
      : Math.min(SCREEN_WIDTH * 0.35, 130);

  // Compute half-circle arc coordinates
  const actionItemsWithCoords = useMemo(() => {
    const count = actions.length;
    if (count === 0) return [];
    if (count === 1) {
      return [{ ...actions[0], targetX: 0, targetY: -RADIUS }];
    }
    if (count === 3) {
      // Elegant elevated upper dome for 3 items: Left (145°), Center (90°), Right (35°)
      const angles = [145, 90, 35];
      return actions.map((item, index) => {
        const angleDeg = angles[index];
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
    }

    const startAngle = count >= 8 ? 173 : (count >= 7 ? 168 : 165);
    const endAngle = count >= 8 ? 7 : (count >= 7 ? 12 : 15);
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

  const isExtraLargeSet = actions.length >= 8;
  const isLargeSet = actions.length >= 7;
  const isSmallSet = actions.length <= 4;
  const itemWrapperWidth = isSmallSet ? 104 : (isExtraLargeSet ? 44 : (isLargeSet ? 48 : 54));

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
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => handleDismiss()}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.backdrop,
              { opacity: backdropOpacity },
            ]}
          />
        </Pressable>

        {/* Center Anchor Point - Full screen container with pointerEvents="box-none" so Android touches inside transformed children are NEVER clipped */}
        <View
          style={styles.centerAnchor}
          pointerEvents="box-none"
        >
          {/* Half-Circle Radiating Module Buttons */}
          {actionItemsWithCoords.map((item) => {
            const translateX = animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [-item.targetX, 0],
            });

            const translateY = animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [item.targetY, 0],
            });

            const scale = animValue.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [0.1, 1.08, 1],
            });

            const opacity = animValue.interpolate({
              inputRange: [0, 0.25, 1],
              outputRange: [0, 1, 1],
            });

            const actualLeft = (SCREEN_WIDTH - itemWrapperWidth) / 2 + item.targetX;
            const actualBottom = centerBottom - item.targetY;

            return (
              <Animated.View
                key={item.id}
                style={[
                  styles.radialItemWrapper,
                  {
                    bottom: actualBottom,
                    left: actualLeft,
                    width: itemWrapperWidth,
                    transform: [{ translateX }, { translateY }, { scale }],
                    opacity,
                  },
                ]}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  onPress={() => handleDismiss(item.screen)}
                  activeOpacity={0.8}
                  style={styles.itemTouchable}
                >
                  <View
                    style={[
                      styles.circularButton,
                      isExtraLargeSet
                        ? { width: 44, height: 44, borderRadius: 22, borderWidth: 2 }
                        : isLargeSet && { width: 48, height: 48, borderRadius: 24, borderWidth: 2 },
                      {
                        borderColor: item.color,
                        shadowColor: item.color,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconInnerCircle,
                        isExtraLargeSet
                          ? { width: 34, height: 34, borderRadius: 17 }
                          : isLargeSet && { width: 38, height: 38, borderRadius: 19 },
                        { backgroundColor: `${item.color}15` },
                      ]}
                    >
                      <item.icon size={isExtraLargeSet ? 19 : isLargeSet ? 21 : 24} color={item.color} strokeWidth={2.4} />
                    </View>
                  </View>

                  {isSmallSet && (
                    <View style={styles.labelBadge}>
                      <Text style={styles.labelText} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {/* Center Close Floating Action Button (X) */}
          <View style={[styles.closeBtnWrapper, { bottom: centerBottom }]}>
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
    backgroundColor: 'rgba(22, 17, 14, 0.65)',
  },
  centerAnchor: {
    ...StyleSheet.absoluteFillObject,
  },
  radialItemWrapper: {
    position: 'absolute',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: THEME.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 9,
  },
  iconInnerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBadge: {
    marginTop: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(215, 203, 191, 0.85)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  labelText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.darkBrown,
    textAlign: 'center',
  },
  closeBtnWrapper: {
    position: 'absolute',
    alignSelf: 'center',
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
