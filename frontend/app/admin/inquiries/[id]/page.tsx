import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AdminInquiryDetailClient from "./AdminInquiryDetailClient";

export const metadata: Metadata = { title: "Inquiry — Admin", robots: { index: false, follow: false } };

interface Props { params: Promise<{ id: string }> }

export default async function AdminInquiryDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminLayout>
      <AdminInquiryDetailClient id={id} />
    </AdminLayout>
  );
}
