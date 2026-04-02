# CampusClean — University Cleaning & Complaint Management System

A production-ready web application for managing university room cleaning operations, complaint workflows, and classroom schedules through QR code access. Built with React, TypeScript, and Lovable Cloud (Supabase).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [User Roles & Permissions](#user-roles--permissions)
- [Main Workflows](#main-workflows)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Backend Setup (Lovable Cloud)](#backend-setup-lovable-cloud)
- [Installation & Local Development](#installation--local-development)
- [Deployment](#deployment)
- [How University Staff Should Use the System](#how-university-staff-should-use-the-system)
- [Troubleshooting](#troubleshooting)
- [Maintenance Notes](#maintenance-notes)
- [Demo Credentials](#demo-credentials)

---

## Project Overview

**CampusClean** solves the problem of tracking cleaning quality and handling hygiene complaints across university buildings. Each room has a QR code; scanning it shows the room's schedule, allows complaint submission, and provides role-based access to cleaning or management tools.

**Who uses it:**
- University administrators (full system control)
- Building/floor managers (room oversight)
- Cleaning staff (task checklists)
- Students/faculty (complaint submission via QR)
- Guests (anonymous complaint submission)

---

## Features

- **QR Code Flow** — Each room has a unique QR code. Scanning opens a landing page with timetable, complaint form, and login.
- **Weekly Timetable Grid** — Mon–Fri, 08:00–17:00 grid on the QR page with the current lesson highlighted in green.
- **Anonymous & Authenticated Complaints** — Guests submit without login; logged-in users get tracked complaints.
- **Cleaning Checklists** — Cleaners complete room-specific checklists (floor, desks, trash, glass, toilet).
- **Role-Based Dashboards** — Each role sees relevant data on the dashboard.
- **Room Management** — CRUD for rooms with assigned managers and cleaners.
- **Schedule Management** — Add/edit/delete lessons per room. Bulk import via CSV.
- **User Management** — Admin creates/edits users, changes roles and passwords securely via Edge Function.
- **System Settings** — Admin controls site name, anonymous complaints, QR page visibility, and more. Settings propagate across the entire app.
- **Notifications** — In-app notification system.
- **Reports** — Complaint and cleaning analytics with charts.
- **i18n** — English and Turkish language support.
- **Realtime Updates** — Cleaner page auto-refreshes when rooms, complaints, or cleaning records change.

---

## User Roles & Permissions

| Role | Can Do |
|---------|--------|
| **Guest** | View QR page, submit anonymous complaints |
| **User** | Submit complaints (authenticated), view own complaints |
| **Cleaner** | View assigned rooms, submit cleaning records, see open complaints for those rooms |
| **Manager** | Manage assigned rooms, view/resolve complaints, manage schedules for assigned rooms |
| **Admin** | Full access: manage all rooms, users, settings, schedules, complaints, reports |

---

## Main Workflows

### QR Code Flow
1. QR code is generated per room (Admin → QR Management).
2. User scans QR → opens `/qr/{token}`.
3. Page shows: room info → timetable grid → complaint button → login button → last cleaning time.
4. If logged in, user is auto-redirected based on role (cleaner → cleaning page, user → complaint page, manager/admin → room detail).

### Complaint Creation
- **Anonymous:** From QR page → "Submit Anonymous Complaint" → select type, priority, description → submit.
- **Authenticated:** Logged-in users redirected to complaint form linked to their account.
- Rate limiting prevents spam (max 5 per hour per session).

### Cleaning Workflow
1. Cleaner logs in → Dashboard shows assigned rooms.
2. Cleaner opens a room → completes checklist items → adds optional notes → submits.
3. Room's `last_cleaned_at` updates automatically via database trigger.
4. Cleaning record appears in room timeline and reports.

### Schedule Management
- **Manual:** Room Detail → Schedule tab → "Add Lesson" → fill subject, day, time, instructor.
- **CSV Import:** Room Detail → Schedule tab → "Import Schedule from CSV" → download template, fill, upload. Preview with validation before import.
- Schedules appear on QR page as a weekly timetable grid.

### Settings
- Admin → Settings page → change site name, toggle anonymous complaints, control QR page visibility.
- Changes take effect immediately across the app (navbar, login page, QR page).

### User Creation & Editing
- Admin → Users page → "Create User" → institution number, name, role, password.
- Edit: change name, role, active status, password (secure server-side via Edge Function).

---

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui base components
│   ├── AppLayout.tsx    # Main layout with sidebar navigation
│   ├── QRTimetableGrid.tsx  # Weekly timetable grid component
│   ├── ScheduleCSVImport.tsx # CSV import for schedules
│   ├── StatusBadges.tsx # Status/priority/role badge components
│   └── LanguageSwitcher.tsx
├── contexts/
│   ├── AuthContext.tsx   # Authentication state & methods
│   └── SettingsContext.tsx # System settings provider
├── i18n/
│   ├── LanguageContext.tsx # Language provider
│   └── translations.ts   # EN/TR translations
├── pages/               # Route pages
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── RoomsPage.tsx / RoomDetailPage.tsx
│   ├── CleaningPage.tsx / CleaningRoomPage.tsx
│   ├── ComplaintsPage.tsx
│   ├── QRLandingPage.tsx  # Public QR page
│   ├── AnonymousComplaintPage.tsx
│   ├── UsersPage.tsx
│   ├── SettingsPage.tsx
│   ├── ReportsPage.tsx
│   ├── NotificationsPage.tsx
│   └── QRManagementPage.tsx
├── integrations/supabase/
│   ├── client.ts        # Auto-generated Supabase client
│   └── types.ts         # Auto-generated database types
└── App.tsx              # Routes & providers

supabase/
├── config.toml          # Supabase project config
├── functions/
│   ├── create-user/     # Edge Function for secure user creation/editing
│   └── seed-data/       # Edge Function for demo data seeding
└── migrations/          # SQL migrations (auto-managed)
```

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (id matches auth.users). Fields: full_name, institution_number, role, is_active, email |
| `user_roles` | Role lookup table (synced via trigger from profiles) |
| `rooms` | Room/classroom records. Fields: room_name, room_number, building, floor, room_type, qr_token, manager_id, cleaner_id, last_cleaned_at |
| `class_schedules` | Lesson timetable entries. Fields: room_id, day_of_week (0-6), start_time, end_time, subject_name, instructor_name, semester, is_active |
| `complaints` | Complaint records. Fields: room_id, user_id (nullable for anon), complaint_type, priority, status, guest_name, description |
| `cleaning_records` | Cleaning submissions. Fields: room_id, cleaner_id, status (completed/partial), notes |
| `cleaning_record_items` | Individual checklist items per cleaning record |
| `room_timelines` | Activity log per room |
| `notifications` | In-app notifications per user |
| `complaint_rate_limit` | Rate limiting for anonymous complaints |
| `system_settings` | Key-value settings store |

### Enums
- `app_role`: admin, manager, cleaner, user
- `room_type`: classroom, office, meeting_room, laboratory, toilet_wc, corridor
- `complaint_status`: new, in_review, resolved, closed
- `complaint_priority`: low, medium, high
- `cleaning_status`: completed, partial

### Key Database Functions
- `has_role(user_id, role)` — Security definer function for RLS checks
- `get_user_role(user_id)` — Returns user's role from profiles
- `sync_user_roles()` — Trigger that syncs profiles.role → user_roles table
- `update_room_last_cleaned()` — Trigger that updates rooms.last_cleaned_at on new cleaning record

### Realtime
Tables `rooms`, `cleaning_records`, and `complaints` are enabled for Postgres realtime, allowing the Cleaner page to auto-update.

---

## Backend Setup (Lovable Cloud)

This project uses **Lovable Cloud** which provides a fully managed backend. No external Supabase account needed.

### Environment Variables (auto-configured)
- `VITE_SUPABASE_URL` — Backend API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Public anon key

### Auth Setup
- Authentication uses institution number + password
- Internally mapped to `{institution_number}@internal.local` email
- User creation handled securely via Edge Function (`create-user`)
- Email auto-confirm is enabled (no email verification needed)

### Row Level Security (RLS)
All tables have RLS enabled. Key policies:
- **Rooms/Schedules**: Readable by everyone (needed for QR page). Writable by admin; managers can write to assigned rooms.
- **Complaints**: Anon can insert. Authenticated users can insert their own. Admin/managers can update.
- **Cleaning Records**: Only cleaners can insert for themselves. Admin/managers can read.
- **Settings**: Everyone can read. Only admin can write.
- **Profiles**: Everyone authenticated can read. Admin can insert/update/delete. Users can update own.

### Edge Functions
- `create-user`: Securely creates/updates auth users and profiles. Admin-only.
- `seed-data`: Seeds demo data for testing.

---

## Installation & Local Development

### Prerequisites
- Node.js 18+ or Bun
- A Lovable account (for backend)

### Setup
```bash
# Clone the repository
git clone <repo-url>
cd <project-dir>

# Install dependencies
npm install  # or: bun install

# Environment variables are auto-configured by Lovable Cloud
# If running locally with external Supabase, create .env:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Start development server
npm run dev  # or: bun dev
```

The app will be available at `http://localhost:5173`.

### Seeding Demo Data
After first deployment, invoke the seed-data edge function to create demo rooms and users (see Demo Credentials below).

---

## Deployment

### Via Lovable (Recommended)
1. Push changes through the Lovable editor.
2. Click "Publish" to deploy to production.
3. The published URL is provided automatically.

### Manual Deployment
```bash
npm run build  # Creates dist/ folder
# Deploy dist/ to any static hosting (Vercel, Netlify, etc.)
```

### Post-Deployment Checks
1. Verify login works with demo credentials.
2. Scan a QR code URL to test the landing page.
3. Submit a test complaint.
4. Check the settings page saves and propagates correctly.
5. Verify the timetable grid renders on QR pages.

---

## How University Staff Should Use the System

### Administrators
1. Log in with admin credentials.
2. **Users**: Create accounts for managers, cleaners, and regular users from the Users page.
3. **Rooms**: Add rooms from the Rooms page. Assign a manager and cleaner to each room.
4. **Schedules**: Open a room → Schedule tab → Add lessons manually or import via CSV.
5. **QR Codes**: Go to QR Management → generate and download/print QR codes for each room.
6. **Settings**: Configure site name, toggle anonymous complaints, control QR page display options.
7. **Reports**: View cleaning and complaint analytics.

### Managers
1. Log in → see assigned rooms on the dashboard.
2. Open rooms to view complaints, cleaning history, and schedules.
3. Resolve complaints by updating their status.
4. Add or edit classroom schedules for assigned rooms.

### Cleaners
1. Log in → see assigned rooms on the dashboard and Cleaning page.
2. Tap a room → complete the cleaning checklist → submit.
3. The room's "last cleaned" timestamp updates automatically.
4. New complaints and room changes appear in real-time.

### Students / Faculty (QR Users)
1. Scan the QR code on the classroom door.
2. View the weekly timetable — current lesson is highlighted in green.
3. Submit a complaint if there's a cleanliness issue (no login required).
4. Optionally log in for tracked complaint history.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Can't log in** | Verify institution number and password. Accounts are created by Admin only. |
| **User creation fails** | Check the Edge Function logs. Ensure institution number isn't already taken. |
| **Room edit/delete not working** | Only Admin can delete rooms. Managers can edit assigned rooms only. |
| **Schedule not appearing on QR page** | Verify `show_today_schedule_on_qr_page` and `show_weekly_schedule_on_qr_page` are enabled in Settings. Check that the room has active schedule entries. |
| **Current lesson not highlighted** | Highlighting uses browser local time. Ensure lessons have correct `day_of_week` (0=Sun, 1=Mon, ..., 6=Sat) and `start_time`/`end_time` values. |
| **QR page not loading** | Ensure the room is active (`is_active = true`) and the QR token matches. |
| **Settings not propagating** | After saving settings, the SettingsContext refetches values. Hard refresh if needed. |
| **CSV import validation errors** | Download the template file and match column names exactly. Day can be name (Monday) or number (1). Time format: HH:MM. |
| **Cleaner page stale data** | Realtime is enabled. If data doesn't update, check network connectivity. |
| **Permission denied errors** | RLS policies restrict access by role. Verify the user's role in the profiles table matches expectations. |

---

## Maintenance Notes

- **Settings**: Managed via `system_settings` table (key-value). Add new keys by extending `SystemSettings` interface in `src/contexts/SettingsContext.tsx` and the `DEFAULT_SETTINGS` object.
- **Translations**: Add new strings to both `en` and `tr` objects in `src/i18n/translations.ts`.
- **New Room Types**: Add to the `room_type` enum via SQL migration, then update `roomTypes` array in `RoomDetailPage.tsx` and translations.
- **New Roles**: Add to `app_role` enum via migration, update RLS policies, update `ProtectedRoute` roles in `App.tsx`, and update navigation in `AppLayout.tsx`.
- **QR Page Customization**: Modify `src/pages/QRLandingPage.tsx` and `src/components/QRTimetableGrid.tsx`.
- **Schedule Import**: The CSV parser is in `src/components/ScheduleCSVImport.tsx`. To support XLSX, add a parsing library (e.g., SheetJS).

---

## Demo Credentials

| Role | Institution # | Password |
|------|--------------|----------|
| Admin | `10000001` | `Admin123!` |
| Manager | `10000002` | `Manager123!` |
| Cleaner | `10000003` | `Cleaner123!` |
| User | `10000005` | `User123!` |

> **Note:** These accounts are created by the `seed-data` Edge Function and are for development/demo purposes only. Change passwords before production use.

---

## Tech Stack

- **Frontend**: React 18, TypeScript 5, Vite 5, Tailwind CSS v3, shadcn/ui
- **Backend**: Lovable Cloud (Supabase) — PostgreSQL, Auth, Edge Functions, Realtime
- **Charts**: Recharts
- **i18n**: Custom context-based (EN/TR)

---

*Built with [Lovable](https://lovable.dev)*
