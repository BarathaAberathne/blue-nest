import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminOrderRequestsClient from "./AdminOrderRequestsClient";

export const metadata: Metadata = { title: "Admin – Supply Requests", robots: { index: false, follow: false } };

export default function AdminOrderRequestsPage() {
  return (
    <AdminLayout>
      <AdminOrderRequestsClient />
    </AdminLayout>
  );
}
