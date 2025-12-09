import type {
  Event,
  Course,
  Bezirk,
  Location,
} from "~/generated/prisma/client";

export type EventWithRelations = Event & {
  bezirk: Bezirk | null;
  location: Location | null;
};

export type CourseWithRelations = Course & {
  bezirk: Bezirk | null;
  location: Location | null;
};

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
