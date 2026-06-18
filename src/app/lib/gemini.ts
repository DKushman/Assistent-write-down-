// Client calls /api/analyze — the Gemini key stays on the server (Vercel).

export type EntryCategory = "Aufgabe" | "Gedanke" | "Link" | "Medien";

export interface AnalyzedEntry {
  title: string;
  content: string;
  category: EntryCategory;
  detected_links: string[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
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

async function parseApiResponse(res: Response): Promise<AnalyzedEntry & { error?: string }> {
  const raw = await res.text();

  if (!raw.trim()) {
    throw new Error("Leere Server-Antwort. API-Route nicht erreichbar.");
  }

  try {
    return JSON.parse(raw) as AnalyzedEntry & { error?: string };
  } catch {
    if (raw.trimStart().startsWith("<")) {
      throw new Error(
        "API nicht erreichbar. Bitte die Vercel-URL nutzen (nicht GitHub Pages) und GEMINI_API_KEY setzen.",
      );
    }
    throw new Error("Ungültige Server-Antwort. Bitte später erneut versuchen.");
  }
}

export async function analyzeAudio(audio: Blob): Promise<AnalyzedEntry> {
  if (audio.size < 500) {
    throw new Error(
      "Die Aufnahme ist zu kurz. Bitte etwas länger gedrückt halten.",
    );
  }

  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: await blobToBase64(audio),
        mimeType: normalizeAudioMimeType(audio),
      }),
    });
  } catch {
    throw new Error("Netzwerkfehler. Bitte Internetverbindung prüfen.");
  }

  const data = await parseApiResponse(res);

  if (!res.ok) {
    throw new Error(data.error ?? "Verarbeitung fehlgeschlagen.");
  }

  return data;
}
