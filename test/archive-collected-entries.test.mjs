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

test("the app loads active rows and archives rather than deletes", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(
    app,
    /\.select\("\*"\)[\s\S]*\.is\("abgeholt_am", null\)[\s\S]*\.order\("ts"/
  );
  assert.match(
    app,
    /\.update\(\{ abgeholt_am: now \}\)[\s\S]*\.is\("abgeholt_am", null\)/
  );
  assert.doesNotMatch(app, /\.delete\(\)\.gte\("id", 0\)/);
});
