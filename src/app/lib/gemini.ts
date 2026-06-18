// Client calls the server-side proxy — the Gemini API key never ships to the browser.

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

function getAnalyzeUrl(): string {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
    /\/$/,
    "",
  );
  if (apiUrl) return `${apiUrl}/analyze`;
  return "/api/analyze";
}

export async function analyzeAudio(audio: Blob): Promise<AnalyzedEntry> {
  if (audio.size < 500) {
    throw new Error(
      "Die Aufnahme ist zu kurz. Bitte etwas länger gedrückt halten.",
    );
  }

  const res = await fetch(getAnalyzeUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64: await blobToBase64(audio),
      mimeType: normalizeAudioMimeType(audio),
    }),
  });

  const data = (await res.json()) as AnalyzedEntry & { error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? "Verarbeitung fehlgeschlagen.");
  }

  return data;
}
