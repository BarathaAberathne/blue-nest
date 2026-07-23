"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Columns3, Download, LayoutDashboard, ListChecks, Plus, Search, SlidersHorizontal, Table2 } from "lucide-react";
import { api, type EnquiryListParams } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import Modal from "@/components/ui/Modal";
import PipelineBoard from "@/components/admin/inquiries/PipelineBoard";
import EnquiryTable, { type SortKey } from "@/components/admin/inquiries/EnquiryTable";
import EnquiryCard from "@/components/admin/inquiries/EnquiryCard";
import PipelineSummary, { type TaskKind } from "@/components/admin/inquiries/PipelineSummary";
import NoteBox from "@/components/admin/inquiries/NoteBox";
import {
  PRIORITY_META,
  fmtBranch,
  fmtDateShort,
  isFollowUpOverdue,
  isTerminalStatus,
  statusLabel,
} from "@/lib/enquiry";
import type { Enquiry, EnquiryAssignee, EnquiryBulkAction, EnquiryPriority, EnquiryStatus, EnquiryTasks } from "@/types";
import { ENQUIRY_STATUSES } from "@/types";

type View = "pipeline" | "table" | "followup";
type Toast = { kind: "success" | "error"; msg: string };

const BRANCH_OPTIONS = ["harrow", "pinner", "borehamwood", "pinner-green", "northwood"];
const TYPE_OPTIONS = ["Arrange a visit", "Fees and availability", "Application form", "General enquiry"];
const PRIORITIES: EnquiryPriority[] = ["low", "medium", "high"];

// Channels a manually-logged enquiry can arrive through (off-website).
const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "phone", label: "Phone call" },
  { value: "walk_in", label: "Walk-in" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social media" },
  { value: "event", label: "Event / open day" },
  { value: "other", label: "Other" },
];
const EMPTY_CREATE = { name: "", email: "", phone: "", branch: "", child_age: "", enquiry_type: "", source: "phone", priority: "medium", assigned_to: "", message: "", note: "" };

