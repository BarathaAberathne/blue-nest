import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import OnboardingBoardClient from "./OnboardingBoardClient";

export const metadata: Metadata = { title: "Admin – Onboarding", robots: { index: false, follow: false } };

export default function OnboardingPage() {
  return (
    <AdminLayout>
      <OnboardingBoardClient />
    </AdminLayout>
  );
}
