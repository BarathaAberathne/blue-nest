"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpDown, CheckCircle2, Download, Flame, LayoutDashboard, StickyNote } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import { fmtBranch, fmtDateShort, isFollowUpOverdue, statusLabel } from "@/lib/enquiry";
import type { Enquiry, EnquiryAssignee, EnquiryStatus } from "@/types";
import { ENQUIRY_STATUSES } from "@/types";

// Quick status-group tabs across the top of the list.
const TAB_GROUPS: { key: string; label: string; match: (s: EnquiryStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "new", label: "New", match: (s) => s === "new" },
  { key: "contacted", label: "Contacted", match: (s) => s === "contacted" || s === "awaiting_reply" },
  { key: "booked", label: "Booked Visit", match: (s) => s === "booked_visit" || s === "visit_completed" },
  { key: "registered", label: "Registered", match: (s) => s === "registered" },
  { key: "lost", label: "Cancelled/Lost", match: (s) => s === "cancelled" || s === "lost" || s === "spam" },
];

type SortKey = "created_at" | "name" | "branch" | "enquiry_type" | "status" | "assigned_to" | "follow_up_date";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Build a CSV file from the given inquiries and trigger a download. */
function exportCsv(rows: Enquiry[]) {
  const headers = [
    "Date", "Name", "Email", "Phone", "Branch", "Child Age", "Enquiry Type",
    "Status", "Priority", "Assigned To", "Follow-up Date", "Registered", "Message",
  ];
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
      statusLabel(e.status),
      e.priority ?? "",
      e.assigned_to_name ?? "",
      e.follow_up_date ? fmtDateShort(e.follow_up_date) : "",
      e.registration?.is_registered ? "Yes" : "No",
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
  const [assignees, setAssignees] = useState<EnquiryAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [assigned, setAssigned] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated — please sign in as admin.");
      setLoading(false);
      return;
    }
    api
      .adminGetEnquiries(token)
      .then((data) => setInquiries(Array.isArray(data) ? data : []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load inquiries"))
      .finally(() => setLoading(false));
    api.adminGetEnquiryAssignees(token).then(setAssignees).catch(() => { /* non-blocking */ });
  }, []);

  // Dedupe branches case-insensitively — seed/form data stores mixed casing
  // ("harrow" vs "Harrow"); collapse them to one option keyed by lowercase.
  const branchOptions = useMemo(
    () => [...new Set(inquiries.map((e) => e.branch).filter(Boolean).map((b) => b.toLowerCase()))].sort(),
    [inquiries],
  );
  const typeOptions = useMemo(
    () => [...new Set(inquiries.map((e) => e.enquiry_type).filter(Boolean))].sort(),
    [inquiries],
  );

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const grp of TAB_GROUPS) counts[grp.key] = inquiries.filter((e) => grp.match(e.status)).length;
    return counts;
  }, [inquiries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const grp = TAB_GROUPS.find((g) => g.key === activeTab);
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null;

    const rows = inquiries
      .filter((e) => (grp ? grp.match(e.status) : true))
      .filter((e) => (branch ? e.branch.toLowerCase() === branch : true))
      .filter((e) => (type ? e.enquiry_type === type : true))
      .filter((e) => (status ? e.status === status : true))
      .filter((e) => (assigned ? e.assigned_to === assigned : true))
      .filter((e) => (overdueOnly ? isFollowUpOverdue(e.status, e.follow_up_date) : true))
      .filter((e) => {
        const ts = new Date(e.created_at).getTime();
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
        return true;
      })
      .filter((e) =>
        q ? [e.name, e.email, e.message, e.assigned_to_name].some((f) => (f ?? "").toLowerCase().includes(q)) : true,
      );

    const dir = sortDir === "asc" ? 1 : -1;
    const val = (e: Enquiry): string | number => {
      switch (sortKey) {
        case "name": return e.name.toLowerCase();
        case "branch": return e.branch;
        case "enquiry_type": return e.enquiry_type;
        case "status": return e.status;
        case "assigned_to": return (e.assigned_to_name ?? "").toLowerCase();
        case "follow_up_date": return e.follow_up_date ? new Date(e.follow_up_date).getTime() : 0;
        default: return new Date(e.created_at).getTime();
      }
    };
    return [...rows].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [inquiries, activeTab, search, branch, type, status, assigned, overdueOnly, from, to, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "branch" || key === "enquiry_type" ? "asc" : "desc");
    }
  };

  const tabs: TabItem[] = TAB_GROUPS.map((g) => ({ key: g.key, label: g.label, badge: tabCounts[g.key] }));

  // Renders a sortable column header. A plain function (not a component) so it
  // doesn't get remounted each render.
  const sortTh = (label: string, k: SortKey) => (
    <th key={k} className="px-4 py-3 text-left font-medium">
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-slate-700">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "text-teal-600" : "text-slate-300"}`} />
      </button>
    </th>
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Inquiries</h1>
          {!loading && !error && (
            <p className="text-sm text-slate-500">
              {inquiries.length} total · {tabCounts.new ?? 0} new
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/inquiries/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} className="mb-4" />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, message…"
          className="min-w-[14rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Search inquiries"
        />
        <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Filter by branch"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All branches</option>
          {branchOptions.map((b) => <option key={b} value={b}>{fmtBranch(b)}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by enquiry type"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All statuses</option>
          {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select value={assigned} onChange={(e) => setAssigned(e.target.value)} aria-label="Filter by assigned staff"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">Anyone</option>
          {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <span className="text-slate-400">–</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="accent-teal-600" />
          Overdue
        </label>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              {sortTh("Date", "created_at")}
              {sortTh("Name", "name")}
              {sortTh("Type", "enquiry_type")}
              {sortTh("Branch", "branch")}
              {sortTh("Status", "status")}
              {sortTh("Assigned", "assigned_to")}
              {sortTh("Follow-up", "follow_up_date")}
              <th className="px-4 py-3 text-left font-medium">Flags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 w-20 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                  {inquiries.length === 0 ? "No inquiries yet." : "No inquiries match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((e) => {
                const overdue = isFollowUpOverdue(e.status, e.follow_up_date);
                const registered = e.registration?.is_registered || e.status === "registered";
                const noNotes = (e.notes?.length ?? 0) === 0;
                return (
                  <tr key={e.id} className={`hover:bg-slate-50 ${e.status === "new" ? "font-medium" : ""}`}>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(e.created_at)}</td>
                    <td className="px-4 py-3 text-slate-900">
                      {e.name}
                      <span className="block text-xs font-normal text-slate-400">{e.email}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{e.enquiry_type || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtBranch(e.branch)}</td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{e.assigned_to_name || <span className="text-slate-300">—</span>}</td>
                    <td className={`px-4 py-3 ${overdue ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                      {e.follow_up_date ? fmtDateShort(e.follow_up_date) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {overdue && <AlertTriangle className="h-4 w-4 text-rose-500" aria-label="Overdue follow-up" />}
                        {e.priority === "high" && <Flame className="h-4 w-4 text-orange-500" aria-label="High priority" />}
                        {registered && <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Registered" />}
                        {noNotes && <StickyNote className="h-4 w-4 text-slate-300" aria-label="No notes yet" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/inquiries/${e.id}`} className="text-xs font-medium text-teal-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
