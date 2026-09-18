import type { PrismaClient, Prisma } from "~/generated/prisma/client";
import {
  ContentStatus,
  CourseCollaboratorRole,
  type CustomFieldType,
} from "~/generated/prisma/enums";

type Db = PrismaClient | Prisma.TransactionClient;

const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * An approved course makes its fields public, so its organizers' matching (name + type) private
 * templates join the shared library. Call after any transition to APPROVED; idempotent.
 */
export async function promoteCustomFieldTemplatesForCourses(
  db: Db,
  courseIds: string[],
): Promise<void> {
  if (courseIds.length === 0) return;

  const courses = await db.course.findMany({
    where: { id: { in: courseIds }, status: ContentStatus.APPROVED },
    select: {
      createdById: true,
      customFields: { select: { fieldName: true, fieldType: true } },
      collaborators: {
        where: { role: CourseCollaboratorRole.ORGANIZER },
        select: { userId: true },
      },
    },
  });
  if (courses.every((c) => c.customFields.length === 0)) return;

  const existingGlobals = await db.courseCustomFieldTemplate.findMany({
    where: { isGlobal: true },
    select: { fieldName: true },
  });
  const globalNames = new Set(
    existingGlobals.map((t) => normalizeName(t.fieldName)),
  );

  for (const course of courses) {
    const ownerIds = [
      course.createdById,
      ...course.collaborators.map((c) => c.userId),
    ].filter((id): id is string => Boolean(id));
    if (ownerIds.length === 0) continue;

    for (const field of course.customFields) {
      const key = normalizeName(field.fieldName);
      if (globalNames.has(key)) continue;

      const candidate = await db.courseCustomFieldTemplate.findFirst({
        where: {
          isGlobal: false,
          createdById: { in: ownerIds },
          fieldName: { equals: field.fieldName.trim(), mode: "insensitive" },
          fieldType: field.fieldType,
        },
        orderBy: { createdAt: "asc" },
      });
      if (!candidate) continue;

      await db.courseCustomFieldTemplate.update({
        where: { id: candidate.id },
        data: { isGlobal: true },
      });
      globalNames.add(key);
    }
  }
}

/** A new template starts global if the creator already has an approved course with this field. */
export async function hasApprovedCourseWithField(
  db: Db,
  userId: string,
  fieldName: string,
  fieldType: CustomFieldType,
): Promise<boolean> {
  const match = await db.courseCustomField.findFirst({
    where: {
      fieldName: { equals: fieldName.trim(), mode: "insensitive" },
      fieldType,
      course: {
        status: ContentStatus.APPROVED,
        OR: [
          { createdById: userId },
          {
            collaborators: {
              some: { userId, role: CourseCollaboratorRole.ORGANIZER },
            },
          },
        ],
      },
    },
    select: { id: true },
  });
  return Boolean(match);
}
