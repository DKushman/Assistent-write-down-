import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface RecordScreenProps {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  onPressStart: () => void;
  onPressEnd: () => void;
}

const RING_SIZE = 84;
const RIPPLE_COUNT = 3;

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function RecordScreen({
  isRecording,
  isProcessing,
  error,
  onPressStart,
  onPressEnd,
}: RecordScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const pressedRef = useRef(false);

  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 200);
    return () => clearInterval(id);
  }, [isRecording]);

  const handleDown = (e: React.PointerEvent) => {
    if (isProcessing) return;
    e.preventDefault();
    pressedRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    onPressStart();
  };

  const handleUp = () => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    onPressEnd();
  };

  const statusText = isProcessing
    ? "Wird verarbeitet …"
    : isRecording
      ? formatElapsed(elapsed)
      : "Halten zum Aufnehmen";

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-6 select-none">
      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 460,
          height: 460,
          borderRadius: "50%",
          background: isRecording
            ? "radial-gradient(circle, rgba(239,68,68,0.12), transparent 65%)"
            : "radial-gradient(circle, rgba(255,255,255,0.04), transparent 65%)",
          filter: "blur(10px)",
        }}
      />

      <motion.div
        key={isRecording ? "rec" : isProcessing ? "proc" : "idle"}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-20 tabular-nums"
        style={{
          color: isRecording ? "#ffffff" : "rgba(255,255,255,0.6)",
          fontWeight: isRecording ? 600 : 500,
          fontSize: isRecording ? "30px" : "17px",
          letterSpacing: isRecording ? "0.04em" : "0",
        }}
      >
        {statusText}
      </motion.div>

      <div className="relative z-10 flex items-center justify-center">
        {/* Small expanding ripples while recording */}
        <AnimatePresence>
          {isRecording &&
            Array.from({ length: RIPPLE_COUNT }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: RING_SIZE,
                  height: RING_SIZE,
                  border: "1.5px solid rgba(239,68,68,0.45)",
                }}
                initial={{ scale: 1, opacity: 0.55 }}
                animate={{ scale: 1.9, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  delay: (i * 1.8) / RIPPLE_COUNT,
                  ease: "easeOut",
                }}
              />
            ))}
        </AnimatePresence>

        {/* Record button: white ring + red inner that shrinks while held */}
        <motion.button
          type="button"
          onPointerDown={handleDown}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onPointerLeave={handleUp}
          disabled={isProcessing}
          aria-label={isRecording ? "Aufnahme läuft" : "Halten zum Aufnehmen"}
          className="relative flex items-center justify-center rounded-full touch-none"
          style={{
            width: RING_SIZE,
            height: RING_SIZE,
            background: "transparent",
            border: "3px solid rgba(255,255,255,0.9)",
          }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
          {isProcessing ? (
            <motion.span
              className="rounded-full"
              style={{
                width: 32,
                height: 32,
                border: "3px solid rgba(255,255,255,0.25)",
                borderTopColor: "#ffffff",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <motion.span
              style={{ background: "#ef4444" }}
              animate={
                isRecording
                  ? { width: 34, height: 34, borderRadius: 17 }
                  : { width: 64, height: 64, borderRadius: 32 }
              }
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
            />
          )}
        </motion.button>
      </div>

      <p
        className="relative z-10 mt-20 max-w-xs text-center"
        style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", lineHeight: 1.5 }}
      >
        {error
          ? error
          : isRecording
            ? "Loslassen, um zu beenden."
            : "Sprich frei – die KI erstellt Überschrift, Kategorie und Links."}
      </p>
    </div>
  );
}
