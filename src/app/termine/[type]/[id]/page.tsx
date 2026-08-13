import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { api } from "@/trpc/server";
import EventDetailView from "@/app/_components/events/event-detail-view";
import CourseDetailView from "@/app/_components/events/course-detail-view";
import { db } from "@/server/db";
import { ContentStatus } from "~/generated/prisma/client";
import { buildPageMetadata, plainTextExcerpt, SITE_NAME } from "@/lib/seo";
import JsonLd from "@/app/_components/seo/json-ld";
import { breadcrumbSchema, eventSchema } from "@/lib/structured-data";
import { coursePath, eventPath, isUuid } from "@/lib/slug";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

const germanDate = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "long",
  timeZone: "Europe/Berlin",
});

const metadataImageSelect = {
  select: { url: true, width: true, height: true, alt: true },
} as const;

const metadataLocationSelect = {
  select: { name: true, city: true },
} as const;

const getEventForMetadata = cache(async (identifier: string) =>
  db.event.findFirst({
    where: {
      ...(isUuid(identifier) ? { id: identifier } : { slug: identifier }),
      status: ContentStatus.APPROVED,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      motto: true,
      description: true,
      eventDate: true,
      cancelled: true,
      coverImage: metadataImageSelect,
      location: metadataLocationSelect,
    },
  }),
);

const getCourseForMetadata = cache(async (identifier: string) =>
  db.course.findFirst({
    where: {
      ...(isUuid(identifier) ? { id: identifier } : { slug: identifier }),
      status: ContentStatus.APPROVED,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      motto: true,
      description: true,
      startDate: true,
      endDate: true,
      image: metadataImageSelect,
      location: metadataLocationSelect,
    },
  }),
);

/**
 * Falls back to date and place when the entry has no prose — a search result
 * reading "14. März 2026 in Köln" is still worth more than an empty snippet.
 */
function terminDescription(
  text: string | null,
  motto: string | null,
  when: string,
  location: { name: string | null; city: string } | null,
): string {
  const place = location ? ` in ${location.name ?? location.city}` : "";
  const stamp = `${when}${place}`;
  // Keep the combined string inside the ~160 characters Google renders.
  const excerpt = plainTextExcerpt(
    text ?? motto,
    Math.max(60, 155 - stamp.length),
  );

  return excerpt ? `${stamp}. ${excerpt}` : `${stamp} — ${SITE_NAME}.`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { type, id } = await params;

  if (type === "event") {
    const event = await getEventForMetadata(id);
    if (!event) {
      return { title: "Termin", robots: { index: false, follow: false } };
    }

    const when = germanDate.format(event.eventDate);
    return buildPageMetadata({
      title: event.cancelled ? `${event.title} (abgesagt)` : event.title,
      description: terminDescription(
        event.description,
        event.motto,
        when,
        event.location,
      ),
      // Always the slug form, so a crawler that reached the UUID URL is
      // pointed at the canonical one even before it follows the redirect.
      path: eventPath(event),
      image: event.coverImage,
    });
  }

  if (type === "course") {
    const course = await getCourseForMetadata(id);
    if (!course) {
      return { title: "Kurs", robots: { index: false, follow: false } };
    }

    const start = germanDate.format(course.startDate);
    const end = germanDate.format(course.endDate);
    const when = start === end ? start : `${start} – ${end}`;

    return buildPageMetadata({
      title: course.title,
      description: terminDescription(
        course.description,
        course.motto,
        when,
        course.location,
      ),
      path: coursePath(course),
      image: course.image,
    });
  }

  return { title: "Termin", robots: { index: false, follow: false } };
}

export default async function TerminDetailPage({ params }: PageProps) {
  const { type, id } = await params;

  if (type === "event") {
    const event = await api.events.getById({ id: id });
    if (!event) {
      notFound();
    }

    // Old UUID links keep working but hand their ranking to the slug URL.
    if (isUuid(id) && event.slug) {
      permanentRedirect(eventPath(event));
    }

    return (
      <>
        {event.status === ContentStatus.APPROVED && (
          <JsonLd
            data={[
              eventSchema({
                type: event.category === "KONZERT" ? "MusicEvent" : "Event",
                path: eventPath(event),
                name: event.title,
                description: plainTextExcerpt(
                  event.description ?? event.motto,
                  300,
                ),
                imageUrl: event.coverImage?.url,
                startDate: event.eventDate,
                endDate: event.duration
                  ? new Date(
                      event.eventDate.getTime() + event.duration * 60_000,
                    )
                  : null,
                cancelled: event.cancelled,
                isFree: event.isFree,
                location: event.location,
                performerName:
                  event.performingEnsembleName ?? event.ensemble?.name,
              }),
              breadcrumbSchema([
                { name: "Start", path: "/" },
                { name: "Termine", path: "/termine" },
                { name: event.title },
              ]),
            ]}
          />
        )}
        <EventDetailView event={event} />
      </>
    );
  }

  if (type === "course") {
    const course = await api.courses.getById({ id: id });
    const spots = await api.courses.getAvailableSlots({ id: id });
    if (!course) {
      notFound();
    }

    if (isUuid(id) && course.slug) {
      permanentRedirect(coursePath(course));
    }

    return (
      <>
        {course.status === ContentStatus.APPROVED && (
          <JsonLd
            data={[
              eventSchema({
                type: "EducationEvent",
                path: coursePath(course),
                name: course.title,
                description: plainTextExcerpt(
                  course.description ?? course.motto,
                  300,
                ),
                imageUrl: course.image?.url,
                startDate: course.startDate,
                endDate: course.endDate,
                isFree: course.isFree,
                location: course.location,
              }),
              breadcrumbSchema([
                { name: "Start", path: "/" },
                { name: "Termine", path: "/termine" },
                { name: course.title },
              ]),
            ]}
          />
        )}
        <CourseDetailView course={course} spots={spots} />
      </>
    );
  }

  notFound();
}
