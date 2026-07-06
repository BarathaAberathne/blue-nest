import clsx from "clsx";
import type { EnquiryStatus } from "@/types";
import { STATUS_META } from "@/lib/enquiry";

interface StatusBadgeProps {
  status: EnquiryStatus;
  withDot?: boolean;
  className?: string;
}

/** StatusBadge renders an enquiry status as a colour-coded pill. */
export default function StatusBadge({ status, withDot = true, className }: StatusBadgeProps) {
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        meta.badge,
        className,
      )}
    >
      {withDot && <span className={clsx("h-1.5 w-1.5 rounded-full", meta.dot)} />}
      {meta.label}
    </span>
  );
}
