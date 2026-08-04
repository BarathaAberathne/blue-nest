import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = { title: "My Profile", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return (
    <AdminLayout>
      <ProfileClient />
    </AdminLayout>
  );
}
