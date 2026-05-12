# Supabase Multi-Device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage with Supabase so all hunters see a shared fill level on refresh.

**Architecture:** A single Supabase table (`einlagerungen`) stores all entries. The app fetches on mount, inserts on add, and deletes all rows on reset. Write access (add + reset) is gated by a `?token=` URL parameter checked against `VITE_WRITE_TOKEN`. The public URL is read-only.

**Tech Stack:** React 19, Vite 8, @supabase/supabase-js, Supabase hosted Postgres

> **Note:** This project has no test framework. All verification steps are manual browser checks.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/supabase.js` | Create | Supabase client singleton |
| `.env.example` | Create | Committed env var template |
| `.env.local` | Create (gitignored) | Local dev secrets |
| `src/App.jsx` | Modify | Replace localStorage with Supabase, add loading/error/canWrite |

---

### Task 1: Create Supabase project and table

**Files:**
- Create: `.env.example`
- Create: `.env.local` (gitignored — do not commit)

- [ ] **Step 1: Create a Supabase project**

Go to https://supabase.com, sign in, click "New project". Choose a name (e.g. `wildkuehlhaus`), set a database password, pick a region close to Germany (e.g. `eu-central-1`). Wait for provisioning (~1 min).

- [ ] **Step 2: Create the einlagerungen table**

In the Supabase dashboard: go to **SQL Editor** → **New query**. Paste and run:

```sql
create table einlagerungen (
  id bigint generated always as identity primary key,
  name text not null,
  groesse text not null,
  einheiten int not null,
  icon text not null,
  ts timestamptz not null default now()
);

alter table einlagerungen enable row level security;

create policy "anon select"
  on einlagerungen for select to anon using (true);

create policy "anon insert"
  on einlagerungen for insert to anon with check (true);

create policy "anon delete"
  on einlagerungen for delete to anon using (true);
```

- [ ] **Step 3: Copy your project credentials**

In Supabase dashboard: go to **Project Settings → API**.
- Copy **Project URL** (looks like `https://abcdefgh.supabase.co`)
- Copy **anon / public** key (the long JWT starting with `eyJ...`)

- [ ] **Step 4: Create .env.example**

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_WRITE_TOKEN=choose-a-secret-token
```

- [ ] **Step 5: Create .env.local with real values**

Create `.env.local` in the project root (this file is already gitignored by Vite's default `.gitignore`):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_WRITE_TOKEN=<make-up-a-secret-string>
```

- [ ] **Step 6: Commit .env.example**

```bash
git add .env.example
git commit -m "add env var template"
```

---

### Task 2: Install @supabase/supabase-js and create client

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)
- Create: `src/lib/supabase.js`

- [ ] **Step 1: Install the package**

```bash
npm install @supabase/supabase-js
```

