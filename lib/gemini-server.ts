export type EntryCategory = "Aufgabe" | "Gedanke" | "Link" | "Medien";

export interface AnalyzedEntry {
  title: string;
  content: string;
  category: EntryCategory;
  detected_links: string[];
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

export async function analyzeAudioWithGemini(
  apiKey: string,
  audioBase64: string,
  mimeType: string,
): Promise<AnalyzedEntry> {
  const audioBytes = Buffer.from(audioBase64, "base64").length;
  if (audioBytes < 500) {
    throw new Error(
      "Die Aufnahme ist zu kurz. Bitte etwas länger gedrückt halten.",
    );
  }

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
