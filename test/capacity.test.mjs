import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("capacity matches real-world fill counts for all three sizes", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const maxUnits = Number(app.match(/const MAX_UNITS = (\d+);/)?.[1]);
  const smallUnits = Number(app.match(/value: "K", units: (\d+)/)?.[1]);
  const mediumUnits = Number(app.match(/value: "M", units: (\d+)/)?.[1]);
  const largeUnits = Number(app.match(/value: "G", units: (\d+)/)?.[1]);

  // one and a half large animals fill the cold store
  assert.equal(maxUnits, largeUnits * 1.5);
  // three medium animals fill the cold store
  assert.equal(maxUnits, mediumUnits * 3);
  // roughly ten to fifteen small animals fill the cold store
  assert.equal(maxUnits, smallUnits * 9);
});
