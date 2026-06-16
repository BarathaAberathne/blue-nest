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
export type UserRole = "customer" | "admin" | "branch_manager";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
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

// ── Enquiries (website inquiry tracker) ─────────────────────────────────────────
export type EnquiryStatus = "new" | "read" | "responded";

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
  created_at: string;
}
