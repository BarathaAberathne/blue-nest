"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageWrapper from "@/components/ui/PageWrapper";
import { api } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import {
  formatPence,
  getCartUpdatedEventName,
  loadCart,
  notifyCartUpdated,
  removeFromCart,
  updateCartQuantity,
  type StoreCartItem,
} from "@/lib/store-cart";
import type { Cart } from "@/types";

const SHIPPING_PENCE = 399;

export default function CartClient() {
  const { token, isAuthenticated, ensureAuthenticated } = useAuthGuard();
  const [items, setItems] = useState<StoreCartItem[]>([]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  useEffect(() => {
    const mapServerCart = (cart: Cart | null | undefined): StoreCartItem[] => {
      if (!cart?.items || !Array.isArray(cart.items)) return [];
      return cart.items.map((item) => ({
        id: item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.qty,
      }));
    };

    const refreshCart = async () => {
      if (isAuthenticated && token) {
        try {
          const serverCart = await api.getCart(token) as Cart;
          setItems(mapServerCart(serverCart));
          return;
        } catch {
          setItems([]);
          return;
        }
      }
      setItems(loadCart());
    };
    void refreshCart();

    const eventName = getCartUpdatedEventName();
    const handleEvent = () => {
      void refreshCart();
    };
    window.addEventListener(eventName, handleEvent);
    window.addEventListener("storage", handleEvent);

    return () => {
      window.removeEventListener(eventName, handleEvent);
      window.removeEventListener("storage", handleEvent);
    };
  }, [isAuthenticated, token]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = items.length === 0 ? 0 : subtotal >= 3000 ? 0 : SHIPPING_PENCE;
  const total = subtotal + shipping;

  const handleUpdateQty = async (item: StoreCartItem, delta: number) => {
    const nextQty = item.quantity + delta;
    if (nextQty <= 0) {
      if (isAuthenticated && token) {
        try {
          const cart = await api.removeCartItem(token, item.id) as Cart;
          setItems(Array.isArray(cart?.items) ? cart.items.map((entry) => ({
            id: entry.product_id,
            name: entry.name,
            price: entry.price,
            quantity: entry.qty,
          })) : []);
          notifyCartUpdated();
        } catch {
          return;
        }
      } else {
        setItems(removeFromCart(item.id));
      }
      return;
    }

    if (isAuthenticated && token) {
      try {
        const cart = await api.updateCartItem(token, item.id, { qty: nextQty }) as Cart;
        setItems(Array.isArray(cart?.items) ? cart.items.map((entry) => ({
          id: entry.product_id,
          name: entry.name,
          price: entry.price,
          quantity: entry.qty,
        })) : []);
        notifyCartUpdated();
      } catch {
        return;
      }
    } else {
      setItems(updateCartQuantity(item.id, nextQty));
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    if (!ensureAuthenticated("/cart")) {
      setCheckoutError("Please sign in first to continue to checkout.");
      return;
    }

    setCheckoutError(null);
    setSubmittingCheckout(true);

    try {
      const origin = window.location.origin;
      const session = await api.createCheckoutSession(token, {
        success_url: `${origin}/checkout/success`,
        cancel_url: `${origin}/checkout/cancel`,
      });

      if (session?.url) {
        window.location.href = session.url;
        return;
      }

      if (session?.session_id) {
        window.location.href = `/checkout/success?session_id=${encodeURIComponent(session.session_id)}`;
        return;
      }

      throw new Error("Checkout session did not return a redirect URL");
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setSubmittingCheckout(false);
    }
  };

  return (
    <PageWrapper>
      <h1 className="font-heading text-[2.4rem] sm:text-[3rem] text-[var(--ink)] mb-8">Your Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="font-heading text-[1.4rem] text-[var(--ink)]">Your cart is empty</p>
              <p className="text-sm text-[var(--muted)] mt-1">Add something from the nursery store to get started.</p>
              <Link href="/nursery-store" className="btn-primary inline-flex mt-4">
                Continue Shopping
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="card p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[rgba(127,216,210,0.12)] flex items-center justify-center text-2xl shrink-0">
                  {item.emoji ?? "🛍️"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--ink)] text-sm truncate">{item.name}</p>
                  <p className="text-xs text-[var(--muted)]">{formatPence(item.price)} each</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleUpdateQty(item, -1)}
                      className="h-8 w-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                      aria-label={`Decrease quantity for ${item.name}`}
                    >
                      -
                    </button>
                    <p className="text-xs text-[var(--muted)]">Qty: {item.quantity}</p>
                    <button
                      type="button"
                      onClick={() => void handleUpdateQty(item, 1)}
                      className="h-8 w-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                      aria-label={`Increase quantity for ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[var(--ink)]">{formatPence(item.price * item.quantity)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void handleUpdateQty(item, -item.quantity);
                    }}
                    className="mt-1 text-xs text-[var(--rose-ink)] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card p-6 h-fit">
          <h2 className="font-heading text-[1.5rem] text-[var(--ink)] mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-[var(--muted)]">
              <span>Subtotal</span>
              <span>{formatPence(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[var(--muted)]">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : formatPence(shipping)}</span>
            </div>
            <div className="border-t border-[rgba(90,74,66,0.08)] pt-2 flex justify-between font-bold text-[var(--ink)]">
              <span>Total</span>
              <span>{formatPence(total)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={items.length === 0 || submittingCheckout}
            className="btn-primary w-full text-center mt-4 block disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingCheckout ? "Starting Checkout..." : "Proceed to Checkout"}
          </button>
          {checkoutError && <p className="mt-3 text-xs text-red-500">{checkoutError}</p>}
        </div>
      </div>
    </PageWrapper>
  );
}
