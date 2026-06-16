"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import type { Enquiry, EnquiryStatus } from "@/types";

const STATUS_VARIANT: Record<EnquiryStatus, "blue" | "amber" | "green"> = {
  new: "blue",
  read: "amber",
  responded: "green",
};

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: "New",
  read: "Read",
  responded: "Responded",
};

const ALL_STATUSES: EnquiryStatus[] = ["new", "read", "responded"];

function fmtBranch(branch: string) {
  if (!branch) return "—";
  return branch.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(n?: number) {
  return typeof n === "number" ? `£${n.toFixed(2)}` : "—";
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex gap-2">
      <dt className="text-gray-500 w-32 shrink-0">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}

export default function AdminInquiryDetailClient({ id }: { id: string }) {
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<EnquiryStatus>("new");
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const autoReadDone = useRef(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated.");
      setLoading(false);
      return;
    }
    api.adminGetEnquiry(token, id)
      .then((data) => {
        const e = data as Enquiry;
        setEnquiry(e);
        setNewStatus(e.status);
        // Auto-mark a brand-new inquiry as "read" once it's opened.
        if (e.status === "new" && !autoReadDone.current) {
          autoReadDone.current = true;
          api.adminUpdateEnquiryStatus(token, e.id, "read")
            .then(() => {
              setEnquiry((prev) => (prev ? { ...prev, status: "read" } : prev));
              setNewStatus("read");
            })
            .catch(() => { /* non-blocking */ });
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load inquiry"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatus = async () => {
    const token = getAccessToken();
    if (!token || !enquiry) return;
    setUpdating(true);
    setUpdateMsg(null);
    try {
      await api.adminUpdateEnquiryStatus(token, enquiry.id, newStatus);
      setEnquiry((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setUpdateMsg("Status updated successfully.");
    } catch (err) {
      setUpdateMsg(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        {error ?? "Inquiry not found."}
      </p>
    );
  }

  const fq = enquiry.fee_quote;
  const app = enquiry.application;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Link href="/admin/inquiries" className="text-sm text-gray-500 hover:text-gray-700">
          ← Inquiries
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-heading font-bold text-gray-900">{enquiry.name}</h1>
        <Badge label={STATUS_LABEL[enquiry.status] ?? enquiry.status} variant={STATUS_VARIANT[enquiry.status] ?? "gray"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Enquirer details */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Enquirer</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Name" value={enquiry.name} />
              <Row label="Email" value={<a href={`mailto:${enquiry.email}`} className="text-teal-600 hover:underline">{enquiry.email}</a>} />
              <Row label="Phone" value={enquiry.phone ? <a href={`tel:${enquiry.phone}`} className="text-teal-600 hover:underline">{enquiry.phone}</a> : undefined} />
              <Row label="Branch" value={fmtBranch(enquiry.branch)} />
              <Row label="Child's age" value={enquiry.child_age} />
              <Row label="Enquiry type" value={enquiry.enquiry_type} />
              <Row label="Received" value={fmtDate(enquiry.created_at)} />
            </dl>
          </Card>

          {/* Message */}
          {enquiry.message && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Message</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{enquiry.message}</p>
            </Card>
          )}

          {/* Fee quote */}
          {fq && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Fee Quote</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <Row label="Branch" value={fmtBranch(fq.branch ?? "")} />
                <Row label="Age group" value={fq.age_group} />
                <Row label="Session" value={fq.session} />
                <Row label="Days/week" value={fq.days ? String(fq.days) : undefined} />
                <Row label="Funding" value={fq.funding} />
                <Row label="Year weeks" value={fq.year_weeks ? String(fq.year_weeks) : undefined} />
                <Row label="Early bird" value={fq.early_bird ? "Yes" : undefined} />
                <Row label="Discount" value={fq.discount ? `${fq.discount} (−${fmtMoney(fq.discount_amount)}/wk)` : undefined} />
                <Row label="Gross weekly" value={fmtMoney(fq.gross_weekly)} />
                <Row label="Net weekly" value={fmtMoney(fq.net_weekly)} />
                <Row label="Net monthly" value={fmtMoney(fq.net_monthly)} />
              </dl>
            </Card>
          )}

          {/* Application */}
          {app && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Application</h2>
              <dl className="space-y-1.5 text-sm">
                <Row label="Child" value={app.child?.name} />
                <Row label="Date of birth" value={app.child?.dob} />
                <Row label="Gender" value={app.child?.gender ?? undefined} />
                <Row label="Parent" value={app.parent?.name} />
                <Row label="Parent email" value={app.parent?.email} />
                <Row label="Parent phone" value={app.parent?.phone} />
                <Row label="Branch" value={fmtBranch(app.branch ?? "")} />
                <Row label="Settling-in" value={app.settling_in} />
                <Row label="Waiting list" value={app.waiting_list ? "Yes" : "No"} />
              </dl>

              {app.sessions && app.sessions.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Requested sessions</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <tr>
                        {["Day", "Session", "Time"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {app.sessions.map((s, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-800 capitalize">{s.day}</td>
                          <td className="px-3 py-2 text-gray-700">{s.label || s.type}</td>
                          <td className="px-3 py-2 text-gray-500">{s.time || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {app.signature_data_url?.startsWith("data:image") && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Signature</h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={app.signature_data_url}
                    alt={`Signature from ${app.parent?.name ?? enquiry.name}`}
                    className="max-h-32 rounded-lg border border-gray-200 bg-white p-2"
                  />
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar: status */}
        <div className="space-y-5">
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Status</h2>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as EnquiryStatus)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void handleUpdateStatus()}
              disabled={updating || newStatus === enquiry.status}
              className="btn-primary w-full mt-3 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? "Updating…" : "Update Status"}
            </button>
            {updateMsg && (
              <p className={`mt-2 text-xs ${updateMsg.includes("success") ? "text-green-600" : "text-red-500"}`}>
                {updateMsg}
              </p>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Quick actions</h2>
            <a
              href={`mailto:${enquiry.email}?subject=${encodeURIComponent("Re: your enquiry to Blue Nest Montessori")}`}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reply by email
            </a>
          </Card>
        </div>
      </div>
    </>
  );
}
