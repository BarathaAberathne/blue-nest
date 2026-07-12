"use client";

// Live data wiring for the MD Command Centre. The dashboard is otherwise static
// mock; this hook pulls the *real* enquiries/admissions pipeline from the
// backend (`GET /admin/enquiries/stats`) when the viewer is signed in (director
// or any management role), and falls back to the static mock when there is no
// token or the request fails — so the page still renders for an anonymous demo.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { EnquiryStats } from "@/types";
import { CONVERSION_PCT, FUNNEL, type FunnelStage } from "./data";

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
