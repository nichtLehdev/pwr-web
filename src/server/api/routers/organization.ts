import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { permissionProcedure } from "../middleware/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  PosaunenratRole,
  ContactType,
  HistoryCategory,
  FoerdervereinRole,
  PosaunenwartRoleType,
} from "~/generated/prisma/client";
import {
  personUserSelect,
  posaunenwartInclude,
  bezirkPersonInclude,
  toBezirkPerson,
  toPosaunenwart,
  teamMemberInclude,
  toTeamMember,
  withPerson,
  parseResponsibilities,
  parseSocials,
} from "../helpers/people";
import { lenientPhoneSchema } from "@/lib/phone-number";

export const organizationRouter = createTRPCRouter({
  getPosaunenrat: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.posaunenratMember.findMany({
      include: { image: true, user: { select: personUserSelect } },
      orderBy: { sortOrder: "asc" },
    });

    return members.map(withPerson);
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
        include: { image: true, user: { select: personUserSelect } },
        orderBy: { sortOrder: "asc" },
      });

      return members.map(withPerson);
    }),

  getPosaunenratGrouped: publicProcedure.query(async ({ ctx }) => {
    const members = (
      await ctx.db.posaunenratMember.findMany({
        include: { image: true, user: { select: personUserSelect } },
        orderBy: { sortOrder: "asc" },
      })
    ).map(withPerson);

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
        include: { image: true, user: { select: personUserSelect } },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Posaunenratsmitglied nicht gefunden",
        });
      }

      return withPerson(member);
    }),

  createPosaunenratMember: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
  )
    .input(
      z.object({
        name: z.string().max(100).optional(),
        email: z.email().optional(),
        phone: lenientPhoneSchema.optional(),
        bio: z.string().max(2000).optional(),
        imageId: z.string().optional(),
        role: z.enum(PosaunenratRole),
        sortOrder: z.number().default(0),
        userId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId) {
        const existing = await ctx.db.posaunenratMember.findUnique({
          where: { userId: input.userId },
        });
        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dieser Benutzer ist bereits im Posaunenrat angelegt.",
          });
        }
      }

      const member = await ctx.db.posaunenratMember.create({
        data: input,
        include: { image: true, user: { select: personUserSelect } },
      });

      return withPerson(member);
    }),

  updatePosaunenratMember: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
  )
    .input(
      z.object({
        id: z.string(),
        name: z.string().max(100).optional().nullable(),
        email: z.email().optional().nullable(),
        phone: lenientPhoneSchema.optional().nullable(),
        bio: z.string().max(2000).optional().nullable(),
        imageId: z.string().optional().nullable(),
        role: z.enum(PosaunenratRole).optional(),
        sortOrder: z.number().optional(),
        userId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const member = await ctx.db.posaunenratMember.update({
        where: { id },
        data: updateData,
        include: { image: true, user: { select: personUserSelect } },
      });

      return withPerson(member);
    }),

  deletePosaunenratMember: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENRAT,
  )
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.posaunenratMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getTeam: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.teamMember.findMany({
      include: teamMemberInclude,
      orderBy: { sortOrder: "asc" },
    });

    return members.map(toTeamMember);
  }),

  getTeamByContactType: publicProcedure
    .input(z.object({ contactType: z.enum(ContactType) }))
    .query(async ({ ctx, input }) => {
      const members = await ctx.db.teamMember.findMany({
        where: { contactType: input.contactType },
        include: teamMemberInclude,
        orderBy: { sortOrder: "asc" },
      });

      return members.map(toTeamMember);
    }),

  getTeamGrouped: publicProcedure.query(async ({ ctx }) => {
    const members = (
      await ctx.db.teamMember.findMany({
        include: teamMemberInclude,
        orderBy: { sortOrder: "asc" },
      })
    ).map(toTeamMember);

    return {
      geschaeftsstelle: members.filter(
        (m) => m.contactType === "GESCHAEFTSSTELLE",
      ),
      internetTeam: members.filter((m) => m.contactType === "INTERNET_TEAM"),
      other: members.filter((m) => !m.contactType),
    };
  }),

  createTeamMember: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_TEAM)
    .input(
      z.object({
        userId: z.string().optional(),
        name: z.string().max(100).optional(),
        email: z.email().optional(),
        phone: lenientPhoneSchema.optional(),
        bio: z.string().max(2000).optional(),
        imageId: z.string().optional(),
        role: z.string().max(100).optional(),
        responsibilities: z.string().max(1000).optional(),
        socials: z.string().max(500).optional(),
        contactType: z.enum(ContactType).optional(),
        sortOrder: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.userId && !input.name?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bitte einen Benutzer verknüpfen oder einen Namen eingeben.",
        });
      }

      if (input.userId) {
        const existing = await ctx.db.teamMember.findUnique({
          where: { userId: input.userId },
        });

        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already has a team member record",
          });
        }
      }

      const member = await ctx.db.teamMember.create({
        data: {
          userId: input.userId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          bio: input.bio,
          imageId: input.imageId,
          role: input.role,
          responsibilities: parseResponsibilities(input.responsibilities),
          socials: parseSocials(input.socials),
          contactType: input.contactType,
          sortOrder: input.sortOrder,
        },
        include: teamMemberInclude,
      });

      return toTeamMember(member);
    }),

  updateTeamMember: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_TEAM)
    .input(
      z.object({
        id: z.string(),
        userId: z.string().optional().nullable(),
        name: z.string().max(100).optional().nullable(),
        email: z.email().optional().nullable(),
        phone: lenientPhoneSchema.optional().nullable(),
        bio: z.string().max(2000).optional().nullable(),
        imageId: z.string().optional().nullable(),
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

      if (input.userId) {
        const existing = await ctx.db.teamMember.findUnique({
          where: { userId: input.userId },
        });

        if (existing && existing.id !== id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already has a team member record",
          });
        }
      }

      const member = await ctx.db.teamMember.update({
        where: { id },
        data: {
          ...rest,
          responsibilities: parseResponsibilities(responsibilitiesStr),
          socials: parseSocials(socialsStr),
        },
        include: teamMemberInclude,
      });

      return toTeamMember(member);
    }),

  getTeamMember: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.teamMember.findUnique({
        where: { id: input.id },
        include: teamMemberInclude,
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      return toTeamMember(member);
    }),

  deleteTeamMember: permissionProcedure(PERMISSIONS.ORGANIZATION_MANAGE_TEAM)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.teamMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getVorstand: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.vorstandMember.findMany({
      include: { image: true, user: { select: personUserSelect } },
      orderBy: { sortOrder: "asc" },
    });

    return members.map(withPerson);
  }),

  getVorstandMember: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.vorstandMember.findUnique({
        where: { id: input.id },
        include: { image: true, user: { select: personUserSelect } },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vorstand member not found",
        });
      }

      return withPerson(member);
    }),

  createVorstandMember: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
  )
    .input(
      z.object({
        name: z.string().max(100).optional(),
        email: z.email().optional(),
        phone: lenientPhoneSchema.optional(),
        position: z.string().min(1).max(100),
        description: z.string().max(1000).optional(),
        color: z.string().optional(),
        sortOrder: z.number().default(0),
        userId: z.string().optional(),
        imageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.userId && !input.name?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bitte einen Benutzer verknüpfen oder einen Namen eingeben.",
        });
      }

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

      const member = await ctx.db.vorstandMember.create({
        data: input,
        include: { image: true, user: { select: personUserSelect } },
      });

      return withPerson(member);
    }),

  updateVorstandMember: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
  )
    .input(
      z.object({
        id: z.string(),
        name: z.string().max(100).optional().nullable(),
        email: z.email().optional().nullable(),
        phone: lenientPhoneSchema.optional().nullable(),
        position: z.string().max(100).optional(),
        description: z.string().max(1000).optional().nullable(),
        color: z.string().optional().nullable(),
        sortOrder: z.number().optional(),
        userId: z.string().optional().nullable(),
        imageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      if (input.userId) {
        const existing = await ctx.db.vorstandMember.findUnique({
          where: { userId: input.userId },
        });

        if (existing && existing.id !== id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already has a vorstand member record",
          });
        }
      }

      const member = await ctx.db.vorstandMember.update({
        where: { id },
        data: updateData,
        include: { image: true, user: { select: personUserSelect } },
      });

      return withPerson(member);
    }),

  deleteVorstandMember: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_VORSTAND,
  )
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.vorstandMember.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getFoerderverein: publicProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.foerdervereinMember.findMany({
      include: { image: true, user: { select: personUserSelect } },
      orderBy: { sortOrder: "asc" },
    });

    return members.map(withPerson);
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
      include: { image: true, user: { select: personUserSelect } },
      orderBy: { sortOrder: "asc" },
    });

    return members.map(withPerson);
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
        include: { image: true, user: { select: personUserSelect } },
        orderBy: { sortOrder: "asc" },
      });

      return members.map(withPerson);
    }),

  getFoerdervereinGrouped: publicProcedure.query(async ({ ctx }) => {
    const members = (
      await ctx.db.foerdervereinMember.findMany({
        include: { image: true, user: { select: personUserSelect } },
        orderBy: { sortOrder: "asc" },
      })
    ).map(withPerson);

    return {
      vorstand: members.filter((m) =>
        [
          "VORSITZENDER",
          "STELLVERTRETER",
          "SCHATZMEISTER",
          "SCHRIFTFUEHRER",
        ].includes(m.role),
      ),
      beisitzer: members.filter((m) => m.role === "BEISITZER"),
      mitglieder: members.filter((m) => m.role === "MITGLIED"),
    };
  }),

  getFoerdervereinMember: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.foerdervereinMember.findUnique({
        where: { id: input.id },
        include: { image: true, user: { select: personUserSelect } },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Förderverein member not found",
        });
      }

      return withPerson(member);
    }),

  createFoerdervereinMember: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN,
  )
    .input(
      z.object({
        name: z.string().max(100).optional(),
        email: z.email().optional(),
        phone: lenientPhoneSchema.optional(),
        city: z.string().max(100).optional(),
        position: z.string().max(100).optional(),
        role: z.enum(FoerdervereinRole).default("MITGLIED"),
        memberSince: z
          .date()
          .refine((date) => date <= new Date(), {
            message: "Datum kann nicht in der Zukunft liegen",
          })
          .optional(),
        description: z.string().max(1000).optional(),
        sortOrder: z.number().default(0),
        userId: z.string().optional(),
        imageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.userId && !input.name?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bitte einen Benutzer verknüpfen oder einen Namen eingeben.",
        });
      }

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

      const member = await ctx.db.foerdervereinMember.create({
        data: input,
        include: { image: true, user: { select: personUserSelect } },
      });

      return withPerson(member);
    }),

  updateFoerdervereinMember: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN,
  )
    .input(
      z.object({
        id: z.string(),
        name: z.string().max(100).optional().nullable(),
        email: z.email().optional().nullable(),
        phone: lenientPhoneSchema.optional().nullable(),
        city: z.string().max(100).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        role: z.enum(FoerdervereinRole).optional(),
        memberSince: z
          .date()
          .refine((date) => !date || date <= new Date(), {
            message: "Datum kann nicht in der Zukunft liegen",
          })
          .optional()
          .nullable(),
        description: z.string().max(1000).optional().nullable(),
        sortOrder: z.number().optional(),
        userId: z.string().optional().nullable(),
        imageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      if (input.userId) {
        const existing = await ctx.db.foerdervereinMember.findUnique({
          where: { userId: input.userId },
        });

        if (existing && existing.id !== id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User already has a förderverein member record",
          });
        }
      }

      const member = await ctx.db.foerdervereinMember.update({
        where: { id },
        data: updateData,
        include: { image: true, user: { select: personUserSelect } },
      });

      return withPerson(member);
    }),

  deleteFoerdervereinMember: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_FOERDERVEREIN,
  )
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
      include: posaunenwartInclude,
      orderBy: [
        { roleType: "asc" },
        { sortOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    return list.map(toPosaunenwart);
  }),

  /**
   * Get one Posaunenwart by id (for dashboard detail/edit)
   */
  getPosaunenwart: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const pw = await ctx.db.posaunenwart.findUnique({
        where: { id: input.id },
        include: posaunenwartInclude,
      });
      if (!pw) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Posaunenwart nicht gefunden",
        });
      }

      return {
        ...toPosaunenwart(pw),
        imageId: pw.imageId,
        imageUrl: pw.image?.url ?? null,
        // Rohwerte für das Formular: was am Datensatz steht, nicht das Ergebnis
        // der Auflösung gegen den verknüpften Benutzer.
        storedName: pw.name,
        storedEmail: pw.email,
        storedPhone: pw.phone,
        storedBio: pw.bio,
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
        include: posaunenwartInclude,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      return list.map(toPosaunenwart);
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
          include: { posaunenwart: { include: posaunenwartInclude } },
          orderBy: { priority: "asc" },
        },
      );

      const posaunenwarte = responsibilities.map((r) => ({
        ...toPosaunenwart(r.posaunenwart),
        notes: r.notes,
        priority: r.priority,
      }));

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
          include: { posaunenwart: { include: posaunenwartInclude } },
          orderBy: { priority: "asc" },
        },
      );

      const toContact = (r: (typeof responsibilities)[0]) => {
        const pw = toPosaunenwart(r.posaunenwart);
        return {
          id: pw.userId ?? pw.id,
          displayName: pw.name,
          email: pw.email,
          districtRoleName: pw.districtRoleName,
          profileImage: pw.profileImage
            ? { url: pw.profileImage.url, alt: pw.profileImage.alt }
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

      // Obleute liegen als BezirkPerson vor (mit oder ohne Benutzerkonto).
      const obleute = await ctx.db.bezirkPerson.findMany({
        where: { bezirkId: bezirk.id },
        include: bezirkPersonInclude,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      const obmannRecord = obleute.find(
        (o) => !o.roleName.toLowerCase().includes("stell"),
      );
      const obmann = obmannRecord ? toBezirkPerson(obmannRecord) : null;

      return {
        bezirk: {
          number: bezirk.number,
          name: bezirk.name,
          shortName: bezirk.shortName,
        },
        lpw,
        rpw,
        obmann: obmann
          ? {
              id: obmann.userId ?? obmann.id,
              displayName: obmann.name,
              email: obmann.email,
              districtRoleName: obmann.roleName,
              profileImage: obmann.image
                ? { url: obmann.image.url, alt: obmann.image.alt }
                : null,
            }
          : null,
      };
    }),

  /**
   * Get Posaunenwarte organizational hierarchy
   */
  getPosaunenwarteHierarchy: publicProcedure.query(async ({ ctx }) => {
    const list = await ctx.db.posaunenwart.findMany({
      include: posaunenwartInclude,
      orderBy: [{ roleType: "asc" }, { sortOrder: "asc" }],
    });

    const byName = (a: { name: string | null }, b: { name: string | null }) =>
      (a.name ?? "").localeCompare(b.name ?? "");

    return {
      lpw: list
        .filter((p) => p.roleType === "LPW")
        .map(toPosaunenwart)
        .sort(byName),
      rpw: list
        .filter((p) => p.roleType === "RPW")
        .map(toPosaunenwart)
        .sort(byName),
    };
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

  createPosaunenwart: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  )
    .input(
      z.object({
        userId: z.string().optional(),
        name: z.string().max(100).optional(),
        email: z.email().optional(),
        phone: lenientPhoneSchema.optional(),
        bio: z.string().max(2000).optional(),
        roleLabel: z.string().max(100).optional(),
        roleType: z.enum(PosaunenwartRoleType),
        sortOrder: z.number().default(0),
        imageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.userId && !input.name?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bitte einen Benutzer verknüpfen oder einen Namen eingeben.",
        });
      }

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

      const pw = await ctx.db.posaunenwart.create({
        data: input,
        include: posaunenwartInclude,
      });

      return toPosaunenwart(pw);
    }),

  updatePosaunenwart: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  )
    .input(
      z.object({
        id: z.string(),
        userId: z.string().optional().nullable(),
        name: z.string().max(100).optional().nullable(),
        email: z.email().optional().nullable(),
        phone: lenientPhoneSchema.optional().nullable(),
        bio: z.string().max(2000).optional().nullable(),
        roleLabel: z.string().max(100).optional().nullable(),
        roleType: z.enum(PosaunenwartRoleType).optional(),
        sortOrder: z.number().optional(),
        imageId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      if (input.userId) {
        const existing = await ctx.db.posaunenwart.findUnique({
          where: { userId: input.userId },
        });
        if (existing && existing.id !== id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Dieser Benutzer ist bereits als Posaunenwart angelegt.",
          });
        }
      }

      const pw = await ctx.db.posaunenwart.update({
        where: { id },
        data,
        include: posaunenwartInclude,
      });

      return toPosaunenwart(pw);
    }),

  deletePosaunenwart: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  )
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.posaunenwart.delete({ where: { id: input.id } });
      return { success: true };
    }),

  /**
   * Add a Bezirk to a Posaunenwart's responsibilities
   */
  addPosaunenwartResponsibility: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  )
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
  removePosaunenwartResponsibility: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  )
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
  updatePosaunenwartResponsibility: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  )
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
  setRpwBezirke: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_POSAUNENWARTE,
  )
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

  createHistoryEvent: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_HISTORY,
  )
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

  updateHistoryEvent: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_HISTORY,
  )
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

  deleteHistoryEvent: permissionProcedure(
    PERMISSIONS.ORGANIZATION_MANAGE_HISTORY,
  )
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
