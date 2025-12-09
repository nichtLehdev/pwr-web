import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  lpwProcedure,
  reviewerProcedure,
} from "../trpc";
import {
  CourseType,
  TargetAudience,
  ContentStatus,
  UserRole,
  CustomFieldType,
  RegistrationStatus,
} from "~/generated/prisma/client";

export const coursesRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        courseType: z.enum(CourseType).optional(),
        targetAudience: z.enum(TargetAudience).optional(),
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
        ...(input.targetAudience && { targetAudience: input.targetAudience }),
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
            location: true,
            bezirk: true,
            instructors: {
              select: {
                id: true,
                displayName: true,
                profileImage: true,
              },
            },
            priceOptions: true,
            customFields: true,
            registrations: {
              where: {
                registrationStatus: RegistrationStatus.CONFIRMED,
              },
              include: {
                _count: {
                  select: { participants: true },
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

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const courseRaw = await ctx.db.course.findUnique({
        where: { id: input.id },
        include: {
          location: true,
          bezirk: true,
          instructors: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
              bio: true,
            },
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
          registrations: {
            where: {
              registrationStatus: RegistrationStatus.CONFIRMED,
            },
            include: {
              _count: {
                select: { participants: true },
              },
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

      if (courseRaw.status !== ContentStatus.APPROVED) {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Course not published",
          });
        }
        const role = ctx.session.user.role;

        const canView =
          courseRaw.createdById === ctx.session.user.id ||
          role == UserRole.ADMIN ||
          role == UserRole.LPW ||
          role == UserRole.RPW;

        if (!canView) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Course not published",
          });
        }
      }

      const participantCount = courseRaw.registrations.reduce(
        (sum, reg) => sum + reg._count.participants,
        0,
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { registrations, ...courseWithoutRegistrations } = courseRaw;

      return {
        ...courseWithoutRegistrations,
        _count: {
          participants: participantCount,
        },
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
            location: true,
            bezirk: true,
            priceOptions: true,
            registrations: {
              where: {
                registrationStatus: RegistrationStatus.CONFIRMED,
              },
              include: {
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
        sortBy: z
          .enum(["startDate", "title", "createdAt", "status"])
          .default("startDate"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      let where: Record<string, unknown> = {};

      if (userRole === UserRole.ADMIN || userRole === UserRole.LPW) {
        if (input.status) {
          where.status = input.status;
        }
      } else if (userRole === UserRole.RPW) {
        if (input.status) {
          if (input.status === ContentStatus.DRAFT) {
            where = {
              status: ContentStatus.DRAFT,
              createdById: userId,
            };
          } else {
            where.status = input.status;
          }
        } else {
          where = {
            OR: [
              { status: { not: ContentStatus.DRAFT } },
              { createdById: userId },
            ],
          };
        }
      } else {
        where = {
          createdById: userId,
          ...(input.status && { status: input.status }),
        };
      }

      const [coursesRaw, total] = await Promise.all([
        ctx.db.course.findMany({
          where,
          include: {
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
              include: {
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

  getPendingReview: lpwProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        bezirkId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: {
        status: ContentStatus;
        pendingReview: boolean;
        bezirkId?: string;
      } = {
        status: ContentStatus.PENDING,
        pendingReview: true,
      };
      if (input.bezirkId) {
        where.bezirkId = input.bezirkId;
      }
      const [coursesRaw, total] = await Promise.all([
        ctx.db.course.findMany({
          where,
          include: {
            location: true,
            bezirk: true,
            priceOptions: true,
            registrations: {
              where: {
                registrationStatus: RegistrationStatus.CONFIRMED,
              },
              include: {
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
      z.object({
        title: z.string().min(1),
        motto: z.string().optional(),
        description: z.string().min(1),
        startDate: z.date(),
        endDate: z.date(),
        locationId: z.string().optional(),
        courseType: z.enum(CourseType),
        targetAudience: z.enum(TargetAudience).optional(),
        bezirkId: z.string().optional(),
        registrationOpen: z.boolean().default(false),
        registrationDeadline: z.date().optional(),
        maxParticipants: z.number().min(1),
        allowWaitingList: z.boolean().default(false),
        isFree: z.boolean().default(false),
        priceInfo: z.string().optional(),
        prerequisites: z.string().optional(),
        whatToBring: z.string().optional(),
        instructorIds: z.array(z.string()).optional(),
        priceOptions: z
          .array(
            z.object({
              price: z.number(),
              label: z.string(),
              description: z.string().optional(),
              maxParticipants: z.number().optional(),
            }),
          )
          .optional(),
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { priceOptions, customFields, instructorIds, ...courseData } =
        input;

      const course = await ctx.db.course.create({
        data: {
          ...courseData,
          createdById: ctx.session.user.id,
          instructors: instructorIds
            ? {
                connect: instructorIds.map((id) => ({ id })),
              }
            : undefined,
          priceOptions: priceOptions
            ? {
                create: priceOptions,
              }
            : undefined,
          customFields: customFields
            ? {
                create: customFields,
              }
            : undefined,
        },
        include: {
          location: true,
          instructors: true,
          priceOptions: true,
          customFields: true,
        },
      });

      return course;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        motto: z.string().optional(),
        description: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        locationId: z.string().optional().nullable(),
        courseType: z.enum(CourseType).optional(),
        targetAudience: z.enum(TargetAudience).optional().nullable(),
        bezirkId: z.string().optional().nullable(),
        registrationOpen: z.boolean().optional(),
        registrationDeadline: z.date().optional().nullable(),
        maxParticipants: z.number().min(1).optional(),
        allowWaitingList: z.boolean().optional(),
        isFree: z.boolean().optional(),
        priceInfo: z.string().optional(),
        prerequisites: z.string().optional(),
        whatToBring: z.string().optional(),
        instructorIds: z.array(z.string()).optional(),
        priceOptions: z
          .array(
            z.object({
              id: z.string().optional(),
              price: z.number(),
              label: z.string(),
              description: z.string().optional(),
              maxParticipants: z.number().optional(),
            }),
          )
          .optional(),
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, priceOptions, customFields, instructorIds, ...updateData } =
        input;

      const course = await ctx.db.course.findUnique({
        where: { id },
        select: { createdById: true },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const canEdit =
        course.createdById === ctx.session.user.id ||
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW;

      if (!canEdit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      if (instructorIds) {
        await ctx.db.course.update({
          where: { id },
          data: {
            instructors: {
              set: instructorIds.map((instructorId) => ({ id: instructorId })),
            },
          },
        });
      }

      if (priceOptions) {
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

      if (customFields) {
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

      return await ctx.db.course.update({
        where: { id },
        data: updateData,
        include: {
          location: true,
          instructors: true,
          priceOptions: true,
          customFields: true,
        },
      });
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

      const canDelete =
        course.createdById === ctx.session.user.id ||
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW;

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

  approve: reviewerProcedure
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.course.update({
        where: { id: input.id },
        data: {
          status: ContentStatus.APPROVED,
          reviewerId: ctx.session.user.id,
          reviewDate: new Date(),
          reviewNotes: input.reviewNotes,
          publishedAt: new Date(),
        },
      });
    }),

  reject: reviewerProcedure
    .input(
      z.object({
        id: z.string(),
        reviewNotes: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.course.update({
        where: { id: input.id },
        data: {
          status: ContentStatus.REJECTED,
          reviewerId: ctx.session.user.id,
          reviewDate: new Date(),
          reviewNotes: input.reviewNotes,
        },
      });
    }),

  getAvailableSlots: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.id },
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
            include: {
              participants: true,
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

      const confirmedParticipants = course.registrations.reduce(
        (sum, registration) => sum + registration.participants.length,
        0,
      );

      const priceOptionsWithLimits = course.priceOptions.filter(
        (po) => po.maxParticipants !== null,
      );

      let totalCapacity: number;
      const capacityByPriceOption: Record<string, number> = {};

      if (priceOptionsWithLimits.length > 0) {
        totalCapacity = priceOptionsWithLimits.reduce(
          (sum, po) => sum + (po.maxParticipants || 0),
          0,
        );

        for (const priceOption of priceOptionsWithLimits) {
          const usedSlots = course.registrations.reduce((sum, registration) => {
            const participantsForThisOption = registration.participants.filter(
              (p) => p.priceOption === priceOption.label,
            ).length;
            return sum + participantsForThisOption;
          }, 0);

          capacityByPriceOption[priceOption.label] =
            (priceOption.maxParticipants || 0) - usedSlots;
        }

        const priceOptionsWithoutLimits = course.priceOptions.filter(
          (po) => po.maxParticipants === null,
        );

        if (priceOptionsWithoutLimits.length > 0) {
          const remainingCourseCapacity = Math.max(
            0,
            (course.maxParticipants ?? 0) - totalCapacity,
          );

          for (const priceOption of priceOptionsWithoutLimits) {
            const usedSlots = course.registrations.reduce(
              (sum, registration) => {
                const participantsForThisOption =
                  registration.participants.filter(
                    (p) => p.priceOption === priceOption.label,
                  ).length;
                return sum + participantsForThisOption;
              },
              0,
            );

            capacityByPriceOption[priceOption.label] = Math.max(
              0,
              remainingCourseCapacity - usedSlots,
            );
          }
        }

        totalCapacity = Math.min(totalCapacity, course.maxParticipants ?? 0);
      } else {
        totalCapacity = course.maxParticipants ?? 0;
      }

      const availableSlots = Math.max(0, totalCapacity - confirmedParticipants);
      const isFull = availableSlots === 0;
      const hasWaitingList = course.registrations.some(
        (r) => r.registrationStatus === RegistrationStatus.WAITLIST,
      );

      return {
        totalCapacity,
        confirmedParticipants,
        availableSlots,
        isFull,
        hasWaitingList,
        allowWaitingList: course.allowWaitingList ?? false,
        capacityByPriceOption:
          Object.keys(capacityByPriceOption).length > 0
            ? capacityByPriceOption
            : null,
      };
    }),

  getRegistrations: protectedProcedure
    .input(
      z.object({
        courseId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        include: {
          instructors: { select: { id: true } },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      const isInstructor = course.instructors.some(
        (i) => i.id === ctx.session.user.id,
      );
      const isCreator = course.createdById === ctx.session.user.id;
      const isAdmin =
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW;

      if (!isInstructor && !isCreator && !isAdmin) {
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
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.courseRegistration.count({ where }),
      ]);

      return {
        registrations,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      const courses = await ctx.db.course.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canDeleteIds = courses
        .filter(
          (course) =>
            course.createdById === userId ||
            userRole === UserRole.ADMIN ||
            userRole === UserRole.LPW,
        )
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
          targetAudience: original.targetAudience,
          prerequisites: original.prerequisites,
          maxParticipants: original.maxParticipants,
          registrationOpen: false,
          registrationDeadline: original.registrationDeadline,
          status: ContentStatus.DRAFT,
          createdById: ctx.session.user.id,
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
              targetAudience: original.targetAudience,
              prerequisites: original.prerequisites,
              maxParticipants: original.maxParticipants,
              registrationOpen: false,
              registrationDeadline: original.registrationDeadline,
              status: ContentStatus.DRAFT,
              createdById: ctx.session.user.id,
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
      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      const courses = await ctx.db.course.findMany({
        where: { id: { in: input.ids } },
        select: { id: true, createdById: true },
      });

      const canUpdateIds = courses
        .filter(
          (course) =>
            course.createdById === userId ||
            userRole === UserRole.ADMIN ||
            userRole === UserRole.LPW,
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

      return { success: true, updatedCount: canUpdateIds.length };
    }),
});
