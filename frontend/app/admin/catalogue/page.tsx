import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminCatalogueClient from "./AdminCatalogueClient";

export const metadata: Metadata = { title: "Admin – Catalogue", robots: { index: false, follow: false } };

export default function AdminCataloguePage() {
  return (
    <AdminLayout>
      <AdminCatalogueClient />
    </AdminLayout>
  );
}
