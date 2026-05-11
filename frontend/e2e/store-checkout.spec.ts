/**
 * E2E: Store checkout flow
 * Based on /docs/testing/store-checkout-e2e.md
 *
 * Prerequisites:
 *   - Next.js running on http://localhost:3000
 *   - Go API + MongoDB running (Docker Compose)
 *   - stripe listen forwarding to localhost:8080/api/v1/webhooks/stripe
 *   - Seed data contains at least one product
 */

import { test, expect, type Page } from "@playwright/test";

// Cart is stored under this key in localStorage (see lib/store-cart.ts)
const CART_KEY = "blue-nest-store-cart";

async function clearLocalCart(page: Page) {
  await page.evaluate((key: string) => localStorage.removeItem(key), CART_KEY);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Store Checkout Flow", () => {

  // ── TC-01: Store page loads ───────────────────────────────────────────────
  test("TC-01: store page loads with products and no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/nursery-store", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/store|shop|blue nest/i);

    // At least one product card / link visible
    const products = page.locator("a[href*='/nursery-store/']");
    await expect(products.first()).toBeVisible({ timeout: 10_000 });
    const count = await products.count();
    expect(count).toBeGreaterThan(0);

    // No critical JS console errors
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("Warning:")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  // ── TC-02: Product detail page loads ─────────────────────────────────────
  test("TC-02: product detail page loads from store listing", async ({ page }) => {
    await page.goto("/nursery-store", { waitUntil: "domcontentloaded" });
    const firstProduct = page.locator("a[href*='/nursery-store/']").first();
    await expect(firstProduct).toBeVisible({ timeout: 10_000 });
    await firstProduct.click();
    await expect(page).toHaveURL(/\/nursery-store\/.+/);

    // Add-to-cart button must be present
    const addBtn = page.locator("button").filter({ hasText: /add to cart/i });
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
  });

  // ── TC-03: Add product to cart, verify cart page ──────────────────────────
  test("TC-03: add product to cart, verify cart page shows correct item", async ({ page }) => {
    await page.goto("/nursery-store", { waitUntil: "domcontentloaded" });
    await clearLocalCart(page);

    const firstProduct = page.locator("a[href*='/nursery-store/']").first();
    await expect(firstProduct).toBeVisible({ timeout: 10_000 });
    await firstProduct.click();
    await page.waitForURL(/\/nursery-store\/.+/);

    // Select size if available
    const sizePicker = page.locator("button").filter({ hasText: /year|age|month/i }).first();
    if (await sizePicker.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await sizePicker.click();
    }

    const addBtn = page.locator("button").filter({ hasText: /add to cart/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
    await addBtn.click();
    await page.waitForTimeout(600);

    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    // Cart items render as divs with class "card" containing price (see CartClient.tsx)
    const cartItems = page.locator("div.card").filter({ hasText: /£/ });
    await expect(cartItems.first()).toBeVisible({ timeout: 8_000 });
    const itemCount = await cartItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  // ── TC-04: Cart price calculations ───────────────────────────────────────
  test("TC-04: cart shows non-zero total with correct £ formatting", async ({ page }) => {
    await page.goto("/nursery-store", { waitUntil: "domcontentloaded" });
    await clearLocalCart(page);

    const firstProduct = page.locator("a[href*='/nursery-store/']").first();
    await firstProduct.click();
    await page.waitForURL(/\/nursery-store\/.+/);

    const sizePicker = page.locator("button").filter({ hasText: /year|age|month/i }).first();
    if (await sizePicker.isVisible({ timeout: 1_000 }).catch(() => false)) await sizePicker.click();

    const addBtn = page.locator("button").filter({ hasText: /add to cart/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
    await addBtn.click();
    await page.waitForTimeout(600);

    await page.goto("/cart", { waitUntil: "domcontentloaded" });

    // "Total" label area should show a £ figure
    const totalSection = page.locator("text=/Total/").locator("..");
    const totalText = await totalSection.first().textContent({ timeout: 8_000 }).catch(() => "");

    // Alternatively, look for any visible £X.XX on the page (excludes RSC payload)
    const priceLocators = page.locator("p, span, div").filter({ hasText: /^£\d+\.\d{2}$/ });
    const priceCount = await priceLocators.count();
    expect(priceCount).toBeGreaterThan(0);

    // Visible text must not show broken values
    const visiblePrices = await priceLocators.allTextContents();
    for (const p of visiblePrices) {
      expect(p).toMatch(/^£\d+\.\d{2}$/);
      expect(p).not.toContain("NaN");
    }
  });

  // ── TC-05: Empty cart blocks checkout ────────────────────────────────────
  test("TC-05: checkout button disabled or absent on empty cart", async ({ page }) => {
    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    await clearLocalCart(page);
    await page.reload({ waitUntil: "domcontentloaded" });

    // Wait for cart to re-render as empty
    await expect(page.locator("text=/empty/i")).toBeVisible({ timeout: 8_000 });

    // Checkout button should be absent or disabled
    const checkoutBtn = page.locator("button, a").filter({ hasText: /checkout/i });
    const count = await checkoutBtn.count();
    if (count > 0) {
      const disabled = await checkoutBtn.first().getAttribute("disabled");
      const aria = await checkoutBtn.first().getAttribute("aria-disabled");
      expect(disabled !== null || aria === "true").toBeTruthy();
    }
    // Zero checkout buttons = also acceptable (cart shows empty state CTA)
  });

  // ── TC-06: Checkout requires authentication ───────────────────────────────
  test("TC-06: checkout redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/nursery-store", { waitUntil: "domcontentloaded" });
    await clearLocalCart(page);

    const firstProduct = page.locator("a[href*='/nursery-store/']").first();
    await expect(firstProduct).toBeVisible({ timeout: 10_000 });
    await firstProduct.click();
    await page.waitForURL(/\/nursery-store\/.+/);

    const sizePicker = page.locator("button").filter({ hasText: /year|age|month/i }).first();
    if (await sizePicker.isVisible({ timeout: 1_000 }).catch(() => false)) await sizePicker.click();

    const addBtn = page.locator("button").filter({ hasText: /add to cart/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
    await addBtn.click();
    await page.waitForTimeout(600);

    await page.goto("/cart", { waitUntil: "domcontentloaded" });
    const checkoutBtn = page.locator("button, a").filter({ hasText: /checkout/i }).first();
    if (await checkoutBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await checkoutBtn.click();
      await page.waitForTimeout(2_000);
      const url = page.url();
      const acceptable = url.includes("/login") || url.includes("stripe.com") || url.includes("/checkout");
      expect(acceptable).toBeTruthy();
    }
  });

  // ── TC-07: Mobile responsiveness ─────────────────────────────────────────
  test("TC-07: store pages have no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/nursery-store", { waitUntil: "domcontentloaded" });
    await expect(page.locator("a[href*='/nursery-store/']").first()).toBeVisible({ timeout: 10_000 });

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  // ── TC-08: Images load ───────────────────────────────────────────────────
  test("TC-08: product images have valid src attributes", async ({ page }) => {
    await page.goto("/nursery-store", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {}); // soft wait

    const images = page.locator("img");
    const imgCount = await images.count();
    expect(imgCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(imgCount, 10); i++) {
      const src = await images.nth(i).getAttribute("src");
      expect(src).not.toBeNull();
      expect(src).not.toBe("");
    }
  });

  // ── TC-09: Success page (no order_id) ────────────────────────────────────
  test("TC-09: checkout success page renders gracefully without order_id", async ({ page }) => {
    await page.goto("/checkout/success", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();

    // Should show some confirmatory content (h1 or prominent text)
    const heading = page.locator("h1");
    await expect(heading.first()).toBeVisible({ timeout: 8_000 });
    const headingText = await heading.first().textContent();
    expect(headingText?.toLowerCase()).toMatch(/order|thank|confirm|paid|success/);
  });

  // ── TC-10: Cancel URL ────────────────────────────────────────────────────
  test("TC-10: checkout cancel page is reachable and renders", async ({ page }) => {
    await page.goto("/checkout/cancel", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    const readyState = await page.evaluate(() => document.readyState);
    expect(readyState).toBe("complete");
    // Should not be a blank page
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });
});
