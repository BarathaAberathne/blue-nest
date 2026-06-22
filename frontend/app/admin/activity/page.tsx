import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminActivityClient from "./AdminActivityClient";

export const metadata: Metadata = { title: "Admin – Activity", robots: { index: false, follow: false } };

export default function AdminActivityPage() {
  return (
    <AdminLayout>
      <AdminActivityClient />
    </AdminLayout>
  );
}
