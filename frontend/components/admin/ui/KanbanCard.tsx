"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ACCENT, type AccentName } from "@/lib/admin-theme";
import StageBadge from "./StageBadge";
import ProgressBar from "./ProgressBar";

/**
 * Generic premium board card — the shared chrome behind the non-enquiry Kanban
 * cards: accent dot + title (links to detail), an optional top-right slot,
 * subtitle, accent badges, a meta row, an optional progress bar, one prominent
 * primary action and a quiet footer slot. Hover lifts.
 */
export default function KanbanCard({
  accent,
  title,
  href,
  rightTop,
  subtitle,
  badges,
  meta,
  progress,
  primary,
  footer,
}: {
  accent: AccentName;
  title: string;
  href?: string;
  rightTop?: React.ReactNode;
  subtitle?: React.ReactNode;
  badges?: { label: string; accent?: AccentName }[];
  meta?: React.ReactNode;
  progress?: { value: number; accent?: AccentName; label?: string };
  primary?: { label: string; onClick: () => void };
  footer?: React.ReactNode;
}) {
  return (
    <div className="group relative rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,23,42,0.13)]">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white" style={{ background: (ACCENT[accent] ?? ACCENT.slate).solid }} />
          {href ? (
            <Link href={href} className="truncate font-semibold leading-tight text-slate-900 hover:text-teal-700">{title}</Link>
          ) : (
            <p className="truncate font-semibold leading-tight text-slate-900">{title}</p>
          )}
        </div>
        {rightTop}
      </div>

      {subtitle && <p className="mb-2 text-xs text-slate-500">{subtitle}</p>}

      {badges && badges.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {badges.map((b, i) => <StageBadge key={i} label={b.label} accent={b.accent ?? "slate"} withDot={false} />)}
        </div>
      )}

      {meta && <div className="mb-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">{meta}</div>}

      {progress && (
        <div className="mb-2.5">
          {progress.label && <p className="mb-1 text-[0.7rem] font-medium text-slate-500">{progress.label}</p>}
          <ProgressBar value={progress.value} accent={progress.accent ?? accent} height="h-1.5" />
        </div>
      )}

      {primary && (
        <button
          type="button"
          onClick={primary.onClick}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
        >
          {primary.label} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}

      {footer && <div className="mt-2 flex items-center justify-between border-t border-slate-50 pt-2 opacity-70 transition-opacity group-hover:opacity-100">{footer}</div>}
    </div>
  );
}
