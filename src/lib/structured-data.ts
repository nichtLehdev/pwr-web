import { SITE_NAME, siteUrl } from "@/lib/seo";

/**
 * schema.org builders for the public pages.
 *
 * Every graph node that other nodes point at gets a stable `@id` so search
 * engines merge the organisation across pages instead of treating each page's
 * copy as a separate entity.
 */

export const ORGANIZATION_ID = "#organization";

/**
 * Contact data mirrors the Impressum — keep both in sync when it changes.
 * @see src/app/impressum/page.tsx
 */
const ORGANIZATION = {
  legalName:
    "Evangelisches Posaunenwerk in der Evangelischen Kirche im Rheinland",
  email: "info@posaunenwerk-rheinland.de",
  telephone: "+49 261 3000011",
  street: "Rudolf-Harbig-Str. 20",
  postalCode: "56179",
  city: "Vallendar",
  sameAs: [
    "https://facebook.com/posaunenwerkrheinland",
    "https://www.instagram.com/posaunenwerk_rheinland/",
    "https://www.youtube.com/@PWRheinland",
  ],
};

export type JsonLdNode = Record<string, unknown>;

export function organizationSchema(): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": siteUrl(ORGANIZATION_ID),
    name: ORGANIZATION.legalName,
    alternateName: SITE_NAME,
    url: siteUrl(),
    logo: siteUrl("/images/logo.png"),
    email: ORGANIZATION.email,
    telephone: ORGANIZATION.telephone,
    address: {
      "@type": "PostalAddress",
      streetAddress: ORGANIZATION.street,
      postalCode: ORGANIZATION.postalCode,
      addressLocality: ORGANIZATION.city,
      addressCountry: "DE",
    },
    sameAs: ORGANIZATION.sameAs,
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path; omit for the current page. */
  path?: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: siteUrl(item.path) } : {}),
    })),
  };
}

export interface SchemaLocation {
  name: string | null;
  street: string | null;
  zipCode: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

function placeSchema(location: SchemaLocation): JsonLdNode {
  return {
    "@type": "Place",
    name: location.name ?? location.city,
    address: {
      "@type": "PostalAddress",
      ...(location.street ? { streetAddress: location.street } : {}),
      ...(location.zipCode ? { postalCode: location.zipCode } : {}),
      addressLocality: location.city,
      addressCountry: "DE",
    },
    ...(location.latitude !== null && location.longitude !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: location.latitude,
            longitude: location.longitude,
          },
        }
      : {}),
  };
}

export interface ArticleSchemaInput {
  /** Site-relative path — the slug form, matching the canonical. */
  path: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  publishedAt: Date;
  updatedAt: Date;
  authorName?: string | null;
}

export function newsArticleSchema(post: ArticleSchemaInput): JsonLdNode {
  const url = siteUrl(post.path);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: post.title.slice(0, 110),
    ...(post.description ? { description: post.description } : {}),
    ...(post.imageUrl ? { image: [siteUrl(post.imageUrl)] } : {}),
    datePublished: post.publishedAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: post.authorName
      ? { "@type": "Person", name: post.authorName }
      : { "@id": siteUrl(ORGANIZATION_ID) },
    publisher: { "@id": siteUrl(ORGANIZATION_ID) },
  };
}

export interface EventSchemaInput {
  path: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  startDate: Date;
  endDate?: Date | null;
  cancelled?: boolean;
  isFree?: boolean;
  location: SchemaLocation | null;
  performerName?: string | null;
  /** `MusicEvent` for concerts, `EducationEvent` for courses. */
  type: "MusicEvent" | "Event" | "EducationEvent";
}

export function eventSchema(input: EventSchemaInput): JsonLdNode {
  const url = siteUrl(input.path);

  return {
    "@context": "https://schema.org",
    "@type": input.type,
    name: input.name,
    url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.imageUrl ? { image: [siteUrl(input.imageUrl)] } : {}),
    startDate: input.startDate.toISOString(),
    ...(input.endDate ? { endDate: input.endDate.toISOString() } : {}),
    eventStatus: input.cancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(input.location ? { location: placeSchema(input.location) } : {}),
    ...(input.performerName
      ? { performer: { "@type": "MusicGroup", name: input.performerName } }
      : {}),
    // Only free entries get an `offers` node: paid ones store prices as free
    // text, and an offer without a machine-readable price is invalid.
    ...(input.isFree
      ? {
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
            url,
          },
        }
      : {}),
    organizer: { "@id": siteUrl(ORGANIZATION_ID) },
  };
}

export interface MusicGroupSchemaInput {
  /** Site-relative path — the slug form, matching the canonical. */
  path: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  location: SchemaLocation | null;
  websiteUrl?: string | null;
}

export function musicGroupSchema(input: MusicGroupSchemaInput): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: input.name,
    url: siteUrl(input.path),
    ...(input.description ? { description: input.description } : {}),
    ...(input.imageUrl ? { image: [siteUrl(input.imageUrl)] } : {}),
    genre: "Posaunenchor",
    ...(input.location ? { location: placeSchema(input.location) } : {}),
    ...(input.websiteUrl ? { sameAs: [input.websiteUrl] } : {}),
    memberOf: { "@id": siteUrl(ORGANIZATION_ID) },
  };
}
