import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = { title: "Admin Dashboard — Blue Nest", robots: { index: false, follow: false } };

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <DashboardClient />
    </AdminLayout>
  );
}
