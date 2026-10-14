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
| `wildkuehlhaus_DATABASE_URL` | Shared Neon Postgres connection provided by the Vercel integration |
| `VITE_WRITE_TOKEN` | Token in the existing write URL |
| `VITE_ZOO_EMAIL` | Zoo notification recipient |
| `BLOB_READ_WRITE_TOKEN` | Existing Blob credentials, needed only for initial data migration |

The write link remains `https://<deployed-url>?token=<VITE_WRITE_TOKEN>`.
The Neon integration provides `wildkuehlhaus_DATABASE_URL`. The API also
accepts `DATABASE_URL` as a fallback. Keep the Blob token through the
first successful state request after deployment, verify that existing entries
and archive are in Neon, then remove the Blob token.

## Architecture

The UI is a single Vite + React component in `src/App.jsx`. It calls the
same-origin `/api/state` Vercel Function. That API stores entries in Neon
Postgres and returns active entries; archiving retains entries with
`abgeholt_am` set. On first access it imports existing entries from the previous
Blob store.

The app state is `{ einlagerungen: Array<Entry>, einheiten: number }`, where
`einheiten` is the sum of active entries. The entry log drives the protocol and
the zoo notification email.

All styles are inline. `F` in `src/App.jsx` contains the design colors.
`src/index.css` is intentionally empty.

The form flow is `"start"` → `"name"` → `"groesse"` → `"bestaetigt"` (returns
to start after three seconds). The full-capacity modal fires when capacity
first reaches 100%. Add and archive controls appear when the URL token matches
`VITE_WRITE_TOKEN`.
