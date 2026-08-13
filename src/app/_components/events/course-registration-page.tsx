"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar, MapPin, Users, Wallet } from "lucide-react";
import { formatAcceptedCoursePaymentMethods } from "@/lib/course-payment-methods";
import { formatAvailableSlots } from "@/lib/format-available-slots";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import PublicPage from "@/app/_components/general/public-page";
import CourseRegistrationForm from "@/app/_components/events/course-registration-form";
import { CourseExistingRegistrationOptions } from "@/app/_components/events/course-existing-registration-options";
import { coursePath } from "@/lib/slug";

type Course = NonNullable<RouterOutputs["courses"]["getById"]>;
type Spots = RouterOutputs["courses"]["getAvailableSlots"];

function formatCourseSchedule(course: Course): string {
  const start = new Date(course.startDate);
  const end = new Date(course.endDate);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${start.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })}, ${start.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })} – ${end.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    })} Uhr`;
  }
  return `${start.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  })} – ${end.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export default function CourseRegistrationPage({
  course,
  spots,
}: {
  course: Course;
  spots: Spots;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: userProfile } = api.users.getMyProfile.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const { data: existingRegistration, isLoading: existingRegistrationLoading } =
    api.registrations.getMyActiveRegistrationForCourse.useQuery(
      { courseId: course.id },
      { enabled: !!session?.user },
    );

  const [optionsResolved, setOptionsResolved] = useState(false);

  const district = !course.bezirk
    ? "primary"
    : (`district-${course.bezirk.number}` as
        | "district-1"
        | "district-2"
        | "district-3"
        | "district-4"
        | "district-5"
        | "district-6"
        | "district-7"
        | "district-8"
        | "district-9"
        | "district-10"
        | "district-11"
        | "district-12"
        | "district-13"
        | undefined);

  const courseUrl = coursePath(course);
  const isWaitlist = spots.isFull && course.allowWaitingList;

  const showExistingOptionsModal =
    !!session?.user &&
    !existingRegistrationLoading &&
    !!existingRegistration &&
    !optionsResolved;

  const handleEditExisting = () => {
    setOptionsResolved(true);
    if (existingRegistration) {
      router.push(`/registrations/${existingRegistration.id}/edit`);
    }
  };

  const handleCreateAdditional = () => {
    setOptionsResolved(true);
  };

  const handleCancelExistingOptions = () => {
    setOptionsResolved(true);
    router.push(courseUrl);
  };

  const onCloseForm = () => {
    router.push(courseUrl);
  };

  const onSuccessForm = () => {
    router.push(courseUrl);
    router.refresh();
  };

  const showForm =
    !session?.user ||
    (!existingRegistrationLoading &&
      (!existingRegistration || optionsResolved));

  const locationLine =
    course.location &&
    [course.location.name, course.location.city].filter(Boolean).join(", ");

  const acceptedPaymentMethods = formatAcceptedCoursePaymentMethods(course);

  const heroDescription = (
    <div className="mt-1 space-y-4">
      <p>
        {isWaitlist
          ? "Dieser Lehrgang ist ausgebucht. Sie können sich hier auf die Warteliste setzen lassen."
          : "Füllen Sie die folgenden Schritte aus, um Ihre Anmeldung abzuschließen."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
          {course.courseType}
        </span>
        {course.bezirk && (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
            {`Bezirk ${course.bezirk.number} (${course.bezirk.shortName})`}
          </span>
        )}
        {isWaitlist && (
          <span className="rounded-full bg-orange-600 px-2.5 py-0.5 text-xs font-semibold">
            Nur Warteliste
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-white/20 pt-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2">
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
          {formatCourseSchedule(course)}
        </span>
        {locationLine ? (
          <>
            <span
              className="hidden shrink-0 px-1 text-white/45 sm:inline"
              aria-hidden
            >
              ·
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
              {locationLine}
            </span>
          </>
        ) : null}
        <span
          className="hidden shrink-0 px-1 text-white/45 sm:inline"
          aria-hidden
        >
          ·
        </span>
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
          {isWaitlist
            ? "Warteliste"
            : formatAvailableSlots(spots.availableSlots, spots.totalCapacity)}
        </span>
        {!course.isFree && acceptedPaymentMethods ? (
          <>
            <span
              className="hidden shrink-0 px-1 text-white/45 sm:inline"
              aria-hidden
            >
              ·
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <Wallet className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
              <span className="truncate">{acceptedPaymentMethods}</span>
            </span>
          </>
        ) : null}
      </div>
      <p>
        <Link
          href={courseUrl}
          className="text-sm font-semibold text-white underline decoration-white/50 underline-offset-4 transition-colors hover:decoration-white"
        >
          ← Zurück zur Kursseite
        </Link>
      </p>
    </div>
  );

  return (
    <PublicPage
      title="Anmeldung"
      heroTitle={course.title}
      color={district}
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Termine", href: "/termine" },
        { label: course.title, href: courseUrl },
        { label: isWaitlist ? "Warteliste" : "Anmeldung" },
      ]}
      heroSize="compact"
      description={heroDescription}
    >
      <div className="bg-background-secondary dark:bg-dark-background-secondary -mt-2 min-h-[calc(100vh-12rem)] pb-8 md:-mt-4 md:pb-12">
        {session?.user && existingRegistrationLoading && (
          <div className="container mx-auto px-4 py-16 text-center">
            <p className="text-dark dark:text-dark-text">Laden…</p>
          </div>
        )}
        {showForm && !existingRegistrationLoading && (
          <CourseRegistrationForm
            variant="page"
            course={course}
            onClose={onCloseForm}
            onSuccess={onSuccessForm}
            isWaitlist={isWaitlist}
            currentUser={userProfile ?? null}
          />
        )}
      </div>

      {showExistingOptionsModal && existingRegistration && (
        <CourseExistingRegistrationOptions
          participantCount={existingRegistration.participants.length}
          onEditExisting={handleEditExisting}
          onCreateAdditional={handleCreateAdditional}
          onCancel={handleCancelExistingOptions}
        />
      )}
    </PublicPage>
  );
}
