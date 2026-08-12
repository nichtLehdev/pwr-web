"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { CourseCollaboratorRole } from "~/generated/prisma/enums";
import { isRegistrationDeadlinePassed } from "@/lib/registration-deadline";
import { isExternalCourse } from "@/lib/course-external";
import CourseRegistrationForm from "@/app/_components/events/course-registration-form";

/**
 * Dashboard-only registration entry. The public form refuses sign-ups once
 * registration is closed or the deadline has passed; organizers still need to
 * add the late phone call or the paper form, and this page is that path.
 */
export default function NewCourseRegistrationPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const utils = api.useUtils();

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  const { data: course, isLoading: courseLoading } =
    api.courses.getById.useQuery(
      { id: courseId },
      { enabled: !!courseId && !!session?.user },
    );

  const { data: spots } = api.courses.getAvailableSlots.useQuery(
    { id: courseId },
    { enabled: !!courseId && !!session?.user },
  );

  const participantsUrl = `/dashboard/courses/${courseId}/participants`;

  if (sessionLoading || permissionsLoading || courseLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !course) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Kurs nicht gefunden
          </h1>
          <Link
            href="/dashboard/courses"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // Mirrors the server rule in registrations.createByStaff: course creator,
  // course team members, or the global registration-management permission.
  const isOwner = course.createdById === session.user.id;
  const hasCourseTeamAccess =
    course.viewerCollaboratorRole === CourseCollaboratorRole.STAFF ||
    course.viewerCollaboratorRole === CourseCollaboratorRole.ORGANIZER;
  const canAddRegistrations =
    isOwner ||
    hasCourseTeamAccess ||
    hasPermission(PERMISSIONS.COURSES_MANAGE_REGISTRATIONS);

  if (!canAddRegistrations) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Keine Berechtigung
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Du hast keine Berechtigung, Anmeldungen für diesen Kurs zu erfassen.
          </p>
          <Link
            href={participantsUrl}
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Teilnehmerverwaltung
          </Link>
        </div>
      </div>
    );
  }

  if (isExternalCourse(course)) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Externe Anmeldung
          </h1>
          <p className="dark:text-dark-muted mt-2 max-w-md text-gray-600">
            Dieser Kurs wird über einen externen Anbieter angemeldet.
            Anmeldungen können deshalb nicht hier erfasst werden.
          </p>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zum Kurs
          </Link>
        </div>
      </div>
    );
  }

  const deadlinePassed = isRegistrationDeadlinePassed(
    course.registrationDeadline,
  );

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <nav className="mb-4 text-sm">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href="/dashboard/courses"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Kurse
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/courses/${courseId}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary max-w-[150px] truncate text-gray-500"
              >
                {course.title}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={participantsUrl}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Teilnehmer
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">
              Neue Anmeldung
            </li>
          </ol>
        </nav>

        {(deadlinePassed || !course.registrationOpen) && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {deadlinePassed
                ? "Der Anmeldeschluss dieses Kurses ist vorbei."
                : "Die Anmeldung für diesen Kurs ist geschlossen."}{" "}
              Als Team kannst du hier trotzdem eine Anmeldung nachtragen.
            </p>
          </div>
        )}
      </div>

      <CourseRegistrationForm
        variant="page"
        staffMode
        course={course}
        currentUser={null}
        isWaitlist={spots?.isFull ?? false}
        availableSlots={spots?.availableSlots}
        onClose={() => router.push(participantsUrl)}
        onSuccess={() => {
          void utils.courses.getRegistrations.invalidate({ courseId });
          void utils.courses.getAvailableSlots.invalidate({ id: courseId });
          router.push(participantsUrl);
        }}
      />
    </main>
  );
}
