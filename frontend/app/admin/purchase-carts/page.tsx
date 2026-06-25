import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminPurchaseCartsClient from "./AdminPurchaseCartsClient";

export const metadata: Metadata = { title: "Admin – Purchase Orders", robots: { index: false, follow: false } };

export default function AdminPurchaseCartsPage() {
  return (
    <AdminLayout>
      <AdminPurchaseCartsClient />
    </AdminLayout>
  );
}
