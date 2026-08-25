# Archive Collected Entries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve collected entries in Supabase while removing them from the active fridge view.

**Architecture:** Add nullable `abgeholt_am`; queries use rows where it is null, and reset updates active rows with one timestamp.

**Tech Stack:** React 19, Vite 8, Supabase, Node test runner

**Spec:** `docs/superpowers/specs/2026-08-25-archive-collected-entries-design.md`

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260825000000_archive_collected_entries.sql` | Create | Column, index, update policy. |
| `src/App.jsx` | Modify | Active fetch and safe archive reset. |
| `test/archive-collected-entries.test.mjs` | Create | Regression contract. |
| `README.md` | Modify | Migration instructions. |

### Task 1: Database archive support

- [ ] Write a failing Node test that reads the migration and asserts: `add column if not exists abgeholt_am timestamptz`, an active-row partial index (`where abgeholt_am is null`), and `create policy "anon update" ... for update to anon`.
- [ ] Run `node --test test/archive-collected-entries.test.mjs`; expect a missing-file failure.
- [ ] Create the migration with the exact SQL:

```sql
alter table public.einlagerungen add column if not exists abgeholt_am timestamptz;
create index if not exists einlagerungen_aktive_ts_idx on public.einlagerungen (ts desc) where abgeholt_am is null;
create policy "anon update" on public.einlagerungen for update to anon using (true) with check (true);
```

- [ ] Re-run the test, expect pass, then commit the migration and test as `add collected entry archive migration`.

### Task 2: Active-only app state and non-destructive reset

- [ ] Extend the archive test to assert the app source chains `.select("*")`, `.is("abgeholt_am", null)`, and `.order("ts"...)`; it must also use `.update({ abgeholt_am: now })`, filter the update to active rows, and not contain `.delete().gte("id", 0)`.
- [ ] Run the test and confirm it fails against current deletion behavior.
- [ ] In `src/App.jsx`, add the active-row filter to `fetchState()`. Add `resetting` state. Change the confirmed reset to prevent duplicate clicks, update active rows with one `new Date().toISOString()` value, retain state and set `error` on failure, and clear state only on success. Disable reset controls while saving and label the confirm button `Wird archiviert …`.
- [ ] Re-run the archive and capacity tests; expect both pass. Commit as `archive entries when the fridge is cleared`.

### Task 3: Deployment documentation and final verification

- [ ] Add `Archivierung nach Abholung` to `README.md`: reset sets `abgeholt_am`, hides rows from the active app, retains them in Supabase, and requires running the migration in the Supabase SQL editor before deployment.
- [ ] Run `node --test test/capacity.test.mjs test/archive-collected-entries.test.mjs`, `npx eslint .`, `npm run build`, and `git diff --check`; expect two passing tests, no lint errors, a successful build, and no whitespace errors.
- [ ] Manually validate after migration: add an entry, reset, see no active entry, then inspect its non-null timestamp in Supabase.
- [ ] Commit README as `document collected entry archival`.
