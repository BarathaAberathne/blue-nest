"use client";

// BackLink — THE back control for admin detail pages. It goes to the actual
// previous screen (browser history) so e.g. daily-log detail opened from a
// child profile returns to that child, not to the daily-log list. `fallback`
// covers deep links / fresh tabs with no in-app history — then it goes to the
// section list the page belongs to.

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackLink({
  fallback,
  label = "Back",
  className = "mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-600",
}: {
  fallback: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <button type="button" onClick={goBack} className={className}>
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}
