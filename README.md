# HostelHQ

Internal hostel management system for Android.

**Backend:** Django + DRF + PostgreSQL (Docker)  
**Frontend:** React Native (Expo)

---

## Project Structure

```
NestOPS-app/
├── backend/          # Django REST API
├── mobile/           # React Native (Expo) Android app
└── docker-compose.yml
```

---

## Local Development Setup

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- Expo CLI: `npm install -g expo-cli eas-cli`
- Android Studio (for emulator) or a physical Android device with Expo Go

### 1. Backend (Docker)

```bash
# Copy and fill in env vars
cp backend/.env.example backend/.env

# Start PostgreSQL + Django
docker-compose up --build

# On first run, create tables and a superuser (Owner account)
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

The API will be available at `http://localhost:8000/api/`  
Django Admin: `http://localhost:8000/admin/`  
API Docs (Swagger): `http://localhost:8000/api/docs/`

### 2. Mobile App

```bash
cd mobile

# Install dependencies (already done if you ran npm install)
npm install

# Set your backend URL
# Edit mobile/src/api/client.ts → API_BASE_URL
# For Android Emulator: http://10.0.2.2:8000/api
# For physical device on same WiFi: http://<your-machine-LAN-IP>:8000/api

# Start Expo dev server
npx expo start

# Or run directly on Android emulator
npx expo run:android
```

---

## Creating the First Owner Account

After running `python manage.py createsuperuser`:

1. Visit `http://localhost:8000/admin/`
2. Edit the user you just created
3. Set `role = owner`
4. Save

Then log into the mobile app with those credentials.

---

## Building an Installable APK (EAS Build)

```bash
cd mobile

# Install EAS CLI if not already
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure your project (first time only)
eas build:configure

# Build a preview APK (internal distribution, no Play Store needed)
eas build --platform android --profile preview
```

The APK download link will appear in the EAS dashboard. Share it with staff via WhatsApp/email; they can install it directly.

---

## API Endpoints Summary

| Module       | Endpoint                          | Notes                              |
|-------------|-----------------------------------|------------------------------------|
| Auth         | `POST /api/auth/login/`           | Returns JWT tokens + user info     |
| Auth         | `GET /api/auth/me/`               | Current user profile               |
| Auth         | `GET/POST /api/auth/staff/`       | Owner only — manage staff accounts |
| Sharing Types| `GET/POST /api/rooms/sharing-types/` | Fee tier management (Owner only) |
| Rooms        | `GET/POST /api/rooms/`            | Room CRUD                          |
| Beds         | `GET /api/rooms/{id}/beds/`       | Beds for a room                    |
| Residents    | `GET/POST /api/residents/`        | Searchable, filterable             |
| Residents    | `POST /api/residents/{id}/checkout/` | Check out a resident            |
| Payments     | `GET/POST /api/fees/`             | Payment CRUD                       |
| Dues         | `GET /api/fees/dues/`             | All pending dues (sorted by overdue)|
| Resident Dues| `GET /api/fees/resident/{id}/dues/` | Per-resident due breakdown       |
| Expenses     | `GET/POST /api/expenses/`         | Expense CRUD                       |
| Expense Summary | `GET /api/expenses/summary/`   | Monthly totals by category         |
| Dashboard    | `GET /api/reports/dashboard/`     | All stats for home screen          |

---

## Role Permissions

| Action                          | Owner | Staff |
|--------------------------------|-------|-------|
| View all data                   | ✅    | ✅    |
| Record payments / expenses      | ✅    | ✅    |
| Add/edit residents, rooms       | ✅    | ✅    |
| Delete records                  | ✅    | ❌    |
| Manage sharing types/fee rates  | ✅    | ❌    |
| Manage staff accounts           | ✅    | ❌    |

---

## Tech Stack

| Layer        | Technology                        |
|-------------|-----------------------------------|
| Backend      | Django 5.x + DRF                  |
| Database     | PostgreSQL 16                     |
| Auth         | JWT (djangorestframework-simplejwt)|
| Containers   | Docker + docker-compose           |
| Mobile       | React Native + Expo SDK           |
| Charts       | Victory Native                    |
| State        | Zustand + TanStack Query          |
| APK Build    | EAS Build                         |
