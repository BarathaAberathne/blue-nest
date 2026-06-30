// ── Branch ───────────────────────────────────────────────────────────────────
export type BranchStatus = "active" | "coming_soon";

export interface BranchContact {
  phone?: string;
  email: string;
  address: string;
  map_url?: string;
}

export interface BranchAdmissions {
  age_range: string;
  opening_time?: string;
  closing_time?: string;
  notes?: string;
}

export interface Branch {
  id: string;
  slug: string;
  name: string;
  status: BranchStatus;
  short_description: string;
  hero_image_url?: string;
  contact: BranchContact;
  admissions: BranchAdmissions;
}

// ── Product ──────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  external_id?: string;
  sku?: string;
  slug: string;
  name: string;
  description: string;
  price: number; // pence
  currency: string;
  category?: string;
  category_id: string;
  image_url?: string;
  image_urls?: string[];
  stock_qty: number;
  reorder_point?: number;
  is_active: boolean;
  sizes?: string[];
}

// ── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string;
  size?: string;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
}

// ── Order ─────────────────────────────────────────────────────────────────────
export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
}

export interface ShippingAddress {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  status: OrderStatus;
  total_amount: number;
  currency: string;
  shipping_address?: ShippingAddress;
  customer_email?: string;
  stripe_session_id?: string;
  payment_intent_id?: string;
  paid_at?: string;
  created_at: string;
}

// ── Blog ─────────────────────────────────────────────────────────────────────
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author_id?: string;
  author_name: string;
  cover_image?: string;
  gallery_images?: string[];
  tags?: string[];
  like_count?: number;
  published?: boolean;
  published_at?: string;
  scheduled_at?: string;
}

export interface Comment {
  id: string;
  post_slug: string;
  name: string;
  body: string;
  created_at: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = "customer" | "staff" | "branch_manager" | "admin" | "super_admin";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  branch_slugs?: string[];
  oauth_provider?: string;
  oauth_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: User;
}

// ── API ───────────────────────────────────────────────────────────────────────
export interface ApiEnvelope<T> {
  data?: T;
  error?: string;
  message?: string;
}

// ── Enquiries (admissions CRM / inquiry tracker) ────────────────────────────────
export type EnquiryStatus =
  | "new"
  | "contacted"
  | "awaiting_reply"
  | "booked_visit"
  | "visit_completed"
  | "registered"
  | "cancelled"
  | "lost"
  | "spam";

// Workflow order used to drive tabs, badges and funnel ordering.
export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  "new",
  "contacted",
  "awaiting_reply",
  "booked_visit",
  "visit_completed",
  "registered",
  "cancelled",
  "lost",
  "spam",
];

// Display labels only — the stored EnquiryStatus values never change. "lost"
// reads as "Not proceeding" and "spam" as "Spam" for friendlier nursery wording.
export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  awaiting_reply: "Awaiting reply",
  booked_visit: "Booked visit",
  visit_completed: "Visit completed",
  registered: "Registered",
  cancelled: "Cancelled",
  lost: "Not proceeding",
  spam: "Spam",
};

export type EnquiryPriority = "low" | "medium" | "high";

export type EnquiryActivityType =
  | "status_change"
  | "note_added"
  | "email_reply"
  | "follow_up_updated"
  | "assigned"
  | "registered";

