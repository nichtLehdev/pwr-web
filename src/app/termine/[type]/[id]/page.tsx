import { notFound } from "next/navigation";
import { api } from "@/trpc/server";
import EventDetailView from "@/app/_components/events/event-detail-view";
import CourseDetailView from "@/app/_components/events/course-detail-view";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

export default async function TerminDetailPage({ params }: PageProps) {
  const { type, id } = await params;

  if (type === "event") {
    const event = await api.events.getById({ id: id });
    if (!event) {
      notFound();
    }
    return <EventDetailView event={event} />;
  }

  if (type === "course") {
    const course = await api.courses.getById({ id: id });
    const spots = await api.courses.getAvailableSlots({ id: id });
    if (!course) {
      notFound();
    }
    return <CourseDetailView course={course} spots={spots} />;
  }

  // Invalid type
  notFound();
}
