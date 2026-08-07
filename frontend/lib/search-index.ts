/**
 * Curated search index for the site header.
 *
 * Every public route a parent might look for, with synonyms in `keywords`
 * so the search matches intent ("cost", "money", "near me") and not just
 * exact page titles. Keep ordering meaningful — when two entries score
 * equally the earlier one wins in the result list.
 *
 * Admin / auth / account-internal routes are deliberately excluded.
 */

export type SearchCategory =
  | "Branch"
  | "Admissions"
  | "About"
  | "Programs"
  | "Resources"
  | "Account";

export interface SearchEntry {
  title:       string;
  description: string;
  url:         string;
  category:    SearchCategory;
  keywords:    string[];
}

export const searchIndex: SearchEntry[] = [
  // ── Branches ────────────────────────────────────────────────────────────────
  {
    title:       "Harrow Nursery",
    description: "Montessori day nursery in Harrow (HA2) — ages 3 months to 5 years.",
    url:         "/branches/harrow",
    category:    "Branch",
    keywords: [
      "harrow", "ha2", "south harrow", "north harrow", "west harrow",
      "rayners lane", "wealdstone", "headstone", "nursery near me",
      "blue nest harrow", "churchfield close",
    ],
  },
  {
    title:       "Pinner Nursery",
    description: "Montessori day nursery in Pinner (HA5) with Forest School.",
    url:         "/branches/pinner",
    category:    "Branch",
    keywords: ["pinner", "ha5", "blue nest pinner", "forest school pinner"],
  },
  {
    title:       "Pinner Green Nursery",
    description: "Child-led Montessori nursery set in the heart of Pinner Green.",
    url:         "/branches/pinner-green",
    category:    "Branch",
    keywords: ["pinner green", "blue nest pinner green"],
  },
  {
    title:       "Borehamwood Nursery",
    description: "Private Montessori day nursery in Borehamwood, WD6.",
    url:         "/branches/borehamwood",
    category:    "Branch",
    keywords: ["borehamwood", "wd6", "blue nest borehamwood", "hertfordshire"],
  },
  {
    title:       "Northwood Nursery (coming soon)",
    description: "New Blue Nest Montessori branch opening in Northwood, HA6.",
    url:         "/branches/northwood",
    category:    "Branch",
    keywords: ["northwood", "ha6", "new branch", "coming soon", "opening"],
  },
  {
    title:       "Aldershot Nursery",
    description: "Blue Nest Montessori School Aldershot: Montessori nursery on Belle Vue Road, Aldershot, GU12 4RZ.",
    url:         "/branches/aldershot",
    category:    "Branch",
    keywords: ["aldershot", "gu12", "belle vue road", "hampshire", "blue nest aldershot"],
  },

  // ── Admissions ──────────────────────────────────────────────────────────────
  {
    title:       "Admissions",
    description: "How to apply for a place at Blue Nest Montessori.",
    url:         "/admission",
    category:    "Admissions",
    keywords: ["admission", "admissions", "apply", "enrol", "enroll", "join", "register child", "start"],
  },
  {
    title:       "Our Fees & Fee Calculator",
    description: "Estimate weekly and monthly nursery fees by branch, age and session.",
    url:         "/admission/our-fees",
    category:    "Admissions",
    keywords: [
      "fees", "fee", "cost", "costs", "price", "pricing", "money", "how much",
      "tuition", "calculator", "estimate", "funded hours", "30 hours",
      "15 hours", "free childcare", "tax free", "voucher", "vouchers",
      "sibling discount", "staff discount",
    ],
  },
  {
    title:       "Application Form",
    description: "Apply online for a nursery place at the branch of your choice.",
    url:         "/admission/application-form",
    category:    "Admissions",
    keywords: ["application", "apply", "form", "register", "waiting list", "place"],
  },
  {
    title:       "Holiday Club",
    description: "School-holiday provision for children aged 3 months to 5 years.",
    url:         "/admission/holiday-club",
    category:    "Admissions",
    keywords: ["holiday", "holidays", "club", "easter", "summer holiday", "half term", "october"],
  },
  {
    title:       "Prospectus",
    description: "Download our printable prospectus.",
    url:         "/admission/prospectus",
    category:    "Admissions",
    keywords: ["prospectus", "brochure", "download", "pdf", "info pack"],
  },

  // ── Programs / Learning ─────────────────────────────────────────────────────
  {
    title:       "Why Montessori",
    description: "Our Montessori approach and how it fits the EYFS framework.",
    url:         "/why-montessori",
    category:    "Programs",
    keywords: ["why montessori", "montessori", "method", "approach", "philosophy", "eyfs"],
  },
  {
    title:       "Forest School",
    description: "Outdoor, nature-led learning across all Blue Nest branches.",
    url:         "/forest-school",
    category:    "Programs",
    keywords: ["forest school", "outdoor", "nature", "woodland", "garden", "outside"],
  },
  {
    title:       "Home Learning",
    description: "Free Montessori-inspired activities and resources to do at home.",
    url:         "/home-learning",
    category:    "Programs",
    keywords: ["home learning", "activities", "home", "at home", "resources", "ideas", "play"],
  },

  // ── About ───────────────────────────────────────────────────────────────────
  {
    title:       "About Us",
    description: "The story, values and people behind Blue Nest Montessori.",
    url:         "/about-us",
    category:    "About",
    keywords: ["about", "about us", "story", "history", "values", "who we are"],
  },
  {
    title:       "Our Team",
    description: "Meet the educators and leadership across our nurseries.",
    url:         "/our-team",
    category:    "About",
    keywords: ["team", "staff", "teachers", "educators", "people", "managers", "leadership"],
  },
  {
    title:       "Our Charities",
    description: "Charity partnerships we support.",
    url:         "/our-charities",
    category:    "About",
    keywords: ["charity", "charities", "donate", "community", "support", "giving"],
  },

  // ── Resources ───────────────────────────────────────────────────────────────
  {
    title:       "Gallery",
    description: "Photos from inside our nurseries and Forest School sessions.",
    url:         "/gallery",
    category:    "Resources",
    keywords: ["gallery", "photos", "pictures", "images", "see"],
  },
  {
    title:       "Blog",
    description: "News, parenting tips and updates from Blue Nest.",
    url:         "/blog",
    category:    "Resources",
    keywords: ["blog", "news", "articles", "updates", "tips", "posts"],
  },
  {
    title:       "Nursery Store",
    description: "Hand-picked Montessori books, toys and resources.",
    url:         "/nursery-store",
    category:    "Resources",
    keywords: ["store", "shop", "buy", "books", "toys", "materials", "merchandise"],
  },

  // ── Account / Contact ──────────────────────────────────────────────────────
  {
    title:       "Contact Us",
    description: "Book a visit or send us a message.",
    url:         "/contact",
    category:    "Account",
    keywords: ["contact", "phone", "email", "address", "book", "visit", "tour", "enquire", "message"],
  },
  {
    title:       "Parents Log In",
    description: "Access your parent account.",
    url:         "/login",
    category:    "Account",
    keywords: ["login", "log in", "sign in", "parent", "parents", "account"],
  },
  {
    title:       "Register",
    description: "Create a parent account.",
    url:         "/register",
    category:    "Account",
    keywords: ["register", "sign up", "create account", "new account"],
  },
];

