import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  lpwProcedure,
} from "../trpc";
import {
  PaymentStatus,
  RegistrationStatus,
  UserRole,
} from "~/generated/prisma/client";

export const registrationsRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        courseId: z.string(),
        registrantFirstName: z.string().min(1),
        registrantLastName: z.string().min(1),
        registrantEmail: z.email(),
        registrantPhone: z.string().optional(),
        registrantChoir: z.string().optional(),
        registrantDistrict: z.string().optional(),
        registrantStreet: z.string().optional(),
        registrantZipCode: z.string().optional(),
        registrantCity: z.string().optional(),
        useSeparateBilling: z.boolean().optional(),
        billingCompany: z.string().optional(),
        billingFirstName: z.string().optional(),
        billingLastName: z.string().optional(),
        billingStreet: z.string().optional(),
        billingZipCode: z.string().optional(),
        billingCity: z.string().optional(),
        billingEmail: z.email().optional(),
        totalPrice: z.number().min(0),
        notes: z.string().optional(),
        participants: z.array(
          z.object({
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            birthDate: z.date(),
            city: z.string().min(1),
            instrument: z.string().optional(),
            priceOption: z.string().optional(),
            customFields: z.json().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { participants, ...registrationData } = input;

      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        include: {
          _count: {
            select: {
              registrations: {
                where: {
                  registrationStatus: RegistrationStatus.CONFIRMED,
                },
              },
            },
          },
          priceOptions: true,
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (!course.registrationOpen) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration is closed for this course",
        });
      }

      if (
        course.registrationDeadline &&
        new Date() > course.registrationDeadline
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration deadline has passed",
        });
      }

      const expectedTotal = participants.reduce((sum, participant) => {
        const priceOption = course.priceOptions.find(
          (p) => p.label === participant.priceOption,
        );
        return sum + (priceOption?.price || 0);
      }, 0);

      if (expectedTotal !== input.totalPrice) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Total price does not match the sum of price options",
        });
      }

      const currentParticipants = course._count.registrations;
      const newParticipants = participants.length;
      const totalAfterRegistration = currentParticipants + newParticipants;

      const maxParticipants = Math.min(
        course.maxParticipants || Infinity,
        course.priceOptions.reduce(
          (sum, p) => sum + (p.maxParticipants || Infinity),
          0,
        ),
      );

      let registrationStatus: RegistrationStatus = RegistrationStatus.CONFIRMED;

      if (totalAfterRegistration > maxParticipants) {
        if (!course.allowWaitingList) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Course is full and waiting list is not available",
          });
        }
        registrationStatus = RegistrationStatus.WAITLIST;
      }

      const registration = await ctx.db.courseRegistration.create({
        data: {
          ...registrationData,
          registrationStatus,
          participants: {
            create: participants.map((participant) => ({
              ...participant,
              customFields: participant.customFields || {},
            })),
          },
        },
        include: {
          participants: true,
          course: {
            select: {
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      return registration;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        include: {
          participants: true,
          course: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              registrationDeadline: true,
              registrationOpen: true,
              maxParticipants: true,
              allowWaitingList: true,
              priceOptions: {
                select: {
                  id: true,
                  label: true,
                  price: true,
                  maxParticipants: true,
                },
              },
              location: {
                select: {
                  name: true,
                  city: true,
                },
              },
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      return registration;
    }),

  getMyRegistrations: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(RegistrationStatus).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        registrantEmail: ctx.session.user.email,
        ...(input.status && { registrationStatus: input.status }),
      };

      const [registrations, total] = await Promise.all([
        ctx.db.courseRegistration.findMany({
          where,
          include: {
            participants: true,
            course: {
              select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                registrationDeadline: true,
                registrationOpen: true,
                maxParticipants: true,
                allowWaitingList: true,
                priceOptions: {
                  select: {
                    id: true,
                    label: true,
                    price: true,
                    maxParticipants: true,
                  },
                },
                location: {
                  select: {
                    name: true,
                    city: true,
                  },
                },
              },
            },
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
        page: input.page,
        limit: input.limit,
        pages: Math.ceil(total / input.limit),
      };
    }),

  updateMyRegistration: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        registrantPhone: z.string().optional(),
        useSeparateBilling: z.boolean().optional(),
        billingCompany: z.string().optional(),
        billingFirstName: z.string().optional(),
        billingLastName: z.string().optional(),
        billingStreet: z.string().optional(),
        billingZipCode: z.string().optional(),
        billingCity: z.string().optional(),
        billingEmail: z.string().email().optional(),
        totalPrice: z.number().min(0),
        notes: z.string().optional(),
        participants: z.array(
          z.object({
            id: z.string().optional(),
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            birthDate: z.date(),
            city: z.string().min(1),
            instrument: z.string().optional(),
            priceOption: z.string().optional(),
            customFields: z.json().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, participants, ...registrationData } = input;

      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id },
        include: {
          participants: true,
          course: {
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
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      if (registration.registrantEmail !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot edit registration of another user",
        });
      }

      if (
        registration.course.registrationDeadline &&
        new Date() > registration.course.registrationDeadline
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration edit deadline has passed",
        });
      }

      if (registration.registrationStatus === RegistrationStatus.CANCELLED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot edit a cancelled registration",
        });
      }

      const course = registration.course;

      const expectedTotal = participants.reduce((sum, participant) => {
        const priceOption = course.priceOptions.find(
          (p) => p.label === participant.priceOption,
        );
        return sum + (priceOption?.price ?? 0);
      }, 0);

      if (expectedTotal !== input.totalPrice) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Total price does not match the sum of price options",
        });
      }

      const currentParticipantsExcludingThis = await ctx.db.participant.count({
        where: {
          registration: {
            courseId: course.id,
            registrationStatus: RegistrationStatus.CONFIRMED,
            id: { not: id },
          },
        },
      });

      const newTotalParticipants =
        currentParticipantsExcludingThis + participants.length;
      const maxParticipants = course.maxParticipants ?? Infinity;

      if (newTotalParticipants > maxParticipants) {
        if (!course.allowWaitingList) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot add more participants - course is full",
          });
        }
      }

      const priceOptionCounts: Record<string, number> = {};
      for (const participant of participants) {
        if (participant.priceOption) {
          priceOptionCounts[participant.priceOption] =
            (priceOptionCounts[participant.priceOption] ?? 0) + 1;
        }
      }

      for (const [optionLabel, count] of Object.entries(priceOptionCounts)) {
        const priceOption = course.priceOptions.find(
          (p) => p.label === optionLabel,
        );
        if (priceOption?.maxParticipants) {
          const currentCount = await ctx.db.participant.count({
            where: {
              priceOption: optionLabel,
              registration: {
                courseId: course.id,
                registrationStatus: RegistrationStatus.CONFIRMED,
                id: { not: id },
              },
            },
          });

          if (currentCount + count > priceOption.maxParticipants) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Price option "${optionLabel}" is full`,
            });
          }
        }
      }

      const existingParticipantIds = participants
        .filter((p) => p.id)
        .map((p) => p.id!);

      await ctx.db.participant.deleteMany({
        where: {
          registrationId: id,
          id: { notIn: existingParticipantIds },
        },
      });

      for (const participant of participants) {
        const { id: participantId, ...participantData } = participant;

        if (participantId) {
          await ctx.db.participant.update({
            where: { id: participantId },
            data: {
              ...participantData,
              customFields: participantData.customFields ?? {},
            },
          });
        } else {
          await ctx.db.participant.create({
            data: {
              ...participantData,
              customFields: participantData.customFields ?? {},
              registrationId: id,
            },
          });
        }
      }

      const updatedRegistration = await ctx.db.courseRegistration.update({
        where: { id },
        data: {
          ...registrationData,
        },
        include: {
          participants: true,
          course: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      return updatedRegistration;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        registrationStatus: z.nativeEnum(RegistrationStatus),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        include: {
          course: {
            include: {
              instructors: { select: { id: true } },
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      const isInstructor = registration.course.instructors.some(
        (i) => i.id === ctx.session.user.id,
      );
      const isCreator = registration.course.createdById === ctx.session.user.id;
      const isAdmin =
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW;

      if (!isInstructor && !isCreator && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      return await ctx.db.courseRegistration.update({
        where: { id: input.id },
        data: {
          registrationStatus: input.registrationStatus,
          notes: input.notes,
        },
        include: {
          participants: true,
        },
      });
    }),

  updatePaymentStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        paymentStatus: z.enum(PaymentStatus),
        invoiceGenerated: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
        include: {
          course: {
            include: {
              instructors: { select: { id: true } },
            },
          },
        },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      const isInstructor = registration.course.instructors.some(
        (i) => i.id === ctx.session.user.id,
      );
      const isCreator = registration.course.createdById === ctx.session.user.id;
      const isAdmin =
        ctx.session.user.role === UserRole.ADMIN ||
        ctx.session.user.role === UserRole.LPW;

      if (!isInstructor && !isCreator && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      return await ctx.db.courseRegistration.update({
        where: { id: input.id },
        data: {
          paymentStatus: input.paymentStatus,
          ...(input.invoiceGenerated !== undefined && {
            invoiceGenerated: input.invoiceGenerated,
            invoiceDate: input.invoiceGenerated ? new Date() : null,
          }),
        },
      });
    }),

  cancel: publicProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session) {
        const registration = await ctx.db.courseRegistration.findUnique({
          where: { id: input.id },
        });
        if (!registration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Registration not found",
          });
        }
        if (
          registration.registrantEmail !== ctx.session.user.email &&
          ctx.session.user.role !== UserRole.ADMIN &&
          ctx.session.user.role !== UserRole.LPW
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot cancel registration of another user",
          });
        }
        return await ctx.db.courseRegistration.update({
          where: { id: input.id },
          data: {
            registrationStatus: RegistrationStatus.CANCELLED,
          },
        });
      }

      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.id },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      if (registration.registrantEmail !== input.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Email does not match registration",
        });
      }

      return await ctx.db.courseRegistration.update({
        where: { id: input.id },
        data: {
          registrationStatus: RegistrationStatus.CANCELLED,
        },
      });
    }),

  delete: lpwProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.courseRegistration.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getStatistics: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await ctx.db.course.findUnique({
        where: { id: input.courseId },
        include: {
          instructors: { select: { id: true } },
          priceOptions: { select: { maxParticipants: true } },
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

      const registrations = await ctx.db.courseRegistration.findMany({
        where: { courseId: input.courseId },
        include: {
          participants: true,
        },
      });

      const confirmed = registrations.filter(
        (r) => r.registrationStatus === RegistrationStatus.CONFIRMED,
      );
      const waitlist = registrations.filter(
        (r) => r.registrationStatus === RegistrationStatus.WAITLIST,
      );
      const cancelled = registrations.filter(
        (r) => r.registrationStatus === RegistrationStatus.CANCELLED,
      );

      const maxParticipants = Math.min(
        course.maxParticipants || Infinity,
        course.priceOptions.reduce(
          (sum, p) => sum + (p.maxParticipants || Infinity),
          0,
        ),
      );

      const totalParticipants = confirmed.reduce(
        (sum, r) => sum + r.participants.length,
        0,
      );
      const totalRevenue = confirmed.reduce((sum, r) => sum + r.totalPrice, 0);

      const paidCount = confirmed.filter(
        (r) => r.paymentStatus === PaymentStatus.PAID,
      ).length;
      const pendingPayment = confirmed.filter(
        (r) => r.paymentStatus === PaymentStatus.PENDING,
      ).length;

      return {
        total: registrations.length,
        confirmed: confirmed.length,
        waitlist: waitlist.length,
        cancelled: cancelled.length,
        totalParticipants,
        availableSpots: Math.max(0, maxParticipants - totalParticipants),
        totalRevenue,
        paidCount,
        pendingPayment,
      };
    }),
});
