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

export interface BranchHours {
  day: string;
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface BranchGoogle {
  place_id?: string;
  location_id?: string;
  review_url?: string;
  maps_url?: string;
  rating?: number;
  review_count?: number;
  business_status?: string;
  last_sync?: string;
}

export interface BranchSocial {
  facebook?: string;
  instagram?: string;
  website?: string;
}

export interface BranchManagers {
  director?: string;
  regional?: string;
  branch_manager?: string;
  deputy?: string;
  assistant?: string;
  key_persons?: string[];
}

export interface Branch {
  id: string;
  ref?: string; // BR-YYYY-NNNNNN
  slug: string;
  name: string;
  status: BranchStatus;
  short_description: string;
  hero_image_url?: string;
  logo_url?: string;
  gallery?: string[];
  contact: BranchContact;
  admissions: BranchAdmissions;
  postcode?: string;
  lat?: number;
  lng?: number;
  website?: string;
  parking?: string;
  opening_hours?: BranchHours[];
  capacity?: number;
  age_groups?: string[];
  ofsted_rating?: string;
  ofsted_report_url?: string;
  google?: BranchGoogle;
  social?: BranchSocial;
  managers?: BranchManagers;
  group_id?: string;
  archived_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type BranchInput = Omit<Branch, "id" | "ref" | "archived_at" | "created_at" | "updated_at" | "managers">;

// Aggregated per-branch rollup (enterprise list rows).
export interface BranchOverviewRow {
  slug: string;
  name: string;
  ref?: string;
  status: string;
  manager_id?: string;
  children: number;
  capacity: number;
  occupancy: number;
  staff: number;
  staff_present: number;
  rooms: number;
  enquiries: number;
  new_enquiries: number;
  attendance_today: number;
  safeguarding_open: number;
  medication_due: number;
  rating: number;
  ofsted?: string;
  performance: number;
  lat?: number;
  lng?: number;
}

export interface BranchActivityItem {
  time: string;
  text: string;
  kind: string;
}

// Per-branch executive dashboard (mini Command Centre).
export interface BranchDashboard {
  slug: string;
  name: string;
  date: string;
  children_active: number;
  children_present: number;
  children_expected: number;
  attendance_rate: number;
  capacity: number;
  occupancy: number;
  available: number;
  staff_total: number;
  staff_present: number;
  staff_on_leave: number;
  rooms: number;
  enquiries: number;
  new_enquiries: number;
  medication_due: number;
  safeguarding_open: number;
  incidents_today: number;
  meals_served: number;
  rating: number;
  review_count: number;
  ofsted?: string;
  performance: number;
  performance_breakdown?: BranchPerformance;
  birthdays: string[];
  activity: BranchActivityItem[];
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

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  size?: string;
  vat?: number;
}

export interface ShippingAddress {
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface Order {
  id: string;
  ref?: string; // human ref e.g. ORD-2026-000042
  user_id: string;
  items: OrderItem[];
  status: OrderStatus;
  total_amount: number;
  currency: string;
  // Customer snapshot
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  // Nursery (branch_slug "" or "n/a" = Not applicable)
  branch_slug?: string;
  branch_name?: string;
  child_ref?: string;
  // Addresses
  shipping_address?: ShippingAddress;
  billing_address?: ShippingAddress;
  // Payment
  payment_status?: PaymentStatus;
  stripe_customer_id?: string;
  stripe_session_id?: string;
  payment_intent_id?: string;
  paid_at?: string;
  created_at: string;
  updated_at?: string;
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
export type UserRole =
  | "customer"
  | "staff"
  | "branch_manager"
  | "admin"
  | "super_admin"
  | "finance"
  | "admissions"
  | "procurement"
  | "director"
  | "regional_manager"
  | "deputy_manager"
  | "eyfs_lead"
  | "senco"
  | "office_admin"
  | "finance_officer"
  | "hr_officer"
  | "admissions_officer"
  | "room_leader"
  | "practitioner"
  | "apprentice"
  | "kitchen"
  | "maintenance"
  | "external_inspector"
  | (string & {}); // custom roles (super-admin created)

export interface RoleDefinition {
  id?: string;
  name: string;
  label: string;
  permissions: string[];
  is_custom: boolean;
  dashboard?: string;
}

export interface PermissionInfo {
  key: string;
  label: string;
  category: string;
}

export interface RolesResponse {
  roles: RoleDefinition[];
  catalogue: PermissionInfo[];
  categories: string[];
}

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

// Payload for manually logging an off-website enquiry (phone, walk-in, referral…).
export interface EnquiryCreateInput {
  name: string;
  email?: string;
  phone?: string;
  branch: string;
  child_age?: string;
  enquiry_type: string;
  message?: string;
  source: string;
  priority?: EnquiryPriority;
  assigned_to?: string;
  assigned_to_name?: string;
  note?: string;
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

// ── Permissions (granular capability gates; mirror the Go permission map) ────
export type Permission =
  | "dashboard.view"
  | "store.manage"
  | "blog.manage"
  | "enquiries.manage"
  | "procurement.view"
  | "procurement.manage"
  | "suppliers.manage"
  | "finance.view"
  | "audit.view"
  | "branches.manage"
  | "branch.admin"
  | "users.manage"
  | "children.manage"
  | "attendance.manage"
  | "staff.manage"
  | "daily_logs.manage";

export interface Me {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

// ── Customizable dashboard layout ────────────────────────────────────────────
export interface DashboardWidget {
  key: string;
  hidden: boolean;
  size?: "normal" | "wide";
}

export interface DashboardLayout {
  id?: string;
  user_id?: string;
  name?: string;
  active?: boolean;
  widgets: DashboardWidget[];
  updated_at?: string;
}

// Org-wide dashboard template curated by a Super Admin; can be the default for
// one or more roles (B3.3b).
export interface DashboardProfile {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  widgets: DashboardWidget[];
  default_for_roles: UserRole[];
  updated_at?: string;
}

export interface DashboardProfilesResponse {
  profiles: DashboardProfile[];
  roles: { role: UserRole; label: string }[];
}

// ── Suppliers (managed vendor directory) ─────────────────────────────────────
export interface Supplier {
  id: string;
  name: string;
  slug: string;
  category?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  order_email?: string;
  account_ref?: string;
  lead_time_days?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierInput {
  name: string;
  category?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  order_email?: string;
  account_ref?: string;
  lead_time_days?: number;
  notes?: string;
  is_active?: boolean;
}

// ── Procurement analytics (server-side roll-up) ──────────────────────────────
export interface ProcurementAnalytics {
  total_requests: number;
  total_orders: number;
  total_spend: number; // pence
  pending_requests: number;
  overdue_orders: number;
  request_status_counts: Record<string, number>;
  order_status_counts: Record<string, number>;
  spend_by_supplier: { supplier: string; spend: number; orders: number }[];
  spend_by_branch: { branch: string; spend: number }[];
  monthly_spend: { month: string; spend: number }[];
  top_items: { name: string; qty: number; requests: number }[];
  avg_request_to_order_days: number;
  avg_order_to_delivery_days: number;
}

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

export interface PurchaseCartAttachment {
  name: string;
  url: string;
  uploaded_at: string;
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
  subtotal: number; // pence — estimate
  order_total?: number; // pence — actual amount paid (post-placement); analytics uses this
  attachments?: PurchaseCartAttachment[];
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

// ── Nursery: rooms, children & attendance (Phase 1) ──────────────────────────
export interface Room {
  id: string;
  branch_slug: string;
  name: string;
  age_range?: string;
  capacity: number;
  staff_ratio?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RoomInput {
  branch_slug: string;
  name: string;
  age_range?: string;
  capacity?: number;
  staff_ratio?: number;
}

export type ChildStatus = "active" | "waitlist" | "left";

export interface Guardian {
  name: string;
  relation?: string;
  email?: string;
  phone?: string;
  primary?: boolean;
}

export interface ChildSession {
  day: string;
  type: string; // full | am | pm
}

export interface Child {
  id: string;
  ref?: string; // CHD-YYYY-NNNNNN
  first_name: string;
  last_name: string;
  dob?: string; // YYYY-MM-DD
  gender?: string;
  branch_slug: string;
  room_id?: string;
  status: ChildStatus;
  start_date?: string;
  guardians?: Guardian[];
  funding_type: string; // none | 15h | 30h
  sessions?: ChildSession[];
  allergies?: string;
  dietary_reqs?: string;
  medical_notes?: string;
  enquiry_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChildInput {
  first_name: string;
  last_name: string;
  dob?: string;
  gender?: string;
  branch_slug: string;
  room_id?: string;
  status?: ChildStatus;
  start_date?: string;
  guardians?: Guardian[];
  funding_type?: string;
  sessions?: ChildSession[];
  allergies?: string;
  dietary_reqs?: string;
  medical_notes?: string;
}

export interface ChildStatPoint {
  label: string;
  value: number;
}

export interface BranchChildStat {
  branch: string;
  children: number;
  capacity: number;
  occupancy_rate: number;
}

export interface ChildStats {
  total: number;
  active: number;
  waitlist: number;
  capacity: number;
  available: number;
  occupancy_rate: number;
  by_branch: ChildStatPoint[];
  by_age_group: ChildStatPoint[];
  branches: BranchChildStat[];
}

export type AttendanceStatus = "expected" | "present" | "absent" | "holiday" | "sick";

export interface AttendanceRecord {
  id: string;
  child_id: string;
  child_name: string;
  branch_slug: string;
  room_id?: string;
  date: string;
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  checked_in_by?: string;
  checked_out_by?: string;
  late_pickup: boolean;
  notes?: string;
}

export interface BranchAttendanceStat {
  branch: string;
  present: number;
  expected: number;
  attendance_rate: number;
}

export interface AttendanceStats {
  date: string;
  present: number;
  checked_in: number;
  absent: number;
  expected: number;
  attendance_rate: number;
  late_pickups: number;
  branches: BranchAttendanceStat[];
}

// ── People / HR: staff & staff attendance (Phase 2) ──────────────────────────
export type StaffStatus = "active" | "on_leave" | "inactive";
export type StaffType = "permanent" | "agency" | "bank";

export interface Staff {
  id: string;
  ref?: string; // STF-YYYY-NNNNNN
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  branch_slug: string;
  room_id?: string;
  job_title?: string;
  staff_type: StaffType;
  status: StaffStatus;
  start_date?: string;
  contract_hours?: number;
  qualifications?: string[];
  dbs_number?: string;
  dbs_expiry?: string;
  first_aid_expiry?: string;
  user_id?: string; // linked login account (empty = HR-only, no login)
  has_pin?: boolean; // whether a kiosk clock-in PIN is set
  created_at?: string;
  updated_at?: string;
}

export interface StaffInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  branch_slug: string;
  room_id?: string;
  job_title?: string;
  staff_type?: StaffType;
  status?: StaffStatus;
  start_date?: string;
  contract_hours?: number;
  qualifications?: string[];
  dbs_number?: string;
  dbs_expiry?: string;
  first_aid_expiry?: string;
  // Optional system login (People, login optional)
  enable_login?: boolean;
  login_role?: UserRole;
  login_password?: string;
}

export interface BranchStaffStat {
  branch: string;
  total: number;
  present: number;
}

export interface StaffStats {
  date: string;
  attendance_rate: number;
  total: number;
  present: number;
  on_leave: number;
  training: number;
  sick: number;
  late_arrival: number;
  agency: number;
  absent: number;
  dbs_expiring: number;
  branches: BranchStaffStat[];
}

export type StaffAttendanceStatus = "expected" | "present" | "absent" | "leave" | "sick" | "training";

export interface StaffAttendanceRecord {
  id: string;
  staff_id: string;
  staff_name: string;
  branch_slug: string;
  date: string;
  status: StaffAttendanceStatus;
  clock_in?: string;
  clock_out?: string;
  late_arrival: boolean;
  notes?: string;
  source?: string;
  device_id?: string;
  worked_minutes?: number;
  break_minutes?: number;
  late_minutes?: number;
  missing_clockout?: boolean;
}

// ── Kiosk (entrance tablet) ──────────────────────────────────────────────────
export interface KioskSession {
  device_id: string;
  device_name: string;
  branch_slug: string;
  branch_name: string;
}

export interface KioskStaffResult {
  id: string;
  name: string;
  job_title?: string;
  room_name?: string;
  has_pin: boolean;
  clocked_in: boolean;
  clocked_out: boolean;
  status?: string;
}

export interface KioskDevice {
  id: string;
  name: string;
  branch_slug: string;
  token_hint: string;
  active: boolean;
  last_seen_at?: string;
  created_at: string;
}

export interface KioskRecentCheckIn {
  name: string;
  job_title?: string;
  room_name?: string;
  time: string;
  late: boolean;
  clocked_out: boolean;
}
export interface KioskSummary {
  checked_in: number;
  not_checked_in: number;
  late: number;
  checked_out: number;
}
export interface KioskOverview {
  recent: KioskRecentCheckIn[];
  summary: KioskSummary;
}

// ── Rota / shifts ────────────────────────────────────────────────────────────
export interface Shift {
  id: string;
  staff_id: string;
  staff_name: string;
  branch_slug: string;
  room_id?: string;
  room_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
}
export interface ShiftInput {
  staff_id: string;
  room_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

// ── Daily records: observations, incidents, safeguarding, medication, meals (Phase 3) ──
export type DailyRecordType = "observation" | "incident" | "safeguarding" | "medication" | "meal";
export type DailyRecordStatus = "open" | "resolved" | "administered" | "logged";

export interface DailyRecord {
  id: string;
  ref?: string; // LOG-YYYY-NNNNNN
  type: DailyRecordType;
  child_id?: string;
  child_name?: string;
  branch_slug: string;
  room_id?: string;
  date: string;
  title: string;
  detail?: string;
  status: DailyRecordStatus;
  severity?: string; // low | medium | high
  author?: string;
  eyfs_areas?: string[];
  next_steps?: string;
  medication?: string;
  dose?: string;
  meal_type?: string;
  eaten?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DailyRecordInput {
  type: DailyRecordType;
  child_id?: string;
  branch_slug: string;
  room_id?: string;
  date?: string;
  title: string;
  detail?: string;
  status?: DailyRecordStatus;
  severity?: string;
  eyfs_areas?: string[];
  next_steps?: string;
  medication?: string;
  dose?: string;
  meal_type?: string;
  eaten?: string;
}

export interface DailyStats {
  date: string;
  safeguarding_open: number;
  incidents_today: number;
  medication_due: number;
  meals_served: number;
  observations_week: number;
  by_type: { label: string; count: number }[];
}

// ── GBP / Reviews / Performance (Branch Management B2) ───────────────────────
export interface LabelCount { label: string; count: number; }
export interface SentimentSplit { positive: number; neutral: number; negative: number; }

export interface GBPReview {
  id: string;
  branch_slug: string;
  review_id: string;
  author: string;
  rating: number;
  text?: string;
  date: string;
  reply?: string;
  sentiment?: string;
}

export interface GBPInsights {
  search_views: number;
  direction_requests: number;
  calls: number;
  website_clicks: number;
  new_photos: number;
  questions: number;
}

export interface ReviewsAnalytics {
  slug: string;
  rating: number;
  review_count: number;
  last_sync?: string;
  stale: boolean;
  distribution: number[]; // [1★,2★,3★,4★,5★]
  sentiment: SentimentSplit;
  keywords: LabelCount[];
  pending_replies: number;
  trend: { date: string; rating: number }[];
  insights: GBPInsights;
  recent: GBPReview[] | null;
  negative: GBPReview[] | null;
}

export interface PerfDimension { label: string; score: number; weight: number; }
export interface BranchPerformance { overall: number; dimensions: PerfDimension[]; }
