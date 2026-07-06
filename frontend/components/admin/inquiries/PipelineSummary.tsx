"use client";

import { useMemo } from "react";
import FunnelStrip from "@/components/admin/ui/FunnelStrip";
import type { Enquiry, EnquiryTasks } from "@/types";

export type TaskKind = "overdue" | "due" | "visits" | "registered";

/**
 * Admissions funnel summary — now a thin wrapper over the shared FunnelStrip:
 * the New → … → Registered funnel with a conversion bar, plus clickable
 * "today's tasks" chips.
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
  const { stages, conversion } = useMemo(() => {
    const count = (fn: (e: Enquiry) => boolean) => enquiries.filter(fn).length;
    const registered = count((e) => e.status === "registered");
    const qualified = count((e) => e.status !== "spam");
    return {
      stages: [
        { label: "New", value: count((e) => e.status === "new"), accent: "blue" as const },
        { label: "Contacted", value: count((e) => e.status === "contacted"), accent: "amber" as const },
        { label: "Awaiting", value: count((e) => e.status === "awaiting_reply"), accent: "violet" as const },
        { label: "Visit", value: count((e) => e.status === "booked_visit" || e.status === "visit_completed"), accent: "teal" as const },
        { label: "Registered", value: registered, accent: "green" as const },
      ],
      conversion: qualified > 0 ? Math.round((registered / qualified) * 1000) / 10 : 0,
    };
  }, [enquiries]);

  return (
    <FunnelStrip
      total={enquiries.length}
      stages={stages}
      conversion={conversion}
      tasks={tasks ? [
        { label: "overdue", count: tasks.overdue_follow_ups.length, accent: "red", onClick: () => onTask("overdue") },
        { label: "due today", count: tasks.due_today.length, accent: "amber", onClick: () => onTask("due") },
        { label: "visits today", count: tasks.visits_today.length, accent: "teal", onClick: () => onTask("visits") },
        { label: "registered this month", count: tasks.registrations_this_month.length, accent: "green", onClick: () => onTask("registered") },
      ] : undefined}
    />
  );
}
