// Service worker: coordinates the handoff. Receives the order from the Blue Nest
// content script, stores it, and opens/focuses the Gompels Quick Order tab.

const QUICK_ORDER_URL = "https://www.gompels.co.uk/quick-add.html";
const CART_URL = "https://www.gompels.co.uk/checkout/cart/";

// Clearing + filling both happen on the Quick Order tab now (clearing is done
// server-side via fetch, then the page reloads to fill), so the worker only acts
// on completion: report results to our API, then send the admin to the basket
// page (which has the "E-Mail Basket" option). Done here (not the content script)
// so a mid-fill navigation can't cancel it.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.order) return;
  const prev = changes.order.oldValue?.status;
  const o = changes.order.newValue;
  if (o?.status === "done" && prev !== "done") {
    reportResults(o);
    chrome.tabs.query({ url: "https://www.gompels.co.uk/*" }, (tabs) => {
      const tab = tabs.find((t) => (t.url || "").includes("quick-add")) || tabs[0];
      if (tab && !(tab.url || "").includes("/checkout/cart")) {
        chrome.tabs.update(tab.id, { url: CART_URL, active: true });
      }
    });
  }
});

// POST the per-line results to our admin API (best-effort; uses the admin's own
// token captured at handoff). Closes the loop: cart marked sent + requests ordered.
function reportResults(order) {
  if (!order?.cartId || !order?.apiOrigin || !order?.token) return;
  fetch(`${order.apiOrigin}/api/v1/admin/purchase-carts/${order.cartId}/exported`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${order.token}` },
    body: JSON.stringify({
      results: order.results || [],
      supplier_order_ref: order.supplierOrderRef || "",
    }),
  }).catch((e) => console.warn("[BlueNest→Gompels] result report failed", e));
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "BLUENEST_GOMPELS_ORDER" && Array.isArray(msg.lines)) {
    const order = {
      lines: msg.lines,
      cartId: msg.cartId || "",
      apiOrigin: msg.apiOrigin || "",
      token: msg.token || "",
      createdAt: Date.now(),
      status: "queued", // queued | filling | done
      results: [],
    };
    chrome.storage.local.set({ order }, () => openQuickOrderTab());
    sendResponse({ ok: true, count: msg.lines.length });
    return true;
  }
  return false;
});

// Open the Gompels Quick Order tab, or focus it if already open.
function openQuickOrderTab() {
  chrome.tabs.query({ url: "https://www.gompels.co.uk/*" }, (tabs) => {
    const existing = tabs.find((t) => (t.url || "").includes("quick-add"));
    if (existing) {
      chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId != null) chrome.windows.update(existing.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: QUICK_ORDER_URL });
    }
  });
}
