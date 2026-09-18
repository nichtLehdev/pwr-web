import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/**
 * `/api/uploads/` is allowed back in: media URLs (incl. `og:image`) live under it.
 * Longest match wins, so the allow beats the `/api/` disallow.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/uploads/"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/settings/",
          "/registrations/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/verify-2fa",
          "/feedback",
          "/offline",
          // Registration funnels duplicate the course page they hang off.
          "/termine/*/*/anmelden",
          // /suche and /newsletter/unsubscribe carry `noindex` instead: a blocked
          // crawler would never read it.
        ],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
