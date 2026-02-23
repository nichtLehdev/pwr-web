import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { userHasPermission } from "@/server/api/helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * Export user data for GDPR compliance (Art. 20 DSGVO)
 * GET /api/users/[userId]/export
 *
 * Users can export their own data, admins can export any user's data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const isAdmin = await userHasPermission(
      session.user.id,
      PERMISSIONS.USERS_MANAGE,
    );

    // Users can only export their own data unless they're admin
    if (!isAdmin && userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only export your own data" },
        { status: 403 },
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        profileImage: true,
        bezirk: true,
        teamMember: true,
        posaunenratMember: true,
        vorstandMember: true,
        foerdervereinMember: true,
        posaunenwart: {
          include: {
            responsibilities: {
              include: { bezirk: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get course registrations
    const registrations = await db.courseRegistration.findMany({
      where: {
        OR: [{ registrantId: userId }, { registrantEmail: user.email }],
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
          },
        },
        participants: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get saved participants
    const savedParticipants = await db.savedParticipant.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Get newsletter subscription status
    const newsletterSubscriber = await db.newsletterSubscriber.findUnique({
      where: { email: user.email },
    });

    // Get sessions
    const sessions = await db.session.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Get page view stats (if user consented)
    const pageViews = await db.pageView.findMany({
      where: { userId },
      select: {
        id: true,
        path: true,
        section: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    // Get created content counts
    const [createdEventsCount, createdCoursesCount, createdPostsCount] =
      await Promise.all([
        db.event.count({ where: { createdById: userId } }),
        db.course.count({ where: { createdById: userId } }),
        db.post.count({ where: { createdById: userId } }),
      ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        street: user.street,
        zipCode: user.zipCode,
        city: user.city,
        birthDate: user.birthDate,
        bio: user.bio,
        preferences: user.preferences,
        districtRoleName: user.districtRoleName,
        bezirk: user.bezirk
          ? {
              id: user.bezirk.id,
              name: user.bezirk.name,
            }
          : null,
        profileImage: user.profileImage
          ? {
              id: user.profileImage.id,
              url: user.profileImage.url,
              filename: user.profileImage.filename,
            }
          : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      memberships: {
        teamMember: user.teamMember ? true : false,
        posaunenratMember: user.posaunenratMember ? true : false,
        vorstandMember: user.vorstandMember ? true : false,
        foerdervereinMember: user.foerdervereinMember ? true : false,
        posaunenwart: user.posaunenwart
          ? {
              id: user.posaunenwart.id,
              roleType: user.posaunenwart.roleType,
              bezirke: user.posaunenwart.responsibilities.map((r) => ({
                bezirkId: r.bezirkId,
                bezirkName: r.bezirk?.name,
              })),
            }
          : null,
      },
      courseRegistrations: registrations.map((reg) => ({
        id: reg.id,
        course: {
          id: reg.course.id,
          title: reg.course.title,
          startDate: reg.course.startDate,
          endDate: reg.course.endDate,
        },
        registrantFirstName: reg.registrantFirstName,
        registrantLastName: reg.registrantLastName,
        registrantEmail: reg.registrantEmail,
        registrantPhone: reg.registrantPhone,
        registrantStreet: reg.registrantStreet,
        registrantZipCode: reg.registrantZipCode,
        registrantCity: reg.registrantCity,
        useSeparateBilling: reg.useSeparateBilling,
        billingCompany: reg.billingCompany,
        billingFirstName: reg.billingFirstName,
        billingLastName: reg.billingLastName,
        billingStreet: reg.billingStreet,
        billingZipCode: reg.billingZipCode,
        billingCity: reg.billingCity,
        billingEmail: reg.billingEmail,
        totalPrice: reg.totalPrice,
        paymentStatus: reg.paymentStatus,
        registrationStatus: reg.registrationStatus,
        siblingDiscountApplied: reg.siblingDiscountApplied,
        invoiceGenerated: reg.invoiceGenerated,
        invoiceId: reg.invoiceId,
        invoiceDate: reg.invoiceDate,
        participants: reg.participants.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          birthDate: p.birthDate,
          city: p.city,
          instrument: p.instrument,
          customFields: p.customFields,
        })),
        createdAt: reg.createdAt,
        updatedAt: reg.updatedAt,
      })),
      savedParticipants: savedParticipants.map((sp) => ({
        id: sp.id,
        firstName: sp.firstName,
        lastName: sp.lastName,
        birthDate: sp.birthDate,
        city: sp.city,
        instrument: sp.instrument,
        customFields: sp.customFields,
        createdAt: sp.createdAt,
        updatedAt: sp.updatedAt,
      })),
      newsletterSubscription: newsletterSubscriber
        ? {
            email: newsletterSubscriber.email,
            name: newsletterSubscriber.name,
            isActive: newsletterSubscriber.isActive,
            subscribedAt: newsletterSubscriber.subscribedAt,
            unsubscribedAt: newsletterSubscriber.unsubscribedAt,
          }
        : null,
      sessions: sessions,
      pageViews: pageViews,
      contentCounts: {
        createdEvents: createdEventsCount,
        createdCourses: createdCoursesCount,
        createdPosts: createdPostsCount,
      },
    };

    return NextResponse.json(exportData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="user-data-export-${userId}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("User data export error:", error);
    return NextResponse.json(
      { error: "Failed to export user data" },
      { status: 500 },
    );
  }
}
