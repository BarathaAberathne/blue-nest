// ── Admin design system — per-entity status tokens ───────────────────────────
// One source of truth for every status-driven module's status → {label, accent}
// and its Kanban lane definitions, so the colour language is identical across
// orders, supply requests, purchase orders and the dashboards. Replaces the
// STATUS_VARIANT/STATUS_LABEL maps that were duplicated across ~5 files.

import type { AccentName, LaneTheme } from "@/lib/admin-theme";
import type { OrderStatus, OrderRequestStatus, ProcurementPriority, PurchaseCartStatus } from "@/types";

export type StatusMeta = { label: string; accent: AccentName };

// ── Procurement priority (shared by supply requests + purchase orders) ───────
export const PRIORITY_META: Record<ProcurementPriority, StatusMeta> = {
  low:    { label: "Low",    accent: "slate" },
  normal: { label: "Normal", accent: "sky" },
  high:   { label: "High",   accent: "orange" },
  urgent: { label: "Urgent", accent: "red" },
};

// Rank for sorting (urgent first).
export const PRIORITY_RANK: Record<ProcurementPriority, number> = {
  urgent: 0, high: 1, normal: 2, low: 3,
};

export function priorityMeta(p?: string): StatusMeta {
  return PRIORITY_META[(p as ProcurementPriority)] ?? PRIORITY_META.normal;
}

// A Kanban lane: a theme plus which statuses live in it and the status applied
// when a card is dropped into it.
export type Lane<S extends string> = LaneTheme & { statuses: S[]; dropStatus: S; terminal?: boolean };

// ── Customer orders ──────────────────────────────────────────────────────────
export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending:    { label: "Pending",    accent: "slate" },
  paid:       { label: "Paid",       accent: "blue" },
  processing: { label: "Processing", accent: "indigo" },
  shipped:    { label: "Shipped",    accent: "amber" },
  delivered:  { label: "Delivered",  accent: "green" },
  cancelled:  { label: "Cancelled",  accent: "red" },
};

export const ORDER_LANES: Lane<OrderStatus>[] = [
  { key: "pending",    label: "Pending",    accent: "slate",  statuses: ["pending"],    dropStatus: "pending",    desc: "Awaiting payment",       emptyEmoji: "🧾", emptyText: "No pending orders" },
  { key: "paid",       label: "Paid",       accent: "blue",   statuses: ["paid"],       dropStatus: "paid",       desc: "Payment received",       emptyEmoji: "💳", emptyText: "No paid orders" },
  { key: "processing", label: "Processing", accent: "indigo", statuses: ["processing"], dropStatus: "processing", desc: "Being prepared",         emptyEmoji: "📦", emptyText: "Nothing in preparation" },
  { key: "shipped",    label: "Shipped",    accent: "amber",  statuses: ["shipped"],    dropStatus: "shipped",    desc: "On its way",             emptyEmoji: "🚚", emptyText: "Nothing shipped" },
  { key: "delivered",  label: "Delivered",  accent: "green",  statuses: ["delivered"],  dropStatus: "delivered",  desc: "Order complete",         emptyEmoji: "🎉", emptyText: "Nothing delivered yet" },
  { key: "cancelled",  label: "Cancelled",  accent: "red",    statuses: ["cancelled"],  dropStatus: "cancelled",  desc: "Cancelled / refunded",   emptyEmoji: "🗂️", emptyText: "Nothing cancelled", terminal: true },
];

// The natural "advance to next stage" transition (drives the card primary button).
export const ORDER_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "paid", paid: "processing", processing: "shipped", shipped: "delivered",
};

// ── Supply requests (order requests) ─────────────────────────────────────────
// Workflow: pending → approved → converted_to_po → ordered → received (+ cancelled).
export const ORDER_REQUEST_STATUS_META: Record<OrderRequestStatus, StatusMeta> = {
  pending:         { label: "Pending",   accent: "amber" },
  approved:        { label: "Approved",  accent: "indigo" },
  converted_to_po: { label: "On PO",     accent: "violet" },
  ordered:         { label: "Ordered",   accent: "blue" },
  received:        { label: "Received",  accent: "green" },
  cancelled:       { label: "Cancelled", accent: "slate" },
};

