# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the project root:

```bash
npm run dev      # dev server at http://localhost:5173
npm run build    # production build → dist/
npm run lint     # eslint check (no --fix)
npm run preview  # serve the production build locally
```

No TypeScript — the parent `CLAUDE.md` rule about `npx tsc --noEmit` does not apply here. Post-edit verification is `npx eslint .` only.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) |
| `VITE_WRITE_TOKEN` | Secret token for the write link — keep private |

**Write link:** `https://<deployed-url>?token=<VITE_WRITE_TOKEN>` — share this with hunters. Public URL (no token) is read-only.

## Architecture

Single-component Vite + React app. **`src/App.jsx` is the only file to edit** for any app logic or UI changes. There is no router, no context, no state library — just `useState`/`useEffect`/`useRef` and Supabase.

### New file: `src/lib/supabase.js`

Exports the configured Supabase client. Import from here wherever Supabase is needed.

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

`einheiten` is the sum of unit weights stored. The log (`einlagerungen`) is the source of truth for the protocol view and the zoo mailto body. State is fetched from Supabase on mount via `fetchState()`.

### UI flow (multi-step form)

`schritt` state drives which panel renders: `"start"` → `"name"` → `"groesse"` → `"bestaetigt"` (auto-returns to `"start"` after 3 s). Full modal overlay fires once when capacity first crosses 100. Add/reset UI is only rendered when `canWrite` is true (URL token matches `VITE_WRITE_TOKEN`).
