// Gemini 2.5 Flash-Lite integration.
// Set VITE_GEMINI_API_KEY in .env (Google AI Studio key, starts with AIza…).
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const MODEL = "gemini-2.5-flash-lite";

function getEndpoint(): string {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "VITE_GEMINI_API_KEY fehlt. Trage deinen Google-AI-Studio-Key in .env ein.",
    );
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
}

export type EntryCategory = "Aufgabe" | "Gedanke" | "Link" | "Medien";

export interface AnalyzedEntry {
  title: string;
  content: string; // may contain HTML <a> links
  category: EntryCategory;
  detected_links: string[];
}

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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip the data:...;base64, prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function normalizeAudioMimeType(blob: Blob): string {
  const type = blob.type?.split(";")[0]?.trim();
  if (type && type.startsWith("audio/")) return type;
  return "audio/webm";
}

export async function analyzeAudio(audio: Blob): Promise<AnalyzedEntry> {
  if (audio.size < 500) {
    throw new Error(
      "Die Aufnahme ist zu kurz. Bitte etwas länger gedrückt halten.",
    );
  }

  const base64 = await blobToBase64(audio);
  const mimeType = normalizeAudioMimeType(audio);

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
              data: base64,
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

  // Retry on transient overload / rate-limit errors (503, 429, 500) with
  // exponential backoff so short demand spikes don't surface to the user.
  const MAX_ATTEMPTS = 4;
  const RETRYABLE = new Set([429, 500, 503]);
  let res: Response | null = null;
  let lastErr = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    res = await fetch(getEndpoint(), {
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
    // 0.8s, 1.6s, 3.2s … with a little jitter
    const delay = 800 * 2 ** attempt + Math.random() * 300;
    await new Promise((r) => setTimeout(r, delay));
  }

  if (!res || !res.ok) {
    throw new Error("Gemini ist nicht erreichbar. Bitte später erneut versuchen.");
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Keine Antwort vom Modell erhalten.");
  }

  const parsed = JSON.parse(text) as AnalyzedEntry;

  // Normalize / guard against unexpected category values.
  const allowed: EntryCategory[] = ["Aufgabe", "Gedanke", "Link", "Medien"];
  if (!allowed.includes(parsed.category)) {
    parsed.category = "Gedanke";
  }
  if (!Array.isArray(parsed.detected_links)) {
    parsed.detected_links = [];
  }

  return parsed;
}
