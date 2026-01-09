import type { RouterOutputs } from "@/trpc/react";

export type EventWithRelations =
  RouterOutputs["events"]["getAll"]["events"][number];
export type CourseWithRelations =
  RouterOutputs["courses"]["getAll"]["courses"][number];

export type CalendarEventItem = EventWithRelations & {
  type: "event";
};

export type CalendarCourseItem = CourseWithRelations & {
  type: "course";
};

export type CalendarItem = CalendarEventItem | CalendarCourseItem;

export function isCalendarEvent(item: CalendarItem): item is CalendarEventItem {
  return item.type === "event";
}

export function isCalendarCourse(
  item: CalendarItem,
): item is CalendarCourseItem {
  return item.type === "course";
}
