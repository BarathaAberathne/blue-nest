import type { Metadata } from "next";
import PortalShell from "@/components/portal/PortalShell";
import PortalChildClient from "./PortalChildClient";

export const metadata: Metadata = { title: "My Child | Blue Nest Parent Portal", robots: { index: false, follow: false } };

export default async function PortalChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PortalShell>
      <PortalChildClient childId={id} />
    </PortalShell>
  );
}
