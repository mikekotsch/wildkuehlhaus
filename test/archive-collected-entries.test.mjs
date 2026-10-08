import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the API stores entries in Neon and returns active rows only", async () => {
  const api = await readFile(new URL("../api/state.js", import.meta.url), "utf8");
  assert.match(api, /CREATE TABLE IF NOT EXISTS einlagerungen/);
  assert.match(api, /FROM einlagerungen[\s\S]*WHERE abgeholt_am IS NULL/);
  assert.match(api, /UPDATE einlagerungen SET abgeholt_am = now\(\)/);
  assert.match(api, /body\?\.action === "add"[\s\S]*INSERT INTO einlagerungen/);
  assert.match(api, /readBlobEntries[\s\S]*readSupabaseEntries/);
});

test("the app uses the Vercel state API for writes", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(app, /fetch\("\/api\/state"\)/);
  assert.match(app, /action: "add"/);
  assert.match(app, /action: "archive"/);
  assert.doesNotMatch(app, /from "\.\/lib\/supabase"/);
});
