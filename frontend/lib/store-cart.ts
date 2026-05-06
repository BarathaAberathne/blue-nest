export type CategorySlug =
  | "all"
  | "sensory"
  | "outdoor"
  | "maths"
  | "literacy"
  | "life-skills"
  | "accessories"
  | "art"
  | "clothing";

export interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: Exclude<CategorySlug, "all">;
  tag: string;
  emoji: string;
  badge?: string;
  sizes?: string[];
  imageUrls?: string[];
}

export interface StoreCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  emoji?: string;
  tag?: string;
}

const STORAGE_KEY = "blue-nest-store-cart";
const CART_UPDATED_EVENT = "blue-nest-cart-updated";

function hasWindow() {
  return typeof window !== "undefined";
}

function readRawCart(): StoreCartItem[] {
  if (!hasWindow()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as StoreCartItem[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            typeof item?.id === "string" &&
            typeof item?.name === "string" &&
            typeof item?.price === "number" &&
            typeof item?.quantity === "number" &&
            item.quantity > 0,
        )
      : [];
  } catch {
    return [];
  }
}

export function cartItemKey(id: string, size?: string) {
  return size ? `${id}:${size}` : id;
}

function writeCart(items: StoreCartItem[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function loadCart(): StoreCartItem[] {
  return readRawCart();
}

export function saveCart(items: StoreCartItem[]) {
  writeCart(items);
}

export function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export function addToCart(product: StoreProduct, quantity = 1, size?: string): StoreCartItem[] {
  const cart = readRawCart();
  const existing = cart.find((item) => item.id === product.id && item.size === size);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      size,
      emoji: product.emoji,
      tag: product.tag,
    });
  }

  writeCart(cart);
  return cart;
}

export function updateCartQuantity(productId: string, quantity: number, size?: string): StoreCartItem[] {
  const cart = readRawCart().filter(
    (item) => !(item.id === productId && item.size === size) || quantity > 0,
  );
  const target = cart.find((item) => item.id === productId && item.size === size);

  if (target && quantity > 0) {
    target.quantity = quantity;
  }

  writeCart(cart);
  return cart;
}

export function removeFromCart(productId: string, size?: string): StoreCartItem[] {
  const cart = readRawCart().filter((item) => !(item.id === productId && item.size === size));
  writeCart(cart);
  return cart;
}

export function clearCart() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

// Writes to localStorage without firing the cart-updated event.
// Used by CartClient after server-cart fetches to keep the header count in sync
// without triggering a re-fetch loop.
export function syncCartSilently(items: StoreCartItem[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getCartUpdatedEventName() {
  return CART_UPDATED_EVENT;
}

export function notifyCartUpdated() {
  if (!hasWindow()) return;
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
