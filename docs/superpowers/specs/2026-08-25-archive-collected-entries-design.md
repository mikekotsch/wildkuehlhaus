# Archive collected entries

**Date:** 2026-08-25
**Status:** Awaiting user review

## Problem

The current "Zoo hat abgeholt" action permanently deletes every row from
`einlagerungen`. That removes useful operational history and makes the reset
irreversible.

## Goal

Keep collected entries in Supabase for later reference while showing only
currently stored game in the application. Each collection is represented by a
timestamp recorded on every entry that was active at the time of reset.

## Non-goals

- A history screen or export in the app
- Recording the collector's identity or notes
- Real-time updates, authentication changes, or capacity locking
- Changing the existing storage-size weights or capacity

## Design

Add a nullable `abgeholt_am timestamptz` column to `einlagerungen`.

- An active entry has `abgeholt_am IS NULL`.
- A collected entry has `abgeholt_am` set to the time of collection.
- Existing rows stay active after the migration because the new column is
  nullable.

The app will fetch only active entries, ordered by their insertion time. Its
fill level, counters, protocol, and zoo email therefore continue to derive
only from active entries.

On confirmation of "Zoo hat abgeholt", the app will update every active row
with one shared client-generated ISO timestamp instead of deleting rows. It
will clear the visible state only after Supabase confirms the update. If the
update fails, the app will retain the current state and display the existing
connection error state.

## Database migration

Run this in the Supabase SQL editor before deploying the app change:

```sql
alter table public.einlagerungen
  add column if not exists abgeholt_am timestamptz;

create index if not exists einlagerungen_aktive_ts_idx
  on public.einlagerungen (ts desc)
  where abgeholt_am is null;
```

The app currently uses the Supabase `anon` role for writes. Its row-level
security policy must permit `UPDATE` on `einlagerungen` for the write flow;
the current `SELECT`, `INSERT`, and `DELETE` permissions alone are not
sufficient. The project owner should add the equivalent `UPDATE` policy in
Supabase using the same access model as the existing write policies.

## App changes

Changes remain confined to `src/App.jsx`:

1. Add `.is("abgeholt_am", null)` to the active-entry query.
2. Replace the reset `delete()` call with an `update({ abgeholt_am: now })`
   filtered by `.is("abgeholt_am", null)`.
3. Handle reset submission state and errors so a failed archive does not
   present an empty fridge.

## Verification

- A regression test asserts that active data is filtered by
  `abgeholt_am IS NULL` and reset updates rather than deletes.
- Lint and the production build must pass.
- Manual acceptance: create an entry, reset it, confirm it disappears from
  the app, then verify the row remains in Supabase with `abgeholt_am` set.
