import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { CustomIcon } from './CustomIcon';

export const MetricCard = ({
  title,
  count,
  subtitle,
  iconName,
  accentColor = THEME.colors.clay,
  bgLight = 'rgba(196, 154, 108, 0.15)',
  borderLight = THEME.colors.sand,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { borderColor: borderLight }]}
    >
      <View style={styles.topRow}>
        <View style={styles.textColumn}>
          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          <Text style={styles.count}>{count}</Text>
        </View>

        <View style={[styles.iconBadge, { backgroundColor: bgLight, borderColor: borderLight }]}>
          <CustomIcon name={iconName} size={22} color={accentColor} />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={styles.viewLink}>
          <Text style={[styles.viewText, { color: accentColor }]}>View</Text>
          <CustomIcon name="arrowRight" size={12} color={accentColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    ...THEME.shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  count: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 4,
    lineHeight: 34,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.3)',
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    flex: 1,
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
