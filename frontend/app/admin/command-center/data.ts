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


export type FunnelStage = { label: string; value: number; highlight?: boolean };

export const FUNNEL: FunnelStage[] = [
  { label: "New Enquiries", value: 134 },
  { label: "Visits Booked", value: 68 },
  { label: "Applications", value: 42 },
  { label: "Offers Made", value: 28 },
  { label: "Enrolled", value: 18, highlight: true },
];

export const CONVERSION_PCT = 22;

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

// ── Per-branch metrics (drive per-branch charts + hover cards) ──────────────
export type BranchMetric = {
  slug: BranchSlug;
  name: string;
  children: number;
  staff: number;
  occupancy: number;
  attendanceToday: number; // % present today
  status: "ok" | "warn" | "bad"; // traffic-light health
  alerts: number; // open alerts / issues
  revenue: string;
  issues: number;
  nextEvent: string;
  review: number;
  attendance: { average: number; days: { day: string; pct: number }[] };
  sentiment: { score: number; points: number[] };
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const mkAtt = (avg: number, pts: number[]) => ({ average: avg, days: DAYS.map((day, i) => ({ day, pct: pts[i] })) });

export const BRANCH_METRICS: BranchMetric[] = [
  {
    slug: "harrow", name: "Harrow", children: 128, staff: 22, occupancy: 95, attendanceToday: 96,
    status: "ok", alerts: 0, revenue: "£72,400",
    issues: 0, nextEvent: "Sports Day · 12 May", review: 4.9,
    attendance: mkAtt(95, [94, 95, 96, 95, 94]),
    sentiment: { score: 4.9, points: [0.4, 0.46, 0.42, 0.55, 0.6, 0.66, 0.72, 0.8, 0.86, 0.92] },
  },
  {
    slug: "pinner", name: "Pinner", children: 142, staff: 24, occupancy: 94, attendanceToday: 94,
    status: "ok", alerts: 1, revenue: "£78,900",
    issues: 1, nextEvent: "Parent Workshop · 31 May", review: 4.8,
    attendance: mkAtt(94, [93, 94, 95, 94, 93]),
    sentiment: { score: 4.8, points: [0.36, 0.4, 0.34, 0.48, 0.52, 0.58, 0.64, 0.72, 0.78, 0.88] },
  },
  {
    slug: "borehamwood", name: "Borehamwood", children: 96, staff: 18, occupancy: 93, attendanceToday: 91,
    status: "warn", alerts: 2, revenue: "£54,200",
    issues: 2, nextEvent: "Graduation · 24 May", review: 4.7,
    attendance: mkAtt(92, [91, 93, 94, 92, 90]),
    sentiment: { score: 4.6, points: [0.3, 0.36, 0.32, 0.4, 0.46, 0.44, 0.52, 0.6, 0.64, 0.74] },
  },
  {
    slug: "northwood", name: "Northwood", children: 44, staff: 9, occupancy: 88, attendanceToday: 88,
    status: "warn", alerts: 1, revenue: "£24,800",
    issues: 0, nextEvent: "Open Day · 07 Jun", review: 4.8,
    attendance: mkAtt(89, [88, 90, 91, 89, 87]),
    sentiment: { score: 4.7, points: [0.34, 0.4, 0.38, 0.46, 0.5, 0.56, 0.62, 0.68, 0.74, 0.82] },
  },
  {
    slug: "pinner-green", name: "Pinner Green", children: 102, staff: 19, occupancy: 90, attendanceToday: 92,
    status: "ok", alerts: 1, revenue: "£58,300",
    issues: 1, nextEvent: "Coffee Morning · 03 Jun", review: 4.8,
    attendance: mkAtt(91, [90, 92, 93, 91, 90]),
    sentiment: { score: 4.8, points: [0.38, 0.42, 0.4, 0.5, 0.54, 0.6, 0.66, 0.72, 0.8, 0.9] },
  },
];

// ── AI Command Centre (the "brain": briefing, confidence, health, actions,
// timeline, suggested questions, quick executive actions) ───────────────────
export const AI_COMMAND = {
  confidence: 94, // AI confidence %
  health: 92, // Nursery Health score
  healthLabel: "STRONG",
  greeting: "Good morning, Dev.",
  summary: "The group is performing well. Two branches need attention today.",
  recommendations: [
    { text: "Review 2 safeguarding actions at Borehamwood", tone: "bad" as const, action: "Review" },
    { text: "Approve funding reconciliation (due today)", tone: "warn" as const, action: "Approve" },
    { text: "Follow up 6 new enquiries to protect conversion", tone: "warn" as const, action: "Assign" },
    { text: "Cover Northwood ratio gap tomorrow AM", tone: "warn" as const, action: "Roster" },
    { text: "Harrow occupancy +3% — promote waitlist offers", tone: "ok" as const, action: "Act" },
  ],
  suggestedQuestions: [
    "Which branch needs my attention today?",
    "Forecast next term's occupancy",
    "Summarise yesterday's incidents",
    "Where are we losing enquiries?",
  ],
  quickActions: [
    "Generate Daily Report",
    "Email Branch Managers",
    "Summarise Yesterday",
    "Forecast Next Week",
  ],
};

// ── Capacity forecast (normalised occupancy 0..1 per range) ─────────────────
export const CAPACITY_FORECAST: Record<"7d" | "30d" | "term", { labels: string[]; points: number[] }> = {
  "7d": { labels: ["M", "T", "W", "T", "F", "S", "S"], points: [0.72, 0.74, 0.71, 0.78, 0.82, 0.6, 0.55] },
  "30d": { labels: ["W1", "W2", "W3", "W4"], points: [0.74, 0.79, 0.83, 0.88] },
  term: { labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"], points: [0.7, 0.76, 0.82, 0.86, 0.9, 0.94] },
};

// ── Expanded finance analytics ──────────────────────────────────────────────
export const FINANCE_ANALYTICS = {
  stats: [
    { label: "Revenue", value: "£245,780", tone: "ok" as const },
    { label: "Expenses", value: "£184,560", tone: "muted" as const },
    { label: "Net Profit", value: "£61,220", tone: "ok" as const },
    { label: "Gov. Funding", value: "£32,780", tone: "accent" as const },
    { label: "Outstanding", value: "£12,480", tone: "bad" as const },
    { label: "Cash Flow", value: "£48,900", tone: "ok" as const },
  ],
  // 12-month revenue trend (normalised) + budget line.
  trend: [0.42, 0.46, 0.5, 0.48, 0.56, 0.6, 0.58, 0.66, 0.7, 0.74, 0.8, 0.86],
  budget: [0.45, 0.48, 0.51, 0.54, 0.57, 0.6, 0.63, 0.66, 0.69, 0.72, 0.75, 0.78],
};

// ── Monthly calendar (static: May 2025 to match the events) ─────────────────
export const CALENDAR = {
  label: "MAY 2025",
  year: 2025,
  month: 4, // 0-indexed May
  // day → event category
  events: {
    12: "sports",
    24: "graduation",
    31: "workshop",
    7: "openday",
    16: "birthday",
    19: "training",
    22: "meeting",
    5: "leave",
  } as Record<number, string>,
  legend: [
    { key: "sports", label: "Events", color: "#36a9ff" },
    { key: "birthday", label: "Birthdays", color: "#d6b36a" },
    { key: "leave", label: "Staff Leave", color: "#ff5c73" },
    { key: "training", label: "Training", color: "#35d07f" },
  ],
};

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
  greeting: "Good morning, Dev.",
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
