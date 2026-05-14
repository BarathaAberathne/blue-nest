import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  alternates: { canonical: "/register" },
  title: "Create Account — Blue Nest Montessori",
  description: "Create your Blue Nest Montessori parent account.",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <PublicLayout>
      <RegisterClient />
    </PublicLayout>
  );
}

