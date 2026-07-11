import type { Metadata } from "next";
import CommandCenterClient from "./CommandCenterClient";

// MD "Blue Nest Command Centre" — a self-contained executive HUD. It renders its
// own full-screen dark shell (it deliberately does NOT use AdminLayout) and shows
// static, curated figures matching the approved design mock; no data is wired to
// the backend yet. Noindexed like the rest of the admin surface.
export const metadata: Metadata = {
  title: "MD Command Centre",
  robots: { index: false, follow: false },
};

export default function CommandCenterPage() {
  return <CommandCenterClient />;
}
