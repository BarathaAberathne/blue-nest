import { clearAuthSession, getRefreshToken, storeAuthResponse } from "@/lib/auth";
import type { AttendanceRecord, AttendanceStats, AuditLog, Branch, BranchDashboard, BranchInput, BranchManagers, BranchOverviewRow, ReviewsAnalytics, CatalogueItem, Child, ChildInput, ChildStats, DailyRecord, DailyRecordInput, DailyStats, DashboardLayout, DashboardProfile, DashboardProfilesResponse, DashboardWidget, Enquiry, EnquiryAssignee, EnquiryBulkRequest, EnquiryBulkResult, EnquiryPage, EnquiryStats, EnquiryTasks, Me, OrderRequest, OrderTemplate, ProcurementAnalytics, PurchaseCart, RoleDefinition, RolesResponse, Room, RoomInput, Staff, StaffAttendanceRecord, StaffInput, StaffStats, Supplier, SupplierInput, User } from "@/types";

// Filter/sort/pagination params shared by the enquiry list endpoints. Empty
// values are dropped before building the query string.
export type EnquiryListParams = {
  branch?: string;
  type?: string;
  status?: string;
  assigned_to?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: "asc" | "desc";
  limit?: number;
  skip?: number;
};

function enquiryQuery(params?: EnquiryListParams): string {
  if (!params) return "";
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

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
    body: {
      success_url: string;
      cancel_url: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      branch_slug?: string;
      child_ref?: string;
    },
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
  // Returns the full matching set (no pagination) — used by the pipeline and
  // follow-up views. Pass params for server-side filtering/sorting.
  adminGetEnquiries: (token: string, params?: EnquiryListParams) =>
    apiFetch<Enquiry[]>(`/api/v1/admin/enquiries${enquiryQuery(params)}`, { token }),
  // Paginated table view — returns one page plus the total.
  adminGetEnquiriesPaged: (token: string, params?: EnquiryListParams) =>
    apiFetch<EnquiryPage>(`/api/v1/admin/enquiries/page${enquiryQuery(params)}`, { token }),
  adminGetEnquiryTasks: (token: string) =>
    apiFetch<EnquiryTasks>("/api/v1/admin/enquiries/tasks", { token }),
  adminBulkUpdateEnquiries: (token: string, body: EnquiryBulkRequest) =>
    apiFetch<EnquiryBulkResult>("/api/v1/admin/enquiries/bulk", {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),
  adminGetEnquiry: (token: string, id: string) =>
    apiFetch<Enquiry>(`/api/v1/admin/enquiries/${id}`, { token }),
  adminGetEnquiryStats: (token: string) =>
    apiFetch<EnquiryStats>("/api/v1/admin/enquiries/stats", { token }),
  adminGetEnquiryAssignees: (token: string) =>
    apiFetch<EnquiryAssignee[]>("/api/v1/admin/enquiries/assignees", { token }),
  adminUpdateEnquiryStatus: (token: string, id: string, status: string) =>
    apiFetch<Enquiry>(`/api/v1/admin/enquiries/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      token,
    }),
  adminAddEnquiryNote: (token: string, id: string, note: string) =>
    apiFetch<Enquiry>(`/api/v1/admin/enquiries/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
      token,
    }),
  adminUpdateEnquiryFollowUp: (
    token: string,
    id: string,
    body: {
      assigned_to?: string;
      assigned_to_name?: string;
      priority?: string;
      follow_up_date?: string | null;
      next_action?: string;
    },
  ) =>
    apiFetch<Enquiry>(`/api/v1/admin/enquiries/${id}/follow-up`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),
  adminAssignEnquiry: (token: string, id: string, assigned_to: string, assigned_to_name: string) =>
    apiFetch<Enquiry>(`/api/v1/admin/enquiries/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ assigned_to, assigned_to_name }),
      token,
    }),
  adminRegisterEnquiry: (
    token: string,
    id: string,
    body: {
      registration_date?: string | null;
      expected_start_date?: string | null;
      child_age_group?: string;
      room_allocation?: string;
      funding_type?: string;
    },
  ) =>
    apiFetch<Enquiry>(`/api/v1/admin/enquiries/${id}/register`, {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),
  adminLogEnquiryReply: (token: string, id: string) =>
    apiFetch<Enquiry>(`/api/v1/admin/enquiries/${id}/reply`, { method: "POST", token }),

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
  // Roles & permissions (super-admin Permission Builder)
  adminGetRoles: (token: string) => apiFetch<RolesResponse>("/api/v1/admin/roles", { token }),
  adminUpdateRolePermissions: (token: string, name: string, permissions: string[]) =>
    apiFetch<RoleDefinition>(`/api/v1/admin/roles/${name}`, { method: "PUT", body: JSON.stringify({ permissions }), token }),
  adminCreateRole: (token: string, body: { name: string; label: string; permissions: string[] }) =>
    apiFetch<RoleDefinition>("/api/v1/admin/roles", { method: "POST", body: JSON.stringify(body), token }),
  adminDeleteRole: (token: string, name: string) =>
    apiFetch(`/api/v1/admin/roles/${name}`, { method: "DELETE", token }),
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

  // Audit log (admin activity)
  adminGetAuditLogs: (token: string, params?: { actor?: string; entity_type?: string; action?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.actor) qs.set("actor", params.actor);
    if (params?.entity_type) qs.set("entity_type", params.entity_type);
    if (params?.action) qs.set("action", params.action);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<AuditLog[]>(`/api/v1/admin/audit-logs${suffix}`, { token });
  },

  // Order / supply requests — staff
  createOrderRequest: (token: string, body: unknown) =>
    apiFetch<OrderRequest>("/api/v1/order-requests", { method: "POST", body: JSON.stringify(body), token }),
  getMyOrderRequests: (token: string) =>
    apiFetch<OrderRequest[]>("/api/v1/order-requests/me", { token }),
  getOrderRequest: (token: string, id: string) =>
    apiFetch<OrderRequest>(`/api/v1/order-requests/${id}`, { token }),
  cancelOrderRequest: (token: string, id: string) =>
    apiFetch<OrderRequest>(`/api/v1/order-requests/${id}/cancel`, { method: "PATCH", token }),

  // Standing-order templates (staff + management)
  getOrderTemplates: (token: string) =>
    apiFetch<OrderTemplate[]>("/api/v1/order-templates", { token }),
  createOrderTemplate: (token: string, body: unknown) =>
    apiFetch<OrderTemplate>("/api/v1/order-templates", { method: "POST", body: JSON.stringify(body), token }),
  deleteOrderTemplate: (token: string, id: string) =>
    apiFetch(`/api/v1/order-templates/${id}`, { method: "DELETE", token }),

  // Order / supply requests — admin
  adminGetOrderRequests: (token: string) =>
    apiFetch<OrderRequest[]>("/api/v1/admin/order-requests", { token }),
  adminGetOrderRequest: (token: string, id: string) =>
    apiFetch<OrderRequest>(`/api/v1/admin/order-requests/${id}`, { token }),
  adminUpdateOrderRequestStatus: (token: string, id: string, status: string) =>
    apiFetch(`/api/v1/admin/order-requests/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      token,
    }),

  // Catalogue (staff read-only picker)
  getCatalogue: (token: string) =>
    apiFetch<CatalogueItem[]>("/api/v1/catalogue", { token }),

  // Catalogue (admin)
  adminGetCatalogue: (token: string) =>
    apiFetch<CatalogueItem[]>("/api/v1/admin/catalogue", { token }),
  adminGetCatalogueItem: (token: string, id: string) =>
    apiFetch<CatalogueItem>(`/api/v1/admin/catalogue/${id}`, { token }),
  adminCreateCatalogueItem: (token: string, body: unknown) =>
    apiFetch<CatalogueItem>("/api/v1/admin/catalogue", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateCatalogueItem: (token: string, id: string, body: unknown) =>
    apiFetch<CatalogueItem>(`/api/v1/admin/catalogue/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteCatalogueItem: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/catalogue/${id}`, { method: "DELETE", token }),
  adminLearnCatalogue: (token: string, body: { name: string; code: string; price?: number }) =>
    apiFetch<CatalogueItem>("/api/v1/admin/catalogue/learn", { method: "POST", body: JSON.stringify(body), token }),

  // Identity + capabilities (drives nav/page gating)
  getMe: (token: string) => apiFetch<Me>("/api/v1/auth/me", { token }),

  // Per-user customizable dashboard layouts (named; one active at a time)
  getDashboardLayout: (token: string) =>
    apiFetch<DashboardLayout>("/api/v1/me/dashboard", { token }),
  saveDashboardLayout: (token: string, widgets: DashboardWidget[], name?: string) =>
    apiFetch<DashboardLayout>("/api/v1/me/dashboard", { method: "PUT", body: JSON.stringify({ widgets, name }), token }),
  listDashboardLayouts: (token: string) =>
    apiFetch<{ layouts: DashboardLayout[] }>("/api/v1/me/dashboards", { token }),
  activateDashboardLayout: (token: string, name: string) =>
    apiFetch<DashboardLayout>("/api/v1/me/dashboards/activate", { method: "POST", body: JSON.stringify({ name }), token }),
  deleteDashboardLayout: (token: string, name: string) =>
    apiFetch<{ active: string }>(`/api/v1/me/dashboards/${encodeURIComponent(name)}`, { method: "DELETE", token }),

  // Org dashboard profiles / role defaults (super admin)
  adminGetDashboardProfiles: (token: string) =>
    apiFetch<DashboardProfilesResponse>("/api/v1/admin/dashboard-profiles", { token }),
  adminSaveDashboardProfile: (token: string, body: { name: string; slug?: string; description?: string; widgets: DashboardWidget[]; default_for_roles: string[] }) =>
    apiFetch<DashboardProfile>("/api/v1/admin/dashboard-profiles", { method: "POST", body: JSON.stringify(body), token }),
  adminDeleteDashboardProfile: (token: string, slug: string) =>
    apiFetch<void>(`/api/v1/admin/dashboard-profiles/${encodeURIComponent(slug)}`, { method: "DELETE", token }),

  // Suppliers (managed vendor directory — admin CRUD)
  adminGetSuppliers: (token: string) =>
    apiFetch<Supplier[]>("/api/v1/admin/suppliers", { token }),
  adminGetSupplier: (token: string, id: string) =>
    apiFetch<Supplier>(`/api/v1/admin/suppliers/${id}`, { token }),
  adminCreateSupplier: (token: string, body: SupplierInput) =>
    apiFetch<Supplier>("/api/v1/admin/suppliers", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateSupplier: (token: string, id: string, body: SupplierInput) =>
    apiFetch<Supplier>(`/api/v1/admin/suppliers/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteSupplier: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/suppliers/${id}`, { method: "DELETE", token }),

  // Procurement analytics (server-side roll-up)
  adminGetProcurementAnalytics: (token: string) =>
    apiFetch<ProcurementAnalytics>("/api/v1/admin/procurement/analytics", { token }),

  // Purchase carts (generated supplier orders)
  adminGenerateCart: (token: string, requestIds: string[]) =>
    apiFetch<PurchaseCart[]>("/api/v1/admin/purchase-carts/generate", {
      method: "POST",
      body: JSON.stringify({ request_ids: requestIds }),
      token,
    }),
  adminGetPurchaseCarts: (token: string) =>
    apiFetch<PurchaseCart[]>("/api/v1/admin/purchase-carts", { token }),
  adminGetPurchaseCart: (token: string, id: string) =>
    apiFetch<PurchaseCart>(`/api/v1/admin/purchase-carts/${id}`, { token }),
  adminUpdatePurchaseCart: (token: string, id: string, body: unknown) =>
    apiFetch<PurchaseCart>(`/api/v1/admin/purchase-carts/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminUpdateCartFulfillment: (
    token: string,
    id: string,
    body: { supplier_order_ref: string; tracking_number?: string; expected_delivery_date: string | null; order_total?: number },
  ) =>
    apiFetch<PurchaseCart>(`/api/v1/admin/purchase-carts/${id}/fulfillment`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token,
    }),
  adminUploadCartAttachment: (token: string, id: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<PurchaseCart>(`/api/v1/admin/purchase-carts/${id}/attachment`, { method: "POST", body: fd, token });
  },
  adminUpdatePurchaseCartStatus: (token: string, id: string, status: string) =>
    apiFetch<PurchaseCart>(`/api/v1/admin/purchase-carts/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
      token,
    }),
  adminReceiveCart: (
    token: string,
    id: string,
    items: { code: string; name: string; qty_received: number }[],
  ) =>
    apiFetch<PurchaseCart>(`/api/v1/admin/purchase-carts/${id}/receive`, {
      method: "POST",
      body: JSON.stringify({ items }),
      token,
    }),

  // Nursery — rooms
  adminGetRooms: (token: string, branch?: string) =>
    apiFetch<Room[]>(`/api/v1/admin/rooms${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, { token }),
  adminCreateRoom: (token: string, body: RoomInput) =>
    apiFetch<Room>("/api/v1/admin/rooms", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateRoom: (token: string, id: string, body: RoomInput) =>
    apiFetch<Room>(`/api/v1/admin/rooms/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteRoom: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/rooms/${id}`, { method: "DELETE", token }),

  // Nursery — children
  adminGetChildren: (token: string, params?: { branch?: string; room?: string; status?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return apiFetch<Child[]>(`/api/v1/admin/children${s ? `?${s}` : ""}`, { token });
  },
  adminGetChildStats: (token: string) =>
    apiFetch<ChildStats>("/api/v1/admin/children/stats", { token }),
  adminGetChild: (token: string, id: string) =>
    apiFetch<Child>(`/api/v1/admin/children/${id}`, { token }),
  adminCreateChild: (token: string, body: ChildInput) =>
    apiFetch<Child>("/api/v1/admin/children", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateChild: (token: string, id: string, body: ChildInput) =>
    apiFetch<Child>(`/api/v1/admin/children/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteChild: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/children/${id}`, { method: "DELETE", token }),

  // Nursery — attendance register
  adminGetRegister: (token: string, params?: { date?: string; branch?: string }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return apiFetch<AttendanceRecord[]>(`/api/v1/admin/attendance${s ? `?${s}` : ""}`, { token });
  },
  adminGetAttendanceToday: (token: string, params?: { date?: string; branch?: string }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return apiFetch<AttendanceStats>(`/api/v1/admin/attendance/today${s ? `?${s}` : ""}`, { token });
  },
  adminCheckIn: (token: string, body: { child_id: string; date?: string; notes?: string }) =>
    apiFetch<AttendanceRecord>("/api/v1/admin/attendance/check-in", { method: "POST", body: JSON.stringify(body), token }),
  adminCheckOut: (token: string, body: { child_id: string; date?: string; late_pickup?: boolean }) =>
    apiFetch<AttendanceRecord>("/api/v1/admin/attendance/check-out", { method: "POST", body: JSON.stringify(body), token }),
  adminMarkAttendance: (token: string, body: { child_id: string; date?: string; status: string; notes?: string }) =>
    apiFetch<AttendanceRecord>("/api/v1/admin/attendance/mark", { method: "PATCH", body: JSON.stringify(body), token }),

  // People / HR — staff
  adminGetStaff: (token: string, params?: { branch?: string; status?: string; type?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return apiFetch<Staff[]>(`/api/v1/admin/staff${s ? `?${s}` : ""}`, { token });
  },
  adminGetStaffMember: (token: string, id: string) =>
    apiFetch<Staff>(`/api/v1/admin/staff/${id}`, { token }),
  adminCreateStaff: (token: string, body: StaffInput) =>
    apiFetch<Staff>("/api/v1/admin/staff", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateStaff: (token: string, id: string, body: StaffInput) =>
    apiFetch<Staff>(`/api/v1/admin/staff/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteStaff: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/staff/${id}`, { method: "DELETE", token }),

  // People / HR — staff attendance register
  adminGetStaffRegister: (token: string, params?: { date?: string; branch?: string }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return apiFetch<StaffAttendanceRecord[]>(`/api/v1/admin/staff-attendance${s ? `?${s}` : ""}`, { token });
  },
  adminGetStaffStats: (token: string, params?: { date?: string; branch?: string }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return apiFetch<StaffStats>(`/api/v1/admin/staff-attendance/today${s ? `?${s}` : ""}`, { token });
  },
  adminStaffClockIn: (token: string, body: { staff_id: string; date?: string; notes?: string }) =>
    apiFetch<StaffAttendanceRecord>("/api/v1/admin/staff-attendance/clock-in", { method: "POST", body: JSON.stringify(body), token }),
  adminStaffClockOut: (token: string, body: { staff_id: string; date?: string }) =>
    apiFetch<StaffAttendanceRecord>("/api/v1/admin/staff-attendance/clock-out", { method: "POST", body: JSON.stringify(body), token }),
  adminMarkStaffAttendance: (token: string, body: { staff_id: string; date?: string; status: string; notes?: string }) =>
    apiFetch<StaffAttendanceRecord>("/api/v1/admin/staff-attendance/mark", { method: "PATCH", body: JSON.stringify(body), token }),

  // Nursery — daily records (observations, incidents, safeguarding, medication, meals)
  adminGetDailyRecords: (token: string, params?: { type?: string; child?: string; branch?: string; status?: string; date?: string; since?: string; q?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    const s = qs.toString();
    return apiFetch<DailyRecord[]>(`/api/v1/admin/daily-records${s ? `?${s}` : ""}`, { token });
  },
  adminGetDailyStats: (token: string, date?: string) =>
    apiFetch<DailyStats>(`/api/v1/admin/daily-records/stats${date ? `?date=${date}` : ""}`, { token }),
  adminGetDailyRecord: (token: string, id: string) =>
    apiFetch<DailyRecord>(`/api/v1/admin/daily-records/${id}`, { token }),
  adminCreateDailyRecord: (token: string, body: DailyRecordInput) =>
    apiFetch<DailyRecord>("/api/v1/admin/daily-records", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateDailyRecord: (token: string, id: string, body: DailyRecordInput) =>
    apiFetch<DailyRecord>(`/api/v1/admin/daily-records/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminSetDailyRecordStatus: (token: string, id: string, status: string) =>
    apiFetch<DailyRecord>(`/api/v1/admin/daily-records/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), token }),
  adminDeleteDailyRecord: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/daily-records/${id}`, { method: "DELETE", token }),

  // Branch Management System (Branch as the central hub)
  adminGetBranches: (token: string, archived = false) =>
    apiFetch<Branch[]>(`/api/v1/admin/branches${archived ? "?archived=true" : ""}`, { token }),
  adminGetBranchOverview: (token: string) =>
    apiFetch<BranchOverviewRow[]>("/api/v1/admin/branches/overview", { token }),
  adminGetBranch: (token: string, slug: string) =>
    apiFetch<Branch>(`/api/v1/admin/branches/${slug}`, { token }),
  adminGetBranchDashboard: (token: string, slug: string) =>
    apiFetch<BranchDashboard>(`/api/v1/admin/branches/${slug}/dashboard`, { token }),
  adminGetBranchReviews: (token: string, slug: string) =>
    apiFetch<ReviewsAnalytics>(`/api/v1/admin/branches/${slug}/reviews`, { token }),
  adminCreateBranch: (token: string, body: BranchInput) =>
    apiFetch<Branch>("/api/v1/admin/branches", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateBranch: (token: string, slug: string, body: BranchInput) =>
    apiFetch<Branch>(`/api/v1/admin/branches/${slug}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminSetBranchManagers: (token: string, slug: string, body: BranchManagers) =>
    apiFetch<Branch>(`/api/v1/admin/branches/${slug}/managers`, { method: "PATCH", body: JSON.stringify(body), token }),
  adminArchiveBranch: (token: string, slug: string, restore = false) =>
    apiFetch(`/api/v1/admin/branches/${slug}/archive${restore ? "?restore=true" : ""}`, { method: "POST", token }),
};
