import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import RoomsClient from "./RoomsClient";

export const metadata: Metadata = { title: "Admin – Rooms", robots: { index: false, follow: false } };

export default function RoomsPage() {
  return (
    <AdminLayout>
      <RoomsClient />
    </AdminLayout>
  );
}
