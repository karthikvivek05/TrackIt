# TrackIt

A full-stack, installable **PWA** that tracks your **DSA progress** through
[Striver's A2Z DSA Sheet](https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/)
and also works as a generic **productivity tracker** (habits, counters, durations,
and checklists).

- **Frontend:** React (Vite) + TypeScript + Tailwind CSS + React Router + Recharts
- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (email + password) - register, login, logout
- **PWA:** vite-plugin-pwa + Workbox (app-shell precache, offline sheet, network-first API)

---

## Features

### DSA Tracker
- A2Z hierarchy: **Step → Sub-step → Problem**, seeded from an editable JSON file.
- Per-problem progress: **status**, **starred**, **notes (Markdown)**, **date solved**,
  **time taken**, **attempts**, **history**.
- Accordion view with progress bars at every level, search + filters (status /
  difficulty / step / starred), one-click solved checkbox, and a problem detail drawer.
- **Revision Queue** using simple spaced repetition (3 → 7 → 21 days).
- **Dashboard:** overall %, solved by difficulty, step-wise chart, current/longest
  streak, GitHub-style activity heatmap, "continue where you left off", daily goal.

### Custom Trackers
- Four types: **Habit**, **Counter**, **Duration**, **Checklist** (with due dates).
- **Today** page shows all trackers as cards for one-tap logging.
- Each tracker has its own page with a calendar, streak/summary, and a 30-day chart.

### General
- Dark mode, responsive/mobile-friendly UI, safe-area insets, 44px tap targets.
- Export / import all data as JSON.
- Offline-first: tick problems, write notes, and log entries while offline; queued in
  IndexedDB (Dexie) and synced on reconnect (Background Sync + `online` event).
- Status indicator: **Online / Offline / Syncing / Synced**.
- Custom "Install app" button + iOS "Add to Home Screen" hint, and an update toast.

---

## Folder structure

```
trackit/
├── client/                 # React + Vite + Tailwind + PWA
│   ├── public/icons/       # pwa-192, pwa-512, maskable-512
│   ├── src/
│   │   ├── components/     # ui kit, Layout, ProblemDrawer
│   │   ├── context/        # Auth, Theme, Network (online/sync/install)
│   │   ├── hooks/          # useDSA, useTrackers
│   │   ├── lib/            # api, endpoints, db (Dexie), sync, stats, utils, types
│   │   ├── pages/          # Auth, Dashboard, DSATracker, RevisionQueue, Today,
│   │   │                   # TrackerDetail, Settings
│   │   ├── sw.ts           # service worker (injectManifest)
│   │   └── App.tsx, main.tsx
│   └── vite.config.ts      # vite-plugin-pwa config
├── server/
│   ├── data/a2z.json       # ← generated A2Z dataset
│   ├── data/source/striver.txt # ← complete imported mapping source
│   └── src/
│       ├── config/         # env, db
│       ├── models/         # User, Step, Progress, Tracker, Entry
│       ├── controllers/    # auth, dsa, trackers, data (export/import)
│       ├── routes/         # /api/auth, /api/dsa, /api/trackers, /api
│       ├── middleware/     # auth, asyncHandler, error
│       ├── seed/seed.ts    # seeds a2z.json → MongoDB
│       └── index.ts
├── scripts/generate-icons.py
├── package.json            # npm workspaces (client + server)
└── README.md
```

---

## Setup

### Prerequisites
- Node.js **18+** (tested on 22)
- A MongoDB database - [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier works)
  or a local `mongod`.

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp server/.env.example server/.env
```
Edit `server/.env` and set at least:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/trackit
JWT_SECRET=some-long-random-string
```

### 3. Seed the A2Z sheet
```bash
npm run seed
```
This upserts `server/data/a2z.json` into MongoDB. Re-run any time you edit the JSON.

### 4. Run in development
```bash
npm run dev
```
- Client: http://localhost:5173 (Vite proxies `/api` → server)
- Server: http://localhost:5001 (`/api/health` for a quick check)

### Production build & run
```bash
npm run build     # builds client/ (incl. service worker) then server/
npm start         # serves API + the built client from http://localhost:5001
```

---

## Scripts

| Command                 | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Run client + server concurrently (watch mode)  |
| `npm run seed`          | Sync `a2z.json` into MongoDB                   |
| `npm run build`         | Production build (client then server)          |
| `npm start`             | Serve the built app                            |
| `npm run typecheck`     | Typecheck both workspaces                      |

---

## Adding problems to the A2Z sheet

The sheet is generated from **`server/data/source/striver.txt`** using
`scripts/convert_a2z.py`. The generated `server/data/a2z.json` drives the
application and each entry follows:

```jsonc
{
  "slug": "arrays",                 // unique step id
  "title": "Arrays",
  "order": 3,
  "subSteps": [
    {
      "slug": "arrays-easy",        // unique within the step
      "title": "Easy",
      "order": 1,
      "problems": [
        {
          "slug": "arrays-two-sum", // MUST be globally unique across the whole sheet
          "title": "Two Sum",
          "leetcodeNumber": 1,      // present when the mapping includes an LC number
          "difficulty": "Easy",     // Easy | Medium | Hard
          "links": {
            "practice": "https://leetcode.com/problems/two-sum/",
            "youtube": "",          // optional - Striver's video
            "article": ""           // optional - takeUforward article
          },
          "tags": ["array", "hashmap"]
        }
      ]
    }
  ]
}
```

- `links.youtube` and `links.article` are **optional** - leave them `""` if unknown.
- **Do not invent links.** The seeded sample only fills `practice` (LeetCode) URLs
  that are known to be real.
- After editing, run `npm run seed`. Steps removed from the JSON are deleted from the
  DB (full sync).
- All 18 steps from the supplied Striver A2Z mapping are included in the
  generated JSON, including their subsections and problem metadata. To update
  the sheet, edit the source mapping and run `python3 scripts/convert_a2z.py`,
  then run `npm run seed`.

---

## API

All endpoints except `/api/auth/register` and `/api/auth/login` require a
`Authorization: Bearer <token>` header.

| Method | Endpoint                              | Purpose                          |
| ------ | ------------------------------------- | -------------------------------- |
| POST   | `/api/auth/register`                  | Create account                   |
| POST   | `/api/auth/login`                     | Log in                           |
| GET    | `/api/auth/me`                        | Current user                     |
| PATCH  | `/api/auth/me`                        | Update name / settings           |
| GET    | `/api/dsa/sheet`                      | Full A2Z sheet                   |
| GET    | `/api/dsa/progress`                   | My progress (all problems)       |
| PATCH  | `/api/dsa/progress/:slug`             | Upsert problem progress          |
| GET    | `/api/trackers`                       | List trackers                    |
| POST   | `/api/trackers`                       | Create tracker                   |
| PATCH  | `/api/trackers/:id`                   | Update tracker                   |
| DELETE | `/api/trackers/:id`                   | Delete tracker (+ entries)       |
| GET    | `/api/trackers/entries?date=YYYY-MM-DD` | Entries for a day (Today page) |
| GET    | `/api/trackers/:id/entries?from=&to=`  | Entries for a tracker            |
| PUT    | `/api/trackers/:id/entries/:date`     | Upsert a day's entry             |
| GET    | `/api/export`                         | Export all data as JSON          |
| POST   | `/api/import`                         | Import (replace) data            |

---

## Offline / PWA notes

**Service worker strategies**
- App shell (HTML/JS/CSS/icons) is **precached**.
- `/api/dsa/sheet` is **cache-first** (the problem list loads offline).
- Other `/api` GETs are **network-first** with a cached fallback.
- Mutations are queued in **IndexedDB (Dexie)** and replayed with **latest-change-wins**
  (each write carries a `updatedAt` timestamp; the server ignores stale writes).

**Sync triggers**
1. **Background Sync** - the app registers a `trackit-sync` sync; the service worker
   listens and messages open pages to flush the queue (where supported).
2. **`online` event** - a fallback that flushes the queue immediately on reconnect.

**Testing offline mode** (needs a working build + served over `localhost` or HTTPS):
1. `npm run build && npm start`, open http://localhost:5001, log in once (caches the sheet).
2. DevTools → Application → Service Workers → check **Offline**.
3. Reload - the app shell and A2Z sheet still load; tick problems, write notes,
   log tracker entries. The status pill shows **Offline**.
4. Uncheck **Offline** - the pill shows **Syncing → Synced** and changes upload.

**Installation**
- Desktop Chrome/Edge: install icon in the address bar, or the **Install** button in the header.
- iOS Safari: **Share → Add to Home Screen** (a hint is shown in Settings).
- PWA install requires **HTTPS or localhost**.

**Lighthouse PWA audit**
- Run it against the production server (`npm start`) in an incognito window.
- The manifest, service worker, and maskable icon are configured; the offline
  problem-list cache relies on the sheet being fetched once while online.

**Reminders (optional, best-effort)**
- The Notifications API opt-in shows an in-app reminder while the app is open.
- Reliable OS-level *scheduled* notifications require a push server (not included).

**Known edge case**
- Trackers *created while offline* sync as a tracker, but log entries for them after
  they've synced (the card shows a "syncing" badge).

---

## Export / import

Settings → **Export JSON** downloads everything (user settings, progress, trackers,
entries). **Import JSON** restores it (replace semantics). Useful for backups and
switching browsers.
