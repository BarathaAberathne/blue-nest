"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Building2, Baby, Users, ClipboardList, PoundSterling,
  CalendarCheck, MessageSquare, BarChart3, Settings, Search, Bell, Mail,
  Mic, Paperclip, Send, ChevronRight, Pin, ShieldAlert, CircleCheck,
  Clock, Sparkles, TriangleAlert, type LucideIcon,
} from "lucide-react";

import "./command-center.css";
import CommandPalette from "./os/CommandPalette";
import BranchRadar from "./os/BranchRadar";
import AITabContent from "./os/AITabs";
import {
  DOCK_ITEMS, EXEC_KPIS, EXEC_SUMMARY, MD_PROFILE, RISKS, DEADLINES, AI_RAIL, AI_TABS,
  AI_PROMPTS, MESSAGES, type AiTab, type AiRailItem,
} from "./os/osdata";
import {
  AI_COMMAND, CALENDAR, FINANCE, FINANCE_ANALYTICS,
  SYSTEM_HEALTH,
} from "./data";
import { useChildrenStats, useAttendanceToday, useBranchMetrics, useStaffStats, useDailyStats } from "./live";
import { DonutChart, LineChart, MiniCalendar, RingGauge } from "./widgets";
import OpsWorkspace from "./os/OpsWorkspace";
import { addTask } from "./os/tasks";

const LOGO = "/logo/bluenest-logo.png";
const TONE: Record<string, string> = {
  ok: "var(--cc-success)", warn: "var(--cc-warning)", bad: "var(--cc-error)",
  accent: "var(--cc-accent)", high: "var(--cc-error)", med: "var(--cc-warning)", low: "var(--cc-muted)",
};
const statusColor = (s: string) => s === "ok" ? "var(--cc-success)" : s === "warn" ? "var(--cc-warning)" : "var(--cc-error)";

const DOCK_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, branches: Building2, children: Baby, staff: Users,
  admissions: ClipboardList, finance: PoundSterling, attendance: CalendarCheck,
  communication: MessageSquare, reports: BarChart3, settings: Settings,
};
const RAIL_ICONS: Record<AiRailItem["kind"], LucideIcon> = {
  notification: Bell, approval: CircleCheck, safeguarding: ShieldAlert, task: Clock, activity: Sparkles,
};

