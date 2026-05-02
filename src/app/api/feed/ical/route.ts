import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { ContentStatus } from "~/generated/prisma/client";
import { getBaseUrl } from "@/server/utils/get-base-url";

/**
 * Escapes special characters for iCal format
 */
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * Formats a date for iCal (YYYYMMDDTHHMMSSZ format in UTC)
 */
function formatIcalDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generates a unique ID for an event
 */
function generateEventUid(eventId: string, baseUrl: string): string {
  const hostname = new URL(baseUrl).hostname;
  return `${eventId}@${hostname}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bezirkIdParam = searchParams.getAll("bezirkId");
    const bezirkIds =
      bezirkIdParam.length > 0
        ? bezirkIdParam
            .flatMap((id) => id.split(",").map((s) => s.trim()))
            .filter(Boolean)
        : [];
    const type = searchParams.get("type") || "both";
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const bezirksuebergreifend =
      searchParams.get("bezirksuebergreifend") === "true";

    const baseUrl = getBaseUrl({ headers: request.headers });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const now = new Date();
    const icalEvents: string[] = [];

    if (type === "events" || type === "both") {
      const eventWhere: {
        status: ContentStatus;
        OR?: Array<{ bezirkId: string | { in: string[] } | null }>;
        bezirkId?: string | { in: string[] } | null;
        eventDate?: { gte: Date };
        cancelled?: boolean;
      } = {
        status: ContentStatus.APPROVED,
        cancelled: false,
        eventDate: { gte: thirtyDaysAgo },
      };

      if (bezirksuebergreifend && bezirkIds.length > 0) {
        eventWhere.OR = [
          { bezirkId: null },
          ...(bezirkIds.length === 1
            ? [{ bezirkId: bezirkIds[0]! }]
            : [{ bezirkId: { in: bezirkIds } }]),
        ];
      } else if (bezirksuebergreifend) {
        eventWhere.bezirkId = null;
      } else if (bezirkIds.length > 0) {
        if (bezirkIds.length === 1) {
          eventWhere.bezirkId = bezirkIds[0]!;
        } else {
          eventWhere.bezirkId = { in: bezirkIds };
        }
      }

      const events = await db.event.findMany({
        where: eventWhere,
        include: {
          location: true,
          bezirk: true,
          ensemble: true,
          auswahlChor: true,
        },
        orderBy: { eventDate: "asc" },
        take: Math.min(limit, 500),
      });

      icalEvents.push(
        ...events.map((event) => {
          const eventUrl = `${baseUrl}/termine/event/${event.id}`;
          const uid = generateEventUid(`event-${event.id}`, baseUrl);
          const dtstart = formatIcalDate(event.eventDate);

          const endDate = event.duration
            ? new Date(event.eventDate.getTime() + event.duration * 60 * 1000)
            : (() => {
                const defaultEnd = new Date(event.eventDate);
                defaultEnd.setHours(defaultEnd.getHours() + 2);
                return defaultEnd;
              })();
          const dtend = formatIcalDate(endDate);

          const locationParts: string[] = [];
          if (event.location) {
            if (event.location.name) locationParts.push(event.location.name);
            if (event.location.street)
              locationParts.push(event.location.street);
            if (event.location.zipCode && event.location.city) {
              locationParts.push(
                `${event.location.zipCode} ${event.location.city}`,
              );
            } else if (event.location.city) {
              locationParts.push(event.location.city);
            }
          }
          const location =
            locationParts.length > 0 ? locationParts.join(", ") : "";

          const descriptionParts: string[] = [];
          if (event.description) {
            descriptionParts.push(event.description);
          }
          if (event.motto) {
            descriptionParts.push(`Motto: ${event.motto}`);
          }
          if (event.leitung) {
            descriptionParts.push(`Leitung: ${event.leitung}`);
          }
          if (event.ensemble) {
            descriptionParts.push(`Ensemble: ${event.ensemble.name}`);
          }
          if (event.auswahlChor) {
            descriptionParts.push(`Auswahlchor: ${event.auswahlChor.name}`);
          }
          if (event.priceInfo) {
            descriptionParts.push(`Preis: ${event.priceInfo}`);
          }
          descriptionParts.push(`\nMehr Informationen: ${eventUrl}`);
          const description = descriptionParts.join("\\n");

          let summary = event.title;
          if (event.bezirk) {
            summary += ` (${event.bezirk.shortName})`;
          }

          return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatIcalDate(now)}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${escapeIcalText(summary)}
${description ? `DESCRIPTION:${escapeIcalText(description)}` : ""}
${location ? `LOCATION:${escapeIcalText(location)}` : ""}
URL:${eventUrl}
STATUS:CONFIRMED
END:VEVENT`;
        }),
      );
    }

    if (type === "courses" || type === "both") {
      const courseWhere: {
        status: ContentStatus;
        OR?: Array<{ bezirkId: string | { in: string[] } | null }>;
        bezirkId?: string | { in: string[] } | null;
        endDate?: { gte: Date };
      } = {
        status: ContentStatus.APPROVED,
        endDate: { gte: thirtyDaysAgo },
      };

      if (bezirksuebergreifend && bezirkIds.length > 0) {
        courseWhere.OR = [
          { bezirkId: null },
          ...(bezirkIds.length === 1
            ? [{ bezirkId: bezirkIds[0]! }]
            : [{ bezirkId: { in: bezirkIds } }]),
        ];
      } else if (bezirksuebergreifend) {
        courseWhere.bezirkId = null;
      } else if (bezirkIds.length > 0) {
        if (bezirkIds.length === 1) {
          courseWhere.bezirkId = bezirkIds[0]!;
        } else {
          courseWhere.bezirkId = { in: bezirkIds };
        }
      }

      const courses = await db.course.findMany({
        where: courseWhere,
        include: {
          location: true,
          bezirk: true,
          collaborators: {
            orderBy: [
              { role: "asc" as const },
              { user: { displayName: "asc" as const } },
            ],
            include: {
              user: {
                select: {
                  displayName: true,
                },
              },
            },
          },
          guestTeamMembers: {
            orderBy: { sortOrder: "asc" },
            select: { displayName: true },
          },
        },
        orderBy: { startDate: "asc" },
        take: Math.min(limit, 500),
      });

      icalEvents.push(
        ...courses.map((course) => {
          const courseUrl = `${baseUrl}/termine/course/${course.id}`;
          const uid = generateEventUid(`course-${course.id}`, baseUrl);
          const dtstart = formatIcalDate(course.startDate);
          const dtend = formatIcalDate(course.endDate);

          const locationParts: string[] = [];
          if (course.location) {
            if (course.location.name) locationParts.push(course.location.name);
            if (course.location.street)
              locationParts.push(course.location.street);
            if (course.location.zipCode && course.location.city) {
              locationParts.push(
                `${course.location.zipCode} ${course.location.city}`,
              );
            } else if (course.location.city) {
              locationParts.push(course.location.city);
            }
          }
          const location =
            locationParts.length > 0 ? locationParts.join(", ") : "";

          const descriptionParts: string[] = [];
          if (course.description) {
            descriptionParts.push(course.description);
          }
          if (course.motto) {
            descriptionParts.push(`Motto: ${course.motto}`);
          }
          {
            const accountNames = course.collaborators
              .map((c) => c.user.displayName)
              .filter(Boolean);
            const guestNames = course.guestTeamMembers.map((g) => g.displayName);
            const teamLine = [...accountNames, ...guestNames].join(", ");
            if (teamLine) {
              descriptionParts.push(`Kurs-Team: ${teamLine}`);
            }
          }
          if (course.priceInfo) {
            descriptionParts.push(`Preis: ${course.priceInfo}`);
          }
          descriptionParts.push(`\nMehr Informationen: ${courseUrl}`);
          const description = descriptionParts.join("\\n");

          let summary = course.title;
          if (course.bezirk) {
            summary += ` (${course.bezirk.shortName})`;
          }
          summary += " [Lehrgang]";

          return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatIcalDate(now)}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${escapeIcalText(summary)}
${description ? `DESCRIPTION:${escapeIcalText(description)}` : ""}
${location ? `LOCATION:${escapeIcalText(location)}` : ""}
URL:${courseUrl}
STATUS:CONFIRMED
END:VEVENT`;
        }),
      );
    }

    let calendarName = "Posaunenwerk - Veranstaltungen";
    let calendarDescription = "Veranstaltungen und Termine vom Posaunenwerk";

    if (type === "events") {
      calendarName = "Posaunenwerk - Veranstaltungen";
      calendarDescription = "Veranstaltungen vom Posaunenwerk";
    } else if (type === "courses") {
      calendarName = "Posaunenwerk - Lehrgänge";
      calendarDescription = "Lehrgänge und Kurse vom Posaunenwerk";
    }

    if (bezirkIds.length > 0) {
      const bezirke = await db.bezirk.findMany({
        where: { id: { in: bezirkIds } },
        orderBy: { number: "asc" },
      });

      if (bezirke.length > 0) {
        if (bezirke.length === 1) {
          const bezirk = bezirke[0]!;
          calendarName = bezirksuebergreifend
            ? `Posaunenwerk - ${bezirk.name} + Bezirksübergreifend`
            : `Posaunenwerk - ${bezirk.name}`;
          calendarDescription = bezirksuebergreifend
            ? `Veranstaltungen und Termine vom ${bezirk.name} und bezirksübergreifend`
            : `Veranstaltungen und Termine vom ${bezirk.name}`;
        } else {
          const bezirkNames = bezirke.map((b) => b.shortName).join(", ");
          calendarName = bezirksuebergreifend
            ? `Posaunenwerk - ${bezirkNames} + Bezirksübergreifend`
            : `Posaunenwerk - ${bezirkNames}`;
          calendarDescription = bezirksuebergreifend
            ? `Veranstaltungen und Termine von ${bezirkNames} und bezirksübergreifend`
            : `Veranstaltungen und Termine von ${bezirkNames}`;
        }
      }
    } else if (bezirksuebergreifend) {
      calendarName = "Posaunenwerk - Bezirksübergreifend";
      calendarDescription =
        "Bezirksübergreifende Veranstaltungen und Termine vom Posaunenwerk";
    }

    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Posaunenwerk//Event Calendar//DE
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeIcalText(calendarName)}
X-WR-CALDESC:${escapeIcalText(calendarDescription)}
X-WR-TIMEZONE:Europe/Berlin
${icalEvents.join("\n")}
END:VCALENDAR`;

    const filenameParts = ["posaunenwerk"];
    if (type === "events") filenameParts.push("events");
    else if (type === "courses") filenameParts.push("courses");
    else filenameParts.push("termine");
    if (bezirkIds.length > 0) {
      filenameParts.push(`bezirk-${bezirkIds.join("-")}`);
    }

    return new NextResponse(ical, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameParts.join("-")}.ics"`,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error generating iCal feed:", error);
    return NextResponse.json(
      {
        error: "Failed to generate iCal feed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
