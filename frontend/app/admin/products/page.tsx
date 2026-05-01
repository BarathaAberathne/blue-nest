import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminProductsClient from "./AdminProductsClient";

export const metadata: Metadata = { title: "Admin – Products" };

export default function AdminProductsPage() {
  return (
    <AdminLayout>
      <AdminProductsClient />
    </AdminLayout>
  );
}