// Parsed as UTC midnight (note the "Z") so the stored instant's calendar date
// always matches what the user typed, regardless of the browser's local
// timezone — matches toDateInput's read-back, which also reads the UTC date.
function dateInputToISO(v: string): string | null {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Build a CSV from the given enquiries and trigger a download. */
function exportCsv(rows: Enquiry[]) {
  const headers = ["Date", "Name", "Email", "Phone", "Branch", "Child Age", "Enquiry Type", "Status", "Priority", "Assigned To", "Follow-up Date", "Registered", "Message"];
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((e) =>
    [
      new Date(e.created_at).toISOString(), e.name, e.email, e.phone, fmtBranch(e.branch), e.child_age,
      e.enquiry_type, statusLabel(e.status), e.priority ?? "", e.assigned_to_name ?? "",
      e.follow_up_date ? fmtDateShort(e.follow_up_date) : "", e.registration?.is_registered ? "Yes" : "No", e.message,
    ].map((v) => esc(v as string)).join(","),
  );
  const csv = [headers.map(esc).join(","), ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminInquiriesClient() {
  const router = useRouter();
  const [view, setView] = useState<View>("pipeline");
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [assignees, setAssignees] = useState<EnquiryAssignee[]>([]);
  const [tasks, setTasks] = useState<EnquiryTasks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [assigned, setAssigned] = useState("");
  const [priority, setPriority] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);

  // Table-only state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Action modals
  const [noteTarget, setNoteTarget] = useState<Enquiry | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [followTarget, setFollowTarget] = useState<Enquiry | null>(null);
  const [followDraft, setFollowDraft] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<{ e: Enquiry; status: EnquiryStatus } | null>(null);
  const [bulkAction, setBulkAction] = useState<EnquiryBulkAction | null>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [busy, setBusy] = useState(false);

  // Manually log an off-website enquiry.
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE });
  const [creating, setCreating] = useState(false);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const submitCreate = async () => {
    const token = getAccessToken();
    if (!token) return;
    const f = createForm;
    if (!f.name.trim()) return showToast({ kind: "error", msg: "Name is required" });
    if (!f.email.trim() && !f.phone.trim()) return showToast({ kind: "error", msg: "Add an email or phone number" });
    if (!f.branch) return showToast({ kind: "error", msg: "Choose a branch" });
    if (!f.enquiry_type) return showToast({ kind: "error", msg: "Choose an enquiry type" });
    setCreating(true);
    try {
      const owner = assignees.find((a) => a.id === f.assigned_to);
      const created = await api.adminCreateEnquiry(token, {
        name: f.name.trim(),
        email: f.email.trim() || undefined,
        phone: f.phone.trim() || undefined,
        branch: f.branch,
        child_age: f.child_age.trim() || undefined,
        enquiry_type: f.enquiry_type,
        message: f.message.trim() || undefined,
        source: f.source,
        priority: f.priority as EnquiryPriority,
        assigned_to: f.assigned_to || undefined,
        assigned_to_name: owner?.name,
        note: f.note.trim() || undefined,
      });
      setCreateOpen(false);
      setCreateForm({ ...EMPTY_CREATE });
      showToast({ kind: "success", msg: "Enquiry logged" });
      router.push(`/admin/inquiries/${created.id}`);
    } catch (e) {
      showToast({ kind: "error", msg: e instanceof Error ? e.message : "Failed to log enquiry" });
    } finally {
      setCreating(false);
    }
  };

  const sortParam = (k: SortKey): string =>
    k === "enquiry_type" ? "type" : k === "assigned_to" ? "assigned_to" : k;

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setError("Not authenticated — please sign in as admin.");
      setLoading(false);
      return;
    }
    setLoading(true);
    const params: EnquiryListParams = {
      branch: branch || undefined,
      status: status || undefined,
      assigned_to: assigned || undefined,
      from: from || undefined,
      to: to || undefined,
    };
    try {
      if (view === "table") {
        const pageData = await api.adminGetEnquiriesPaged(token, {
          ...params,
          sort: sortParam(sortKey),
          dir: sortDir,
          limit: pageSize,
          skip: page * pageSize,
        });
        setEnquiries(pageData.items ?? []);
        setTotal(pageData.total ?? 0);
      } else {
        const all = await api.adminGetEnquiries(token, params);
        setEnquiries(Array.isArray(all) ? all : []);
        setTotal(Array.isArray(all) ? all.length : 0);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }, [view, branch, status, assigned, from, to, sortKey, sortDir, page, pageSize]);

  useEffect(() => { void load(); }, [load]);

  const loadTasks = useCallback(() => {
    const token = getAccessToken();
    if (token) api.adminGetEnquiryTasks(token).then(setTasks).catch(() => { /* non-blocking */ });
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (token) api.adminGetEnquiryAssignees(token).then(setAssignees).catch(() => { /* non-blocking */ });
    loadTasks();
  }, [loadTasks]);

  // Reset paging/selection when a filter or view changes.
  const resetPaging = () => { setPage(0); setSelected(new Set()); };

  // Client-side refinement for filters the API doesn't support (free-text
  // search, priority, overdue). In table view this refines the current page.
  const refined = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enquiries.filter((e) => {
      if (q && ![e.name, e.email, e.message, e.assigned_to_name].some((f) => (f ?? "").toLowerCase().includes(q))) return false;
      if (priority && (e.priority ?? "medium") !== priority) return false;
      if (overdueOnly && !isFollowUpOverdue(e.status, e.follow_up_date)) return false;
      return true;
    });
  }, [enquiries, search, priority, overdueOnly]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const runMutation = useCallback(
    async (fn: (token: string) => Promise<unknown>, success: string) => {
      const token = getAccessToken();
      if (!token) return;
      setBusy(true);
      try {
        await fn(token);
        await load();
        loadTasks();
        showToast({ kind: "success", msg: success });
      } catch (err) {
        showToast({ kind: "error", msg: err instanceof Error ? err.message : "Something went wrong" });
      } finally {
        setBusy(false);
      }
    },
    [load, loadTasks, showToast],
  );

  // Clicking a "today's tasks" chip jumps to the relevant filtered view.
  const handleTask = (kind: TaskKind) => {
    resetPaging();
    if (kind === "overdue") { setView("followup"); setOverdueOnly(true); }
    else if (kind === "due") { setView("followup"); setOverdueOnly(false); }
    else if (kind === "visits") { setView("table"); setStatus("booked_visit"); }
    else if (kind === "registered") { setView("table"); setStatus("registered"); }
  };

  const applyStatus = (e: Enquiry, st: EnquiryStatus) =>
    runMutation((t) => api.adminUpdateEnquiryStatus(t, e.id, st), `Moved to ${statusLabel(st)}`);

  const handleStatus = (e: Enquiry, st: EnquiryStatus) => {
    if (st === e.status) return;
    if (st === "registered") {
      showToast({ kind: "error", msg: "Open the enquiry to register (a start date is required)" });
      router.push(`/admin/inquiries/${e.id}`);
      return;
    }
    if (isTerminalStatus(st)) {
      setConfirmStatus({ e, status: st });
      return;
    }
    applyStatus(e, st);
  };

  const openNote = (e: Enquiry) => { setNoteTarget(e); setNoteDraft(""); };
  const submitNote = () => {
    if (!noteTarget) return;
    const e = noteTarget;
    runMutation((t) => api.adminAddEnquiryNote(t, e.id, noteDraft.trim()), "Note added").then(() => setNoteTarget(null));
  };

  const openFollow = (e: Enquiry) => { setFollowTarget(e); setFollowDraft(toDateInput(e.follow_up_date)); };
  const submitFollow = () => {
    if (!followTarget) return;
    const e = followTarget;
    runMutation(
      (t) => api.adminUpdateEnquiryFollowUp(t, e.id, {
        assigned_to: e.assigned_to ?? "",
        assigned_to_name: e.assigned_to_name ?? "",
        priority: e.priority ?? "medium",
        follow_up_date: dateInputToISO(followDraft),
        next_action: e.next_action ?? "",
      }),
      "Follow-up updated",
    ).then(() => setFollowTarget(null));
  };

  // ── Bulk ─────────────────────────────────────────────────────────────────
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelected((s) =>
    refined.length > 0 && refined.every((e) => s.has(e.id)) ? new Set() : new Set(refined.map((e) => e.id)));

  const runBulk = (action: EnquiryBulkAction, extra: Record<string, unknown>, success: string) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    runMutation((t) => api.adminBulkUpdateEnquiries(t, { ids, action, ...extra } as never), success)
      .then(() => { setSelected(new Set()); setBulkAction(null); setBulkValue(""); });
  };

  const bulkExport = () => exportCsv(refined.filter((e) => selected.has(e.id)));
  const bulkTerminal = (st: EnquiryStatus, label: string) => {
    if (!window.confirm(`Mark ${selected.size} enquiry(ies) as "${label}"?`)) return;
    runBulk("status", { status: st }, `${selected.size} marked as ${label}`);
  };

  // ── Follow-up view groups ──────────────────────────────────────────────────
  const followGroups = useMemo(() => {
    const now = Date.now();
    const soon = now + 3 * 24 * 3600 * 1000;
    const overdue: Enquiry[] = [], dueSoon: Enquiry[] = [], uncontacted: Enquiry[] = [];
    for (const e of refined) {
      if (isFollowUpOverdue(e.status, e.follow_up_date)) { overdue.push(e); continue; }
      if (e.follow_up_date) {
        const t = new Date(e.follow_up_date).getTime();
        if (t >= now && t <= soon) { dueSoon.push(e); continue; }
      }
      if (e.status === "new" && new Date(e.created_at).getTime() < now - 24 * 3600 * 1000) uncontacted.push(e);
    }
    return { overdue, dueSoon, uncontacted };
  }, [refined]);

  const tabs: { key: View; label: string; icon: React.ElementType }[] = [
    { key: "pipeline", label: "Pipeline", icon: Columns3 },
    { key: "table", label: "Table", icon: Table2 },
    { key: "followup", label: "Follow-up", icon: ListChecks },
  ];

  const inputCls = "rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <>
      {toast && (
        <div className={`fixed right-6 top-6 z-[60] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.kind === "success" ? "bg-emerald-600" : "bg-red-600"}`} role="status">
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900">Enquiries</h1>
          <p className="text-sm text-slate-500">{total} total{view === "table" ? "" : ` · showing ${refined.length}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/inquiries/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <button type="button" onClick={() => exportCsv(refined)} disabled={refined.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button type="button" onClick={() => { setCreateForm({ ...EMPTY_CREATE }); setCreateOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
            <Plus className="h-4 w-4" /> New inquiry
          </button>
        </div>
      </div>

      {/* View switch */}
      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => { setView(t.key); resetPaging(); }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${view === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>}

      {/* Floating toolbar */}
      <div className="relative mb-4 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, message…"
              className={`w-full pl-9 ${inputCls}`} aria-label="Search" />
          </div>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); resetPaging(); }} className={inputCls} aria-label="Branch">
            <option value="">All branches</option>
            {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{fmtBranch(b)}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); resetPaging(); }} className={inputCls} aria-label="Status">
            <option value="">All statuses</option>
            {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <select value={assigned} onChange={(e) => { setAssigned(e.target.value); resetPaging(); }} className={inputCls} aria-label="Assigned staff">
            <option value="">Anyone</option>
            {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls} aria-label="Priority">
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="accent-teal-600" /> Overdue
          </label>
          <button type="button" onClick={() => setMoreFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${(from || to || moreFilters) ? "border-teal-300 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <SlidersHorizontal className="h-4 w-4" /> More filters{(from || to) ? " ·" : ""}
          </button>
        </div>
        {moreFilters && (
          <div className="absolute right-2 top-full z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Received between</p>
            <div className="flex items-center gap-2">
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); resetPaging(); }} className={`flex-1 ${inputCls}`} aria-label="From date" />
              <span className="text-slate-400">–</span>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); resetPaging(); }} className={`flex-1 ${inputCls}`} aria-label="To date" />
            </div>
            <div className="mt-3 flex justify-between">
              {(from || to) ? (
                <button type="button" onClick={() => { setFrom(""); setTo(""); resetPaging(); }} className="text-sm text-teal-600 hover:underline">Clear dates</button>
              ) : <span />}
              <button type="button" onClick={() => setMoreFilters(false)} className="text-sm font-medium text-slate-500 hover:text-slate-700">Done</button>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline summary (funnel + today's tasks) */}
      {view === "pipeline" && !loading && (
        <PipelineSummary enquiries={refined} tasks={tasks} onTask={handleTask} />
      )}

      {/* Bulk action bar (table view) */}
      {view === "table" && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm">
          <span className="font-semibold text-teal-800">{selected.size} selected</span>
          <button type="button" onClick={() => { setBulkAction("assign"); setBulkValue(""); }} className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">Assign</button>
          <button type="button" onClick={() => { setBulkAction("status"); setBulkValue(""); }} className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">Status</button>
          <button type="button" onClick={() => { setBulkAction("priority"); setBulkValue(""); }} className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">Priority</button>
          <button type="button" onClick={() => { setBulkAction("note"); setBulkValue(""); }} className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">Add note</button>
          <button type="button" onClick={bulkExport} className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">Export</button>
          <button type="button" onClick={() => bulkTerminal("lost", "Not proceeding")} className="rounded-lg bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50">Archive / lost</button>
          <button type="button" onClick={() => bulkTerminal("spam", "Spam")} className="rounded-lg bg-white px-3 py-1.5 font-medium text-rose-600 hover:bg-rose-50">Spam</button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-slate-500 hover:text-slate-700">Clear</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3"><div className="h-40 animate-pulse rounded-xl bg-slate-100" /><div className="h-40 animate-pulse rounded-xl bg-slate-100" /><div className="h-40 animate-pulse rounded-xl bg-slate-100" /></div>
      ) : view === "pipeline" ? (
        <PipelineBoard enquiries={refined} onStatus={handleStatus} onNote={openNote} onFollowUp={openFollow} />
      ) : view === "table" ? (
        <EnquiryTable
          enquiries={refined}
          selected={selected} onToggle={toggle} onToggleAll={toggleAll}
          sortKey={sortKey} sortDir={sortDir}
          onSort={(k) => { setSortKey(k); setSortDir((d) => (sortKey === k && d === "desc" ? "asc" : "desc")); setPage(0); }}
          page={page} pageSize={pageSize} total={total}
          onPage={(p) => { setPage(p); setSelected(new Set()); }}
          onPageSize={(n) => { setPageSize(n); setPage(0); }}
        />
      ) : (
        <div className="space-y-6">
          {([["Overdue follow-ups", followGroups.overdue], ["Due in the next 3 days", followGroups.dueSoon], ["New & not yet contacted", followGroups.uncontacted]] as const).map(([label, items]) => (
            <div key={label}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">{label} <span className="text-slate-400">({items.length})</span></h3>
              {items.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">Nothing here — you&apos;re all caught up.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((e) => <EnquiryCard key={e.id} enquiry={e} showStatus onStatus={handleStatus} onNote={openNote} onFollowUp={openFollow} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manual create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Log a new enquiry" size="lg"
        footer={<>
          <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submitCreate} disabled={creating} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">{creating ? "Logging…" : "Log enquiry"}</button>
        </>}>
        {(() => {
          const set = (patch: Partial<typeof EMPTY_CREATE>) => setCreateForm((p) => ({ ...p, ...patch }));
          const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";
          const labelCls = "mb-1 block text-xs font-medium text-slate-600";
          return (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">For enquiries received off the website — by phone, walk-in, referral or email. No confirmation email is sent to the parent.</p>
              <div>
                <label className={labelCls}>Parent / carer name <span className="text-red-500">*</span></label>
                <input className={inputCls} value={createForm.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Sarah Khan" autoFocus />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" className={inputCls} value={createForm.email} onChange={(e) => set({ email: e.target.value })} placeholder="parent@example.com" />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} value={createForm.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="07…" />
                </div>
              </div>
              <p className="-mt-2 text-xs text-slate-400">Add at least one contact method.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Branch <span className="text-red-500">*</span></label>
                  <select className={inputCls} value={createForm.branch} onChange={(e) => set({ branch: e.target.value })}>
                    <option value="">Select branch…</option>
                    {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{fmtBranch(b)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Enquiry type <span className="text-red-500">*</span></label>
                  <select className={inputCls} value={createForm.enquiry_type} onChange={(e) => set({ enquiry_type: e.target.value })}>
                    <option value="">Select type…</option>
                    {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Received via <span className="text-red-500">*</span></label>
                  <select className={inputCls} value={createForm.source} onChange={(e) => set({ source: e.target.value })}>
                    {SOURCE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select className={inputCls} value={createForm.priority} onChange={(e) => set({ priority: e.target.value })}>
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Child age</label>
                  <input className={inputCls} value={createForm.child_age} onChange={(e) => set({ child_age: e.target.value })} placeholder="e.g. 2 years" />
                </div>
                <div>
                  <label className={labelCls}>Assign to</label>
                  <select className={inputCls} value={createForm.assigned_to} onChange={(e) => set({ assigned_to: e.target.value })}>
                    <option value="">Unassigned</option>
                    {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Enquiry details</label>
                <textarea className={inputCls} rows={3} value={createForm.message} onChange={(e) => set({ message: e.target.value })} placeholder="What did they ask about?" />
              </div>
              <div>
                <label className={labelCls}>Internal note <span className="font-normal text-slate-400">(optional, staff-only)</span></label>
                <textarea className={inputCls} rows={2} value={createForm.note} onChange={(e) => set({ note: e.target.value })} placeholder="Anything the team should know" />
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Note modal */}
      <Modal open={!!noteTarget} onClose={() => setNoteTarget(null)} title={noteTarget ? `Add a note · ${noteTarget.name}` : "Add a note"}>
        <NoteBox value={noteDraft} onChange={setNoteDraft} onSubmit={submitNote} busy={busy} />
      </Modal>

      {/* Follow-up modal */}
      <Modal open={!!followTarget} onClose={() => setFollowTarget(null)} title={followTarget ? `Set follow-up · ${followTarget.name}` : "Set follow-up"}
        footer={<>
          <button type="button" onClick={() => setFollowTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={submitFollow} disabled={busy} className="btn-primary py-2 text-sm disabled:opacity-50">Save</button>
        </>}>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-600">Follow-up date</span>
          <input type="date" value={followDraft} onChange={(e) => setFollowDraft(e.target.value)} className={`w-full ${inputCls}`} />
        </label>
      </Modal>

      {/* Terminal status confirm */}
      <Modal open={!!confirmStatus} onClose={() => setConfirmStatus(null)} title="Confirm status change" size="sm"
        footer={<>
          <button type="button" onClick={() => setConfirmStatus(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={busy} onClick={() => { if (confirmStatus) { applyStatus(confirmStatus.e, confirmStatus.status); setConfirmStatus(null); } }}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Confirm</button>
        </>}>
        {confirmStatus && <p className="text-sm text-slate-600">Mark <strong>{confirmStatus.e.name}</strong> as <strong>{statusLabel(confirmStatus.status)}</strong>? This moves the enquiry out of the active pipeline.</p>}
      </Modal>

      {/* Bulk action modal */}
      <Modal open={!!bulkAction} onClose={() => setBulkAction(null)} title={`Bulk ${bulkAction ?? ""} · ${selected.size} selected`}
        footer={bulkAction === "note" ? undefined : <>
          <button type="button" onClick={() => setBulkAction(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="button" disabled={busy || !bulkValue} onClick={() => {
            if (bulkAction === "assign") { const p = assignees.find((a) => a.id === bulkValue); runBulk("assign", { assigned_to: bulkValue, assigned_to_name: p?.name ?? "" }, `${selected.size} reassigned`); }
            else if (bulkAction === "status") runBulk("status", { status: bulkValue }, `${selected.size} updated`);
            else if (bulkAction === "priority") runBulk("priority", { priority: bulkValue }, `${selected.size} updated`);
          }} className="btn-primary py-2 text-sm disabled:opacity-50">Apply</button>
        </>}>
        {bulkAction === "assign" && (
          <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className={`w-full ${inputCls}`}>
            <option value="">Choose staff…</option>
            {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {bulkAction === "status" && (
          <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className={`w-full ${inputCls}`}>
            <option value="">Choose status…</option>
            {ENQUIRY_STATUSES.filter((s) => s !== "registered").map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        )}
        {bulkAction === "priority" && (
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button key={p} type="button" onClick={() => setBulkValue(p)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold capitalize ${bulkValue === p ? PRIORITY_META[p].badge : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>{p}</button>
            ))}
          </div>
        )}
        {bulkAction === "note" && (
          <NoteBox value={bulkValue} onChange={setBulkValue} busy={busy} submitLabel={`Add to ${selected.size}`}
            onSubmit={() => runBulk("note", { note: bulkValue.trim() }, `Note added to ${selected.size}`)} />
        )}
      </Modal>
    </>
  );
}
