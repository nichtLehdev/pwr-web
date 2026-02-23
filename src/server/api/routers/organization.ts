import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  lpwProcedure,
  publicProcedure,
} from "../trpc";
import {
  PosaunenratRole,
  ContactType,
  HistoryCategory,
  FoerdervereinRole,
  PosaunenwartRoleType,
} from "~/generated/prisma/client";

export const organizationRouter = createTRPCRouter({
  getPosaunenrat: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.posaunenratMember.findMany({
      include: {
        image: true,
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            profileImage: true,
            bio: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return members;
  }),

  getPosaunenratByRole: publicProcedure
    .input(
      z.object({
        role: z.nativeEnum(PosaunenratRole).optional(),
        roles: z.array(z.nativeEnum(PosaunenratRole)).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.role
        ? { role: input.role }
        : input.roles
          ? { role: { in: input.roles } }
          : {};

      const members = await ctx.db.posaunenratMember.findMany({
        where,
        include: {
          image: true,
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              bio: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      return members;
    }),

  getPosaunenratGrouped: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.posaunenratMember.findMany({
      include: {
        image: true,
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            profileImage: true,
            bio: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const grouped = {
      landeskirchenmusikdirektor: members.filter(
        (m) => m.role === "LANDESKIRCHENMUSIKDIREKTOR",
      ),
      vorstand: members.filter((m) => m.role === "VORSTAND"),
      sachverstaendige: members.filter(
        (m) => m.role === "SACHVERSTAENDIGER" || m.role === "SACHVERSTAENDIGE",
      ),
    };

    return grouped;
  }),

  getPosaunenratMember: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.posaunenratMember.findUnique({
        where: { id: input.id },
        include: {
          image: true,
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              bio: true,
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Posaunenratsmitglied nicht gefunden",
        });
      }

      return member;
    }),

  createPosaunenratMember: adminProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        imageId: z.string().optional(),
        role: z.enum(PosaunenratRole),
        sortOrder: z.number().default(0),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.posaunenratMember.create({
        data: input,
        include: {
          image: true,
          user: true,
        },
      });
    }),

  updatePosaunenratMember: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.email().optional(),
        imageId: z.string().optional().nullable(),
        role: z.enum(PosaunenratRole).optional(),
        sortOrder: z.number().optional(),
        userId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      return await ctx.db.posaunenratMember.update({
        where: { id },
        data: updateData,
        include: {
          image: true,
          user: true,
        },
      });
    }),

  deletePosaunenratMember: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.posaunenratMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getTeam: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.teamMember.findMany({
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            profileImage: true,
            bio: true,
            districtRoleName: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return members.map((member) => ({
      ...member,
      user: member.user,
      responsibilities: member.responsibilities
        ? (member.responsibilities as string[])
        : [],
      socials: member.socials
        ? (member.socials as { type: string; url: string; label?: string }[])
        : [],
    }));
  }),

  getTeamByContactType: publicProcedure
    .input(z.object({ contactType: z.enum(ContactType) }))
    .query(async ({ ctx, input }) => {
      const members = await ctx.db.teamMember.findMany({
        where: { contactType: input.contactType },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              bio: true,
              districtRoleName: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      return members.map((member) => ({
        ...member,
        user: member.user,
        responsibilities: member.responsibilities
          ? (member.responsibilities as string[])
          : [],
        socials: member.socials
          ? (member.socials as { type: string; url: string; label?: string }[])
          : [],
      }));
    }),

  getTeamGrouped: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.teamMember.findMany({
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            profileImage: true,
            bio: true,
            districtRoleName: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const geschaeftsstelle = members
      .filter((m) => m.contactType === "GESCHAEFTSSTELLE")
      .map((m) => ({ ...m, user: m.user }));
    const internetTeam = members
      .filter((m) => m.contactType === "INTERNET_TEAM")
      .map((m) => ({ ...m, user: m.user }));
    const other = members
      .filter((m) => !m.contactType)
      .map((m) => ({ ...m, user: m.user }));

    return {
      geschaeftsstelle,
      internetTeam,
      other,
    };
  }),

  createTeamMember: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.string().max(100).optional(),
        responsibilities: z.string().max(1000).optional(),
        socials: z.string().max(500).optional(),
        contactType: z.enum(ContactType).optional(),
        sortOrder: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.teamMember.findUnique({
        where: { userId: input.userId },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has a team member record",
        });
      }

      const responsibilities = input.responsibilities
        ? input.responsibilities
            .split("\n")
            .map((r) => r.trim())
            .filter((r) => r.length > 0)
        : undefined;

      const socials = input.socials ? JSON.parse(input.socials) : undefined;

      const member = await ctx.db.teamMember.create({
        data: {
          userId: input.userId,
          role: input.role,
          responsibilities,
          socials,
          contactType: input.contactType,
          sortOrder: input.sortOrder,
        },
        include: {
          user: true,
        },
      });

      return {
        ...member,
        responsibilities: member.responsibilities
          ? (member.responsibilities as string[])
          : [],
        socials: member.socials
          ? (member.socials as { type: string; url: string; label?: string }[])
          : [],
      };
    }),

  updateTeamMember: adminProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.string().max(100).optional(),
        responsibilities: z.string().max(1000).optional(),
        socials: z.string().max(500).optional(),
        contactType: z.enum(ContactType).optional().nullable(),
        sortOrder: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        id,
        responsibilities: responsibilitiesStr,
        socials: socialsStr,
        ...rest
      } = input;

      const responsibilities = responsibilitiesStr
        ? responsibilitiesStr
            .split("\n")
            .map((r) => r.trim())
            .filter((r) => r.length > 0)
        : undefined;

      const socials = socialsStr ? JSON.parse(socialsStr) : undefined;

      const member = await ctx.db.teamMember.update({
        where: { id },
        data: {
          ...rest,
          responsibilities,
          socials,
        },
        include: {
          user: true,
        },
      });

      return {
        ...member,
        responsibilities: member.responsibilities
          ? (member.responsibilities as string[])
          : [],
        socials: member.socials
          ? (member.socials as { type: string; url: string; label?: string }[])
          : [],
      };
    }),

  getTeamMember: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.teamMember.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              bio: true,
              districtRoleName: true,
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      return {
        ...member,
        user: member.user,
        responsibilities: member.responsibilities
          ? (member.responsibilities as string[])
          : [],
        socials: member.socials
          ? (member.socials as { type: string; url: string; label?: string }[])
          : [],
      };
    }),

  deleteTeamMember: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.teamMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getVorstand: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.vorstandMember.findMany({
      include: {
        image: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
            profileImage: true,
            bio: true,
            phone: true,
            preferences: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const { maskUserContact } = await import("@/lib/mask-user-contact");

    return members.map((member) => {
      const masked = member.user
        ? maskUserContact(member.user)
        : { phone: null };
      return {
        ...member,
        user: member.user
          ? {
              ...member.user,
              phone: masked.phone ?? undefined,
              displayName:
                member.user.displayName ||
                `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim(),
              firstName: undefined,
              lastName: undefined,
              preferences: undefined,
            }
          : null,
        image: member.image ? member.image : member.user?.profileImage || null,
      };
    });
  }),

  getVorstandMember: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.vorstandMember.findUnique({
        where: { id: input.id },
        include: {
          image: true,
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              bio: true,
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vorstand member not found",
        });
      }

      return member;
    }),

  createVorstandMember: adminProcedure
    .input(
      z.object({
        name: z.string().max(100).optional(),
        email: z.email().optional(),
        phone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
        position: z.string().min(1).max(100),
        description: z.string().max(1000).optional(),
        color: z.string().optional(),
        sortOrder: z.number().default(0),
        userId: z.string().optional(),
        imageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId) {
        const existing = await ctx.db.vorstandMember.findUnique({
          where: { userId: input.userId },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already has a vorstand member record",
          });
        }
      }

      return await ctx.db.vorstandMember.create({
        data: input,
        include: {
          image: true,
          user: true,
        },
      });
    }),

  updateVorstandMember: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().max(100).optional(),
        email: z.email().optional(),
        phone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
        position: z.string().max(100).optional(),
        description: z.string().max(1000).optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
        userId: z.string().optional().nullable(),
        imageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      return await ctx.db.vorstandMember.update({
        where: { id },
        data: updateData,
        include: {
          image: true,
          user: true,
        },
      });
    }),

  deleteVorstandMember: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.vorstandMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getFoerderverein: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.foerdervereinMember.findMany({
      include: {
        image: true,
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            profileImage: true,
            bio: true,
            city: true,
            preferences: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const { maskUserContact } = await import("@/lib/mask-user-contact");
    return members.map((member) => ({
      ...member,
      user: member.user
        ? {
            ...member.user,
            city: maskUserContact(member.user).city ?? undefined,
            preferences: undefined,
          }
        : null,
    }));
  }),

  getFoerdervereinBoard: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.foerdervereinMember.findMany({
      where: {
        role: {
          in: [
            "VORSITZENDER",
            "STELLVERTRETER",
            "SCHATZMEISTER",
            "SCHRIFTFUEHRER",
            "BEISITZER",
          ],
        },
      },
      include: {
        image: true,
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            profileImage: true,
            bio: true,
            city: true,
            preferences: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const { maskUserContact } = await import("@/lib/mask-user-contact");
    return members.map((member) => ({
      ...member,
      user: member.user
        ? {
            ...member.user,
            city: maskUserContact(member.user).city ?? undefined,
            preferences: undefined,
          }
        : null,
    }));
  }),

  getFoerdervereinByRole: publicProcedure
    .input(
      z.object({
        role: z.enum(FoerdervereinRole).optional(),
        roles: z.array(z.enum(FoerdervereinRole)).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = input.role
        ? { role: input.role }
        : input.roles
          ? { role: { in: input.roles } }
          : {};

      const members = await ctx.db.foerdervereinMember.findMany({
        where,
        include: {
          image: true,
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              bio: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      return members;
    }),

  getFoerdervereinGrouped: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.foerdervereinMember.findMany({
      include: {
        image: true,
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            profileImage: true,
            bio: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    const grouped = {
      leadership: members.filter(
        (m) =>
          m.role === "VORSITZENDER" ||
          m.role === "STELLVERTRETER" ||
          m.role === "SCHATZMEISTER" ||
          m.role === "SCHRIFTFUEHRER",
      ),
      beisitzer: members.filter((m) => m.role === "BEISITZER"),
      mitglieder: members.filter((m) => m.role === "MITGLIED"),
    };

    return grouped;
  }),

  getFoerdervereinMember: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.foerdervereinMember.findUnique({
        where: { id: input.id },
        include: {
          image: true,
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              profileImage: true,
              bio: true,
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Förderverein member not found",
        });
      }

      return member;
    }),

  createFoerdervereinMember: adminProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.email().optional(),
        phone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/)
          .optional(),
        position: z.string().optional(),
        role: z.enum(FoerdervereinRole).default("MITGLIED"),
        memberSince: z
          .date()
          .refine((date) => date <= new Date(), {
            message: "Datum kann nicht in der Zukunft liegen",
          })
          .optional(),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
        userId: z.string().optional(),
        imageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId) {
        const existing = await ctx.db.foerdervereinMember.findUnique({
          where: { userId: input.userId },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already has a förderverein member record",
          });
        }
      }

      return await ctx.db.foerdervereinMember.create({
        data: input,
        include: {
          image: true,
          user: true,
        },
      });
    }),

  updateFoerdervereinMember: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional().nullable(),
        email: z.email().optional().nullable(),
        phone: z
          .string()
          .max(50)
          .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\\s./0-9]*$/)
          .optional()
          .nullable(),
        position: z.string().optional().nullable(),
        role: z.enum(FoerdervereinRole).optional(),
        memberSince: z
          .date()
          .refine((date) => !date || date <= new Date(), {
            message: "Datum kann nicht in der Zukunft liegen",
          })
          .optional()
          .nullable(),
        description: z.string().optional().nullable(),
        sortOrder: z.number().optional(),
        userId: z.string().optional().nullable(),
        imageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      return await ctx.db.foerdervereinMember.update({
        where: { id },
        data: updateData,
        include: {
          image: true,
          user: true,
        },
      });
    }),

  deleteFoerdervereinMember: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.foerdervereinMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Get all Posaunenwarte with their Bezirke (from Posaunenwart model)
   */
  getPosaunenwarte: publicProcedure.query(async ({ ctx }) => {
    const list = await ctx.db.posaunenwart.findMany({
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
            preferences: true,
            districtRoleName: true,
            bio: true,
            profileImage: true,
          },
        },
        image: true,
        responsibilities: {
          include: { bezirk: true },
          orderBy: { bezirk: { number: "asc" } },
        },
      },
      orderBy: [
        { roleType: "asc" },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    const { maskUserContact } = await import("@/lib/mask-user-contact");

    return list.map((p) => {
      const name = p.user?.displayName ?? p.name ?? null;
      const email = p.user?.email ?? p.email ?? "";
      const masked = p.user ? maskUserContact(p.user) : { phone: null };
      return {
        id: p.id,
        name,
        email,
        role: p.roleType,
        phone: p.user ? (masked.phone ?? null) : (p.phone ?? null),
        districtRoleName: p.user?.districtRoleName ?? null,
        bio: p.user?.bio ?? null,
        profileImage: p.image ?? p.user?.profileImage ?? null,
        userId: p.userId,
        bezirke: p.responsibilities.map((r) => ({
          id: r.bezirk.id,
          number: r.bezirk.number,
          name: r.bezirk.name,
          shortName: r.bezirk.shortName,
          notes: r.notes,
          priority: r.priority,
        })),
      };
    });
  }),

  /**
   * Get one Posaunenwart by id (for dashboard detail/edit)
   */
  getPosaunenwart: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const pw = await ctx.db.posaunenwart.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
              preferences: true,
              districtRoleName: true,
              bio: true,
              profileImage: true,
            },
          },
          image: true,
          responsibilities: {
            include: { bezirk: true },
            orderBy: { bezirk: { number: "asc" } },
          },
        },
      });
      if (!pw) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Posaunenwart nicht gefunden",
        });
      }
      const { maskUserContact } = await import("@/lib/mask-user-contact");
      const masked = pw.user ? maskUserContact(pw.user) : { phone: null };
      const name = pw.user?.displayName ?? pw.name ?? null;
      const email = pw.user?.email ?? pw.email ?? "";
      return {
        id: pw.id,
        name,
        email,
        role: pw.roleType,
        phone: pw.user ? (masked.phone ?? null) : (pw.phone ?? null),
        districtRoleName: pw.user?.districtRoleName ?? null,
        bio: pw.user?.bio ?? null,
        profileImage: pw.image ?? pw.user?.profileImage ?? null,
        userId: pw.userId,
        sortOrder: pw.sortOrder,
        imageId: pw.imageId,
        imageUrl: pw.image?.url ?? null,
        storedName: pw.name,
        storedEmail: pw.email,
        storedPhone: pw.phone,
        bezirke: pw.responsibilities.map((r) => ({
          id: r.bezirk.id,
          number: r.bezirk.number,
          name: r.bezirk.name,
          shortName: r.bezirk.shortName,
          notes: r.notes,
          priority: r.priority,
        })),
      };
    }),

  /**
   * Get Posaunenwarte by specific role (LPW or RPW)
   */
  getPosaunenwarteByRole: publicProcedure
    .input(
      z.object({
        role: z.enum(["LPW", "RPW"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const list = await ctx.db.posaunenwart.findMany({
        where: { roleType: input.role },
        include: {
          user: {
            select: {
              displayName: true,
              email: true,
              phone: true,
              districtRoleName: true,
              bio: true,
              profileImage: true,
            },
          },
          image: true,
          responsibilities: {
            include: { bezirk: true },
            orderBy: { bezirk: { number: "asc" } },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      return list.map((p) => {
        const name = p.user?.displayName ?? p.name ?? null;
        const email = p.user?.email ?? p.email ?? "";
        return {
          id: p.id,
          name,
          email,
          role: p.roleType,
          phone: p.user?.phone ?? p.phone ?? null,
          districtRoleName: p.user?.districtRoleName ?? null,
          bio: p.user?.bio ?? null,
          profileImage: p.image ?? p.user?.profileImage ?? null,
          bezirke: p.responsibilities.map((r) => ({
            id: r.bezirk.id,
            number: r.bezirk.number,
            name: r.bezirk.name,
            shortName: r.bezirk.shortName,
            notes: r.notes,
          })),
        };
      });
    }),

  /**
   * Get Posaunenwarte for a specific Bezirk
   */
  getPosaunenwarteForBezirk: publicProcedure
    .input(
      z.object({
        bezirkId: z.string().optional(),
        bezirkNumber: z.number().min(1).max(13).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!input.bezirkId && !input.bezirkNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either bezirkId or bezirkNumber must be provided",
        });
      }

      const bezirk = await ctx.db.bezirk.findFirst({
        where: input.bezirkId
          ? { id: input.bezirkId }
          : { number: input.bezirkNumber },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      const responsibilities = await ctx.db.posaunenwartResponsibility.findMany(
        {
          where: { bezirkId: bezirk.id },
          include: {
            posaunenwart: {
              include: {
                user: { include: { profileImage: true } },
                image: true,
              },
            },
          },
          orderBy: { priority: "asc" },
        },
      );

      const posaunenwarte = responsibilities.map((r) => {
        const p = r.posaunenwart;
        const name = p.user?.displayName ?? p.name ?? null;
        const email = p.user?.email ?? p.email ?? "";
        return {
          id: p.id,
          name,
          email,
          role: p.roleType,
          phone: p.user?.phone ?? p.phone ?? null,
          districtRoleName: p.user?.districtRoleName ?? null,
          bio: p.user?.bio ?? null,
          profileImage: p.image ?? p.user?.profileImage ?? null,
          notes: r.notes,
          priority: r.priority,
        };
      });

      return { bezirk, posaunenwarte };
    }),

  /**
   * Get complete contact info for a Bezirk
   */
  getBezirkContacts: publicProcedure
    .input(
      z.object({
        bezirkNumber: z.number().min(1).max(13),
      }),
    )
    .query(async ({ ctx, input }) => {
      const bezirk = await ctx.db.bezirk.findFirst({
        where: { number: input.bezirkNumber },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      const responsibilities = await ctx.db.posaunenwartResponsibility.findMany(
        {
          where: { bezirkId: bezirk.id },
          include: {
            posaunenwart: {
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    email: true,
                    districtRoleName: true,
                    profileImage: { select: { url: true, alt: true } },
                  },
                },
              },
            },
          },
          orderBy: { priority: "asc" },
        },
      );

      const toContact = (r: (typeof responsibilities)[0]) => {
        const p = r.posaunenwart;
        return {
          id: p.user?.id ?? p.id,
          displayName: p.user?.displayName ?? p.name ?? null,
          email: p.user?.email ?? p.email ?? null,
          districtRoleName: p.user?.districtRoleName ?? null,
          profileImage: p.user?.profileImage
            ? { url: p.user.profileImage.url, alt: p.user.profileImage.alt }
            : null,
        };
      };

      const lpwResp = responsibilities.find(
        (r) => r.posaunenwart.roleType === "LPW",
      );
      const rpwResp = responsibilities.find(
        (r) => r.posaunenwart.roleType === "RPW",
      );
      const lpw = lpwResp ? toContact(lpwResp) : undefined;
      const rpw = rpwResp ? toContact(rpwResp) : undefined;

      const obmann = await ctx.db.user.findFirst({
        where: {
          bezirkId: bezirk.id,
          districtRoleName: { not: null },
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          districtRoleName: true,
          profileImage: { select: { url: true, alt: true } },
        },
      });

      return {
        bezirk: {
          number: bezirk.number,
          name: bezirk.name,
          shortName: bezirk.shortName,
        },
        lpw,
        rpw,
        obmann,
      };
    }),

  /**
   * Get Posaunenwarte organizational hierarchy
   */
  getPosaunenwarteHierarchy: publicProcedure.query(async ({ ctx }) => {
    const list = await ctx.db.posaunenwart.findMany({
      include: {
        user: {
          select: {
            displayName: true,
            email: true,
            phone: true,
            districtRoleName: true,
            bio: true,
            profileImage: true,
          },
        },
        image: true,
        responsibilities: {
          include: { bezirk: true },
          orderBy: { bezirk: { number: "asc" } },
        },
      },
      orderBy: [{ roleType: "asc" }, { sortOrder: "asc" }],
    });

    const toItem = (p: (typeof list)[0]) => ({
      id: p.id,
      name: p.user?.displayName ?? p.name ?? null,
      email: p.user?.email ?? p.email ?? null,
      phone: p.user?.phone ?? p.phone ?? null,
      districtRoleName: p.user?.districtRoleName ?? null,
      bio: p.user?.bio ?? null,
      profileImage: p.image ?? p.user?.profileImage ?? null,
      bezirke: p.responsibilities.map((r) => r.bezirk),
    });

    const lpw = list
      .filter((p) => p.roleType === "LPW")
      .map(toItem)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const rpw = list
      .filter((p) => p.roleType === "RPW")
      .map(toItem)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return { lpw, rpw };
  }),

  /**
   * Get Posaunenwarte coverage statistics
   */
  getPosaunenwarteStatistics: publicProcedure.query(async ({ ctx }) => {
    const [posaunenwarte, totalBezirke, responsibilities] = await Promise.all([
      ctx.db.posaunenwart.findMany({ select: { id: true, roleType: true } }),
      ctx.db.bezirk.count(),
      ctx.db.posaunenwartResponsibility.findMany({
        select: { bezirkId: true },
      }),
    ]);

    const lpwCount = posaunenwarte.filter((p) => p.roleType === "LPW").length;
    const rpwCount = posaunenwarte.filter((p) => p.roleType === "RPW").length;
    const bezirkeWithPosaunenwarte = new Set(
      responsibilities.map((r) => r.bezirkId),
    );

    return {
      lpwCount,
      rpwCount,
      totalBezirke,
      bezirkeWithPosaunenwarte: bezirkeWithPosaunenwarte.size,
      coveragePercentage:
        totalBezirke > 0
          ? (bezirkeWithPosaunenwarte.size / totalBezirke) * 100
          : 0,
      totalResponsibilities: responsibilities.length,
    };
  }),

  createPosaunenwart: adminProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        roleType: z.nativeEnum(PosaunenwartRoleType),
        sortOrder: z.number().default(0),
        imageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId) {
        const existing = await ctx.db.posaunenwart.findUnique({
          where: { userId: input.userId },
        });
        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dieser Benutzer ist bereits als Posaunenwart angelegt.",
          });
        }
      }
      return await ctx.db.posaunenwart.create({
        data: {
          userId: input.userId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          roleType: input.roleType,
          sortOrder: input.sortOrder,
          imageId: input.imageId,
        },
        include: {
          user: true,
          image: true,
          responsibilities: { include: { bezirk: true } },
        },
      });
    }),

  updatePosaunenwart: adminProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string().optional().nullable(),
        name: z.string().optional(),
        email: z.string().email().optional().nullable(),
        phone: z.string().optional().nullable(),
        roleType: z.nativeEnum(PosaunenwartRoleType).optional(),
        sortOrder: z.number().optional(),
        imageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.db.posaunenwart.update({
        where: { id },
        data,
        include: {
          user: true,
          image: true,
          responsibilities: { include: { bezirk: true } },
        },
      });
    }),

  deletePosaunenwart: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.posaunenwart.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Add a Bezirk to a Posaunenwart's responsibilities
   */
  addPosaunenwartResponsibility: adminProcedure
    .input(
      z.object({
        posaunenwartId: z.string(),
        bezirkId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pw = await ctx.db.posaunenwart.findUnique({
        where: { id: input.posaunenwartId },
      });
      if (!pw) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Posaunenwart nicht gefunden",
        });
      }

      const existing = await ctx.db.posaunenwartResponsibility.findUnique({
        where: {
          posaunenwartId_bezirkId: {
            posaunenwartId: input.posaunenwartId,
            bezirkId: input.bezirkId,
          },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Verantwortung existiert bereits",
        });
      }

      return await ctx.db.posaunenwartResponsibility.create({
        data: {
          posaunenwartId: input.posaunenwartId,
          bezirkId: input.bezirkId,
          notes: input.notes,
          priority: pw.roleType === "LPW" ? 1 : 2,
        },
        include: {
          posaunenwart: true,
          bezirk: true,
        },
      });
    }),

  /**
   * Remove a Bezirk from a Posaunenwart's responsibilities
   */
  removePosaunenwartResponsibility: adminProcedure
    .input(
      z.object({
        posaunenwartId: z.string(),
        bezirkId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.posaunenwartResponsibility.delete({
        where: {
          posaunenwartId_bezirkId: {
            posaunenwartId: input.posaunenwartId,
            bezirkId: input.bezirkId,
          },
        },
      });
      return { success: true };
    }),

  /**
   * Update a Posaunenwart responsibility
   */
  updatePosaunenwartResponsibility: adminProcedure
    .input(
      z.object({
        posaunenwartId: z.string(),
        bezirkId: z.string(),
        notes: z.string().optional(),
        priority: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { posaunenwartId, bezirkId, ...data } = input;
      return await ctx.db.posaunenwartResponsibility.update({
        where: {
          posaunenwartId_bezirkId: { posaunenwartId, bezirkId },
        },
        data,
        include: {
          posaunenwart: true,
          bezirk: true,
        },
      });
    }),

  /**
   * Bulk update: Set all Bezirke for an RPW
   */
  setRpwBezirke: adminProcedure
    .input(
      z.object({
        posaunenwartId: z.string(),
        bezirkIds: z.array(z.string()),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pw = await ctx.db.posaunenwart.findUnique({
        where: { id: input.posaunenwartId },
      });
      if (!pw) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Posaunenwart nicht gefunden",
        });
      }
      if (pw.roleType !== "RPW") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Nur bei Regionalposaunenwarten (RPW) können Bezirke gesetzt werden.",
        });
      }

      await ctx.db.posaunenwartResponsibility.deleteMany({
        where: { posaunenwartId: input.posaunenwartId },
      });

      const created = await Promise.all(
        input.bezirkIds.map((bezirkId) =>
          ctx.db.posaunenwartResponsibility.create({
            data: {
              posaunenwartId: input.posaunenwartId,
              bezirkId,
              notes: input.notes,
              priority: 2,
            },
            include: { bezirk: true },
          }),
        ),
      );

      return {
        success: true,
        count: created.length,
        bezirke: created.map((r) => r.bezirk),
      };
    }),

  getHistory: publicProcedure
    .input(
      z.object({
        category: z.enum(HistoryCategory).optional(),
        yearFrom: z.number().optional(),
        yearTo: z.number().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.category && { category: input.category }),
        ...(input.yearFrom && { year: { gte: input.yearFrom } }),
        ...(input.yearTo && { year: { lte: input.yearTo } }),
      };

      const historyEvents = await ctx.db.historyEvent.findMany({
        where,
        include: {
          image: true,
        },
        orderBy: [{ year: "asc" }, { sortOrder: "asc" }],
      });

      return historyEvents;
    }),

  getHistoryEvent: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const historyEvent = await ctx.db.historyEvent.findUnique({
        where: { id: input.id },
        include: {
          image: true,
        },
      });

      if (!historyEvent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "History event not found",
        });
      }

      return historyEvent;
    }),

  createHistoryEvent: lpwProcedure
    .input(
      z.object({
        year: z.number(),
        title: z.string().min(1),
        description: z.string().min(1),
        category: z.enum(HistoryCategory).optional(),
        imageId: z.string().optional(),
        imageAlt: z.string().optional(),
        sortOrder: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.historyEvent.create({
        data: input,
        include: {
          image: true,
        },
      });
    }),

  updateHistoryEvent: lpwProcedure
    .input(
      z.object({
        id: z.string(),
        year: z.number().optional(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.enum(HistoryCategory).optional().nullable(),
        imageId: z.string().optional().nullable(),
        imageAlt: z.string().optional(),
        sortOrder: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      return await ctx.db.historyEvent.update({
        where: { id },
        data: updateData,
        include: {
          image: true,
        },
      });
    }),

  deleteHistoryEvent: lpwProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.historyEvent.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getHistoryTimeline: publicProcedure.query(async ({ ctx }) => {
    const historyEvents = await ctx.db.historyEvent.findMany({
      include: {
        image: true,
      },
      orderBy: { year: "asc" },
    });

    const timeline = historyEvents.reduce(
      (acc, event) => {
        const decade = Math.floor(event.year / 10) * 10;
        if (!acc[decade]) {
          acc[decade] = [];
        }
        acc[decade].push(event);
        return acc;
      },
      {} as Record<number, typeof historyEvents>,
    );

    return timeline;
  }),
});
