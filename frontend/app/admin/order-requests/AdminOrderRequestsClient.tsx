"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, ShoppingCart } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Badge from "@/components/ui/Badge";
import type { OrderRequest, OrderRequestStatus } from "@/types";

const STATUS_VARIANT: Record<OrderRequestStatus, "blue" | "amber" | "green" | "gray"> = {
  pending: "amber",
  ordered: "blue",
  received: "green",
  cancelled: "gray",
};

function fmtBranch(branch: string) {
  if (!branch) return "—";
  return branch.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Flatten requests to one CSV row per item — the buy list to place real orders from. */
function exportCsv(rows: OrderRequest[]) {
  const headers = ["Date", "Requested By", "Branch", "Status", "Item", "Supplier", "Qty", "Item Notes"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines: string[] = [];
  rows.forEach((req) => {
    req.items.forEach((it) => {
      lines.push(
        [
          new Date(req.created_at).toISOString(),
          req.requested_by_name || req.requested_by_email,
          fmtBranch(req.branch_slug),
          req.status,
          it.item_name,
          it.supplier,
          String(it.qty),
          it.notes ?? "",
        ]
          .map(escape)
          .join(","),
      );
    });
  });
  const csv = [headers.map(escape).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `order-requests-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrderRequestsClient() {
  const router = useRouter();
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated — please sign in as admin.");
      setLoading(false);
      return;
    }
    api.adminGetOrderRequests(token)
      .then((data) => setRequests(Array.isArray(data) ? (data as OrderRequest[]) : []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load order requests"))
      .finally(() => setLoading(false));
  }, []);

  const branchOptions = useMemo(
    () => [...new Set(requests.map((r) => r.branch_slug).filter(Boolean))].sort(),
    [requests],
  );
  const supplierOptions = useMemo(
    () => [...new Set(requests.flatMap((r) => r.items.map((it) => it.supplier)).filter(Boolean))].sort(),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((r) => (branch ? r.branch_slug === branch : true))
      .filter((r) => (supplier ? r.items.some((it) => it.supplier === supplier) : true))
      .filter((r) => (status ? r.status === status : true))
      .filter((r) =>
        q
          ? [r.requested_by_name, r.requested_by_email, ...r.items.map((it) => it.item_name)].some((f) =>
              (f ?? "").toLowerCase().includes(q),
            )
          : true,
      );
  }, [requests, search, branch, supplier, status]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id)),
    );

  const generateCart = async () => {
    const token = getAccessToken();
    if (!token || selected.size === 0) return;
    setGenerating(true);
    setError(null);
    try {
      await api.adminGenerateCart(token, [...selected]);
      router.push("/admin/purchase-carts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate cart");
      setGenerating(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Supply Requests</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500">{requests.length} total · {pendingCount} pending</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generateCart}
            disabled={selected.size === 0 || generating}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-4 w-4" />
            {generating ? "Generating…" : `Generate cart${selected.size ? ` (${selected.size})` : ""}`}
          </button>
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" /> Export buy list (CSV)
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search requester, item…"
          className="min-w-[14rem] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Search order requests"
        />
        <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Filter by branch"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All branches</option>
          {branchOptions.map((b) => <option key={b} value={b}>{fmtBranch(b)}</option>)}
        </select>
        <select value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="Filter by supplier"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All suppliers</option>
          {supplierOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left font-medium">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                />
              </th>
              {["Date", "Requested By", "Branch", "Items", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                  {requests.length === 0 ? "No supply requests yet." : "No requests match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className={`hover:bg-gray-50 ${r.status === "pending" ? "font-medium" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select request ${r.id}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {r.requested_by_name || "—"}
                    <span className="block text-xs font-normal text-gray-400">{r.requested_by_email}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{fmtBranch(r.branch_slug)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.items.length}</td>
                  <td className="px-4 py-3">
                    <Badge label={r.status} variant={STATUS_VARIANT[r.status] ?? "gray"} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/order-requests/${r.id}`} className="text-teal-600 hover:underline text-xs font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
