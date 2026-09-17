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
import { DashboardPage } from "@/app/_components/dashboard";

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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !course) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="condensed text-ink dark:text-night-text text-xl font-bold">
            Kurs nicht gefunden
          </h1>
          <Link
            href="/dashboard/courses"
            className="text-primary-ink dark:text-primary mt-4 inline-block font-semibold underline-offset-4 hover:underline"
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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="condensed text-ink dark:text-night-text text-xl font-bold">
            Keine Berechtigung
          </h1>
          <p className="text-dark dark:text-night-muted mt-2">
            Du hast keine Berechtigung, Anmeldungen für diesen Kurs zu erfassen.
          </p>
          <Link
            href={participantsUrl}
            className="text-primary-ink dark:text-primary mt-4 inline-block font-semibold underline-offset-4 hover:underline"
          >
            Zurück zur Teilnehmerverwaltung
          </Link>
        </div>
      </div>
    );
  }

  if (isExternalCourse(course)) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="condensed text-ink dark:text-night-text text-xl font-bold">
            Externe Anmeldung
          </h1>
          <p className="text-dark dark:text-night-muted mt-2 max-w-md">
            Dieser Kurs wird über einen externen Anbieter angemeldet.
            Anmeldungen können deshalb nicht hier erfasst werden.
          </p>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="text-primary-ink dark:text-primary mt-4 inline-block font-semibold underline-offset-4 hover:underline"
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
    <main className="programm font-programm bg-paper text-ink dark:bg-night dark:text-night-text min-h-screen">
      <div className="container mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
        <nav className="mb-4 text-sm">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link
                href="/dashboard"
                className="semi-condensed text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text font-semibold underline-offset-4 hover:underline"
              >
                Dashboard
              </Link>
            </li>
            <li aria-hidden className="text-dark dark:text-night-muted">
              /
            </li>
            <li>
              <Link
                href="/dashboard/courses"
                className="semi-condensed text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text font-semibold underline-offset-4 hover:underline"
              >
                Kurse
              </Link>
            </li>
            <li aria-hidden className="text-dark dark:text-night-muted">
              /
            </li>
            <li>
              <Link
                href={`/dashboard/courses/${courseId}`}
                className="semi-condensed text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text max-w-[150px] truncate font-semibold underline-offset-4 hover:underline"
              >
                {course.title}
              </Link>
            </li>
            <li aria-hidden className="text-dark dark:text-night-muted">
              /
            </li>
            <li>
              <Link
                href={participantsUrl}
                className="semi-condensed text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text font-semibold underline-offset-4 hover:underline"
              >
                Teilnehmer
              </Link>
            </li>
            <li aria-hidden className="text-dark dark:text-night-muted">
              /
            </li>
            <li
              aria-current="page"
              className="semi-condensed text-ink dark:text-night-text font-semibold"
            >
              Neue Anmeldung
            </li>
          </ol>
        </nav>

        {(deadlinePassed || !course.registrationOpen) && (
          // Eckig auf Haarlinie statt blauem Kasten: Der Hinweis erklärt eine
          // Ausnahme, er warnt nicht — eine eigene Signalfarbe braucht er
          // dafür nicht.
          <div className="border-ink dark:border-night-text mb-4 border-l-2 py-1 pl-4">
            <p className="text-dark dark:text-night-muted text-sm">
              {deadlinePassed
                ? "Der Anmeldeschluss dieses Kurses ist vorbei."
                : "Die Anmeldung für diesen Kurs ist geschlossen."}{" "}
              Als Team kannst du hier trotzdem eine Anmeldung nachtragen.
            </p>
          </div>
        )}
      </div>

      <CourseRegistrationForm
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
