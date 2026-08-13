import { clearAuthSession, getRefreshToken, storeAuthResponse } from "@/lib/auth";
import type { AttendanceCorrectionInput, AttendanceDaySummary, AttendanceRecord, AttendanceStats, AuditLog, Branch, BranchDashboard, BranchInput, BranchManagers, BranchOverviewRow, ReviewsAnalytics, CapacityForecast, CatalogueItem, Child, ChildInput, ChildStats, DailyRecord, DailyRecordInput, DailyStats, DashboardLayout, DashboardProfile, DashboardProfilesResponse, DashboardWidget, Enquiry, EnquiryAssignee, EnquiryBulkRequest, EnquiryBulkResult, EnquiryCreateInput, EnquiryPage, EnquiryStats, EnquiryTasks, KioskDevice, KioskOverview, Parent, ParentInput, ChildParentRelationship, RelationshipFlagsInput, InductionBundle, ChildInduction, Consent, ConsentsBundle, OnboardingView, KioskSession, KioskStaffResult, LeaveRequest, LeaveRequestInput, LeaveBalances, MeAttendance, MeProfileInput, Shift, ShiftInput, Me, OrderRequest, OrderTemplate, ProcurementAnalytics, PurchaseCart, RoleDefinition, RolesResponse, Room, RoomInput, RoomCapacitySummary, StaffRoomAssignment, StaffRoomAssignmentInput, ChildRoomAssignment, ChildRoomAssignmentInput, ChildTransferInput, Organisation, OrgProfileInput, Staff, StaffAbsenceSummary, StaffAttendanceRecord, StaffInput, StaffStats, Supplier, SupplierInput, TaxonomyTerm, TaxonomyInput, Term, TermInput, FeeConfigBundle, FeeBranchConfig, FeeConfigInput, FeeMeta, BranchTemplate, BranchTemplateInput, BranchTemplateApplyResult, EmailTemplate, EmailTemplateInput, NotificationPreferences, NotificationsResponse, User, Family, FamilyView, Charge, FamilyPayment, PaymentScheduleItem, FinanceDashboard, CommunicationLog, ChildSendSupport, SendSupportInput, SendOverview, PortalAttendanceRow } from "@/types";

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

// Resolve the API origin. An explicit absolute NEXT_PUBLIC_API_URL always wins
// (prod serves the API from a separate host). In dev/Docker it's
// http://localhost:8080 - correct for the machine running the stack, but wrong
// for any OTHER device: a kiosk tablet on the LAN would call its own localhost.
// So when the page is served from a non-localhost host and the API was
// configured for localhost, fall back to the SAME ORIGIN and let Next's
// /api/v1/* rewrite proxy to the backend. No per-device LAN IP to bake in, and
// it survives a normal rebuild.
const CONFIGURED_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
function apiBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const onLocalhost = host === "localhost" || host === "127.0.0.1";
    if (!onLocalhost && /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(CONFIGURED_API)) {
      return ""; // same-origin → /api/v1/* is proxied to the backend by next.config
    }
  }
  return CONFIGURED_API;
}

interface FetchOptions extends RequestInit {
  token?: string;
}

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
  message?: string;
};

