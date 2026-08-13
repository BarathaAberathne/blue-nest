import type { Metadata } from "next";
import InductionWizardClient from "./InductionWizardClient";

export const metadata: Metadata = { title: "Induction | Blue Nest Parent Portal", robots: { index: false, follow: false } };

export default async function PortalInductionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InductionWizardClient childId={id} />;
}
