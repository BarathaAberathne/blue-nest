import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import StaffAttendanceClient from "./StaffAttendanceClient";

export const metadata: Metadata = { title: "Admin – Staff Rota", robots: { index: false, follow: false } };

export default function StaffAttendancePage() {
  return (
    <AdminLayout>
      <StaffAttendanceClient />
    </AdminLayout>
  );
}
