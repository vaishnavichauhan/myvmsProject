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
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import ProfilePage from '../pages/ProfilePage';
import AccessDeniedPage from '../pages/AccessDeniedPage';
import NotFoundPage from '../pages/NotFoundPage';
import DashboardLayout from '../components/layout/DashboardLayout';
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

      {/* Protected Dashboard Layout */}
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
              <FamilyMembersPage />
            </RoleRoute>
          }
        />
        <Route
          path="permissions"
          element={
            <RoleRoute allowedRoles={[ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]} moduleName="Resident Permissions">
              <PermissionsPage />
            </RoleRoute>
          }
        />

        {/* Admin-Specific Modules */}
        <Route
          path="societies"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Society Management">
              <SocietiesPage />
            </RoleRoute>
          }
        />
        <Route
          path="homes"
          element={<Navigate to="/dashboard/residents" replace />}
        />
        <Route
          path="residents"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Resident Directory">
              <ResidentsPage />
            </RoleRoute>
          }
        />
        <Route
          path="security-staff"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Security Personnel">
              <SecurityStaffPage />
            </RoleRoute>
          }
        />
        <Route
          path="reports"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN]} moduleName="Society Reports & Audit">
              <ReportsPage />
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

        {/* Multi-Role Modules */}
        <Route
          path="workers"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]}
              moduleName="Home Workers"
            >
              <WorkersPage />
            </RoleRoute>
          }
        />
        <Route
          path="gates"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER, ROLES.SECURITY]}
              moduleName="Society Gates"
            >
              <GatesPage />
            </RoleRoute>
          }
        />
        <Route
          path="visitors"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER, ROLES.SECURITY]}
              moduleName="Visitor Management"
            >
              <VisitorsPage />
            </RoleRoute>
          }
        />
        <Route
          path="courier-delivery"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER, ROLES.SECURITY]}
              moduleName="Courier & Delivery"
            >
              <CourierDeliveryPage />
            </RoleRoute>
          }
        />
        <Route
          path="deliveries"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER, ROLES.SECURITY]}
              moduleName="Courier & Delivery"
            >
              <CourierDeliveryPage />
            </RoleRoute>
          }
        />
        <Route
          path="security"
          element={
            <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.SECURITY]} moduleName="Security Gate Console">
              <SecurityGateDashboardPage />
            </RoleRoute>
          }
        />
        <Route
          path="committee"
          element={
            <RoleRoute
              allowedRoles={[ROLES.ADMIN, ROLES.COMMITTEE_MEMBER, ROLES.OWNER, ROLES.TENANT, ROLES.FAMILY_MEMBER]}
              moduleName="Managing Committee"
            >
              <CommitteePage />
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
              <AnnouncementsPage />
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
              <AnnouncementsPage />
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
              moduleName="Profile Settings"
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
