import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  rateLimitedPublicProcedure,
} from "../trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { sendEmail } from "@/server/email/send-email";
import { generateNewsletterHtml } from "@/server/email/templates/newsletter-html";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { ContentStatus } from "~/generated/prisma/client";
import { marked } from "marked";
import { geocodeAddress } from "@/server/utils/geocoding";
import { searchAddresses } from "@/server/utils/address-search";
import { clientKeyFromHeaders, rateLimit } from "@/server/utils/rate-limit";
import { createUnsubscribeToken } from "@/server/utils/unsubscribe-token";
import { eventPath, postPath } from "@/lib/slug";

marked.use({
  gfm: true,
  breaks: true,
});

export const locationsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        city: z.string().optional(),
        zipCode: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.city && {
          city: { contains: input.city, mode: "insensitive" as const },
        }),
        ...(input.zipCode && { zipCode: input.zipCode }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { city: { contains: input.search, mode: "insensitive" as const } },
            {
              street: { contains: input.search, mode: "insensitive" as const },
            },
          ],
        }),
      };

      const [locations, total] = await Promise.all([
        ctx.db.location.findMany({
          where,
          include: {
            _count: {
              select: {
                events: true,
                courses: true,
                ensembles: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { city: "asc" },
        }),
        ctx.db.location.count({ where }),
      ]);

      return {
        locations,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const location = await ctx.db.location.findUnique({
        where: { id: input.id },
        include: {
          events: {
            where: {
              status: "APPROVED",
              eventDate: { gte: new Date() },
            },
            take: 10,
            orderBy: { eventDate: "asc" },
            include: {
              coverImage: true,
            },
          },
          courses: {
            where: {
              status: "APPROVED",
              endDate: { gte: new Date() },
            },
            take: 5,
            orderBy: { startDate: "asc" },
          },
          ensembles: {
            where: { isActive: true },
            include: {
              image: true,
            },
          },
        },
      });

      if (!location) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      return location;
    }),

  create: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS)
    .input(
      z.object({
        name: z.string().max(200).optional(),
        street: z.string().max(200).optional(),
        zipCode: z.string().max(20).optional(),
        city: z.string().min(1).max(100),
        country: z.string().max(100).optional(),
        additionalInfo: z.string().max(500).optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let latitude = input.latitude;
      let longitude = input.longitude;

      if (!latitude || !longitude) {
        const geocodeResult = await geocodeAddress({
          street: input.street,
          zipCode: input.zipCode,
          city: input.city,
          country: input.country,
        });
        if (geocodeResult.latitude && geocodeResult.longitude) {
          latitude = geocodeResult.latitude;
          longitude = geocodeResult.longitude;
        }
      }

      return await ctx.db.location.create({
        data: {
          ...input,
          latitude,
          longitude,
        },
      });
    }),

  update: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS)
    .input(
      z.object({
        id: z.string(),
        name: z.string().max(200).optional(),
        street: z.string().max(200).optional(),
        zipCode: z.string().max(20).optional(),
        city: z.string().max(100).optional(),
        country: z.string().max(100).optional(),
        additionalInfo: z.string().max(500).optional(),
        latitude: z.number().optional().nullable(),
        longitude: z.number().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const existingLocation = await ctx.db.location.findUnique({
        where: { id },
      });

      if (!existingLocation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      const addressChanged =
        (input.street !== undefined &&
          input.street !== existingLocation.street) ||
        (input.zipCode !== undefined &&
          input.zipCode !== existingLocation.zipCode) ||
        (input.city !== undefined && input.city !== existingLocation.city) ||
        (input.country !== undefined &&
          input.country !== existingLocation.country);

      const needsGeocoding =
        !input.latitude &&
        !input.longitude &&
        (addressChanged ||
          !existingLocation.latitude ||
          !existingLocation.longitude);

      if (needsGeocoding) {
        const geocodeResult = await geocodeAddress({
          street: input.street ?? existingLocation.street,
          zipCode: input.zipCode ?? existingLocation.zipCode,
          city: input.city ?? existingLocation.city,
          country: input.country ?? existingLocation.country,
        });
        if (geocodeResult.latitude && geocodeResult.longitude) {
          updateData.latitude = geocodeResult.latitude;
          updateData.longitude = geocodeResult.longitude;
        }
      }

      return await ctx.db.location.update({
        where: { id },
        data: updateData,
      });
    }),

  delete: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const location = await ctx.db.location.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              events: true,
              courses: true,
              ensembles: true,
            },
          },
        },
      });

      if (!location) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Location not found",
        });
      }

      if (
        location._count.events > 0 ||
        location._count.courses > 0 ||
        location._count.ensembles > 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete location that is in use",
        });
      }

      await ctx.db.location.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getByCity: publicProcedure
    .input(z.object({ city: z.string() }))
    .query(async ({ ctx, input }) => {
      const locations = await ctx.db.location.findMany({
        where: {
          city: { contains: input.city, mode: "insensitive" },
        },
        orderBy: { name: "asc" },
      });

      return locations;
    }),

  /**
   * Type-ahead address lookup for the location forms. Permission-gated (only
   * dashboard users create locations) and throttled on top, so a stuck input
   * can't hammer Photon on our behalf.
   */
  searchAddress: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS)
    .use(async ({ ctx, next }) => {
      const key = `trpc:locations.searchAddress:${clientKeyFromHeaders(
        ctx.headers,
      )}`;
      const result = rateLimit(key, { maxRequests: 60, windowMs: 60 * 1000 });
      if (!result.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Zu viele Anfragen. Bitte versuche es später erneut.",
        });
      }
      return next();
    })
    .input(z.object({ query: z.string().min(3).max(200) }))
    .query(async ({ input }) => {
      return await searchAddresses(input.query);
    }),

  // Public geocoding proxies to Nominatim — throttle so we can't be used
  // as a request amplifier (and get the deployment banned there).
  geocode: rateLimitedPublicProcedure("utils.geocode", {
    maxRequests: 10,
    windowMs: 60 * 1000,
  })
    .input(
      z.object({
        street: z.string().optional(),
        zipCode: z.string().optional(),
        city: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      return await geocodeAddress(input);
    }),
});

