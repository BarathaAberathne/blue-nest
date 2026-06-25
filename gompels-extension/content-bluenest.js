// Runs on the Blue Nest admin site. Jobs:
//  1) Answer the app's PING so the app can reliably tell the extension is live
//     (a DOM marker can be stripped by framework hydration — PING/PONG is robust).
//  2) Relay a generated order (posted by the app) to the background worker, which
//     stores it and opens the Gompels Quick Order tab; then ACK back to the app.

(function () {
  const VERSION = chrome.runtime.getManifest().version;
  const ORIGIN = window.location.origin;

  // Best-effort presence marker (belt-and-suspenders alongside PING/PONG).
  try {
    document.documentElement.dataset.bluenestGompels = VERSION;
  } catch {
    /* ignore */
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "bluenest-app") return;

    if (data.type === "BLUENEST_GOMPELS_PING") {
      window.postMessage({ source: "bluenest-ext", type: "BLUENEST_GOMPELS_PONG", version: VERSION }, ORIGIN);
      return;
    }

    if (data.type === "BLUENEST_GOMPELS_ORDER") {
      // Lines may be coded or un-coded (un-coded → searched by name on Gompels).
      const lines = Array.isArray(data.lines)
        ? data.lines
            .filter((l) => l && (l.code || l.name))
            .map((l) => ({
              code: l.code ? String(l.code).trim() : "",
              qty: Math.max(1, parseInt(l.qty, 10) || 1),
              name: l.name || "",
              catalogue_item_id: l.catalogue_item_id || "",
            }))
        : [];
      if (lines.length === 0) return;

      // Read the admin's own token (same origin) so the background worker can
      // report results back to our API after the fill. Never logged.
      let token = "";
      try {
        token = window.localStorage.getItem("access_token") || "";
      } catch {
        /* ignore */
      }

      chrome.runtime.sendMessage(
        { type: "BLUENEST_GOMPELS_ORDER", lines, cartId: data.cart_id || "", apiOrigin: ORIGIN, token },
        () => {
          // ACK only after the background worker has the order (it then opens the
          // Gompels tab). The app waits for this before claiming success.
          window.postMessage({ source: "bluenest-ext", type: "BLUENEST_GOMPELS_ACK", count: lines.length }, ORIGIN);
        },
      );
    }
  });
})();
