"use strict";

const { buildUrls } = require("./scripts/lh-urls.cjs");

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready|started server|Local:",
      url: buildUrls(),
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
      outputDir: "./lighthouse-reports/mobile",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%",
    },
  },
};
