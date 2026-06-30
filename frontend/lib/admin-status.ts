// ── Admin design system — per-entity status tokens ───────────────────────────
// One source of truth for every status-driven module's status → {label, accent}
// and its Kanban lane definitions, so the colour language is identical across
// orders, supply requests, purchase orders and the dashboards. Replaces the
// STATUS_VARIANT/STATUS_LABEL maps that were duplicated across ~5 files.

import type { AccentName, LaneTheme } from "@/lib/admin-theme";
import type { OrderStatus, OrderRequestStatus, PurchaseCartStatus } from "@/types";

export type StatusMeta = { label: string; accent: AccentName };

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
export const ORDER_REQUEST_STATUS_META: Record<OrderRequestStatus, StatusMeta> = {
  pending:   { label: "Pending",   accent: "amber" },
  ordered:   { label: "Ordered",   accent: "blue" },
  received:  { label: "Received",  accent: "green" },
  cancelled: { label: "Cancelled", accent: "slate" },
};

export const ORDER_REQUEST_LANES: Lane<OrderRequestStatus>[] = [
  { key: "pending",   label: "Pending",   accent: "amber", statuses: ["pending"],   dropStatus: "pending",   desc: "Needs ordering",      emptyEmoji: "📝", emptyText: "No requests waiting" },
  { key: "ordered",   label: "Ordered",   accent: "blue",  statuses: ["ordered"],   dropStatus: "ordered",   desc: "On a purchase order", emptyEmoji: "🛒", emptyText: "Nothing on order" },
  { key: "received",  label: "Received",  accent: "green", statuses: ["received"],  dropStatus: "received",  desc: "Delivered & in",      emptyEmoji: "✅", emptyText: "Nothing received yet" },
  { key: "cancelled", label: "Cancelled", accent: "slate", statuses: ["cancelled"], dropStatus: "cancelled", desc: "Cancelled",           emptyEmoji: "🗂️", emptyText: "Nothing cancelled", terminal: true },
];

export const ORDER_REQUEST_NEXT: Partial<Record<OrderRequestStatus, OrderRequestStatus>> = {
  pending: "ordered", ordered: "received",
};

// ── Purchase orders (purchase carts) ─────────────────────────────────────────
// "sent" is legacy and reads as "ordered" everywhere.
export const PURCHASE_CART_STATUS_META: Record<PurchaseCartStatus, StatusMeta> = {
  draft:              { label: "Draft",              accent: "slate" },
  sent:               { label: "Ordered",            accent: "blue" },
  ordered:            { label: "Ordered",            accent: "blue" },
  partially_received: { label: "Partially received", accent: "amber" },
  received:           { label: "Received",           accent: "green" },
  cancelled:          { label: "Cancelled",          accent: "red" },
  failed:             { label: "Failed",             accent: "red" },
};

export const PURCHASE_CART_LANES: Lane<PurchaseCartStatus>[] = [
  { key: "draft",              label: "Draft",      accent: "slate", statuses: ["draft"],                       dropStatus: "draft",              desc: "Ready to place",        emptyEmoji: "🗒️", emptyText: "No draft orders" },
  { key: "ordered",            label: "Ordered",    accent: "blue",  statuses: ["ordered", "sent"],             dropStatus: "ordered",            desc: "Sent to supplier",      emptyEmoji: "📧", emptyText: "Nothing on order" },
  { key: "partially_received", label: "Partial",    accent: "amber", statuses: ["partially_received"],          dropStatus: "partially_received", desc: "Part-delivered",        emptyEmoji: "📦", emptyText: "Nothing part-received" },
  { key: "received",           label: "Received",   accent: "green", statuses: ["received"],                    dropStatus: "received",           desc: "Fully delivered",       emptyEmoji: "✅", emptyText: "Nothing received yet" },
  { key: "closed",             label: "Cancelled",  accent: "red",   statuses: ["cancelled", "failed"],         dropStatus: "cancelled",          desc: "Cancelled or failed",   emptyEmoji: "🗂️", emptyText: "Nothing cancelled", terminal: true },
];

// Normalise the legacy "sent" status to "ordered" for display/grouping.
export function normalizeCartStatus(s: PurchaseCartStatus): PurchaseCartStatus {
  return s === "sent" ? "ordered" : s;
}
