import { ACCENT, type AccentName } from "@/lib/admin-theme";

/**
 * Generic status pill driven by an accent token — the entity-agnostic successor
 * to the enquiry-only StatusBadge and the per-module Badge variants.
 */
export default function StageBadge({
  label,
  accent,
  withDot = true,
  className = "",
}: {
  label: string;
  accent: AccentName;
  withDot?: boolean;
  className?: string;
}) {
  const a = ACCENT[accent] ?? ACCENT.slate;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.chip} ${className}`}>
      {withDot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.solid }} />}
      {label}
    </span>
  );
}
