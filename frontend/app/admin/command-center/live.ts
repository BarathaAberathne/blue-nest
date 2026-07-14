"use client";

// Live data wiring for the MD Command Centre. The dashboard is otherwise static
// mock; this hook pulls the *real* enquiries/admissions pipeline from the
// backend (`GET /admin/enquiries/stats`) when the viewer is signed in (director
// or any management role), and falls back to the static mock when there is no
// token or the request fails — so the page still renders for an anonymous demo.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { AttendanceStats, ChildStats, DailyStats, EnquiryStats, StaffStats } from "@/types";
import { BRANCH_METRICS, CONVERSION_PCT, FUNNEL, type BranchMetric, type FunnelStage } from "./data";

export type LivePipeline = {
  live: boolean; // true when sourced from the backend
  funnel: FunnelStage[];
  conversion: number;
  enquiriesTotal: number;
  enquiriesNew: number;
  bookedVisits: number;
  applications: number;
  avgResponse: string | null;
};

const fmtHours = (h: number): string => {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

// Static fallback (mirrors data.ts) used before the fetch resolves / when signed out.
const FALLBACK: LivePipeline = {
  live: false,
  funnel: FUNNEL,
  conversion: CONVERSION_PCT,
  enquiriesTotal: 134,
  enquiriesNew: 27,
  bookedVisits: 68,
  applications: 42,
  avgResponse: null,
};

export function useEnquiryPipeline(): LivePipeline {
  const [stats, setStats] = useState<EnquiryStats | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return; // anonymous → keep the static mock
    let cancelled = false;
    api
      .adminGetEnquiryStats(token)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch(() => {
        /* insufficient perms / offline → stay on the static fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return FALLBACK;

  const funnel: FunnelStage[] =
    stats.funnel && stats.funnel.length > 0
      ? stats.funnel.map((f, i) => ({
          label: f.label,
          value: f.value,
          highlight: i === stats.funnel.length - 1,
        }))
      : FUNNEL;

  // Applications = enquiries whose type is an application form (from by_type),
  // falling back to registrations if that breakdown isn't present.
  const applications =
    stats.by_type?.find((t) => /application/i.test(t.label))?.value ?? stats.registrations;

  return {
    live: true,
    funnel,
    conversion: Math.round(stats.conversion_rate),
    enquiriesTotal: stats.total,
    enquiriesNew: stats.new,
    bookedVisits: stats.booked_visits,
    applications,
    avgResponse: stats.has_response_data ? fmtHours(stats.avg_response_hours) : null,
  };
}

// ── Children & attendance live wiring (Phase 1) ──────────────────────────────
// Each endpoint is fetched at most once per session (shared promise) so the
// several widgets that need the same figures don't each fire a request.
let childrenPromise: Promise<ChildStats | null> | null = null;
let attendancePromise: Promise<AttendanceStats | null> | null = null;
let staffPromise: Promise<StaffStats | null> | null = null;

function fetchChildrenOnce(token: string): Promise<ChildStats | null> {
  if (!childrenPromise) childrenPromise = api.adminGetChildStats(token).catch(() => null);
  return childrenPromise;
}
function fetchAttendanceOnce(token: string): Promise<AttendanceStats | null> {
  if (!attendancePromise) attendancePromise = api.adminGetAttendanceToday(token).catch(() => null);
  return attendancePromise;
}
function fetchStaffOnce(token: string): Promise<StaffStats | null> {
  if (!staffPromise) staffPromise = api.adminGetStaffStats(token).catch(() => null);
  return staffPromise;
}
let dailyPromise: Promise<DailyStats | null> | null = null;
function fetchDailyOnce(token: string): Promise<DailyStats | null> {
  if (!dailyPromise) dailyPromise = api.adminGetDailyStats(token).catch(() => null);
  return dailyPromise;
}

export type LiveChildren = {
  live: boolean;
  total: number;
  active: number;
  waitlist: number;
  capacity: number;
  available: number;
  occupancyRate: number;
  raw: ChildStats | null;
};

// Fallback totals mirror data.ts EXEC_KPIS / BRANCH_METRICS.
const FALLBACK_CHILDREN: LiveChildren = {
  live: false, total: 512, active: 512, waitlist: 0,
  capacity: 556, available: 44, occupancyRate: 92, raw: null,
};

export function useChildrenStats(): LiveChildren {
  const [stats, setStats] = useState<ChildStats | null>(null);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    fetchChildrenOnce(token).then((s) => { if (!cancelled && s) setStats(s); });
    return () => { cancelled = true; };
  }, []);
  if (!stats) return FALLBACK_CHILDREN;
  return {
    live: true,
    total: stats.total,
    active: stats.active,
    waitlist: stats.waitlist,
    capacity: stats.capacity,
    available: stats.available,
    occupancyRate: stats.occupancy_rate,
    raw: stats,
  };
}

export type LiveAttendance = {
  live: boolean;
  date: string; // the day the figures actually reflect (may be the latest with data)
  present: number;
  checkedIn: number;
  absent: number;
  expected: number;
  attendanceRate: number;
  latePickups: number;
  raw: AttendanceStats | null;
};

const FALLBACK_ATTENDANCE: LiveAttendance = {
  live: false, date: "", present: 476, checkedIn: 452, absent: 20, expected: 512,
  attendanceRate: 93, latePickups: 3, raw: null,
};

export function useAttendanceToday(): LiveAttendance {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    fetchAttendanceOnce(token).then((s) => { if (!cancelled && s) setStats(s); });
    return () => { cancelled = true; };
  }, []);
  if (!stats) return FALLBACK_ATTENDANCE;
  return {
    live: true,
    date: stats.date,
    present: stats.present,
    checkedIn: stats.checked_in,
    absent: stats.absent,
    expected: stats.expected,
    attendanceRate: stats.attendance_rate,
    latePickups: stats.late_pickups,
    raw: stats,
  };
}

export type LiveStaff = {
  live: boolean;
  date: string; // day the present/leave/sick figures reflect
  total: number;
  present: number;
  onLeave: number;
  training: number;
  sick: number;
  lateArrival: number;
  agency: number;
  absent: number;
  dbsExpiring: number;
  raw: StaffStats | null;
};

// Fallback mirrors data.ts STAFF_STATUS / EXEC_KPIS.
const FALLBACK_STAFF: LiveStaff = {
  live: false, date: "", total: 78, present: 71, onLeave: 3, training: 2, sick: 1,
  lateArrival: 1, agency: 2, absent: 0, dbsExpiring: 2, raw: null,
};

export function useStaffStats(): LiveStaff {
  const [stats, setStats] = useState<StaffStats | null>(null);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    fetchStaffOnce(token).then((s) => { if (!cancelled && s) setStats(s); });
    return () => { cancelled = true; };
  }, []);
  if (!stats) return FALLBACK_STAFF;
  return {
    live: true,
    date: stats.date,
    total: stats.total,
    present: stats.present,
    onLeave: stats.on_leave,
    training: stats.training,
    sick: stats.sick,
    lateArrival: stats.late_arrival,
    agency: stats.agency,
    absent: stats.absent,
    dbsExpiring: stats.dbs_expiring,
    raw: stats,
  };
}

// useBranchMetrics returns the per-branch BranchMetric[] with children,
// occupancy, today's attendance and staff headcount overlaid from live data
// when available; the rest of each card (revenue, sentiment, events) stays on
// the mock until those modules exist. `live` is true when any overlay resolved.
export function useBranchMetrics(): { metrics: BranchMetric[]; live: boolean } {
  const children = useChildrenStats();
  const attendance = useAttendanceToday();
  const staff = useStaffStats();
  if (!children.live && !attendance.live && !staff.live) return { metrics: BRANCH_METRICS, live: false };

  const childBy = new Map((children.raw?.branches ?? []).map((b) => [b.branch, b]));
  const attBy = new Map((attendance.raw?.branches ?? []).map((b) => [b.branch, b]));
  const staffBy = new Map((staff.raw?.branches ?? []).map((b) => [b.branch, b]));
  const metrics = BRANCH_METRICS.map((m) => {
    const c = childBy.get(m.slug);
    const a = attBy.get(m.slug);
    const s = staffBy.get(m.slug);
    return {
      ...m,
      children: c ? c.children : m.children,
      occupancy: c ? c.occupancy_rate : m.occupancy,
      attendanceToday: a ? a.attendance_rate : m.attendanceToday,
      staff: s ? s.total : m.staff,
    };
  });
  return { metrics, live: children.live || attendance.live || staff.live };
}

// staffPresentByBranch is a helper for the People tab: slug → present count.
export function staffPresentByBranch(staff: LiveStaff): Map<string, number> {
  return new Map((staff.raw?.branches ?? []).map((b) => [b.branch, b.present]));
}

// ── Daily records (safeguarding / incidents / medication / meals) ────────────
export type LiveDaily = {
  live: boolean;
  safeguardingOpen: number;
  incidentsToday: number;
  medicationDue: number;
  mealsServed: number;
  observationsWeek: number;
  raw: DailyStats | null;
};

// Fallback mirrors data.ts Operations tiles / Safeguarding KPI.
const FALLBACK_DAILY: LiveDaily = {
  live: false, safeguardingOpen: 2, incidentsToday: 1, medicationDue: 5,
  mealsServed: 386, observationsWeek: 48, raw: null,
};

export function useDailyStats(): LiveDaily {
  const [stats, setStats] = useState<DailyStats | null>(null);
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    fetchDailyOnce(token).then((s) => { if (!cancelled && s) setStats(s); });
    return () => { cancelled = true; };
  }, []);
  if (!stats) return FALLBACK_DAILY;
  return {
    live: true,
    safeguardingOpen: stats.safeguarding_open,
    incidentsToday: stats.incidents_today,
    medicationDue: stats.medication_due,
    mealsServed: stats.meals_served,
    observationsWeek: stats.observations_week,
    raw: stats,
  };
}
