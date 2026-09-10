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
        limit: z.number().min(1).max(250).default(50),
        /* Set filters: an empty array means "no restriction". */
        action: z.array(z.string().max(100)).optional(),
        entityType: z.array(z.string().max(100)).optional(),
        search: z.string().max(200).optional(),
        sortBy: z
          .enum(["createdAt", "actorEmail", "action", "entityType"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const search = input.search?.trim();
      const actions = input.action?.length ? input.action : undefined;
      const entityTypes = input.entityType?.length
        ? input.entityType
        : undefined;
      const where: Prisma.AuditLogWhereInput = {
        ...(actions && { action: { in: actions } }),
        ...(entityTypes && { entityType: { in: entityTypes } }),
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
          // Zweites Kriterium, damit das Blättern bei gleichen Werten stabil
          // bleibt und keine Zeile zweimal auf verschiedenen Seiten auftaucht.
          orderBy:
            input.sortBy === "createdAt"
              ? [{ createdAt: input.sortOrder }]
              : [{ [input.sortBy]: input.sortOrder }, { createdAt: "desc" }],
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

  /** Distinct action values, for the column filter. */
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

  /** Distinct entity types, for the column filter. */
  entityTypes: permissionProcedure(PERMISSIONS.AUDIT_VIEW).query(
    async ({ ctx }) => {
      const rows = await ctx.db.auditLog.findMany({
        distinct: ["entityType"],
        select: { entityType: true },
        orderBy: { entityType: "asc" },
        take: 200,
      });
      return rows.map((r) => r.entityType);
    },
  ),
});
