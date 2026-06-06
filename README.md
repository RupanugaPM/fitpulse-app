# FitPulse — Active Break Coach

A fitness PWA with **smart workout reminders**, **custom rep-based plans**, **SQL-backed accounts** (Google, GitHub, email), and an **AI push-up camera** that counts reps and awards XP.

## Features

| Feature | Description |
|---------|-------------|
| **Interval reminders** | Any interval from 5–480 minutes; active hours & days; rolls to the next active day when outside your window |
| **Custom workout plans** | Build your own routines; default **Daily 10×4** (10 push-ups, sit-ups, squats, pull-ups) |
| **10 workout library** | Guided sessions with timers |
| **AI push-up tracker** | Webcam + MoveNet pose AI counts reps |
| **XP & levels** | 15 XP per rep + session bonuses, synced to SQL when signed in |
| **Auth** | Email/password, Google OAuth, GitHub OAuth |
| **Apple Watch** | Pair via 6-digit code; sync push-ups & XP from iOS companion |
| **Progress** | Streaks, charts, push-up stats, history |
| **PWA** | Installable app (Add to Home Screen) |

## Prerequisites

- **Node.js 18+** and npm
- A modern browser with camera access (for AI push-ups)
- Two terminal windows (frontend + API server)

## How to run locally

### 1. Clone and install

```bash
git clone https://github.com/RupanugaPM/fitpulse-app.git
cd fitpulse-app
npm install
cd server
npm install
cd ..
```

### 2. Configure environment

**Frontend** (optional — defaults work for local dev):

```bash
cp .env.example .env
```

**API server** (required for login & XP sync):

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set at minimum:

```env
JWT_SECRET=your-long-random-secret-string
```

OAuth keys (`GOOGLE_*`, `GITHUB_*`) are optional — email/password auth works without them.

### 3. Start the app (two terminals)

**Terminal 1 — API server** (port 3001):

```bash
cd server
npm run dev
```

You should see: `FitPulse API running on http://localhost:3001`

**Terminal 2 — frontend** (port 5173):

```bash
# from project root
npm run dev
```

Open **http://localhost:5173** in your browser.

Vite proxies `/api` requests to the backend automatically.

### 4. Production build (optional)

```bash
# Frontend static build → dist/
npm run build
npm run preview

# API server (production)
cd server
npm start
```

## First-time setup in the app

1. Complete onboarding (set reminder interval — presets or custom minutes).
2. Enable reminders under **Reminders**; default break workout is **Daily 10×4**.
3. Create custom plans under **Workouts → New plan** or **/plans**.
4. Sign in via **Settings** to sync XP and push-up stats to SQLite.

## Reminders

- Set any interval between **5 and 480 minutes**.
- Configure **active hours** (e.g. 9 AM–6 PM) and **active days**.
- When the current time is outside your window, the next reminder shows as **Tomorrow at …** (or the next active day).
- Keep the tab open or install as a PWA for reliable nudges.

## OAuth setup (optional)

### Google

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client ID (Web)
2. Redirect URI: `http://localhost:3001/api/auth/google/callback`
3. Add to `server/.env`:

```env
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
```

### GitHub

1. [GitHub Developer Settings](https://github.com/settings/developers) → OAuth App
2. Callback URL: `http://localhost:3001/api/auth/github/callback`
3. Add to `server/.env`:

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## AI push-ups

1. Open the **Pushups** tab
2. Allow camera access (side view works best)
3. Tap **Start counting** and do push-ups
4. Tap **Save & earn XP** (sign in to persist to SQL)

XP: **15 XP × reps** + bonuses at 10/20/30/50 rep milestones.

## Database (SQLite)

- File: `server/data/fitpulse.db` (auto-created on first API start)
- Tables: `users`, `oauth_accounts`, `pushup_sessions`, `xp_events`, `refresh_tokens`, wearables

## Apple Watch & wearables

1. Sign in → **Settings** → **Devices & Apple Watch**
2. Tap **Connect Apple Watch** and copy the 6-digit code
3. Use the [iOS companion](mobile/ios-companion/README.md) to pair and sync

## Project structure

```
fitpulse-app/
  src/           React frontend (pages, hooks, store, AI push-up tracker)
  server/        Express API + SQLite
  mobile/        iOS companion scaffold
```

## API routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Email sign-up |
| POST | `/api/auth/login` | Email sign-in |
| GET | `/api/auth/google` | Google OAuth |
| GET | `/api/auth/github` | GitHub OAuth |
| GET | `/api/auth/me` | Current user |
| POST | `/api/pushups/sessions` | Log push-up session + XP |
| GET | `/api/pushups/stats` | XP / level / totals |
| POST | `/api/wearables/pair/start` | Start Watch pairing |
| POST | `/api/wearables/pair/confirm` | Complete pairing (iOS) |
| POST | `/api/wearables/sync` | Sync from Watch |
| GET | `/api/wearables/devices` | List connected devices |

## Tech stack

**Frontend:** React, Vite, TypeScript, Zustand, TensorFlow.js, MoveNet  
**Backend:** Express, SQLite, JWT, Passport (Google/GitHub)

## License

MIT
