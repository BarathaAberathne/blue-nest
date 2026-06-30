import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import InquiryDashboardClient from "./InquiryDashboardClient";

export const metadata: Metadata = {
  title: "Admin – Inquiry Dashboard",
  robots: { index: false, follow: false },
};

export default function InquiryDashboardPage() {
  return (
    <AdminLayout>
      <InquiryDashboardClient />
    </AdminLayout>
  );
}
