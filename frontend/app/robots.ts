import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/account/", "/auth/"],
      },
    ],
    sitemap: "https://bluenest.uk/sitemap.xml",
  };
}
