# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

All commands run from the project root:

```bash
npm run dev      # dev server at http://localhost:5173
npm run build    # production build → dist/
npm run lint     # eslint check (no --fix)
npm run preview  # serve the production build locally
```

No TypeScript — the parent `AGENTS.md` rule about `npx tsc --noEmit` does not apply here. Post-edit verification is `npx eslint .` only.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection provided by the Vercel integration |
| `VITE_WRITE_TOKEN` | Secret token for the write link — keep private |
| `VITE_ZOO_EMAIL` | Zoo notification recipient |
| `BLOB_READ_WRITE_TOKEN` | Existing Blob credentials, needed only for initial data migration |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Legacy credentials used only if no Blob data is present |

**Write link:** `https://<deployed-url>?token=<VITE_WRITE_TOKEN>` — share this with hunters. Public URL (no token) is read-only.

## Architecture

Single-component Vite + React app. **`src/App.jsx` is the main UI file**. There is no router, no context, no state library — just React hooks and the same-origin `/api/state` endpoint.

### Storage API: `api/state.js`

Vercel Function stores entries and archive history in Neon Postgres. The API creates its tables and imports existing Blob state on first access; authorized POST requests add entries or archive the active set. The existing `?token=` write link is unchanged.

### Key constants (top of `src/App.jsx`)

| Constant | Purpose |
|----------|---------|
| `ZOO_EMAIL` | Recipient for the "full" notification mailto link |
| `MAX_UNITS` | Total capacity (100 units = 100 %) |
| `WILD` | Array of game sizes with unit weights (5 / 15 / 30) |

### Styling

All styles are inline (`style={{}}`). The `F` object at the top of `src/App.jsx` is the entire design token set (colors). There is no CSS module, no Tailwind, no styled-components. `src/index.css` is intentionally empty.

### State shape

```js
{ einlagerungen: Array<Entry>, einheiten: number }
```

`einheiten` is the sum of active entry weights. The Neon archive preserves entries after collection; state is fetched through `/api/state` on mount.

On first API access, the endpoint imports legacy Blob entries, or Supabase entries if no Blob state is present. Keep the old storage environment variables until the first successful import, verify the data in Neon, then remove them.

### UI flow (multi-step form)

`schritt` state drives which panel renders: `"start"` → `"name"` → `"groesse"` → `"bestaetigt"` (auto-returns to `"start"` after 3 s). Full modal overlay fires once when capacity first crosses 100. Add/reset UI is only rendered when `canWrite` is true (URL token matches `VITE_WRITE_TOKEN`).
