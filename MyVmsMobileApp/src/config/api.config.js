import { Platform } from 'react-native';

/**
 * Centralized API Configuration
 * Automatically uses correct host for Android Emulator (10.0.2.2) and iOS Simulator (localhost).
 * For physical devices, set LAN_IP to your development machine's local IP address (e.g. '192.168.1.5').
 */
const BACKEND_PORT = 5050;
const LAN_IP = '192.168.1.14'; // Set to your computer IP (e.g. '192.168.1.15') for physical devices

const MAC_IP = '192.168.1.10';
const getBaseUrl = () => {
  if (LAN_IP) {
    return `http://${LAN_IP}:${BACKEND_PORT}/api/v1`;
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}/api/v1`;
  }
  return `http://localhost:${BACKEND_PORT}/api/v1`;
};

export const API_CONFIG = {
  PORT: BACKEND_PORT,
  BASE_URL: getBaseUrl(),
  TIMEOUT: 12000,
};
