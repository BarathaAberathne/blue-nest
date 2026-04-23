const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...init } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "unknown error" }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  register: (body: unknown) =>
    apiFetch("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: unknown) =>
    apiFetch("/api/v1/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: (token: string) =>
    apiFetch("/api/v1/auth/logout", { method: "POST", token }),

  // Products
  getProducts: () => apiFetch("/api/v1/products"),
  getProduct: (id: string) => apiFetch(`/api/v1/products/${id}`),
  getCategories: () => apiFetch("/api/v1/categories"),

  // Cart
  getCart: (token: string) => apiFetch("/api/v1/cart", { token }),
  addCartItem: (token: string, body: unknown) =>
    apiFetch("/api/v1/cart/items", { method: "POST", body: JSON.stringify(body), token }),
  removeCartItem: (token: string, id: string) =>
    apiFetch(`/api/v1/cart/items/${id}`, { method: "DELETE", token }),

  // Orders
  getMyOrders: (token: string) => apiFetch("/api/v1/orders/me", { token }),
  getOrder: (token: string, id: string) => apiFetch(`/api/v1/orders/${id}`, { token }),

  // Blog
  getBlogPosts: () => apiFetch("/api/v1/blog/posts"),
  getBlogPost: (slug: string) => apiFetch(`/api/v1/blog/posts/${slug}`),

  // Branches
  getBranches: () => apiFetch("/api/v1/branches"),
  getBranch: (slug: string) => apiFetch(`/api/v1/branches/${slug}`),

  // Admin
  adminGetOrders: (token: string) => apiFetch("/api/v1/admin/orders", { token }),
  adminUpdateOrderStatus: (token: string, id: string, status: string) =>
    apiFetch(`/api/v1/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      token,
    }),
  adminGetProducts: (token: string) => apiFetch("/api/v1/admin/products", { token }),
  adminCreateProduct: (token: string, body: unknown) =>
    apiFetch("/api/v1/admin/products", { method: "POST", body: JSON.stringify(body), token }),
  adminGetBlogPosts: (token: string) => apiFetch("/api/v1/admin/blog/posts", { token }),
};
