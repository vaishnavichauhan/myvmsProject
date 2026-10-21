/**
 * User roles definition matching backend constants
 */
export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  OWNER: 'OWNER',
  TENANT: 'TENANT',
  FAMILY_MEMBER: 'FAMILY_MEMBER',
  SECURITY: 'SECURITY',
  COMMITTEE_MEMBER: 'COMMITTEE_MEMBER',
});

export const ALL_ROLES = Object.values(ROLES);

export const RESIDENT_ROLES = [
  ROLES.OWNER,
  ROLES.TENANT,
  ROLES.FAMILY_MEMBER,
];
