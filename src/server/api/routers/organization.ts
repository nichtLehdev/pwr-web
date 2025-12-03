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
  // ============================================================================
  // POSAUNENRAT
  // ============================================================================

  // Public: Get all Posaunenrat members
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

  // Get Posaunenrat members by role
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

  // Get Posaunenrat grouped by role
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

    // Group by role
    const grouped = {
      landeskirchenmusikdirektor: members.filter(
        (m) => m.role === "LANDESKIRCHENMUSIKDIREKTOR",
      ),
      vorstand: members.filter((m) => m.role === "VORSTAND"),
      bezirksobleute: members.filter(
        (m) => m.role === "BEZIRKSOBMANN" || m.role === "BEZIRKSOBFRAU",
      ),
      sachverstaendige: members.filter(
        (m) => m.role === "SACHVERSTAENDIGER" || m.role === "SACHVERSTAENDIGE",
      ),
    };

    return grouped;
  }),

  // Create Posaunenrat member
  createPosaunenratMember: adminProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        imageId: z.string().optional(),
        role: z.enum(PosaunenratRole),
        district: z.string().optional(),
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

  // Update Posaunenrat member
  updatePosaunenratMember: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.email().optional(),
        imageId: z.string().optional().nullable(),
        role: z.enum(PosaunenratRole).optional(),
        district: z.string().optional(),
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

  // Delete Posaunenrat member
  deletePosaunenratMember: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.posaunenratMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ============================================================================
  // TEAM MEMBERS
  // ============================================================================

  // Public: Get all team members
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
            displayRole: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return members.map((member) => ({
      ...member,
      responsibilities: member.responsibilities
        ? (member.responsibilities as string[])
        : [],
      socials: member.socials
        ? (member.socials as { type: string; url: string; label?: string }[])
        : [],
    }));
  }),

  // Get team members by contact type
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
              displayRole: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      return members.map((member) => ({
        ...member,
        responsibilities: member.responsibilities
          ? (member.responsibilities as string[])
          : [],
        socials: member.socials
          ? (member.socials as { type: string; url: string; label?: string }[])
          : [],
      }));
    }),

  // Get team grouped by contact type
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
            displayRole: true,
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Group by contact type
    const grouped = {
      geschaeftsstelle: members.filter(
        (m) => m.contactType === "GESCHAEFTSSTELLE",
      ),
      internetTeam: members.filter((m) => m.contactType === "INTERNET_TEAM"),
      other: members.filter((m) => !m.contactType),
    };

    return grouped;
  }),

  // Create team member
  createTeamMember: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.string().optional(),
        responsibilities: z.string().optional(),
        socials: z.string().optional(),
        contactType: z.enum(ContactType).optional(),
        sortOrder: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already has a team member record
      const existing = await ctx.db.teamMember.findUnique({
        where: { userId: input.userId },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already has a team member record",
        });
      }

      return await ctx.db.teamMember.create({
        data: input,
        include: {
          user: true,
        },
      });
    }),

  // Update team member
  updateTeamMember: adminProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.string().optional(),
        responsibilities: z.string().optional(),
        socials: z.string().optional(),
        contactType: z.enum(ContactType).optional().nullable(),
        sortOrder: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      return await ctx.db.teamMember.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
        },
      });
    }),

  // Delete team member
  deleteTeamMember: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.teamMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ============================================================================
  // VORSTAND MEMBERS
  // ============================================================================

  // Public: Get all Vorstand members
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
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return members.map((member) => ({
      ...member,
      user: {
        ...member.user,
        displayName:
          member.user?.displayName ||
          `${member.user?.firstName || ""} ${member.user?.lastName || ""}`.trim(),
        firstName: undefined,
        lastName: undefined,
      },
      image: member.image ? member.image : member.user?.profileImage || null,
    }));
  }),

  // Get single Vorstand member
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

  // Create Vorstand member
  createVorstandMember: adminProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.email().optional(),
        phone: z.string().optional(),
        position: z.string().min(1),
        description: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().default(0),
        userId: z.string().optional(),
        imageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // If userId provided, check if user already has a vorstand record
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

  // Update Vorstand member
  updateVorstandMember: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.email().optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
        description: z.string().optional(),
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

  // Delete Vorstand member
  deleteVorstandMember: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.vorstandMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ============================================================================
  // FÖRDERVEREIN MEMBERS
  // ============================================================================

  // Public: Get all Förderverein members
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
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return members;
  }),

  // Get Förderverein board members (leadership)
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
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return members;
  }),

  // Get Förderverein members by role
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

  // Get Förderverein grouped by role
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

    // Group by role category
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

  // Get single Förderverein member
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

  // Create Förderverein member
  createFoerdervereinMember: adminProcedure
    .input(
      z.object({
        name: z.string().optional(),
        email: z.email().optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
        role: z.enum(FoerdervereinRole).default("MITGLIED"),
        memberSince: z.date().optional(),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
        userId: z.string().optional(),
        imageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // If userId provided, check if user already has a förderverein record
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

  // Update Förderverein member
  updateFoerdervereinMember: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.email().optional(),
        phone: z.string().optional(),
        position: z.string().optional(),
        role: z.enum(FoerdervereinRole).optional(),
        memberSince: z.date().optional().nullable(),
        description: z.string().optional(),
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

  // Delete Förderverein member
  deleteFoerdervereinMember: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.foerdervereinMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ============================================================================
  // POSAUNENWARTE (Music Directors - LPW & RPW)
  // ============================================================================

  /**
   * Get all Posaunenwarte with their Bezirke
   * Returns LPW and RPW only (NOT Obleute!)
   */
  getPosaunenwarte: publicProcedure.query(async ({ ctx }) => {
    const posaunenwarte = await ctx.db.user.findMany({
      where: {
        role: { in: ["LPW", "RPW"] },
      },
      include: {
        profileImage: true,
        posaunenwarteResponsibilities: {
          include: {
            bezirk: true,
          },
          orderBy: {
            bezirk: { number: "asc" },
          },
        },
      },
      orderBy: [
        {
          role: "asc", // LPW first, then RPW
        },
        {
          displayName: "asc",
        },
      ],
    });

    // Format response
    return posaunenwarte.map((person) => ({
      id: person.id,
      name: person.displayName,
      email: person.email,
      role: person.role,
      phone: person.phone,
      displayRole: person.displayRole,
      bio: person.bio,
      profileImage: person.profileImage,
      bezirke: person.posaunenwarteResponsibilities.map((r) => ({
        ...r.bezirk,
        roleType: r.roleType,
        notes: r.notes,
        priority: r.priority,
      })),
    }));
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
      const posaunenwarte = await ctx.db.user.findMany({
        where: { role: input.role },
        include: {
          profileImage: true,
          posaunenwarteResponsibilities: {
            include: {
              bezirk: true,
            },
            orderBy: {
              bezirk: { number: "asc" },
            },
          },
        },
        orderBy: { displayName: "asc" },
      });

      return posaunenwarte.map((person) => ({
        id: person.id,
        name: person.displayName,
        email: person.email,
        role: person.role,
        phone: person.phone,
        displayRole: person.displayRole,
        bio: person.bio,
        profileImage: person.profileImage,
        bezirke: person.posaunenwarteResponsibilities.map((r) => ({
          ...r.bezirk,
          roleType: r.roleType,
          notes: r.notes,
        })),
      }));
    }),

  /**
   * Get Posaunenwarte for a specific Bezirk
   * Returns LPW (who covers all) and any RPW assigned to this Bezirk
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

      // Get the Bezirk
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

      // Get Posaunenwarte responsibilities for this Bezirk
      const responsibilities = await ctx.db.posaunenwartResponsibility.findMany(
        {
          where: { bezirkId: bezirk.id },
          include: {
            user: {
              include: {
                profileImage: true,
              },
            },
          },
          orderBy: { priority: "asc" },
        },
      );

      const posaunenwarte = responsibilities.map((r) => ({
        id: r.user.id,
        name: r.user.displayName,
        email: r.user.email,
        role: r.user.role,
        phone: r.user.phone,
        displayRole: r.user.displayRole,
        bio: r.user.bio,
        profileImage: r.user.profileImage,
        roleType: r.roleType,
        notes: r.notes,
        priority: r.priority,
      }));

      return {
        bezirk,
        posaunenwarte,
      };
    }),

  /**
   * Get complete contact info for a Bezirk
   * Includes: Posaunenwarte (LPW + RPW) AND the Bezirksobmann/obfrau
   */
  getBezirkContacts: publicProcedure
    .input(
      z.object({
        bezirkNumber: z.number().min(1).max(13),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get Bezirk
      const bezirk = await ctx.db.bezirk.findFirst({
        where: { number: input.bezirkNumber },
      });

      if (!bezirk) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bezirk not found",
        });
      }

      // Get Posaunenwarte for this Bezirk
      const posaunenwarteResponsibilities =
        await ctx.db.posaunenwartResponsibility.findMany({
          where: { bezirkId: bezirk.id },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
                displayRole: true,
                profileImage: {
                  select: {
                    url: true,
                    alt: true,
                  },
                },
              },
            },
          },
          orderBy: { priority: "asc" },
        });

      const lpw = posaunenwarteResponsibilities
        .filter((r) => r.roleType === "LPW")
        .map((r) => r.user)[0];

      const rpw = posaunenwarteResponsibilities
        .filter((r) => r.roleType === "RPW")
        .map((r) => r.user)[0];

      // Get Bezirksobmann/obfrau (separate from Posaunenwarte!)
      const obmann = await ctx.db.user.findFirst({
        where: {
          role: "OBLEUTE",
          bezirkId: bezirk.id,
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          obleuteRole: true,
          profileImage: {
            select: {
              url: true,
              alt: true,
            },
          },
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
        obmann, // This is NOT a Posaunenwart!
      };
    }),

  /**
   * Get Posaunenwarte organizational hierarchy
   * LPW -> RPWs with their Bezirke
   */
  getPosaunenwarteHierarchy: publicProcedure.query(async ({ ctx }) => {
    const posaunenwarte = await ctx.db.user.findMany({
      where: {
        role: { in: ["LPW", "RPW"] },
      },
      include: {
        profileImage: true,
        posaunenwarteResponsibilities: {
          include: {
            bezirk: true,
          },
          orderBy: {
            bezirk: { number: "asc" },
          },
        },
      },
      orderBy: [
        { role: "asc" }, // LPW first
        { displayName: "asc" },
      ],
    });

    const lpw = posaunenwarte
      .filter((p) => p.role === "LPW")
      .map((p) => ({
        ...p,
        bezirke: p.posaunenwarteResponsibilities.map((r) => r.bezirk),
      }));

    const rpw = posaunenwarte
      .filter((p) => p.role === "RPW")
      .map((p) => ({
        ...p,
        bezirke: p.posaunenwarteResponsibilities.map((r) => r.bezirk),
      }));

    return {
      lpw,
      rpw,
    };
  }),

  /**
   * Get Posaunenwarte coverage statistics
   */
  getPosaunenwarteStatistics: publicProcedure.query(async ({ ctx }) => {
    const [lpwCount, rpwCount, totalBezirke, responsibilities] =
      await Promise.all([
        ctx.db.user.count({ where: { role: "LPW" } }),
        ctx.db.user.count({ where: { role: "RPW" } }),
        ctx.db.bezirk.count(),
        ctx.db.posaunenwartResponsibility.findMany({
          include: {
            bezirk: true,
            user: true,
          },
        }),
      ]);

    // Count unique Bezirke covered by Posaunenwarte
    const bezirkeWithPosaunenwarte = new Set(
      responsibilities.map((r) => r.bezirkId),
    );

    return {
      lpwCount,
      rpwCount,
      totalBezirke,
      bezirkeWithPosaunenwarte: bezirkeWithPosaunenwarte.size,
      coveragePercentage: (bezirkeWithPosaunenwarte.size / totalBezirke) * 100,
      totalResponsibilities: responsibilities.length,
    };
  }),

  /**
   * Add a Bezirk to a Posaunenwart's responsibilities
   */
  addPosaunenwartResponsibility: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        bezirkId: z.string(),
        roleType: z.nativeEnum(PosaunenwartRoleType),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is LPW or RPW
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user || (user.role !== "LPW" && user.role !== "RPW")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User must have LPW or RPW role",
        });
      }

      // Check if already exists
      const existing = await ctx.db.posaunenwartResponsibility.findUnique({
        where: {
          userId_bezirkId: {
            userId: input.userId,
            bezirkId: input.bezirkId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Responsibility already exists",
        });
      }

      return await ctx.db.posaunenwartResponsibility.create({
        data: {
          userId: input.userId,
          bezirkId: input.bezirkId,
          roleType: input.roleType,
          notes: input.notes,
          priority: input.roleType === "LPW" ? 1 : 2,
        },
        include: {
          user: true,
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
        userId: z.string(),
        bezirkId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.posaunenwartResponsibility.delete({
        where: {
          userId_bezirkId: {
            userId: input.userId,
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
        userId: z.string(),
        bezirkId: z.string(),
        roleType: z.nativeEnum(PosaunenwartRoleType).optional(),
        notes: z.string().optional(),
        priority: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, bezirkId, ...updateData } = input;

      return await ctx.db.posaunenwartResponsibility.update({
        where: {
          userId_bezirkId: {
            userId,
            bezirkId,
          },
        },
        data: updateData,
        include: {
          user: true,
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
        userId: z.string(),
        bezirkIds: z.array(z.string()),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is RPW
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user || user.role !== "RPW") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User must have RPW role",
        });
      }

      // Delete existing responsibilities
      await ctx.db.posaunenwartResponsibility.deleteMany({
        where: { userId: input.userId },
      });

      // Create new responsibilities
      const created = await Promise.all(
        input.bezirkIds.map((bezirkId) =>
          ctx.db.posaunenwartResponsibility.create({
            data: {
              userId: input.userId,
              bezirkId,
              roleType: "RPW",
              notes: input.notes,
              priority: 2,
            },
            include: {
              bezirk: true,
            },
          }),
        ),
      );

      return {
        success: true,
        count: created.length,
        bezirke: created.map((r) => r.bezirk),
      };
    }),

  // ============================================================================
  // HISTORY EVENTS
  // ============================================================================

  // Public: Get all history events
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

  // Get single history event
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

  // Create history event
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

  // Update history event
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

  // Delete history event
  deleteHistoryEvent: lpwProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.historyEvent.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get history timeline (grouped by decade)
  getHistoryTimeline: publicProcedure.query(async ({ ctx }) => {
    const historyEvents = await ctx.db.historyEvent.findMany({
      include: {
        image: true,
      },
      orderBy: { year: "asc" },
    });

    // Group by decade
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
