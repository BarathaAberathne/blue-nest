import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import MyLeaveClient from "./MyLeaveClient";

export const metadata: Metadata = { title: "My Leave", robots: { index: false, follow: false } };

export default function MyLeavePage() {
  return (
    <AdminLayout>
      <MyLeaveClient />
    </AdminLayout>
  );
}
