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
import { Note } from "@/app/_components/programmheft/note";

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

  // Die tatsächlichen Plätze, nicht die öffentlichen: Die Öffentlichkeit sieht
  // nur die, die keine Wartende nutzen könnte, das Team darf mit „Bestätigt“
  // aber alle bewusst vergeben. Ohne Berechtigung antwortet der Server mit
  // FORBIDDEN — dann greift die Seite unten ohnehin.
  const { data: overview } = api.registrations.getWaitlistOverview.useQuery(
    { courseId },
    { enabled: !!courseId && !!session?.user, retry: false, staleTime: 0 },
  );
  const spots = overview?.seats;

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
  // Nur wenn Wartende freie Plätze für sich reservieren, weicht
  // „Automatisch“ von dem ab, was das Formular aus den tatsächlichen Plätzen
  // ankündigt.
  const reservedForWaitlist = overview
    ? overview.seats.availableSlots -
      overview.seatsForNewRegistrations.availableSlots
    : 0;
  const waitlistFirst =
    !!overview &&
    Number.isFinite(reservedForWaitlist) &&
    reservedForWaitlist > 0;

  return (
    // Die geteilte Hülle statt eines handgebauten Rahmens: Sie liefert
    // Brotkrumen, Titel und Satzspiegel, die hier zuvor als fünfzig Zeilen
    // eigenes JSX standen. Jede Geschwisterseite nutzt sie bereits.
    <DashboardPage
      title="Neue Anmeldung"
      description={course.title}
      maxWidth="4xl"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kurse", href: "/dashboard/courses" },
        { label: course.title, href: `/dashboard/courses/${courseId}` },
        { label: "Teilnehmer", href: participantsUrl },
        { label: "Neue Anmeldung" },
      ]}
    >
      {(deadlinePassed || !course.registrationOpen) && (
        // Eckig auf Haarlinie statt blauem Kasten: Der Hinweis erklärt eine
        // Ausnahme, er warnt nicht — eine eigene Signalfarbe braucht er
        // dafür nicht.
        <div className="border-ink dark:border-night-text mb-6 border-l-2 py-1 pl-4">
          <p className="text-dark dark:text-night-muted text-sm">
            {deadlinePassed
              ? "Der Anmeldeschluss dieses Kurses ist vorbei."
              : "Die Anmeldung für diesen Kurs ist geschlossen."}{" "}
            Als Team kannst du hier trotzdem eine Anmeldung nachtragen.
          </p>
        </div>
      )}

      {waitlistFirst && (
        // Das Formular kennt den Vorrang der Warteliste nicht und kündigt
        // „Automatisch“ aus den tatsächlichen Plätzen an; der Server gibt
        // Neuen nur die übrigen. Der Hinweis sagt es vorher.
        <Note tone="important" className="mb-6">
          <p>
            {reservedForWaitlist === 1
              ? "1 der freien Plätze steht"
              : `${reservedForWaitlist} der freien Plätze stehen`}{" "}
            Anmeldungen auf der Warteliste zu. „Automatisch“ und „Aufteilen“
            nutzen nur die übrigen – reichen sie nicht, kommt diese Anmeldung
            auf die Warteliste. Mit dem Status „Bestätigt“ vergibst du auch die
            vorbehaltenen Plätze.
          </p>
        </Note>
      )}

      <CourseRegistrationForm
        staffMode
        course={course}
        currentUser={null}
        isWaitlist={spots?.isFull ?? false}
        availableSlots={spots?.availableSlots}
        capacityByPriceOption={spots?.capacityByPriceOption}
        onClose={() => router.push(participantsUrl)}
        onSuccess={() => {
          void utils.courses.getRegistrations.invalidate({ courseId });
          void utils.courses.getAvailableSlots.invalidate({ id: courseId });
          void utils.registrations.getWaitlistOverview.invalidate({
            courseId,
          });
          router.push(participantsUrl);
        }}
      />
    </DashboardPage>
  );
}
