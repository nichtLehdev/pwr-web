import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";

export const auswahlchoereRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const auswahlChor = await ctx.db.auswahlChor.findUnique({
        where: { id: input.id },
        include: {
          image: true,
          conductor: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              bio: true,
            },
          },
          events: {
            orderBy: { eventDate: "asc" },
            include: {
              location: true,
              priceOptions: true,
              coverImage: true,
              downloads: {
                include: {
                  download: true,
                },
              },
            },
          },
        },
      });

      if (!auswahlChor) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Auswahlchor not found",
        });
      }

      return auswahlChor;
    }),

  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            {
              description: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
      };
      const [auswahlchoere, total] = await Promise.all([
        ctx.db.auswahlChor.findMany({
          include: {
            image: true,
            conductor: true,
            events: {
              where: { eventDate: { gte: new Date() }, status: "APPROVED" },
              orderBy: { eventDate: "asc" },
              include: {
                location: true,
                priceOptions: true,
                coverImage: true,
                downloads: {
                  include: {
                    download: true,
                  },
                },
              },
              take: 5,
            },
          },
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { name: "asc" },
        }),
        ctx.db.auswahlChor.count({ where }),
      ]);
      return {
        auswahlchoere,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  create: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE)
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(15),
        subtitle: z.string().max(200),
        founded: z.string().max(100),
        members: z.string().max(200),
        description: z.string().max(5000),
        color: z.string().optional(),
        colorHex: z.string().optional(),
        imageId: z.string().optional(),
        conductorId: z.string().optional(),
        showApplication: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const image = ctx.db.media.findUnique({
        where: { id: input.imageId || "" },
      });

      if (input.imageId && !image) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Image not found",
        });
      }

      const conductor = ctx.db.user.findUnique({
        where: { id: input.conductorId || "" },
      });

      if (input.conductorId && !conductor) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Conductor not found",
        });
      }

      const auswahlChor = await ctx.db.auswahlChor.create({
        data: {
          name: input.name,
          slug: input.slug,
          subtitle: input.subtitle,
          founded: input.founded,
          members: input.members,
          description: input.description,
          color: input.color || "bg-primary",
          colorHex: input.colorHex || "#000000",
          ...(input.imageId && { imageId: input.imageId }),
          ...(input.conductorId && { conductorId: input.conductorId }),
          ...(input.showApplication !== undefined && {
            showApplication: input.showApplication,
          }),
        },
      });
      return auswahlChor;
    }),

  update: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_AUSWAHLCHOERE)
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(15).optional(),
        subtitle: z.string().max(200).optional(),
        founded: z.string().max(100).optional(),
        members: z.string().max(200).optional(),
        description: z.string().max(5000).optional(),
        color: z.string().optional(),
        colorHex: z.string().optional(),
        imageId: z.string().optional(),
        conductorId: z.string().optional(),
        showApplication: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const image = ctx.db.media.findUnique({
        where: { id: input.imageId || "" },
      });

      if (input.imageId && !image) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Image not found",
        });
      }

      const conductor = ctx.db.user.findUnique({
        where: { id: input.conductorId || "" },
      });

      if (input.conductorId && !conductor) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Conductor not found",
        });
      }

      const auswahlChor = await ctx.db.auswahlChor.update({
        where: { id: input.id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.slug && { slug: input.slug }),
          ...(input.subtitle && { subtitle: input.subtitle }),
          ...(input.founded && { founded: input.founded }),
          ...(input.members && { members: input.members }),
          ...(input.description && { description: input.description }),
          ...(input.color && { color: input.color }),
          ...(input.colorHex && { colorHex: input.colorHex }),
          ...(input.imageId !== undefined && {
            imageId: input.imageId || null,
          }),
          ...(input.conductorId !== undefined && {
            conductorId: input.conductorId || null,
          }),
          ...(input.showApplication !== undefined && {
            showApplication: input.showApplication,
          }),
        },
      });
      return auswahlChor;
    }),

  delete: permissionProcedure(PERMISSIONS.AUSWAHLCHOERE_DELETE)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.auswahlChor.delete({
        where: { id: input.id },
      });
    }),
});
