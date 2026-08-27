import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  CourseType,
  ContentStatus,
  CustomFieldType,
  CourseCollaboratorRole,
  RegistrationStatus,
} from "~/generated/prisma/client";
import type { Prisma } from "~/generated/prisma/client";
import { userHasPermission } from "../helpers/permissions";
import { authorMayChangeStatus } from "../helpers/content-status";
import {
  assertDistrictAllowed,
  assertDistrictChangeAllowed,
  districtScopeFilter,
  resolveDistrictScope,
} from "../helpers/district-scope";
import { changesRestrictedFlag } from "../helpers/restricted-flag";
import { promoteCustomFieldTemplatesForCourses } from "../helpers/custom-field-templates";
import {
  notifyCreatorOfReviewResult,
  notifySubmittedForReview,
} from "../helpers/review-notifications";
import { PERMISSIONS } from "@/lib/permissions";
import { getCourseCapacitySummary } from "@/lib/course-available-slots";
import { validatePriceOptionDistinctness } from "@/lib/course-price-options";
import {
  isExternalCourse,
  normalizeExternalRegistrationUrl,
} from "@/lib/course-external";
import { getCourseRegistrationStats } from "@/lib/course-registration-stats";
import { permissionProcedure } from "../middleware/permissions";
import {
  userCanEditCourseRecord,
  userCanManageCourseTeam,
} from "../helpers/course-access";
import { createCourseSlug, updateCourseSlug } from "../helpers/content-slug";
import { isUuid, MAX_SLUG_LENGTH } from "@/lib/slug";
import { pairPriceOptions } from "../helpers/price-option-pairing";

/** Nested args for `Course.collaborators` on public course queries. */
const courseCollaboratorsForPublic = {
  orderBy: [
    { role: "asc" as const },
    { user: { displayName: "asc" as const } },
  ],
  include: {
    user: {
      select: {
        id: true,
        displayName: true,
        profileImage: true,
        bio: true,
      },
    },
  },
};

const externalProviderNameSchema = z.string().max(200).optional();

const externalRegistrationUrlSchema = z
  .string()
  .max(2000)
  .optional()
  .refine((val) => !val?.trim() || /^https?:\/\/.+/i.test(val.trim()), {
    message: "Bitte gib eine gültige URL ein (mit http:// oder https://).",
  });

/**
 * Preiskategorien müssen auseinanderzuhalten sein: gleiche Namen sind
 * erlaubt, brauchen dann aber unterschiedliche Beschreibungen. Sonst stehen
 * sie in der Anmeldung zweimal identisch da.
 */
const priceOptionsMustBeDistinct = (
  options:
    ReadonlyArray<{ label: string; description?: string | null }> | undefined,
  ctx: z.RefinementCtx,
) => {
  if (!options) return;
  const message = validatePriceOptionDistinctness(options);
  if (message) ctx.addIssue({ code: "custom", message });
};

