import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import ProcurementAnalyticsClient from "./ProcurementAnalyticsClient";

export const metadata: Metadata = { title: "Admin – Procurement Analytics", robots: { index: false, follow: false } };

export default function ProcurementAnalyticsPage() {
  return (
    <AdminLayout>
      <ProcurementAnalyticsClient />
    </AdminLayout>
  );
}
