import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  alternates: { canonical: "/login" },
  title: "Sign In — Blue Nest Montessori",
  description: "Sign in to your Blue Nest Montessori parent account.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <PublicLayout>
      <LoginClient />
    </PublicLayout>
  );
}

