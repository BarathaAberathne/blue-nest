import type { Metadata } from "next";
import PortalClient from "./PortalClient";

export const metadata: Metadata = { title: "Parent Portal | Blue Nest Montessori", robots: { index: false, follow: false } };

export default function PortalPage() {
  return <PortalClient />;
}
