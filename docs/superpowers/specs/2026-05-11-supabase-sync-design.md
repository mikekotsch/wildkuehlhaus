# Multi-device sync via Supabase

**Date:** 2026-05-11
**Status:** Approved

## Problem

State is currently stored in `localStorage`, making it per-device. Hunters on individual phones see independent, unsynced fill levels.

## Goals

- All phones read from a shared backend on refresh
- Public URL is read-only (fill level visible to anyone)
- A secret write link enables adding entries and resetting
- No backend server to maintain

## Non-goals

- Real-time / live push updates (refresh is acceptable)
- User accounts or authentication
- Offline-first / conflict resolution

---

## Database (Supabase)

One table: `einlagerungen`

| column | type | notes |
|---|---|---|
| `id` | `bigint generated always as identity` | primary key |
| `name` | `text not null` | hunter's name |
| `groesse` | `text not null` | `K`, `M`, or `G` |
| `einheiten` | `int not null` | unit weight (5 / 15 / 30) |
| `icon` | `text not null` | emoji |
| `ts` | `timestamptz not null default now()` | log timestamp |

`einheiten` total is derived at read time by summing the column — no stored aggregate.

**Row-level security:**
- `anon` role: `SELECT` only
- Writes use the service role key, called only when `canWrite` is true in the app

---

## App architecture

No new components. Changes are confined to `src/App.jsx` plus a new `src/lib/supabase.js` for the client instance.

### New file: `src/lib/supabase.js`

Exports a single configured Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Changes to `src/App.jsx`

**Removed:**
- `laden()` function (localStorage read)
- `STORAGE_KEY` constant
- `useEffect` that writes to localStorage on state change

**Added:**
- `useEffect` on mount: fetch all rows from `einlagerungen` ordered by `ts DESC`, derive `einheiten` by summing, set state
- `canWrite` state: `true` if `?token=` query param matches `VITE_WRITE_TOKEN`
- `loading` state: `true` while fetch is in flight — disables the add button
- `error` state: set on fetch failure

**Modified:**
- `einlagern()`: `INSERT` row into Supabase, then re-fetch to update state
- `reset()`: `DELETE` all rows from Supabase, write `new Date().toISOString()` to `localStorage` key `kuehlhaus_last_reset`, then clear state
- "Wild einlagern" button and reset control: only render when `canWrite` is true

### Error state

On connection failure, the app shows "Verbindungsfehler – bitte neu laden". Below that, if `localStorage` key `kuehlhaus_last_reset` exists, it shows "Zuletzt geleert: [formatted date]". If the key is absent (never reset), that line is omitted. No retry logic.

### Loading state

While fetch is in flight on mount, the add button is disabled. No skeleton UI.

---

## Environment variables

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...        # safe to expose — anon read-only
VITE_WRITE_TOKEN=...              # secret; shared with hunters via write link
```

Stored in `.env.local` (gitignored) for local dev. Set in Netlify/Vercel deploy settings for production.

`.env.local` added to `.gitignore` (already present via Vite's default).

---

## Write link

```
https://wildkuehlhaus.example.com?token=<VITE_WRITE_TOKEN>
```

`canWrite` is session state only — not persisted. Refreshing without the token reverts to read-only.

---

## Dependencies

One new package: `@supabase/supabase-js`
