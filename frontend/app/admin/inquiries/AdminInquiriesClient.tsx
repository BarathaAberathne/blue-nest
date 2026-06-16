"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Badge from "@/components/ui/Badge";
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

function fmtBranch(branch: string) {
  if (!branch) return "—";
  return branch
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Build a CSV file from the given inquiries and trigger a download. */
function exportCsv(rows: Enquiry[]) {
  const headers = ["Date", "Name", "Email", "Phone", "Branch", "Child Age", "Enquiry Type", "Status", "Message"];
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((e) =>
    [
      new Date(e.created_at).toISOString(),
      e.name,
      e.email,
      e.phone,
      fmtBranch(e.branch),
      e.child_age,
      e.enquiry_type,
      STATUS_LABEL[e.status] ?? e.status,
      e.message,
    ]
      .map((v) => escape(v as string))
      .join(","),
  );
  const csv = [headers.map(escape).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminInquiriesClient() {
  const [inquiries, setInquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated — please sign in as admin.");
      setLoading(false);
      return;
    }
    api.adminGetEnquiries(token)
      .then((data) => setInquiries(Array.isArray(data) ? (data as Enquiry[]) : []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load inquiries"))
      .finally(() => setLoading(false));
  }, []);

  // Filter option lists derived from the loaded data.
  const branchOptions = useMemo(
    () => [...new Set(inquiries.map((e) => e.branch).filter(Boolean))].sort(),
    [inquiries],
  );
  const typeOptions = useMemo(
    () => [...new Set(inquiries.map((e) => e.enquiry_type).filter(Boolean))].sort(),
    [inquiries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries
      .filter((e) => (branch ? e.branch === branch : true))
      .filter((e) => (type ? e.enquiry_type === type : true))
      .filter((e) => (status ? e.status === status : true))
      .filter((e) =>
        q
          ? [e.name, e.email, e.message].some((f) => (f ?? "").toLowerCase().includes(q))
          : true,
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [inquiries, search, branch, type, status]);

  const newCount = inquiries.filter((e) => e.status === "new").length;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Inquiries</h1>
          {!loading && !error && (
            <p className="text-sm text-gray-500">
              {inquiries.length} total · {newCount} new
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, message…"
          className="min-w-[14rem] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Search inquiries"
        />
        <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Filter by branch"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All branches</option>
          {branchOptions.map((b) => <option key={b} value={b}>{fmtBranch(b)}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by enquiry type"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="responded">Responded</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
            <tr>
              {["Date", "Name", "Type", "Branch", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  {inquiries.length === 0 ? "No inquiries yet." : "No inquiries match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className={`hover:bg-gray-50 ${e.status === "new" ? "font-medium" : ""}`}>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(e.created_at)}</td>
                  <td className="px-4 py-3 text-gray-900">
                    {e.name}
                    <span className="block text-xs font-normal text-gray-400">{e.email}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{e.enquiry_type || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{fmtBranch(e.branch)}</td>
                  <td className="px-4 py-3">
                    <Badge label={STATUS_LABEL[e.status] ?? e.status} variant={STATUS_VARIANT[e.status] ?? "gray"} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/inquiries/${e.id}`} className="text-teal-600 hover:underline text-xs font-medium">
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
