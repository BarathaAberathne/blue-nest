"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Columns3, Download, Table2, Wand2, X, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import ProcurementTabs from "@/components/admin/procurement/ProcurementTabs";
import KanbanBoard from "@/components/admin/ui/KanbanBoard";
import KanbanCard from "@/components/admin/ui/KanbanCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import ViewToggle from "@/components/admin/ui/ViewToggle";
import { ORDER_REQUEST_LANES, ORDER_REQUEST_NEXT, ORDER_REQUEST_STATUS_META, PRIORITY_RANK, priorityMeta } from "@/lib/admin-status";
import type { OrderRequest, OrderRequestStatus, ProcurementPriority, PurchaseCart } from "@/types";

function fmtBranch(branch: string) {
  if (!branch) return "—";
  return branch.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/** Flatten requests to one CSV row per item — the buy list to place real orders from. */
function exportCsv(rows: OrderRequest[]) {
  const headers = ["Date", "Requested By", "Branch", "Status", "Code", "Item", "Supplier", "Qty", "Item Notes"];
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
          it.code ?? "",
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
  const [view, setView] = useState<"board" | "table">("board");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  // Guided "New order" wizard.
  const [wizardStep, setWizardStep] = useState<"closed" | "review" | "done">("closed");
  const [generatedCarts, setGeneratedCarts] = useState<PurchaseCart[]>([]);

  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated — please sign in as admin."); setLoading(false); return; }
    try {
      const data = await api.adminGetOrderRequests(token);
      setRequests(Array.isArray(data) ? (data as OrderRequest[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Drag-to-advance on the board. pending↔ordered↔received are plain status sets
  // (a manual override of the generate-cart flow); cancelling is confirmed.
  const changeStatus = async (r: OrderRequest, status: OrderRequestStatus) => {
    if (status === r.status) return;
    if (status === "cancelled" && !window.confirm("Cancel this supply request?")) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.adminUpdateOrderRequestStatus(token, r.id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update request");
    }
  };

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
    const rank = (p?: string) => PRIORITY_RANK[(p as ProcurementPriority)] ?? PRIORITY_RANK.normal;
    return requests
      .filter((r) => (branch ? r.branch_slug === branch : true))
      .filter((r) => (supplier ? r.items.some((it) => it.supplier === supplier) : true))
      .filter((r) => (status ? r.status === status : true))
      .filter((r) =>
        q
          ? [r.ref, r.requested_by_name, r.requested_by_email, r.classroom, ...r.items.map((it) => it.item_name)].some(
              (f) => (f ?? "").toLowerCase().includes(q),
            )
          : true,
      )
      // Highest priority first, then most-recent — so urgent requests surface.
      .sort((a, b) => rank(a.priority) - rank(b.priority) || +new Date(b.created_at) - +new Date(a.created_at));
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

  // ── Guided "New order" wizard ──────────────────────────────────
  const selectedRequests = useMemo(
    () => requests.filter((r) => selected.has(r.id)),
    [requests, selected],
  );

  // Preview the selected items aggregated by their requested supplier (dedup +
  // sum qty). The sourcing engine may re-route to the cheapest supplier when the
  // cart is generated — this is the "as requested" view.
  const wizardPreview = useMemo(() => {
    const bySupplier = new Map<string, Map<string, { name: string; code: string; qty: number }>>();
    for (const r of selectedRequests) {
      for (const it of r.items) {
        const supplier = it.supplier || "Other";
        const key = it.code || it.item_name.toLowerCase();
        const items = bySupplier.get(supplier) ?? new Map();
        const prev = items.get(key);
        if (prev) prev.qty += it.qty;
        else items.set(key, { name: it.item_name, code: it.code || "", qty: it.qty });
        bySupplier.set(supplier, items);
      }
    }
    return [...bySupplier.entries()].map(([supplier, items]) => ({ supplier, items: [...items.values()] }));
  }, [selectedRequests]);

  // Hand a generated Gompels cart to the browser extension — it opens the
  // Gompels Quick Order tab and auto-fills the basket (see the extension's
  // auto-start). Fire-and-forget: no navigation, so the wizard stays open.
  const pushCartToExtension = (cart: PurchaseCart) => {
    const lines = cart.lines
      .filter((l) => (l.name || "").trim())
      .map((l) => ({ code: l.code || "", qty: l.qty, name: l.name, catalogue_item_id: l.catalogue_item_id || "" }));
    if (lines.length === 0) return;
    window.postMessage(
      { source: "bluenest-app", type: "BLUENEST_GOMPELS_ORDER", cart_id: cart.id, lines },
      window.location.origin,
    );
  };

  const wizardRunGenerate = async () => {
    const token = getAccessToken();
    if (!token || selected.size === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const carts = (await api.adminGenerateCart(token, [...selected])) as PurchaseCart[];
      setGeneratedCarts(carts || []);
      // Auto-hand the Gompels order to the extension → it opens the Gompels cart
      // and fills the products automatically. No email step; the admin reviews &
      // pays (or e-mails the basket) on Gompels itself.
      (carts || []).filter((c) => c.supplier === "Gompels").forEach(pushCartToExtension);
      setWizardStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate orders");
    } finally {
      setGenerating(false);
    }
  };

  const closeWizard = () => {
    setWizardStep("closed");
    setGeneratedCarts([]);
    setSelected(new Set());
  };

  return (
    <>
      <ProcurementTabs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Supply Requests</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500">{requests.length} total · {pendingCount} pending</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle active={view} onChange={setView} options={[{ key: "board", label: "Board", icon: Columns3 }, { key: "table", label: "Table", icon: Table2 }]} />
          <button
            type="button"
            onClick={() => setWizardStep("review")}
            disabled={selected.size === 0}
            title="Guided order creation — review the items, generate per-supplier orders, then place them"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className="h-4 w-4" />
            {`New order${selected.size ? ` (${selected.size})` : ""}`}
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
          <option value="approved">Approved</option>
          <option value="converted_to_po">On PO</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {view === "board" ? (
        <KanbanBoard<OrderRequest, OrderRequestStatus>
          columns={ORDER_REQUEST_LANES}
          items={filtered}
          statusOf={(r) => r.status}
          idOf={(r) => r.id}
          onDrop={(r, status) => changeStatus(r, status)}
          renderCard={(r) => {
            const next = ORDER_REQUEST_NEXT[r.status];
            const pr = priorityMeta(r.priority);
            const showPriority = r.priority && r.priority !== "normal";
            return (
              <KanbanCard
                accent={ORDER_REQUEST_STATUS_META[r.status]?.accent ?? "slate"}
                title={r.requested_by_name || r.requested_by_email || "Request"}
                href={`/admin/order-requests/${r.id}`}
                rightTop={showPriority ? <StageBadge label={pr.label} accent={pr.accent} withDot={false} /> : undefined}
                subtitle={`${fmtBranch(r.branch_slug)}${r.classroom ? ` · ${r.classroom}` : ""} · ${r.items.length} item${r.items.length !== 1 ? "s" : ""}`}
                meta={
                  <>
                    {r.ref && <span className="font-mono font-medium text-slate-500">{r.ref}</span>}
                    <span>{fmtDate(r.created_at)}</span>
                  </>
                }
                primary={next ? { label: `Mark ${ORDER_REQUEST_STATUS_META[next].label.toLowerCase()}`, onClick: () => changeStatus(r, next) } : undefined}
              />
            );
          }}
        />
      ) : (
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
                    <StageBadge label={ORDER_REQUEST_STATUS_META[r.status]?.label ?? r.status} accent={ORDER_REQUEST_STATUS_META[r.status]?.accent ?? "slate"} />
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
      )}

      {/* ── Guided New-order wizard ─────────────────────────────── */}
      {wizardStep !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-heading font-bold text-gray-900">
                  {wizardStep === "review" ? "Review order" : "Orders generated"}
                </h2>
                <p className="text-xs text-gray-500">
                  {wizardStep === "review"
                    ? `Step 1 of 2 · ${selected.size} request(s) selected`
                    : "Step 2 of 2 · place each order with its supplier"}
                </p>
              </div>
              <button type="button" onClick={closeWizard} aria-label="Close" className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {wizardStep === "review" && (
                <>
                  <p className="mb-4 text-sm text-gray-600">
                    These items will be aggregated and split into one order per supplier. Sourcing picks the
                    cheapest known supplier per item, so the final split may differ from the requested supplier.
                  </p>
                  <div className="space-y-4">
                    {wizardPreview.map((group) => (
                      <div key={group.supplier} className="rounded-lg border border-gray-200">
                        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {group.supplier} · {group.items.length} item(s)
                        </div>
                        <ul className="divide-y divide-gray-100 text-sm">
                          {group.items.map((it, i) => (
                            <li key={i} className="flex items-center justify-between px-4 py-2">
                              <span className="text-gray-800">
                                {it.name}
                                {it.code ? <span className="text-gray-400"> · {it.code}</span> : null}
                              </span>
                              <span className="text-gray-500">×{it.qty}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {wizardPreview.length === 0 && (
                      <p className="text-sm text-gray-400">No items in the selected requests.</p>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button type="button" onClick={closeWizard} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="button" onClick={wizardRunGenerate} disabled={generating || wizardPreview.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                      <Wand2 className="h-4 w-4" /> {generating ? "Generating…" : "Generate orders"}
                    </button>
                  </div>
                </>
              )}

              {wizardStep === "done" && (
                <>
                  <p className="mb-4 text-sm text-gray-600">
                    {generatedCarts.length} order(s) created as drafts. The Gompels order has been sent to the
                    browser extension — it opens your logged-in Gompels cart and fills the products automatically.
                    Review &amp; pay (or e-mail the basket) on Gompels; open an order here to track delivery.
                  </p>
                  <div className="space-y-2">
                    {generatedCarts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.supplier}</p>
                          <p className="text-xs text-gray-500">{c.lines.length} line(s) · {money(c.subtotal)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.supplier === "Gompels" && (
                            <button type="button" onClick={() => pushCartToExtension(c)} title="Re-send this order to the Gompels extension (if the cart didn't open or fill)" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                              <Zap className="h-3.5 w-3.5" /> Re-send to Gompels
                            </button>
                          )}
                          <Link href={`/admin/purchase-carts/${c.id}`} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                            Open
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => router.push("/admin/purchase-carts")} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Go to Purchase Orders
                    </button>
                    <button type="button" onClick={closeWizard} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
