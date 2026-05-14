import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import CheckoutSuccessClient from "./CheckoutSuccessClient";

export const metadata: Metadata = {
  alternates: { canonical: "/checkout/success" },
  title: "Order Confirmed — Blue Nest Montessori",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <PublicLayout>
      <CheckoutSuccessClient />
    </PublicLayout>
  );
}

