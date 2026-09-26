# Project Structure

This file documents the overall architecture and directory structure of the NestOPS-app, outlining both the Django backend and the React Native (Expo) mobile frontend.

## High-Level Architecture

```
NestOPS-app/
├── backend/            # Django REST API (PostgreSQL + DRF)
├── mobile/             # React Native (Expo) Android App
├── docker-compose.yml  # Docker environment setup
└── README.md           # Project documentation and setup instructions
```

---

## Backend (`/backend`)
The backend is built with Django and Django REST Framework (DRF), following a modular, multi-tenant app structure.

```
backend/
├── apps/               # Django Applications
│   ├── accounts/       # User management, authentication, owner/staff roles, multi-tenancy
│   ├── core/           # Core utilities and shared behaviors (if any)
│   ├── expenses/       # Expense tracking (categories and expenses)
│   ├── fees/           # Payment recording, dues calculations, verification
│   ├── hostels/        # Hostel profiles, multi-tenancy entry point
│   ├── reports/        # Dashboard summaries, P&L calculations
│   └── residents/      # Resident management, documents, check-in/out
│   └── rooms/          # Room configurations, bed management, sharing types
│
├── config/             # Project Configuration
│   ├── settings/       # Split settings for base, local, and production environments
│   ├── urls.py         # Root URL routing for the API
│   └── wsgi.py         # WSGI entry point
│
├── manage.py           # Django management script
├── Dockerfile          # Docker configuration for backend container
├── requirements.txt    # Python dependencies
└── .env                # Environment variables
```

### Backend Key Architectural Decisions:
- **Multi-Tenancy:** Driven by `accounts.User` where `owner_account` sets the boundary. Data belonging to a specific Owner is securely isolated.
- **Role-Based Access Control:** Distinguishes between `Owner` (full access, fee tiers, staff management) and `Staff` (restricted, operational execution).
- **JWT Authentication:** Managed via `rest_framework_simplejwt`.

---

## Mobile (`/mobile`)
The frontend is a React Native app bootstrapped with Expo. State management uses Zustand and data fetching/caching relies on TanStack React Query.

```
mobile/
├── App.tsx             # App Entry Point, Providers (QueryClient), RootNavigator
├── app.json            # Expo configuration
├── babel.config.js     # Babel transpiler configuration
├── package.json        # Node dependencies and scripts
│
└── src/
    ├── api/            # API client and feature-specific endpoints
    │   ├── client.ts   # Axios instance with interceptors for auth tokens
    │   ├── auth.ts
    │   ├── expenses.ts
    │   ├── fees.ts
    │   ├── hostels.ts
    │   ├── intake.ts
    │   ├── reports.ts
    │   ├── residents.ts
    │   └── rooms.ts
    │
    ├── components/     # Reusable UI components
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── HostelSwitcherBar.tsx
    │   ├── Input.tsx
    │   ├── ListItem.tsx
    │   └── ScreenContainer.tsx
    │
    ├── navigation/     # React Navigation setup
    │   └── RootNavigator.tsx # Stacks and Tab Navigation definitions
    │
    ├── screens/        # Feature screens
    │   ├── auth/       # LoginScreen, RegisterScreen
    │   ├── dashboard/  # DashboardScreen (Charts, pending dues, stats)
    │   ├── expenses/   # AddExpenseScreen, ExpenseListScreen
    │   ├── fees/       # DuesListScreen, PaymentListScreen, RecordPaymentScreen, PendingVerificationScreen
    │   ├── residents/  # ResidentList, ResidentCreate, ResidentDetail, ResidentEdit
    │   ├── rooms/      # RoomList, RoomCreate, RoomDetail, RoomEdit
    │   └── settings/   # SettingsScreen (Staff accounts, Fee Tiers, QR Codes)
    │
    ├── store/          # Zustand global state management
    │   ├── authStore.ts    # Manages user session and JWT tokens
    │   └── hostelStore.ts  # Persisted active hostel context selection
    │
    ├── theme/          # UI Theme system
    │   └── index.ts    # Colors, spacing, typography, borders
    │
    └── utils/          # Helper functions
        └── formatters.ts   # Currency and date formatters
```

### Mobile Key Architectural Decisions:
- **State Management:** Zustand is used for simple, un-opinionated global state (like active user or selected hostel).
- **Data Fetching:** `@tanstack/react-query` is heavily used to handle caching, loading states, and refetching of API responses automatically.
- **Navigation:** `@react-navigation/bottom-tabs` handles the core sections, while stacked navigators handle nested views within tabs.
- **Styling:** React Native `StyleSheet` objects paired with a centralized `theme` dictionary for a consistent design system (Colors, Spacing, Typography).
