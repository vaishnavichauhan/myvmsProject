import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import {
  Home,
  Bell,
  Users,
  Briefcase,
  Shield,
  Check,
  CheckCircle2,
  Crown,
  UserCheck,
  Package,
  Car,
  Phone,
  Plus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Settings,
  FileText,
  LogOut,
  Building2,
  Lock,
  RotateCw,
  AlertTriangle,
  X,
  User,
  Calendar,
  Search,
  SlidersHorizontal,
  Layers,
  Clock,
  Truck,
  Activity,
  Circle,
  DoorOpen,
  Megaphone,
  Pin,
  Sparkles,
  Wrench,
  Info,
  Paperclip,
} from 'lucide-react-native';

/**
 * Native Lucide Vector Icon Adapter
 * Powered by lucide-react-native & react-native-svg for crisp, scalable icons.
 */
const ICON_MAP = {
  home: Home,
  bell: Bell,
  users: Users,
  briefcase: Briefcase,
  shield: Shield,
  check: Check,
  checkCircle: CheckCircle2,
  crown: Crown,
  userCheck: UserCheck,
  package: Package,
  car: Car,
  phone: Phone,
  plus: Plus,
  arrowRight: ArrowRight,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  settings: Settings,
  fileText: FileText,
  logOut: LogOut,
  building: Building2,
  lock: Lock,
  refresh: RotateCw,
  alert: AlertTriangle,
  close: X,
  person: User,
  calendar: Calendar,
  search: Search,
  filter: SlidersHorizontal,
  layers: Layers,
  clock: Clock,
  truck: Truck,
  activity: Activity,
  doorOpen: DoorOpen,
  megaphone: Megaphone,
  pin: Pin,
  sparkles: Sparkles,
  wrench: Wrench,
  info: Info,
  paperclip: Paperclip,
};

export const CustomIcon = ({ name, size = 20, color = THEME.colors.clay, style, strokeWidth = 2 }) => {
  const IconComponent = ICON_MAP[name] || Circle;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <IconComponent size={size} color={color} strokeWidth={strokeWidth} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
