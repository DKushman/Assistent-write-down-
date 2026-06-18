import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import type { Entry } from "../lib/storage";
import { formatTime } from "../lib/storage";
import { CategoryPill } from "./CategoryPill";

interface EntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
}

export function EntryCard({ entry, onDelete }: EntryCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="rounded-2xl p-4"
      style={{
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <CategoryPill category={entry.category} />
        <div className="flex items-center gap-3">
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>
            {formatTime(entry.createdAt)}
          </span>
          <button
            onClick={() => onDelete(entry.id)}
            className="rounded-full p-1"
            style={{ color: "rgba(255,255,255,0.3)" }}
            aria-label="Eintrag löschen"
          >
            <Trash2 style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

      <h3
        className="mb-1.5 text-white"
        style={{ fontWeight: 700, fontSize: "18px", lineHeight: 1.3 }}
      >
        {entry.title}
      </h3>

      <div
        className="entry-content"
        style={{
          color: "rgba(255,255,255,0.75)",
          fontSize: "14.5px",
          lineHeight: 1.55,
        }}
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    </motion.div>
  );
}
