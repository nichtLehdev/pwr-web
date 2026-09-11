import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { auth } from "@/server/better-auth";
import { resolveUserPermissions } from "@/server/api/helpers/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { buildCourseParticipantsXlsx } from "@/server/utils/course-exports";
import { attachmentHeaders } from "@/server/utils/xlsx";

/**
 * Teilnehmerliste eines Kurses als .xlsx.
 *
 * POST statt GET, weil die Oberfläche ihre Filterung mitschickt: exportiert
 * wird, was die Liste gerade zeigt. Übergeben werden nur Anmelde-IDs — die
 * Daten selbst holt der Server, damit kein Client Inhalte in den Export
 * schreiben kann.
 *
 * Zugriffsregel wie `courses.getRegistrations`.
 */
const bodySchema = z.object({
  registrationIds: z.array(z.string()).max(5000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: courseId } = await params;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      createdById: true,
      customFields: { orderBy: { sortOrder: "asc" } },
      priceOptions: {
        select: { id: true, label: true, description: true, price: true },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const [permissions, collaborator] = await Promise.all([
    resolveUserPermissions(userId),
    db.courseCollaborator.findUnique({
      where: { courseId_userId: { courseId, userId } },
      select: { id: true },
    }),
  ]);

  const hasGlobalAccess =
    permissions.has(PERMISSIONS.COURSES_VIEW) ||
    permissions.has(PERMISSIONS.COURSES_APPROVE) ||
    permissions.has(PERMISSIONS.COURSES_MANAGE_REGISTRATIONS);

  if (course.createdById !== userId && !hasGlobalAccess && !collaborator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registrationIds = parsed.data.registrationIds;
  const registrations = await db.courseRegistration.findMany({
    where: {
      courseId,
      ...(registrationIds ? { id: { in: registrationIds } } : {}),
    },
    include: { participants: true },
    orderBy: { createdAt: "desc" },
  });

  const { buffer, filename } = await buildCourseParticipantsXlsx({
    course,
    registrations,
    // Die Oberfläche hat schon gefiltert; stornierte Anmeldungen hier noch
    // einmal zu entfernen würde ihre Auswahl stillschweigend beschneiden.
    options: { excludeCancelled: false, includeBirthDate: true },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: attachmentHeaders(filename),
  });
}
