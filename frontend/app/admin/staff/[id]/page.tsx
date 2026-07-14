import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import StaffDetailClient from "./StaffDetailClient";

export const metadata: Metadata = { title: "Admin – Staff member", robots: { index: false, follow: false } };

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <StaffDetailClient id={id} />
    </AdminLayout>
  );
}
