import type { MetadataRoute } from "next";

const BASE = "https://bluenest.uk";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return staticRoutes.map(({ url, priority, changeFrequency }) => ({
    url: `${BASE}${url}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
