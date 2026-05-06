import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminOrdersClient from "./AdminOrdersClient";

export const metadata: Metadata = { title: "Admin – Orders" };

export default function AdminOrdersPage() {
  return (
    <AdminLayout>
      <AdminOrdersClient />
    </AdminLayout>
  );
}
