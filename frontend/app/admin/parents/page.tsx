import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import ParentsClient from "./ParentsClient";

export const metadata: Metadata = { title: "Admin – Parents", robots: { index: false, follow: false } };

export default function ParentsPage() {
  return (
    <AdminLayout>
      <ParentsClient />
    </AdminLayout>
  );
}
