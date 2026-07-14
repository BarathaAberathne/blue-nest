// Shared catalogue of the customizable Main Dashboard widgets. Both the per-user
// dashboard (DashboardClient) and the org Dashboard Profile builder use this so
// widget keys/titles/order stay in one place.
export const DASHBOARD_WIDGETS: { key: string; title: string }[] = [
  { key: "kpis", title: "Key metrics" },
  { key: "lowstock", title: "Low-stock alerts" },
  { key: "recent-orders", title: "Recent orders" },
  { key: "quick-actions", title: "Quick actions" },
];

export const DASHBOARD_WIDGET_KEYS = DASHBOARD_WIDGETS.map((w) => w.key);

export const DASHBOARD_WIDGET_TITLES: Record<string, string> = Object.fromEntries(
  DASHBOARD_WIDGETS.map((w) => [w.key, w.title]),
);
