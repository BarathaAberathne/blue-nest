import { clearAuthSession, getRefreshToken, storeAuthResponse } from "@/lib/auth";
import type { Enquiry, User } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface FetchOptions extends RequestInit {
  token?: string;
}

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
  message?: string;
};

// Deduplicates concurrent refresh calls — only one in-flight at a time.
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const body = await res.json() as ApiEnvelope<{ access_token: string; refresh_token: string; user: User }>;
      const data = body.data;
      if (!data?.access_token) return null;
      storeAuthResponse(data.access_token, data.refresh_token, data.user);
      return data.access_token;
    } catch {
      return null;
    }
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...init, headers }).catch((err: unknown) => {
    console.error(`[api] Network error — ${init.method ?? "GET"} ${BASE_URL}${path}:`, err);
    throw err;
  });

  // Silent token refresh on 401 (skip for the refresh endpoint itself)
  if (res.status === 401 && path !== "/api/v1/auth/refresh") {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    } else {
      clearAuthSession();
    }
  }

  const body = await res.json().catch(() => ({} as ApiEnvelope<T>));

  if (!res.ok) {
    throw new Error((body as ApiEnvelope<T>).error ?? `HTTP ${res.status}`);
  }

  const envelope = body as ApiEnvelope<T>;
  if (Object.prototype.hasOwnProperty.call(envelope, "data")) {
    return envelope.data as T;
  }

  return body as T;
}

export const api = {
  // Auth
  register: (body: unknown) =>
    apiFetch("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: unknown) =>
    apiFetch("/api/v1/auth/login", { method: "POST", body: JSON.stringify(body) }),
  adminLogin: (body: unknown) =>
    apiFetch("/api/v1/admin/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: (token: string) =>
    apiFetch("/api/v1/auth/logout", { method: "POST", token }),

  // Products
  getProducts: () => apiFetch("/api/v1/products"),
  getProduct: (id: string) => apiFetch(`/api/v1/products/${id}`),
  getProductBySlug: (slug: string) => apiFetch(`/api/v1/products/slug/${encodeURIComponent(slug)}`),
  getCategories: () => apiFetch("/api/v1/categories"),

  // Cart
  getCart: (token: string) => apiFetch("/api/v1/cart", { token }),
  addCartItem: (token: string, body: { product_id: string; qty: number; size?: string }) =>
    apiFetch("/api/v1/cart/items", { method: "POST", body: JSON.stringify(body), token }),
  updateCartItem: (token: string, id: string, body: { qty: number; size?: string }) => {
    const sizeParam = body.size ? `?size=${encodeURIComponent(body.size)}` : "";
    return apiFetch(`/api/v1/cart/items/${id}${sizeParam}`, { method: "PUT", body: JSON.stringify({ qty: body.qty }), token });
  },
  removeCartItem: (token: string, id: string, size?: string) => {
    const sizeParam = size ? `?size=${encodeURIComponent(size)}` : "";
    return apiFetch(`/api/v1/cart/items/${id}${sizeParam}`, { method: "DELETE", token });
  },
  createCheckoutSession: (
    token: string,
    body: { success_url: string; cancel_url: string; customer_email?: string },
  ) => apiFetch<{ session_id: string; url: string }>("/api/v1/checkout/session", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  }),

  // Orders
  getMyOrders: (token: string) => apiFetch("/api/v1/orders/me", { token }),
  getOrder: (token: string, id: string) => apiFetch(`/api/v1/orders/${id}`, { token }),
  adminGetOrder: (token: string, id: string) => apiFetch(`/api/v1/admin/orders/${id}`, { token }),

  // Blog
  getBlogPosts: () => apiFetch("/api/v1/blog/posts"),
  getBlogPost: (slug: string) => apiFetch(`/api/v1/blog/posts/${encodeURIComponent(slug)}`),
  likePost: (slug: string) =>
    apiFetch<{ like_count: number }>(`/api/v1/blog/posts/${encodeURIComponent(slug)}/like`, { method: "POST" }),
  getComments: (slug: string) => apiFetch(`/api/v1/blog/posts/${encodeURIComponent(slug)}/comments`),
  addComment: (slug: string, body: { name: string; body: string }) =>
    apiFetch(`/api/v1/blog/posts/${encodeURIComponent(slug)}/comments`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Branches
  getBranches: () => apiFetch("/api/v1/branches"),
  getBranch: (slug: string) => apiFetch(`/api/v1/branches/${slug}`),

  // Contact / Enquiries
  submitEnquiry: (body: unknown) =>
    apiFetch("/api/v1/contact", { method: "POST", body: JSON.stringify(body) }),
  adminGetEnquiries: (token: string) => apiFetch<Enquiry[]>("/api/v1/admin/enquiries", { token }),
  adminGetEnquiry: (token: string, id: string) =>
    apiFetch<Enquiry>(`/api/v1/admin/enquiries/${id}`, { token }),
  adminUpdateEnquiryStatus: (token: string, id: string, status: string) =>
    apiFetch(`/api/v1/admin/enquiries/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      token,
    }),

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
  adminUpdateProduct: (token: string, id: string, body: unknown) =>
    apiFetch(`/api/v1/admin/products/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteProduct: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/products/${id}`, { method: "DELETE", token }),
  adminImportProducts: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<{ imported: number; skipped: number; failed: number; errors?: string[] }>(
      "/api/v1/admin/products/import",
      { method: "POST", body: formData, token },
    );
  },
  adminGetCategories: (token: string) => apiFetch("/api/v1/admin/categories", { token }),
  adminCreateCategory: (token: string, body: unknown) =>
    apiFetch("/api/v1/admin/categories", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateCategory: (token: string, id: string, body: unknown) =>
    apiFetch(`/api/v1/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteCategory: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/categories/${id}`, { method: "DELETE", token }),
  adminUploadImage: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return apiFetch<{ url: string }>("/api/v1/admin/uploads/image", { method: "POST", body: formData, token });
  },
  adminGetBlogPosts: (token: string) => apiFetch("/api/v1/admin/blog/posts", { token }),
  adminCreateBlogPost: (token: string, body: unknown) =>
    apiFetch("/api/v1/admin/blog/posts", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateBlogPost: (token: string, id: string, body: unknown) =>
    apiFetch(`/api/v1/admin/blog/posts/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteBlogPost: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/blog/posts/${id}`, { method: "DELETE", token }),
  adminGetUsers: (token: string) => apiFetch("/api/v1/admin/users", { token }),
  adminCreateUser: (token: string, body: unknown) =>
    apiFetch("/api/v1/admin/users", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateUser: (token: string, id: string, body: unknown) =>
    apiFetch(`/api/v1/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminResetPassword: (token: string, id: string, password: string) =>
    apiFetch(`/api/v1/admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
      token,
    }),
  adminDeleteUser: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/users/${id}`, { method: "DELETE", token }),
};
