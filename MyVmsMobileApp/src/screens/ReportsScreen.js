import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';

export const ReportsScreen = ({ navigation }) => {
  const stats = [
    { label: 'Weekly Visitor Entries', val: '248', icon: 'userCheck', color: THEME.colors.clay },
    { label: 'Authorized Deliveries', val: '184', icon: 'package', color: THEME.colors.skyBlueDark },
    { label: 'Domestic Staff Shifts', val: '312', icon: 'briefcase', color: THEME.colors.fernGreen },
    { label: 'Gate Clearance Rate', val: '99.4%', icon: 'shield', color: '#15803D' },
  ];

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Audit & Traffic Reports"
        subtitle="Security checkpoint compliance analytics"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Society Traffic Audit Overview</Text>
          <Text style={styles.summarySubtitle}>Real-time metrics  Gated Society</Text>

          <View style={styles.grid}>
            {stats.map((s, idx) => (
              <View key={idx} style={styles.statBox}>
                <CustomIcon name={s.icon} size={22} color={s.color} />
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    ...THEME.shadows.card,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  summarySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: THEME.colors.sandWell,
    borderRadius: THEME.radius.lg,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.darkBrown,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
});
