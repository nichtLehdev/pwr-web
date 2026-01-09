import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { ContentStatus } from "~/generated/prisma/client";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { marked } from "marked";

// Configure marked
marked.use({
  gfm: true,
  breaks: true,
});

/**
 * Escapes XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Formats a date for RSS (RFC 822 format)
 */
function formatRssDate(date: Date): string {
  return date.toUTCString();
}

/**
 * Converts markdown to plain text for RSS description
 */
async function markdownToPlainText(markdown: string): Promise<string> {
  const html = await marked.parse(markdown);
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Support both comma-separated and multiple query params
    const bezirkIdParam = searchParams.getAll("bezirkId");
    const bezirkIds =
      bezirkIdParam.length > 0
        ? bezirkIdParam
            .flatMap((id) => id.split(",").map((s) => s.trim()))
            .filter(Boolean)
        : [];
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const bezirksuebergreifend =
      searchParams.get("bezirksuebergreifend") === "true";

    const baseUrl = getBaseUrl({ headers: request.headers });

    // Build where clause - support OR logic for bezirksübergreifend + districts
    const where: {
      status: ContentStatus;
      OR?: Array<{ bezirkId: string | { in: string[] } | null }>;
      bezirkId?: string | { in: string[] } | null;
    } = {
      status: ContentStatus.APPROVED,
    };

    // If both bezirksübergreifend and districts are selected, use OR logic
    if (bezirksuebergreifend && bezirkIds.length > 0) {
      where.OR = [
        { bezirkId: null }, // Bezirksübergreifend items
        ...(bezirkIds.length === 1
          ? [{ bezirkId: bezirkIds[0]! }]
          : [{ bezirkId: { in: bezirkIds } }]),
      ];
    } else if (bezirksuebergreifend) {
      // Only bezirksübergreifend
      where.bezirkId = null;
    } else if (bezirkIds.length > 0) {
      // Only districts
      if (bezirkIds.length === 1) {
        where.bezirkId = bezirkIds[0]!;
      } else {
        where.bezirkId = { in: bezirkIds };
      }
    }

    // Fetch posts
    const posts = await db.post.findMany({
      where,
      include: {
        bezirk: true,
        createdBy: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: Math.min(limit, 100), // Cap at 100
    });

    // Get district names for feed title
    let feedTitle = "Posaunenwerk - Aktuelles";
    let feedDescription = "Aktuelle Nachrichten und Beiträge vom Posaunenwerk";
    let feedLink = `${baseUrl}/aktuelles`;

    if (bezirkIds.length > 0) {
      // Fetch bezirke to get their names
      const bezirke = await db.bezirk.findMany({
        where: { id: { in: bezirkIds } },
        orderBy: { number: "asc" },
      });

      if (bezirke.length > 0) {
        if (bezirke.length === 1) {
          const bezirk = bezirke[0]!;
          feedTitle = bezirksuebergreifend
            ? `Posaunenwerk - ${bezirk.name} + Bezirksübergreifend`
            : `Posaunenwerk - ${bezirk.name}`;
          feedDescription = bezirksuebergreifend
            ? `Nachrichten und Beiträge vom ${bezirk.name} und bezirksübergreifend`
            : `Aktuelle Nachrichten und Beiträge vom ${bezirk.name}`;
          feedLink = `${baseUrl}/aktuelles?bezirk=${bezirk.number}`;
        } else {
          const bezirkNames = bezirke.map((b) => b.shortName).join(", ");
          feedTitle = bezirksuebergreifend
            ? `Posaunenwerk - ${bezirkNames} + Bezirksübergreifend`
            : `Posaunenwerk - ${bezirkNames}`;
          feedDescription = bezirksuebergreifend
            ? `Nachrichten und Beiträge von ${bezirkNames} und bezirksübergreifend`
            : `Aktuelle Nachrichten und Beiträge von ${bezirkNames}`;
          feedLink = `${baseUrl}/aktuelles`;
        }
      } else if (bezirksuebergreifend) {
        feedTitle = "Posaunenwerk - Bezirksübergreifend";
        feedDescription =
          "Bezirksübergreifende Nachrichten und Beiträge vom Posaunenwerk";
        feedLink = `${baseUrl}/aktuelles`;
      }
    }

    // Generate RSS items
    const items = await Promise.all(
      posts.map(async (post) => {
        const postUrl = `${baseUrl}/aktuelles/${post.id}`;
        const pubDate = post.publishedAt || post.createdAt;
        const description = await markdownToPlainText(
          post.excerpt || post.content,
        );
        const author =
          post.createdBy?.displayName ||
          post.createdBy?.email ||
          "Posaunenwerk";

        return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapeXml(description.substring(0, 500))}</description>
      <pubDate>${formatRssDate(pubDate)}</pubDate>
      <author>${escapeXml(author)}</author>
      ${post.bezirk ? `<category>${escapeXml(post.bezirk.name)}</category>` : ""}
    </item>`;
      }),
    );

    // Build RSS feed
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${feedLink}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>de-DE</language>
    <lastBuildDate>${formatRssDate(new Date())}</lastBuildDate>
    <atom:link href="${baseUrl}/api/feed/rss${
      bezirksuebergreifend || bezirkIds.length > 0
        ? `?${[
            ...(bezirksuebergreifend ? ["bezirksuebergreifend=true"] : []),
            ...bezirkIds.map((id) => `bezirkId=${encodeURIComponent(id)}`),
          ].join("&")}`
        : ""
    }" rel="self" type="application/rss+xml" />
    ${items.join("\n")}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return NextResponse.json(
      {
        error: "Failed to generate RSS feed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
