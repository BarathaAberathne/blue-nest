#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const dir = process.argv[2] || "lighthouse-reports/desktop";
const root = path.join(__dirname, "..", dir);
const files = fs.readdirSync(root).filter((f) => f.endsWith(".json"));

const issues = new Map();

for (const f of files) {
  let r;
  try {
    r = JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
  } catch {
    continue;
  }
  if (!r.audits || !r.categories) continue;
  const url = (() => {
    try {
      return new URL(r.finalDisplayedUrl || r.finalUrl).pathname || "/";
    } catch {
      return f;
    }
  })();

  for (const [auditId, audit] of Object.entries(r.audits)) {
    if (audit.score === null || audit.score === undefined) continue;
    if (audit.score >= 0.9) continue;
    if (audit.scoreDisplayMode === "manual" || audit.scoreDisplayMode === "notApplicable") continue;
    const cats = Object.entries(r.categories)
      .filter(([_, c]) => c.auditRefs.some((a) => a.id === auditId))
      .map(([k]) => k);
    if (!cats.length) continue;
    if (!issues.has(auditId)) {
      issues.set(auditId, {
        title: audit.title,
        category: cats[0],
        urls: [],
        score: audit.score,
      });
    }
    issues.get(auditId).urls.push(url);
  }
}

const sorted = [...issues.entries()].sort((a, b) => b[1].urls.length - a[1].urls.length);
for (const [id, info] of sorted) {
  console.log(`\n[${info.category}] ${id} (score ${info.score?.toFixed(2)})`);
  console.log(`  ${info.title}`);
  console.log(`  affects ${info.urls.length}/${files.length}: ${info.urls.slice(0, 6).join(", ")}${info.urls.length > 6 ? ` …` : ""}`);
}
