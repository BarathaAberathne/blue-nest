"use client";

import KanbanBoard from "@/components/admin/ui/KanbanBoard";
import { ACCENT } from "@/lib/admin-theme";
import { PIPELINE_LANES, avgStageDays } from "@/lib/enquiry";
import EnquiryCard from "./EnquiryCard";
import type { Enquiry, EnquiryStatus } from "@/types";

/**
 * The admissions pipeline — now a thin wrapper over the shared generic
 * KanbanBoard, supplying the enquiry lanes, the EnquiryCard renderer, a
 * status-change drop handler and the per-lane "average days in stage" footer.
 */
export default function PipelineBoard({
  enquiries,
  onStatus,
  onNote,
  onFollowUp,
}: {
  enquiries: Enquiry[];
  onStatus: (e: Enquiry, status: EnquiryStatus) => void;
  onNote: (e: Enquiry) => void;
  onFollowUp: (e: Enquiry) => void;
}) {
  return (
    <KanbanBoard<Enquiry, EnquiryStatus>
      columns={PIPELINE_LANES}
      items={enquiries}
      statusOf={(e) => e.status}
      idOf={(e) => e.id}
      onDrop={(e, dropStatus) => onStatus(e, dropStatus)}
      renderCard={(e) => <EnquiryCard enquiry={e} onStatus={onStatus} onNote={onNote} onFollowUp={onFollowUp} />}
      columnFooter={(items, lane) => {
        const avg = avgStageDays(items);
        return avg !== null ? (
          <p className="mt-2 text-[0.65rem] font-semibold uppercase tracking-wider" style={{ color: ACCENT[lane.accent].solid }}>
            Avg {avg} {avg === 1 ? "day" : "days"} in stage
          </p>
        ) : null;
      }}
    />
  );
}
