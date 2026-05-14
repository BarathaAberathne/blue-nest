import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminUsersClient from "./AdminUsersClient";

export const metadata: Metadata = { title: "Admin – Users", robots: { index: false, follow: false } };

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <AdminUsersClient />
    </AdminLayout>
  );
}
