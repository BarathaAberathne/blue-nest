import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";

export const metadata: Metadata = {
  alternates: { canonical: "/checkout/cancel" },
  title: "Checkout Cancelled — Blue Nest Montessori",
  robots: { index: false, follow: false },
};

export default function CheckoutCancelPage() {
  return (
    <PublicLayout>
      <PageWrapper className="flex justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6" role="img" aria-label="Disappointed face">😔</div>
          <h1 className="text-2xl font-heading font-bold text-[var(--ink)] mb-3">Checkout Cancelled</h1>
          <p className="text-[var(--muted)] mb-8">No worries — your cart items are still saved.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/cart" className="btn-primary">Back to Cart</Link>
            <Link href="/nursery-store" className="btn-outline">Continue Shopping</Link>
          </div>
        </div>
      </PageWrapper>
    </PublicLayout>
  );
}
