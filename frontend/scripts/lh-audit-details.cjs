#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const reportPath = process.argv[2];
const auditId = process.argv[3];
if (!reportPath || !auditId) {
  console.error("usage: lh-audit-details.cjs <report.json> <audit-id>");
  process.exit(1);
}

const r = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const a = r.audits[auditId];
if (!a) {
  console.error("audit not found");
  process.exit(1);
}

console.log(`Audit: ${a.title}`);
console.log(`Description: ${(a.description || "").split("\n")[0].slice(0, 200)}`);
console.log(`Score: ${a.score}`);
console.log(`Display value: ${a.displayValue || ""}`);

const items = a.details?.items || [];
console.log(`\nItems (${items.length}):`);
for (const item of items.slice(0, 10)) {
  console.log(JSON.stringify(item, null, 2));
}
