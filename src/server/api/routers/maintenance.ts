import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { clearMaintenanceCache } from "@/server/maintenance";
import { MAINTENANCE_DEFAULT_MESSAGE } from "@/lib/maintenance";

const maintenanceProcedure = permissionProcedure(PERMISSIONS.SYSTEM_MANAGE);

/** Die Tabelle hat genau eine Zeile; die Migration legt sie an. */
const ROW_ID = 1;

export const maintenanceRouter = createTRPCRouter({
  /**
   * Aktueller Zustand für das Dashboard.
   *
   * Öffentlich lesbar: Die Wartungsseite zeigt denselben Text ohnehin jedem
   * Besucher, hier steckt nichts Schützenswertes drin.
   */
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
      /**
       * Wenn MAINTENANCE_MODE gesetzt ist, lässt sich die Wartung im Dashboard
       * nicht abschalten — das Dashboard soll das sagen können, statt einen
       * Schalter anzubieten, der nichts bewirkt.
       */
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
        // Leerer Text bedeutet "Standardtext", nicht "leere Seite".
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

      // Ohne das griffe der Schalter erst, wenn der kurze Cache abgelaufen ist.
      clearMaintenanceCache();

      return row;
    }),
});
