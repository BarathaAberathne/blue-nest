import type { Metadata } from "next";
import PortalShell from "@/components/portal/PortalShell";
import PortalProfileClient from "./PortalProfileClient";

export const metadata: Metadata = { title: "My Profile | Blue Nest Parent Portal", robots: { index: false, follow: false } };

export default function PortalProfilePage() {
  return (
    <PortalShell>
      <PortalProfileClient />
    </PortalShell>
  );
}
