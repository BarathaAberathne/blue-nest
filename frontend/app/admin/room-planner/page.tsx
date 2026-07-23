import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import RoomPlannerClient from "./RoomPlannerClient";

export const metadata: Metadata = { title: "Admin – Room Planner", robots: { index: false, follow: false } };

export default function RoomPlannerPage() {
  return (
    <AdminLayout>
      <RoomPlannerClient />
    </AdminLayout>
  );
}
