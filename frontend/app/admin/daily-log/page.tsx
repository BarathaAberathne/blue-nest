import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import DailyLogClient from "./DailyLogClient";

export const metadata: Metadata = { title: "Admin – Daily Log", robots: { index: false, follow: false } };

export default function DailyLogPage() {
  return (
    <AdminLayout>
      <DailyLogClient />
    </AdminLayout>
  );
}
