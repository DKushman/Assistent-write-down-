import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Pencil, X } from "lucide-react";
import type { AnalyzedEntry, EntryCategory } from "../lib/gemini";
import { categoryColors } from "../lib/storage";
import { CategoryPill } from "./CategoryPill";

interface ReviewSheetProps {
  draft: AnalyzedEntry;
  onAccept: (entry: AnalyzedEntry) => void;
  onDismiss: () => void;
}

const CATEGORIES: EntryCategory[] = ["Aufgabe", "Gedanke", "Link", "Medien"];

export function ReviewSheet({ draft, onAccept, onDismiss }: ReviewSheetProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(draft.title);
  const [content, setContent] = useState(draft.content);
  const [category, setCategory] = useState<EntryCategory>(draft.category);

  useEffect(() => {
    setTitle(draft.title);
    setContent(draft.content);
    setCategory(draft.category);
  }, [draft]);

  const accept = () => {
    onAccept({ ...draft, title, content, category });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      />
      <motion.div
        className="relative w-full max-w-md rounded-t-3xl px-5 pb-8 pt-4"
        style={{
          background: "#222226",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
      >
        <div
          className="mx-auto mb-5 rounded-full"
          style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)" }}
        />

        <div className="mb-4 flex items-center justify-between">
          <span
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Neuer Eintrag
          </span>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#ffffff",
                fontSize: "13px",
              }}
            >
              <Pencil style={{ width: 14, height: 14 }} /> Bearbeiten
            </button>
          )}
        </div>

        {/* Category selection */}
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const active = cat === category;
            return (
              <button
                key={cat}
                disabled={!editing}
                onClick={() => setCategory(cat)}
                className="rounded-full px-3 py-1.5"
                style={{
                  fontSize: "13px",
                  background: active
                    ? `${categoryColors[cat]}22`
                    : "rgba(255,255,255,0.05)",
                  color: active ? categoryColors[cat] : "rgba(255,255,255,0.4)",
                  border: `1px solid ${active ? categoryColors[cat] + "66" : "transparent"}`,
                  opacity: !editing && !active ? 0.35 : 1,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {editing ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-3 w-full rounded-xl px-4 py-3 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "18px",
              }}
              placeholder="Überschrift"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="mb-4 w-full resize-none rounded-xl px-4 py-3 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.85)",
                fontSize: "15px",
                lineHeight: 1.5,
              }}
              placeholder="Inhalt (HTML erlaubt)"
            />
          </>
        ) : (
          <>
            <div className="mb-2">
              <CategoryPill category={category} />
            </div>
            <h2
              className="mb-2 text-white"
              style={{ fontWeight: 700, fontSize: "22px", lineHeight: 1.25 }}
            >
              {title}
            </h2>
            <div
              className="entry-content mb-4"
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "15px",
                lineHeight: 1.55,
              }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={onDismiss}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)",
              fontWeight: 600,
            }}
          >
            <X style={{ width: 18, height: 18 }} /> Verwerfen
          </button>
          <button
            onClick={accept}
            className="flex flex-[1.4] items-center justify-center gap-2 rounded-2xl py-3.5"
            style={{
              background: "#ffffff",
              color: "#1a1a1d",
              fontWeight: 700,
            }}
          >
            <Check style={{ width: 18, height: 18 }} /> Speichern
          </button>
        </div>
      </motion.div>
    </div>
  );
}
