import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminUsersClient from "./AdminUsersClient";

export const metadata: Metadata = { title: "Admin – Users" };

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <AdminUsersClient />
    </AdminLayout>
  );
}
