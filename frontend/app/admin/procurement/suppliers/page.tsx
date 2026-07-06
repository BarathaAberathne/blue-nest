import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import SuppliersClient from "./SuppliersClient";

export const metadata: Metadata = { title: "Admin – Suppliers", robots: { index: false, follow: false } };

export default function SuppliersPage() {
  return (
    <AdminLayout>
      <SuppliersClient />
    </AdminLayout>
  );
}
