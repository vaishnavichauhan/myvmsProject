import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F5F0E6"
        translucent={false}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
