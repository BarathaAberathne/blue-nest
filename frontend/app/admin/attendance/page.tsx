import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import AttendanceClient from "./AttendanceClient";

export const metadata: Metadata = { title: "Admin – Attendance", robots: { index: false, follow: false } };

export default function AttendancePage() {
  return (
    <AdminLayout>
      <AttendanceClient />
    </AdminLayout>
  );
}
