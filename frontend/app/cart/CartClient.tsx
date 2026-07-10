"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageWrapper from "@/components/ui/PageWrapper";
import { api } from "@/lib/api";
import { useAuthGuard } from "@/lib/useAuthGuard";
import {
  cartItemKey,
  formatPence,
  getCartUpdatedEventName,
  loadCart,
  notifyCartUpdated,
  removeFromCart,
  syncCartSilently,
  updateCartQuantity,
  type StoreCartItem,
} from "@/lib/store-cart";
import type { Branch, Cart } from "@/types";

const SHIPPING_PENCE = 399;
const NOT_APPLICABLE = "n/a";

function mapCart(cart: Cart): StoreCartItem[] {
  return Array.isArray(cart?.items)
    ? cart.items.map((entry) => ({
        id: entry.product_id,
        name: entry.name,
        price: entry.price,
        quantity: entry.qty,
        size: entry.size,
      }))
    : [];
}

export default function CartClient() {
  const { token, isAuthenticated, ensureAuthenticated, user } = useAuthGuard();
  const [items, setItems] = useState<StoreCartItem[]>([]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  // Checkout details collected in-app before Stripe (Stripe collects + validates
  // the delivery / billing address itself).
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [branchSlug, setBranchSlug] = useState(NOT_APPLICABLE);
  const [childRef, setChildRef] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);

  // Prefill name + email from the signed-in account; load nursery branches.
  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || [user.first_name, user.last_name].filter(Boolean).join(" ").trim());
      setEmail((prev) => prev || user.email || "");
    }
  }, [user]);

  useEffect(() => {
    api
      .getBranches()
      .then((b) => setBranches((Array.isArray(b) ? (b as Branch[]) : []).filter((x) => x.status === "active")))
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    const refreshCart = async () => {
      if (isAuthenticated && token) {
        try {
          const serverCart = await api.getCart(token) as Cart;
          const mapped = mapCart(serverCart);
          setItems(mapped);
          syncCartSilently(mapped);
          return;
        } catch {
          // Server fetch failed — show cached localStorage items rather than clearing
          setItems(loadCart());
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
          const cart = await api.removeCartItem(token, item.id, item.size) as Cart;
          const mapped = mapCart(cart);
          setItems(mapped);
          syncCartSilently(mapped);
          notifyCartUpdated();
        } catch {
          return;
        }
      } else {
        setItems(removeFromCart(item.id, item.size));
      }
      return;
    }

    if (isAuthenticated && token) {
      try {
        const cart = await api.updateCartItem(token, item.id, { qty: nextQty, size: item.size }) as Cart;
        const mapped = mapCart(cart);
        setItems(mapped);
        syncCartSilently(mapped);
        notifyCartUpdated();
      } catch {
        return;
      }
    } else {
      setItems(updateCartQuantity(item.id, nextQty, item.size));
    }
  };

  // Basic email + UK phone validation (Stripe validates the address downstream).
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneValid = email.trim() !== "" && phone.replace(/[^\d]/g, "").length >= 7;
  const detailsValid = fullName.trim() !== "" && emailValid && phoneValid;

  const handleCheckout = async () => {
    if (items.length === 0) return;

    if (!ensureAuthenticated("/cart")) {
      setCheckoutError("Please sign in first to continue to checkout.");
      return;
    }

    if (fullName.trim() === "") return setCheckoutError("Please enter your full name.");
    if (!emailValid) return setCheckoutError("Please enter a valid email address.");
    if (!phoneValid) return setCheckoutError("Please enter a valid telephone number.");

    setCheckoutError(null);
    setSubmittingCheckout(true);

    try {
      const origin = window.location.origin;
      const session = await api.createCheckoutSession(token, {
        success_url: `${origin}/checkout/success`,
        cancel_url: `${origin}/checkout/cancel`,
        customer_name: fullName.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim(),
        branch_slug: branchSlug,
        child_ref: childRef.trim() || undefined,
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
              <div key={cartItemKey(item.id, item.size)} className="card p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[rgba(127,216,210,0.12)] flex items-center justify-center text-2xl shrink-0">
                  {item.emoji ?? "🛍️"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--ink)] text-sm truncate">{item.name}</p>
                  {item.size && (
                    <p className="text-xs text-[rgba(90,74,66,0.85)]">Age: {item.size}</p>
                  )}
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

          {items.length > 0 && (
            <div className="mt-5 border-t border-[rgba(90,74,66,0.08)] pt-4 space-y-3">
              <h3 className="font-heading text-[1.1rem] text-[var(--ink)]">Your Details</h3>
              <div>
                <label htmlFor="co-name" className="block text-xs text-[var(--muted)] mb-1">Full name *</label>
                <input id="co-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Smith" autoComplete="name"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]" />
              </div>
              <div>
                <label htmlFor="co-email" className="block text-xs text-[var(--muted)] mb-1">Email *</label>
                <input id="co-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]" />
              </div>
              <div>
                <label htmlFor="co-phone" className="block text-xs text-[var(--muted)] mb-1">Telephone *</label>
                <input id="co-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="07123 456789" autoComplete="tel"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]" />
              </div>
              <div>
                <label htmlFor="co-branch" className="block text-xs text-[var(--muted)] mb-1">Nursery (optional)</label>
                <select id="co-branch" value={branchSlug} onChange={(e) => setBranchSlug(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--teal)]">
                  <option value={NOT_APPLICABLE}>Not applicable</option>
                  {branches.map((b) => (
                    <option key={b.slug} value={b.slug}>{b.name}</option>
                  ))}
                </select>
              </div>
              {branchSlug !== NOT_APPLICABLE && (
                <div>
                  <label htmlFor="co-child" className="block text-xs text-[var(--muted)] mb-1">Child name / reference (optional)</label>
                  <input id="co-child" type="text" value={childRef} onChange={(e) => setChildRef(e.target.value)}
                    placeholder="e.g. Toddler Room — Ava"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--teal)]" />
                </div>
              )}
              <p className="text-[11px] text-[var(--muted)]">Delivery &amp; billing address are collected securely on the next (payment) step.</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={items.length === 0 || submittingCheckout || !detailsValid}
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
