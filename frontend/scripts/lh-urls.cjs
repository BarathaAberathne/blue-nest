"use strict";

const { discoverRoutes } = require("./lh-discover-routes.cjs");

const PORT = process.env.LH_PORT || "3000";
const HOST = process.env.LH_HOST || "http://localhost";

function buildUrls() {
  const base = `${HOST}:${PORT}`;
  return discoverRoutes().map((p) => base + (p === "/" ? "/" : p));
}

module.exports = { buildUrls };
