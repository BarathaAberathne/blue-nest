import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";

export const metadata: Metadata = { title: "Order Confirmed" };

export default function CheckoutSuccessPage() {
  return (
    <PublicLayout>
      <PageWrapper className="flex justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 mb-3">Order Confirmed!</h1>
          <p className="text-gray-500 mb-8">
            Thank you for your purchase. You&apos;ll receive a confirmation email shortly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/account/orders" className="btn-primary">View My Orders</Link>
            <Link href="/nursery-store" className="btn-outline">Continue Shopping</Link>
          </div>
        </div>
      </PageWrapper>
    </PublicLayout>
  );
}
