import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminBlogClient from "./AdminBlogClient";

export const metadata: Metadata = { title: "Admin – Blog", robots: { index: false, follow: false } };

export default function AdminBlogPage() {
  return (
    <AdminLayout>
      <AdminBlogClient />
    </AdminLayout>
  );
}
