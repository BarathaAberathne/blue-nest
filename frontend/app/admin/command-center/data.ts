// Static mock data for the MD "Blue Nest Command Centre" HUD. Every figure here
// mirrors the approved design mock — this page has no backend wiring (children,
// attendance, finance, sentiment etc. are not yet modelled server-side), so the
// numbers are curated constants rather than live data.

export type BranchSlug =
  | "harrow"
  | "borehamwood"
  | "pinner"
  | "northwood"
  | "pinner-green";

export type Branch = {
  slug: BranchSlug;
  name: string;
  children: number;
  occupancy: number; // percent
  /** Placement of the card around the centrepiece. */
  corner: "top-left" | "top-right" | "mid-left" | "mid-right" | "bottom";
};

export const BRANCHES: Branch[] = [
  { slug: "harrow", name: "Harrow", children: 128, occupancy: 95, corner: "top-left" },
  { slug: "borehamwood", name: "Borehamwood", children: 96, occupancy: 93, corner: "top-right" },
  { slug: "pinner", name: "Pinner", children: 142, occupancy: 94, corner: "mid-left" },
  { slug: "northwood", name: "Northwood", children: 44, occupancy: 88, corner: "mid-right" },
  { slug: "pinner-green", name: "Pinner Green", children: 102, occupancy: 90, corner: "bottom" },
];

export type Kpi = {
  key: string;
  label: string;
  value: string;
  sub: string;
  kind: "children" | "staff" | "enquiries" | "occupancy" | "satisfaction";
};

export const KPIS: Kpi[] = [
  { key: "children", label: "Total Children", value: "512", sub: "+18 this month", kind: "children" },
  { key: "staff", label: "Staff Members", value: "78", sub: "Active Staff", kind: "staff" },
  { key: "enquiries", label: "Enquiries", value: "134", sub: "+27 this week", kind: "enquiries" },
  { key: "occupancy", label: "Occupancy Rate", value: "92%", sub: "Across All Branches", kind: "occupancy" },
  { key: "satisfaction", label: "Parent Satisfaction", value: "4.8", sub: "Excellent Rating", kind: "satisfaction" },
];

export type FunnelStage = { label: string; value: number; highlight?: boolean };

export const FUNNEL: FunnelStage[] = [
  { label: "New Enquiries", value: 134 },
  { label: "Visits Booked", value: 68 },
  { label: "Applications", value: 42 },
  { label: "Offers Made", value: 28 },
  { label: "Enrolled", value: 18, highlight: true },
];

export const CONVERSION_PCT = 22;

export const ATTENDANCE = {
  average: 93,
  days: [
    { day: "MON", pct: 93 },
    { day: "TUE", pct: 94 },
    { day: "WED", pct: 95 },
    { day: "THU", pct: 92 },
    { day: "FRI", pct: 91 },
  ],
};

export const SENTIMENT = {
  score: 4.8,
  delta: "+0.3 vs last month",
  // Normalised (0..1) points for the rising spark line.
  points: [0.28, 0.32, 0.26, 0.4, 0.36, 0.5, 0.46, 0.58, 0.62, 0.7, 0.66, 0.82, 0.9],
};

export type FinanceSlice = {
  label: string;
  amount: string;
  pct: number;
  color: "primary" | "accent" | "accentSoft" | "accentSofter";
};

export const FINANCE = {
  total: "£245,780",
  delta: "+12.6% vs last month",
  slices: [
    { label: "Fees Collection", amount: "£198,450", pct: 81, color: "primary" },
    { label: "Government Funding", amount: "£32,780", pct: 13, color: "accent" },
    { label: "Extra Curricular", amount: "£9,850", pct: 4, color: "accentSoft" },
    { label: "Other Income", amount: "£4,700", pct: 2, color: "accentSofter" },
  ] as FinanceSlice[],
};

export type EventItem = { title: string; month: string; day: string };

export const EVENTS: EventItem[] = [
  { title: "Sports Day – Harrow", month: "MAY", day: "12" },
  { title: "Graduation Ceremony", month: "MAY", day: "24" },
  { title: "Parent Workshop", month: "MAY", day: "31" },
  { title: "Open Day – Northwood", month: "JUN", day: "07" },
];

export type NotificationItem = { title: string; meta: string; severity: "normal" | "warning" | "urgent" };

