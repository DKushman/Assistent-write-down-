export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGINS: string;
}

type EntryCategory = "Aufgabe" | "Gedanke" | "Link" | "Medien";

interface AnalyzedEntry {
  title: string;
  content: string;
  category: EntryCategory;
  detected_links: string[];
}

interface AnalyzeRequest {
  audioBase64: string;
  mimeType: string;
}

const MODEL = "gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `Du bist ein empathischer, hochpräziser persönlicher Assistent.
Transkribiere zuerst die beigefügte Audioaufnahme und analysiere den Inhalt. Erstelle:
1. Eine kurze, treffende Überschrift (max. 5 Wörter).
2. Einen sauber formatierten Textkörper.
3. Extrahiere alle erwähnten Websites oder Marken. Wenn der Nutzer eine Website nennt (z. B. "schau mal auf spiegel de" oder "zalando punkt de"), formatiere dies im content als echten, validen Hyperlink im Format <a href="https://zalando.de" class="pastel-link">zalando.de</a>.
4. Wähle eine passende Kategorie: "Aufgabe", "Gedanke", "Link" oder "Medien".

Antworte AUSSCHLIESSLICH im folgenden JSON-Format ohne zusätzlichen Text:
{
  "title": "Überschrift",
  "content": "Strukturierter Inhalt mit HTML-Links",
  "category": "Aufgabe | Gedanke | Link | Medien",
  "detected_links": ["https://..."]
}`;

function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  const allowOrigin =
    origin && allowed.includes(origin) ? origin : allowed[0] ?? "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(
  data: unknown,
  status: number,
  origin: string | null,
  env: Env,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin, env),
    },
  });
}

async function callGemini(
  apiKey: string,
  audioBase64: string,
  mimeType: string,
): Promise<AnalyzedEntry> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: "Analysiere die beigefügte Audioaufnahme." },
          {
            inlineData: {
              mimeType,
              data: audioBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  };

  const MAX_ATTEMPTS = 4;
  const RETRYABLE = new Set([429, 500, 503]);
  let res: Response | null = null;
  let lastErr = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) break;

    lastErr = await res.text();
    if (!RETRYABLE.has(res.status) || attempt === MAX_ATTEMPTS - 1) {
      throw new Error(
        res.status === 503 || res.status === 429
          ? "Gemini ist gerade stark ausgelastet. Bitte in einem Moment erneut versuchen."
          : `Gemini-Fehler (${res.status}): ${lastErr}`,
      );
    }

    const delay = 800 * 2 ** attempt + Math.random() * 300;
    await new Promise((r) => setTimeout(r, delay));
  }

  if (!res?.ok) {
    throw new Error("Gemini ist nicht erreichbar. Bitte später erneut versuchen.");
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Keine Antwort vom Modell erhalten.");
  }

  const parsed = JSON.parse(text) as AnalyzedEntry;
  const allowed: EntryCategory[] = ["Aufgabe", "Gedanke", "Link", "Medien"];

  if (!allowed.includes(parsed.category)) {
    parsed.category = "Gedanke";
  }
  if (!Array.isArray(parsed.detected_links)) {
    parsed.detected_links = [];
  }

  return parsed;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (url.pathname !== "/analyze" || request.method !== "POST") {
      return json({ error: "Not found" }, 404, origin, env);
    }

    if (!env.GEMINI_API_KEY) {
      return json({ error: "Server misconfigured: GEMINI_API_KEY missing" }, 500, origin, env);
    }

    let payload: AnalyzeRequest;
    try {
      payload = (await request.json()) as AnalyzeRequest;
    } catch {
      return json({ error: "Invalid JSON body" }, 400, origin, env);
    }

    if (!payload.audioBase64 || !payload.mimeType) {
      return json({ error: "audioBase64 and mimeType are required" }, 400, origin, env);
    }

    const audioBytes = atob(payload.audioBase64).length;
    if (audioBytes < 500) {
      return json(
        { error: "Die Aufnahme ist zu kurz. Bitte etwas länger gedrückt halten." },
        400,
        origin,
        env,
      );
    }

    try {
      const result = await callGemini(
        env.GEMINI_API_KEY,
        payload.audioBase64,
        payload.mimeType,
      );
      return json(result, 200, origin, env);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Verarbeitung fehlgeschlagen.";
      return json({ error: message }, 502, origin, env);
    }
  },
};
