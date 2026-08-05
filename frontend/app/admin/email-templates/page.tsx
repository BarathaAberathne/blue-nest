import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import EmailTemplatesClient from "./EmailTemplatesClient";

export const metadata: Metadata = { title: "Admin – Email templates", robots: { index: false, follow: false } };

export default function EmailTemplatesPage() {
  return (
    <AdminLayout>
      <EmailTemplatesClient />
    </AdminLayout>
  );
}
