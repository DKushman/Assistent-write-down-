import type { EntryCategory } from "./gemini";

export interface Entry {
  id: string;
  title: string;
  content: string; // may contain HTML <a> links
  category: EntryCategory;
  detected_links: string[];
  createdAt: number; // epoch ms
}

const STORAGE_KEY = "voice-archive-entries";

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Entry[];
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// Color mapping for categories (pastel accents on dark background).
export const categoryColors: Record<EntryCategory, string> = {
  Aufgabe: "#A7F3D0", // pastel green
  Gedanke: "#C4B5FD", // pastel purple
  Link: "#93C5FD", // pastel blue
  Medien: "#FCA5A5", // pastel red/pink
};

const DAY_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatDayLabel(ts: number): string {
  const today = new Date();
  const d = new Date(ts);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(d, today)) return "Heute";
  if (isSameDay(d, yesterday)) return "Gestern";
  return DAY_FORMATTER.format(d);
}

export function formatTime(ts: number): string {
  return TIME_FORMATTER.format(new Date(ts));
}
