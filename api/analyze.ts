import type { VercelRequest, VercelResponse } from "@vercel/node";
import { analyzeAudioWithGemini } from "../server/gemini-core.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY fehlt. In Vercel unter Environment Variables setzen.",
    });
  }

  const { audioBase64, mimeType } = req.body ?? {};
  if (!audioBase64 || !mimeType) {
    return res.status(400).json({ error: "audioBase64 and mimeType are required" });
  }

  try {
    const result = await analyzeAudioWithGemini(apiKey, audioBase64, mimeType);
    return res.status(200).json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verarbeitung fehlgeschlagen.";
    const status = message.includes("zu kurz") ? 400 : 502;
    return res.status(status).json({ error: message });
  }
}
