import type { EntryCategory } from "../lib/gemini";
import { categoryColors } from "../lib/storage";

export function CategoryPill({ category }: { category: EntryCategory }) {
  const color = categoryColors[category];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{
        background: `${color}1A`,
        color,
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      <span
        className="rounded-full"
        style={{ width: 7, height: 7, background: color }}
      />
      {category}
    </span>
  );
}
