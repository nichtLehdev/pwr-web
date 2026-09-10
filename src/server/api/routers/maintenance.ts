import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { clearMaintenanceCache } from "@/server/maintenance";
import { MAINTENANCE_DEFAULT_MESSAGE } from "@/lib/maintenance";

const maintenanceProcedure = permissionProcedure(PERMISSIONS.SYSTEM_MANAGE);

const ROW_ID = 1;

export const maintenanceRouter = createTRPCRouter({
  /** Öffentlich lesbar — die Wartungsseite zeigt denselben Text ohnehin. */
  get: publicProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.maintenanceState.findUnique({
      where: { id: ROW_ID },
      include: {
        updatedBy: { select: { id: true, displayName: true, email: true } },
      },
    });

    return {
      enabled: row?.enabled ?? false,
      message: row?.message ?? null,
      until: row?.until ?? null,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
      /** Ist die Wartung per Env erzwungen, bewirkt der Schalter nichts. */
      forcedByEnv:
        process.env.MAINTENANCE_MODE?.trim().toLowerCase() === "true" ||
        process.env.MAINTENANCE_MODE?.trim() === "1",
      defaultMessage: MAINTENANCE_DEFAULT_MESSAGE,
    };
  }),

  set: maintenanceProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        message: z.string().trim().max(500).optional(),
        until: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        enabled: input.enabled,
        message: input.message?.length ? input.message : null,
        until: input.until ?? null,
        updatedById: ctx.session.user.id,
      };

      const row = await ctx.db.maintenanceState.upsert({
        where: { id: ROW_ID },
        create: { id: ROW_ID, ...data },
        update: data,
      });

      clearMaintenanceCache();

      return row;
    }),
});
