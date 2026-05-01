import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import CheckoutSuccessClient from "./CheckoutSuccessClient";

export const metadata: Metadata = { title: "Order Confirmed" };

export default function CheckoutSuccessPage() {
  return (
    <PublicLayout>
      <CheckoutSuccessClient />
    </PublicLayout>
  );
}

