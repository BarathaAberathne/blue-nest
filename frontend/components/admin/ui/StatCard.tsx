import Link from "next/link";
import { ACCENT, type AccentName } from "@/lib/admin-theme";
import ProgressBar from "./ProgressBar";

/**
 * Premium KPI / stat card — soft rounded card, tinted icon chip, big value,
 * uppercase label, optional sub-line, optional progress bar. Becomes a link when
 * `href` is set (subtle hover lift).
 */
export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "teal",
  href,
  progress,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
  accent?: AccentName;
  href?: string;
  progress?: number;
}) {
  const a = ACCENT[accent] ?? ACCENT.teal;
  const inner = (
    <>
      {Icon && (
        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: a.soft }}>
          <Icon className="h-4.5 w-4.5" style={{ color: a.solid }} />
        </span>
      )}
      <p className="text-2xl font-bold leading-none text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {typeof progress === "number" && <ProgressBar value={progress} accent={accent} className="mt-3" height="h-1.5" />}
    </>
  );

  const cls = "block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm";
  return href ? (
    <Link href={href} className={`${cls} transition-all hover:-translate-y-0.5 hover:shadow-md`}>{inner}</Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
