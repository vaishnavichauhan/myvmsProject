import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  ShieldCheck,
  DoorOpen,
  Award,
  Megaphone,
  UserCheck,
  FileText,
  Settings,
  Shield,
  Activity,
  User,
} from 'lucide-react';
import { ROLES } from './roles';

/**
 * Prompt 19 — Role-Based Navigation Specification
 * Defines the exact, granular navigation configuration for every role in MYVMS.
 */
export const ROLE_NAVIGATION = {
  [ROLES.ADMIN]: [
    { title: 'Admin Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { title: 'Society', path: '/dashboard/societies', icon: Building2 },
    { title: 'Resident', path: '/dashboard/residents', icon: Users },
    { title: 'Workers', path: '/dashboard/workers', icon: Briefcase },
    { title: 'Security', path: '/dashboard/security-staff', icon: ShieldCheck },
    { title: 'Gates', path: '/dashboard/gates', icon: DoorOpen },
    { title: 'Committee', path: '/dashboard/committee', icon: Award },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone },
    { title: 'Gate Entry', path: '/dashboard/visitors', icon: DoorOpen },
    { title: 'Reports', path: '/dashboard/reports', icon: FileText },
    { title: 'Account', path: '/dashboard/settings', icon: Settings },
  ],

  [ROLES.OWNER]: [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { title: 'Family', path: '/dashboard/family-members', icon: Users },
    { title: 'Workers', path: '/dashboard/workers', icon: Briefcase },
    { title: 'Permissions', path: '/dashboard/permissions', icon: ShieldCheck },
    { title: 'Visitors', path: '/dashboard/visitors', icon: UserCheck },
    { title: 'Committee', path: '/dashboard/committee', icon: Award },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone },
    { title: 'Security/Gates', path: '/dashboard/gates', icon: DoorOpen },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],

  [ROLES.TENANT]: [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { title: 'Family', path: '/dashboard/family-members', icon: Users },
    { title: 'Workers', path: '/dashboard/workers', icon: Briefcase },
    { title: 'Permissions', path: '/dashboard/permissions', icon: ShieldCheck },
    { title: 'Visitors', path: '/dashboard/visitors', icon: UserCheck },
    { title: 'Committee', path: '/dashboard/committee', icon: Award },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone },
    { title: 'Security/Gates', path: '/dashboard/gates', icon: DoorOpen },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],

  [ROLES.FAMILY_MEMBER]: [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { title: 'Family', path: '/dashboard/family-members', icon: Users },
    { title: 'Workers', path: '/dashboard/workers', icon: Briefcase },
    { title: 'Permissions', path: '/dashboard/permissions', icon: ShieldCheck },
    { title: 'Visitors', path: '/dashboard/visitors', icon: UserCheck },
    { title: 'Committee', path: '/dashboard/committee', icon: Award },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone },
    { title: 'Security/Gates', path: '/dashboard/gates', icon: DoorOpen },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],

  [ROLES.SECURITY]: [
    { title: 'Security Dashboard', path: '/dashboard/security', icon: Shield, exact: true },
    { title: 'Gate Entry', path: '/dashboard/visitors', icon: DoorOpen },
    { title: 'Gate Activity', path: '/dashboard/gates', icon: Activity },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],

  [ROLES.COMMITTEE_MEMBER]: [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { title: 'Committee', path: '/dashboard/committee', icon: Award },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],
};
