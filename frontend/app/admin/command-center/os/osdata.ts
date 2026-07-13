// Data for the executive-OS shell (Stage 1). Reuses the existing datasets in
// ../data where possible; adds the OS-specific structures (dock, exec KPI bar,
// intelligence rail, AI rail, AI tabs, suggested prompts, command-palette).

export const DOCK_ITEMS = [
  { key: "dashboard", label: "Dashboard", href: "/admin/command-center" },
  { key: "branches", label: "Branches", href: "/admin/dashboard" },
  { key: "children", label: "Children", href: "/admin/inquiries" },
  { key: "staff", label: "Staff", href: "/admin/users" },
  { key: "admissions", label: "Admissions", href: "/admin/inquiries/dashboard" },
  { key: "finance", label: "Finance", href: "/admin/procurement/analytics" },
  { key: "attendance", label: "Attendance", href: "/admin/dashboard" },
  { key: "communication", label: "Communication", href: "/admin/inquiries" },
  { key: "reports", label: "Reports", href: "/admin/procurement/analytics" },
  { key: "settings", label: "Settings", href: "/admin/users" },
] as const;

export type ExecKpi = { label: string; value: string; sub?: string; tone?: "ok" | "warn" | "bad" | "accent" };

export const EXEC_KPIS: ExecKpi[] = [
  { label: "Children", value: "512", sub: "+18 mo", tone: "ok" },
  { label: "Occupancy", value: "92%", sub: "all branches" },
  { label: "Attendance", value: "93%", sub: "today", tone: "ok" },
  { label: "Revenue", value: "£245,780", sub: "+12.6%", tone: "ok" },
  { label: "Outstanding", value: "£12,480", sub: "fees", tone: "bad" },
  { label: "Safeguarding", value: "2", sub: "open", tone: "warn" },
  { label: "Satisfaction", value: "4.8", sub: "/ 5", tone: "accent" },
  { label: "Staff", value: "78", sub: "71 present" },
];

// Left intelligence rail
export const EXEC_SUMMARY = {
  greeting: "Good morning, Mahesh.",
  lines: [
    "Group health is strong — 92/100.",
    "Two branches need attention today.",
    "Occupancy up 1.4% week-on-week.",
  ],
};

export const RISKS: { text: string; tone: "bad" | "warn"; branch: string }[] = [
  { text: "2 safeguarding actions unresolved", tone: "bad", branch: "Borehamwood" },
  { text: "Staffing below ratio tomorrow AM", tone: "warn", branch: "Northwood" },
  { text: "£12,480 fees > 30 days overdue", tone: "warn", branch: "Group" },
];

export const DEADLINES: { text: string; when: string }[] = [
  { text: "Government funding reconciliation", when: "Today" },
  { text: "Ofsted SEF review", when: "in 3 days" },
  { text: "Q2 board report", when: "Fri" },
];

// Right AI rail — unified notifications / approvals / safeguarding / tasks / activity
export type AiRailItem = {
  kind: "notification" | "approval" | "safeguarding" | "task" | "activity";
  priority: "high" | "med" | "low";
  branch: string;
  time: string;
  text: string;
  action: string;
};

export const AI_RAIL: AiRailItem[] = [
  { kind: "safeguarding", priority: "high", branch: "Borehamwood", time: "08:53", text: "Safeguarding action raised", action: "Review" },
  { kind: "approval", priority: "high", branch: "Group", time: "09:02", text: "Funding reconciliation approval", action: "Approve" },
  { kind: "approval", priority: "med", branch: "Pinner", time: "08:40", text: "3 staff leave requests", action: "Approve" },
  { kind: "notification", priority: "med", branch: "Group", time: "08:44", text: "6 new enquiries to follow up", action: "Assign" },
  { kind: "task", priority: "med", branch: "Northwood", time: "07:30", text: "Cover ratio gap tomorrow AM", action: "Roster" },
  { kind: "activity", priority: "low", branch: "Harrow", time: "08:42", text: "Emily R. checked in", action: "Open" },
  { kind: "activity", priority: "low", branch: "Harrow", time: "09:04", text: "Medication logged (Room 2)", action: "Open" },
  { kind: "notification", priority: "low", branch: "Group", time: "08:30", text: "Newsletter sent · 1,240 parents", action: "Open" },
];

