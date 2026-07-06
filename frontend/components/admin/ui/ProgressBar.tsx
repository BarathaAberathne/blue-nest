import { ACCENT, type AccentName } from "@/lib/admin-theme";

/**
 * Tokenized progress bar. Solid accent fill by default, or a teal→emerald
 * gradient for hero metrics like conversion. Value is clamped to 0–100.
 */
export default function ProgressBar({
  value,
  accent = "teal",
  gradient = false,
  className = "",
  height = "h-2",
}: {
  value: number;
  accent?: AccentName;
  gradient?: boolean;
  className?: string;
  height?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`${height} w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${gradient ? "bg-gradient-to-r from-teal-400 to-emerald-500" : ""}`}
        style={{ width: `${pct}%`, ...(gradient ? {} : { background: ACCENT[accent].solid }) }}
      />
    </div>
  );
}