Expected output includes: `added 1 package` (or similar, it's a single dependency with no sub-deps in v2+).

- [ ] **Step 2: Create src/lib/supabase.js**

```js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

- [ ] **Step 3: Verify dev server starts clean**

```bash
npm run dev
```

Expected: server starts at `http://localhost:5173` with no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.js package.json package-lock.json
git commit -m "install @supabase/supabase-js and add client"
```

---

### Task 3: Replace localStorage read with Supabase fetch on mount

**Files:**
- Modify: `src/App.jsx:1-63`

This task removes `laden()`, `STORAGE_KEY`, and the localStorage write. It adds `loading`, `error`, and `canWrite` state, a `fetchState()` helper, and the error UI. The "voll" detection logic stays but is separated from the localStorage write.

- [ ] **Step 1: Update the imports and remove localStorage constants**

Replace the top of `src/App.jsx` (lines 1–18) — remove `STORAGE_KEY` and `laden()`, add supabase import:

```jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./lib/supabase";

const MAX_UNITS = 100;
const ZOO_EMAIL = "zoo@example.com"; // ← hier eintragen

const WILD = [
  { label: "Klein",  sub: "Hase · Ente · Fasan", value: "K", units: 5,  icon: "🐇" },
  { label: "Mittel", sub: "Reh · Fuchs",          value: "M", units: 15, icon: "🦌" },
  { label: "Groß",   sub: "Hirsch · Wildschwein", value: "G", units: 30, icon: "🐗" },
];

const leer = { einlagerungen: [], einheiten: 0 };

function datum(iso) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}
```

- [ ] **Step 2: Update component state and add fetchState()**

Replace the `export default function App()` opening block (lines 43–63) with:

```jsx
export default function App() {
  const [state, setState]           = useState(leer);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [canWrite]                  = useState(
    () => new URLSearchParams(window.location.search).get("token") ===
          import.meta.env.VITE_WRITE_TOKEN
  );
  const [schritt, setSchritt]       = useState("start");
  const [name, setName]             = useState("");
  const [geradVoll, setGeradVoll]   = useState(false);
  const [zeigeReset, setZeigeReset] = useState(false);
  const vorherVoll = useRef(false);

  const pct     = Math.min(100, Math.round((state.einheiten / MAX_UNITS) * 100));
  const istVoll = pct >= 100;
  const balkenF = pct < 60 ? F.gruenMi : pct < 85 ? F.amber : F.rot;

  const fetchState = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("einlagerungen")
      .select("*")
      .order("ts", { ascending: false });
    if (err) {
      setError(true);
    } else {
      setState({
        einlagerungen: data,
        einheiten: data.reduce((sum, e) => sum + e.einheiten, 0),
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  useEffect(() => {
    const nowVoll = state.einheiten >= MAX_UNITS;
    if (nowVoll && !vorherVoll.current) {
      setGeradVoll(true);
      setTimeout(() => setGeradVoll(false), 8000);
    }
    vorherVoll.current = nowVoll;
  }, [state]);
```

- [ ] **Step 3: Add error UI inside <main>, before the fill-level card**

Find the line `<main style={{ maxWidth: 540, margin: "0 auto", padding: "0 16px 64px" }}>` and add this block immediately after it:

```jsx
        {error && (
          <div style={{
            marginTop: 24,
            background: F.rotBg, border: `2px solid ${F.rot}`,
            borderRadius: 12, padding: "28px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: F.rot }}>
              Verbindungsfehler – bitte neu laden
            </div>
            {localStorage.getItem("kuehlhaus_last_reset") && (
              <div style={{ fontSize: 14, color: F.textHe, marginTop: 8 }}>
                Zuletzt geleert: {datum(localStorage.getItem("kuehlhaus_last_reset"))}
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:5173`. Expected:
- Fill level shows 0% / LEER (fetched from empty Supabase table)
- No console errors
- DevTools → Network shows a successful request to `supabase.co`

If you see "Verbindungsfehler", check that `.env.local` has correct values and restart the dev server.

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "replace localStorage with Supabase fetch on mount"
```

---

### Task 4: Update einlagern() to INSERT into Supabase

**Files:**
- Modify: `src/App.jsx` — `einlagern()` function

- [ ] **Step 1: Replace einlagern()**

Find the existing `einlagern()` function and replace it entirely:

```jsx
  async function einlagern(groesse) {
    const w = WILD.find(w => w.value === groesse);
    const { error: err } = await supabase.from("einlagerungen").insert({
      name,
      groesse,
      einheiten: w.units,
      icon: w.icon,
    });
    if (!err) await fetchState();
    setSchritt("bestaetigt");
    setName("");
    setTimeout(() => setSchritt("start"), 3000);
  }
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:5173?token=<your-VITE_WRITE_TOKEN>`.
- Click "+ Wild einlagern"
- Enter a name, pick a size
- Confirm screen appears, then auto-returns to start
- Fill level updates to the correct percentage
- Go to Supabase dashboard → Table Editor → `einlagerungen` — the row is present

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "write entries to Supabase on einlagern"
```

---

### Task 5: Update reset() to DELETE from Supabase

**Files:**
- Modify: `src/App.jsx` — reset button handler

- [ ] **Step 1: Replace the reset button's onClick handler**

Find the reset confirm button's `onClick`:
```jsx
onClick={() => { setState({ ...leer }); setZeigeReset(false); }}
```

Replace it with an async function. Change that button to:

```jsx
                <button onClick={async () => {
                  await supabase.from("einlagerungen").delete().gte("id", 0);
                  localStorage.setItem("kuehlhaus_last_reset", new Date().toISOString());
                  setState(leer);
                  setZeigeReset(false);
                }} style={{
                  flex: 1, padding: "14px",
                  background: F.gruen, border: "none",
                  borderRadius: 8, color: "#f0ead8",
                  fontSize: 17, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Playfair Display', serif",
                }}>Ja, zurücksetzen</button>
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:5173?token=<your-VITE_WRITE_TOKEN>`.
- Add a couple of entries
- Scroll to bottom, click "⟳ Zoo hat abgeholt – Kühlhaus leeren"
- Click "Ja, zurücksetzen"
- Fill level returns to 0% / LEER
- Supabase Table Editor shows an empty `einlagerungen` table
- Now disconnect from the internet (DevTools → Network → Offline), reload the page
- Expected: "Verbindungsfehler – bitte neu laden" + "Zuletzt geleert: [timestamp]" below it
- Re-enable network.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "delete all rows on reset, persist last-reset timestamp locally"
```

---

### Task 6: Gate add and reset UI on canWrite

**Files:**
- Modify: `src/App.jsx` — add/reset UI sections

The "Wild einlagern" button flow and the reset section should only render when `canWrite` is true. Public visitors (no token) see the fill level and protocol but cannot add or reset.

- [ ] **Step 1: Wrap the add-entry section in a canWrite guard**

Find the div that wraps all the `schritt`-based UI (starts with `<div style={{ marginTop: 20 }}>`). Wrap its contents in a conditional:

```jsx
        <div style={{ marginTop: 20 }}>
          {canWrite && schritt === "start" && (
            <button
              onClick={() => !istVoll && setSchritt("name")}
              ...
```

Apply the `canWrite &&` prefix to each of the four `schritt` conditionals (`start`, `name`, `groesse`, `bestaetigt`):
- `{canWrite && schritt === "start" && ( ... )}`
- `{canWrite && schritt === "name" && ( ... )}`
- `{canWrite && schritt === "groesse" && ( ... )}`
- `{canWrite && schritt === "bestaetigt" && ( ... )}`

- [ ] **Step 2: Wrap the reset section in a canWrite guard**

Find the reset section (starts with `<div style={{ marginTop: 44, paddingTop: 20, borderTop: ... }}`).

Wrap the entire div in `{canWrite && ( ... )}`:

```jsx
        {canWrite && (
          <div style={{ marginTop: 44, paddingTop: 20, borderTop: `2px solid ${F.randHe}` }}>
            {!zeigeReset ? (
              ...
            ) : (
              ...
            )}
          </div>
        )}
```

- [ ] **Step 3: Also disable add button while loading**

Find the `schritt === "start"` button. Change its disabled/style logic to also account for `loading`:

```jsx
          {canWrite && schritt === "start" && (
            <button
              onClick={() => !istVoll && !loading && setSchritt("name")}
              style={{
                width: "100%", padding: "22px",
                background: istVoll || loading ? F.randHe : F.gruen,
                border: "none", borderRadius: 10,
                color: istVoll || loading ? F.textHe : "#f0ead8",
                fontSize: 22, fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
                cursor: istVoll || loading ? "not-allowed" : "pointer",
              }}>
              {istVoll ? "✗  Einlagerung nicht möglich" : loading ? "Laden …" : "+ Wild einlagern"}
            </button>
          )}
```

- [ ] **Step 4: Verify read-only view**

Open `http://localhost:5173` (no token).
- Expected: fill level and protocol visible, no add button, no reset section.

Open `http://localhost:5173?token=<your-VITE_WRITE_TOKEN>`.
- Expected: add button and reset section visible, everything works.

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "gate add and reset UI on write token"
```

---

### Task 7: Update CLAUDE.md and push

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

Add a new section after the Commands section:

```markdown
## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe to expose) |
| `VITE_WRITE_TOKEN` | Secret token for the write link — keep private |

**Write link:** `https://<deployed-url>?token=<VITE_WRITE_TOKEN>` — share this with hunters. Public URL (no token) is read-only.
```

Also update the Architecture section to remove the reference to `src/App.css` being unused (it's already deleted) and note the Supabase client:

```markdown
### New file: `src/lib/supabase.js`

Exports the configured Supabase client. Import from here wherever Supabase is needed.
```

- [ ] **Step 2: Commit and push**

```bash
git add CLAUDE.md
git commit -m "update CLAUDE.md with env vars and write link docs"
git push
```
