import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const savedParticipantsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.savedParticipant.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        birthDate: z.date(),
        city: z.string().min(1).max(100),
        instrument: z.string().max(100).optional(),
        customFields: z.record(z.string(), z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.savedParticipant.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
          customFields: input.customFields || {},
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        birthDate: z.date().optional(),
        city: z.string().min(1).max(100).optional(),
        instrument: z.string().max(100).optional(),
        customFields: z.record(z.string(), z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const savedParticipant = await ctx.db.savedParticipant.findUnique({
        where: { id },
      });

      if (!savedParticipant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved participant not found",
        });
      }

      if (savedParticipant.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this participant",
        });
      }

      return await ctx.db.savedParticipant.update({
        where: { id },
        data: {
          ...updateData,
          customFields:
            updateData.customFields !== undefined
              ? updateData.customFields
              : (savedParticipant.customFields ?? {}),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const savedParticipant = await ctx.db.savedParticipant.findUnique({
        where: { id: input.id },
      });

      if (!savedParticipant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved participant not found",
        });
      }

      if (savedParticipant.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this participant",
        });
      }

      await ctx.db.savedParticipant.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