export const coursesRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        courseType: z.enum(CourseType).optional(),
        bezirkId: z.string().optional(),
        registrationOpen: z.boolean().optional(),
        upcoming: z.boolean().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const where = {
        status: ContentStatus.APPROVED,
        ...(input.courseType && { courseType: input.courseType }),
        ...(input.bezirkId && { bezirkId: input.bezirkId }),
        ...(input.registrationOpen && { registrationOpen: true }),
        ...(input.upcoming && { endDate: { gte: now } }),
        ...(input.search && {
          OR: [
            { title: { contains: input.search, mode: "insensitive" as const } },
            {
              description: {
                contains: input.search,
                mode: "insensitive" as const,
              },
            },
            { motto: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [coursesRaw, total] = await Promise.all([
        ctx.db.course.findMany({
          where,
          include: {
            image: true,
            location: true,
            bezirk: true,
            collaborators: courseCollaboratorsForPublic,
            priceOptions: true,
            customFields: true,
            registrations: {
              where: {
                registrationStatus: RegistrationStatus.CONFIRMED,
              },
              // select (not include): a registration row carries the
              // registrant's full contact and billing data, which a public
              // course list must never fetch just to count participants.
              select: {
                registrationStatus: true,
                participants: {
                  select: { priceOptionId: true, priceOption: true },
                },
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { startDate: "asc" },
        }),
        ctx.db.course.count({ where }),
      ]);

      const courses = coursesRaw.map((course) => {
        const participantCount = course.registrations.reduce(
          (sum, reg) => sum + reg.participants.length,
          0,
        );
        const summary = getCourseCapacitySummary(course);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { registrations, ...courseWithoutRegistrations } = course;
        return {
          ...courseWithoutRegistrations,
          _count: {
            participants: participantCount,
          },
          availableSlots: summary.availableSlots,
          registrationTotalCapacity: summary.totalCapacity,
        };
      });

      return {
        courses,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  /**
   * Accepts either the UUID or the slug. Public links use the slug; the
   * dashboard and links shared before slugs existed still pass a UUID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const courseRaw = await ctx.db.course.findFirst({
        where: isUuid(input.id) ? { id: input.id } : { slug: input.id },
        include: {
          image: true,
          location: true,
          bezirk: true,
          collaborators: courseCollaboratorsForPublic,
          guestTeamMembers: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, displayName: true, bio: true },
          },
          priceOptions: {
            orderBy: { createdAt: "asc" },
          },
          customFields: {
            orderBy: { sortOrder: "asc" },
          },
          createdBy: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      if (!courseRaw) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      let viewerCollaboratorRole: CourseCollaboratorRole | null = null;
      if (ctx.session?.user) {
        const collabMe = await ctx.db.courseCollaborator.findUnique({
          where: {
            courseId_userId: {
              courseId: courseRaw.id,
              userId: ctx.session.user.id,
            },
          },
          select: { role: true },
        });
        viewerCollaboratorRole = collabMe?.role ?? null;
      }

      if (courseRaw.status !== ContentStatus.APPROVED) {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Course not published",
          });
        }
        const canView =
          courseRaw.createdById === ctx.session.user.id ||
          (await userHasPermission(
            ctx.session.user.id,
            PERMISSIONS.COURSES_VIEW,
            ctx.permissionCache,
          )) ||
          (await userHasPermission(
            ctx.session.user.id,
            PERMISSIONS.COURSES_APPROVE,
            ctx.permissionCache,
          )) ||
          viewerCollaboratorRole !== null;

        if (!canView) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Course not published",
          });
        }
      }

      const registrationStats = await getCourseRegistrationStats(
        ctx.db,
        courseRaw.id,
      );

      return {
        ...courseRaw,
        viewerCollaboratorRole,
        _count: {
          participants: registrationStats.totalConfirmedParticipants,
        },
        registrationStats,
      };
    }),

  getMine: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(ContentStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        createdById: ctx.session.user.id,
        ...(input.status && { status: input.status }),
      };

      const [coursesRaw, total] = await Promise.all([
        ctx.db.course.findMany({
          where,
          include: {
            image: true,
            location: true,
            bezirk: true,
            priceOptions: true,
            registrations: {
              where: {
                registrationStatus: RegistrationStatus.CONFIRMED,
              },
              select: {
                _count: {
                  select: { participants: true },
                },
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.course.count({ where }),
      ]);

      const courses = coursesRaw.map((course) => {
        const participantCount = course.registrations.reduce(
          (sum, reg) => sum + reg._count.participants,
          0,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { registrations, ...courseWithoutRegistrations } = course;
        return {
          ...courseWithoutRegistrations,
          _count: {
            participants: participantCount,
          },
        };
      });

      return {
        courses,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getDashboardCourses: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(ContentStatus).optional(),
        /** Default `active`: laufend + zukünftig; Entwürfe immer sichtbar (Datum oft noch Provisorium). */
        schedule: z.enum(["active", "all", "past"]).default("active"),
        sortBy: z
          .enum(["startDate", "title", "createdAt", "status"])
          .default("startDate"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const collaboratorRows = await ctx.db.courseCollaborator.findMany({
        where: { userId },
        select: { courseId: true },
      });
      const collaboratorCourseIds = collaboratorRows.map((r) => r.courseId);
      const sharedAccessOr: Record<string, unknown>[] = [
        { createdById: userId },
      ];
      if (collaboratorCourseIds.length > 0) {
        sharedAccessOr.push({ id: { in: collaboratorCourseIds } });
      }

      const canApproveAll = await userHasPermission(
        userId,
        PERMISSIONS.COURSES_APPROVE,
        ctx.permissionCache,
      );
      const canApproveOwn = await userHasPermission(
        userId,
        PERMISSIONS.COURSES_CREATE,
        ctx.permissionCache,
      );

      let where: Record<string, unknown> = {};

      if (canApproveAll) {
        if (input.status) {
          where.status = input.status;
        }
      } else if (canApproveOwn) {
        if (input.status) {
          if (input.status === ContentStatus.DRAFT) {
            where = {
              status: ContentStatus.DRAFT,
              OR: sharedAccessOr,
            };
          } else {
            where.status = input.status;
          }
        } else {
          where = {
            OR: [{ status: { not: ContentStatus.DRAFT } }, ...sharedAccessOr],
          };
        }
      } else {
        where =
          input.status !== undefined
            ? {
                status: input.status,
                OR: sharedAccessOr,
              }
            : { OR: sharedAccessOr };
      }

      // Obleute sehen die Liste ihres eigenen Bezirks, nicht die aller 13.
      const scope = await resolveDistrictScope(
        ctx.db,
        userId,
        "courses",
        ctx.permissionCache,
      );
      const scopeFilter = districtScopeFilter(scope, userId);
      if (scopeFilter) {
        where = { AND: [{ ...where }, scopeFilter] };
      }

      const scheduleWhere: Prisma.CourseWhereInput =
        input.schedule === "all"
          ? {}
          : input.schedule === "active"
            ? {
                OR: [
                  { endDate: { gte: new Date() } },
                  { status: ContentStatus.DRAFT },
                ],
              }
            : { endDate: { lt: new Date() } };

      const whereWithSchedule: Prisma.CourseWhereInput =
        input.schedule === "all"
          ? (where as Prisma.CourseWhereInput)
          : { AND: [where as Prisma.CourseWhereInput, scheduleWhere] };

      const [coursesRaw, total] = await Promise.all([
        ctx.db.course.findMany({
          where: whereWithSchedule,
          include: {
            image: true,
            location: true,
            bezirk: true,
            createdBy: {
              select: {
                id: true,
                displayName: true,
              },
            },
            reviewer: { select: { id: true, displayName: true } },
            priceOptions: true,
            registrations: {
              where: {
                registrationStatus: RegistrationStatus.CONFIRMED,
              },
              select: {
                _count: {
                  select: { participants: true },
                },
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { [input.sortBy]: input.sortOrder },
        }),
        ctx.db.course.count({ where: whereWithSchedule }),
      ]);

      const courses = coursesRaw.map((course) => {
        const participantCount = course.registrations.reduce(
          (sum, reg) => sum + reg._count.participants,
          0,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { registrations, ...courseWithoutRegistrations } = course;
        return {
          ...courseWithoutRegistrations,
          _count: {
            participants: participantCount,
          },
        };
      });

      return {
        courses,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  getPendingReview: permissionProcedure(PERMISSIONS.COURSES_APPROVE)
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        bezirkId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // PENDING is the review marker itself — a separate pendingReview
      // column never existed in the schema.
      const where: {
        status: ContentStatus;
        bezirkId?: string;
      } = {
        status: ContentStatus.PENDING,
      };
      if (input.bezirkId) {
        where.bezirkId = input.bezirkId;
      }
      const [coursesRaw, total] = await Promise.all([
        ctx.db.course.findMany({
          where,
          include: {
            image: true,
            location: true,
            bezirk: true,
            priceOptions: true,
            registrations: {
              where: {
                registrationStatus: RegistrationStatus.CONFIRMED,
              },
              select: {
                _count: {
                  select: { participants: true },
                },
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.course.count({ where }),
      ]);

      const courses = coursesRaw.map((course) => {
        const participantCount = course.registrations.reduce(
          (sum, reg) => sum + reg._count.participants,
          0,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { registrations, ...courseWithoutRegistrations } = course;
        return {
          ...courseWithoutRegistrations,
          _count: {
            participants: participantCount,
          },
        };
      });

      return {
        courses,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  create: protectedProcedure
    .input(
      z
        .object({
          title: z.string().min(1).max(200),
          /** Empty means "derive it from the title"; see createCourseSlug. */
          slug: z.string().max(MAX_SLUG_LENGTH).optional(),
          motto: z.string().max(500).optional(),
          description: z.string().min(1).max(10000),
          imageId: z.string().optional(),
          startDate: z.date(),
          endDate: z.date(),
          locationId: z.string().optional(),
          courseType: z.enum(CourseType),
          bezirkId: z.string().optional(),
          registrationOpen: z.boolean().default(false),
          registrationOpensAt: z.date().optional(),
          registrationDeadline: z.date().optional(),
          externalProviderName: externalProviderNameSchema,
          externalRegistrationUrl: externalRegistrationUrlSchema,
          maxParticipants: z.number().min(1).max(500).optional(),
          allowWaitingList: z.boolean().default(false),
          allowSiblingDiscount: z.boolean().default(false),
          isFree: z.boolean().default(false),
          paymentCashAllowed: z.boolean().default(true),
          paymentInvoiceAllowed: z.boolean().default(true),
          invoicingEnabled: z.boolean().default(false),
          priceInfo: z.string().max(1000).optional(),
          prerequisites: z.string().max(1000).optional(),
          whatToBring: z.string().max(1000).optional(),
          priceOptions: z
            .array(
              z.object({
                price: z.number().min(0),
                label: z.string().min(1).max(100),
                description: z.string().max(500).optional(),
                maxParticipants: z.number().min(1).max(500).optional(),
              }),
            )
            .optional()
            .superRefine(priceOptionsMustBeDistinct),
          customFields: z
            .array(
              z.object({
                fieldName: z.string(),
                fieldType: z.enum(CustomFieldType),
                options: z.string().optional(),
                isRequired: z.boolean().default(false),
                helpText: z.string().optional(),
                sortOrder: z.number().default(0),
              }),
            )
            .optional(),
        })
        .refine((data) => data.endDate >= data.startDate, {
          message: "Enddatum muss nach oder gleich dem Startdatum sein",
          path: ["endDate"],
        })
        .refine(
          // The deadline arrives as end-of-day (23:59:59), so "on the start
          // date" means it may be up to 24h past the start moment.
          (data) =>
            !data.registrationDeadline ||
            data.registrationDeadline.getTime() <=
              data.startDate.getTime() + 24 * 60 * 60 * 1000,
          {
            message: "Anmeldeschluss muss vor oder am Startdatum sein",
            path: ["registrationDeadline"],
          },
        )
        .refine(
          (data) =>
            !data.registrationOpensAt ||
            !data.registrationDeadline ||
            data.registrationOpensAt <= data.registrationDeadline,
          {
            message: "Anmeldungsstart muss vor oder am Anmeldeschluss sein",
            path: ["registrationOpensAt"],
          },
        )
        .refine(
          (data) =>
            !data.registrationOpensAt ||
            data.registrationOpensAt.getTime() < data.startDate.getTime(),
          {
            message: "Der geplante Anmeldungsbeginn muss vor Kursbeginn liegen",
            path: ["registrationOpensAt"],
          },
        )
        .refine(
          (data) =>
            isExternalCourse({
              externalRegistrationUrl: data.externalRegistrationUrl ?? null,
            }) ||
            (data.maxParticipants != null && data.maxParticipants >= 1),
          {
            message: "Bitte gib eine maximale Teilnehmerzahl ein.",
            path: ["maxParticipants"],
          },
        )
        .refine(
          (data) =>
            isExternalCourse({
              externalRegistrationUrl: data.externalRegistrationUrl ?? null,
            }) ||
            data.isFree ||
            data.paymentCashAllowed ||
            data.paymentInvoiceAllowed,
          {
            message:
              "Bei kostenpflichtigen Kursen mindestens eine Zahlungsart (Bar oder Rechnung) aktivieren.",
            path: ["paymentCashAllowed"],
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const { priceOptions, customFields, ...courseData } = input;
      const externalUrl = normalizeExternalRegistrationUrl(
        input.externalRegistrationUrl,
      );
      const external = Boolean(externalUrl);

      const canCreate = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_CREATE,
        ctx.permissionCache,
      );
      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung, Kurse anzulegen",
        });
      }

      const scope = await resolveDistrictScope(
        ctx.db,
        ctx.session.user.id,
        "courses",
        ctx.permissionCache,
      );
      assertDistrictAllowed(scope, input.bezirkId);

      const canManageDiscounts = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
        ctx.permissionCache,
      );
      if (!external && input.allowSiblingDiscount && !canManageDiscounts) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only LPW and Admin can enable sibling discount",
        });
      }

      const canEnableInvoicing = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_ENABLE_INVOICING,
        ctx.permissionCache,
      );
      if (input.invoicingEnabled && !canEnableInvoicing) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Keine Berechtigung, die Rechnungsstellung für Kurse freizuschalten",
        });
      }

      const course = await ctx.db.course.create({
        data: {
          ...courseData,
          slug: await createCourseSlug(
            ctx.db,
            input.title,
            input.startDate,
            input.slug,
          ),
          externalProviderName: external
            ? input.externalProviderName?.trim() || null
            : null,
          externalRegistrationUrl: externalUrl,
          maxParticipants: external ? null : courseData.maxParticipants,
          allowWaitingList: external ? false : courseData.allowWaitingList,
          allowSiblingDiscount: external
            ? false
            : input.allowSiblingDiscount && canManageDiscounts,
          // Nothing to invoice when registration happens on someone else's site.
          invoicingEnabled: external
            ? false
            : input.invoicingEnabled && canEnableInvoicing,
          isFree: external ? true : courseData.isFree,
          createdById: ctx.session.user.id,
          priceOptions:
            !external && priceOptions
              ? {
                  create: priceOptions,
                }
              : undefined,
          customFields:
            !external && customFields
              ? {
                  create: customFields,
                }
              : undefined,
        },
        include: {
          location: true,
          priceOptions: true,
          customFields: true,
        },
      });

      if (course.status === ContentStatus.PENDING) {
        await notifySubmittedForReview({
          db: ctx.db,
          contentType: "course",
          contentId: course.id,
          title: course.title,
          actorId: ctx.session.user.id,
        });
      }

      return course;
    }),

  update: protectedProcedure
    .input(
      z
        .object({
          id: z.string(),
          title: z.string().min(1).max(200).optional(),
          /** Only sent when the author deliberately renamed it; empty = leave as is. */
          slug: z.string().max(MAX_SLUG_LENGTH).optional(),
          motto: z.string().max(500).optional(),
          description: z.string().max(10000).optional(),
          imageId: z.string().optional().nullable(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          locationId: z.string().optional().nullable(),
          courseType: z.enum(CourseType).optional(),
          bezirkId: z.string().optional().nullable(),
          registrationOpen: z.boolean().optional(),
          registrationOpensAt: z.date().optional().nullable(),
          registrationDeadline: z.date().optional().nullable(),
          externalProviderName: externalProviderNameSchema.nullable(),
          externalRegistrationUrl: externalRegistrationUrlSchema.nullable(),
          maxParticipants: z.number().min(1).max(500).optional().nullable(),
          allowWaitingList: z.boolean().optional(),
          allowSiblingDiscount: z.boolean().optional(),
          isFree: z.boolean().optional(),
          paymentCashAllowed: z.boolean().optional(),
          paymentInvoiceAllowed: z.boolean().optional(),
          invoicingEnabled: z.boolean().optional(),
          priceInfo: z.string().max(1000).optional(),
          prerequisites: z.string().max(1000).optional(),
          whatToBring: z.string().max(1000).optional(),
          priceOptions: z
            .array(
              z.object({
                id: z.string().optional(),
                price: z.number().min(0),
                label: z.string().min(1).max(100),
                description: z.string().max(500).optional(),
                maxParticipants: z.number().min(1).max(500).optional(),
              }),
            )
            .optional()
            .superRefine(priceOptionsMustBeDistinct),
          customFields: z
            .array(
              z.object({
                id: z.string().optional(),
                fieldName: z.string(),
                fieldType: z.enum(CustomFieldType),
                options: z.string().optional(),
                isRequired: z.boolean().default(false),
                helpText: z.string().optional(),
                sortOrder: z.number().default(0),
              }),
            )
            .optional(),
          status: z.nativeEnum(ContentStatus).optional(),
        })
        .refine(
          (data) =>
            !data.startDate || !data.endDate || data.endDate >= data.startDate,
          {
            message: "Enddatum muss nach oder gleich dem Startdatum sein",
            path: ["endDate"],
          },
        )
        .refine(
          // The deadline arrives as end-of-day (23:59:59), so "on the start
          // date" means it may be up to 24h past the start moment.
          (data) =>
            !data.registrationDeadline ||
            !data.startDate ||
            data.registrationDeadline.getTime() <=
              data.startDate.getTime() + 24 * 60 * 60 * 1000,
          {
            message: "Anmeldeschluss muss vor oder am Startdatum sein",
            path: ["registrationDeadline"],
          },
        )
        .refine(
          (data) =>
            !data.registrationOpensAt ||
            !data.registrationDeadline ||
            data.registrationOpensAt <= data.registrationDeadline,
          {
            message: "Anmeldungsstart muss vor oder am Anmeldeschluss sein",
            path: ["registrationOpensAt"],
          },
        )
        .refine(
          (data) =>
            !data.registrationOpensAt ||
            !data.startDate ||
            data.registrationOpensAt.getTime() < data.startDate.getTime(),
          {
            message: "Der geplante Anmeldungsbeginn muss vor Kursbeginn liegen",
            path: ["registrationOpensAt"],
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        id,
        priceOptions,
        customFields,
        status,
        slug: requestedSlug,
        ...updateData
      } = input;

      const course = await ctx.db.course.findUnique({
        where: { id },
        select: {
          id: true,
          createdById: true,
          bezirkId: true,
          status: true,
          isFree: true,
          paymentCashAllowed: true,
          paymentInvoiceAllowed: true,
          invoicingEnabled: true,
          allowSiblingDiscount: true,
          startDate: true,
          registrationOpensAt: true,
          registrationDeadline: true,
          externalRegistrationUrl: true,
          _count: {
            select: {
              registrations: {
                where: {
                  registrationStatus: RegistrationStatus.CONFIRMED,
                },
              },
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const canEdit = await userCanEditCourseRecord(
        ctx.db,
        ctx.session.user.id,
        course,
        ctx.permissionCache,
      );

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      const scope = await resolveDistrictScope(
        ctx.db,
        ctx.session.user.id,
        "courses",
        ctx.permissionCache,
      );
      assertDistrictChangeAllowed(scope, updateData.bezirkId, course.bezirkId);

      const mergedExternalUrl =
        updateData.externalRegistrationUrl === undefined
          ? course.externalRegistrationUrl
          : normalizeExternalRegistrationUrl(
              updateData.externalRegistrationUrl,
            );
      const mergedExternal = isExternalCourse({
        externalRegistrationUrl: mergedExternalUrl,
      });
      const wasExternal = isExternalCourse(course);

      if (
        mergedExternal &&
        !wasExternal &&
        (course._count?.registrations ?? 0) > 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Kurse mit bestehenden Anmeldungen können nicht auf externe Anmeldung umgestellt werden.",
        });
      }

      const mergedIsFree = mergedExternal
        ? true
        : (updateData.isFree ?? course.isFree);
      const mergedCash =
        updateData.paymentCashAllowed ?? course.paymentCashAllowed;
      const mergedInv =
        updateData.paymentInvoiceAllowed ?? course.paymentInvoiceAllowed;
      if (!mergedExternal && !mergedIsFree && !mergedCash && !mergedInv) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Bei kostenpflichtigen Kursen muss mindestens Barzahlung oder Rechnung aktiv sein.",
        });
      }

      const mergedStart = updateData.startDate ?? course.startDate;
      const mergedOpens =
        updateData.registrationOpensAt === undefined
          ? course.registrationOpensAt
          : updateData.registrationOpensAt;
      const mergedDeadline =
        updateData.registrationDeadline === undefined
          ? course.registrationDeadline
          : updateData.registrationDeadline;

      if (mergedOpens) {
        if (mergedOpens.getTime() >= mergedStart.getTime()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Der geplante Anmeldungsbeginn muss vor Kursbeginn liegen.",
          });
        }
        if (
          mergedDeadline &&
          mergedOpens.getTime() > mergedDeadline.getTime()
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Anmeldungsstart muss vor oder am Anmeldeschluss liegen.",
          });
        }
      }

      const canApproveContent = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_APPROVE,
        ctx.permissionCache,
      );

      const data: Prisma.CourseUpdateInput = { ...updateData };

      // A blank field is "keep the current slug", not "clear it".
      if (requestedSlug?.trim()) {
        data.slug = await updateCourseSlug(ctx.db, id, requestedSlug);
      }

      if (updateData.externalRegistrationUrl !== undefined) {
        data.externalRegistrationUrl = mergedExternalUrl;
      }

      if (updateData.externalProviderName !== undefined) {
        data.externalProviderName = mergedExternal
          ? updateData.externalProviderName?.trim() || null
          : null;
      }

      if (mergedExternal) {
        data.isFree = true;
        data.allowWaitingList = false;
        data.maxParticipants = null;
        if (updateData.allowSiblingDiscount !== undefined) {
          data.allowSiblingDiscount = false;
        }
      }

      if (mergedExternal && !wasExternal) {
        await ctx.db.coursePriceOption.deleteMany({ where: { courseId: id } });
        await ctx.db.courseCustomField.deleteMany({ where: { courseId: id } });
      }

      if (status !== undefined) {
        if (!canApproveContent) {
          if (!authorMayChangeStatus(course.status, status)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Nur Redakteure können den Status frei ändern. Als Autor kannst du zwischen Entwurf und „Zur Prüfung“ wechseln oder nach Ablehnung wieder einen Entwurf anlegen.",
            });
          }
        }

        data.status = status;

        if (status === ContentStatus.APPROVED) {
          const courseWithImage = await ctx.db.course.findUnique({
            where: { id },
            include: {
              image: { select: { id: true, status: true } },
            },
          });
          if (courseWithImage?.imageId && courseWithImage.image) {
            if (courseWithImage.image.status !== ContentStatus.APPROVED) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Das Bild muss zuerst freigegeben werden, bevor der Kurs veröffentlicht werden kann.",
              });
            }
          }
          data.publishedAt = new Date();
        } else {
          data.publishedAt = null;
        }
      }

      const canManageDiscounts = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
        ctx.permissionCache,
      );
      if (
        changesRestrictedFlag(
          input.allowSiblingDiscount,
          course.allowSiblingDiscount,
        ) &&
        !canManageDiscounts
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only LPW and Admin can modify sibling discount setting",
        });
      }

      if (input.invoicingEnabled !== undefined) {
        if (
          changesRestrictedFlag(
            input.invoicingEnabled,
            course.invoicingEnabled,
          ) &&
          !(await userHasPermission(
            ctx.session.user.id,
            PERMISSIONS.COURSES_ENABLE_INVOICING,
            ctx.permissionCache,
          ))
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Keine Berechtigung, die Rechnungsstellung für Kurse zu ändern",
          });
        }
        data.invoicingEnabled = mergedExternal ? false : input.invoicingEnabled;
      }

      if (priceOptions && !mergedExternal) {
        const registrationStats = await getCourseRegistrationStats(ctx.db, id);
        const hasConfirmedRegistrations =
          registrationStats.totalConfirmedParticipants > 0;

        if (
          updateData.maxParticipants != null &&
          updateData.maxParticipants <
            registrationStats.totalConfirmedParticipants
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Die maximale Teilnehmerzahl darf nicht unter ${registrationStats.totalConfirmedParticipants} liegen (bereits angemeldet).`,
          });
        }

        if (hasConfirmedRegistrations) {
          const existingOptions = await ctx.db.coursePriceOption.findMany({
            where: { courseId: id },
          });

          if (priceOptions.length !== existingOptions.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Preiskategorien können nach Beginn der Anmeldungen nicht hinzugefügt oder entfernt werden.",
            });
          }

          const pairing = pairPriceOptions(priceOptions, existingOptions);

          for (const inputOption of priceOptions) {
            const existing = pairing.get(inputOption);

            if (!existing) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Preiskategorien können nach Beginn der Anmeldungen nicht geändert werden.",
              });
            }

            if (
              inputOption.label !== existing.label ||
              inputOption.price !== existing.price
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Bezeichnung und Preis einer Preiskategorie können nach Anmeldungen nicht mehr geändert werden.",
              });
            }

            if (inputOption.maxParticipants != null) {
              const usedCount =
                registrationStats.byPriceOptionId[existing.id] ?? 0;
              if (inputOption.maxParticipants < usedCount) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Das Limit für „${existing.label}“ darf nicht unter ${usedCount} liegen (bereits angemeldet).`,
                });
              }
            }
          }

          await Promise.all(
            priceOptions.map((inputOption) => {
              const existing = pairing.get(inputOption);
              if (!existing) {
                return Promise.resolve();
              }
              return ctx.db.coursePriceOption.update({
                where: { id: existing.id },
                data: {
                  maxParticipants: inputOption.maxParticipants ?? null,
                  // Beschreibung bleibt änderbar, auch nach Anmeldungen: sie
                  // ist reiner Anzeigetext ohne Einfluss auf Preis oder
                  // Kapazität — und bei zwei gleichnamigen Kategorien das
                  // Einzige, was sie unterscheidbar macht. Wäre sie gesperrt,
                  // ließe sich ein bestehender Kurs mit doppeltem Namen nicht
                  // mehr in einen gültigen Zustand bringen.
                  description: inputOption.description ?? null,
                },
              });
            }),
          );
        } else {
          await ctx.db.coursePriceOption.deleteMany({
            where: { courseId: id },
          });

          await ctx.db.coursePriceOption.createMany({
            data: priceOptions.map((option) => ({
              courseId: id,
              price: option.price,
              label: option.label,
              description: option.description,
              maxParticipants: option.maxParticipants,
            })),
          });
        }
      }

      if (customFields && !mergedExternal) {
        await ctx.db.courseCustomField.deleteMany({
          where: { courseId: id },
        });

        await ctx.db.courseCustomField.createMany({
          data: customFields.map((field) => ({
            courseId: id,
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            options: field.options,
            isRequired: field.isRequired,
            helpText: field.helpText,
            sortOrder: field.sortOrder,
          })),
        });
      }

      const updated = await ctx.db.course.update({
        where: { id },
        data,
        include: {
          image: true,
          location: true,
          priceOptions: true,
          customFields: true,
        },
      });

      if (
        status === ContentStatus.PENDING &&
        course.status !== ContentStatus.PENDING
      ) {
        await notifySubmittedForReview({
          db: ctx.db,
          contentType: "course",
          contentId: updated.id,
          title: updated.title,
          actorId: ctx.session.user.id,
        });
      }

      if (updated.status === ContentStatus.APPROVED) {
        await promoteCustomFieldTemplatesForCourses(ctx.db, [updated.id]);
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.id },
        select: { createdById: true },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const canDeleteCourse = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_DELETE,
        ctx.permissionCache,
      );
      const canDelete =
        course.createdById === ctx.session.user.id || canDeleteCourse;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      await ctx.db.course.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  approve: permissionProcedure(PERMISSIONS.COURSES_APPROVE)
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.id },
        include: {
          image: {
            select: { id: true, status: true },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (course.imageId && course.image) {
        if (course.image.status !== ContentStatus.APPROVED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Das Bild muss zuerst freigegeben werden, bevor der Kurs veröffentlicht werden kann.",
          });
        }
      }

      const approved = await ctx.db.course.update({
        where: { id: input.id },
        data: {
          status: ContentStatus.APPROVED,
          reviewerId: ctx.session.user.id,
          reviewDate: new Date(),
          reviewNotes: input.reviewNotes,
          publishedAt: new Date(),
        },
      });

      await notifyCreatorOfReviewResult({
        db: ctx.db,
        contentType: "course",
        contentId: approved.id,
        title: approved.title,
        createdById: approved.createdById,
        reviewerId: ctx.session.user.id,
        approved: true,
        reviewNotes: input.reviewNotes,
      });

      await promoteCustomFieldTemplatesForCourses(ctx.db, [approved.id]);

      return approved;
    }),

  reject: permissionProcedure(PERMISSIONS.COURSES_APPROVE)
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rejected = await ctx.db.course.update({
        where: { id: input.id },
        data: {
          status: ContentStatus.REJECTED,
          reviewerId: ctx.session.user.id,
          reviewDate: new Date(),
          reviewNotes: input.reviewNotes,
        },
      });

      await notifyCreatorOfReviewResult({
        db: ctx.db,
        contentType: "course",
        contentId: rejected.id,
        title: rejected.title,
        createdById: rejected.createdById,
        reviewerId: ctx.session.user.id,
        approved: false,
        reviewNotes: input.reviewNotes,
      });

      return rejected;
    }),

  /** Same identifier rules as `getById` — the detail page passes it straight on. */
  getAvailableSlots: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findFirst({
        where: isUuid(input.id) ? { id: input.id } : { slug: input.id },
        include: {
          priceOptions: true,
          _count: {
            select: {
              registrations: {
                where: {
                  registrationStatus: RegistrationStatus.CONFIRMED,
                },
              },
            },
          },
          registrations: {
            where: {
              registrationStatus: RegistrationStatus.CONFIRMED,
            },
            select: {
              registrationStatus: true,
              participants: {
                select: { priceOptionId: true, priceOption: true },
              },
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (isExternalCourse(course)) {
        return {
          totalCapacity: 0,
          confirmedParticipants: 0,
          availableSlots: 0,
          isFull: false,
          hasWaitingList: false,
          capacityByPriceOption: null,
          allowWaitingList: false,
        };
      }

      const summary = getCourseCapacitySummary(course);

      return {
        ...summary,
        allowWaitingList: course.allowWaitingList ?? false,
      };
    }),

  getRegistrations: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        // Admin views compute stats, exports and invoice batches from this
        // list — with `all` they get every registration instead of a silent
        // 100-row slice that produced wrong totals on large courses.
        all: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, createdById: true },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const uid = ctx.session.user.id;

      const isCreator = course.createdById === uid;
      const isCourseCollaborator = await ctx.db.courseCollaborator.findUnique({
        where: {
          courseId_userId: { courseId: input.courseId, userId: uid },
        },
        select: { id: true },
      });
      const hasGlobalParticipantsAccess =
        (await userHasPermission(
          uid,
          PERMISSIONS.COURSES_VIEW,
          ctx.permissionCache,
        )) ||
        (await userHasPermission(
          uid,
          PERMISSIONS.COURSES_APPROVE,
          ctx.permissionCache,
        )) ||
        (await userHasPermission(
          uid,
          PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
          ctx.permissionCache,
        ));

      if (!isCreator && !hasGlobalParticipantsAccess && !isCourseCollaborator) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      const where = { courseId: input.courseId };

      const [registrations, total] = await Promise.all([
        ctx.db.courseRegistration.findMany({
          where,
          include: {
            participants: true,
            // Zahlungsstand hängt an den Rechnungen — Teilnehmerlisten,
            // Statistiken und Exporte leiten ihn hieraus ab.
            invoices: {
              select: {
                id: true,
                status: true,
                invoiceNumber: true,
                totalAmount: true,
                paidAt: true,
                paidAmount: true,
              },
            },
          },
          ...(input.all
            ? {}
            : {
                skip: (input.page - 1) * input.limit,
                take: input.limit,
              }),
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.courseRegistration.count({ where }),
      ]);

      return {
        registrations,
        total,
        pages: input.all ? 1 : Math.ceil(total / input.limit),
      };
    }),

  listCollaborators: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, createdById: true, bezirkId: true },
      });
      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }
      const canManage = await userCanManageCourseTeam(
        ctx.db,
        ctx.session.user.id,
        course,
        ctx.permissionCache,
      );
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      return ctx.db.courseCollaborator.findMany({
        where: { courseId: input.courseId },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: { select: { url: true, alt: true } },
            },
          },
        },
        orderBy: [{ role: "asc" }, { user: { displayName: "asc" } }],
      });
    }),

  setCollaborators: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        collaborators: z.array(
          z.object({
            userId: z.string(),
            role: z.nativeEnum(CourseCollaboratorRole),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, createdById: true, bezirkId: true },
      });
      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }
      const canManage = await userCanManageCourseTeam(
        ctx.db,
        ctx.session.user.id,
        course,
        ctx.permissionCache,
      );
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      const creatorId = course.createdById;
      const seen = new Set<string>();

      const rows = input.collaborators.filter((row) => {
        if (row.userId === creatorId) {
          return false;
        }
        if (seen.has(row.userId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Doppelte Nutzer:in in den Teamzuordnungen.",
          });
        }
        seen.add(row.userId);
        return true;
      });

      await ctx.db.$transaction(async (tx) => {
        await tx.courseCollaborator.deleteMany({
          where: { courseId: input.courseId },
        });
        if (rows.length > 0) {
          await tx.courseCollaborator.createMany({
            data: rows.map((row) => ({
              courseId: input.courseId,
              userId: row.userId,
              role: row.role,
            })),
          });
        }
      });

      return { success: true };
    }),

  listGuestTeamMembers: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, createdById: true, bezirkId: true },
      });
      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }
      const canManage = await userCanManageCourseTeam(
        ctx.db,
        ctx.session.user.id,
        course,
        ctx.permissionCache,
      );
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      return ctx.db.courseGuestTeamMember.findMany({
        where: { courseId: input.courseId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, displayName: true, bio: true, sortOrder: true },
      });
    }),

  setGuestTeamMembers: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        members: z
          .array(
            z.object({
              displayName: z.string().min(1).max(200),
              bio: z.string().max(2000).optional(),
            }),
          )
          .max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, createdById: true, bezirkId: true },
      });
      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }
      const canManage = await userCanManageCourseTeam(
        ctx.db,
        ctx.session.user.id,
        course,
        ctx.permissionCache,
      );
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      const members = input.members.map((m) => ({
        displayName: m.displayName.trim(),
        bio: m.bio?.trim() ? m.bio.trim() : null,
      }));

      await ctx.db.$transaction(async (tx) => {
        await tx.courseGuestTeamMember.deleteMany({
          where: { courseId: input.courseId },
        });
        if (members.length > 0) {
          await tx.courseGuestTeamMember.createMany({
            data: members.map((m, i) => ({
              courseId: input.courseId,
              displayName: m.displayName,
              bio: m.bio,
              sortOrder: i,
            })),
          });
        }
      });

      return { success: true };
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const canDeleteAny = await userHasPermission(
        userId,
        PERMISSIONS.COURSES_DELETE,
        ctx.permissionCache,
      );

      const courses = await ctx.db.course.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canDeleteIds = courses
        .filter((course) => course.createdById === userId || canDeleteAny)
        .map((c) => c.id);

      if (canDeleteIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to delete any of the selected courses",
        });
      }

      await ctx.db.course.deleteMany({
        where: { id: { in: canDeleteIds } },
      });

      return { success: true, deletedCount: canDeleteIds.length };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.course.findUnique({
        where: { id: input.id },
        include: {
          priceOptions: true,
          customFields: true,
        },
      });

      if (!original) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const canCreate = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_CREATE,
        ctx.permissionCache,
      );
      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung, Kurse anzulegen",
        });
      }

      const scope = await resolveDistrictScope(
        ctx.db,
        ctx.session.user.id,
        "courses",
        ctx.permissionCache,
      );
      assertDistrictAllowed(scope, original.bezirkId);

      const newCourse = await ctx.db.course.create({
        data: {
          title: `${original.title} (Kopie)`,
          description: original.description,
          motto: original.motto,
          startDate: original.startDate,
          endDate: original.endDate,
          courseType: original.courseType,
          locationId: original.locationId,
          bezirkId: original.bezirkId,
          prerequisites: original.prerequisites,
          maxParticipants: original.maxParticipants,
          registrationOpen: false,
          registrationDeadline: original.registrationDeadline,
          status: ContentStatus.DRAFT,
          createdById: ctx.session.user.id,
          paymentCashAllowed: original.paymentCashAllowed,
          paymentInvoiceAllowed: original.paymentInvoiceAllowed,
          priceOptions: {
            create: original.priceOptions.map((po) => ({
              label: po.label,
              price: po.price,
              description: po.description,
            })),
          },
          customFields: {
            create: original.customFields.map((cf) => ({
              fieldName: cf.fieldName,
              fieldType: cf.fieldType,
              options: cf.options ?? undefined,
              isRequired: cf.isRequired,
              helpText: cf.helpText,
              sortOrder: cf.sortOrder,
            })),
          },
        },
      });

      return newCourse;
    }),

  bulkDuplicate: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const originals = await ctx.db.course.findMany({
        where: { id: { in: input.ids } },
        include: {
          priceOptions: true,
          customFields: true,
        },
      });

      if (originals.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No courses found",
        });
      }

      const canCreate = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_CREATE,
        ctx.permissionCache,
      );
      if (!canCreate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Keine Berechtigung, Kurse anzulegen",
        });
      }

      const scope = await resolveDistrictScope(
        ctx.db,
        ctx.session.user.id,
        "courses",
        ctx.permissionCache,
      );
      for (const original of originals) {
        assertDistrictAllowed(scope, original.bezirkId);
      }

      const newCourses = await Promise.all(
        originals.map((original) =>
          ctx.db.course.create({
            data: {
              title: `[DUPLIKAT] ${original.title}`,
              description: original.description,
              motto: original.motto,
              startDate: original.startDate,
              endDate: original.endDate,
              courseType: original.courseType,
              locationId: original.locationId,
              bezirkId: original.bezirkId,
              prerequisites: original.prerequisites,
              maxParticipants: original.maxParticipants,
              registrationOpen: false,
              registrationDeadline: original.registrationDeadline,
              status: ContentStatus.DRAFT,
              createdById: ctx.session.user.id,
              paymentCashAllowed: original.paymentCashAllowed,
              paymentInvoiceAllowed: original.paymentInvoiceAllowed,
              priceOptions: {
                create: original.priceOptions.map((po) => ({
                  label: po.label,
                  price: po.price,
                  description: po.description,
                })),
              },
              customFields: {
                create: original.customFields.map((cf) => ({
                  fieldName: cf.fieldName,
                  fieldType: cf.fieldType,
                  options: cf.options ?? undefined,
                  isRequired: cf.isRequired,
                  helpText: cf.helpText,
                  sortOrder: cf.sortOrder,
                })),
              },
            },
          }),
        ),
      );

      return { success: true, duplicatedCount: newCourses.length };
    }),

  bulkStatusChange: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()).min(1),
        status: z.nativeEnum(ContentStatus),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const canApprove = await userHasPermission(
        userId,
        PERMISSIONS.COURSES_APPROVE,
        ctx.permissionCache,
      );

      const courses = await ctx.db.course.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true, status: true },
      });

      const canUpdateIds = courses
        .filter(
          (course) =>
            canApprove ||
            (course.createdById === userId &&
              authorMayChangeStatus(course.status, input.status)),
        )
        .map((c) => c.id);

      if (canUpdateIds.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to update any of the selected courses",
        });
      }

      const updateData: { status: ContentStatus; publishedAt?: Date | null } = {
        status: input.status,
      };

      if (input.status === ContentStatus.APPROVED) {
        updateData.publishedAt = new Date();
      } else if (input.status === ContentStatus.DRAFT) {
        updateData.publishedAt = null;
      }

      await ctx.db.course.updateMany({
        where: { id: { in: canUpdateIds } },
        data: updateData,
      });

      if (input.status === ContentStatus.APPROVED) {
        await promoteCustomFieldTemplatesForCourses(ctx.db, canUpdateIds);
      }

      return { success: true, updatedCount: canUpdateIds.length };
    }),

  exportCourses: permissionProcedure(PERMISSIONS.DATA_EXPORT).query(
    async ({ ctx }) => {
      const courses = await ctx.db.course.findMany({
        include: {
          location: true,
          bezirk: true,
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        courses: courses.map((course) => ({
          ...course,
          locationName: course.location?.name,
          bezirkName: course.bezirk?.name,
          createdByEmail: course.createdBy?.email,
          reviewerEmail: course.reviewer?.email,
        })),
        exportedAt: new Date().toISOString(),
        count: courses.length,
      };
    },
  ),

  importCourses: permissionProcedure(PERMISSIONS.DATA_IMPORT)
    .input(
      z.object({
        courses: z.array(
          z.object({
            title: z.string(),
            description: z.string().optional().nullable(),
            courseType: z.enum(CourseType),
            startDate: z.date(),
            endDate: z.date().optional().nullable(),
            registrationDeadline: z.date().optional().nullable(),
            maxParticipants: z.number().optional().nullable(),
            price: z.number().optional().nullable(),
            bezirkId: z.string().optional().nullable(),
            locationId: z.string().optional().nullable(),
            coverImageId: z.string().optional().nullable(),
            status: z.enum(ContentStatus).optional(),
            customFields: z.any().optional(),
            originalId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.courses.map(async (courseData) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { originalId, coverImageId, ...data } = courseData;
          return await ctx.db.course.create({
            data: {
              ...data,
              description: data.description ?? "",
              endDate: data.endDate ?? data.startDate,
              status: data.status ?? ContentStatus.DRAFT,
              createdById: ctx.session.user.id,
            },
          });
        }),
      );

      return {
        success: true,
        importedCount: results.length,
        courses: results,
      };
    }),
});
