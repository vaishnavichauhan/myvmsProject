import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { CustomIcon } from './CustomIcon';

export const EmergencyBanner = ({ announcements = [] }) => {
  const emergencyNotices = (announcements || []).filter(
    (a) =>
      a.type === 'EMERGENCY' ||
      a.category === 'EMERGENCY' ||
      a.is_emergency ||
      a.priority === 'URGENT' ||
      a.priority === 'HIGH'
  );

  if (emergencyNotices.length === 0) return null;

  const notice = emergencyNotices[0];

  return (
    <View style={styles.banner}>
      <View style={styles.iconCircle}>
        <CustomIcon name="alert" size={20} color={THEME.colors.error} />
      </View>
      <View style={styles.content}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>EMERGENCY ALERT</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {notice.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {notice.content || notice.description}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: THEME.radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    ...THEME.shadows.card,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  badgeRow: {
    backgroundColor: THEME.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.white,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
  },
});
