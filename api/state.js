import {
  BlobPreconditionFailedError,
  get,
  put,
} from "@vercel/blob";
import { randomUUID } from "node:crypto";

const STATE_PATH = "einlagerungen.json";
const PAGE_SIZE = 1000;
const GROESSEN = {
  K: { einheiten: 5, icon: "🐇" },
  M: { einheiten: 15, icon: "🦌" },
  G: { einheiten: 30, icon: "🐗" },
};

async function readState() {
  const blob = await get(STATE_PATH, { access: "private", useCache: false });
  if (!blob) return null;
  if (!blob || blob.statusCode !== 200) {
    throw new Error("Could not read stored state");
  }
  return {
    entries: await new Response(blob.stream).json(),
    etag: blob.blob.etag,
  };
}

async function writeState(entries, etag) {
  await put(STATE_PATH, JSON.stringify(entries), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: Boolean(etag),
    ...(etag ? { ifMatch: etag } : {}),
    contentType: "application/json",
  });
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

async function getOrInitializeState() {
  const stored = await readState();
  if (stored) return stored;
  const legacyEntries = await importLegacyEntries();
  try {
    await writeState(legacyEntries, null);
  } catch (error) {
    if (!(error instanceof BlobPreconditionFailedError)) throw error;
  }
  const initialized = await readState();
  if (!initialized) throw new Error("Could not initialize stored state");
  return initialized;
}

async function updateEntries(update) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const stored = await getOrInitializeState();
    try {
      await writeState(update(stored.entries), stored.etag);
      return;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError) || attempt === 4) {
        throw error;
      }
    }
  }
}

function unauthorized(req) {
  const token = process.env.VITE_WRITE_TOKEN;
  return !token || req.headers.authorization !== `******;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (req.method === "POST" && unauthorized(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const stored = await getOrInitializeState();

    if (req.method === "GET") {
      const activeEntries = stored.entries
        .filter(entry => !entry.abgeholt_am)
        .sort((a, b) => new Date(b.ts) - new Date(a.ts));
      return res.status(200).json({
        einlagerungen: activeEntries,
        einheiten: activeEntries.reduce((sum, entry) => sum + entry.einheiten, 0),
      });
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
      await updateEntries(entries => [...entries, entry]);
      return res.status(201).json({ ok: true });
    }

    if (body?.action === "archive") {
      const now = new Date().toISOString();
      await updateEntries(entries =>
        entries.map(entry =>
          entry.abgeholt_am ? entry : { ...entry, abgeholt_am: now }
        )
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("State API error:", error);
    return res.status(502).json({ error: "Could not access stored data" });
  }
}
