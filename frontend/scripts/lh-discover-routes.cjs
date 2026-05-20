#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const APP_DIR = path.join(__dirname, "..", "app");

const EXCLUDED_PREFIXES = [
  "/admin",
  "/account",
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/auth",
];

const PAGE_FILES = new Set([
  "page.tsx",
  "page.ts",
  "page.jsx",
  "page.js",
  "page.mdx",
]);

function isDynamicSegment(seg) {
  return seg.startsWith("[") && seg.endsWith("]");
}

function isRouteGroup(seg) {
  return seg.startsWith("(") && seg.endsWith(")");
}

function isPrivatePath(urlPath) {
  return EXCLUDED_PREFIXES.some(
    (p) => urlPath === p || urlPath.startsWith(p + "/"),
  );
}

function walk(dir, segments, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }

  const hasPage = entries.some((e) => PAGE_FILES.has(e));
  if (hasPage) {
    const urlSegments = segments.filter((s) => !isRouteGroup(s));
    const urlPath = "/" + urlSegments.join("/");
    const normalized = urlPath === "/" ? "/" : urlPath.replace(/\/+$/, "");
    const hasDynamic = urlSegments.some(isDynamicSegment);
    if (!hasDynamic && !isPrivatePath(normalized)) {
      out.add(normalized);
    }
  }

  for (const entry of entries) {
    const full = path.join(dir, entry);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    if (entry === "api") continue;
    walk(full, [...segments, entry], out);
  }
}

function discoverRoutes() {
  if (!fs.existsSync(APP_DIR)) {
    throw new Error(`app directory not found at ${APP_DIR}`);
  }
  const out = new Set();
  walk(APP_DIR, [], out);
  const all = [...out];
  all.sort((a, b) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    return a.localeCompare(b);
  });
  return all;
}

module.exports = { discoverRoutes };

if (require.main === module) {
  const routes = discoverRoutes();
  process.stdout.write(JSON.stringify(routes, null, 2) + "\n");
}
