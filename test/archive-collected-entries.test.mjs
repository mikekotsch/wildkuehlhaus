import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the API stores entries and returns active rows only", async () => {
  const api = await readFile(new URL("../api/state.js", import.meta.url), "utf8");
  assert.match(api, /stored\.entries[\s\S]*\.filter\(entry => !entry\.abgeholt_am\)/);
  assert.match(api, /body\?\.action === "archive"[\s\S]*abgeholt_am: now/);
  assert.match(api, /BlobPreconditionFailedError/);
});

test("the app uses the Vercel state API for writes", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(app, /fetch\("\/api\/state"\)/);
  assert.match(app, /action: "add"/);
  assert.match(app, /action: "archive"/);
  assert.doesNotMatch(app, /from "\.\/lib\/supabase"/);
});
