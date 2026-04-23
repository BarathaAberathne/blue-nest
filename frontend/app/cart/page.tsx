import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <h1 className="section-title mb-8">Your Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {/* Placeholder items */}
            {[1, 2].map((i) => (
              <div key={i} className="card p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-brand-50 flex items-center justify-center text-2xl shrink-0">🛍️</div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Product Name {i}</p>
                  <p className="text-xs text-gray-400">Qty: 1</p>
                </div>
                <p className="font-semibold text-gray-800">£12.99</p>
              </div>
            ))}
            <p className="text-xs text-gray-400 pt-2">Cart connected to API when auth is implemented.</p>
          </div>

          {/* Summary */}
          <div className="card p-6 h-fit">
            <h2 className="font-heading font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>£25.98</span></div>
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span>£3.99</span></div>
              <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-gray-900">
                <span>Total</span><span>£29.97</span>
              </div>
            </div>
            <Link href="/checkout/success" className="btn-primary w-full text-center mt-4 block">
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </PageWrapper>
    </PublicLayout>
  );
}
