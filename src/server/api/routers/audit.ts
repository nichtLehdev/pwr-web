import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import type { Prisma } from "~/generated/prisma/client";

export const auditRouter = createTRPCRouter({
  list: permissionProcedure(PERMISSIONS.AUDIT_VIEW)
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        action: z.string().max(100).optional(),
        entityType: z.string().max(100).optional(),
        search: z.string().max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const search = input.search?.trim();
      const where: Prisma.AuditLogWhereInput = {
        ...(input.action && { action: input.action }),
        ...(input.entityType && { entityType: input.entityType }),
        ...(search && {
          OR: [
            { actorEmail: { contains: search, mode: "insensitive" } },
            { entityId: { contains: search, mode: "insensitive" } },
            { action: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      const [entries, total] = await Promise.all([
        ctx.db.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.auditLog.count({ where }),
      ]);

      return {
        entries,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  /** Distinct action values, for the filter dropdown. */
  actions: permissionProcedure(PERMISSIONS.AUDIT_VIEW).query(
    async ({ ctx }) => {
      const rows = await ctx.db.auditLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
        take: 200,
      });
      return rows.map((r) => r.action);
    },
  ),
});
