import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  alternates: { canonical: "/cart" },
  title: "Your Cart — Blue Nest Montessori Store",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <PublicLayout>
      <CartClient />
    </PublicLayout>
  );
}

