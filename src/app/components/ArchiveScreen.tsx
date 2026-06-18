import { useMemo } from "react";
import { AnimatePresence } from "motion/react";
import { Inbox } from "lucide-react";
import type { Entry } from "../lib/storage";
import { formatDayKey, formatDayLabel } from "../lib/storage";
import { EntryCard } from "./EntryCard";

interface ArchiveScreenProps {
  entries: Entry[];
  onDelete: (id: string) => void;
}

export function ArchiveScreen({ entries, onDelete }: ArchiveScreenProps) {
  // Group entries by day, newest first.
  const groups = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
    const map = new Map<string, { label: string; ts: number; items: Entry[] }>();
    for (const e of sorted) {
      const key = formatDayKey(e.createdAt);
      if (!map.has(key)) {
        map.set(key, {
          label: formatDayLabel(e.createdAt),
          ts: e.createdAt,
          items: [],
        });
      }
      map.get(key)!.items.push(e);
    }
    return Array.from(map.values());
  }, [entries]);

  return (
    <div className="h-full overflow-y-auto px-5 pb-32 pt-14">
      <h1
        className="mb-6 text-white"
        style={{ fontWeight: 800, fontSize: "28px" }}
      >
        Meine Einträge
      </h1>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 text-center">
          <Inbox
            style={{ width: 48, height: 48 }}
            color="rgba(255,255,255,0.2)"
            strokeWidth={1.5}
          />
          <p className="mt-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            Noch keine Einträge.
          </p>
          <p
            className="mt-1"
            style={{ color: "rgba(255,255,255,0.25)", fontSize: "14px" }}
          >
            Nimm etwas auf, um zu starten.
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.ts + group.label}>
              <h2
                className="mb-3"
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                {group.label}
              </h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {group.items.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onDelete={onDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
