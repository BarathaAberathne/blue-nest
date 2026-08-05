import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import FeesClient from "./FeesClient";

export const metadata: Metadata = { title: "Admin – Fees", robots: { index: false, follow: false } };

export default function FeesPage() {
  return (
    <AdminLayout>
      <FeesClient />
    </AdminLayout>
  );
}
