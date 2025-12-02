import type {
  Event,
  Course,
  Bezirk,
  Location,
} from "~/generated/prisma/client";

// Extended Event type with relations
export type EventWithRelations = Event & {
  bezirk: Bezirk | null;
  location: Location | null;
};

// Extended Course type with relations
export type CourseWithRelations = Course & {
  bezirk: Bezirk | null;
  location: Location | null;
};

// Calendar item types (use type, not interface)
export type CalendarEventItem = EventWithRelations & {
  type: "event";
};

export type CalendarCourseItem = CourseWithRelations & {
  type: "course";
};

// Union type for calendar items
export type CalendarItem = CalendarEventItem | CalendarCourseItem;

// Type guard functions for better type narrowing
export function isCalendarEvent(item: CalendarItem): item is CalendarEventItem {
  return item.type === "event";
}

export function isCalendarCourse(
  item: CalendarItem,
): item is CalendarCourseItem {
  return item.type === "course";
}
