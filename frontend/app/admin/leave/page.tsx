import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import LeaveClient from "./LeaveClient";

export const metadata: Metadata = { title: "Leave Requests", robots: { index: false, follow: false } };

export default function LeavePage() {
  return (
    <AdminLayout>
      <LeaveClient />
    </AdminLayout>
  );
}
