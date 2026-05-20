import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Uploaded images served by the Go API (dev + Docker)
      { protocol: "http",  hostname: "localhost",  port: "8080" },
      { protocol: "http",  hostname: "0.0.0.0",   port: "8080" },
      // Docker-internal service name (used by Next.js image optimiser server-side)
      { protocol: "http",  hostname: "blue-nest-api",  port: "8080" },
      { protocol: "http",  hostname: "backend",         port: "8080" },
      // Production: add your domain, e.g. { protocol: "https", hostname: "api.bluenest.uk" }
    ],
  },
  async rewrites() {
    // Proxy /uploads/* to the Go backend so Next/Image can optimise them
    // server-side without ECONNREFUSED (localhost doesn't resolve inside Docker).
    // NEXT_PUBLIC_API_INTERNAL_URL is only read at server startup; it defaults to
    // the Docker service name so the image optimiser can reach the backend.
    const backendInternal =
      process.env.NEXT_PUBLIC_API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8080";
    return [
      {
        source: "/uploads/:path*",
        destination: `${backendInternal}/uploads/:path*`,
      },
    ];
  },
  /**
   * Legacy Wix URL redirects.
   *
   * Yell SEO data shows Google still indexes many of the old Wix paths
   * (`/harrow`, `/our-fees`, `/post/<slug>`, `/application-form`, ...) with
   * thousands of monthly impressions and accumulated CTR. 301 redirects
   * preserve that authority and keep organic clicks landing on real
   * content on the new Next.js site. All redirects are permanent so
   * search engines update their indexes to the new canonical URLs.
   */
  async redirects() {
    return [
      // Branch pages — /harrow alone was pulling ~1,500 imp/mo
      { source: "/harrow",       destination: "/branches/harrow",       permanent: true },
      { source: "/pinner",       destination: "/branches/pinner",       permanent: true },
      { source: "/borehamwood",  destination: "/branches/borehamwood",  permanent: true },
      { source: "/northwood",    destination: "/branches/northwood",    permanent: true },
      { source: "/pinner-green", destination: "/branches/pinner-green", permanent: true },

      // Admission — Wix kept these at the root
      { source: "/our-fees",         destination: "/admission/our-fees",         permanent: true },
      { source: "/application-form", destination: "/admission/application-form", permanent: true },
      { source: "/prospectus",       destination: "/admission/prospectus",       permanent: true },

      // Blog — Wix used /post/<slug>, we use /blog/<slug>. The top legacy
      // blog post ("best age to start nursery") alone pulled 3,800+ imp/mo.
      { source: "/post/:slug",  destination: "/blog/:slug", permanent: true },

      // Old Wix holiday-club product pages — now point at the dedicated
      // /admission/holiday-club destination so we keep the visitor on a
      // page that actually matches their search intent. Path-to-regexp
      // can't repeat a parameter prefixed by a string literal, so each
      // pattern captures the trailing slug as a single segment.
      { source: "/product-page/holiday-club-harrow-:slug",      destination: "/admission/holiday-club", permanent: true },
      { source: "/product-page/holiday-club-pinner-:slug",      destination: "/admission/holiday-club", permanent: true },
      { source: "/product-page/holiday-club-borehamwood-:slug", destination: "/admission/holiday-club", permanent: true },
      // Catch-all for any other legacy holiday-club product URLs.
      { source: "/product-page/holiday-club-:slug",             destination: "/admission/holiday-club", permanent: true },

      // /careers had organic traffic; no dedicated page yet — closest
      // content match is the team page.
      { source: "/careers", destination: "/our-team", permanent: true },
    ];
  },
};

export default nextConfig;
