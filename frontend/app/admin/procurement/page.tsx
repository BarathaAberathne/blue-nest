import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import ProcurementOverviewClient from "./ProcurementOverviewClient";

export const metadata: Metadata = { title: "Admin – Procurement Overview", robots: { index: false, follow: false } };

export default function ProcurementOverviewPage() {
  return (
    <AdminLayout>
      <ProcurementOverviewClient />
    </AdminLayout>
  );
}
