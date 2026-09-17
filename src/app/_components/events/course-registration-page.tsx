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
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { headMeta } from "@/app/_components/programmheft/page-head";
import { Tag } from "@/app/_components/programmheft/tag";
import { courseTypeLabel } from "@/lib/termine-labels";
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
    <div className="space-y-4">
      <p>
        {isWaitlist
          ? "Dieser Lehrgang ist ausgebucht. Sie können sich hier auf die Warteliste setzen lassen."
          : "Füllen Sie die folgenden Schritte aus, um Ihre Anmeldung abzuschließen."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={headMeta.label}>
          {courseTypeLabel(course.courseType)}
        </span>
        {course.bezirk && (
          <span className={headMeta.label}>
            <BezirkLabel bezirk={course.bezirk} />
          </span>
        )}
        {isWaitlist && <Tag tone="orange">Nur Warteliste</Tag>}
      </div>
      <div className={headMeta.line}>
        <span className="flex items-center gap-2">
          <Calendar className={headMeta.icon} aria-hidden />
          {formatCourseSchedule(course)}
        </span>
        {locationLine ? (
          <>
            <span className={headMeta.separator} aria-hidden>
              ·
            </span>
            <span className="flex items-center gap-2">
              <MapPin className={headMeta.icon} aria-hidden />
              {locationLine}
            </span>
          </>
        ) : null}
        <span className={headMeta.separator} aria-hidden>
          ·
        </span>
        <span className="flex items-center gap-2">
          <Users className={headMeta.icon} aria-hidden />
          {isWaitlist
            ? "Warteliste"
            : formatAvailableSlots(spots.availableSlots, spots.totalCapacity)}
        </span>
        {!course.isFree && acceptedPaymentMethods ? (
          <>
            <span className={headMeta.separator} aria-hidden>
              ·
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <Wallet className={headMeta.icon} aria-hidden />
              <span className="truncate">{acceptedPaymentMethods}</span>
            </span>
          </>
        ) : null}
      </div>
      <p>
        <Link
          href={courseUrl}
          className="semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 items-center text-base font-semibold underline underline-offset-4 hover:decoration-2"
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
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Termine", href: "/termine" },
        { label: course.title, href: courseUrl },
        { label: isWaitlist ? "Warteliste" : "Anmeldung" },
      ]}
      heroSize="compact"
      description={heroDescription}
    >
      <div className="bg-paper dark:bg-night min-h-[calc(100vh-12rem)] pb-8 md:pb-12">
        {session?.user && existingRegistrationLoading && (
          <div className="sheet py-16 text-center">
            <p className="text-ink dark:text-night-text">Laden…</p>
          </div>
        )}
        {showForm && !existingRegistrationLoading && (
          <CourseRegistrationForm
            course={course}
            onClose={onCloseForm}
            onSuccess={onSuccessForm}
            isWaitlist={isWaitlist}
            availableSlots={spots.availableSlots}
            capacityByPriceOption={spots.capacityByPriceOption}
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
