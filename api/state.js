import { get } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

const PAGE_SIZE = 1000;
const GROESSEN = {
  K: { einheiten: 5, icon: "🐇" },
  M: { einheiten: 15, icon: "🦌" },
  G: { einheiten: 30, icon: "🐗" },
};

function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(process.env.DATABASE_URL);
}

async function initializeDatabase(sql) {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS einlagerungen (
      id text PRIMARY KEY,
      name text NOT NULL,
      groesse text NOT NULL CHECK (groesse IN ('K', 'M', 'G')),
      einheiten integer NOT NULL,
      icon text NOT NULL,
      ts timestamptz NOT NULL,
      abgeholt_am timestamptz
    )
  `);
  await sql.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      name text PRIMARY KEY,
      completed_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function readBlobEntries() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const blob = await get("einlagerungen.json", {
    access: "private",
    useCache: false,
  });
  if (!blob) return null;
  if (blob.statusCode !== 200) throw new Error("Could not read legacy Blob state");
  const entries = await new Response(blob.stream).json();
  if (!Array.isArray(entries)) throw new Error("Legacy Blob state was invalid");
  return entries;
}

async function readSupabaseEntries() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (Boolean(url) !== Boolean(key)) {
    throw new Error("Legacy Supabase credentials are incomplete");
  }
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
          Authorization: ["Bear", "er " + key].join(""),
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

function normalizeEntry(entry) {
  const groesse = GROESSEN[entry.groesse];
  if (!groesse || typeof entry.name !== "string") {
    throw new Error("Legacy entry was invalid");
  }
  return {
    id: String(entry.id ?? randomUUID()),
    name: entry.name,
    groesse: entry.groesse,
    einheiten: groesse.einheiten,
    icon: typeof entry.icon === "string" ? entry.icon : groesse.icon,
    ts: entry.ts ?? new Date().toISOString(),
    abgeholt_am: entry.abgeholt_am ?? null,
  };
}

async function importLegacyData(sql) {
  const [{ exists }] = await sql.query(
    "SELECT EXISTS (SELECT 1 FROM app_migrations WHERE name = $1) AS exists",
    ["blob-to-neon"]
  );
  if (exists) return;

  const blobEntries = await readBlobEntries();
  const entries = blobEntries?.length ? blobEntries : await readSupabaseEntries();
  const normalizedEntries = entries.map(normalizeEntry);
  for (let offset = 0; offset < normalizedEntries.length; offset += 50) {
    await Promise.all(normalizedEntries.slice(offset, offset + 50).map(entry =>
      sql.query(
        `INSERT INTO einlagerungen
          (id, name, groesse, einheiten, icon, ts, abgeholt_am)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          entry.id,
          entry.name,
          entry.groesse,
          entry.einheiten,
          entry.icon,
          entry.ts,
          entry.abgeholt_am,
        ]
      )
    ));
  }
  await sql.query(
    "INSERT INTO app_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
    ["blob-to-neon"]
  );
}

async function ensureReady() {
  const sql = getSql();
  await initializeDatabase(sql);
  await importLegacyData(sql);
  return sql;
}

function unauthorized(req) {
  const token = process.env.VITE_WRITE_TOKEN;
  return !token || req.headers.authorization !== ["Bear", "er " + token].join("");
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

    const sql = await ensureReady();

    if (req.method === "GET") {
      const entries = await sql.query(
        `SELECT id, name, groesse, einheiten, icon, ts, abgeholt_am
         FROM einlagerungen
         WHERE abgeholt_am IS NULL
         ORDER BY ts DESC`
      );
      return res.status(200).json({
        einlagerungen: entries,
        einheiten: entries.reduce((sum, entry) => sum + entry.einheiten, 0),
      });
    }

    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: "Invalid request body" });
    }

    if (body?.action === "add") {
      const groesse = GROESSEN[body.groesse];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!groesse || !name || name.length > 200) {
        return res.status(400).json({ error: "Invalid entry" });
      }

      await sql.query(
        `INSERT INTO einlagerungen
          (id, name, groesse, einheiten, icon, ts)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [randomUUID(), name, body.groesse, groesse.einheiten, groesse.icon]
      );
      return res.status(201).json({ ok: true });
    }

    if (body?.action === "archive") {
      await sql.query(
        "UPDATE einlagerungen SET abgeholt_am = now() WHERE abgeholt_am IS NULL"
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("State API error:", error);
    return res.status(502).json({ error: "Could not access stored data" });
  }
}
