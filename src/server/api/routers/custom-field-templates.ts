import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  userHasPermission,
  type PermissionCache,
} from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { CustomFieldType } from "~/generated/prisma/enums";
import { Prisma } from "~/generated/prisma/client";
import {
  customFieldTypeNeedsOptions,
  parseSelectOptionValues,
} from "@/lib/course-custom-fields";
import { hasApprovedCourseWithField } from "../helpers/custom-field-templates";

const templateInputSchema = z
  .object({
    fieldName: z.string().trim().min(1).max(200),
    fieldType: z.enum(CustomFieldType),
    options: z.string().max(2000).optional(),
    isRequired: z.boolean().default(false),
    helpText: z.string().max(1000).optional(),
  })
  .refine(
    (data) =>
      !customFieldTypeNeedsOptions(data.fieldType) ||
      parseSelectOptionValues(data.options ?? "").length > 0,
    {
      message: "Auswahlfelder benötigen mindestens eine Option",
      path: ["options"],
    },
  );

/**
 * Library of reusable registration fields. Templates start private to their
 * creator and become visible to everyone once a course containing the field is
 * approved (see promoteCustomFieldTemplatesForCourses). Adding a template to a
 * course copies its values, so template changes never touch existing courses.
 */
export const customFieldTemplatesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.courseCustomFieldTemplate.findMany({
      where: {
        OR: [{ isGlobal: true }, { createdById: ctx.session.user.id }],
      },
      orderBy: { fieldName: "asc" },
      include: {
        createdBy: { select: { id: true, displayName: true, username: true } },
      },
    });
  }),

  create: protectedProcedure
    .input(templateInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Same-named private templates of other users are fine; only globally
      // visible entries and the user's own must stay unique.
      const existing = await ctx.db.courseCustomFieldTemplate.findFirst({
        where: {
          fieldName: { equals: input.fieldName, mode: "insensitive" },
          OR: [{ isGlobal: true }, { createdById: ctx.session.user.id }],
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Ein Feld namens "${existing.fieldName}" ist bereits in der Bibliothek`,
        });
      }

      const isGlobal = await hasApprovedCourseWithField(
        ctx.db,
        ctx.session.user.id,
        input.fieldName,
        input.fieldType,
      );

      return await ctx.db.courseCustomFieldTemplate.create({
        data: {
          fieldName: input.fieldName,
          fieldType: input.fieldType,
          options: input.options ?? undefined,
          isRequired: input.isRequired,
          helpText: input.helpText?.trim() ? input.helpText.trim() : null,
          isGlobal,
          createdById: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string() }).and(templateInputSchema))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.courseCustomFieldTemplate.findUnique({
        where: { id: input.id },
      });
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await assertCanManageTemplate(ctx, template.createdById);

      const clash = await ctx.db.courseCustomFieldTemplate.findFirst({
        where: {
          id: { not: input.id },
          fieldName: { equals: input.fieldName, mode: "insensitive" },
          OR: [{ isGlobal: true }, { createdById: ctx.session.user.id }],
        },
      });
      if (clash) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Ein Feld namens "${clash.fieldName}" ist bereits in der Bibliothek`,
        });
      }

      return await ctx.db.courseCustomFieldTemplate.update({
        where: { id: input.id },
        data: {
          fieldName: input.fieldName,
          fieldType: input.fieldType,
          options: input.options ?? Prisma.DbNull,
          isRequired: input.isRequired,
          helpText: input.helpText?.trim() ? input.helpText.trim() : null,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.courseCustomFieldTemplate.findUnique({
        where: { id: input.id },
      });
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await assertCanManageTemplate(ctx, template.createdById);

      await ctx.db.courseCustomFieldTemplate.delete({
        where: { id: input.id },
      });
      return { success: true };
    }),
});

/** Creator may manage their own templates; courses.edit may manage any. */
async function assertCanManageTemplate(
  ctx: {
    session: { user: { id: string } };
    permissionCache: PermissionCache;
  },
  createdById: string | null,
) {
  if (createdById === ctx.session.user.id) return;

  const canEditCourses = await userHasPermission(
    ctx.session.user.id,
    PERMISSIONS.COURSES_EDIT,
    ctx.permissionCache,
  );
  if (!canEditCourses) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Nur der Ersteller oder Nutzer mit Kurs-Bearbeitungsrechten",
    });
  }
}
