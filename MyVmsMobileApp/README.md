# MYVMS Mobile Application (React Native CLI)

Complete native Android and iOS mobile application for **MYVMS (Residential Society Management System)**, converted from the existing web frontend and integrated with the existing backend APIs.

---

## 📱 Features & Screen Equivalents

| Web Screen | Mobile Screen | Description |
|---|---|---|
| `LandingPage.jsx` | `LandingScreen.js` | Public welcome screen, key capabilities, sign in CTA. |
| `LoginPage.jsx` | `LoginScreen.js` | Secure phone/email login, password visibility, quick-fill demo roles. |
| `MyHomePage.jsx` | `MyHomeScreen.js` | Resident Home Dashboard with emergency alerts, society hero, and 7 live metric cards. |
| `VisitorsPage.jsx` | `VisitorsScreen.js` | Real-time visitor logs, pending approval actions (Approve/Reject), status tabs. |
| `CourierDeliveryPage.jsx` | `CourierDeliveryScreen.js` | Parcel delivery logs (Swiggy, Zomato, Amazon, Blinkit) & approval passes. |
| `AnnouncementsPage.jsx` | `AnnouncementsScreen.js` | Society circulars with category filters (Emergency, Festival, Maintenance, Meeting). |
| `FamilyMembersPage.jsx` | `FamilyMembersScreen.js` | Registered household residents directory + Add Member modal with relationship tags. |
| `WorkersPage.jsx` | `WorkersScreen.js` | Domestic help (maids, cooks, drivers) directory + Add Worker modal. |
| `PermissionsPage.jsx` | `PermissionsScreen.js` | Gate access rules toggles (Courier, Delivery, Visitor, Worker entry). |
| `GatesPage.jsx` | `GatesScreen.js` | Society physical gates roster (Main Gate, Gate 2, Service, Parking) & duty shifts. |
| `CommitteePage.jsx` | `CommitteeScreen.js` | Managing Committee directory with officer roles and one-tap call action. |
| `DashboardPage.jsx` | `AdminDashboardScreen.js` | Society admin overview, home occupancy analytics, and quick management links. |
| `SecurityGateDashboardPage.jsx` | `SecurityGateScreen.js` | Security gate console with quick visitor check-in form and on-duty badge. |
| `SettingsPage.jsx` | `SettingsScreen.js` | Society profile configuration, 2-line address textarea, and emergency helplines. |
| `ReportsPage.jsx` | `ReportsScreen.js` | Traffic summary analytics and gate clearance rate audits. |
| `ResidentsPage.jsx` | `ResidentsScreen.js` | Resident and home directory with instant name/unit search. |
| `ProfilePage.jsx` | `ProfileScreen.js` | User account summary, change password form, and session sign-out. |

---

## 🎨 Design System

Matches the web application's **Earthy Sand & Warm Terracotta Clay** design system:
- **Sandy Beige Background**: `#F5F0E6`
- **Terracotta Clay Accent**: `#C49A6C`
- **Fern Green Accent**: `#6B8E5A`
- **Dark Brown Typography**: `#403630`
- **Card Background**: `#FFFFFF` with `#D6C2A1` borders
- **Custom Curved Tab Bar**: Elevated floating center button (`+`) with quick action sheet matching the modern mobile navigation aesthetic.

---

## 🚀 Running the Mobile Application

### 1. Ensure Backend is Running
The backend runs on port `5050`:
```bash
cd /Users/exitashah/Desktop/VaishnaviWebApp/MyVms/backend
npm start
```

### 2. Start Metro Server
From the `MyVmsMobileApp` directory:
```bash
cd MyVmsMobileApp
npm start
```

### 3. Run on Android Emulator
Make sure an Android Virtual Device (AVD) is running or configured:
```bash
npm run android
```
*(or `npx react-native run-android`)*

*Note: Android Emulator automatically routes to `http://10.0.2.2:5050/api/v1`.*

### 4. Run on iOS Simulator
```bash
npm run ios
```
*(or `npx react-native run-ios`)*

*Note: iOS Simulator routes to `http://localhost:5050/api/v1`.*

### 5. Run on Physical Device
1. Find your development machine's local LAN IP (e.g., `ifconfig | grep "inet "` -> `192.168.1.15`).
2. Open `src/config/api.config.js`.
3. Set `LAN_IP = '192.168.1.15'`.
4. Ensure your phone and development machine are connected to the same Wi-Fi network.

---

## 📂 Project Architecture

```
MyVmsMobileApp/
├── App.tsx                        # Root application entry with SafeAreaProvider
├── index.js                       # React Native AppRegistry
├── src/
│   ├── components/                # Reusable native UI components
│   │   ├── CustomCurvedTabBar.js  # Curved bottom bar with floating (+) center button
│   │   ├── CustomIcon.js          # Crisp vector icon system
│   │   ├── EmergencyBanner.js     # Urgent circular alert banner
│   │   ├── HeaderBar.js           # Navigation bar with title & back navigation
│   │   ├── MetricCard.js          # Overview count cards matching web app
│   │   └── PrimaryButton.js       # Themed touchable buttons
│   ├── config/
│   │   └── api.config.js          # Dynamic host config (10.0.2.2 / localhost / LAN)
│   ├── constants/
│   │   ├── roles.js               # User roles (ADMIN, OWNER, TENANT, SECURITY, etc.)
│   │   └── theme.js               # Earthy Sand color tokens, radius, and shadows
│   ├── navigation/
│   │   └── AppNavigator.js        # AuthStack, MainTabs, and root Stack navigators
│   ├── screens/                   # Complete native screens
│   │   ├── AdminDashboardScreen.js
│   │   ├── AnnouncementsScreen.js
│   │   ├── CommitteeScreen.js
│   │   ├── CourierDeliveryScreen.js
│   │   ├── FamilyMembersScreen.js
│   │   ├── GatesScreen.js
│   │   ├── LandingScreen.js
│   │   ├── LoginScreen.js
│   │   ├── MyHomeScreen.js
│   │   ├── PermissionsScreen.js
│   │   ├── ProfileScreen.js
│   │   ├── ReportsScreen.js
│   │   ├── ResidentsScreen.js
│   │   ├── SecurityGateScreen.js
│   │   ├── SettingsScreen.js
│   │   ├── VisitorsScreen.js
│   │   └── WorkersScreen.js
│   ├── services/                  # Network & storage
│   │   ├── apiClient.js           # Fetch client with auto Bearer token injection
│   │   ├── apiServices.js         # Endpoints matching backend routes
│   │   └── storage.js             # AsyncStorage session persistence
│   └── store/
│       └── authStore.js           # Zustand global authentication state
```