export const newsletterRouter = createTRPCRouter({
  // NOTE: subscribing goes exclusively through POST /api/newsletter/subscribe,
  // which creates the row unconfirmed and mails the double-opt-in link. A
  // tRPC variant used to exist here and marked new subscribers active
  // immediately — a way around the confirmation, and a way to sign up
  // addresses you do not own.

  // NOTE: unsubscribing goes exclusively through POST
  // /api/newsletter/unsubscribe, which verifies the signed token from the
  // newsletter link. A token-less tRPC variant used to exist here and let
  // anyone unsubscribe arbitrary addresses.

  getSubscribers: permissionProcedure(PERMISSIONS.NEWSLETTER_MANAGE)
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        isActive: z.boolean().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.search && {
          OR: [
            { email: { contains: input.search, mode: "insensitive" as const } },
            { name: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [subscribers, total] = await Promise.all([
        ctx.db.newsletterSubscriber.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { subscribedAt: "desc" },
        }),
        ctx.db.newsletterSubscriber.count({ where }),
      ]);

      return {
        subscribers,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getStatistics: permissionProcedure(PERMISSIONS.NEWSLETTER_MANAGE).query(
    async ({ ctx }) => {
      // `active` is what the compose screen promises to send to, so it counts
      // confirmed recipients only; pending sign-ups are reported separately.
      const [total, active, pending, inactive] = await Promise.all([
        ctx.db.newsletterSubscriber.count(),
        ctx.db.newsletterSubscriber.count({
          where: { isActive: true, confirmedAt: { not: null } },
        }),
        ctx.db.newsletterSubscriber.count({
          where: { isActive: true, confirmedAt: null },
        }),
        ctx.db.newsletterSubscriber.count({ where: { isActive: false } }),
      ]);

      return {
        total,
        active,
        pending,
        inactive,
      };
    },
  ),

  deleteSubscriber: permissionProcedure(PERMISSIONS.NEWSLETTER_MANAGE)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.newsletterSubscriber.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  sendNewsletter: permissionProcedure(PERMISSIONS.NEWSLETTER_SEND)
    .input(
      z.object({
        subject: z.string().min(1).max(200),
        content: z.string().min(1), // Markdown content
        testEmail: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const baseUrl = getBaseUrl(
        ctx.headers ? { headers: ctx.headers } : undefined,
      );
      /**
       * Where one subscriber unsubscribes: the page a human lands on, and the
       * endpoint a mail client posts to on their behalf.
       */
      const unsubscribeLinks = (email: string) => {
        const query = `email=${encodeURIComponent(email)}&token=${createUnsubscribeToken(email)}`;
        return {
          page: `${baseUrl}/newsletter/unsubscribe?${query}`,
          oneClick: `${baseUrl}/api/newsletter/unsubscribe?${query}`,
        };
      };

      /**
       * One-click unsubscribe (RFC 8058). Gmail and Yahoo expect it from bulk
       * senders, but the reason to want it is narrower: an unsubscribe button
       * in the client's own chrome is what stops people reaching for "mark as
       * spam" instead, and it is the complaint rate — not the volume — that
       * costs a sending domain its reputation.
       */
      const unsubscribeHeaders = (oneClickUrl: string) => ({
        "List-Unsubscribe": `<${oneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });

      const htmlContent = String(await marked.parse(input.content));

      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Newsletter content cannot be empty",
        });
      }

      if (input.testEmail) {
        // Same links and headers as the real thing, so a test send actually
        // exercises the unsubscribe path rather than only the layout.
        const links = unsubscribeLinks(input.testEmail);
        const emailHtml = generateNewsletterHtml({
          content: htmlContent,
          unsubscribeUrl: links.page,
        });

        await sendEmail({
          to: input.testEmail,
          subject: `[TEST] ${input.subject}`,
          html: emailHtml,
          headers: unsubscribeHeaders(links.oneClick),
        });

        return {
          success: true,
          message: "Test newsletter sent",
          sentTo: 1,
        };
      }

      // An unconfirmed row is a pending sign-up, not a recipient: sending to
      // it would defeat the double opt-in that created it.
      const subscribers = await ctx.db.newsletterSubscriber.findMany({
        where: { isActive: true, confirmedAt: { not: null } },
      });

      if (subscribers.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscribers found",
        });
      }

      let successCount = 0;
      let errorCount = 0;

      // Send in bounded-concurrency batches: a strictly sequential loop over
      // hundreds of subscribers at SMTP latency runs into request timeouts,
      // while unbounded Promise.all would hammer the SMTP server.
      const BATCH_SIZE = 10;
      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((subscriber) => {
            const links = unsubscribeLinks(subscriber.email);
            const emailHtml = generateNewsletterHtml({
              content: htmlContent,
              unsubscribeUrl: links.page,
              subscriberName: subscriber.name || undefined,
            });

            return sendEmail({
              to: subscriber.email,
              subject: input.subject,
              html: emailHtml,
              headers: unsubscribeHeaders(links.oneClick),
            });
          }),
        );
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            console.error(
              `Failed to send newsletter to ${batch[index]?.email}:`,
              result.reason,
            );
            errorCount++;
          }
        });
      }

      return {
        success: true,
        message: `Newsletter sent to ${successCount} subscribers`,
        sentTo: successCount,
        errors: errorCount,
      };
    }),

  generateNewsletter: permissionProcedure(PERMISSIONS.NEWSLETTER_MANAGE)
    .input(
      z.object({
        includeNews: z.boolean().default(true),
        includeEvents: z.boolean().default(true),
        daysBack: z.number().min(1).max(90).default(30),
        daysAhead: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - input.daysBack);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + input.daysAhead);

      const sections: string[] = [];

      if (input.includeNews) {
        const recentPosts = await ctx.db.post.findMany({
          where: {
            status: ContentStatus.APPROVED,
            publishedAt: {
              gte: startDate,
              lte: now,
            },
          },
          include: {
            coverImage: true,
            bezirk: true,
            createdBy: {
              select: {
                displayName: true,
              },
            },
          },
          orderBy: { publishedAt: "desc" },
          take: 10,
        });

        if (recentPosts.length > 0) {
          sections.push("## Neue Beiträge\n");
          for (const post of recentPosts) {
            const postUrl = `${getBaseUrl(
              ctx.headers ? { headers: ctx.headers } : undefined,
            )}${postPath(post)}`;
            const imageMarkdown = post.coverImage
              ? `![${post.coverImage.alt || post.title}](${post.coverImage.url})\n\n`
              : "";
            sections.push(
              `${imageMarkdown}### [${post.title}](${postUrl})\n\n${
                post.excerpt ? `${post.excerpt}\n\n` : ""
              }[Weiterlesen →](${postUrl})\n\n`,
            );
          }
        }
      }

      if (input.includeEvents) {
        const upcomingEvents = await ctx.db.event.findMany({
          where: {
            status: ContentStatus.APPROVED,
            cancelled: false,
            eventDate: {
              gte: now,
              lte: endDate,
            },
          },
          include: {
            coverImage: true,
            location: true,
            bezirk: true,
          },
          orderBy: { eventDate: "asc" },
          take: 10,
        });

        if (upcomingEvents.length > 0) {
          sections.push("## Kommende Termine\n");
          for (const event of upcomingEvents) {
            const eventUrl = `${getBaseUrl(
              ctx.headers ? { headers: ctx.headers } : undefined,
            )}${eventPath(event)}`;
            const eventDate = new Date(event.eventDate);
            const formattedDate = eventDate.toLocaleDateString("de-DE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const locationText = event.location
              ? `${event.location.name || ""} ${event.location.city || ""}`.trim()
              : event.districtName || "";

            sections.push(
              `### [${event.title}](${eventUrl})\n\n**Datum:** ${formattedDate}\n\n${
                locationText ? `**Ort:** ${locationText}\n\n` : ""
              }${
                event.description
                  ? `${event.description.substring(0, 200)}${
                      event.description.length > 200 ? "..." : ""
                    }\n\n`
                  : ""
              }[Mehr erfahren →](${eventUrl})\n\n`,
            );
          }
        }
      }

      if (sections.length === 0) {
        return {
          content: "Keine neuen Inhalte im ausgewählten Zeitraum.",
          hasContent: false,
        };
      }

      return {
        content: sections.join(""),
        hasContent: true,
      };
    }),
});
