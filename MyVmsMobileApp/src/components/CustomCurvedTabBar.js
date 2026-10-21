import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { CustomIcon } from './CustomIcon';

/**
 * Custom Curved Bottom Tab Bar
 * Replicates the exact floating curved aesthetic from the user's reference image:
 * - Rounded top border with subtle shadow
 * - Floating elevated center action button (+)
 * - Clean icon + label alignment with active color accent
 */
export const CustomCurvedTabBar = ({ state, descriptors, navigation, onCenterActionPress }) => {
  const insets = useSafeAreaInsets();

  const tabIcons = {
    HomeTab: { icon: 'home', label: 'Home' },
    GateEntryTab: { icon: 'doorOpen', label: 'Gate Entry' },
    VisitorsTab: { icon: 'doorOpen', label: 'Gate Entry' },
    AnnouncementsTab: { icon: 'megaphone', label: 'Announcement' },
    AccountTab: { icon: 'person', label: 'Account' },
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.barContainer}>
        {/* Tab 1: Home */}
        {renderTabItem(0)}

        {/* Tab 2: Visitors */}
        {renderTabItem(1)}

        {/* Center Floating Plus Button */}
        <View style={styles.centerButtonContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onCenterActionPress}
            style={styles.floatingCenterButton}
          >
            <CustomIcon name="plus" size={24} color={THEME.colors.white} />
          </TouchableOpacity>
        </View>

        {/* Tab 3: Announcements */}
        {renderTabItem(2)}

        {/* Tab 4: Account */}
        {renderTabItem(3)}
      </View>
    </View>
  );

  function renderTabItem(index) {
    const route = state.routes[index];
    if (!route) return null;

    const isFocused = state.index === index;
    const { options } = descriptors[route.key];
    const info = tabIcons[route.name] || { icon: '•', label: route.name };

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const activeColor = THEME.colors.clay;
    const inactiveColor = THEME.colors.textMuted;

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        onPress={onPress}
        style={styles.tabItem}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconWrapper,
            isFocused && styles.activeIconWrapper,
          ]}
        >
          <CustomIcon
            name={info.icon}
            size={22}
            color={isFocused ? activeColor : inactiveColor}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.tabLabel,
            { color: isFocused ? THEME.colors.darkBrown : inactiveColor },
            isFocused && styles.activeTabLabel,
          ]}
        >
          {info.label}
        </Text>
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    borderBottomWidth: 0,
    height: 68,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    ...THEME.shadows.float,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconWrapper: {
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  activeTabLabel: {
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  centerButtonContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    top: -18,
  },
  floatingCenterButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: THEME.colors.darkBrown,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: THEME.colors.background,
    ...THEME.shadows.float,
  },
});
