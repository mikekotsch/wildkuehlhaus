import { get, list, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const PREFIX = "einlagerungen/";
const INITIALIZED_PATH = "einlagerungen-initialized.json";
const PAGE_SIZE = 1000;
const GROESSEN = {
  K: { einheiten: 5, icon: "🐇" },
  M: { einheiten: 15, icon: "🦌" },
  G: { einheiten: 30, icon: "🐗" },
};

async function readBlob(path) {
  const blob = await get(path, { access: "private", useCache: false });
  if (!blob || blob.statusCode !== 200) {
    throw new Error(`Could not read stored entry: ${path}`);
  }
  return new Response(blob.stream).json();
}

async function writeBlob(path, value) {
  await put(path, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function getStoredEntries() {
  const blobs = [];
  let cursor;
  let hasMore;

  do {
    const page = await list({ prefix: PREFIX, cursor, limit: PAGE_SIZE });
    blobs.push(...page.blobs);
    cursor = page.cursor;
    hasMore = page.hasMore;
  } while (hasMore);

  return Promise.all(
    blobs
      .filter(blob => blob.pathname.endsWith(".json"))
      .map(blob => readBlob(blob.pathname))
  );
}

async function importLegacyEntries() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const entries = [];
  let offset = 0;
  let page;

  do {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/einlagerungen?select=*&order=ts.asc`,
      {
        headers: {
          apikey: key,
          Authorization: `******
          Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Legacy data import failed: ${response.status}`);
    }
    page = await response.json();
    if (!Array.isArray(page)) throw new Error("Legacy data response was invalid");
    entries.push(...page);
    offset += page.length;
  } while (page.length === PAGE_SIZE);

  return entries;
}

function entryPath(id) {
  return `${PREFIX}${Buffer.from(String(id)).toString("base64url")}.json`;
}

async function ensureInitialized() {
  const marker = await get(INITIALIZED_PATH, { access: "private", useCache: false });
  if (marker) return;

  const legacyEntries = await importLegacyEntries();
  await Promise.all(
    legacyEntries.map((entry, index) =>
      writeBlob(entryPath(entry.id ?? randomUUID() ?? index), entry)
    )
  );
  await writeBlob(INITIALIZED_PATH, { initializedAt: new Date().toISOString() });
}

function unauthorized(req) {
  const token = process.env.VITE_WRITE_TOKEN;
  return !token || req.headers.authorization !== `******;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    await ensureInitialized();

    if (req.method === "GET") {
      const entries = await getStoredEntries();
      const activeEntries = entries
        .filter(entry => !entry.abgeholt_am)
        .sort((a, b) => new Date(b.ts) - new Date(a.ts));
      return res.status(200).json({
        einlagerungen: activeEntries,
        einheiten: activeEntries.reduce((sum, entry) => sum + entry.einheiten, 0),
      });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (unauthorized(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (body?.action === "add") {
      const groesse = GROESSEN[body.groesse];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!groesse || !name || name.length > 200) {
        return res.status(400).json({ error: "Invalid entry" });
      }

      const entry = {
        id: randomUUID(),
        name,
        groesse: body.groesse,
        ...groesse,
        ts: new Date().toISOString(),
        abgeholt_am: null,
      };
      await writeBlob(entryPath(entry.id), entry);
      return res.status(201).json({ ok: true });
    }

    if (body?.action === "archive") {
      const entries = await getStoredEntries();
      const now = new Date().toISOString();
      await Promise.all(
        entries
          .filter(entry => !entry.abgeholt_am)
          .map(entry => writeBlob(entryPath(entry.id), { ...entry, abgeholt_am: now }))
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("State API error:", error);
    return res.status(502).json({ error: "Could not access stored data" });
  }
}
