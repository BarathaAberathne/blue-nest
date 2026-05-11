"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PageWrapper from "@/components/ui/PageWrapper";
import { clearCart } from "@/lib/store-cart";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Order } from "@/types";

type ConfirmState = "polling" | "paid" | "timeout";

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 16; // ~40 s total

export default function CheckoutSuccessClient() {
  const [orderID, setOrderID] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>("polling");
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    clearCart();
    const params = new URLSearchParams(window.location.search);
    const id = params.get("order_id");
    setOrderID(id);

    if (!id) {
      setConfirmState("paid"); // no order to poll — just show success
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setConfirmState("paid");
      return;
    }

    const poll = async () => {
      attemptsRef.current += 1;
      try {
        const data = await api.getOrder(token, id) as Order;
        setOrder(data);
        if (data.status === "paid" || data.paid_at) {
          setConfirmState("paid");
          return;
        }
      } catch {
        // ignore — keep polling
      }

      if (attemptsRef.current >= POLL_MAX_ATTEMPTS) {
        setConfirmState("timeout");
        return;
      }

      timerRef.current = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isPaid = confirmState === "paid";
  const isPolling = confirmState === "polling";

  return (
    <PageWrapper className="flex justify-center items-center min-h-[60vh]">
      <div className="text-center max-w-md px-4">

        <div className="mb-6">
          <Image
            src="/doodles/pink-bird.png"
            alt="Blue Nest bird"
            width={64}
            height={64}
            className={isPaid ? "mx-auto animate-bounce-slow" : "mx-auto opacity-60"}
          />
        </div>

        {isPolling ? (
          <>
            <h1 className="text-2xl font-heading font-bold text-[var(--ink)] mb-3">
              Confirming your payment…
            </h1>
            <p className="text-[var(--muted)] mb-6 leading-relaxed">
              Please wait while we confirm your payment with Stripe. This usually takes a few seconds.
            </p>
            <div className="flex justify-center mb-6">
              <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-heading font-bold text-[var(--ink)] mb-3">
              {isPaid ? "Thank you! Your order is confirmed 🌿" : "Your order has been received"}
            </h1>
            <p className="text-[var(--muted)] mb-6 leading-relaxed">
              {isPaid
                ? "We've received your payment and our team is getting everything ready. A confirmation email has been sent to you."
                : "Your payment is being processed. We'll send you a confirmation email once it's confirmed."}
            </p>
          </>
        )}

        {orderID && (
          <p className="text-xs text-[var(--muted)] mb-2">
            Order reference:{" "}
            <span className="font-semibold text-[var(--ink)] font-mono">{orderID}</span>
          </p>
        )}
        {isPaid && order?.status && (
          <p className="text-xs mb-6">
            Status:{" "}
            <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold text-xs uppercase tracking-wide">
              {order.status}
            </span>
          </p>
        )}

        {!isPolling && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/account/orders" className="btn-primary">
              View Orders
            </Link>
            <Link href="/nursery-store" className="btn-outline">
              Continue Shopping
            </Link>
          </div>
        )}

        <p className="text-xs text-[var(--muted)] mt-6">
          Need help? Our team is always happy to assist 🌿
        </p>
      </div>
    </PageWrapper>
  );
}
