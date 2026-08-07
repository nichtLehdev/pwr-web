import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/**
 * Keeps authenticated, transactional and dead-end routes out of the index.
 *
 * `/api/uploads/` is allowed back in explicitly: media records store their
 * public URL under that prefix, so a blanket `/api/` disallow would hide every
 * post cover and ensemble photo — including the ones referenced as
 * `og:image` — from crawlers. Longest-match wins, so the allow beats it.
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
          // /suche and /newsletter/unsubscribe are deliberately absent: they
          // carry a `noindex` tag instead, and a crawler blocked here would
          // never get to read it.
        ],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
