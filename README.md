# CampusClean

CampusClean helps a university keep track of room cleaning, complaints, and class schedules. Each room can have a QR code that opens its schedule and, where available, a complaint form.

## What it does

- Staff can manage rooms, cleaners, schedules, and complaints.
- Cleaners can record completed tasks for their assigned rooms.
- Students and visitors can scan a room's QR code and report a problem.
- Administrators can manage users and view reports.
- The interface supports English and Turkish.

## Run locally

You need Node.js and access to the project's Supabase backend.

```bash
git clone https://github.com/mojaheddansh/spot-clean-central.git
cd spot-clean-central
npm install
npm run dev
```

Open `http://localhost:8080` in your browser.

The app reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`. To use a different backend, set those values for your Supabase project.

## Other commands

```bash
npm run build
```

The frontend is built with React, TypeScript, and Vite. The backend uses Supabase for authentication and data storage.
