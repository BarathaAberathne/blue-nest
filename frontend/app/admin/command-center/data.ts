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
