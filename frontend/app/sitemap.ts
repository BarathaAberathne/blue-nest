import type { MetadataRoute } from "next";

const BASE = "https://bluenest.uk";

// Hourly revalidation — keeps blog posts crawl-discoverable shortly after
// they're published in the admin panel without hammering the API.
export const revalidate = 3600;

const staticRoutes: { url: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { url: "/",                               priority: 1.0, changeFrequency: "weekly"  },
  { url: "/why-montessori",                 priority: 0.9, changeFrequency: "monthly" },
  { url: "/forest-school",                  priority: 0.8, changeFrequency: "monthly" },
  { url: "/admission",                      priority: 0.9, changeFrequency: "monthly" },
  { url: "/admission/prospectus",           priority: 0.8, changeFrequency: "monthly" },
  { url: "/admission/our-fees",             priority: 0.8, changeFrequency: "monthly" },
  { url: "/admission/application-form",     priority: 0.7, changeFrequency: "monthly" },
  { url: "/branches/harrow",                priority: 0.9, changeFrequency: "monthly" },
  { url: "/branches/pinner",                priority: 0.9, changeFrequency: "monthly" },
  { url: "/branches/borehamwood",           priority: 0.9, changeFrequency: "monthly" },
  { url: "/branches/northwood",             priority: 0.6, changeFrequency: "monthly" },
  { url: "/branches/pinner-green",          priority: 0.7, changeFrequency: "monthly" },
  { url: "/gallery",                        priority: 0.7, changeFrequency: "weekly"  },
  { url: "/our-team",                       priority: 0.7, changeFrequency: "monthly" },
  { url: "/our-charities",                  priority: 0.6, changeFrequency: "monthly" },
  { url: "/home-learning",                  priority: 0.6, changeFrequency: "monthly" },
  { url: "/nursery-store",                  priority: 0.7, changeFrequency: "weekly"  },
  { url: "/blog",                           priority: 0.7, changeFrequency: "weekly"  },
  { url: "/contact",                        priority: 0.8, changeFrequency: "monthly" },
];

type BlogPost = { slug: string; published_at?: string; updated_at?: string };

async function fetchPublishedBlogSlugs(): Promise<BlogPost[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  try {
    const res = await fetch(`${apiBase}/api/v1/blog/posts`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    // The backend may return either a bare array or `{ posts: [...] }`.
    const list: unknown = Array.isArray(json) ? json : json?.posts;
    if (!Array.isArray(list)) return [];
    return list
      .filter((p): p is BlogPost => typeof p === "object" && p !== null && typeof (p as BlogPost).slug === "string")
      .map((p) => ({
        slug: p.slug,
        published_at: typeof p.published_at === "string" ? p.published_at : undefined,
        updated_at:   typeof p.updated_at   === "string" ? p.updated_at   : undefined,
      }));
  } catch {
    // Backend unreachable at build/revalidate time — we'd rather emit a
    // static-only sitemap than fail the request and serve no sitemap.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now   = new Date();
  const posts = await fetchPublishedBlogSlugs();

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(({ url, priority, changeFrequency }) => ({
    url: `${BASE}${url}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : p.published_at ? new Date(p.published_at) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...blogEntries];
}
