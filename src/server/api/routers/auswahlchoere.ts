import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, createTRPCRouter, publicProcedure } from "../trpc";

export const auswahlchoereRouter = createTRPCRouter({
  getAll: publicProcedure
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

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(15),
        subtitle: z.string(),
        founded: z.string(),
        members: z.string(),
        description: z.string(),
        color: z.string().optional(),
        colorHex: z.string().optional(),
        imageId: z.string().optional(),
        conductorId: z.string().optional(),
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
        },
      });
      return auswahlChor;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(15).optional(),
        subtitle: z.string().optional(),
        founded: z.string().optional(),
        members: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        colorHex: z.string().optional(),
        imageId: z.string().optional(),
        conductorId: z.string().optional(),
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
          ...(input.imageId && { imageId: input.imageId }),
          ...(input.conductorId && { conductorId: input.conductorId }),
        },
      });
      return auswahlChor;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.auswahlChor.delete({
        where: { id: input.id },
      });
    }),
});
