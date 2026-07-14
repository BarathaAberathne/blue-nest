import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import StaffClient from "./StaffClient";

export const metadata: Metadata = { title: "Admin – Staff", robots: { index: false, follow: false } };

export default function StaffPage() {
  return (
    <AdminLayout>
      <StaffClient />
    </AdminLayout>
  );
}
