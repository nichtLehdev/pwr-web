import { cn } from "@/lib/utils";
import { fieldControlClasses } from "@/app/_components/programmheft/field";

/**
 * Sizing only, shared by every registration field so two-column rows line up.
 * `text-base` on mobile is deliberate: iOS Safari zooms in on focused fields below 16px.
 */
export const FIELD_SIZE_CLASS =
  "min-h-11 w-full min-w-0 px-3 py-2 text-base sm:px-4";

/** `Select`'s counterpart to {@link FIELD_SIZE_CLASS}. */
export const FIELD_SELECT_SIZE = "md" as const;

/** Full styling for the bare `<input>` elements, built on `fieldControlClasses`. */
export function fieldClass(
  options: {
    error?: boolean;
    /** Background and per-field extras (participant cards tint sibling rows). */
    className?: string;
  } = {},
): string {
  return cn(
    fieldControlClasses,
    options.error && "border-red-700! dark:border-red-400!",
    options.className,
  );
}
