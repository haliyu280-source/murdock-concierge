// Neural text-to-speech proxy. Needs OPENAI_API_KEY in the Vercel project env.
// Without a key it answers 503 and the page falls back to the browser voice.
const hits = new Map();
const LIMIT = 40, WINDOW = 60 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: "tts_not_configured" });

  const origin = req.headers.origin || "";
  const host = req.headers.host || "";
  if (origin && !origin.endsWith("//" + host) && !/localhost/.test(origin)) return res.status(403).json({ error: "origin" });

  const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW);
  if (arr.length >= LIMIT) return res.status(429).json({ error: "rate" });
  arr.push(now); hits.set(ip, arr);

  const text = String((req.body && req.body.text) || "").replace(/\s+/g, " ").trim().slice(0, 560);
  if (!text) return res.status(400).json({ error: "empty" });

  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: process.env.TTS_VOICE || "ash",
        input: text,
        response_format: "mp3",
        instructions: "Speak as a warm, calm, quietly confident London barbershop concierge. Natural conversational pace, gentle British warmth, relaxed and a little dry. Never sound like a robot or a presenter."
      })
    });
    if (!r.ok) return res.status(502).json({ error: "upstream" });
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    return res.status(502).json({ error: "upstream" });
  }
};
