"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import EventDetailView from "@/components/EventDetailView";
import CourseDetailView from "@/components/CourseDetailView";
import { mockEvents, mockCourses } from "@/lib/mockData";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

export default function TerminDetailPage({ params }: PageProps) {
  const { type, id } = use(params);
  const numericId = parseInt(id);

  if (type === "event") {
    const event = mockEvents.find((e) => e.id === numericId);
    if (!event) {
      notFound();
    }
    return <EventDetailView event={event} />;
  }

  if (type === "course") {
    const course = mockCourses.find((c) => c.id === numericId);
    if (!course) {
      notFound();
    }
    return <CourseDetailView course={course} />;
  }

  // Invalid type
  notFound();
}
