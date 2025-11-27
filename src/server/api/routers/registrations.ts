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
  // Public: Create registration
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
            customFields: z.json().optional(), // JSON
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { participants, ...registrationData } = input;

      // Check if course exists and registration is open
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

      // Check if registration deadline has passed
      if (
        course.registrationDeadline &&
        new Date() > course.registrationDeadline
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration deadline has passed",
        });
      }

      // Check if totalPrice is correct using the Price Options of the course
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

      // Check if course is full
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

      // Create registration
      const registration = await ctx.db.courseRegistration.create({
        data: {
          ...registrationData,
          registrationStatus,
          participants: {
            create: participants.map((participant) => ({
              ...participant,
              customFields: JSON.stringify(participant.customFields || {}),
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

      // TODO: Send confirmation email

      return registration;
    }),

  // Get registration by ID
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
            },
            include: {
              location: true,
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

  // Update registration status (admin/instructor)
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

      // Check permissions
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

  // Update payment status
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

      // Check permissions
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

  // Cancel registration (user or admin)
  cancel: publicProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session) {
        // Authenticated user can cancel own registration directly
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

      // Verify email matches
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

  // Delete registration (admin only)
  delete: lpwProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.courseRegistration.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get registration statistics for a course
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

      // Check permissions
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