// ── Matching ──────────────────────────────────────────────────────────────────

/**
 * Score an entry against a normalized lowercase query.
 *
 *   exact title match           → 100
 *   title startsWith query      →  80
 *   title contains query        →  60
 *   keyword equals query        →  55
 *   keyword startsWith query    →  45
 *   keyword contains query      →  35
 *   description contains query  →  20
 *   url contains query          →  10
 *
 * Each token in a multi-word query contributes independently; an entry must
 * match every token at some level or it scores 0. The category and order in
 * the index act as tiebreakers.
 */
export function scoreEntry(entry: SearchEntry, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const tokens = q.split(/\s+/).filter(Boolean);
  let total = 0;

  for (const t of tokens) {
    const title = entry.title.toLowerCase();
    const desc  = entry.description.toLowerCase();
    const url   = entry.url.toLowerCase();

    let best = 0;
    if (title === t)               best = 100;
    else if (title.startsWith(t))  best = 80;
    else if (title.includes(t))    best = 60;
    else {
      for (const k of entry.keywords) {
        const kl = k.toLowerCase();
        if (kl === t)              { best = Math.max(best, 55); break; }
        if (kl.startsWith(t))      best = Math.max(best, 45);
        else if (kl.includes(t))   best = Math.max(best, 35);
      }
      if (best < 20 && desc.includes(t)) best = 20;
      if (best <  10 && url.includes(t)) best = 10;
    }

    if (best === 0) return 0;        // missing token disqualifies the entry
    total += best;
  }

  return total;
}

export function searchSite(query: string, limit = 6): SearchEntry[] {
  const q = query.trim();
  if (!q) return [];
  return searchIndex
    .map((entry) => ({ entry, score: scoreEntry(entry, q) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.entry);
}
