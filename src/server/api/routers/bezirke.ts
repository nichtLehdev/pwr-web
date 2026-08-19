import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { bezirkPersonInclude, toBezirkPerson } from "../helpers/people";
import type { Prisma } from "~/generated/prisma/client";
import { lenientPhoneSchema } from "@/lib/phone-number";

/** Obleute eines Bezirks, sortiert wie im Dashboard gepflegt. */
const bezirkPeople = {
  include: bezirkPersonInclude,
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
} satisfies Prisma.Bezirk$peopleArgs;

export const bezirkeRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const bezirke = await ctx.db.bezirk.findMany({
      include: {
        people: bezirkPeople,
        _count: {
          select: {
            ensembles: { where: { isActive: true } },
            events: {
              where: {
                status: "APPROVED",
                eventDate: { gte: new Date() },
              },
            },
            courses: {
              where: {
                status: "APPROVED",
                endDate: { gte: new Date() },
              },
            },
          },
        },
      },
      orderBy: { number: "asc" },
    });

    return bezirke.map(({ people, ...bezirk }) => ({
      ...bezirk,
      obleute: people.map(toBezirkPerson),
    }));
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const bezirk = await ctx.db.bezirk.findUnique({
        where: { id: input.id },
        include: {
          people: bezirkPeople,
          ensembles: {
            where: { isActive: true },
            include: {
              image: true,
              conductor: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
            orderBy: { name: "asc" },
          },
          events: {
            where: {
              status: "APPROVED",
              eventDate: { gte: new Date() },
            },
            take: 10,
            orderBy: { eventDate: "asc" },
            include: {
              coverImage: true,
              location: true,
              downloads: {
                include: {
                  download: true,
                },
              },
            },
          },
          courses: {
            where: {
              status: "APPROVED",
              endDate: { gte: new Date() },
            },
            take: 5,
            orderBy: { startDate: "asc" },
            include: {
              location: true,
            },
          },
          posts: {
            where: {
              status: "APPROVED",
            },
            take: 5,
            orderBy: { publishedAt: "desc" },
            include: {
              coverImage: true,
              createdBy: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
            },
          },
        },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      const { people, ...rest } = bezirk;
      return {
        ...rest,
        obleute: people.map(toBezirkPerson),
      };
    }),

  getByNumber: publicProcedure
    .input(z.object({ number: z.number().min(1).max(13) }))
    .query(async ({ ctx, input }) => {
      const bezirk = await ctx.db.bezirk.findUnique({
        where: { number: input.number },
        include: {
          people: bezirkPeople,
          _count: {
            select: {
              ensembles: { where: { isActive: true } },
              events: { where: { status: "APPROVED" } },
              courses: { where: { status: "APPROVED" } },
            },
          },
        },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      const { people, ...rest } = bezirk;
      return {
        ...rest,
        obleute: people.map(toBezirkPerson),
      };
    }),

  getStatistics: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const bezirk = await ctx.db.bezirk.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              ensembles: { where: { isActive: true } },
              events: { where: { status: "APPROVED" } },
              courses: { where: { status: "APPROVED" } },
              posts: { where: { status: "APPROVED" } },
              people: true,
            },
          },
        },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      const upcomingEvents = await ctx.db.event.count({
        where: {
          bezirkId: input.id,
          status: "APPROVED",
          eventDate: { gte: new Date() },
        },
      });

      const activeCourses = await ctx.db.course.count({
        where: {
          bezirkId: input.id,
          status: "APPROVED",
          endDate: { gte: new Date() },
        },
      });

      return {
        totalEnsembles: bezirk._count.ensembles,
        totalEvents: bezirk._count.events,
        upcomingEvents,
        totalCourses: bezirk._count.courses,
        activeCourses,
        totalPosts: bezirk._count.posts,
        totalObleute: bezirk._count.people,
      };
    }),

  /**
   * Get all users for dropdown selection
   */
  getUsersForDropdown: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE,
  ).query(async ({ ctx }) => {
    return await ctx.db.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        username: true,
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
    });
  }),

  /**
   * Obleute eines Bezirks setzen. Jeder Eintrag steht für sich: entweder mit
   * verknüpftem Benutzerkonto oder mit frei gepflegten Angaben — ein Konto ist
   * ausdrücklich nicht nötig. Die Liste ersetzt den bisherigen Stand.
   */
  setPeople: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE)
    .input(
      z.object({
        bezirkId: z.string(),
        people: z
          .array(
            z.object({
              /** Vorhandener Datensatz; fehlt bei neuen Einträgen. */
              id: z.string().optional(),
              userId: z.string().optional().nullable(),
              name: z.string().max(100).optional().nullable(),
              email: z.email().optional().nullable(),
              phone: lenientPhoneSchema.optional().nullable(),
              street: z.string().max(200).optional().nullable(),
              zipCode: z.string().max(20).optional().nullable(),
              city: z.string().max(100).optional().nullable(),
              bio: z.string().max(2000).optional().nullable(),
              imageId: z.string().optional().nullable(),
              roleName: z.string().min(1).max(100),
              sortOrder: z.number().int().default(0),
            }),
          )
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { bezirkId, people } = input;

      const bezirk = await ctx.db.bezirk.findUnique({
        where: { id: bezirkId },
      });
      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      for (const person of people) {
        if (!person.userId && !person.name?.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Jeder Eintrag braucht entweder einen Benutzer oder einen Namen.",
          });
        }
      }

      const linkedUserIds = people
        .map((person) => person.userId)
        .filter((id): id is string => !!id);
      if (new Set(linkedUserIds).size !== linkedUserIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ein Benutzer kann pro Bezirk nur einmal eingetragen sein.",
        });
      }

      const existing = await ctx.db.bezirkPerson.findMany({
        where: { bezirkId },
        select: { id: true, userId: true },
      });
      const keptIds = new Set(
        people.map((person) => person.id).filter(Boolean) as string[],
      );
      const removed = existing.filter((row) => !keptIds.has(row.id));

      // Alles oder nichts: ein Fehler mittendrin darf den Bezirk nicht halb
      // geleert zurücklassen.
      await ctx.db.$transaction(async (tx) => {
        if (removed.length > 0) {
          await tx.bezirkPerson.deleteMany({
            where: { id: { in: removed.map((row) => row.id) } },
          });
        }

        for (const [index, person] of people.entries()) {
          const data = {
            bezirkId,
            userId: person.userId ?? null,
            name: person.name ?? null,
            email: person.email ?? null,
            phone: person.phone ?? null,
            street: person.street ?? null,
            zipCode: person.zipCode ?? null,
            city: person.city ?? null,
            bio: person.bio ?? null,
            imageId: person.imageId ?? null,
            roleName: person.roleName,
            sortOrder: person.sortOrder || index,
          };

          if (person.id) {
            await tx.bezirkPerson.update({ where: { id: person.id }, data });
          } else {
            await tx.bezirkPerson.create({ data });
          }
        }

        // Die Rollenbezeichnung am Benutzerkonto spiegelt weiterhin das Amt —
        // Suche, Navigation und Kursansichten lesen sie dort.
        const removedUserIds = removed
          .map((row) => row.userId)
          .filter((id): id is string => !!id)
          .filter((id) => !linkedUserIds.includes(id));
        if (removedUserIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: removedUserIds } },
            data: { districtRoleName: null },
          });
        }

        for (const person of people) {
          if (!person.userId) continue;
          await tx.user.update({
            where: { id: person.userId },
            data: { bezirkId, districtRoleName: person.roleName },
          });
        }
      });

      return { success: true };
    }),
});