/* ── Collapsible navigation dock (macOS-inspired, hover-expands) ──────────── */
function Dock({ active, go }: { active: string; go: (href: string) => void }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const expanded = hover || pinned;
  return (
    <motion.aside
      className="cc-dock"
      animate={{ width: expanded ? 240 : 72 }}
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
    >
      <button className="cc-dock-pin" onClick={() => setPinned((p) => !p)} title={pinned ? "Unpin" : "Pin open"}>
        <Pin size={13} color={pinned ? "var(--cc-accent)" : "var(--cc-muted)"} style={{ transform: pinned ? "rotate(0deg)" : "rotate(45deg)" }} />
        <AnimatePresence>{expanded && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="cc-dock-pinlabel">{pinned ? "PINNED" : "PIN"}</motion.span>}</AnimatePresence>
      </button>
      <nav className="cc-dock-nav">
        {DOCK_ITEMS.map((it) => {
          const Icon = DOCK_ICONS[it.key];
          const isActive = it.key === active;
          return (
            <button key={it.key} className={`cc-dock-item ${isActive ? "cc-dock-item--active" : ""}`} onClick={() => go(it.href)} title={it.label}>
              <span className="cc-dock-ic"><Icon size={18} /></span>
              <AnimatePresence>
                {expanded && <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} className="cc-dock-label">{it.label}</motion.span>}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>
    </motion.aside>
  );
}

/* ── Live clock (header) ──────────────────────────────────────────────────── */
function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return now;
}

/* ── Executive KPI bar ────────────────────────────────────────────────────── */
// dayLabel returns "today" when the figures are for the current date, else a
// short date like "12 Jul" — so a KPI sourced from the latest register day
// (e.g. before today's register is taken) reads honestly instead of "today".
function dayLabel(date: string): string {
  if (!date) return "today";
  const today = new Date().toISOString().slice(0, 10);
  if (date === today) return "today";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "today" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function KpiBar() {
  const children = useChildrenStats();
  const attendance = useAttendanceToday();
  const staff = useStaffStats();
  const daily = useDailyStats();
  const attLabel = attendance.live ? dayLabel(attendance.date) : "today";
  // Live overrides for the backed KPIs; the rest stay on mock.
  const overrides: Record<string, { value: string; sub?: string }> = {
    Children: { value: String(children.total), sub: children.live ? `${children.active} active` : undefined },
    Occupancy: { value: `${children.occupancyRate}%`, sub: "all branches" },
    Attendance: { value: `${attendance.attendanceRate}%`, sub: `children · ${attLabel}` },
    Safeguarding: { value: String(daily.safeguardingOpen), sub: "open" },
    Staff: { value: String(staff.total), sub: `${staff.present} present` },
  };
  return (
    <div className="cc-kpibar">
      {EXEC_KPIS.map((k) => {
        const o = overrides[k.label];
        const value = o ? o.value : k.value;
        const sub = o && o.sub !== undefined ? o.sub : k.sub;
        return (
          <div key={k.label} className="cc-kpicell">
            <p className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)" }}>{k.label}</p>
            <p className="cc-heading" style={{ fontSize: 19, color: k.tone ? TONE[k.tone] : "var(--cc-text)", lineHeight: 1.1 }}>{value}</p>
            {sub && <p style={{ fontSize: 8, color: "var(--cc-muted-dim)" }}>{sub}</p>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Left intelligence rail ───────────────────────────────────────────────── */
function IntelligenceRail() {
  const { metrics: branches } = useBranchMetrics();
  return (
    <aside className="cc-intel cc-col-scroll">
      <Section title="EXECUTIVE SUMMARY">
        <p style={{ fontSize: 11, color: "var(--cc-text)", lineHeight: 1.5 }}>
          <span style={{ color: "var(--cc-accent)" }}>{EXEC_SUMMARY.greeting}</span>
        </p>
        <ul className="mt-1 flex flex-col gap-1">
          {EXEC_SUMMARY.lines.map((l) => (
            <li key={l} className="flex gap-1.5" style={{ fontSize: 10.5, color: "var(--cc-muted)", lineHeight: 1.35 }}><span style={{ color: "var(--cc-primary)" }}>▹</span>{l}</li>
          ))}
        </ul>
      </Section>
      <Section title="HEALTH SCORE">
        <div className="flex items-center gap-3">
          <RingGauge value={AI_COMMAND.health} size={72} big={`${AI_COMMAND.health}`} color="var(--cc-success)" />
          <div>
            <p className="cc-heading" style={{ fontSize: 12, color: "var(--cc-success)" }}>{AI_COMMAND.healthLabel}</p>
            <p style={{ fontSize: 9.5, color: "var(--cc-muted)" }}>AI confidence {AI_COMMAND.confidence}%</p>
          </div>
        </div>
      </Section>
      <Section title="BRANCH OCCUPANCY">
        <div className="flex flex-col gap-1.5">
          {branches.map((m) => (
            <div key={m.slug} className="flex items-center gap-2" style={{ fontSize: 10.5 }}>
              <span className="cc-dot" style={{ width: 7, height: 7, color: statusColor(m.status) }} title={`Status: ${m.status}`} />
              <span className="cc-label" style={{ flex: 1, color: "var(--cc-muted)" }}>{m.name}</span>
              <span className="cc-heading" style={{ color: "var(--cc-text)" }}>{m.occupancy}%</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="CURRENT RISKS">
        <div className="flex flex-col gap-1.5">
          {RISKS.map((r) => (
            <div key={r.text} className="flex items-start gap-2">
              <TriangleAlert size={12} color={TONE[r.tone]} style={{ marginTop: 1 }} />
              <div style={{ fontSize: 10, lineHeight: 1.3 }}>
                <span style={{ color: "var(--cc-text)" }}>{r.text}</span>
                <span style={{ color: "var(--cc-muted-dim)" }}> · {r.branch}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="UPCOMING DEADLINES">
        <div className="flex flex-col gap-1.5">
          {DEADLINES.map((d) => (
            <div key={d.text} className="flex items-baseline justify-between gap-2" style={{ fontSize: 10.5 }}>
              <span style={{ color: "var(--cc-text)" }}>{d.text}</span>
              <span className="cc-label" style={{ color: "var(--cc-accent)" }}>{d.when}</span>
            </div>
          ))}
        </div>
      </Section>
    </aside>
  );
}

/* ── Right AI rail (unified notifications / approvals / tasks / activity) ──── */
function AIRail({ go }: { go: (href: string) => void }) {
  return (
    <aside className="cc-airail cc-col-scroll">
      <div className="cc-airail-head">
        <p className="cc-heading" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--cc-text)" }}>AI RAIL</p>
        <span className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)" }}>NOTIFY · APPROVE · TASKS</span>
      </div>
      <div className="flex flex-col gap-1.5 mt-2">
        {AI_RAIL.map((it, i) => {
          const Icon = RAIL_ICONS[it.kind];
          return (
            <div key={i} className="cc-rail-item">
              <span className="cc-rail-pri" style={{ background: TONE[it.priority] }} />
              <Icon size={14} color={TONE[it.priority]} style={{ marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10.5, color: "var(--cc-text)", lineHeight: 1.3 }}>{it.text}</p>
                <p className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted-dim)" }}>{it.branch} · {it.time}</p>
              </div>
              <button className="cc-rail-act" onClick={() => go("/admin/activity")}>{it.action}</button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/* ── Conversational AI (ChatGPT-style) ────────────────────────────────────── */
type Msg = { role: "ai" | "user"; text: string };
function Conversation({ tab }: { tab: AiTab }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", text: `${AI_COMMAND.greeting} ${AI_COMMAND.summary} Ask me anything, or pick a prompt below.` },
  ]);
  const [input, setInput] = useState("");
  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    // AI task creation: "add task …", "task: …", "remind me to …" → creates a task.
    const taskMatch = t.match(/^(?:add task|task|remind me(?: to)?|todo)[:\s-]+(.+)$/i);
    let reply: string;
    if (taskMatch) {
      const task = addTask({ title: taskMatch[1], source: "ai" });
      reply = `Added “${task.title}” to your tasks. You can manage it in the Tasks widget or the board.`;
    } else {
      reply = `Working on “${t}” for ${tab}. I'll pull the latest branch data and prepare it — this is a Stage-1 preview of the conversational layer.`;
    }
    setMessages((m) => [...m, { role: "user", text: t }, { role: "ai", text: reply }]);
    setInput("");
  };
  return (
    <div className="cc-chat">
      <div className="cc-chat-log cc-col-scroll">
        {messages.map((m, i) => (
          <div key={i} className={`cc-msg cc-msg--${m.role}`}>
            {m.role === "ai" && <span className="cc-msg-orb">AI</span>}
            <div className="cc-msg-bubble">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="cc-chat-prompts">
        {AI_PROMPTS.map((p) => (
          <button key={p} className="cc-chip-q" onClick={() => send(p)}>{p}</button>
        ))}
      </div>
      <div className="cc-chat-input">
        <button className="cc-chat-ic" title="Attach"><Paperclip size={15} color="var(--cc-muted)" /></button>
        <button className="cc-chat-ic" title="Voice"><Mic size={15} color="var(--cc-primary-soft)" /></button>
        <input className="cc-ask-input" placeholder={`Ask Blue Nest AI · ${tab}…`} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(input); }} />
        <button className="cc-ask-send" onClick={() => send(input)}><Send size={14} color="#fff" /></button>
      </div>
    </div>
  );
}

/* ── AI Workspace centre core (tabs · radar · conversation) ───────────────── */
function AIWorkspaceCore() {
  const [tab, setTab] = useState<AiTab>("Mission Control");
  return (
    <div className="cc-core">
      <div className="cc-tabs-row">
        {AI_TABS.map((t) => (
          <button key={t} className={`cc-ai-tab ${tab === t ? "cc-ai-tab--active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Mission Control" ? (
        <div className="cc-core-radar"><BranchRadar /></div>
      ) : (
        <div className="cc-core-tab cc-col-scroll"><AITabContent tab={tab} /></div>
      )}
      <Conversation tab={tab} />
    </div>
  );
}

/* ── Executive / financial sidebar ────────────────────────────────────────── */
function FinancialSidebar({ go }: { go: (href: string) => void }) {
  return (
    <aside className="cc-finrail cc-col-scroll">
      <Section title="FINANCIAL OVERVIEW" onOpen={() => go("/admin/procurement/analytics")}>
        <div className="flex justify-center" style={{ height: 150 }}>
          <DonutChart slices={FINANCE.slices} total={FINANCE.total} caption="REVENUE" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
          {FINANCE_ANALYTICS.stats.map((s) => (
            <div key={s.label} className="flex items-baseline justify-between gap-2" style={{ fontSize: 10 }}>
              <span className="cc-label" style={{ color: "var(--cc-muted)" }}>{s.label}</span>
              <span className="cc-heading" style={{ color: TONE[s.tone] ?? "var(--cc-text)" }}>{s.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-2">
          <LineChart points={FINANCE_ANALYTICS.trend} budget={FINANCE_ANALYTICS.budget} height={58} />
        </div>
      </Section>
      <Section title="CALENDAR" sub={CALENDAR.label}>
        <MiniCalendar year={CALENDAR.year} month={CALENDAR.month} events={CALENDAR.events} legend={CALENDAR.legend} />
      </Section>
      <Section title="SYSTEM HEALTH">
        <div className="flex flex-col gap-1.5">
          {SYSTEM_HEALTH.map((h) => (
            <div key={h.label} className="flex items-center gap-2" style={{ fontSize: 10 }}>
              <span className="cc-dot" style={{ width: 6, height: 6, color: h.status === "ok" ? "var(--cc-success)" : "var(--cc-accent)" }} />
              <span className="cc-label" style={{ flex: 1, color: "var(--cc-muted)" }}>{h.label}</span>
              <span className="cc-label" style={{ color: h.status === "ok" ? "var(--cc-success)" : "var(--cc-accent)" }}>{h.value}</span>
            </div>
          ))}
        </div>
      </Section>
    </aside>
  );
}


/* ── Reusable section wrapper ─────────────────────────────────────────────── */
function Section({ title, sub, onOpen, children }: { title: string; sub?: string; onOpen?: () => void; children: React.ReactNode }) {
  return (
    <div className="cc-sec">
      <div className="flex items-baseline justify-between">
        <p className="cc-heading" style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--cc-accent)" }}>{title}</p>
        {sub && <span className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)" }}>{sub}</span>}
        {onOpen && <button className="cc-linkbtn" style={{ fontSize: 9 }} onClick={onOpen}>Open <ChevronRight size={10} /></button>}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/* ── Header controls: notifications + messages dropdowns ──────────────────── */
function HeaderControls({ go }: { go: (href: string) => void }) {
  const [open, setOpen] = useState<null | "notif" | "msg">(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const notifCount = AI_RAIL.length;
  const msgCount = MESSAGES.filter((m) => m.unread).length;

  return (
    <div className="cc-hmenus" ref={wrapRef}>
      <button
        className={`cc-hbtn ${open === "notif" ? "cc-hbtn--on" : ""}`}
        onClick={() => setOpen((o) => (o === "notif" ? null : "notif"))}
        title="Notifications" aria-label="Notifications"
      >
        <Bell size={15} /><span className="cc-hbadge">{notifCount}</span>
      </button>
      <button
        className={`cc-hbtn ${open === "msg" ? "cc-hbtn--on" : ""}`}
        onClick={() => setOpen((o) => (o === "msg" ? null : "msg"))}
        title="Messages" aria-label="Messages"
      >
        <Mail size={15} />{msgCount > 0 && <span className="cc-hbadge">{msgCount}</span>}
      </button>

      <AnimatePresence>
        {open === "notif" && (
          <motion.div
            className="cc-hpop" initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
          >
            <div className="cc-hpop-head">
              <div>
                <p className="cc-heading" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--cc-text)" }}>NOTIFICATIONS</p>
                <p className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)" }}>{notifCount} ACTIVE · GROUP-WIDE</p>
              </div>
              <span className="cc-hpop-dot" />
            </div>
            <div className="cc-hpop-list">
              {AI_RAIL.map((it, i) => {
                const Icon = RAIL_ICONS[it.kind];
                return (
                  <div key={i} className="cc-hpop-item">
                    <span className="cc-rail-pri" style={{ background: TONE[it.priority] }} />
                    <Icon size={14} color={TONE[it.priority]} style={{ marginTop: 1 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 10.5, color: "var(--cc-text)", lineHeight: 1.3 }}>{it.text}</p>
                      <p className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted-dim)" }}>{it.branch} · {it.time}</p>
                    </div>
                    <button className="cc-rail-act" onClick={() => { setOpen(null); go("/admin/activity"); }}>{it.action}</button>
                  </div>
                );
              })}
            </div>
            <button className="cc-hpop-foot" onClick={() => { setOpen(null); go("/admin/activity"); }}>
              View activity log <ChevronRight size={11} />
            </button>
          </motion.div>
        )}

        {open === "msg" && (
          <motion.div
            className="cc-hpop cc-hpop--msg" initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
          >
            <div className="cc-hpop-head">
              <div>
                <p className="cc-heading" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--cc-text)" }}>MESSAGES</p>
                <p className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)" }}>{msgCount} UNREAD · TEAM INBOX</p>
              </div>
              <span className="cc-hpop-dot" />
            </div>
            <div className="cc-hpop-list">
              {MESSAGES.map((m, i) => (
                <div key={i} className={`cc-hpop-msg ${m.unread ? "cc-hpop-msg--unread" : ""}`}>
                  <div className="cc-hpop-avatar">{m.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="cc-heading" style={{ fontSize: 10.5, color: "var(--cc-text)" }}>{m.from}</p>
                      <span className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted-dim)", whiteSpace: "nowrap" }}>{m.time}</span>
                    </div>
                    <p className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)", marginBottom: 2 }}>{m.role} · {m.branch}</p>
                    <p style={{ fontSize: 10, color: "var(--cc-muted)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{m.preview}</p>
                  </div>
                  {m.unread && <span className="cc-hpop-unreaddot" />}
                </div>
              ))}
            </div>
            <button className="cc-hpop-foot" onClick={() => { setOpen(null); go("/admin/inquiries"); }}>
              Open inbox <ChevronRight size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Root shell ───────────────────────────────────────────────────────────── */
export default function CommandCenterClient() {
  const router = useRouter();
  const go = (href: string) => router.push(href);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const now = useClock();
  const time = now?.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" }) ?? "--:--";

  return (
    <div className="cc-os">
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />

      {/* ── Header ── */}
      <header className="cc-os-header">
        <div className="flex items-center gap-3 min-w-0">
          <Image src={LOGO} alt="Blue Nest" width={40} height={22} className="cc-logo-glow" style={{ width: 40, height: 22 }} priority />
          <div className="min-w-0">
            <p className="cc-serif" style={{ fontSize: 15, color: "var(--cc-accent)", lineHeight: 1, letterSpacing: "0.04em" }}>BLUE NEST MONTESSORI</p>
            <p className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)", letterSpacing: "0.16em" }}>EXECUTIVE OPERATING SYSTEM</p>
          </div>
          <span className="cc-ws-chip">MISSION CONTROL</span>
        </div>
        <button className="cc-search" onClick={() => setPaletteOpen(true)}>
          <Search size={14} color="var(--cc-muted)" />
          <span style={{ flex: 1, textAlign: "left" }}>Search or ask Blue Nest AI…</span>
          <span className="cc-cmdk-kbd">⌘K</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="cc-label" style={{ fontSize: 11, color: "var(--cc-muted)" }} suppressHydrationWarning>{time}</span>
          <HeaderControls go={go} />
          <div className="flex items-center gap-2" title={`${MD_PROFILE.name} · ${MD_PROFILE.title}`}>
            <div className="hidden sm:block text-right leading-tight">
              <p className="cc-heading" style={{ fontSize: 11, color: "var(--cc-text)" }}>{MD_PROFILE.nickname}</p>
              <p className="cc-label" style={{ fontSize: 8, color: "var(--cc-muted)" }}>{MD_PROFILE.title}</p>
            </div>
            <div className="cc-hprofile">{MD_PROFILE.initials}</div>
          </div>
        </div>
      </header>

      {/* ── Body: dock · AI workspace · financial sidebar ── */}
      <div className="cc-os-body">
        <Dock active="dashboard" go={go} />
        <main className="cc-os-main">
          <KpiBar />
          <div className="cc-ai-workspace">
            <IntelligenceRail />
            <AIWorkspaceCore />
            <AIRail go={go} />
          </div>
        </main>
        <FinancialSidebar go={go} />
      </div>

      {/* ── Operational workspace (full-width bottom, modular) ── */}
      <OpsWorkspace />
    </div>
  );
}
