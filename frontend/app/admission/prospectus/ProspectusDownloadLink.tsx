"use client";

import { Download } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

// Small client wrapper so the prospectus page stays a server component but
// the download button can fire a GA4 conversion event. The browser's
// default download behaviour runs as soon as the link is followed — we
// just emit the event alongside it.
export default function ProspectusDownloadLink() {
  return (
    <a
      href="/prospectus.pdf"
      download
      onClick={() => {
        trackEvent("prospectus_download", {
          form_name: "prospectus",
          page_path: typeof window !== "undefined" ? window.location.pathname : undefined,
        });
      }}
      className="inline-flex items-center gap-2.5 rounded-full bg-[#f7d774] px-7 py-3.5 font-heading text-[1.35rem] leading-none tracking-[0.04em] text-[var(--ink)] shadow-[0_6px_20px_rgba(247,215,116,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f5c842]"
    >
      <Download className="h-5 w-5" strokeWidth={2} />
      Download Prospectus
    </a>
  );
}