// Deduplicates concurrent refresh calls - only one in-flight at a time.
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${apiBase()}/api/v1/auth/refresh`, {
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

// downloadCsv fetches a CSV export endpoint with the auth header and triggers a
// browser download, honouring the server's Content-Disposition filename. Used by
// the "Export CSV" buttons on the admin list pages.
export async function downloadCsv(path: string, token: string, fallbackName = "export.csv"): Promise<void> {
  const res = await fetch(`${apiBase()}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(cd);
  const name = match?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

  let res = await fetch(`${apiBase()}${path}`, { ...init, headers }).catch((err: unknown) => {
    console.error(`[api] Network error - ${init.method ?? "GET"} ${apiBase()}${path}:`, err);
    throw err;
  });

  // Silent token refresh on 401 (skip for the refresh endpoint itself)
  if (res.status === 401 && path !== "/api/v1/auth/refresh") {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${apiBase()}${path}`, { ...init, headers });
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
  // Returns the full matching set (no pagination) - used by the pipeline and
  // follow-up views. Pass params for server-side filtering/sorting.
  // ── Kiosk (entrance tablet - device token, not a user JWT) ─────────────────
  kioskSession: (deviceToken: string) =>
    apiFetch<KioskSession>("/api/v1/kiosk/session", { method: "POST", headers: { "X-Kiosk-Token": deviceToken } }),
  kioskSearch: (deviceToken: string, q: string) =>
    apiFetch<KioskStaffResult[]>(`/api/v1/kiosk/staff?q=${encodeURIComponent(q)}`, { headers: { "X-Kiosk-Token": deviceToken } }),
  kioskOverview: (deviceToken: string) =>
    apiFetch<KioskOverview>("/api/v1/kiosk/overview", { headers: { "X-Kiosk-Token": deviceToken } }),
  kioskClockIn: (deviceToken: string, staffId: string, pin: string) =>
    apiFetch<StaffAttendanceRecord>("/api/v1/kiosk/clock-in", { method: "POST", headers: { "X-Kiosk-Token": deviceToken }, body: JSON.stringify({ staff_id: staffId, pin }) }),
  kioskClockOut: (deviceToken: string, staffId: string, pin: string) =>
    apiFetch<StaffAttendanceRecord>("/api/v1/kiosk/clock-out", { method: "POST", headers: { "X-Kiosk-Token": deviceToken }, body: JSON.stringify({ staff_id: staffId, pin }) }),

  // ── Kiosk device management + staff PIN (admin, staff.manage) ──────────────
  adminListKioskDevices: (token: string, branch?: string) =>
    apiFetch<KioskDevice[]>(`/api/v1/admin/kiosk-devices${branch ? `?branch=${branch}` : ""}`, { token }),
  adminCreateKioskDevice: (token: string, body: { name: string; branch_slug: string }) =>
    apiFetch<{ device: KioskDevice; token: string }>("/api/v1/admin/kiosk-devices", { method: "POST", body: JSON.stringify(body), token }),
  adminSetKioskDeviceActive: (token: string, id: string, active: boolean) =>
    apiFetch<{ active: boolean }>(`/api/v1/admin/kiosk-devices/${id}`, { method: "PATCH", body: JSON.stringify({ active }), token }),
  adminDeleteKioskDevice: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/admin/kiosk-devices/${id}`, { method: "DELETE", token }),
  adminSetStaffPIN: (token: string, staffId: string, pin: string) =>
    apiFetch<{ has_pin: boolean }>(`/api/v1/admin/staff/${staffId}/pin`, { method: "PUT", body: JSON.stringify({ pin }), token }),

  // ── Rota / shifts (staff.manage) ──────────────────────────────────────────
  adminGetShifts: (token: string, branch: string, week: string) =>
    apiFetch<Shift[]>(`/api/v1/admin/shifts?branch=${branch}&week=${week}`, { token }),
  adminCreateShift: (token: string, body: ShiftInput) =>
    apiFetch<Shift>("/api/v1/admin/shifts", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateShift: (token: string, id: string, body: ShiftInput) =>
    apiFetch<Shift>(`/api/v1/admin/shifts/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteShift: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/admin/shifts/${id}`, { method: "DELETE", token }),

  adminGetEnquiries: (token: string, params?: EnquiryListParams) =>
    apiFetch<Enquiry[]>(`/api/v1/admin/enquiries${enquiryQuery(params)}`, { token }),

  adminCreateEnquiry: (token: string, body: EnquiryCreateInput) =>
    apiFetch<Enquiry>("/api/v1/admin/enquiries", { method: "POST", body: JSON.stringify(body), token }),
  // Paginated table view - returns one page plus the total.
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
      // Canonical room id — the backend allocates the new child to this room
      // (room_allocation stays the display name).
      room_id?: string;
      funding_type?: string;
      // Child identity - required for registration to actually create the
      // Child record (see AdminEnquiryHandler.Register); omitted, the enquiry
      // is still marked registered but no child is created.
      child_first_name?: string;
      child_last_name?: string;
      child_dob?: string;
      child_gender?: string;
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

  // Order / supply requests - staff
  createOrderRequest: (token: string, body: unknown) =>
    apiFetch<OrderRequest>("/api/v1/order-requests", { method: "POST", body: JSON.stringify(body), token }),
  getMyOrderRequests: (token: string) =>
    apiFetch<OrderRequest[]>("/api/v1/order-requests/me", { token }),
  getOrderRequest: (token: string, id: string) =>
    apiFetch<OrderRequest>(`/api/v1/order-requests/${id}`, { token }),
  cancelOrderRequest: (token: string, id: string) =>
    apiFetch<OrderRequest>(`/api/v1/order-requests/${id}/cancel`, { method: "PATCH", token }),

  // Staff leave / holiday - self-service (staff) + management review.
  getMyLeaveRequests: (token: string) =>
    apiFetch<LeaveRequest[]>("/api/v1/leave-requests/me", { token }),
  getMyLeaveBalance: (token: string) =>
    apiFetch<LeaveBalances>("/api/v1/leave-requests/balance", { token }),
  adminApplyLeaveForStaff: (token: string, body: LeaveRequestInput) =>
    apiFetch<LeaveRequest>("/api/v1/admin/leave-requests", { method: "POST", body: JSON.stringify(body), token }),
  applyLeaveRequest: (token: string, body: LeaveRequestInput) =>
    apiFetch<LeaveRequest>("/api/v1/leave-requests", { method: "POST", body: JSON.stringify(body), token }),
  cancelLeaveRequest: (token: string, id: string) =>
    apiFetch<LeaveRequest>(`/api/v1/leave-requests/${id}/cancel`, { method: "PATCH", token }),
  adminGetLeaveRequests: (token: string, params?: { branch?: string; status?: string; staff_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.branch) q.set("branch", params.branch);
    if (params?.status) q.set("status", params.status);
    if (params?.staff_id) q.set("staff_id", params.staff_id);
    const qs = q.toString();
    return apiFetch<LeaveRequest[]>(`/api/v1/admin/leave-requests${qs ? `?${qs}` : ""}`, { token });
  },
  // Self-service "My Profile" hub.
  getMyProfile: (token: string) =>
    apiFetch<Staff>("/api/v1/me/profile", { token }),
  updateMyProfile: (token: string, body: MeProfileInput) =>
    apiFetch<Staff>("/api/v1/me/profile", { method: "PUT", body: JSON.stringify(body), token }),
  getMyAttendance: (token: string, from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const s = q.toString();
    return apiFetch<MeAttendance>(`/api/v1/me/attendance${s ? `?${s}` : ""}`, { token });
  },
  getMyRota: (token: string, from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const s = q.toString();
    return apiFetch<Shift[]>(`/api/v1/me/rota${s ? `?${s}` : ""}`, { token });
  },
  getMyNotificationPrefs: (token: string) =>
    apiFetch<NotificationPreferences>("/api/v1/me/notification-preferences", { token }),
  updateMyNotificationPrefs: (token: string, mutedTypes: string[]) =>
    apiFetch<NotificationPreferences>("/api/v1/me/notification-preferences", { method: "PUT", body: JSON.stringify({ muted_types: mutedTypes }), token }),

  adminApproveLeaveRequest: (token: string, id: string) =>
    apiFetch<LeaveRequest>(`/api/v1/admin/leave-requests/${id}/approve`, { method: "POST", token }),
  adminDeclineLeaveRequest: (token: string, id: string, reason: string) =>
    apiFetch<LeaveRequest>(`/api/v1/admin/leave-requests/${id}/decline`, { method: "POST", body: JSON.stringify({ reason }), token }),

  // Standing-order templates (staff + management)
  getOrderTemplates: (token: string) =>
    apiFetch<OrderTemplate[]>("/api/v1/order-templates", { token }),
  createOrderTemplate: (token: string, body: unknown) =>
    apiFetch<OrderTemplate>("/api/v1/order-templates", { method: "POST", body: JSON.stringify(body), token }),
  deleteOrderTemplate: (token: string, id: string) =>
    apiFetch(`/api/v1/order-templates/${id}`, { method: "DELETE", token }),

  // Order / supply requests - admin
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

  // Suppliers (managed vendor directory - admin CRUD)
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

  // Nursery - rooms
  // ── Configurable taxonomy (lists) ──────────────────────────────────────────
  // With a branch → picker mode (active branch + org-wide terms); without → the
  // management view (every term in the category, all branches).
  adminGetTaxonomy: (token: string, category: string, branch?: string) =>
    apiFetch<TaxonomyTerm[]>(`/api/v1/admin/taxonomy?category=${encodeURIComponent(category)}${branch ? `&branch=${encodeURIComponent(branch)}` : ""}`, { token }),
  adminCreateTaxonomy: (token: string, body: TaxonomyInput) =>
    apiFetch<TaxonomyTerm>("/api/v1/admin/taxonomy", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateTaxonomy: (token: string, id: string, body: TaxonomyInput) =>
    apiFetch<TaxonomyTerm>(`/api/v1/admin/taxonomy/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteTaxonomy: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/admin/taxonomy/${id}`, { method: "DELETE", token }),
  // Public read (unauthenticated) - the application form's session picker.
  getTaxonomy: (category: string, branch?: string) =>
    apiFetch<TaxonomyTerm[]>(`/api/v1/taxonomy?category=${encodeURIComponent(category)}${branch ? `&branch=${encodeURIComponent(branch)}` : ""}`),

  // ── Fee / funding rules (public calculator + admin editor) ─────────────────
  getFeeConfig: () => apiFetch<FeeConfigBundle>("/api/v1/fee-config"),
  adminGetFeeConfig: (token: string) =>
    apiFetch<FeeConfigBundle>("/api/v1/admin/fee-config", { token }),
  adminUpdateFeeBranch: (token: string, branch: string, body: FeeConfigInput) =>
    apiFetch<FeeBranchConfig>(`/api/v1/admin/fee-config/${encodeURIComponent(branch)}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminUpdateFeeMeta: (token: string, body: FeeMeta) =>
    apiFetch<FeeBranchConfig>("/api/v1/admin/fee-config", { method: "PUT", body: JSON.stringify(body), token }),

  // ── Branch templates ───────────────────────────────────────────────────────
  adminGetBranchTemplates: (token: string) =>
    apiFetch<BranchTemplate[]>("/api/v1/admin/branch-templates", { token }),
  adminCreateBranchTemplate: (token: string, body: BranchTemplateInput) =>
    apiFetch<BranchTemplate>("/api/v1/admin/branch-templates", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateBranchTemplate: (token: string, id: string, body: BranchTemplateInput) =>
    apiFetch<BranchTemplate>(`/api/v1/admin/branch-templates/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteBranchTemplate: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/admin/branch-templates/${id}`, { method: "DELETE", token }),
  adminApplyBranchTemplate: (token: string, id: string, branchSlug: string) =>
    apiFetch<BranchTemplateApplyResult>(`/api/v1/admin/branch-templates/${id}/apply`, { method: "POST", body: JSON.stringify({ branch_slug: branchSlug }), token }),
  adminCreateBranchTemplateFromBranch: (token: string, branchSlug: string, name: string, description?: string) =>
    apiFetch<BranchTemplate>("/api/v1/admin/branch-templates/from-branch", { method: "POST", body: JSON.stringify({ branch_slug: branchSlug, name, description }), token }),

  // ── Email templates ────────────────────────────────────────────────────────
  adminGetEmailTemplates: (token: string) =>
    apiFetch<EmailTemplate[]>("/api/v1/admin/email-templates", { token }),
  adminUpdateEmailTemplate: (token: string, key: string, body: EmailTemplateInput) =>
    apiFetch<EmailTemplate>(`/api/v1/admin/email-templates/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteEmailTemplate: (token: string, key: string) =>
    apiFetch<void>(`/api/v1/admin/email-templates/${encodeURIComponent(key)}`, { method: "DELETE", token }),

  // ── In-app notifications ───────────────────────────────────────────────────
  adminGetNotifications: (token: string) =>
    apiFetch<NotificationsResponse>("/api/v1/admin/notifications", { token }),
  adminMarkNotificationRead: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/admin/notifications/${id}/read`, { method: "PATCH", token }),
  adminMarkAllNotificationsRead: (token: string) =>
    apiFetch<void>("/api/v1/admin/notifications/read-all", { method: "POST", token }),

  // ── Term-time dates ────────────────────────────────────────────────────────
  adminGetTerms: (token: string, branch?: string) =>
    apiFetch<Term[]>(`/api/v1/admin/terms${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, { token }),
  adminCreateTerm: (token: string, body: TermInput) =>
    apiFetch<Term>("/api/v1/admin/terms", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateTerm: (token: string, id: string, body: TermInput) =>
    apiFetch<Term>(`/api/v1/admin/terms/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteTerm: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/admin/terms/${id}`, { method: "DELETE", token }),

  adminGetRooms: (token: string, branch?: string) =>
    apiFetch<Room[]>(`/api/v1/admin/rooms${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, { token }),
  adminGetRoom: (token: string, id: string) =>
    apiFetch<Room>(`/api/v1/admin/rooms/${id}`, { token }),
  adminCreateRoom: (token: string, body: RoomInput) =>
    apiFetch<Room>("/api/v1/admin/rooms", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateRoom: (token: string, id: string, body: RoomInput) =>
    apiFetch<Room>(`/api/v1/admin/rooms/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteRoom: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/rooms/${id}`, { method: "DELETE", token }),
  adminSetRoomStatus: (token: string, id: string, status: "active" | "inactive") =>
    apiFetch<Room>(`/api/v1/admin/rooms/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }), token }),

  // Nursery - room allocations (the authoritative assignment model; both the
  // room profile and the staff/child profiles use these same endpoints)
  adminGetRoomCapacity: (token: string, roomId: string) =>
    apiFetch<RoomCapacitySummary>(`/api/v1/admin/rooms/${roomId}/capacity`, { token }),
  adminGetBranchRoomCapacity: (token: string, branch?: string) =>
    apiFetch<RoomCapacitySummary[]>(`/api/v1/admin/rooms/capacity${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, { token }),
  adminGetRoomStaff: (token: string, roomId: string, includeHistory?: boolean) =>
    apiFetch<StaffRoomAssignment[]>(`/api/v1/admin/rooms/${roomId}/staff${includeHistory ? "?include=history" : ""}`, { token }),
  adminGetRoomChildren: (token: string, roomId: string, includeHistory?: boolean) =>
    apiFetch<ChildRoomAssignment[]>(`/api/v1/admin/rooms/${roomId}/children${includeHistory ? "?include=history" : ""}`, { token }),
  adminGetStaffRoomAssignments: (token: string, staffId: string, includeHistory?: boolean) =>
    apiFetch<StaffRoomAssignment[]>(`/api/v1/admin/staff/${staffId}/room-assignments${includeHistory ? "?include=history" : ""}`, { token }),
  adminCreateStaffRoomAssignment: (token: string, body: StaffRoomAssignmentInput) =>
    apiFetch<StaffRoomAssignment>("/api/v1/admin/staff-room-assignments", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateStaffRoomAssignment: (
    token: string,
    id: string,
    body: { end?: boolean; end_date?: string; is_primary?: boolean; role_in_room?: string },
  ) =>
    apiFetch<StaffRoomAssignment>(`/api/v1/admin/staff-room-assignments/${id}`, { method: "PATCH", body: JSON.stringify(body), token }),
  adminGetChildRoomAssignments: (token: string, childId: string) =>
    apiFetch<ChildRoomAssignment[]>(`/api/v1/admin/children/${childId}/room-assignments`, { token }),
  adminCreateChildRoomAssignment: (token: string, body: ChildRoomAssignmentInput) =>
    apiFetch<ChildRoomAssignment>("/api/v1/admin/child-room-assignments", { method: "POST", body: JSON.stringify(body), token }),
  adminEndChildRoomAssignment: (token: string, id: string, body?: { end_date?: string; reason?: string }) =>
    apiFetch<ChildRoomAssignment>(`/api/v1/admin/child-room-assignments/${id}`, { method: "PATCH", body: JSON.stringify({ end: true, ...body }), token }),
  adminTransferChildRoom: (token: string, childId: string, body: ChildTransferInput) =>
    apiFetch<ChildRoomAssignment>(`/api/v1/admin/children/${childId}/transfer-room`, { method: "POST", body: JSON.stringify(body), token }),

  // Nursery - children
  adminGetChildren: (token: string, params?: { branch?: string; room?: string; status?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return apiFetch<Child[]>(`/api/v1/admin/children${s ? `?${s}` : ""}`, { token });
  },
  adminGetChildStats: (token: string) =>
    apiFetch<ChildStats>("/api/v1/admin/children/stats", { token }),
  adminGetCapacityForecast: (token: string, params?: { branch?: string; weeks?: number }) => {
    const qs = new URLSearchParams();
    if (params?.branch) qs.set("branch", params.branch);
    if (params?.weeks) qs.set("weeks", String(params.weeks));
    const s = qs.toString();
    return apiFetch<CapacityForecast>(`/api/v1/admin/children/capacity-forecast${s ? `?${s}` : ""}`, { token });
  },
  adminGetChild: (token: string, id: string) =>
    apiFetch<Child>(`/api/v1/admin/children/${id}`, { token }),
  adminCreateChild: (token: string, body: ChildInput) =>
    apiFetch<Child>("/api/v1/admin/children", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateChild: (token: string, id: string, body: ChildInput) =>
    apiFetch<Child>(`/api/v1/admin/children/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteChild: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/children/${id}`, { method: "DELETE", token }),
  // Key person: assign (empty staffId clears) a child's key person, and list the
  // children a staff member is key person for.
  adminGetSendSupport: (token: string, childId: string) =>
    apiFetch<ChildSendSupport | null>(`/api/v1/admin/children/${childId}/send-support`, { token }),
  adminUpsertSendSupport: (token: string, childId: string, body: SendSupportInput) =>
    apiFetch<ChildSendSupport>(`/api/v1/admin/children/${childId}/send-support`, { method: "PUT", body: JSON.stringify(body), token }),
  adminGetSendOverview: (token: string, branch?: string) =>
    apiFetch<SendOverview>(`/api/v1/admin/send/overview${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, { token }),
  adminSetChildPhoto: (token: string, childId: string, photoUrl: string) =>
    apiFetch<Child>(`/api/v1/admin/children/${childId}/photo`, { method: "PATCH", body: JSON.stringify({ photo_url: photoUrl }), token }),
  adminSetStaffPhoto: (token: string, staffId: string, photoUrl: string) =>
    apiFetch<Staff>(`/api/v1/admin/staff/${staffId}/photo`, { method: "PATCH", body: JSON.stringify({ photo_url: photoUrl }), token }),
  adminSetChildKeyPerson: (token: string, childId: string, staffId: string) =>
    apiFetch<Child>(`/api/v1/admin/children/${childId}/key-person`, { method: "PATCH", body: JSON.stringify({ staff_id: staffId }), token }),
  // Marks a leaving child as left (status=left + leave_date) and ends live
  // room placements; leave_date defaults to today when omitted.
  // ── Induction, consents & onboarding ───────────────────────────────────────
  adminGetInduction: (token: string, childId: string) =>
    apiFetch<InductionBundle>(`/api/v1/admin/children/${childId}/induction`, { token }),
  adminSaveInductionSection: (token: string, childId: string, key: string, body: { data: Record<string, unknown>; complete: boolean }) =>
    apiFetch<ChildInduction>(`/api/v1/admin/children/${childId}/induction/sections/${key}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminSubmitInduction: (token: string, childId: string) =>
    apiFetch<ChildInduction>(`/api/v1/admin/children/${childId}/induction/submit`, { method: "POST", body: "{}", token }),
  adminReviewInduction: (token: string, childId: string, note: string) =>
    apiFetch<ChildInduction>(`/api/v1/admin/children/${childId}/induction/review`, { method: "POST", body: JSON.stringify({ note }), token }),
  adminGetConsents: (token: string, childId: string) =>
    apiFetch<ConsentsBundle>(`/api/v1/admin/children/${childId}/consents`, { token }),
  adminRecordConsent: (token: string, childId: string, body: { key: string; granted: boolean; note?: string; signature_name: string }) =>
    apiFetch<Consent>(`/api/v1/admin/children/${childId}/consents`, { method: "POST", body: JSON.stringify(body), token }),
  adminGetOnboarding: (token: string, childId: string) =>
    apiFetch<OnboardingView>(`/api/v1/admin/children/${childId}/onboarding`, { token }),
  adminGetOnboardingBoard: (token: string, branch?: string) =>
    apiFetch<OnboardingView[]>(`/api/v1/admin/onboarding${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, { token }),
  portalGetInduction: (token: string, childId: string) =>
    apiFetch<InductionBundle>(`/api/v1/portal/children/${childId}/induction`, { token }),
  portalSaveInductionSection: (token: string, childId: string, key: string, body: { data: Record<string, unknown>; complete: boolean }) =>
    apiFetch<ChildInduction>(`/api/v1/portal/children/${childId}/induction/sections/${key}`, { method: "PUT", body: JSON.stringify(body), token }),
  portalSubmitInduction: (token: string, childId: string) =>
    apiFetch<ChildInduction>(`/api/v1/portal/children/${childId}/induction/submit`, { method: "POST", body: "{}", token }),
  portalGetConsents: (token: string, childId: string) =>
    apiFetch<ConsentsBundle>(`/api/v1/portal/children/${childId}/consents`, { token }),
  portalRecordConsent: (token: string, childId: string, body: { key: string; granted: boolean; note?: string; signature_name: string }) =>
    apiFetch<Consent>(`/api/v1/portal/children/${childId}/consents`, { method: "POST", body: JSON.stringify(body), token }),
  portalGetOnboarding: (token: string, childId: string) =>
    apiFetch<OnboardingView>(`/api/v1/portal/children/${childId}/onboarding`, { token }),
  // ── Parents / guardians (canonical model) ──────────────────────────────────
  adminGetParents: (token: string, q?: string) =>
    apiFetch<Parent[]>(`/api/v1/admin/parents${q ? `?q=${encodeURIComponent(q)}` : ""}`, { token }),
  adminGetParent: (token: string, id: string) =>
    apiFetch<Parent>(`/api/v1/admin/parents/${id}`, { token }),
  adminCreateParent: (token: string, body: ParentInput) =>
    apiFetch<Parent>("/api/v1/admin/parents", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateParent: (token: string, id: string, body: ParentInput) =>
    apiFetch<Parent>(`/api/v1/admin/parents/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteParent: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/admin/parents/${id}`, { method: "DELETE", token }),
  adminGetChildParents: (token: string, childId: string) =>
    apiFetch<ChildParentRelationship[]>(`/api/v1/admin/children/${childId}/parents`, { token }),
  adminLinkChildParent: (token: string, childId: string, body: { parent_id?: string; parent?: ParentInput } & RelationshipFlagsInput) =>
    apiFetch<ChildParentRelationship>(`/api/v1/admin/children/${childId}/parents`, { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateParentRelationship: (token: string, id: string, body: RelationshipFlagsInput) =>
    apiFetch<ChildParentRelationship>(`/api/v1/admin/parent-relationships/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminUnlinkParentRelationship: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/admin/parent-relationships/${id}`, { method: "DELETE", token }),
  adminGetParentChildren: (token: string, parentId: string) =>
    apiFetch<ChildParentRelationship[]>(`/api/v1/admin/parents/${parentId}/children`, { token }),
  adminInviteParent: (token: string, parentId: string, temporaryDays?: number) =>
    apiFetch<{ activation_link: string; parent_id: string; token: string }>(`/api/v1/admin/parents/${parentId}/invite`, { method: "POST", body: JSON.stringify({ temporary_days: temporaryDays ?? 0 }), token }),
  adminSetParentPortalState: (token: string, parentId: string, state: string, temporaryDays?: number) =>
    apiFetch<Parent>(`/api/v1/admin/parents/${parentId}/portal-state`, { method: "POST", body: JSON.stringify({ state, temporary_days: temporaryDays ?? 0 }), token }),
  portalActivate: (parentId: string, tokenValue: string, password: string) =>
    apiFetch<Parent>("/api/v1/auth/portal/activate", { method: "POST", body: JSON.stringify({ parent_id: parentId, token: tokenValue, password }) }),
  portalGetMe: (token: string) =>
    apiFetch<{ parent: Parent; children: ChildParentRelationship[] }>("/api/v1/portal/me", { token }),
  portalGetChildren: (token: string) =>
    apiFetch<Child[]>("/api/v1/portal/children", { token }),
  // ── Finance: families, charges, payments, Direct Debit ─────────────────────
  adminGetFamilies: (token: string) =>
    apiFetch<Family[]>("/api/v1/admin/families", { token }),
  adminGetFamily: (token: string, id: string) =>
    apiFetch<FamilyView>(`/api/v1/admin/families/${id}`, { token }),
  adminEnsureFamily: (token: string, childId: string) =>
    apiFetch<Family>(`/api/v1/admin/children/${childId}/family`, { method: "POST", body: "{}", token }),
  adminCreateCharge: (token: string, familyId: string, body: { child_id?: string; description: string; amount_pence: number; due_date: string; first_payment?: boolean }) =>
    apiFetch<Charge>(`/api/v1/admin/families/${familyId}/charges`, { method: "POST", body: JSON.stringify(body), token }),
  adminCreateFirstPayment: (token: string, familyId: string, body: { child_id: string; deposit_pence: number; first_month_pence: number; due_date: string }) =>
    apiFetch<Charge[]>(`/api/v1/admin/families/${familyId}/first-payment`, { method: "POST", body: JSON.stringify(body), token }),
  adminCreateSchedule: (token: string, familyId: string, body: { child_id: string; amount_pence: number; day_of_month: number; start_month: string; end_month?: string }) =>
    apiFetch<PaymentScheduleItem>(`/api/v1/admin/families/${familyId}/schedule`, { method: "POST", body: JSON.stringify(body), token }),
  adminRecordManualPayment: (token: string, familyId: string, body: { amount_pence: number; note?: string }) =>
    apiFetch<FamilyPayment>(`/api/v1/admin/families/${familyId}/manual-payment`, { method: "POST", body: JSON.stringify(body), token }),
  adminMarkMandate: (token: string, familyId: string, reference: string) =>
    apiFetch<Family>(`/api/v1/admin/families/${familyId}/mandate`, { method: "POST", body: JSON.stringify({ reference }), token }),
  adminCollectCharge: (token: string, chargeId: string) =>
    apiFetch<Charge>(`/api/v1/admin/charges/${chargeId}/collect`, { method: "POST", body: "{}", token }),
  adminGetFinanceDashboard: (token: string) =>
    apiFetch<FinanceDashboard>("/api/v1/admin/finance/dashboard", { token }),
  adminSendChargeReminder: (token: string, chargeId: string) =>
    apiFetch<CommunicationLog>(`/api/v1/admin/charges/${chargeId}/remind`, { method: "POST", body: "{}", token }),
  adminGetFamilyCommunications: (token: string, familyId: string) =>
    apiFetch<CommunicationLog[]>(`/api/v1/admin/families/${familyId}/communications`, { token }),
  adminRunReminderSweep: (token: string) =>
    apiFetch<{ sent: number }>("/api/v1/admin/finance/reminders/run", { method: "POST", body: "{}", token }),
  portalGetChildAttendance: (token: string, childId: string) =>
    apiFetch<PortalAttendanceRow[]>(`/api/v1/portal/children/${childId}/attendance`, { token }),
  portalGetChildDailyRecords: (token: string, childId: string) =>
    apiFetch<DailyRecord[]>(`/api/v1/portal/children/${childId}/daily-records`, { token }),
  adminShareDailyRecord: (token: string, id: string) =>
    apiFetch<DailyRecord>(`/api/v1/admin/daily-records/${id}/share`, { method: "POST", body: "{}", token }),
  adminUnshareDailyRecord: (token: string, id: string) =>
    apiFetch<DailyRecord>(`/api/v1/admin/daily-records/${id}/unshare`, { method: "POST", body: "{}", token }),
  portalGetFinance: (token: string) =>
    apiFetch<FamilyView | { family: null }>("/api/v1/portal/finance", { token }),
  portalSetupDirectDebit: (token: string) =>
    apiFetch<{ setup_url: string }>("/api/v1/portal/finance/direct-debit", { method: "POST", body: "{}", token }),
  adminArchiveChild: (token: string, childId: string, leaveDate?: string) =>
    apiFetch<Child>(`/api/v1/admin/children/${childId}/archive`, { method: "POST", body: JSON.stringify({ leave_date: leaveDate ?? "" }), token }),
  adminGetStaffKeyChildren: (token: string, staffId: string) =>
    apiFetch<Child[]>(`/api/v1/admin/staff/${staffId}/key-children`, { token }),

  // Nursery - attendance register
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

  // People / HR - staff
  adminGetStaff: (token: string, params?: { branch?: string; status?: string; type?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return apiFetch<Staff[]>(`/api/v1/admin/staff${s ? `?${s}` : ""}`, { token });
  },
  // Organisation (own tenant) - profile + branding self-service.
  adminGetOrganisation: (token: string) =>
    apiFetch<Organisation>("/api/v1/admin/organisation", { token }),
  adminUpdateOrganisation: (token: string, body: OrgProfileInput) =>
    apiFetch<Organisation>("/api/v1/admin/organisation", { method: "PUT", body: JSON.stringify(body), token }),

  adminGetStaffMember: (token: string, id: string) =>
    apiFetch<Staff>(`/api/v1/admin/staff/${id}`, { token }),
  adminGetStaffAttendanceSummary: (token: string, id: string, params: { from: string; to: string }) =>
    apiFetch<StaffAbsenceSummary>(`/api/v1/admin/staff/${id}/attendance-summary?from=${params.from}&to=${params.to}`, { token }),
  adminCreateStaff: (token: string, body: StaffInput) =>
    apiFetch<Staff>("/api/v1/admin/staff", { method: "POST", body: JSON.stringify(body), token }),
  adminUpdateStaff: (token: string, id: string, body: StaffInput) =>
    apiFetch<Staff>(`/api/v1/admin/staff/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
  adminDeleteStaff: (token: string, id: string) =>
    apiFetch(`/api/v1/admin/staff/${id}`, { method: "DELETE", token }),

  // People / HR - staff attendance register
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
  adminGetAttendanceSummary: (token: string, params?: { date?: string; branch?: string }) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const s = qs.toString();
    return apiFetch<AttendanceDaySummary>(`/api/v1/admin/staff-attendance/summary${s ? `?${s}` : ""}`, { token });
  },
  adminCorrectAttendance: (token: string, id: string, body: AttendanceCorrectionInput) =>
    apiFetch<StaffAttendanceRecord>(`/api/v1/admin/staff-attendance/${id}/correct`, { method: "PATCH", body: JSON.stringify(body), token }),

  // Nursery - daily records (observations, incidents, safeguarding, medication, meals)
  adminGetDailyRecords: (token: string, params?: { type?: string; child?: string; branch?: string; status?: string; approval?: string; date?: string; since?: string; q?: string; limit?: number }) => {
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
  adminApproveDailyRecord: (token: string, id: string) =>
    apiFetch<DailyRecord>(`/api/v1/admin/daily-records/${id}/approve`, { method: "POST", token }),
  adminRejectDailyRecord: (token: string, id: string, reason: string) =>
    apiFetch<DailyRecord>(`/api/v1/admin/daily-records/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }), token }),
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
