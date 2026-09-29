export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const url =
    `${process.env.VITE_SUPABASE_URL}/rest/v1/einlagerungen` +
    `?select=id&limit=1&_=${Date.now()}`;

  const resp = await fetch(url, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
      "Cache-Control": "no-cache",
    },
  });

  if (!resp.ok) {
    return res
      .status(502)
      .json({ error: `Supabase ping failed: ${resp.status}` });
  }

  return res.status(200).json({ ok: true });
}
