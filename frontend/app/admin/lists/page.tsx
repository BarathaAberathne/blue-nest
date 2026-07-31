import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import ListsClient from "./ListsClient";

export const metadata: Metadata = { title: "Admin – Lists", robots: { index: false, follow: false } };

export default function ListsPage() {
  return (
    <AdminLayout>
      <ListsClient />
    </AdminLayout>
  );
}
