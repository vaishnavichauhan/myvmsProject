import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import SocietiesPage from '../pages/SocietiesPage';
import HomesPage from '../pages/HomesPage';
import ResidentsPage from '../pages/ResidentsPage';
import MyHomePage from '../pages/MyHomePage';
import FamilyMembersPage from '../pages/FamilyMembersPage';
import WorkersPage from '../pages/WorkersPage';
import PermissionsPage from '../pages/PermissionsPage';
import SecurityStaffPage from '../pages/SecurityStaffPage';
import SecurityGateDashboardPage from '../pages/SecurityGateDashboardPage';
import GatesPage from '../pages/GatesPage';
import VisitorsPage from '../pages/VisitorsPage';
import CourierDeliveryPage from '../pages/CourierDeliveryPage';
import CommitteePage from '../pages/CommitteePage';
import AnnouncementsPage from '../pages/AnnouncementsPage';
import MaintenancePage from '../pages/MaintenancePage';
import SpecialChargesPage from '../pages/SpecialChargesPage';
import PollsPage from '../pages/PollsPage';
import AmenitiesPage from '../pages/amenities/AmenitiesPage';
import BookingsPage from '../pages/amenities/BookingsPage';
import AvailabilityPage from '../pages/amenities/AvailabilityPage';
import PricingPage from '../pages/amenities/PricingPage';
import DepositsRefundsPage from '../pages/amenities/DepositsRefundsPage';
import AmenityReportsPage from '../pages/amenities/AmenityReportsPage';
import SettingsPage from '../pages/SettingsPage';
import SocietySubscriptionPage from '../pages/SocietySubscriptionPage';
import AccountsPage from '../pages/AccountsPage';
import ProfilePage from '../pages/ProfilePage';
import AccessDeniedPage from '../pages/AccessDeniedPage';
import NotFoundPage from '../pages/NotFoundPage';
import DashboardLayout from '../components/layout/DashboardLayout';
import FeatureGuard from '../components/FeatureGuard';

// Super Admin Pages
import SuperAdminDashboardPage from '../pages/superadmin/SuperAdminDashboardPage';
import SuperAdminSocietiesPage from '../pages/superadmin/SuperAdminSocietiesPage';
import SuperAdminAdminsPage from '../pages/superadmin/SuperAdminAdminsPage';
import SuperAdminPlansPage from '../pages/superadmin/SuperAdminPlansPage';
import SuperAdminFeaturesPage from '../pages/superadmin/SuperAdminFeaturesPage';
import SuperAdminSubscriptionsPage from '../pages/superadmin/SuperAdminSubscriptionsPage';
import SuperAdminLimitsPage from '../pages/superadmin/SuperAdminLimitsPage';
import SuperAdminBillingPage from '../pages/superadmin/SuperAdminBillingPage';
import SuperAdminReportsPage from '../pages/superadmin/SuperAdminReportsPage';
import SuperAdminSettingsPage from '../pages/superadmin/SuperAdminSettingsPage';

import { useAuthStore } from '../store/authStore';
import { ROLES } from '../constants/roles';

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Role-based Route Guard: Blocks manual URL altering and renders AccessDeniedPage
function RoleRoute({ allowedRoles, moduleName, children }) {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role)) {
    return <AccessDeniedPage moduleName={moduleName} />;
  }
  return children;
}

