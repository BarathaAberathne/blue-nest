"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, PackageCheck, ShoppingCart, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import StageBadge from "@/components/admin/ui/StageBadge";
import { PURCHASE_CART_STATUS_META, priorityMeta } from "@/lib/admin-status";
import type { AccentName } from "@/lib/admin-theme";
import type { PurchaseCart, PurchaseCartLine, PurchaseCartStatus } from "@/types";

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const poundsToPence = (s: string) => Math.round(parseFloat(s || "0") * 100) || 0;
const penceToPounds = (p: number) => (p / 100).toFixed(2);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
// yyyy-mm-dd for <input type=date>
const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

// Editable line — unit price held as £ string.
type LineDraft = Omit<PurchaseCartLine, "unit_price" | "line_total"> & { unit_price: string };

const STEPS = ["Review", "Place order", "Track", "Receive"];
const PLACED: PurchaseCartStatus[] = [
  "sent", "ordered", "placed", "tracking", "dispatched", "partially_received", "received", "completed",
];
const DONE: PurchaseCartStatus[] = ["received", "completed"];

export default function AdminPurchaseCartDetailClient({ id }: { id: string }) {
  const [cart, setCart] = useState<PurchaseCart | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [extDetected, setExtDetected] = useState(false);
  const [placedLocally, setPlacedLocally] = useState(false);
  const [learned, setLearned] = useState<Set<string>>(new Set());

  // Stepper + fulfillment/receive state.
  const [activeStep, setActiveStep] = useState(0);
  const [supplierRef, setSupplierRef] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [received, setReceived] = useState<number[]>([]);
  const [savingTrack, setSavingTrack] = useState(false);
  const [savingReceive, setSavingReceive] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const defaultStep = (status: PurchaseCartStatus) =>
    status === "draft"
      ? 0
      : status === "placed" || status === "ordered" || status === "sent" || status === "tracking" || status === "dispatched"
        ? 2
        : 3;

  const load = (c: PurchaseCart) => {
    setCart(c);
    setLines(c.lines.map((l) => ({ ...l, unit_price: penceToPounds(l.unit_price) })));
    setSupplierRef(c.supplier_order_ref ?? "");
    setTrackingNumber(c.tracking_number ?? "");
    setExpectedDate(toDateInput(c.expected_delivery_date));
    setReceived(c.lines.map((l) => l.qty_received ?? l.qty));
    setActiveStep(defaultStep(c.status));
  };

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated — please sign in as admin.");
      setLoading(false);
      return;
    }
    api.adminGetPurchaseCart(token, id)
      .then((data) => load(data as PurchaseCart))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load cart"))
      .finally(() => setLoading(false));
  }, [id]);

  // Detect the Blue Nest → Gompels extension via PING/PONG (robust against
  // framework hydration stripping a DOM marker).
  useEffect(() => {
    let detected = false;
    const onMsg = (e: MessageEvent) => {
      if (e.source === window && e.data?.source === "bluenest-ext" && e.data?.type === "BLUENEST_GOMPELS_PONG") {
        detected = true;
        setExtDetected(true);
      }
    };
    window.addEventListener("message", onMsg);
    let tries = 0;
    const ping = () => {
      if (detected) return;
      window.postMessage({ source: "bluenest-app", type: "BLUENEST_GOMPELS_PING" }, window.location.origin);
      if (tries++ < 10) setTimeout(ping, 400);
    };
    ping();
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const setLine = (idx: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + poundsToPence(l.unit_price) * l.qty, 0),
    [lines],
  );

  const unmatchedCount = lines.filter((l) => !(l.code ?? "").trim()).length;
  const hasUnmatched = unmatchedCount > 0;
  const status = cart?.status ?? "draft";
  const isPlaced = PLACED.includes(status);
  const isReceived = DONE.includes(status);
  // Once an order is placed — via email (status advances to ordered) OR the
  // Gompels push (status stays draft until the extension confirms server-side,
  // so we also track it locally) — both Track and Receive unlock. A draft order
  // only exposes Review + Place order. This fixes the bug where a Gompels-pushed
  // order left Track/Receive permanently disabled.
  const placed = isPlaced || placedLocally;
  const reached = placed ? 3 : 1;

  const payloadLines = (): PurchaseCartLine[] =>
    lines.map((l) => ({
      catalogue_item_id: l.catalogue_item_id,
      name: l.name,
      code: l.code,
      pack_size: l.pack_size,
      qty: l.qty,
      unit_price: poundsToPence(l.unit_price),
      line_total: poundsToPence(l.unit_price) * l.qty,
      matched: Boolean((l.code ?? "").trim()),
      qty_received: l.qty_received,
      source_request_ids: l.source_request_ids,
    }));

  const onSave = async () => {
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.adminUpdatePurchaseCart(token, id, {
        lines: payloadLines(),
      });
      load(updated as PurchaseCart);
      setNotice("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Hand the coded lines to the browser extension, which fills them into the
  // admin's logged-in Gompels cart. The extension opens/focuses the Gompels tab.
  const onAddToGompels = () => {
    // Send all lines. Coded lines add by code; lines without a code are searched
    // on Gompels by their description (cheapest match) by the extension.
    const gompelsLines = lines
      .filter((l) => (l.name || "").trim())
      .map((l) => ({ code: (l.code ?? "").trim(), qty: l.qty, name: l.name, catalogue_item_id: l.catalogue_item_id || "" }));
    if (gompelsLines.length === 0) {
      setError("This cart has no items.");
      return;
    }
    setError(null);
    setNotice(null);

    // Only claim success once the extension acknowledges receipt — avoids the
    // misleading "Sent" message when the extension isn't actually running here.
    let acked = false;
    const onAck = (e: MessageEvent) => {
      if (e.source === window && e.data?.source === "bluenest-ext" && e.data?.type === "BLUENEST_GOMPELS_ACK") {
        acked = true;
        window.removeEventListener("message", onAck);
        setPlacedLocally(true);
        setNotice(`Items sent to the Gompels extension. Open the Gompels tab and click “Fill cart now”, then review & pay there. Track and Receive are now unlocked.`);
      }
    };
    window.addEventListener("message", onAck);
    window.postMessage(
      { source: "bluenest-app", type: "BLUENEST_GOMPELS_ORDER", cart_id: id, lines: gompelsLines },
      window.location.origin,
    );
    setTimeout(() => {
      if (acked) return;
      window.removeEventListener("message", onAck);
      setError(
        "The Blue Nest → Gompels extension didn’t respond. Install it (chrome://extensions → Load unpacked → gompels-extension/), then reload this page and try again.",
      );
    }, 1500);
  };

  // Accept a search auto-pick → the catalogue "learns" the Gompels code so the
  // item resolves directly next time.
  const onAccept = async (res: { name: string; resolved_code?: string }) => {
    const token = getAccessToken();
    if (!token || !res.resolved_code) return;
    try {
      await api.adminLearnCatalogue(token, { name: res.name, code: res.resolved_code });
      setLearned((prev) => new Set(prev).add(res.name + res.resolved_code));
      setNotice(`Saved code ${res.resolved_code} for “${res.name}” to the catalogue.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to catalogue");
    }
  };

  // Save the supplier order ref + expected delivery date (Track step).
  const onSaveTrack = async () => {
    const token = getAccessToken();
    if (!token) return;
    setSavingTrack(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.adminUpdateCartFulfillment(token, id, {
        supplier_order_ref: supplierRef.trim(),
        tracking_number: trackingNumber.trim(),
        expected_delivery_date: expectedDate ? new Date(expectedDate).toISOString() : null,
      });
      load(updated as PurchaseCart);
      setNotice("Delivery details saved — staff can now see the expected date.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save delivery details");
    } finally {
      setSavingTrack(false);
    }
  };

  // Advance the order through the in-transit lifecycle (tracking → dispatched →
  // completed) without a receive — a lightweight status move.
  const onSetStatus = async (next: PurchaseCartStatus) => {
    const token = getAccessToken();
    if (!token) return;
    setSavingStatus(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.adminUpdatePurchaseCartStatus(token, id, next);
      load(updated as PurchaseCart);
      setNotice(`Order marked ${PURCHASE_CART_STATUS_META[next]?.label.toLowerCase() ?? next}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order status");
    } finally {
      setSavingStatus(false);
    }
  };

  // Save per-line received quantities (Receive step).
  const onSaveReceive = async () => {
    const token = getAccessToken();
    if (!token || !cart) return;
    setSavingReceive(true);
    setError(null);
    setNotice(null);
    try {
      const items = cart.lines.map((l, i) => ({
        code: l.code ?? "",
        name: l.name,
        qty_received: received[i] ?? 0,
      }));
      const updated = await api.adminReceiveCart(token, id, items);
      load(updated as PurchaseCart);
      setNotice("Goods received recorded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record receipt");
    } finally {
      setSavingReceive(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (error && !cart) return <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>;
  if (!cart) return <p className="text-sm text-gray-400">Cart not found.</p>;

  const receivedTotal = cart.lines.reduce((s, l) => s + (l.qty_received ?? 0), 0);
  const orderedTotal = cart.lines.reduce((s, l) => s + l.qty, 0);

  return (
    <>
      <Link href="/admin/purchase-carts" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to purchase orders
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-2xl font-extrabold tracking-tight text-slate-900">{cart.ref || `PO-${cart.id.slice(0, 8).toUpperCase()}`}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            {cart.supplier}
            {cart.branch_slug ? ` · ${cart.branch_slug.replace(/[-_]/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}` : ""}
            {cart.classroom ? ` · ${cart.classroom}` : ""}
            {" · "}{lines.length} line{lines.length !== 1 ? "s" : ""} · {money(subtotal)}
            {cart.expected_delivery_date ? ` · expected ${fmtDate(cart.expected_delivery_date)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cart.priority && cart.priority !== "normal" && (
            <StageBadge label={priorityMeta(cart.priority).label} accent={priorityMeta(cart.priority).accent} />
          )}
          <StageBadge label={PURCHASE_CART_STATUS_META[cart.status]?.label ?? cart.status} accent={PURCHASE_CART_STATUS_META[cart.status]?.accent ?? "slate"} />
        </div>
      </div>

      {/* ── Stepper ───────────────────────────────────────────── */}
      <nav className="mb-6 flex items-center">
        {STEPS.map((label, i) => {
          const done = i < reached;
          const active = i === activeStep;
          const clickable = i <= reached;
          return (
            <div key={label} className="flex items-center">
              <button
                type="button"
                disabled={!clickable}
                title={!clickable ? (i >= 2 && !placed ? "Place the order first" : "Complete the previous step first") : undefined}
                onClick={() => clickable && setActiveStep(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-600 text-white"
                    : clickable
                      ? "text-teal-700 hover:bg-teal-50"
                      : "text-gray-300 cursor-not-allowed"
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  active ? "bg-white text-teal-700" : done ? "bg-teal-600 text-white" : clickable ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"
                }`}>
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && <span className={`mx-1 h-px w-6 ${i < reached ? "bg-teal-400" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </nav>

      {error && <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
      {notice && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">{notice}</p>}

      {/* ── Step 0: Review ────────────────────────────────────── */}
      {activeStep === 0 && (
        <>
          {hasUnmatched && !isPlaced && (
            <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              Some lines have no supplier code — add a code (and price) before placing the order (Gompels
              searches by description for any line without a code).
            </p>
          )}

          <div className="card overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  {["Item", "Code", "Pack", "Qty", "Unit £", "Line", ""].map((h) => (
                    <th key={h} className="px-3 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((l, idx) => (
                  <tr key={idx} className={(l.code ?? "").trim() ? "" : "bg-amber-50/50"}>
                    <td className="px-3 py-2 text-gray-900">{l.name}</td>
                    <td className="px-3 py-2">
                      <input
                        value={l.code}
                        onChange={(e) => setLine(idx, { code: e.target.value })}
                        disabled={isPlaced}
                        placeholder="code"
                        className="w-24 rounded border border-gray-200 px-2 py-1 text-xs disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{l.pack_size || "—"}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={l.qty}
                        onChange={(e) => setLine(idx, { qty: Number(e.target.value) })}
                        disabled={isPlaced}
                        className="w-16 rounded border border-gray-200 px-2 py-1 text-xs disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={l.unit_price}
                        onChange={(e) => setLine(idx, { unit_price: e.target.value })}
                        disabled={isPlaced}
                        className="w-20 rounded border border-gray-200 px-2 py-1 text-xs disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-700">{money(poundsToPence(l.unit_price) * l.qty)}</td>
                    <td className="px-3 py-2">
                      {!(l.code ?? "").trim() && <span className="text-xs text-amber-600">needs code</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isPlaced ? (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onSave} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={() => setActiveStep(1)} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                Next: place order →
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">This order has been placed — lines are locked.</p>
          )}
        </>
      )}

      {/* ── Step 1: Place order ───────────────────────────────── */}
      {activeStep === 1 && (
        <div className="card p-5">
          {isPlaced ? (
            <div className="space-y-1">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-green-700">
                <Check className="h-4 w-4" /> Order placed
              </p>
              <p className="text-sm text-gray-500">
                Pushed to the Gompels cart
                {cart.sent_at ? ` · ${new Date(cart.sent_at).toLocaleString("en-GB")}` : ""}
              </p>
              <button type="button" onClick={() => setActiveStep(2)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
                Next: track delivery →
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Place the {cart.supplier}{" "}
                order by pushing it straight into your logged-in Gompels cart with the browser extension. It
                opens the Gompels basket and fills the products automatically — then review &amp; pay (or
                e-mail the basket) on Gompels.
              </p>
              {/* Pre-push review: how the lines will resolve + estimated value. */}
              <div className="mb-4 grid max-w-md grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-lg font-bold text-slate-900">{lines.length - unmatchedCount}</p><p className="text-xs text-slate-500">matched by code</p></div>
                <div className="rounded-lg bg-amber-50 px-3 py-2"><p className="text-lg font-bold text-amber-700">{unmatchedCount}</p><p className="text-xs text-amber-600">searched by name</p></div>
                <div className="rounded-lg bg-teal-50 px-3 py-2"><p className="text-lg font-bold text-teal-700">{money(subtotal)}</p><p className="text-xs text-teal-600">est. value</p></div>
              </div>
              {cart.supplier === "Gompels" ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={onAddToGompels} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                      <ShoppingCart className="h-4 w-4" /> Send to Gompels cart
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    {extDetected
                      ? "Blue Nest → Gompels extension detected ✓ — "
                      : "Needs the Blue Nest → Gompels browser extension — "}
                    items are added to your logged-in Gompels cart (lines without a code are searched by
                    description for the cheapest match), then it opens the Gompels basket to review &amp; pay
                    or e-mail the basket.
                  </p>
                </>
              ) : (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  {cart.supplier}{" "}
                  has no automated ordering — place this order manually with the supplier (use the buy-list
                  CSV), then advance it through Track / Receive as it arrives.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Step 2: Track ─────────────────────────────────────── */}
      {activeStep === 2 && (
        <div className="space-y-4">
          <div className="card p-5">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              <Truck className="h-4 w-4 text-teal-600" /> Delivery tracking
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Supplier order ref</label>
                <input
                  value={supplierRef}
                  onChange={(e) => setSupplierRef(e.target.value)}
                  placeholder="e.g. Gompels order #"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Tracking number</label>
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="carrier tracking #"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Expected delivery date</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-400">Shown to the staff who requested these items.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={onSaveTrack} disabled={savingTrack} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {savingTrack ? "Saving…" : "Save delivery details"}
              </button>
              {!isReceived && (
                <button type="button" onClick={() => setActiveStep(3)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Next: receive goods →
                </button>
              )}
            </div>
            {/* Lifecycle status — move the order through in-transit stages. */}
            {!isReceived && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Delivery stage</p>
                <div className="flex flex-wrap gap-2">
                  {(["placed", "tracking", "dispatched"] as PurchaseCartStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSetStatus(s)}
                      disabled={savingStatus || cart.status === s}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium border transition-colors ${
                        cart.status === s ? "border-teal-600 bg-teal-600 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      } disabled:opacity-60`}
                    >
                      {PURCHASE_CART_STATUS_META[s]?.label ?? s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Gompels fill results (from the extension push). */}
          {cart.export_results && cart.export_results.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100">
                Gompels fill results
                {cart.supplier_order_ref ? ` · ref ${cart.supplier_order_ref}` : ""}
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {cart.export_results.map((res, i) => {
                    const key = res.name + (res.resolved_code ?? "");
                    const isLearned = learned.has(key);
                    return (
                      <tr key={i}>
                        <td className="px-4 py-2 text-gray-900">
                          {res.name}
                          {res.searched && res.picked_name && (
                            <span className="block text-xs text-gray-400">
                              {res.substituted ? "unavailable → substituted " : "→ "}
                              {res.picked_name} (code {res.resolved_code})
                            </span>
                          )}
                          {res.status === "not_found" && (
                            <span className="block text-xs text-amber-600">
                              no match found — add manually in Gompels
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <StageBadge
                            label={res.substituted && res.status === "added" ? "substituted" : res.status}
                            accent={(res.status === "added" ? (res.substituted ? "amber" : "green") : res.status === "not_found" ? "amber" : "slate") as AccentName}
                            withDot={false}
                          />
                          {res.status === "added" && (res.qty ?? 0) > 0 && (
                            <span className="block text-xs text-gray-400">qty {res.qty}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {res.searched && res.resolved_code && res.status === "added" && (
                            isLearned ? (
                              <span className="text-xs text-green-600">saved ✓</span>
                            ) : (
                              <button type="button" onClick={() => onAccept(res)} className="text-xs font-medium text-teal-600 hover:underline">
                                Accept (save code)
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Receive ───────────────────────────────────── */}
      {activeStep === 3 && (
        <div className="card p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 mb-1">
            <PackageCheck className="h-4 w-4 text-teal-600" /> Receive goods
          </p>
          {isReceived ? (
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-green-700">
                ✓ Fully received{cart.delivered_at ? ` on ${fmtDate(cart.delivered_at)}` : ""}
                {cart.status === "completed" ? " · order completed" : ""}.
              </p>
              {cart.status === "received" && (
                <button type="button" onClick={() => onSetStatus("completed")} disabled={savingStatus} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                  <Check className="h-3.5 w-3.5" /> Mark completed
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">
              Enter how many of each line actually arrived. {receivedTotal}/{orderedTotal} received so far.
              Partial receipts are saved — come back when the rest arrives.
            </p>
          )}
          <div className="overflow-hidden rounded-lg border border-gray-100 mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-left font-medium">Code</th>
                  <th className="px-3 py-2 text-right font-medium">Ordered</th>
                  <th className="px-3 py-2 text-right font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cart.lines.map((l, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-gray-900">{l.name}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{l.code || "—"}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{l.qty}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={l.qty}
                        value={received[idx] ?? 0}
                        onChange={(e) =>
                          setReceived((prev) => prev.map((v, i) => (i === idx ? Number(e.target.value) : v)))
                        }
                        className="w-20 rounded border border-gray-200 px-2 py-1 text-xs text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={onSaveReceive} disabled={savingReceive} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            <PackageCheck className="h-4 w-4" /> {savingReceive ? "Saving…" : "Save receipt"}
          </button>
        </div>
      )}
    </>
  );
}
