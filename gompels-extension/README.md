# Blue Nest → Gompels cart (Chrome extension)

Turns a generated supply order in the Blue Nest admin into a one-click fill of your
**logged-in Gompels Quick Order cart**. It never stores your Gompels password and
never pays — it stops once the cart is filled, so you review and pay (or use
Gompels' own "email basket") yourself.

## How it works
1. In the Blue Nest admin, run the **New order** wizard on `/admin/order-requests` (or open a
   generated **Gompels** cart at `/admin/purchase-carts/{id}` and click **Send to Gompels cart**).
2. The extension receives the order and opens the Gompels **Quick Order** page
   (`gompels.co.uk/quick-add.html`), then **fills automatically** (auto-fill is on by default; the
   popup's **Fill cart now** re-runs it manually).
3. It first **empties your Gompels basket** (server-side: it reads the basket page and removes every
   line via Magento's delete, using your logged-in session), then reloads Quick Order and adds the
   items. So a re-run never collides with leftovers. (If clearing can't run, the fill still proceeds.)
   For each line it adds the item to your cart: **by code** when present, or — when a
   line has no code — by **searching the description and picking the cheapest relevant
   match** (shown in the popup so you can check it). It reports anything it couldn't add.
   Edge cases it handles:
   - **Already in the basket** (e.g. if you skipped the auto-clear) → it reads the current
     quantity and **increases** it rather than overwriting. Lines for the same product repeated
     across one order are merged into a single basket line at the combined quantity.
   - **Item not available** (a code that's discontinued / out of stock) → it **looks for an
     alternative** by searching the description and picking the cheapest relevant match,
     flagged as *substituted* in the results so you can review/accept it.
   - **No match found** → it reports the line as *not found* and **continues** with the rest,
     so you can add that one manually in Gompels.
4. When done it **reports results back to the Blue Nest app** (marks the order placed, flips the
   covered requests to ordered, and passes a best-effort Gompels basket reference if one is shown) and
   **redirects to `/checkout/cart/`** — the basket page with the **E-Mail Basket** option — so you
   review and pay or email the basket. Back in the app, the purchase order's **Track** step shows the
   fill results, where you can **Accept** a search-resolved item to save its code into the catalogue
   for next time.

The **popup** shows live progress: a summary bar with counts and a per-line list with status chips
(**added**, **substituted** when an unavailable code fell back to a search match, **not found** when
nothing matched). Already-in-basket items have their quantity **increased** rather than duplicated.

Tip: **Auto-fill when the Gompels tab opens** is on by default (untick it in the popup to fill
manually with **Fill cart now**). The popup's **Clear Gompels cart** button empties your basket
without filling — handy to reset and re-run a fill from a fresh basket.

## Install (unpacked, Developer Mode)
1. Open `chrome://extensions`.
2. Toggle **Developer mode** (top-right).
3. Click **Load unpacked** and select this `gompels-extension/` folder.
4. Pin the extension. Make sure you're **logged into gompels.co.uk** in the same browser.

To update after code changes: hit **Reload** on the extension card in `chrome://extensions`.

## Files
- `manifest.json` — MV3 config + permissions (storage, tabs) and host permissions
  (gompels.co.uk + the Blue Nest admin origins).
- `background.js` — stores the queued order, opens/focuses the Gompels tab.
- `content-bluenest.js` — on the admin site: marks the page as "extension installed"
  and relays the order (via `postMessage`) to the background worker.
- `content-gompels.js` — on gompels.co.uk: the auto-fill engine (selectors in the
  `SEL` block; finalised against the real logged-in Quick Order page).
- `popup.html` / `popup.js` — shows the queued order, **Fill cart now**, and progress.

## Notes / limitations
- Gompels has no public API; this drives the Quick Order UI, so it can break if Gompels
  changes their markup — fix the selectors in `content-gompels.js` (`SEL`).
- Payment and the "email basket" stay manual in Gompels.
- Long-term, ask Gompels about a supported punchout/order-upload integration to replace this.
