import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminInquiriesClient from "./AdminInquiriesClient";

export const metadata: Metadata = { title: "Admin – Enquiries", robots: { index: false, follow: false } };

export default function AdminInquiriesPage() {
  return (
    <AdminLayout>
      <AdminInquiriesClient />
    </AdminLayout>
  );
}
