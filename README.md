# MYVMS - Residential Society Management System

A modern, scalable Residential Society Management System built with a decoupled architecture:
- **Frontend**: React.js, React Router, Axios, Zustand State Management, Modern Responsive UI (Vanilla CSS + Glassmorphism)
- **Backend**: Node.js, Express.js, MySQL (mysql2 promise pool), JWT Authentication, bcryptjs password hashing, Role-based authorization (RBAC)
- **Database**: MySQL on port `3306` (`myVms` database)

---

## 📁 Project Structure

```
MYVMS/
├── backend/
│   ├── .env                       # Environment variables (DB credentials, JWT, Port)
│   ├── .env.example               # Template environment configuration
│   ├── server.js                  # Server entry point & graceful shutdown
│   ├── package.json
│   └── src/
│       ├── app.js                 # Express application & middleware configuration
│       ├── config/
│       │   ├── db.js              # MySQL connection pool (mysql2/promise)
│       │   └── env.js             # Centralized environment variable management
│       ├── constants/
│       │   └── roles.js           # Roles enum (ADMIN, OWNER, TENANT, etc.)
│       ├── controllers/
│       │   ├── auth.controller.js # Authentication controller
│       │   └── health.controller.js # Health & MySQL latency controller
│       ├── services/
│       │   └── auth.service.js    # Business logic & JWT issuance
│       ├── repositories/
│       │   └── user.repository.js # Isolated SQL queries (No queries in routes!)
│       ├── middlewares/
│       │   ├── auth.middleware.js # JWT Bearer token authentication
│       │   ├── role.middleware.js # RBAC role authorization guard
│       │   └── error.middleware.js# Centralized error handler
│       ├── database/
│       │   ├── schema.sql         # Database schema definition
│       │   └── migrate.js         # Automated schema migration & seeder
│       ├── routes/
│       │   ├── index.js           # API v1 route aggregator
│       │   ├── auth.routes.js     # Auth route endpoints
│       │   └── health.routes.js   # Health check route endpoints
│       └── utils/
│           ├── apiResponse.js     # Uniform API response standard
│           └── apiError.js        # Standardized API error helper
│
└── frontend/
    ├── index.html                 # HTML shell with Google Fonts
    ├── vite.config.js             # Vite configuration with /api reverse proxy
    ├── package.json
    └── src/
        ├── App.jsx                # Root app & session initializer
        ├── main.jsx               # React entry point
        ├── index.css              # Custom design system (Glassmorphism, colors, badges)
        ├── api/
        │   ├── apiClient.js       # Axios client with JWT interceptors
        │   └── authApi.js         # Network API request functions
        ├── services/
        │   └── authService.js     # Frontend business logic (session & data rules)
        ├── store/
        │   └── authStore.js       # Zustand global state store
        ├── constants/
        │   └── roles.js           # Frontend role configs, labels, and badges
        ├── components/
        │   └── layout/
        │       ├── Navbar.jsx     # Header with live MySQL status badge
        │       ├── Sidebar.jsx    # Role-gated module navigation
        │       └── DashboardLayout.jsx
        ├── pages/
        │   ├── LandingPage.jsx    # System overview & live MySQL health
        │   ├── LoginPage.jsx      # Login page with 1-click role demo accounts
        │   ├── DashboardPage.jsx  # Interactive dashboard & RBAC tester
        │   └── NotFoundPage.jsx   # 404 handler
        └── routes/
            └── AppRoutes.jsx      # React Router with ProtectedRoute guard
```

---

## 👥 Supported User Roles

1. **ADMIN**: Full administrative governance across units, accounts, and system configuration.
2. **OWNER**: Unit ownership management, maintenance billing, tenant approvals, voting.
3. **TENANT**: Resident access, visitor gatepasses, amenities, complaints.
4. **FAMILY_MEMBER**: Household access, pre-approved visitor entries, announcements.
5. **SECURITY**: Gate console, visitor log, vehicle registry, entry/exit checks.
6. **COMMITTEE_MEMBER**: Society management committee audits, resolutions, budgets.

---

## 🔑 Demo Seed Accounts

Each role is pre-seeded in the MySQL `users` table for rapid testing:

| Role | Email | Password | Flat / Unit |
|---|---|---|---|
| **ADMIN** | `admin@myvms.com` | `Password@123` | Admin Office (Block A) |
| **OWNER** | `owner@myvms.com` | `Password@123` | Unit 402 (Tower B) |
| **TENANT** | `tenant@myvms.com` | `Password@123` | Unit 204 (Tower A) |
| **FAMILY_MEMBER** | `family@myvms.com` | `Password@123` | Unit 402 (Tower B) |
| **SECURITY** | `security@myvms.com` | `Password@123` | Main Gate (Gate 1) |
| **COMMITTEE_MEMBER** | `committee@myvms.com` | `Password@123` | Unit 501 (Tower C) |

---

## 🚀 Running the Project

### 1. Backend

```bash
cd backend
npm install
npm run db:migrate    # Runs schema creation and seeds default test users
npm run dev           # Starts backend server on port 5050
```

- **Base API**: `http://localhost:5050/api/v1`
- **Health Check**: `http://localhost:5050/api/v1/health`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev           # Starts Vite dev server on port 5173
```

- **Frontend URL**: `http://localhost:5173`
- The frontend proxies `/api` calls directly to the backend at `http://localhost:5050`.

---

## 🛡️ Architecture Guarantees Met

- **No business logic in React components**: All auth, session persistence, and data handling reside in `authService.js` and `authStore.js`.
- **No SQL queries in route files**: All SQL queries are encapsulated inside `user.repository.js`.
- **Decoupled layers**: Routes ➔ Controllers ➔ Services ➔ Repositories ➔ Database Pool.
- **Centralized error handling**: `ApiError` class and Express `errorHandler` middleware.
- **Environment config**: All secrets, hosts, and ports managed via `.env`.
