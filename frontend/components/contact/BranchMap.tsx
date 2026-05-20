"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-[1.4rem] bg-[rgba(127,216,210,0.10)]">
      <span className="text-[0.8rem] text-[rgba(90,74,66,0.85)]">Loading map…</span>
    </div>
  ),
});

export default function BranchMap({ branchId }: { branchId?: string }) {
  return <LeafletMap focusBranch={branchId} />;
}
