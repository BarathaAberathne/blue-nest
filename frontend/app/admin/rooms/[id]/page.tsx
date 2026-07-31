import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import RoomDetailClient from "./RoomDetailClient";

export const metadata: Metadata = { title: "Admin – Room", robots: { index: false, follow: false } };

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AdminLayout>
      <RoomDetailClient id={id} />
    </AdminLayout>
  );
}
