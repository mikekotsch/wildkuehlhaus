# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Commands

Run from the project root:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

There is no TypeScript. Run `npx eslint .` after code changes.

## Environment variables

| Variable | Purpose |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access for API functions |
| `VITE_WRITE_TOKEN` | Token in the existing write URL |
| `VITE_ZOO_EMAIL` | Zoo notification recipient |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Legacy credentials used only for initial import |

The write link remains `https://<deployed-url>?token=<VITE_WRITE_TOKEN>`.
Connect a Vercel Blob store to the project. Keep the Supabase variables through
the first successful state request after deployment; that request imports the
existing entries and archive. Remove the old variables only after verifying the
import.

## Architecture

The UI is a single Vite + React component in `src/App.jsx`. It calls the
same-origin `/api/state` Vercel Function. That API stores each entry in private
Vercel Blob storage and returns active entries; archiving retains entries in
storage with `abgeholt_am` set. The one-time import from Supabase is performed
by the API when it first initializes the Blob store.

The app state is `{ einlagerungen: Array<Entry>, einheiten: number }`, where
`einheiten` is the sum of active entries. The entry log drives the protocol and
the zoo notification email.

All styles are inline. `F` in `src/App.jsx` contains the design colors.
`src/index.css` is intentionally empty.

The form flow is `"start"` → `"name"` → `"groesse"` → `"bestaetigt"` (returns
to start after three seconds). The full-capacity modal fires when capacity
first reaches 100%. Add and archive controls appear when the URL token matches
`VITE_WRITE_TOKEN`.
