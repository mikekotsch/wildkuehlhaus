import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("archive migration adds timestamp, index, and update policy", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260825000000_archive_collected_entries.sql", import.meta.url),
    "utf8"
  );

  assert.match(sql, /add column if not exists abgeholt_am timestamptz/i);
  assert.match(sql, /create policy "anon update"[\s\S]*for update to anon/i);
  assert.match(sql, /where abgeholt_am is null/i);
});
