#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function pct(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return String(Math.round(n * 100));
}

function ms(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return Math.round(n) + "ms";
}

function cls(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(3);
}

function summarize(dir) {
  const rows = [];
  if (!fs.existsSync(dir)) return rows;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    let report;
    try {
      report = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch {
      continue;
    }
    if (!report.categories) continue;
    let url = report.finalDisplayedUrl || report.finalUrl || report.requestedUrl || "";
    try {
      url = new URL(url).pathname || "/";
    } catch {
      // ignore
    }
    rows.push({
      url,
      perf: report.categories.performance?.score ?? null,
      a11y: report.categories.accessibility?.score ?? null,
      bp: report.categories["best-practices"]?.score ?? null,
      seo: report.categories.seo?.score ?? null,
      lcp: report.audits["largest-contentful-paint"]?.numericValue ?? null,
      cls: report.audits["cumulative-layout-shift"]?.numericValue ?? null,
      tbt: report.audits["total-blocking-time"]?.numericValue ?? null,
      fcp: report.audits["first-contentful-paint"]?.numericValue ?? null,
      si: report.audits["speed-index"]?.numericValue ?? null,
    });
  }
  rows.sort((a, b) => a.url.localeCompare(b.url));
  return rows;
}

function table(rows, label) {
  const header = `\n=== ${label} ===\n` +
    "Route                                Perf  A11y  BP   SEO  LCP        CLS    TBT       FCP        SI";
  const lines = [header];
  let totals = { perf: 0, a11y: 0, bp: 0, seo: 0, n: 0 };
  for (const r of rows) {
    lines.push(
      r.url.padEnd(36) +
        pct(r.perf).padStart(5) +
        pct(r.a11y).padStart(6) +
        pct(r.bp).padStart(5) +
        pct(r.seo).padStart(5) +
        "  " + ms(r.lcp).padStart(9) +
        "  " + cls(r.cls).padStart(5) +
        "  " + ms(r.tbt).padStart(8) +
        "  " + ms(r.fcp).padStart(9) +
        "  " + ms(r.si).padStart(9),
    );
    totals.perf += r.perf || 0;
    totals.a11y += r.a11y || 0;
    totals.bp += r.bp || 0;
    totals.seo += r.seo || 0;
    totals.n += 1;
  }
  if (totals.n) {
    lines.push(
      "AVERAGE".padEnd(36) +
        pct(totals.perf / totals.n).padStart(5) +
        pct(totals.a11y / totals.n).padStart(6) +
        pct(totals.bp / totals.n).padStart(5) +
        pct(totals.seo / totals.n).padStart(5),
    );
  }
  return lines.join("\n");
}

const root = path.join(__dirname, "..", "lighthouse-reports");
const mobile = summarize(path.join(root, "mobile"));
const desktop = summarize(path.join(root, "desktop"));

if (mobile.length) console.log(table(mobile, "MOBILE"));
if (desktop.length) console.log(table(desktop, "DESKTOP"));

module.exports = { summarize };
