import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import { RecordScreen } from "./components/RecordScreen";
import { ArchiveScreen } from "./components/ArchiveScreen";
import { ReviewSheet } from "./components/ReviewSheet";
import { BottomNav, type View } from "./components/BottomNav";
import { useRecorder } from "./lib/useRecorder";
import { analyzeAudio, type AnalyzedEntry } from "./lib/gemini";
import { loadEntries, saveEntries, type Entry } from "./lib/storage";

export default function App() {
  const [view, setView] = useState<View>("record");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState<AnalyzedEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isRecording, start, stop, error } = useRecorder();

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const persist = (next: Entry[]) => {
    setEntries(next);
    saveEntries(next);
  };

  const handlePressStart = () => {
    if (isProcessing) return;
    start();
  };

  const handlePressEnd = async () => {
    const blob = await stop();
    if (!blob) {
      toast.error("Keine Aufnahme erkannt. Bitte erneut versuchen.");
      return;
    }
    setIsProcessing(true);
    try {
      const analyzed = await analyzeAudio(blob);
      setDraft(analyzed);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Verarbeitung fehlgeschlagen.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = (entry: AnalyzedEntry) => {
    const newEntry: Entry = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      ...entry,
    };
    persist([newEntry, ...entries]);
    setDraft(null);
    toast.success("Eintrag gespeichert");
    setView("archive");
  };

  const handleDelete = (id: string) => {
    persist(entries.filter((e) => e.id !== id));
  };

  return (
    <div
      className="relative mx-auto w-full max-w-md overflow-hidden"
      style={{ background: "#1a1a1d", height: "100dvh", minHeight: "100vh" }}
    >
      {view === "record" ? (
        <RecordScreen
          isRecording={isRecording}
          isProcessing={isProcessing}
          error={error}
          onPressStart={handlePressStart}
          onPressEnd={handlePressEnd}
        />
      ) : (
        <ArchiveScreen entries={entries} onDelete={handleDelete} />
      )}

      <BottomNav view={view} onChange={setView} />

      <AnimatePresence>
        {draft && (
          <ReviewSheet
            draft={draft}
            onAccept={handleAccept}
            onDismiss={() => setDraft(null)}
          />
        )}
      </AnimatePresence>

      <Toaster theme="dark" position="top-center" />
    </div>
  );
}
