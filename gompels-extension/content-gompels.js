// Runs on gompels.co.uk (Quick Order, /quick-add.html). Fills the admin's
// logged-in cart with the queued Blue Nest order, then redirects to
// /checkout/cart/ (which has the "E-Mail Basket" option). Reports per-line
// results to chrome.storage (the popup shows live progress).
//
// Mechanism (captured live from the Quick Order grid):
//  - Each row has  input[name="model[]"]  (search by product CODE or NAME).
//  - The search is DEBOUNCED on real keystrokes, so we type character-by-
//    character with key events (bulk-setting the value is unreliable).
//  - An exact CODE auto-resolves the row (or shows a 1-item autocomplete);
//    a NAME shows a jQuery-UI autocomplete (ul.ui-autocomplete.quickadd >
//    li.ui-menu-item > a.product-list with .name/.price). We pick the cheapest
//    relevant match for names, or the first item for a code.
//  - On resolve the row's td.units form shows input[name="quantity"] ("Packets");
//    setting it + blur commits the line (row td.total-quantity updates).
//  - 5 rows per page; a "Next" control reveals more empty rows.

(function () {
  "use strict";

  const SEL = {
    emptyCode: 'input[name="model[]"]:not([disabled])',
    autocomplete: "ul.ui-autocomplete.quickadd",
    suggestion: "li.ui-menu-item",
    qtyInRow: 'td.units form.add-to-cart input[name="quantity"]',
    totalQtyCell: "td.total-quantity",
    // Best-effort: a basket/quote reference, if Gompels exposes one on the page.
    orderRef: "[data-order-number], .order-number, .quote-number",
  };
  let filling = false; // guards against a double fill on the same page
  const RESOLVE_TIMEOUT_MS = 9000;
  const COMMIT_TIMEOUT_MS = 5000;
  const TYPE_DELAY_MS = 80;
  const log = (...a) => console.log("[BlueNest→Gompels]", ...a);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const firstEmptyCode = () => document.querySelector(SEL.emptyCode);

  async function waitFor(getter, timeout, interval = 150) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = getter();
      if (v) return v;
      await sleep(interval);
    }
    return null;
  }

  function setNativeValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // Type char-by-char with key events so the debounced search actually fires.
  async function typeInto(el, text) {
    el.focus();
    setNativeValue(el, "");
    for (const ch of text) {
      el.dispatchEvent(new KeyboardEvent("keydown", { key: ch, bubbles: true }));
      setNativeValue(el, el.value + ch);
      el.dispatchEvent(new KeyboardEvent("keyup", { key: ch, bubbles: true }));
      await sleep(TYPE_DELAY_MS);
    }
  }

  function clickItem(el) {
    for (const type of ["mouseover", "mousedown", "mouseup", "click"]) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true }));
    }
  }

  function suggestions() {
    const ul = document.querySelector(SEL.autocomplete);
    if (!ul || ul.offsetParent === null) return [];
    return [...ul.querySelectorAll(SEL.suggestion)]
      .map((li) => ({
        li: li.querySelector("a") || li,
        name: li.querySelector(".name")?.innerText.trim() || "",
        price: parseFloat((li.querySelector(".price")?.innerText || "").replace(/[£,]/g, "")) || Infinity,
      }))
      .filter((x) => x.name);
  }

  // Cheapest suggestion, preferring ALL query words, then ANY, then all.
  function pickCheapest(query) {
    const items = suggestions();
    if (items.length === 0) return null;
    const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const hasAll = (x) => tokens.every((t) => x.name.toLowerCase().includes(t));
    const hasAny = (x) => tokens.some((t) => x.name.toLowerCase().includes(t));
    let pool = tokens.length ? items.filter(hasAll) : [];
    if (pool.length === 0 && tokens.length) pool = items.filter(hasAny);
    if (pool.length === 0) pool = items;
    pool.sort((a, b) => a.price - b.price);
    return pool[0];
  }

  async function ensureEmptyRow() {
    if (firstEmptyCode()) return true;
    const next = [...document.querySelectorAll("button, a")].find(
      (b) => (b.innerText || "").trim().toLowerCase() === "next",
    );
    if (!next) return false;
    next.click();
    return !!(await waitFor(firstEmptyCode, 4000));
  }

  // A row reads as "unavailable" when Gompels shows an out-of-stock/discontinued
  // marker instead of a usable add-to-cart form. Best-effort (markup-dependent).
  function isRowUnavailable(row) {
    if (row.querySelector(SEL.qtyInRow)) return false; // has a qty form → addable
    const txt = (row.innerText || "").toLowerCase();
    return /out of stock|unavailable|discontinued|no longer|not available/.test(txt);
  }

  // Type a query into the row's code input and wait for it to resolve to either
  // an auto-added row (exact code) or an autocomplete menu (name). Returns the
  // outcome, or null if nothing resolved within the timeout (2 attempts to clear
  // flaky/no-fire typing).
  async function resolveQuery(codeInput, row, query) {
    for (let attempt = 0; attempt < 2; attempt++) {
      await typeInto(codeInput, query);
      const outcome = await waitFor(() => {
        if (row.querySelector(SEL.qtyInRow)) return { mode: "auto" };
        if (suggestions().length) return { mode: "menu" };
        return null;
      }, RESOLVE_TIMEOUT_MS);
      if (outcome) return outcome;
      setNativeValue(codeInput, "");
      await sleep(400);
    }
    return null;
  }

  // Add one line → { status, picked?, resolvedCode?, substituted? }.
  // status: added | not_found | failed.
  //  - by CODE first; if the code is missing / doesn't resolve / is unavailable,
  //    fall back to a NAME search and pick the cheapest relevant alternative
  //    (substituted=true). No usable match → not_found (caller continues).
  async function addLine(line) {
    if (!(await ensureEmptyRow())) return { status: "failed" };
    const codeInput = firstEmptyCode();
    if (!codeInput) return { status: "failed" };
    const row = codeInput.closest("tr");
    if (!line.code && !line.name) return { status: "failed" };
    let picked = null;
    let substituted = false;

    // Resolve `query` in this row and confirm it yields an addable product.
    const tryResolve = async (query, isCode) => {
      const outcome = await resolveQuery(codeInput, row, query);
      if (!outcome) return false;
      if (outcome.mode === "menu") {
        const choice = isCode ? suggestions()[0] : pickCheapest(query);
        if (!choice) return false;
        if (!isCode) picked = { name: choice.name, price: choice.price };
        clickItem(choice.li);
      }
      const qty = await waitFor(() => row.querySelector(SEL.qtyInRow), RESOLVE_TIMEOUT_MS);
      return !!qty && !isRowUnavailable(row);
    };

    let ok = false;
    if (line.code) ok = await tryResolve(line.code, true);
    // Item not available (or no code): look for an alternative by description.
    if (!ok && line.name) {
      setNativeValue(codeInput, "");
      await sleep(300);
      if (await tryResolve(line.name, false)) {
        ok = true;
        if (line.code) substituted = true; // had a code but used a search match
      }
    }
    if (!ok) {
      log("not found / unavailable:", line.code || line.name);
      return { status: "not_found", picked, substituted };
    }

    const qty = row.querySelector(SEL.qtyInRow);
    // Increase quantity if it's already in the basket: the Quick Order qty field
    // reflects the current basket qty, so we ADD our line qty rather than
    // overwrite (a fresh product reads as 0). Same product appearing twice in one
    // order is pre-merged in runFill, so this also covers within-order repeats.
    const existing = parseInt((qty.value || "").replace(/[^0-9]/g, ""), 10) || 0;
    const target = existing + Number(line.qty || 0);
    setNativeValue(qty, String(target));
    qty.dispatchEvent(new Event("blur", { bubbles: true }));

    const ok2 = await waitFor(
      () => (row.querySelector(SEL.totalQtyCell)?.innerText || "").trim() === String(target),
      COMMIT_TIMEOUT_MS,
    );
    // The resolved Gompels code (from the row's add-to-cart form, or the now-
    // disabled code input). Lets the app "learn" search-resolved codes.
    const resolvedCode =
      row.querySelector("td.units form.add-to-cart")?.getAttribute("data-model") ||
      row.querySelector('input[name="model[]"]')?.value ||
      line.code || "";
    log(line.code || line.name, "→", ok2 ? `added (qty ${target})` : "failed",
      picked ? `(picked ${picked.name} = ${resolvedCode})` : "", substituted ? "[substituted]" : "");
    await sleep(400);
    return { status: ok2 ? "added" : "failed", picked, resolvedCode, substituted, qty: target };
  }

  // Merge duplicate lines (same code, or same name when un-coded) into one,
  // summing quantities — so a product repeated across the order becomes a single
  // basket line at the combined qty instead of duplicate rows.
  function mergeLines(lines) {
    const byKey = new Map();
    for (const line of lines) {
      const key = (line.code || (line.name || "").trim().toLowerCase()) || JSON.stringify(line);
      const prev = byKey.get(key);
      if (prev) prev.qty = Number(prev.qty || 0) + Number(line.qty || 0);
      else byKey.set(key, { ...line, qty: Number(line.qty || 0) });
    }
    return [...byKey.values()];
  }

  async function runFill() {
    if (filling) return; // already running on this page
    filling = true;
    const { order } = await chrome.storage.local.get("order");
    if (!order || !Array.isArray(order.lines) || order.lines.length === 0) return;

    // Wait for the grid (and its search JS) to be ready before typing.
    await waitFor(firstEmptyCode, 8000);
    await sleep(600);

    order.status = "filling";
    order.results = [];
    await chrome.storage.local.set({ order });

    for (const line of mergeLines(order.lines)) {
      let res = { status: "failed" };
      try {
        res = await addLine(line);
      } catch (e) {
        console.error("[BlueNest→Gompels] line failed", line, e);
      }
      order.results.push({
        name: line.name || "",
        status: res.status,
        resolved_code: res.resolvedCode || line.code || "",
        catalogue_item_id: line.catalogue_item_id || "",
        picked: res.picked || null,
        picked_name: res.picked?.name || "",
        searched: !line.code || !!res.substituted,
        substituted: !!res.substituted,
        qty: res.qty || line.qty || 0,
      });
      await chrome.storage.local.set({ order });
    }

    // Best-effort: capture a Gompels basket/quote reference if one is shown, so
    // the app can record it on the purchase order. Usually empty at this stage
    // (the admin enters it in the PO "Track" step) — purely additive.
    const refEl = document.querySelector(SEL.orderRef);
    if (refEl) order.supplierOrderRef = (refEl.innerText || "").trim();

    // Settle the last commit, then mark done. The background worker watches for
    // "done" and navigates this tab to the basket page (/checkout/cart/, which
    // has the E-Mail Basket option) — more reliable than navigating from here.
    await sleep(900);
    order.status = "done";
    await chrome.storage.local.set({ order });
  }

  // ── Empty the basket before filling ────────────────────────────
  // A fresh run first clears the Gompels basket so re-adding a product never
  // collides with leftovers. Done **server-side via fetch** from this page (no
  // tab navigation, which was fragile): we read the basket page HTML, then POST
  // each item's Magento delete action (with the session cookie + form_key).
  // Whatever happens, we always proceed to the fill — clearing never blocks it.
  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }

  async function clearBasketViaFetch() {
    for (let pass = 0; pass < 10; pass++) {
      let doc;
      try {
        const html = await (await fetch("/checkout/cart/", { credentials: "include" })).text();
        doc = new DOMParser().parseFromString(html, "text/html");
      } catch (e) {
        log("clear: cart fetch failed", e);
        return false;
      }
      const formKey =
        getCookie("form_key") || doc.querySelector('input[name="form_key"]')?.value || "";
      const dels = [...doc.querySelectorAll("a[data-post]")]
        .map((a) => {
          try { return JSON.parse(a.getAttribute("data-post")); } catch { return null; }
        })
        .filter((p) => p && /cart\/delete/.test(p.action || ""));
      if (dels.length === 0) return true; // basket already empty
      for (const p of dels) {
        const body = new URLSearchParams();
        Object.entries(p.data || {}).forEach(([k, v]) => body.set(k, String(v)));
        if (formKey && !body.has("form_key")) body.set("form_key", formKey);
        try {
          await fetch(p.action, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
          });
        } catch (e) {
          log("clear: delete failed", e);
        }
      }
    }
    return false; // gave up after 10 passes — proceed to fill anyway
  }

  // Start a fresh run: empty the basket, then reload Quick Order so the grid
  // reflects the now-empty basket; drive() resumes the fill after the reload.
  async function beginFill() {
    let { order } = await chrome.storage.local.get("order");
    if (!order) return;
    order.status = "clearing";
    order.results = [];
    await chrome.storage.local.set({ order });

    await clearBasketViaFetch();

    ({ order } = await chrome.storage.local.get("order")); // re-read (may have changed)
    if (!order) return;
    order.status = "filling";
    await chrome.storage.local.set({ order });
    // Fresh page so the qty fields reflect the empty basket, then drive() fills.
    location.reload();
  }

  // Runs on every Gompels page load — continues whatever stage is in progress.
  async function drive() {
    const { order, settings } = await chrome.storage.local.get(["order", "settings"]);
    if (!order || !location.pathname.includes("quick-add")) return;
    if (order.status === "filling") {
      await runFill();
    } else if (order.status === "clearing") {
      await beginFill(); // interrupted mid-clear — restart cleanly
    } else if (order.status === "queued" && settings?.autoStart) {
      await beginFill();
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "BLUENEST_START_FILL") {
      chrome.storage.local.get("order", ({ order }) => {
        if (!order) { sendResponse({ ok: false }); return; }
        if (order.status === "filling") runFill(); // resume after the post-clear reload
        else beginFill(); // queued / done / clearing → fresh clear + fill
        sendResponse({ ok: true });
      });
      return true;
    }
    return false;
  });

  drive();
})();
