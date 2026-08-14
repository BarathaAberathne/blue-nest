import type { Metadata } from "next";
import PortalShell from "@/components/portal/PortalShell";
import PortalPaymentsClient from "./PortalPaymentsClient";

export const metadata: Metadata = { title: "Payments & Orders | Blue Nest Parent Portal", robots: { index: false, follow: false } };

export default function PortalPaymentsPage() {
  return (
    <PortalShell>
      <PortalPaymentsClient />
    </PortalShell>
  );
}