export const NOTIFICATIONS: NotificationItem[] = [
  { title: "5 New Enquiries", meta: "Requires follow up", severity: "warning" },
  { title: "3 Staff Leave Requests", meta: "Pending approval", severity: "warning" },
  { title: "Financial Report Ready", meta: "April 2025", severity: "normal" },
  { title: "System Update Completed", meta: "Today", severity: "normal" },
];

export type Objective = { label: string; pct: number };

export const OBJECTIVES: Objective[] = [
  { label: "Increase Enrollment by 15% this Term", pct: 78 },
  { label: "Expand Northwood Campus", pct: 45 },
  { label: "Launch New Curriculum Program", pct: 60 },
  { label: "Achieve 95% Parent Satisfaction", pct: 92 },
];

export type HealthItem = { label: string; value: string; status: "ok" | "watch" };

export const SYSTEM_HEALTH: HealthItem[] = [
  { label: "Database", value: "HEALTHY", status: "ok" },
  { label: "Security", value: "MAXIMUM", status: "ok" },
  { label: "Backup", value: "UP TO DATE", status: "ok" },
  { label: "Integrations", value: "CONNECTED", status: "ok" },
  { label: "Performance", value: "OPTIMAL", status: "watch" },
];

export const QUICK_ACTIONS = [
  "Add Enquiry",
  "New Admission",
  "Send Message",
  "Approve Leave",
  "Schedule Event",
] as const;

// ── Second executive KPI row (dense operational tiles) ──────────────────────
export type MiniKpi = { label: string; value: string; tone?: "ok" | "warn" | "bad" | "accent" };

export const KPIS_ROW2: MiniKpi[] = [
  { label: "Today's Attendance", value: "93%", tone: "ok" },
  { label: "Checked In", value: "472" },
  { label: "Staff Present", value: "71", tone: "ok" },
  { label: "Safeguarding", value: "2", tone: "warn" },
  { label: "Late Pickups", value: "4", tone: "warn" },
  { label: "Meals Served", value: "386" },
  { label: "Medication Due", value: "5", tone: "warn" },
  { label: "Outstanding Fees", value: "£12,480", tone: "bad" },
  { label: "Funding Pending", value: "3" },
  { label: "Booked Visits", value: "18", tone: "accent" },
  { label: "Applications", value: "12" },
  { label: "Available Places", value: "47", tone: "ok" },
  { label: "Monthly Revenue", value: "£245,780", tone: "ok" },
  { label: "Monthly Expenses", value: "£184,560" },
  { label: "Net Profit", value: "£61,220", tone: "ok" },
  { label: "Retention", value: "96%", tone: "ok" },
  { label: "Enquiry Response", value: "2.4h", tone: "accent" },
  { label: "Google Review", value: "4.8★", tone: "accent" },
  { label: "DayNurseries", value: "4.9★", tone: "accent" },
  { label: "Website Visitors", value: "1,284" },
  { label: "Live Users", value: "37", tone: "ok" },
  { label: "Marketing Leads", value: "63" },
];

// ── Live occupancy heatmap (capacity bars per branch) ───────────────────────
export const OCCUPANCY_BARS: { name: string; pct: number }[] = [
  { name: "Harrow", pct: 95 },
  { name: "Pinner", pct: 94 },
  { name: "Borehamwood", pct: 93 },
  { name: "Pinner Green", pct: 90 },
  { name: "Northwood", pct: 88 },
];

// ── Enquiry sources (share of new enquiries) ────────────────────────────────
export type SourceSlice = { label: string; pct: number; color: string };
export const ENQUIRY_SOURCES: SourceSlice[] = [
  { label: "Website", pct: 34, color: "#36a9ff" },
  { label: "Google", pct: 24, color: "#5cbaff" },
  { label: "Facebook", pct: 16, color: "#35d07f" },
  { label: "Recommendations", pct: 11, color: "#d6b36a" },
  { label: "Walk-ins", pct: 8, color: "#ffc857" },
  { label: "Phone", pct: 4, color: "#8aa6c6" },
  { label: "DayNurseries", pct: 3, color: "#ff5c73" },
];

// ── Staff status today ──────────────────────────────────────────────────────
export const STAFF_STATUS: { label: string; count: number; tone: "ok" | "warn" | "bad" | "muted" }[] = [
  { label: "Present", count: 71, tone: "ok" },
  { label: "Annual Leave", count: 3, tone: "muted" },
  { label: "Training", count: 2, tone: "muted" },
  { label: "Sick Leave", count: 1, tone: "bad" },
  { label: "Late Arrival", count: 1, tone: "warn" },
  { label: "Agency Staff", count: 2, tone: "warn" },
];