export interface EnquiryNote {
  id: string;
  note: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

export interface EnquiryActivity {
  id: string;
  type: EnquiryActivityType;
  message: string;
  from_status?: string;
  to_status?: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

export interface EnquiryRegistration {
  is_registered: boolean;
  registration_date?: string;
  expected_start_date?: string;
  child_age_group?: string;
  room_allocation?: string;
  funding_type?: string;
}

export interface EnquiryAssignee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// Stats payload for the admissions KPI dashboard.
export interface EnquiryStatPoint {
  label: string;
  value: number;
}

export interface EnquiryBranchStat {
  branch: string;
  total: number;
  total_this_month: number;
  new: number;
  booked_visits: number;
  registered: number;
  lost_cancelled: number;
  conversion_rate: number;
  overdue_follow_ups: number;
}

export interface EnquiryStats {
  total_this_month: number;
  new: number;
  contacted: number;
  booked_visits: number;
  registrations: number;
  lost_cancelled: number;
  conversion_rate: number;
  visit_booking_rate: number;
  avg_response_hours: number;
  has_response_data: boolean;
  overdue_follow_ups: number;
  total: number;
  by_branch: EnquiryStatPoint[];
  by_status: EnquiryStatPoint[];
  by_type: EnquiryStatPoint[];
  monthly_trend: EnquiryStatPoint[];
  funnel: EnquiryStatPoint[];
  registrations_by_branch: EnquiryStatPoint[];
  branch_comparison: EnquiryBranchStat[];
}

export interface FeeQuote {
  branch?: string;
  age_group?: string;
  session?: string;
  days?: number;
  early_bird?: boolean;
  discount?: string;
  discount_amount?: number;
  funding?: string;
  year_weeks?: number;
  gross_weekly: number;
  funding_offset?: number;
  net_weekly: number;
  net_monthly: number;
}

export interface ApplicationChild {
  name: string;
  dob: string;
  gender?: string;
}

export interface ApplicationParent {
  name: string;
  email: string;
  phone: string;
}

export interface ApplicationSession {
  day: string;
  type: string;
  label?: string;
  time?: string;
}

export interface Application {
  child: ApplicationChild;
  parent: ApplicationParent;
  branch: string;
  settling_in?: string;
  waiting_list: boolean;
  sessions?: ApplicationSession[];
  signature_data_url?: string;
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  child_age: string;
  enquiry_type: string;
  message: string;
  fee_quote?: FeeQuote;
  application?: Application;
  status: EnquiryStatus;
  source?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  priority?: EnquiryPriority;
  follow_up_date?: string;
  next_action?: string;
  notes: EnquiryNote[];
  activity_log: EnquiryActivity[];
  registration?: EnquiryRegistration;
  created_at: string;
  updated_at?: string;
}

// Paginated table view payload (GET /admin/enquiries/page).
export interface EnquiryPage {
  items: Enquiry[];
  total: number;
  limit: number;
  skip: number;
}

// Lightweight enquiry summary for the tasks feed / notification bell.
export interface EnquiryTaskItem {
  id: string;
  name: string;
  child_age?: string;
  branch: string;
  status: EnquiryStatus;
  enquiry_type: string;
  priority?: EnquiryPriority;
  assigned_to_name?: string;
  follow_up_date?: string;
  created_at: string;
}

// Grouped admissions work (GET /admin/enquiries/tasks).
export interface EnquiryTasks {
  overdue_follow_ups: EnquiryTaskItem[];
  due_today: EnquiryTaskItem[];
  uncontacted_24h: EnquiryTaskItem[];
  visits_today: EnquiryTaskItem[];
  visits_this_week: EnquiryTaskItem[];
  apps_missing_registration: EnquiryTaskItem[];
  registrations_this_month: EnquiryTaskItem[];
  notification_count: number;
}

// Bulk table actions (POST /admin/enquiries/bulk).
export type EnquiryBulkAction = "assign" | "status" | "priority" | "note";

export interface EnquiryBulkRequest {
  ids: string[];
  action: EnquiryBulkAction;
  status?: EnquiryStatus;
  assigned_to?: string;
  assigned_to_name?: string;
  priority?: EnquiryPriority;
  note?: string;
}

export interface EnquiryBulkResult {
  updated: number;
  failed: { id: string; error: string }[];
}

// ── Audit log (admin activity) ──────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  summary: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// ── Order / supply requests ─────────────────────────────────────────────────────
export type OrderRequestStatus =
  | "pending"
  | "approved"
  | "converted_to_po"
  | "ordered"
  | "received"
  | "cancelled";

export type ProcurementPriority = "low" | "normal" | "high" | "urgent";

export interface OrderRequestItem {
  item_name: string;
  supplier: string; // Gompels | Amazon | Other
  qty: number;
  notes?: string;
  code?: string; // supplier product code (Gompels SKU) when picked from catalogue
  catalogue_item_id?: string;
}

// ── Order templates (standing orders) ───────────────────────────────────────────
export interface OrderTemplate {
  id: string;
  name: string;
  branch_slug?: string;
  items: OrderRequestItem[];
  created_by_name?: string;
  created_at: string;
}

// ── Catalogue (sourcing cache / curation) ───────────────────────────────────────
export interface CatalogueOffer {
  supplier: string; // Gompels | Amazon | Other
  code: string; // Gompels SKU or Amazon ASIN
  offer_id?: string;
  pack_size?: string;
  unit?: string;
  price: number; // pence
  price_per_unit?: number; // pence
  source_url?: string;
  last_seen_at?: string;
}

export interface CatalogueItem {
  id: string;
  name: string;
  base_name?: string; // product without the option suffix (for grouping variants)
  option?: string; // variant label, e.g. "Colour: Green"
  category?: string;
  offers: CatalogueOffer[];
  aliases?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Purchase carts (generated supplier orders) ──────────────────────────────────
// "sent" is the legacy value for "ordered".
export type PurchaseCartStatus =
  | "draft"
  | "sent"
  | "ordered"
  | "placed"
  | "tracking"
  | "dispatched"
  | "partially_received"
  | "received"
  | "completed"
  | "cancelled"
  | "failed";

export interface PurchaseCartLine {
  catalogue_item_id?: string;
  name: string;
  code?: string;
  pack_size?: string;
  qty: number;
  unit_price: number; // pence
  line_total: number; // pence
  matched: boolean;
  qty_received?: number;
  source_request_ids?: string[];
}

export interface PurchaseCartExportResult {
  name: string;
  status: string; // added | failed | not_found
  resolved_code?: string;
  catalogue_item_id?: string;
  picked_name?: string;
  searched?: boolean;
  substituted?: boolean;
  qty?: number;
}

export interface PurchaseCart {
  id: string;
  ref?: string; // human ref e.g. PO-2026-000123
  supplier: string;
  status: PurchaseCartStatus;
  branch_slug?: string;
  classroom?: string;
  priority?: ProcurementPriority;
  recipient_email?: string;
  lines: PurchaseCartLine[];
  subtotal: number; // pence
  source_request_ids: string[];
  generated_by?: string;
  sent_at?: string;
  email_ref?: string;
  supplier_order_ref?: string;
  tracking_number?: string;
  expected_delivery_date?: string;
  delivered_at?: string;
  completed_at?: string;
  export_results?: PurchaseCartExportResult[];
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderRequest {
  id: string;
  ref?: string; // human ref e.g. SR-2026-000045
  user_id: string;
  requested_by_name: string;
  requested_by_email: string;
  branch_slug: string;
  classroom?: string;
  priority?: ProcurementPriority;
  items: OrderRequestItem[];
  status: OrderRequestStatus;
  notes?: string;
  expected_delivery_date?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}
