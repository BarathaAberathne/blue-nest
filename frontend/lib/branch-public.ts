import type { Branch } from "@/types";

// ── The ONE public branch roster ─────────────────────────────────────────────
// Live data comes from GET /api/v1/branches (the backend is the source of
// truth for phone/address/hours/status/coords). This static roster exists
// ONLY as the render fallback when the API is unreachable (build-time render,
// backend restart) so a public page can never 500 or go blank — it must be
// kept small and boring. Previously four components each kept their own copy
// (Header, ContactPageClient, LeafletMap, FeeCalculatorCard) and they had
// already drifted (Pinner Green's card showed Harrow's phone number).
export type PublicBranchFallback = {
  slug: string;
  label: string;       // short display name ("Harrow")
  phone?: string;
  address: string;
  postcode: string;
  lat: number;
  lng: number;
  hours: string;       // human label
  comingSoon?: boolean;
  colour: string;      // CSS var token for maps/cards
};

export const BRANCH_FALLBACKS: PublicBranchFallback[] = [
  { slug: "harrow", label: "Harrow", phone: "020 8861 5574", address: "29 Churchfield Close, Harrow", postcode: "HA2 6BD", lat: 51.5836, lng: -0.3364, hours: "Mon–Fri 7:30 am – 6:30 pm", colour: "var(--branch-harrow)" },
  { slug: "borehamwood", label: "Borehamwood", phone: "020 8953 1718", address: "31-33 Farriers Way, Borehamwood", postcode: "WD6 2TB", lat: 51.6594, lng: -0.2724, hours: "Mon–Fri 7:30 am – 6:30 pm", colour: "var(--branch-borehamwood)" },
  { slug: "pinner", label: "Pinner", phone: "07400 430630", address: "Cuckoo Hill Road, Pinner", postcode: "HA5 1AY", lat: 51.5919, lng: -0.3795, hours: "Mon–Fri 7:30 am – 6:30 pm", colour: "var(--branch-pinner)" },
  { slug: "pinner-green", label: "Pinner Green", phone: "07400 430630", address: "Pinner Green, Pinner", postcode: "HA5", lat: 51.5972, lng: -0.3878, hours: "Mon–Fri 7:30 am – 6:30 pm", comingSoon: true, colour: "var(--branch-pinner-green)" },
  { slug: "northwood", label: "Northwood", address: "Sandy Lane, Northwood", postcode: "HA6 3DA", lat: 51.6091, lng: -0.4186, hours: "Mon–Fri 7:30 am – 6:30 pm", comingSoon: true, colour: "var(--branch-northwood)" },
  { slug: "aldershot", label: "Aldershot", phone: "01252 343772", address: "Belle Vue Rd, Aldershot", postcode: "GU12 4RZ", lat: 51.2416, lng: -0.746, hours: "Mon–Fri 7:30 am – 6:30 pm", colour: "var(--branch-aldershot)" },
];

export const fallbackFor = (slug: string): PublicBranchFallback | undefined =>
  BRANCH_FALLBACKS.find((b) => b.slug === slug);

// ── Server-side fetch (branch pages are server components) ───────────────────

// Server code must use the in-network URL (http://backend:8080 in compose);
// NEXT_PUBLIC_API_URL is the browser-facing address.
const serverApiBase = () =>
  process.env.NEXT_PUBLIC_API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// getPublicBranch fetches one branch for a public page with ISR (revalidated
// every 5 minutes) and NEVER throws — a page renders its fallback literals
// when the API is unavailable (e.g. during `next build` in the image build,
// where the backend container isn't up yet).
export async function getPublicBranch(slug: string): Promise<Branch | null> {
  try {
    const res = await fetch(`${serverApiBase()}/api/v1/branches/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Branch };
    return body.data ?? null;
  } catch {
    return null;
  }
}

// ── Merge helpers: fetched value first, fallback literal second ──────────────

export type BranchContactView = {
  name: string;
  phone: string;
  telHref: string;
  email: string;
  address: string;
  hoursLine1: string;
  hoursLine2: string;
  mapsUrl: string;
  comingSoon: boolean;
  lat: number;
  lng: number;
};

const fmtClock = (hhmm?: string, fallback = "") => {
  if (!hhmm) return fallback;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return fallback;
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
};

export function branchContactView(slug: string, branch: Branch | null): BranchContactView {
  const fb = fallbackFor(slug);
  const phone = branch?.contact?.phone || fb?.phone || "";
  const open = fmtClock(branch?.admissions?.opening_time, "7:30 am");
  const close = fmtClock(branch?.admissions?.closing_time, "6:30 pm");
  return {
    name: branch?.name || `Blue Nest Montessori School — ${fb?.label ?? slug}`,
    phone,
    telHref: "tel:" + phone.replace(/\s+/g, ""),
    email: branch?.contact?.email || "manager@bluenest.uk",
    address: branch?.contact?.address || `${fb?.address ?? ""}, ${fb?.postcode ?? ""}`,
    hoursLine1: "Monday – Friday",
    hoursLine2: `${open} – ${close}`,
    mapsUrl: branch?.google?.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((fb?.address ?? slug) + " " + (fb?.postcode ?? ""))}`,
    comingSoon: branch ? branch.status === "coming_soon" : !!fb?.comingSoon,
    lat: branch?.lat || fb?.lat || 51.5,
    lng: branch?.lng || fb?.lng || -0.3,
  };
}
