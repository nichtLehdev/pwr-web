import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { api } from "@/trpc/server";
import CourseRegistrationPage from "@/app/_components/events/course-registration-page";
import PublicPage from "@/app/_components/general/public-page";
import { Note } from "@/app/_components/programmheft/note";
import type { RouterOutputs } from "@/trpc/react";
import { isExternalCourse } from "@/lib/course-external";
import { isRegistrationDeadlinePassed } from "@/lib/registration-deadline";
import {
  LATE_REGISTRATION_PARAM,
  lateRegistrationLinkUnusableMessage,
} from "@/lib/late-registration-link";
import { coursePath, courseRegistrationPath, isUuid } from "@/lib/slug";

type Course = NonNullable<RouterOutputs["courses"]["getById"]>;
type Spots = RouterOutputs["courses"]["getAvailableSlots"];

/**
 * Mit gültigem Nachmeldelink entfallen die Zeit-Sperren (geschlossen, noch nicht
 * geöffnet, Frist vorbei); Kursende und volle Plätze ohne Warteliste gelten weiter.
 */
function canRegisterForCourse(
  course: Course,
  spots: Spots,
  hasLateRegistrationLink: boolean,
): boolean {
  const now = new Date();
  const endDate = new Date(course.endDate);
  const registrationDeadline = course.registrationDeadline
    ? new Date(course.registrationDeadline)
    : null;
  const registrationOpensAt = course.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  const isPast = endDate < now;
  const isDeadlinePassed = isRegistrationDeadlinePassed(
    registrationDeadline,
    now,
  );
  const isRegistrationNotOpenYet =
    registrationOpensAt !== null && registrationOpensAt > now;

  return (
    (hasLateRegistrationLink ||
      (course.registrationOpen &&
        !isDeadlinePassed &&
        !isRegistrationNotOpenYet)) &&
    !isPast &&
    (!spots.isFull || course.allowWaitingList)
  );
}

interface PageProps {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CourseAnmeldenPage({
  params,
  searchParams,
}: PageProps) {
  const { type, id } = await params;
  const rawToken = (await searchParams)[LATE_REGISTRATION_PARAM];
  const lateRegistrationToken =
    typeof rawToken === "string" && rawToken ? rawToken : undefined;

  if (type !== "course") {
    notFound();
  }

  const course = await api.courses.getById({ id });
  const spots = await api.courses.getAvailableSlots({ id });

  if (!course) {
    notFound();
  }

  if (isUuid(id) && course.slug) {
    permanentRedirect(
      lateRegistrationToken
        ? `${courseRegistrationPath(course)}?${LATE_REGISTRATION_PARAM}=${encodeURIComponent(lateRegistrationToken)}`
        : courseRegistrationPath(course),
    );
  }

  if (isExternalCourse(course) && course.externalRegistrationUrl) {
    redirect(course.externalRegistrationUrl);
  }

  const lateRegistrationState = lateRegistrationToken
    ? (
        await api.lateRegistrationLinks.check({
          courseId: course.id,
          token: lateRegistrationToken,
        })
      ).state
    : null;

  if (lateRegistrationState && lateRegistrationState !== "open") {
    return (
      <PublicPage
        title="Nachmeldung"
        heroTitle={course.title}
        heroSize="compact"
        breadcrumbs={[
          { label: "Start", href: "/" },
          { label: "Termine", href: "/termine" },
          { label: course.title, href: coursePath(course) },
          { label: "Nachmeldung" },
        ]}
      >
        <div className="bg-paper dark:bg-night pb-8 md:pb-12">
          <div className="sheet space-y-6 py-10">
            <Note tone="error" title="Link nicht mehr gültig">
              <p>
                {lateRegistrationLinkUnusableMessage(lateRegistrationState)}
              </p>
              <p className="mt-2">
                Wenn du dich trotzdem noch anmelden möchtest, wende dich bitte
                an das Kursteam.
              </p>
            </Note>
            <p>
              <Link href={coursePath(course)} className="link-ink">
                ← Zur Kursseite
              </Link>
            </p>
          </div>
        </div>
      </PublicPage>
    );
  }

  const usesLateRegistrationLink = lateRegistrationState === "open";

  if (!canRegisterForCourse(course, spots, usesLateRegistrationLink)) {
    redirect(coursePath(course));
  }

  return (
    <CourseRegistrationPage
      course={course}
      spots={spots}
      lateRegistrationToken={
        usesLateRegistrationLink ? lateRegistrationToken : undefined
      }
    />
  );
}
