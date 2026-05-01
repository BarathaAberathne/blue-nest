import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminCategoriesClient from "./AdminCategoriesClient";

export const metadata: Metadata = { title: "Admin – Categories" };

export default function AdminCategoriesPage() {
  return (
    <AdminLayout>
      <AdminCategoriesClient />
    </AdminLayout>
  );
}
