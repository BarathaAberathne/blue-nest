"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { Enquiry, EnquiryTasks } from "@/types";

export type TaskKind = "overdue" | "due" | "visits" | "registered";

/**
 * Admissions progress strip above the kanban board: the funnel (New → Contacted
 * → Awaiting → Visit → Registered) with a conversion bar, plus clickable
 * "today's tasks" chips. Gives a manager the whole pipeline in one glance.
 */
export default function PipelineSummary({
  enquiries,
  tasks,
  onTask,
}: {
  enquiries: Enquiry[];
  tasks: EnquiryTasks | null;
  onTask: (kind: TaskKind) => void;
}) {
  const f = useMemo(() => {
    const count = (fn: (e: Enquiry) => boolean) => enquiries.filter(fn).length;
    const registered = count((e) => e.status === "registered");
    const qualified = count((e) => e.status !== "spam");
    return {
      total: enquiries.length,
      stages: [
        { label: "New", value: count((e) => e.status === "new"), color: "#2D7FF9" },
        { label: "Contacted", value: count((e) => e.status === "contacted"), color: "#F59E0B" },
        { label: "Awaiting", value: count((e) => e.status === "awaiting_reply"), color: "#7C3AED" },
        { label: "Visit", value: count((e) => e.status === "booked_visit" || e.status === "visit_completed"), color: "#0F9D8C" },
        { label: "Registered", value: registered, color: "#16A34A" },
      ],
      conversion: qualified > 0 ? Math.round((registered / qualified) * 1000) / 10 : 0,
    };
  }, [enquiries]);

  const chips: { kind: TaskKind; dot: string; cls: string; n: number; label: string }[] = tasks
    ? [
        { kind: "overdue", dot: "#DC2626", cls: "bg-rose-50 text-rose-700 hover:bg-rose-100", n: tasks.overdue_follow_ups.length, label: "overdue" },
        { kind: "due", dot: "#F59E0B", cls: "bg-amber-50 text-amber-700 hover:bg-amber-100", n: tasks.due_today.length, label: "due today" },
        { kind: "visits", dot: "#0F9D8C", cls: "bg-teal-50 text-teal-700 hover:bg-teal-100", n: tasks.visits_today.length, label: "visits today" },
        { kind: "registered", dot: "#16A34A", cls: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100", n: tasks.registrations_this_month.length, label: "registered this month" },
      ]
    : [];

  return (
    <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Funnel */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="mr-1 rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-bold text-white">{f.total} total</div>
          {f.stages.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-4 w-4 text-slate-300" />}
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-xs font-medium text-slate-500">{s.label}</span>
                <span className="text-sm font-bold text-slate-900">{s.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Today's tasks */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((c) => (
              <button
                key={c.kind}
                type="button"
                onClick={() => onTask(c.kind)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${c.cls}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
                {c.n} {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversion bar */}
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-[width] duration-500" style={{ width: `${Math.min(f.conversion, 100)}%` }} />
        </div>
        <span className="shrink-0 text-sm font-bold text-slate-900">{f.conversion}% <span className="font-medium text-slate-400">conversion</span></span>
      </div>
    </div>
  );
}
