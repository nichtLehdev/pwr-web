import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  lpwProcedure,
  posaunenratProcedure,
  publicProcedure,
} from "../trpc";
import { sendEmail } from "@/server/email/send-email";
import { generateNewsletterHtml } from "@/server/email/templates/newsletter-html";
import { getBaseUrl } from "@/server/utils/get-base-url";
import { ContentStatus } from "~/generated/prisma/client";
import { marked } from "marked";
import { geocodeAddress } from "@/server/utils/geocoding";
import { createUnsubscribeToken } from "@/server/utils/unsubscribe-token";

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

  create: posaunenratProcedure
    .input(
      z.object({
        name: z.string().max(200).optional(),
        street: z.string().max(200).optional(),
        zipCode: z.string().max(20).optional(),
        city: z.string().min(1).max(100),
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

  update: lpwProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().max(200).optional(),
        street: z.string().max(200).optional(),
        zipCode: z.string().max(20).optional(),
        city: z.string().max(100).optional(),
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
        (input.city !== undefined && input.city !== existingLocation.city);

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

  delete: lpwProcedure
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

  geocode: publicProcedure
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
  subscribe: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.newsletterSubscriber.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        if (existing.isActive) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already subscribed",
          });
        }

        return await ctx.db.newsletterSubscriber.update({
          where: { email: input.email },
          data: {
            isActive: true,
            name: input.name,
            subscribedAt: new Date(),
            unsubscribedAt: null,
          },
        });
      }

      return await ctx.db.newsletterSubscriber.create({
        data: input,
      });
    }),

  unsubscribe: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const subscriber = await ctx.db.newsletterSubscriber.findUnique({
        where: { email: input.email },
      });

      if (!subscriber) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }

      return await ctx.db.newsletterSubscriber.update({
        where: { email: input.email },
        data: {
          isActive: false,
          unsubscribedAt: new Date(),
        },
      });
    }),

  getSubscribers: lpwProcedure
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

  getStatistics: lpwProcedure.query(async ({ ctx }) => {
    const [total, active, inactive] = await Promise.all([
      ctx.db.newsletterSubscriber.count(),
      ctx.db.newsletterSubscriber.count({ where: { isActive: true } }),
      ctx.db.newsletterSubscriber.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      active,
      inactive,
    };
  }),

  deleteSubscriber: lpwProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.newsletterSubscriber.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  sendNewsletter: lpwProcedure
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
      const unsubscribeUrl = `${baseUrl}/newsletter/unsubscribe`;

      const htmlContent = String(await marked.parse(input.content));

      if (!htmlContent || htmlContent.trim().length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Newsletter content cannot be empty",
        });
      }

      if (input.testEmail) {
        const emailHtml = generateNewsletterHtml({
          content: htmlContent,
          unsubscribeUrl: `${unsubscribeUrl}?email=${encodeURIComponent(input.testEmail)}&token=${createUnsubscribeToken(input.testEmail)}`,
        });

        await sendEmail({
          to: input.testEmail,
          subject: `[TEST] ${input.subject}`,
          html: emailHtml,
        });

        return {
          success: true,
          message: "Test newsletter sent",
          sentTo: 1,
        };
      }

      const subscribers = await ctx.db.newsletterSubscriber.findMany({
        where: { isActive: true },
      });

      if (subscribers.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscribers found",
        });
      }

      let successCount = 0;
      let errorCount = 0;

      for (const subscriber of subscribers) {
        try {
          const emailHtml = generateNewsletterHtml({
            content: htmlContent,
            unsubscribeUrl: `${unsubscribeUrl}?email=${encodeURIComponent(subscriber.email)}&token=${createUnsubscribeToken(subscriber.email)}`,
            subscriberName: subscriber.name || undefined,
          });

          await sendEmail({
            to: subscriber.email,
            subject: input.subject,
            html: emailHtml,
          });

          successCount++;
        } catch (error) {
          console.error(
            `Failed to send newsletter to ${subscriber.email}:`,
            error,
          );
          errorCount++;
        }
      }

      return {
        success: true,
        message: `Newsletter sent to ${successCount} subscribers`,
        sentTo: successCount,
        errors: errorCount,
      };
    }),

  generateNewsletter: lpwProcedure
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
            )}/aktuelles/${post.id}`;
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
            )}/termine/event/${event.id}`;
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
