import { motion } from "motion/react";
import { Mic, List } from "lucide-react";

export type View = "record" | "archive";

interface BottomNavProps {
  view: View;
  onChange: (view: View) => void;
}

export function BottomNav({ view, onChange }: BottomNavProps) {
  const items: { key: View; label: string; icon: typeof Mic }[] = [
    { key: "record", label: "Aufnahme", icon: Mic },
    { key: "archive", label: "Meine Einträge", icon: List },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-7">
      <div
        className="pointer-events-auto flex items-center gap-1.5 rounded-full p-1.5"
        style={{
          background: "rgba(38,38,42,0.7)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.55)",
        }}
      >
        {items.map(({ key, label, icon: Icon }) => {
          const active = view === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-label={label}
              aria-pressed={active}
              className="relative flex items-center justify-center rounded-full"
              style={{ width: 56, height: 56 }}
            >
              {/* Sliding focus capsule shared across buttons */}
              {active && (
                <motion.span
                  layoutId="nav-capsule"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                  }}
                  transition={{ type: "spring", stiffness: 480, damping: 34 }}
                />
              )}
              <Icon
                className="relative z-10 transition-colors"
                style={{
                  width: 22,
                  height: 22,
                  color: active ? "#ffffff" : "rgba(255,255,255,0.45)",
                }}
                strokeWidth={active ? 2.2 : 2}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