// Smart Index Dispatcher
function DashboardIndex() {
  const { user } = useAuthStore();
  if (user?.role === ROLES.SUPER_ADMIN) {
    return <Navigate to="/super-admin" replace />;
  }
  if (user?.role === ROLES.SECURITY) {
    return <SecurityGateDashboardPage />;
  }
  if (user?.role === ROLES.OWNER || user?.role === ROLES.TENANT || user?.role === ROLES.FAMILY_MEMBER) {
    return <MyHomePage />;
  }
  if (user?.role === ROLES.COMMITTEE_MEMBER) {
    return <CommitteePage />;
  }
  return <DashboardPage />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Super Admin Console (Platform Owner) */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.SUPER_ADMIN]} moduleName="Platform Management">
              <DashboardLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperAdminDashboardPage />} />
        <Route path="societies" element={<SuperAdminSocietiesPage />} />
        <Route path="admins" element={<SuperAdminAdminsPage />} />
        <Route path="plans" element={<SuperAdminPlansPage />} />
        <Route path="features" element={<SuperAdminFeaturesPage />} />
        <Route path="subscriptions" element={<SuperAdminSubscriptionsPage />} />
        <Route path="limits" element={<SuperAdminLimitsPage />} />
        <Route path="billing" element={<SuperAdminBillingPage />} />
        <Route path="reports" element={<SuperAdminReportsPage />} />
        <Route path="settings" element={<SuperAdminSettingsPage />} />
        <Route path="profile" element={<SuperAdminSettingsPage />} />
      </Route>

      {/* Protected Society Dashboard Layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardIndex />} />

        {/* Resident-Specific Modules */}
        <Route
          path="my-home"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]} moduleName="My Home Portal">
              <MyHomePage />
            </RoleRoute>
          }
        />
        <Route
          path="family-members"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]} moduleName="Family Members">
              <FeatureGuard featureCode="RESIDENTS" featureName="Family Members">
                <FamilyMembersPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="workers"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]} moduleName="Workers">
              <FeatureGuard featureCode="WORKERS" featureName="Worker Management">
                <WorkersPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="permissions"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]} moduleName="Permissions">
              <PermissionsPage />
            </RoleRoute>
          }
        />

        {/* Admin Society & Resident Management */}
        <Route
          path="societies"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Societies Management">
              <SocietiesPage />
            </RoleRoute>
          }
        />
        <Route
          path="societies/:societyId/homes"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Homes Management">
              <HomesPage />
            </RoleRoute>
          }
        />
        <Route
          path="residents"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Resident Management">
              <FeatureGuard featureCode="RESIDENTS" featureName="Resident Management">
                <ResidentsPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="settings"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Society Settings">
              <SettingsPage />
            </RoleRoute>
          }
        />
        <Route
          path="accounts"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]} moduleName="Society Financial Accounts">
              <AccountsPage />
            </RoleRoute>
          }
        />
        <Route
          path="subscription-billing"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Society Subscription & Billing">
              <SocietySubscriptionPage />
            </RoleRoute>
          }
        />

        {/* Security Modules */}
        <Route
          path="security-staff"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Security Staff">
              <FeatureGuard featureCode="SECURITY_STAFF" featureName="Security Staff">
                <SecurityStaffPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="security"
          element={
            <RoleRoute allowedRoles={[ROLES.SECURITY]} moduleName="Security Gate Console">
              <SecurityGateDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="gates"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.SECURITY, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]}
              moduleName="Gate Directory"
            >
              <FeatureGuard featureCode="GATES_VISITORS" featureName="Gate & Visitor Management">
                <GatesPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="visitors"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.SECURITY, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]}
              moduleName="Gate Entry Console"
            >
              <FeatureGuard featureCode="GATES_VISITORS" featureName="Gate & Visitor Management">
                <VisitorsPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="deliveries"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.SECURITY, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]}
              moduleName="Courier & Parcel Management"
            >
              <FeatureGuard featureCode="COURIER_DELIVERIES" featureName="Courier & Deliveries">
                <CourierDeliveryPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />

        {/* Committee & Communication */}
        <Route
          path="committee"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]}
              moduleName="Management Committee"
            >
              <FeatureGuard featureCode="COMMITTEES" featureName="Committee Management">
                <CommitteePage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="announcements"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]}
              moduleName="Society Announcements"
            >
              <FeatureGuard featureCode="ANNOUNCEMENTS" featureName="Society Announcements">
                <AnnouncementsPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />

        {/* Society Finance */}
        <Route
          path="maintenance"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER, ROLES.COMMITTEE_MEMBER]}
              moduleName="Society Finance"
            >
              <FeatureGuard featureCode="SOCIETY_FINANCE" featureName="Society Finance & Maintenance">
                <MaintenancePage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="special-charges"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER, ROLES.COMMITTEE_MEMBER]}
              moduleName="Special Charges"
            >
              <FeatureGuard featureCode="SOCIETY_FINANCE" featureName="Society Finance">
                <SpecialChargesPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />

        {/* Polls & Surveys */}
        <Route
          path="polls"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]}
              moduleName="Polls & Surveys"
            >
              <FeatureGuard featureCode="POLLS" featureName="Polls & Surveys">
                <PollsPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />

        {/* Amenities & Bookings */}
        <Route
          path="amenities"
          element={
            <RoleRoute
              allowedRoles={[
                ROLES.ADMIN,
                ROLES.COMMITTEE_MEMBER,
                ROLES.OWNER,
                ROLES.TENANT,
                ROLES.FAMILY_MEMBER,
              ]}
              moduleName="Amenities Catalog"
            >
              <FeatureGuard featureCode="AMENITIES" featureName="Amenities & Bookings">
                <AmenitiesPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="amenities/bookings"
          element={
            <RoleRoute
              allowedRoles={[
                ROLES.ADMIN,
                ROLES.COMMITTEE_MEMBER,
                ROLES.OWNER,
                ROLES.TENANT,
                ROLES.FAMILY_MEMBER,
              ]}
              moduleName="Amenity Bookings"
            >
              <FeatureGuard featureCode="AMENITIES" featureName="Amenities & Bookings">
                <BookingsPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="amenities/availability"
          element={
            <RoleRoute
              allowedRoles={[
                ROLES.ADMIN,
                ROLES.COMMITTEE_MEMBER,
                ROLES.OWNER,
                ROLES.TENANT,
                ROLES.FAMILY_MEMBER,
              ]}
              moduleName="Amenity Availability & Slots"
            >
              <FeatureGuard featureCode="AMENITIES" featureName="Amenities & Bookings">
                <AvailabilityPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="amenities/pricing"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.COMMITTEE_MEMBER]}
              moduleName="Amenity Pricing & Charges"
            >
              <FeatureGuard featureCode="AMENITIES" featureName="Amenities & Bookings">
                <PricingPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="amenities/deposits"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.COMMITTEE_MEMBER]}
              moduleName="Deposits & Refunds Ledger"
            >
              <FeatureGuard featureCode="AMENITIES" featureName="Amenities & Bookings">
                <DepositsRefundsPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="amenities/reports"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.COMMITTEE_MEMBER]}
              moduleName="Amenity Booking Reports"
            >
              <FeatureGuard featureCode="AMENITIES" featureName="Amenities & Bookings">
                <AmenityReportsPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />

        <Route
          path="notices"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]}
              moduleName="Society Announcements"
            >
              <FeatureGuard featureCode="ANNOUNCEMENTS" featureName="Society Announcements">
                <AnnouncementsPage />
              </FeatureGuard>
            </RoleRoute>
          }
        />
        <Route
          path="profile"
          element={
            <RoleRoute
              allowedRoles={[
                ROLES.ADMIN,
                ROLES.OWNER,
                ROLES.TENANT,
                ROLES.FAMILY_MEMBER,
                ROLES.SECURITY,
                ROLES.COMMITTEE_MEMBER,
              ]}
              moduleName="Account"
            >
              <ProfilePage />
            </RoleRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
