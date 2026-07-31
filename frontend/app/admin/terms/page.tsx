import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import TermsClient from "./TermsClient";

export const metadata: Metadata = { title: "Admin – Term dates", robots: { index: false, follow: false } };

export default function TermsPage() {
  return (
    <AdminLayout>
      <TermsClient />
    </AdminLayout>
  );
}
