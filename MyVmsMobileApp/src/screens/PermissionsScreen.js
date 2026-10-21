import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { THEME } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { CustomIcon } from '../components/CustomIcon';
import { permissionApi } from '../services/apiServices';
import { useAuthStore } from '../store/authStore';

export const PermissionsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [courier, setCourier] = useState(true);
  const [delivery, setDelivery] = useState(true);
  const [visitor, setVisitor] = useState(true);
  const [worker, setWorker] = useState(true);
  const [homeId, setHomeId] = useState(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await permissionApi.getHomePermissions();
      const perms = Array.isArray(res.data) ? res.data[0] : res.data;
      if (perms) {
        setHomeId(perms.home_id || perms.id);
        setCourier(Boolean(perms.courier_permission ?? true));
        setDelivery(Boolean(perms.delivery_permission ?? true));
        setVisitor(Boolean(perms.visitor_permission ?? true));
        setWorker(Boolean(perms.worker_permission ?? true));
      }
    } catch (err) {
      console.log('Error fetching permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, value) => {
    const updated = {
      courier_permission: key === 'courier' ? value : courier,
      delivery_permission: key === 'delivery' ? value : delivery,
      visitor_permission: key === 'visitor' ? value : visitor,
      worker_permission: key === 'worker' ? value : worker,
    };

    if (key === 'courier') setCourier(value);
    if (key === 'delivery') setDelivery(value);
    if (key === 'visitor') setVisitor(value);
    if (key === 'worker') setWorker(value);

    setSaving(true);
    try {
      await permissionApi.updateHomePermissions(homeId || 1, updated);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update access rule.');
      fetchPermissions();
    } finally {
      setSaving(false);
    }
  };

  const permissionItems = [
    {
      key: 'courier',
      title: 'Courier & Parcel Drop',
      desc: 'Allow security guards to receive or pass couriers directly to your flat.',
      value: courier,
      icon: 'package',
      color: THEME.colors.skyBlueDark,
    },
    {
      key: 'delivery',
      title: 'Food & Grocery Delivery',
      desc: 'Permit entry for Swiggy, Zomato, Blinkit, and Amazon delivery riders.',
      value: delivery,
      icon: 'car',
      color: THEME.colors.fernGreen,
    },
    {
      key: 'visitor',
      title: 'Pre-Cleared Visitor Access',
      desc: 'Allow recognized and invited guests quick gate check-in without verification calls.',
      value: visitor,
      icon: 'userCheck',
      color: THEME.colors.clay,
    },
    {
      key: 'worker',
      title: 'Daily Help & Worker Entry',
      desc: 'Authorize domestic maids, cooks, and drivers to log entry on daily shifts.',
      value: worker,
      icon: 'briefcase',
      color: '#D97706',
    },
  ];

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Access Rules & Clearances"
        subtitle="Manage automatic gate entry permissions"
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <CustomIcon name="shield" size={18} color={THEME.colors.clay} />
          <Text style={styles.infoText}>
            Rules configured here directly enforce security gate check-in workflows for your home.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={THEME.colors.clay} />
            <Text style={styles.loadingText}>Loading permissions...</Text>
          </View>
        ) : (
          permissionItems.map((item) => (
            <View key={item.key} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: `${item.color}18` }]}>
                  <CustomIcon name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.desc}>{item.desc}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={(val) => handleToggle(item.key, val)}
                  trackColor={{ false: THEME.colors.sand, true: THEME.colors.clay }}
                  thumbColor={THEME.colors.white}
                />
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: item.value ? '#15803D' : '#9CA3AF' }]} />
                <Text style={styles.statusLabel}>
                  {item.value ? 'Access Authorized' : 'Requires Phone Authorization'}
                </Text>
              </View>
            </View>
          ))
        )}
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 16,
    gap: 10,
    ...THEME.shadows.card,
  },
  infoText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    flex: 1,
    lineHeight: 17,
  },
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
    marginBottom: 12,
    ...THEME.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(214, 194, 161, 0.25)',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
});
