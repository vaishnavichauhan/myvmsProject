import React from 'react';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';
import FeatureLockedPage from '../pages/FeatureLockedPage';

/**
 * FeatureGuard Component
 * Wraps routes and components to enforce society subscription feature entitlements.
 */
export default function FeatureGuard({ featureCode, featureName, children }) {
  const { user } = useAuthStore();

  // Super Admin has unrestricted access to all platform features
  if (user?.role === ROLES.SUPER_ADMIN) {
    return <>{children}</>;
  }

  // If user features are populated, check entitlement
  if (user?.features && Array.isArray(user.features)) {
    if (!user.features.includes(featureCode)) {
      return <FeatureLockedPage featureCode={featureCode} featureName={featureName || featureCode} />;
    }
  }

  return <>{children}</>;
}
