import { Suspense } from "react";
import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = { title: "My Profile", robots: { index: false, follow: false } };

export default function ProfilePage() {
  return (
    <AdminLayout>
      {/* Suspense: ProfileClient reads ?tab= via useSearchParams */}
      <Suspense>
        <ProfileClient />
      </Suspense>
    </AdminLayout>
  );
}
