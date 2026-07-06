import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminMyRequestsClient from "./AdminMyRequestsClient";

export const metadata: Metadata = { title: "My Supply Requests", robots: { index: false, follow: false } };

export default function AdminMyRequestsPage() {
  return (
    <AdminLayout>
      <AdminMyRequestsClient />
    </AdminLayout>
  );
}
