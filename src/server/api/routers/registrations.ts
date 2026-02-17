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
  SiblingDiscountStatus,
} from "~/generated/prisma/client";
import { userHasPermission } from "../helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  sendCourseRegistrationConfirmedEmail,
  sendCourseRegistrationWaitlistEmail,
  sendCourseRegistrationPendingDiscountEmail,
  sendCourseRegistrationCancelledEmail,
  sendSiblingDiscountApprovedEmail,
  sendSiblingDiscountRejectedEmail,
  isEmailConfigured,
} from "@/server/email";
import { isParticipantUnder18 } from "@/lib/participant-utils";

export const registrationsRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        courseId: z.string(),
        registrantFirstName: z.string().min(1).max(100),
        registrantLastName: z.string().min(1).max(100),
        registrantEmail: z.email(),
        registrantPhone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
        registrantStreet: z.string().max(200).optional(),
        registrantZipCode: z.string().max(20).optional(),
        registrantCity: z.string().max(100).optional(),
        useSeparateBilling: z.boolean().optional(),
        billingCompany: z.string().max(200).optional(),
        billingFirstName: z.string().max(100).optional(),
        billingLastName: z.string().max(100).optional(),
        billingStreet: z.string().max(200).optional(),
        billingZipCode: z.string().max(20).optional(),
        billingCity: z.string().max(100).optional(),
        billingEmail: z.email().optional(),
        notes: z.string().max(2000).optional(),
        siblingDiscountApplied: z.boolean().optional().default(false),
        participants: z.array(
          z.object({
            firstName: z.string().min(1).max(100),
            lastName: z.string().min(1).max(100),
            birthDate: z.date().refine((date) => date < new Date(), {
              message: "Geburtsdatum muss in der Vergangenheit liegen",
            }),
            city: z.string().min(1).max(100),
            instrument: z.string().max(100).optional(),
            priceOptionId: z.string().min(1),
            customFields: z.record(z.string(), z.any()).optional(),
            siblingGroupId: z.string().optional(), // Groups siblings together for discount
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
          customFields: true,
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
        course.registrationOpensAt &&
        new Date() < course.registrationOpensAt
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration is not yet open for this course",
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

      if (input.siblingDiscountApplied && !course.allowSiblingDiscount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Sibling discount is not available for this course",
        });
      }

      let totalPrice = 0;
      const participantsWithPriceOptions = [];

      for (const participant of participants) {
        const priceOption = course.priceOptions.find(
          (p) => p.id === participant.priceOptionId,
        );

        if (!priceOption) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid price option ID: ${participant.priceOptionId}`,
          });
        }

        totalPrice += priceOption.price;

        participantsWithPriceOptions.push({
          ...participant,
          priceOption: priceOption.label,
        });

        if (participant.customFields && course.customFields) {
          for (const customField of course.customFields) {
            const value = participant.customFields[customField.fieldName];

            if (customField.isRequired && !value) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Required field missing: ${customField.fieldName}`,
              });
            }

            if (
              value &&
              customField.fieldType === "SELECT" &&
              customField.options
            ) {
              const validOptions =
                typeof customField.options === "string"
                  ? customField.options.split(",").map((o) => o.trim())
                  : [];

              if (!validOptions.includes(String(value))) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Invalid value for ${customField.fieldName}`,
                });
              }
            }
          }
        }
      }

      const originalTotalPrice = totalPrice;
      let siblingDiscountAmount = 0;
      let siblingDiscountStatus: SiblingDiscountStatus =
        SiblingDiscountStatus.NONE;

      if (input.siblingDiscountApplied && course.allowSiblingDiscount) {
        const siblingGroups = new Map<string, typeof participants>();
        const soloParticipants: typeof participants = [];

        for (const participant of participants) {
          if (participant.siblingGroupId) {
            if (!siblingGroups.has(participant.siblingGroupId)) {
              siblingGroups.set(participant.siblingGroupId, []);
            }
            siblingGroups.get(participant.siblingGroupId)?.push(participant);
          } else {
            soloParticipants.push(participant);
          }
        }

        for (const [, groupParticipants] of siblingGroups) {
          if (groupParticipants.length > 1) {
            for (let i = 1; i < groupParticipants.length; i++) {
              const participant = groupParticipants[i];
              if (participant) {
                const priceOption = course.priceOptions.find(
                  (p) => p.id === participant.priceOptionId,
                );
                if (priceOption) {
                  siblingDiscountAmount += priceOption.price * 0.2;
                }
              }
            }
          }
        }

        if (siblingDiscountAmount > 0) {
          totalPrice = originalTotalPrice - siblingDiscountAmount;
          siblingDiscountStatus = SiblingDiscountStatus.PENDING;
        }
      }

      const currentParticipantsCount = await ctx.db.participant.count({
        where: {
          registration: {
            courseId: input.courseId,
            OR: [
              { registrationStatus: RegistrationStatus.CONFIRMED },
              {
                siblingDiscountStatus: SiblingDiscountStatus.PENDING,
              },
            ],
          },
        },
      });

      const newParticipants = participants.length;
      const totalAfterRegistration = currentParticipantsCount + newParticipants;

      const maxParticipants = Math.min(
        course.maxParticipants || Infinity,
        course.priceOptions.reduce(
          (sum, p) => sum + (p.maxParticipants || Infinity),
          0,
        ),
      );

      const availableSpots = maxParticipants - currentParticipantsCount;

      let registrationStatus: RegistrationStatus = RegistrationStatus.CONFIRMED;

      if (totalAfterRegistration > maxParticipants) {
        if (!course.allowWaitingList) {
          if (availableSpots > 0 && availableSpots < newParticipants) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Nur noch ${availableSpots} ${availableSpots === 1 ? "Platz" : "Plätze"} verfügbar, aber Sie versuchen ${newParticipants} ${newParticipants === 1 ? "Teilnehmer" : "Teilnehmer"} anzumelden. Bitte reduzieren Sie die Anzahl der Teilnehmer oder kontaktieren Sie uns.`,
            });
          }
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
          totalPrice, // Use server-calculated price (after discount if applied)
          originalTotalPrice:
            input.siblingDiscountApplied && siblingDiscountAmount > 0
              ? originalTotalPrice
              : null,
          siblingDiscountAmount:
            input.siblingDiscountApplied && siblingDiscountAmount > 0
              ? siblingDiscountAmount
              : null,
          siblingDiscountApplied: input.siblingDiscountApplied ?? false,
          siblingDiscountStatus,
          registrationStatus,
          participants: {
            create: participantsWithPriceOptions.map((participant) => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { priceOptionId, ...participantData } = participant;
              return {
                ...participantData,
                customFields: participantData.customFields || {},
                siblingGroupId: participant.siblingGroupId || null,
              };
            }),
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

      if (isEmailConfigured()) {
        try {
          if (
            siblingDiscountStatus === SiblingDiscountStatus.PENDING &&
            originalTotalPrice &&
            siblingDiscountAmount
          ) {
            await sendCourseRegistrationPendingDiscountEmail(
              registration.registrantEmail,
              registration.registrantFirstName,
              registration.registrantLastName,
              registration.course.title,
              registration.course.startDate,
              registration.course.endDate,
              originalTotalPrice,
              siblingDiscountAmount,
              totalPrice,
              registration.participants.length,
              registration.id,
            );
          } else if (registrationStatus === RegistrationStatus.CONFIRMED) {
            await sendCourseRegistrationConfirmedEmail(
              registration.registrantEmail,
              registration.registrantFirstName,
              registration.registrantLastName,
              registration.course.title,
              registration.course.startDate,
              registration.course.endDate,
              registration.totalPrice,
              registration.participants.length,
              registration.id,
            );
          } else if (registrationStatus === RegistrationStatus.WAITLIST) {
            await sendCourseRegistrationWaitlistEmail(
              registration.registrantEmail,
              registration.registrantFirstName,
              registration.registrantLastName,
              registration.course.title,
              registration.course.startDate,
              registration.course.endDate,
              registration.totalPrice,
              registration.participants.length,
              registration.id,
            );
          }
        } catch (error) {
          console.error("Failed to send registration email:", error);
        }
      }

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
              allowSiblingDiscount: true,
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

  getMyActiveRegistrationForCourse: protectedProcedure
    .input(z.object({ courseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findFirst({
        where: {
          courseId: input.courseId,
          registrantEmail: ctx.session.user.email,
          registrationStatus: {
            in: [RegistrationStatus.CONFIRMED, RegistrationStatus.WAITLIST],
          },
        },
        include: {
          participants: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return registration;
    }),

  getMyRegistrations: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.enum(RegistrationStatus).optional(),
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
                allowSiblingDiscount: true,
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
        registrantPhone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
        useSeparateBilling: z.boolean().optional(),
        billingCompany: z.string().max(200).optional(),
        billingFirstName: z.string().max(100).optional(),
        billingLastName: z.string().max(100).optional(),
        billingStreet: z.string().max(200).optional(),
        billingZipCode: z.string().max(20).optional(),
        billingCity: z.string().max(100).optional(),
        billingEmail: z.email().optional(),
        notes: z.string().max(2000).optional(),
        participants: z.array(
          z.object({
            id: z.string().optional(),
            firstName: z.string().min(1).max(100),
            lastName: z.string().min(1).max(100),
            birthDate: z.date().refine((date) => date < new Date(), {
              message: "Geburtsdatum muss in der Vergangenheit liegen",
            }),
            city: z.string().min(1).max(100),
            instrument: z.string().max(100).optional(),
            priceOptionId: z.string().min(1),
            customFields: z.record(z.string(), z.any()).optional(),
            siblingGroupId: z.string().optional(),
          }),
        ),
        siblingDiscountApplied: z.boolean().optional(),
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

      let originalTotalPrice = 0;
      const participantsWithPriceOptions = [];

      for (const participant of participants) {
        const priceOption = course.priceOptions.find(
          (p) => p.id === participant.priceOptionId,
        );

        if (!priceOption) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid price option ID: ${participant.priceOptionId}`,
          });
        }

        originalTotalPrice += priceOption.price;

        participantsWithPriceOptions.push({
          ...participant,
          priceOption: priceOption.label,
        });
      }

      let totalPrice = originalTotalPrice;
      let siblingDiscountAmount = 0;
      let siblingDiscountStatus = registration.siblingDiscountStatus;

      if (input.siblingDiscountApplied && course.allowSiblingDiscount) {
        const siblingGroups = new Map<string, typeof participants>();
        for (const participant of participants) {
          if (participant.siblingGroupId) {
            if (!siblingGroups.has(participant.siblingGroupId)) {
              siblingGroups.set(participant.siblingGroupId, []);
            }
            siblingGroups.get(participant.siblingGroupId)?.push(participant);
          }
        }

        for (const [, groupParticipants] of siblingGroups) {
          if (groupParticipants.length > 1) {
            // Only apply discount to participants under 18
            const eligibleParticipants = groupParticipants.filter(p => 
              p.birthDate && isParticipantUnder18(p.birthDate)
            );
            if (eligibleParticipants.length > 1) {
              // Apply discount to all eligible participants except the first one
              for (let i = 1; i < eligibleParticipants.length; i++) {
                const participant = eligibleParticipants[i];
                if (participant) {
                  const priceOption = course.priceOptions.find(
                    (p) => p.id === participant.priceOptionId,
                  );
                  if (priceOption) {
                    siblingDiscountAmount += priceOption.price * 0.2;
                  }
                }
              }
            }
          }
        }

        if (siblingDiscountAmount > 0) {
          totalPrice = originalTotalPrice - siblingDiscountAmount;
          if (siblingDiscountStatus === "NONE") {
            siblingDiscountStatus = SiblingDiscountStatus.PENDING;
          }
        } else {
          siblingDiscountStatus = SiblingDiscountStatus.NONE;
          siblingDiscountAmount = 0;
          originalTotalPrice = 0;
        }
      } else {
        siblingDiscountStatus = SiblingDiscountStatus.NONE;
        siblingDiscountAmount = 0;
        originalTotalPrice = 0;
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
          const availableSpots =
            maxParticipants - currentParticipantsExcludingThis;
          if (availableSpots > 0 && availableSpots < participants.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Nur noch ${availableSpots} ${availableSpots === 1 ? "Platz" : "Plätze"} verfügbar, aber Sie versuchen ${participants.length} ${participants.length === 1 ? "Teilnehmer" : "Teilnehmer"} anzumelden. Bitte reduzieren Sie die Anzahl der Teilnehmer.`,
            });
          }
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot add more participants - course is full",
          });
        }
      }

      const priceOptionCounts: Record<string, number> = {};
      for (const participant of participantsWithPriceOptions) {
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

      for (const participant of participantsWithPriceOptions) {
        const {
          id: participantId,
          siblingGroupId,
          ...participantData
        } = participant;

        if (participantId) {
          await ctx.db.participant.update({
            where: { id: participantId },
            data: {
              ...participantData,
              customFields: participantData.customFields ?? {},
              siblingGroupId: siblingGroupId ?? null,
            },
          });
        } else {
          await ctx.db.participant.create({
            data: {
              ...participantData,
              customFields: participantData.customFields ?? {},
              siblingGroupId: siblingGroupId ?? null,
              registrationId: id,
            },
          });
        }
      }

      const updatedRegistration = await ctx.db.courseRegistration.update({
        where: { id },
        data: {
          ...registrationData,
          totalPrice, // Use server-calculated price
          siblingDiscountApplied:
            input.siblingDiscountApplied ?? registration.siblingDiscountApplied,
          siblingDiscountStatus,
          originalTotalPrice:
            siblingDiscountAmount > 0 ? originalTotalPrice : null,
          siblingDiscountAmount:
            siblingDiscountAmount > 0 ? siblingDiscountAmount : null,
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
          participants: true,
          course: {
            include: {
              instructors: { select: { id: true } },
            },
            select: {
              title: true,
              startDate: true,
              endDate: true,
              createdById: true,
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
      const canManageRegistrations = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
      );
      const isAdmin = canManageRegistrations;

      if (!isInstructor && !isCreator && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }

      const previousStatus = registration.registrationStatus;
      const wasWaitlist = previousStatus === RegistrationStatus.WAITLIST;
      const isNowConfirmed =
        input.registrationStatus === RegistrationStatus.CONFIRMED;

      const updatedRegistration = await ctx.db.courseRegistration.update({
        where: { id: input.id },
        data: {
          registrationStatus: input.registrationStatus,
          notes: input.notes,
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

      if (isEmailConfigured() && wasWaitlist && isNowConfirmed) {
        try {
          await sendCourseRegistrationConfirmedEmail(
            updatedRegistration.registrantEmail,
            updatedRegistration.registrantFirstName,
            updatedRegistration.registrantLastName,
            updatedRegistration.course.title,
            updatedRegistration.course.startDate,
            updatedRegistration.course.endDate,
            updatedRegistration.totalPrice,
            updatedRegistration.participants.length,
            updatedRegistration.id,
          );
        } catch (error) {
          console.error("Failed to send confirmation email:", error);
        }
      }

      return updatedRegistration;
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
      const canManageRegistrations = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
      );
      const isAdmin = canManageRegistrations;

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
      let registration;

      if (ctx.session) {
        registration = await ctx.db.courseRegistration.findUnique({
          where: { id: input.id },
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
        if (!registration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Registration not found",
          });
        }
        const canManageRegistrations = await userHasPermission(
          ctx.session.user.id,
          PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
        );
        if (
          registration.registrantEmail !== ctx.session.user.email &&
          !canManageRegistrations
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot cancel registration of another user",
          });
        }
      } else {
        registration = await ctx.db.courseRegistration.findUnique({
          where: { id: input.id },
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
      }

      const wasAlreadyCancelled =
        registration.registrationStatus === RegistrationStatus.CANCELLED;

      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.id },
        data: {
          registrationStatus: RegistrationStatus.CANCELLED,
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

      if (isEmailConfigured() && !wasAlreadyCancelled) {
        try {
          await sendCourseRegistrationCancelledEmail(
            updated.registrantEmail,
            updated.registrantFirstName,
            updated.registrantLastName,
            updated.course.title,
            updated.course.startDate,
            updated.course.endDate,
            updated.participants.length,
            updated.id,
          );
        } catch (error) {
          console.error("Failed to send cancellation email:", error);
        }
      }

      return updated;
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
      const canManageRegistrations = await userHasPermission(
        ctx.session.user.id,
        PERMISSIONS.COURSES_MANAGE_REGISTRATIONS,
      );
      const isAdmin = canManageRegistrations;

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

  approveSiblingDiscount: lpwProcedure
    .input(
      z.object({
        registrationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.registrationId },
        include: { course: true },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      if (
        registration.siblingDiscountStatus !== SiblingDiscountStatus.PENDING
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration does not have a pending sibling discount",
        });
      }

      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.registrationId },
        data: {
          siblingDiscountStatus: SiblingDiscountStatus.APPROVED,
          registrationStatus: RegistrationStatus.CONFIRMED,
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

      if (
        isEmailConfigured() &&
        updated.originalTotalPrice &&
        updated.siblingDiscountAmount
      ) {
        try {
          await sendSiblingDiscountApprovedEmail(
            updated.registrantEmail,
            updated.registrantFirstName,
            updated.registrantLastName,
            updated.course.title,
            updated.course.startDate,
            updated.course.endDate,
            updated.originalTotalPrice,
            updated.siblingDiscountAmount,
            updated.totalPrice,
            updated.participants.length,
            updated.id,
          );
        } catch (error) {
          console.error("Failed to send discount approval email:", error);
        }
      }

      return updated;
    }),

  rejectSiblingDiscount: lpwProcedure
    .input(
      z.object({
        registrationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.registrationId },
        include: { course: true },
      });

      if (!registration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registration not found",
        });
      }

      if (
        registration.siblingDiscountStatus !== SiblingDiscountStatus.PENDING
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration does not have a pending sibling discount",
        });
      }

      const originalPrice =
        registration.originalTotalPrice ?? registration.totalPrice;
      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.registrationId },
        data: {
          siblingDiscountStatus: SiblingDiscountStatus.REJECTED,
          totalPrice: originalPrice,
          siblingDiscountAmount: null,
          originalTotalPrice: null,
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

      if (isEmailConfigured()) {
        try {
          await sendSiblingDiscountRejectedEmail(
            updated.registrantEmail,
            updated.registrantFirstName,
            updated.registrantLastName,
            updated.course.title,
            updated.course.startDate,
            updated.course.endDate,
            originalPrice,
            updated.participants.length,
            updated.id,
          );
        } catch (error) {
          console.error("Failed to send discount rejection email:", error);
        }
      }

      return updated;
    }),

  confirmAtFullPrice: protectedProcedure
    .input(
      z.object({
        registrationId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.db.courseRegistration.findUnique({
        where: { id: input.registrationId },
        include: {
          course: true,
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
          message: "You can only confirm your own registrations",
        });
      }

      if (
        registration.siblingDiscountStatus !== SiblingDiscountStatus.REJECTED
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration does not have a rejected discount",
        });
      }

      const updated = await ctx.db.courseRegistration.update({
        where: { id: input.registrationId },
        data: {
          siblingDiscountStatus: SiblingDiscountStatus.NONE,
          siblingDiscountApplied: false,
          siblingDiscountAmount: null,
          originalTotalPrice: null,
          registrationStatus: RegistrationStatus.CONFIRMED,
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

      if (isEmailConfigured()) {
        try {
          await sendCourseRegistrationConfirmedEmail(
            updated.registrantEmail,
            updated.registrantFirstName,
            updated.registrantLastName,
            updated.course.title,
            updated.course.startDate,
            updated.course.endDate,
            updated.totalPrice,
            updated.participants.length,
            updated.id,
          );
        } catch (error) {
          console.error("Failed to send confirmation email:", error);
        }
      }

      return updated;
    }),
});
