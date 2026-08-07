import type { Metadata } from "next";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { markdownToPlainText } from "@/lib/markdown-to-plain-text";

export const SITE_NAME = "Posaunenwerk Rheinland";
export const SITE_DESCRIPTION =
  "Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland";
export const SITE_LOCALE = "de_DE";

/** Absolute URL for a site-relative path — Open Graph and sitemaps require one. */
export function siteUrl(path = "/"): string {
  const base = getBaseUrl().replace(/\/+$/, "");
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Plain-text summary for `<meta description>` / `og:description`.
 *
 * Post and course bodies are markdown, but the TipTap editor can leave inline
 * HTML behind, so tags are stripped first. Truncation lands on a word boundary
 * because search engines cut mid-word descriptions with an ellipsis anyway.
 */
export function plainTextExcerpt(
  source: string | null | undefined,
  maxLength = 160,
): string | undefined {
  if (!source) return undefined;

  const text = markdownToPlainText(source.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return undefined;
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Feed autodiscovery, repeated on every page that builds its own metadata.
 *
 * Next replaces `alternates` wholesale instead of deep-merging it, so a page
 * that sets a canonical would otherwise drop the link the root layout
 * declares.
 */
export const RSS_ALTERNATE = {
  "application/rss+xml": [
    { url: "/api/feed/rss", title: `${SITE_NAME} — Aktuelles` },
  ],
};

export interface SeoImage {
  url: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

export interface PageMetadataInput {
  /** Page title without the site-name suffix — the title template adds that. */
  title: string;
  /**
   * Suppresses the `| Posaunenwerk Rheinland` suffix. For the homepage, whose
   * title would otherwise open with a worthless "Startseite".
   */
  titleAbsolute?: boolean;
  description?: string | null;
  /** Site-relative canonical path, e.g. `/aktuelles/<id>`. */
  path: string;
  image?: SeoImage | null;
  type?: "website" | "article";
  publishedTime?: Date | null;
  modifiedTime?: Date | null;
  /** Set for pages that must stay out of the index (e.g. unlisted content). */
  noIndex?: boolean;
}

/**
 * The generated card from `app/opengraph-image.tsx`, referenced explicitly.
 *
 * Next only auto-injects that file for segments that do not declare an
 * `openGraph` block of their own — every page built here does, so without this
 * an entry without a cover image would ship no `og:image` at all and share as
 * a bare link.
 */
const FALLBACK_OG_IMAGE: SeoImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: SITE_NAME,
};

/**
 * Builds title, description, canonical, Open Graph and Twitter-card metadata
 * from one description of a page.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  noIndex,
  titleAbsolute,
}: PageMetadataInput): Metadata {
  const url = siteUrl(path);
  const desc = description?.trim() ?? undefined;
  const resolved = image ?? FALLBACK_OG_IMAGE;
  const images = [
    {
      url: siteUrl(resolved.url),
      ...(resolved.width ? { width: resolved.width } : {}),
      ...(resolved.height ? { height: resolved.height } : {}),
      alt: resolved.alt ?? title,
    },
  ];

  return {
    // Absolute rather than relying on the root layout's title template: a
    // template only reaches the segments directly below the layout that
    // declares it, so any passthrough layout setting a plain string title
    // silently strips the suffix from every page beneath it.
    title: {
      absolute: titleAbsolute ? title : `${title} | ${SITE_NAME}`,
    },
    description: desc,
    alternates: { canonical: url, types: RSS_ALTERNATE },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description: desc,
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type,
      images,
      ...(type === "article"
        ? {
            publishedTime: publishedTime?.toISOString(),
            modifiedTime: modifiedTime?.toISOString(),
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images,
    },
  };
}
