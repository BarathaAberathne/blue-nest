import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import DailyLogDetailClient from "./DailyLogDetailClient";

export const metadata: Metadata = { title: "Admin – Daily log", robots: { index: false, follow: false } };

export default async function DailyLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <DailyLogDetailClient id={id} />
    </AdminLayout>
  );
}
