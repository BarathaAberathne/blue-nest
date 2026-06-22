"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Badge from "@/components/ui/Badge";
import type { PurchaseCart, PurchaseCartLine, PurchaseCartStatus } from "@/types";

const STATUS_VARIANT: Record<PurchaseCartStatus, "amber" | "green" | "gray"> = {
  draft: "amber",
  sent: "green",
  failed: "gray",
};

const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const poundsToPence = (s: string) => Math.round(parseFloat(s || "0") * 100) || 0;
const penceToPounds = (p: number) => (p / 100).toFixed(2);

// Editable line — unit price held as £ string.
type LineDraft = Omit<PurchaseCartLine, "unit_price" | "line_total"> & { unit_price: string };

export default function AdminPurchaseCartDetailClient({ id }: { id: string }) {
  const [cart, setCart] = useState<PurchaseCart | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = (c: PurchaseCart) => {
    setCart(c);
    setRecipient(c.recipient_email ?? "");
    setLines(c.lines.map((l) => ({ ...l, unit_price: penceToPounds(l.unit_price) })));
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

  const setLine = (idx: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + poundsToPence(l.unit_price) * l.qty, 0),
    [lines],
  );

  const hasUnmatched = lines.some((l) => !(l.code ?? "").trim());
  const isSent = cart?.status === "sent";

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
        recipient_email: recipient,
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

  const onSend = async () => {
    const token = getAccessToken();
    if (!token) return;
    if (!recipient.trim()) {
      setError("Set a recipient email before sending.");
      return;
    }
    if (!window.confirm(`Email this ${cart?.supplier} order to ${recipient}?`)) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      // Persist any edits first, then send.
      await api.adminUpdatePurchaseCart(token, id, { recipient_email: recipient, lines: payloadLines() });
      const sent = await api.adminSendPurchaseCart(token, id, recipient);
      load(sent as PurchaseCart);
      setNotice("Order emailed to the supplier.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (error && !cart) return <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>;
  if (!cart) return <p className="text-sm text-gray-400">Cart not found.</p>;

  return (
    <>
      <Link href="/admin/purchase-carts" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to generated carts
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">{cart.supplier} order</h1>
          <p className="text-sm text-gray-500">Subtotal {money(subtotal)} · {lines.length} lines</p>
        </div>
        <Badge label={cart.status} variant={STATUS_VARIANT[cart.status] ?? "gray"} />
      </div>

      {error && <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
      {notice && <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">{notice}</p>}
      {hasUnmatched && !isSent && (
        <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Some lines have no supplier code — add a code (and price) before sending.
        </p>
      )}

      {/* Recipient */}
      <div className="card p-4 mb-4">
        <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Recipient email</label>
        <input
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          disabled={isSent}
          placeholder="supplier@example.com"
          className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
        />
      </div>

      {/* Lines */}
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
                    disabled={isSent}
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
                    disabled={isSent}
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
                    disabled={isSent}
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

      {!isSent && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={onSave} disabled={saving} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={onSend} disabled={sending || hasUnmatched} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            <Send className="h-4 w-4" /> {sending ? "Sending…" : "Send order"}
          </button>
        </div>
      )}

      {isSent && cart.sent_at && (
        <p className="text-sm text-gray-500">Sent {new Date(cart.sent_at).toLocaleString("en-GB")} to {cart.recipient_email}.</p>
      )}
    </>
  );
}
