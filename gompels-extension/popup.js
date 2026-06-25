// Popup: shows the queued order, lets the admin trigger the fill on the Gompels
// tab, and reflects live progress (the Gompels content script writes results to
// chrome.storage as it goes).

const contentEl = document.getElementById("content");
const fillBtn = document.getElementById("fill");
const hintEl = document.getElementById("hint");
const autostartEl = document.getElementById("autostart");

// Auto-start setting (fill as soon as the Gompels tab opens).
chrome.storage.local.get("settings", ({ settings }) => {
  autostartEl.checked = !!settings?.autoStart;
});
autostartEl.addEventListener("change", () => {
  chrome.storage.local.get("settings", ({ settings }) => {
    chrome.storage.local.set({ settings: { ...(settings || {}), autoStart: autostartEl.checked } });
  });
});

// Classify a per-line result into a tag {cls, label} for the chips/badges.
function tagFor(r) {
  if (!r || !r.status) return { cls: "", label: "queued" };
  if (r.status === "added") {
    if (r.substituted) return { cls: "sub", label: "substituted" };
    return { cls: "ok", label: "added" };
  }
  if (r.status === "not_found") return { cls: "bad", label: "not found" };
  if (r.status === "failed") return { cls: "bad", label: "failed" };
  return { cls: "", label: "queued" };
}
function esc(s) {
  return String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function render(order) {
  if (!order || !Array.isArray(order.lines) || order.lines.length === 0) {
    fillBtn.hidden = true;
    hintEl.hidden = true;
    return;
  }
  const results = order.results || []; // same order as lines
  const total = order.lines.length;

  // Summary counts.
  let added = 0, substituted = 0, failed = 0, processed = 0;
  for (const r of results) {
    if (!r || !r.status) continue;
    processed++;
    if (r.status === "added") { added++; if (r.substituted) substituted++; }
    else failed++;
  }
  const pct = total ? Math.round((processed / total) * 100) : 0;
  const phase =
    order.status === "clearing" ? "emptying basket…"
    : order.status === "filling" ? "filling…"
    : order.status === "done" ? "done"
    : "ready";

  const chips =
    `<span class="chip ok">✓ ${added} added</span>` +
    (substituted ? `<span class="chip sub">↻ ${substituted} substituted</span>` : "") +
    (failed ? `<span class="chip bad">✕ ${failed} not added</span>` : "");

  const list = order.lines
    .map((l, i) => {
      const r = results[i] || {};
      const tag = tagFor(r);
      const codeBit = l.code ? `<span class="code">${esc(l.code)}</span> ` : `<span class="muted">search </span>`;
      const qtyBit = r.status === "added" && r.qty ? ` <span class="muted">(qty ${r.qty})</span>` : "";
      // For searched/substituted lines, show what the extension picked.
      const picked = r.picked && r.picked.name
        ? `<div class="muted">→ ${esc(r.picked.name).slice(0, 44)}${r.picked.price < Infinity ? ` £${r.picked.price.toFixed(2)}` : ""}</div>`
        : "";
      return (
        `<div class="row"><span class="name">${codeBit}×${l.qty}${qtyBit}` +
        `<div class="muted">${esc(l.name).slice(0, 46)}</div>${picked}</span>` +
        `<span class="tag ${tag.cls}">${tag.label}</span></div>`
      );
    })
    .join("");

  contentEl.innerHTML =
    `<div class="muted">${total} line(s) · ${phase}${processed ? ` · ${processed}/${total}` : ""}</div>` +
    `<div class="summary"><div class="bar"><span style="width:${pct}%"></span></div>` +
    `<div class="chips">${chips}</div></div>` +
    `<div class="list">${list}</div>`;

  const busy = order.status === "filling" || order.status === "clearing";
  fillBtn.hidden = false;
  fillBtn.disabled = busy;
  fillBtn.textContent =
    order.status === "clearing" ? "Emptying basket…"
    : order.status === "filling" ? "Filling…"
    : order.status === "done" ? "Fill again"
    : "Fill cart now";
  hintEl.hidden = false;
}

chrome.storage.local.get("order", ({ order }) => render(order));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.order) render(changes.order.newValue);
});

fillBtn.addEventListener("click", () => {
  chrome.tabs.query({ url: "https://www.gompels.co.uk/*" }, (tabs) => {
    const tab = tabs.find((t) => (t.url || "").includes("quick-add")) || tabs[0];
    if (!tab) {
      hintEl.textContent = "Open the Gompels Quick Order page first (gompels.co.uk/quick-add.html), logged in.";
      hintEl.hidden = false;
      return;
    }
    chrome.tabs.update(tab.id, { active: true });
    chrome.tabs.sendMessage(tab.id, { type: "BLUENEST_START_FILL" }, () => {
      // ignore response; progress comes via storage
      if (chrome.runtime.lastError) {
        hintEl.textContent = "Couldn’t reach the Gompels page — reload it and try again.";
        hintEl.hidden = false;
      }
    });
  });
});
