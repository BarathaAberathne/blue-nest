import type { Metadata } from "next";
import KioskClient from "./KioskClient";

// Entrance-tablet attendance kiosk. Full-screen, distraction-free, device-token
// authenticated — deliberately NOT wrapped in AdminLayout and never exposes the
// CMS. Noindexed.
export const metadata: Metadata = {
  title: "Attendance Kiosk · Blue Nest",
  robots: { index: false, follow: false },
};

export default function KioskPage() {
  return <KioskClient />;
}
