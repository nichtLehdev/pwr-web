import { notFound, redirect } from "next/navigation";
import { api } from "@/trpc/server";
import CourseRegistrationPage from "@/app/_components/events/course-registration-page";
import type { RouterOutputs } from "@/trpc/react";

type Course = NonNullable<RouterOutputs["courses"]["getById"]>;
type Spots = RouterOutputs["courses"]["getAvailableSlots"];

function canRegisterForCourse(course: Course, spots: Spots): boolean {
  const now = new Date();
  const endDate = new Date(course.endDate);
  const registrationDeadline = course.registrationDeadline
    ? new Date(course.registrationDeadline)
    : null;
  const registrationOpensAt = course.registrationOpensAt
    ? new Date(course.registrationOpensAt)
    : null;
  const isPast = endDate < now;
  const isDeadlinePassed =
    registrationDeadline !== null && registrationDeadline < now;
  const isRegistrationNotOpenYet =
    registrationOpensAt !== null && registrationOpensAt > now;

  return (
    course.registrationOpen &&
    !isPast &&
    !isDeadlinePassed &&
    !isRegistrationNotOpenYet &&
    (!spots.isFull || course.allowWaitingList)
  );
}

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

export default async function CourseAnmeldenPage({ params }: PageProps) {
  const { type, id } = await params;

  if (type !== "course") {
    notFound();
  }

  const course = await api.courses.getById({ id });
  const spots = await api.courses.getAvailableSlots({ id });

  if (!course) {
    notFound();
  }

  if (!canRegisterForCourse(course, spots)) {
    redirect(`/termine/course/${id}`);
  }

  return <CourseRegistrationPage course={course} spots={spots} />;
}
