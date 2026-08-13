import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import FinanceClient from "./FinanceClient";

export const metadata: Metadata = { title: "Admin – Finance", robots: { index: false, follow: false } };

export default function FinancePage() {
  return (
    <AdminLayout>
      <FinanceClient />
    </AdminLayout>
  );
}
