"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import PageWrapper from "@/components/ui/PageWrapper";
import { clearCart } from "@/lib/store-cart";

export default function CheckoutSuccessClient() {
  const [orderID, setOrderID] = useState<string | null>(null);

  useEffect(() => {
    clearCart();
    const params = new URLSearchParams(window.location.search);
    setOrderID(params.get("order_id"));
  }, []);

  return (
    <PageWrapper className="flex justify-center items-center min-h-[60vh]">
      <div className="text-center max-w-md px-4">

        {/* Friendly visual instead of emoji */}
        <div className="mb-6">
          <Image
            src="/doodles/pink-bird.png"
            alt="Blue Nest bird"
            width={64}
            height={64}
            className="mx-auto animate-bounce-slow"
          />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-heading font-bold text-[var(--ink)] mb-3">
          Thank you! Your order is on its way 💛
        </h1>

        {/* Message */}
        <p className="text-[var(--muted)] mb-6 leading-relaxed">
          We’ve received your order and our team is getting everything ready for you.
          A confirmation email will be sent shortly with all the details.
        </p>

        {/* Order ID */}
        {orderID && (
          <p className="text-xs text-[var(--muted)] mb-6">
            Order reference:{" "}
            <span className="font-semibold text-[var(--ink)]">{orderID}</span>
          </p>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/account/orders" className="btn-primary">
            View Orders
          </Link>
          <Link href="/nursery-store" className="btn-outline">
            Continue Shopping
          </Link>
        </div>

        {/* Soft reassurance note */}
        <p className="text-xs text-[var(--muted)] mt-6">
          If you need any help, our team is always happy to assist 🌿
        </p>
      </div>
    </PageWrapper>
  );
}