export const ORDER_REQUEST_LANES: Lane<OrderRequestStatus>[] = [
  { key: "pending",         label: "Pending",   accent: "amber",  statuses: ["pending"],         dropStatus: "pending",         desc: "Awaiting review",      emptyEmoji: "📝", emptyText: "No requests waiting" },
  { key: "approved",        label: "Approved",  accent: "indigo", statuses: ["approved"],        dropStatus: "approved",        desc: "Cleared to order",     emptyEmoji: "👍", emptyText: "Nothing approved" },
  { key: "converted_to_po", label: "On PO",     accent: "violet", statuses: ["converted_to_po"], dropStatus: "converted_to_po", desc: "Rolled into an order", emptyEmoji: "🧾", emptyText: "Nothing on a PO" },
  { key: "ordered",         label: "Ordered",   accent: "blue",   statuses: ["ordered"],         dropStatus: "ordered",         desc: "Order placed",         emptyEmoji: "🛒", emptyText: "Nothing on order" },
  { key: "received",        label: "Received",  accent: "green",  statuses: ["received"],        dropStatus: "received",        desc: "Delivered & in",       emptyEmoji: "✅", emptyText: "Nothing received yet" },
  { key: "cancelled",       label: "Cancelled", accent: "slate",  statuses: ["cancelled"],       dropStatus: "cancelled",       desc: "Cancelled / rejected", emptyEmoji: "🗂️", emptyText: "Nothing cancelled", terminal: true },
];

export const ORDER_REQUEST_NEXT: Partial<Record<OrderRequestStatus, OrderRequestStatus>> = {
  pending: "approved", approved: "converted_to_po", converted_to_po: "ordered", ordered: "received",
};

// ── Purchase orders (purchase carts) ─────────────────────────────────────────
// Workflow: draft → placed → tracking → dispatched → (partially_)received → completed.
// "sent"/"ordered" are legacy values that read as "placed".
export const PURCHASE_CART_STATUS_META: Record<PurchaseCartStatus, StatusMeta> = {
  draft:              { label: "Draft",              accent: "slate" },
  sent:               { label: "Placed",             accent: "blue" },
  ordered:            { label: "Placed",             accent: "blue" },
  placed:             { label: "Placed",             accent: "blue" },
  tracking:           { label: "Tracking",           accent: "indigo" },
  dispatched:         { label: "Dispatched",         accent: "violet" },
  partially_received: { label: "Partially received", accent: "amber" },
  received:           { label: "Received",           accent: "green" },
  completed:          { label: "Completed",          accent: "emerald" },
  cancelled:          { label: "Cancelled",          accent: "red" },
  failed:             { label: "Failed",             accent: "red" },
};

export const PURCHASE_CART_LANES: Lane<PurchaseCartStatus>[] = [
  { key: "draft",              label: "Draft",      accent: "slate",  statuses: ["draft"],                            dropStatus: "draft",              desc: "Ready to place",        emptyEmoji: "🗒️", emptyText: "No draft orders" },
  { key: "placed",             label: "Placed",     accent: "blue",   statuses: ["placed", "ordered", "sent"],        dropStatus: "placed",             desc: "Sent to supplier",      emptyEmoji: "📧", emptyText: "Nothing placed" },
  { key: "in_transit",         label: "In transit", accent: "indigo", statuses: ["tracking", "dispatched"],           dropStatus: "tracking",           desc: "Tracked / dispatched",  emptyEmoji: "🚚", emptyText: "Nothing in transit" },
  { key: "partially_received", label: "Partial",    accent: "amber",  statuses: ["partially_received"],               dropStatus: "partially_received", desc: "Part-delivered",        emptyEmoji: "📦", emptyText: "Nothing part-received" },
  { key: "received",           label: "Received",   accent: "green",  statuses: ["received", "completed"],            dropStatus: "received",           desc: "Delivered / complete",  emptyEmoji: "✅", emptyText: "Nothing received yet" },
  { key: "closed",             label: "Cancelled",  accent: "red",    statuses: ["cancelled", "failed"],              dropStatus: "cancelled",          desc: "Cancelled or failed",   emptyEmoji: "🗂️", emptyText: "Nothing cancelled", terminal: true },
];

// The natural "advance to next stage" transition for a placed PO (drives the
// stepper + board card primary action; receive is handled separately).
export const PURCHASE_CART_NEXT: Partial<Record<PurchaseCartStatus, PurchaseCartStatus>> = {
  placed: "tracking", tracking: "dispatched", dispatched: "received", completed: "completed",
};

// Normalise legacy "sent"/"ordered" to "placed" for display/grouping.
export function normalizeCartStatus(s: PurchaseCartStatus): PurchaseCartStatus {
  return s === "sent" || s === "ordered" ? "placed" : s;
}
