import { api } from "@/lib/api";
import { cartItemKey, loadCart } from "@/lib/store-cart";
import type { Cart } from "@/types";

// After a guest signs in / registers, push any cart items they added while
// logged out to their server cart — otherwise the cart page (which treats the
// server cart as the source of truth for authenticated users) would overwrite
// and lose them. Best-effort + idempotent: items already on the server (same
// product + size) are skipped so a merge never double-counts, and any failure
// is swallowed so it can never block sign-in.
export async function mergeGuestCartToServer(token: string): Promise<void> {
  if (!token) return;
  const local = loadCart();
  if (local.length === 0) return;
  try {
    const server = (await api.getCart(token)) as Cart;
    const onServer = new Set((server?.items ?? []).map((i) => cartItemKey(i.product_id, i.size)));
    for (const item of local) {
      if (onServer.has(cartItemKey(item.id, item.size))) continue;
      await api.addCartItem(token, { product_id: item.id, qty: item.quantity, size: item.size });
    }
  } catch {
    // best-effort — never block sign-in on a cart-merge hiccup
  }
}
