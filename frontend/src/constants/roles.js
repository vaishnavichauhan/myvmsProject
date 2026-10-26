/**
 * Residential Society User Roles & Configurations
 */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  TENANT: 'TENANT',
  FAMILY_MEMBER: 'FAMILY_MEMBER',
  SECURITY: 'SECURITY',
  COMMITTEE_MEMBER: 'COMMITTEE_MEMBER',
});

export const ROLE_CONFIG = {
  [ROLES.SUPER_ADMIN]: {
    label: 'Super Admin',
    badgeClass: 'badge-SUPER_ADMIN',
    description: 'Platform owner with full multi-society, subscription, billing, and platform management privileges.',
    color: '#8B5CF6',
  },
  [ROLES.ADMIN]: {
    label: 'Society Admin',
    badgeClass: 'badge-ADMIN',
    description: 'Complete administrative control over societies, units, accounts, and system settings.',
    color: '#fb7185',
  },
  [ROLES.OWNER]: {
    label: 'Property Owner',
    badgeClass: 'badge-OWNER',
    description: 'Unit ownership rights, maintenance payments, tenant approvals, and voting access.',
    color: '#818cf8',
  },
  [ROLES.TENANT]: {
    label: 'Resident Tenant',
    badgeClass: 'badge-TENANT',
    description: 'Daily resident access, visitor gatepasses, amenities booking, and service requests.',
    color: '#22d3ee',
  },
  [ROLES.FAMILY_MEMBER]: {
    label: 'Family Member',
    badgeClass: 'badge-FAMILY_MEMBER',
    description: 'Linked resident profile with visitor approvals and society announcement access.',
    color: '#c084fc',
  },
  [ROLES.SECURITY]: {
    label: 'Gate Security',
    badgeClass: 'badge-SECURITY',
    description: 'Security gate console, visitor verification, vehicle entry/exit, and delivery logging.',
    color: '#fbbf24',
  },
  [ROLES.COMMITTEE_MEMBER]: {
    label: 'Management Committee',
    badgeClass: 'badge-COMMITTEE_MEMBER',
    description: 'Society governing committee: financial audits, maintenance rules, resolution voting.',
    color: '#34d399',
  },
};
