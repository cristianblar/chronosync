import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://chronosync.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/privacy", "/terms"],
        disallow: [
          "/dashboard",
          "/plan",
          "/tracking",
          "/settings",
          "/onboarding",
          "/events",
          "/education",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
