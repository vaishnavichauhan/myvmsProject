import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { THEME } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';

// Custom Curved Tab Bar Component
import { CustomCurvedTabBar } from '../components/CustomCurvedTabBar';
import { CustomIcon } from '../components/CustomIcon';
import { QuickActionsRadialModal } from '../components/QuickActionsRadialModal';

// Screens
import { LandingScreen } from '../screens/LandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MyHomeScreen } from '../screens/MyHomeScreen';
import { VisitorsScreen } from '../screens/VisitorsScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { FamilyMembersScreen } from '../screens/FamilyMembersScreen';
import { WorkersScreen } from '../screens/WorkersScreen';
import { PermissionsScreen } from '../screens/PermissionsScreen';
import { GatesScreen } from '../screens/GatesScreen';
import { CommitteeScreen } from '../screens/CommitteeScreen';
import { CourierDeliveryScreen } from '../screens/CourierDeliveryScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { SecurityGateScreen } from '../screens/SecurityGateScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ResidentsScreen } from '../screens/ResidentsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Bottom Tab Navigator for Authenticated Session
 */
function MainTabNavigator({ navigation }) {
  const { user } = useAuthStore();
  const [quickActionVisible, setQuickActionVisible] = useState(false);

  // Determine initial home component based on user role
  const getHomeComponent = () => {
    if (user?.role === ROLES.ADMIN) {
      return AdminDashboardScreen;
    }
    if (user?.role === ROLES.SECURITY) {
      return SecurityGateScreen;
    }
    return MyHomeScreen;
  };

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => (
          <CustomCurvedTabBar
            {...props}
            onCenterActionPress={() => setQuickActionVisible(true)}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="HomeTab" component={getHomeComponent()} />
        <Tab.Screen name="GateEntryTab" component={VisitorsScreen} />
        <Tab.Screen name="AnnouncementsTab" component={AnnouncementsScreen} />
        <Tab.Screen name="AccountTab" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Center (+) Floating Action Radial Arc Menu (Pinterest Animated Navigation style) */}
      <QuickActionsRadialModal
        visible={quickActionVisible}
        onClose={() => setQuickActionVisible(false)}
        navigation={navigation}
      />
    </>
  );
}

/**
 * Root Stack Navigator
 */
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          // Authenticated Stack
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="FamilyMembers" component={FamilyMembersScreen} />
            <Stack.Screen name="Workers" component={WorkersScreen} />
            <Stack.Screen name="Permissions" component={PermissionsScreen} />
            <Stack.Screen name="Gates" component={GatesScreen} />
            <Stack.Screen name="SecurityGate" component={SecurityGateScreen} />
            <Stack.Screen name="Committee" component={CommitteeScreen} />
            <Stack.Screen name="CourierDelivery" component={CourierDeliveryScreen} />
            <Stack.Screen name="Residents" component={ResidentsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="Visitors" component={VisitorsScreen} />
            <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    ...THEME.shadows.float,
  },
  sheetDragPill: {
    width: 40,
    height: 4,
    backgroundColor: THEME.colors.sand,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 18,
  },
  actionsList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: THEME.radius.lg,
    backgroundColor: THEME.colors.sandWell,
    borderWidth: 1,
    borderColor: THEME.colors.sand,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTextBox: {
    flex: 1,
  },
  actionName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.darkBrown,
  },
  actionDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
});