// Header inbox — direct messages surfaced by the Mail control
export type InboxMessage = {
  from: string;
  role: string;
  initials: string;
  branch: string;
  time: string;
  preview: string;
  unread: boolean;
};

export const MESSAGES: InboxMessage[] = [
  { from: "Priya Sharma", role: "Branch Manager", initials: "PS", branch: "Harrow", time: "09:12", preview: "Room 2 ratio covered for tomorrow — confirming AM staffing now.", unread: true },
  { from: "James Okafor", role: "Finance Lead", initials: "JO", branch: "Group", time: "08:57", preview: "Funding reconciliation ready for your sign-off before noon.", unread: true },
  { from: "Aisha Bello", role: "Admissions", initials: "AB", branch: "Pinner", time: "08:41", preview: "Two new visit requests this week — shall I book Thursday?", unread: true },
  { from: "Tom Fielding", role: "Branch Manager", initials: "TF", branch: "Northwood", time: "Yesterday", preview: "Newsletter went out to 1,240 parents — engagement looks strong.", unread: false },
  { from: "Ofsted Liaison", role: "Compliance", initials: "OL", branch: "Group", time: "Yesterday", preview: "SEF draft updated ahead of the readiness review.", unread: false },
];

export const AI_TABS = [
  "Mission Control", "Operations", "Finance", "Admissions", "People", "Ofsted", "Analytics",
] as const;
export type AiTab = (typeof AI_TABS)[number];

export const AI_PROMPTS = [
  "Generate Board Report",
  "Summarise Yesterday",
  "Funding Overview",
  "Prepare Ofsted Report",
  "Compare Branches",
  "Forecast Occupancy",
];

// Global command palette (AI as the navigation layer)
export type PaletteCommand = { label: string; hint: string; href: string; group: string };
export const PALETTE_COMMANDS: PaletteCommand[] = [
  { label: "Show today's absences", hint: "Attendance", href: "/admin/dashboard", group: "Ask AI" },
  { label: "Prepare invoice report", hint: "Finance", href: "/admin/procurement/analytics", group: "Ask AI" },
  { label: "Book a visit", hint: "Admissions", href: "/admin/inquiries", group: "Ask AI" },
  { label: "Create new child", hint: "Admissions", href: "/admin/inquiries", group: "Ask AI" },
  { label: "Open Harrow", hint: "Branch", href: "/admin/dashboard", group: "Branches" },
  { label: "Open Pinner", hint: "Branch", href: "/admin/dashboard", group: "Branches" },
  { label: "Open Borehamwood", hint: "Branch", href: "/admin/dashboard", group: "Branches" },
  { label: "Open Northwood", hint: "Branch", href: "/admin/dashboard", group: "Branches" },
  { label: "Open Pinner Green", hint: "Branch", href: "/admin/dashboard", group: "Branches" },
  { label: "Dashboard", hint: "Go to", href: "/admin/dashboard", group: "Navigate" },
  { label: "Enquiries", hint: "Go to", href: "/admin/inquiries", group: "Navigate" },
  { label: "Admissions dashboard", hint: "Go to", href: "/admin/inquiries/dashboard", group: "Navigate" },
  { label: "Finance & analytics", hint: "Go to", href: "/admin/procurement/analytics", group: "Navigate" },
  { label: "Users & staff", hint: "Go to", href: "/admin/users", group: "Navigate" },
  { label: "Activity log", hint: "Go to", href: "/admin/activity", group: "Navigate" },
];