// ── Children's daily status ─────────────────────────────────────────────────
export const CHILDREN_STATUS: { label: string; count: number; tone: "ok" | "warn" | "bad" | "muted" }[] = [
  { label: "Checked In", count: 472, tone: "ok" },
  { label: "Collected", count: 18, tone: "muted" },
  { label: "Absent", count: 22, tone: "bad" },
  { label: "Holiday", count: 14, tone: "muted" },
  { label: "Late", count: 6, tone: "warn" },
  { label: "Medical Notes", count: 9, tone: "warn" },
];

// ── Compliance centre (traffic-light indicators) ────────────────────────────
export const COMPLIANCE: { label: string; status: "ok" | "warn" | "bad" }[] = [
  { label: "EYFS", status: "ok" },
  { label: "Ofsted", status: "ok" },
  { label: "DBS Expiry", status: "warn" },
  { label: "Fire Checks", status: "ok" },
  { label: "Food Hygiene", status: "ok" },
  { label: "First Aid", status: "warn" },
  { label: "Risk Assessments", status: "ok" },
  { label: "Safeguarding Training", status: "bad" },
];

// ── Live activity feed ──────────────────────────────────────────────────────
export const ACTIVITY_FEED: { time: string; text: string; kind: "in" | "enquiry" | "invoice" | "message" | "med" | "visit" | "alert" }[] = [
  { time: "09:10", text: "Visit booked — Northwood open day", kind: "visit" },
  { time: "09:04", text: "Medication logged — Harrow (Room 2)", kind: "med" },
  { time: "09:01", text: "Parent message received — Pinner", kind: "message" },
  { time: "08:53", text: "Safeguarding action raised — Borehamwood", kind: "alert" },
  { time: "08:51", text: "Invoice paid — £486.00", kind: "invoice" },
  { time: "08:44", text: "New enquiry received — website", kind: "enquiry" },
  { time: "08:42", text: "Emily R. checked into Harrow", kind: "in" },
  { time: "08:37", text: "Staff clocked in — 71 present", kind: "in" },
  { time: "08:30", text: "Newsletter sent — 1,240 parents", kind: "message" },
  { time: "08:22", text: "Funding claim submitted — Q2", kind: "invoice" },
];

// ── Performance gauges ──────────────────────────────────────────────────────
export const PERF_GAUGES: { label: string; value: number; tone: "blue" | "gold" | "green" }[] = [
  { label: "Occupancy", value: 92, tone: "blue" },
  { label: "Attendance", value: 93, tone: "blue" },
  { label: "Satisfaction", value: 96, tone: "gold" },
  { label: "Staff Happiness", value: 88, tone: "green" },
  { label: "Retention", value: 96, tone: "green" },
  { label: "Compliance", value: 84, tone: "gold" },
];

// ── AI executive brief ──────────────────────────────────────────────────────
export const AI_BRIEF = {
  greeting: "Good morning, Mahesh.",
  intro: "Here are today's priorities across the group:",
  points: [
    "Harrow occupancy increased 3% week-on-week.",
    "Borehamwood has 2 safeguarding actions to review.",
    "Government funding reconciliation is due today.",
    "6 new enquiries require follow-up.",
    "Northwood staffing is below ratio tomorrow.",
  ],
  actions: ["Generate Daily Report", "Email Branch Managers", "Summarise Yesterday", "Forecast Next Week", "Ask AI"],
};

// ── Parent communications ───────────────────────────────────────────────────
export const PARENT_COMMS: { label: string; value: string }[] = [
  { label: "Unread Messages", value: "14" },
  { label: "Pending Replies", value: "6" },
  { label: "Emails Sent Today", value: "128" },
  { label: "SMS Campaign", value: "Sent" },
  { label: "Newsletter Opens", value: "62%" },
  { label: "Push Notifications", value: "9" },
];

// ── 7-day occupancy forecast (normalised 0..1) ──────────────────────────────
export const FORECAST_7D = [0.72, 0.74, 0.71, 0.78, 0.82, 0.8, 0.86];

// Left-sidebar navigation. Visual only — nothing routes.
export const NAV_ITEMS = [
  "Dashboard",
  "Branches",
  "Children",
  "Staff",
  "Enquiries",
  "Admissions",
  "Finance",
  "Attendance",
  "Curriculum",
  "Communication",
  "Events",
  "Reports",
  "Documents",
  "Settings",
] as const;
