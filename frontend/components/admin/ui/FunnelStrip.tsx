"use client";

import { ChevronRight } from "lucide-react";
import { ACCENT, type AccentName } from "@/lib/admin-theme";
import ProgressBar from "./ProgressBar";

export type FunnelStage = { label: string; value: number; accent: AccentName };
export type FunnelTask = { label: string; count: number; accent: AccentName; onClick?: () => void };

/**
 * Generic pipeline summary: a "total" pill + stage chips joined by arrows, an
 * optional row of clickable task chips, and an optional gradient conversion bar.
 * Generalizes the inquiry PipelineSummary so any process can show its funnel.
 */
export default function FunnelStrip({
  total,
  stages,
  conversion,
  conversionLabel = "conversion",
  tasks,
}: {
  total: number;
  stages: FunnelStage[];
  conversion?: number;
  conversionLabel?: string;
  tasks?: FunnelTask[];
}) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="mr-1 rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">{total} total</div>
          {stages.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-4 w-4 text-slate-300" />}
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: (ACCENT[s.accent] ?? ACCENT.slate).solid }} />
                <span className="text-xs font-medium text-slate-500">{s.label}</span>
                <span className="text-sm font-bold text-slate-900">{s.value}</span>
              </div>
            </div>
          ))}
        </div>

        {tasks && tasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {tasks.map((t) => {
              const a = ACCENT[t.accent] ?? ACCENT.slate;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={t.onClick}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${a.chip} ${t.onClick ? "hover:brightness-95" : "cursor-default"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: a.solid }} />
                  {t.count} {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {typeof conversion === "number" && (
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={conversion} gradient className="flex-1" height="h-2.5" />
          <span className="shrink-0 text-sm font-bold text-slate-900">{conversion}% <span className="font-medium text-slate-400">{conversionLabel}</span></span>
        </div>
      )}
    </div>
  );
}
