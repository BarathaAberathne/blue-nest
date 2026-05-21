"use strict";

// Lighthouse config for auditing the LIVE production site at
// https://blue-nest.com. Mobile preset (mirrors lighthouserc.mobile.cjs)
// but skips startServerCommand because there's no local server to spin up.
//
// Run:
//   ../node_modules/.bin/lhci autorun --config=./lighthouserc.prod.cjs

const { discoverRoutes } = require("./scripts/lh-discover-routes.cjs");

const BASE = process.env.LH_PROD_BASE || "https://blue-nest.com";

function buildProdUrls() {
  return discoverRoutes().map((p) => BASE + (p === "/" ? "/" : p));
}

module.exports = {
  ci: {
    collect: {
      // No startServerCommand — auditing remote.
      numberOfRuns: 1,
      url: buildProdUrls(),
      settings: {
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          disabled: false,
        },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        chromeFlags: "--no-sandbox",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-reports/prod",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
};
