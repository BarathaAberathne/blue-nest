"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Compass, Globe, MessageSquareReply, Phone, Search, Star } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { fmtDate } from "@/lib/child";
import StatCard from "@/components/admin/ui/StatCard";
import StageBadge from "@/components/admin/ui/StageBadge";
import type { GBPReview, ReviewsAnalytics } from "@/types";

const sentimentAccent: Record<string, string> = { positive: "#16A34A", neutral: "#94A3B8", negative: "#DC2626" };

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-3.5 w-3.5" style={{ color: i <= n ? "#F59E0B" : "#E2E8F0", fill: i <= n ? "#F59E0B" : "#E2E8F0" }} />)}
    </span>
  );
}

function ReviewRow({ r }: { r: GBPReview }) {
  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-800">{r.author} <Stars n={r.rating} /></span>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          {r.reply ? <StageBadge label="replied" accent="green" withDot={false} /> : <StageBadge label="reply due" accent="amber" withDot={false} />}
          {fmtDate(r.date)}
        </span>
      </div>
      {r.text && <p className="mt-1 text-sm text-slate-600">{r.text}</p>}
      {r.reply && <p className="mt-1 rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-500"><span className="font-medium text-slate-600">Reply:</span> {r.reply}</p>}
    </li>
  );
}

export default function ReviewsTab({ slug }: { slug: string }) {
  const [data, setData] = useState<ReviewsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setError("Not authenticated."); setLoading(false); return; }
    api.adminGetBranchReviews(token, slug).then((d) => setData(d as ReviewsAnalytics)).catch(() => setError("Failed to load reviews.")).finally(() => setLoading(false));
  }, [slug]);

  const maxDist = useMemo(() => (data ? Math.max(1, ...data.distribution) : 1), [data]);
  const maxKw = useMemo(() => (data && data.keywords?.length ? Math.max(...data.keywords.map((k) => k.count)) : 1), [data]);
  const sentimentTotal = data ? data.sentiment.positive + data.sentiment.neutral + data.sentiment.negative : 0;

  if (loading) return <p className="text-slate-400">Loading reviews…</p>;
  if (error || !data) return <p className="text-red-500">{error ?? "No review data."}</p>;
  if (data.rating === 0 && data.review_count === 0) {
    return <div className="card p-10 text-center text-sm text-slate-400">No Google Business Profile connected for this branch yet — link one on the General tab, then the Claude digest automation will populate this.</div>;
  }

  const negative = data.negative ?? [];
  const recent = data.recent ?? [];

  return (
    <div className="space-y-6">
      {data.stale && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Showing the last successful sync{data.last_sync ? ` (${fmtDate(data.last_sync)})` : ""} — the GBP digest hasn&apos;t updated in over 48h.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card flex flex-col items-center justify-center p-5">
          <p className="text-4xl font-bold text-slate-900">{data.rating.toFixed(1)}</p>
          <Stars n={Math.round(data.rating)} />
          <p className="mt-1 text-xs text-slate-400">{data.review_count} reviews</p>
        </div>
        <StatCard label="Pending replies" value={data.pending_replies} icon={MessageSquareReply} accent={data.pending_replies > 0 ? "amber" : "green"} />
        <StatCard label="Search views" value={data.insights.search_views} sub="latest day" icon={Search} accent="blue" />
        <StatCard label="Website clicks" value={data.insights.website_clicks} icon={Globe} accent="teal" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Rating trend · 90 days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(d) => d.slice(5)} minTickGap={30} />
              <YAxis domain={[Math.max(0, Math.floor(data.rating - 1)), 5]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="rating" stroke="#0f766e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Sentiment</h2>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {(["positive", "neutral", "negative"] as const).map((k) => {
              const v = data.sentiment[k];
              const pct = sentimentTotal ? (v / sentimentTotal) * 100 : 0;
              return <div key={k} style={{ width: `${pct}%`, background: sentimentAccent[k] }} />;
            })}
          </div>
          <div className="space-y-2 text-sm">
            {(["positive", "neutral", "negative"] as const).map((k) => (
              <div key={k} className="flex items-center justify-between">
                <span className="flex items-center gap-2 capitalize text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ background: sentimentAccent[k] }} />{k}</span>
                <span className="font-semibold text-slate-800">{sentimentTotal ? Math.round((data.sentiment[k] / sentimentTotal) * 100) : 0}%</span>
              </div>
            ))}
          </div>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-widest text-slate-400">Star distribution</h2>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const v = data.distribution[star - 1] ?? 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-slate-500">{star}★</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-amber-400" style={{ width: `${(v / maxDist) * 100}%` }} /></div>
                  <span className="w-6 text-right text-slate-500">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Insights · latest day</h2>
          <div className="space-y-2.5 text-sm">
            <Insight icon={Search} label="Search views" value={data.insights.search_views} />
            <Insight icon={Compass} label="Direction requests" value={data.insights.direction_requests} />
            <Insight icon={Phone} label="Calls" value={data.insights.calls} />
            <Insight icon={Globe} label="Website clicks" value={data.insights.website_clicks} />
          </div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Top keywords</h2>
          {data.keywords?.length ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {data.keywords.map((k) => (
                <span key={k.label} className="font-semibold text-teal-700" style={{ fontSize: `${0.8 + (k.count / maxKw) * 1.1}rem`, opacity: 0.55 + (k.count / maxKw) * 0.45 }}>{k.label}</span>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">No keywords yet.</p>}
        </div>
      </div>

      {negative.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-rose-500">Needs attention</h2>
          <ul className="divide-y divide-slate-100">{negative.map((r) => <ReviewRow key={r.id} r={r} />)}</ul>
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">Recent reviews</h2>
        {recent.length ? <ul className="divide-y divide-slate-100">{recent.map((r) => <ReviewRow key={r.id} r={r} />)}</ul> : <p className="text-sm text-slate-400">No reviews ingested yet.</p>}
      </div>
    </div>
  );
}

function Insight({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-slate-400" /><span className="flex-1 text-slate-500">{label}</span><span className="font-semibold text-slate-800">{value}</span></div>;
}
