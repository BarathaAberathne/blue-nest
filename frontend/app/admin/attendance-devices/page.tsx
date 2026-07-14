import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import DevicesClient from "./DevicesClient";

export const metadata: Metadata = { title: "Attendance Devices – Admin", robots: { index: false, follow: false } };

export default function AttendanceDevicesPage() {
  return (
    <AdminLayout>
      <DevicesClient />
    </AdminLayout>
  );
}
