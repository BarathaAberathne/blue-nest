import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminBlogClient from "./AdminBlogClient";

export const metadata: Metadata = { title: "Admin – Blog" };

export default function AdminBlogPage() {
  return (
    <AdminLayout>
      <AdminBlogClient />
    </AdminLayout>
  );
}
