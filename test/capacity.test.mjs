import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("three large animals fill the cold store", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const maxUnits = Number(app.match(/const MAX_UNITS = (\d+);/)?.[1]);
  const largeUnits = Number(app.match(/value: "G", units: (\d+)/)?.[1]);

  assert.equal(maxUnits, largeUnits * 3);
});
