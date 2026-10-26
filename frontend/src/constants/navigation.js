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
  Settings,
  Shield,
  Activity,
  User,
  Receipt,
  Coins,
  Landmark,
  Vote,
  Sparkles,
  Palmtree,
  CalendarCheck2,
  Clock,
  Tag,
  BadgePercent,
  BarChart3,
  Layers,
  Gauge,
  FileText,
  Sliders,
  CreditCard,
  Crown,
} from 'lucide-react';
import { ROLES } from './roles';

/**
 * Role-Based Navigation Specification
 * Defines the navigation configuration for Super Admin and every society role in MYVMS.
 * Items with a `feature` property require that feature to be active in the society's subscription.
 */
export const ROLE_NAVIGATION = {
  // 1. Super Admin Navigation (Platform Owner)
  [ROLES.SUPER_ADMIN]: [
    { title: 'Dashboard', path: '/super-admin', icon: LayoutDashboard, exact: true },
    { title: 'Society Management', path: '/super-admin/societies', icon: Building2 },
    { title: 'Society Admins', path: '/super-admin/admins', icon: Users },
    { title: 'Subscription Plans', path: '/super-admin/plans', icon: Layers },
    { title: 'Plan Features', path: '/super-admin/features', icon: Sparkles },
    { title: 'Subscription Management', path: '/super-admin/subscriptions', icon: CalendarCheck2 },
    { title: 'Usage & Limits', path: '/super-admin/limits', icon: Gauge },
    { title: 'Billing & Payments', path: '/super-admin/billing', icon: Landmark },
    { title: 'Reports & Analytics', path: '/super-admin/reports', icon: BarChart3 },
    { title: 'Settings', path: '/super-admin/settings', icon: Settings },
    { title: 'Profile', path: '/super-admin/profile', icon: User },
  ],

  // 2. Society Admin Navigation
  [ROLES.ADMIN]: [
    { title: 'Admin Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { title: 'Society', path: '/dashboard/societies', icon: Building2 },
    { title: 'Resident', path: '/dashboard/residents', icon: Users, feature: 'RESIDENTS' },
    {
      title: 'Society Finance',
      icon: Landmark,
      path: '/dashboard/maintenance',
      feature: 'SOCIETY_FINANCE',
      children: [
        { title: 'Maintenance', path: '/dashboard/maintenance', icon: Receipt },
        { title: 'Special Charges', path: '/dashboard/special-charges', icon: Coins, badge: 'One-time' },
      ],
    },
    {
      title: 'Amenities & Bookings',
      icon: Sparkles,
      path: '/dashboard/amenities',
      feature: 'AMENITIES',
      children: [
        { title: 'Amenities List', path: '/dashboard/amenities', icon: Palmtree },
        { title: 'Booking Management', path: '/dashboard/amenities/bookings', icon: CalendarCheck2 },
        { title: 'Availability & Time Slots', path: '/dashboard/amenities/availability', icon: Clock },
        { title: 'Pricing & Charges', path: '/dashboard/amenities/pricing', icon: Tag },
        { title: 'Deposits & Refunds', path: '/dashboard/amenities/deposits', icon: BadgePercent },
        { title: 'Booking Reports', path: '/dashboard/amenities/reports', icon: BarChart3 },
      ],
    },
    { title: 'Workers', path: '/dashboard/workers', icon: Briefcase, feature: 'WORKERS' },
    { title: 'Security', path: '/dashboard/security-staff', icon: ShieldCheck, feature: 'SECURITY_STAFF' },
    { title: 'Gates', path: '/dashboard/gates', icon: DoorOpen, feature: 'GATES_VISITORS' },
    { title: 'Committee', path: '/dashboard/committee', icon: Award, feature: 'COMMITTEES' },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone, feature: 'ANNOUNCEMENTS' },
    { title: 'Polls & Surveys', path: '/dashboard/polls', icon: Vote, feature: 'POLLS' },
    { title: 'Gate Entry', path: '/dashboard/visitors', icon: DoorOpen, feature: 'GATES_VISITORS' },
    { title: 'Profile', path: '/dashboard/settings', icon: User },
  ],

  // 3. Property Owner Navigation
  [ROLES.OWNER]: [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    {
      title: 'Society Finance',
      icon: Landmark,
      path: '/dashboard/maintenance',
      feature: 'SOCIETY_FINANCE',
      children: [
        { title: 'Maintenance', path: '/dashboard/maintenance', icon: Receipt },
        { title: 'Special Charges', path: '/dashboard/special-charges', icon: Coins, badge: 'One-time' },
      ],
    },
    {
      title: 'Amenities & Bookings',
      icon: Sparkles,
      path: '/dashboard/amenities',
      feature: 'AMENITIES',
      children: [
        { title: 'Amenities List', path: '/dashboard/amenities', icon: Palmtree },
        { title: 'Booking Management', path: '/dashboard/amenities/bookings', icon: CalendarCheck2 },
        { title: 'Availability & Time Slots', path: '/dashboard/amenities/availability', icon: Clock },
      ],
    },
    { title: 'Family', path: '/dashboard/family-members', icon: Users, feature: 'RESIDENTS' },
    { title: 'Workers', path: '/dashboard/workers', icon: Briefcase, feature: 'WORKERS' },
    { title: 'Permissions', path: '/dashboard/permissions', icon: ShieldCheck },
    { title: 'Gate Entry', path: '/dashboard/visitors', icon: DoorOpen, feature: 'GATES_VISITORS' },
    { title: 'Committee', path: '/dashboard/committee', icon: Award, feature: 'COMMITTEES' },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone, feature: 'ANNOUNCEMENTS' },
    { title: 'Polls & Surveys', path: '/dashboard/polls', icon: Vote, feature: 'POLLS' },
    { title: 'Security/Gates', path: '/dashboard/gates', icon: DoorOpen, feature: 'GATES_VISITORS' },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],

  // 4. Resident Tenant Navigation
  [ROLES.TENANT]: [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    {
      title: 'Society Finance',
      icon: Landmark,
      path: '/dashboard/maintenance',
      feature: 'SOCIETY_FINANCE',
      children: [
        { title: 'Maintenance', path: '/dashboard/maintenance', icon: Receipt },
        { title: 'Special Charges', path: '/dashboard/special-charges', icon: Coins, badge: 'One-time' },
      ],
    },
    {
      title: 'Amenities & Bookings',
      icon: Sparkles,
      path: '/dashboard/amenities',
      feature: 'AMENITIES',
      children: [
        { title: 'Amenities List', path: '/dashboard/amenities', icon: Palmtree },
        { title: 'Booking Management', path: '/dashboard/amenities/bookings', icon: CalendarCheck2 },
        { title: 'Availability & Time Slots', path: '/dashboard/amenities/availability', icon: Clock },
      ],
    },
    { title: 'Family', path: '/dashboard/family-members', icon: Users, feature: 'RESIDENTS' },
    { title: 'Workers', path: '/dashboard/workers', icon: Briefcase, feature: 'WORKERS' },
    { title: 'Permissions', path: '/dashboard/permissions', icon: ShieldCheck },
    { title: 'Gate Entry', path: '/dashboard/visitors', icon: DoorOpen, feature: 'GATES_VISITORS' },
    { title: 'Committee', path: '/dashboard/committee', icon: Award, feature: 'COMMITTEES' },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone, feature: 'ANNOUNCEMENTS' },
    { title: 'Polls & Surveys', path: '/dashboard/polls', icon: Vote, feature: 'POLLS' },
    { title: 'Security/Gates', path: '/dashboard/gates', icon: DoorOpen, feature: 'GATES_VISITORS' },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],

  // 5. Family Member Navigation
  [ROLES.FAMILY_MEMBER]: [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    {
      title: 'Society Finance',
      icon: Landmark,
      path: '/dashboard/maintenance',
      feature: 'SOCIETY_FINANCE',
      children: [
        { title: 'Maintenance', path: '/dashboard/maintenance', icon: Receipt },
        { title: 'Special Charges', path: '/dashboard/special-charges', icon: Coins, badge: 'One-time' },
      ],
    },
    {
      title: 'Amenities & Bookings',
      icon: Sparkles,
      path: '/dashboard/amenities',
      feature: 'AMENITIES',
      children: [
        { title: 'Amenities List', path: '/dashboard/amenities', icon: Palmtree },
        { title: 'Booking Management', path: '/dashboard/amenities/bookings', icon: CalendarCheck2 },
        { title: 'Availability & Time Slots', path: '/dashboard/amenities/availability', icon: Clock },
      ],
    },
    { title: 'Family', path: '/dashboard/family-members', icon: Users, feature: 'RESIDENTS' },
    { title: 'Workers', path: '/dashboard/workers', icon: Briefcase, feature: 'WORKERS' },
    { title: 'Permissions', path: '/dashboard/permissions', icon: ShieldCheck },
    { title: 'Gate Entry', path: '/dashboard/visitors', icon: DoorOpen, feature: 'GATES_VISITORS' },
    { title: 'Committee', path: '/dashboard/committee', icon: Award, feature: 'COMMITTEES' },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone, feature: 'ANNOUNCEMENTS' },
    { title: 'Polls & Surveys', path: '/dashboard/polls', icon: Vote, feature: 'POLLS' },
    { title: 'Security/Gates', path: '/dashboard/gates', icon: DoorOpen, feature: 'GATES_VISITORS' },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],

  // 6. Security Personnel Navigation
  [ROLES.SECURITY]: [
    { title: 'Security Dashboard', path: '/dashboard/security', icon: Shield, exact: true },
    { title: 'Gate Entry', path: '/dashboard/visitors', icon: DoorOpen, feature: 'GATES_VISITORS' },
    { title: 'Gate Activity', path: '/dashboard/gates', icon: Activity, feature: 'GATES_VISITORS' },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],

  // 7. Committee Member Navigation
  [ROLES.COMMITTEE_MEMBER]: [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    {
      title: 'Society Finance',
      icon: Landmark,
      path: '/dashboard/maintenance',
      feature: 'SOCIETY_FINANCE',
      children: [
        { title: 'Maintenance', path: '/dashboard/maintenance', icon: Receipt },
        { title: 'Special Charges', path: '/dashboard/special-charges', icon: Coins, badge: 'One-time' },
      ],
    },
    {
      title: 'Amenities & Bookings',
      icon: Sparkles,
      path: '/dashboard/amenities',
      feature: 'AMENITIES',
      children: [
        { title: 'Amenities List', path: '/dashboard/amenities', icon: Palmtree },
        { title: 'Booking Management', path: '/dashboard/amenities/bookings', icon: CalendarCheck2 },
        { title: 'Availability & Time Slots', path: '/dashboard/amenities/availability', icon: Clock },
        { title: 'Pricing & Charges', path: '/dashboard/amenities/pricing', icon: Tag },
        { title: 'Deposits & Refunds', path: '/dashboard/amenities/deposits', icon: BadgePercent },
        { title: 'Booking Reports', path: '/dashboard/amenities/reports', icon: BarChart3 },
      ],
    },
    { title: 'Committee', path: '/dashboard/committee', icon: Award, feature: 'COMMITTEES' },
    { title: 'Announcements', path: '/dashboard/announcements', icon: Megaphone, feature: 'ANNOUNCEMENTS' },
    { title: 'Polls & Surveys', path: '/dashboard/polls', icon: Vote, feature: 'POLLS' },
    { title: 'Profile', path: '/dashboard/profile', icon: User },
  ],
};
