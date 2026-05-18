// Thin, safe wrapper around GA4 gtag.
//
// Why this exists:
// - The site has multiple conversion surfaces (contact form, application
//   form, fee-quote enquiry, prospectus download). We want a single
//   reusable call site rather than scattered `window.gtag` checks.
// - gtag must be a no-op when:
//     · the page is rendering on the server,
//     · the user has an ad-blocker,
//     · NEXT_PUBLIC_GA4_MEASUREMENT_ID isn't configured,
//   so the conversion call must NEVER throw and NEVER block the form.

export type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: "event" | "config" | "js", ...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const PII_KEY_PATTERN = /^(email|phone|name|message|address|signature)/i;

function stripPii(params?: EventParams): EventParams {
  if (!params) return {};
  const out: EventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (PII_KEY_PATTERN.test(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export function trackEvent(name: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, stripPii(params));
    }
  } catch {
    // Analytics is fire-and-forget — never let it break the user flow.
  }
}
