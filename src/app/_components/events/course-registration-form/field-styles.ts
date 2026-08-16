import { cn } from "@/lib/utils";

/**
 * One set of metrics for every field of the registration flow — text inputs,
 * the birthdate input and the price-option select — so the two-column rows line
 * up instead of each control bringing its own height.
 *
 * `text-base` on mobile as well is deliberate: iOS Safari zooms the page in
 * whenever a focused field renders below 16px.
 *
 * Sizing only, so it can be layered onto the `Input`/`Select` primitives, which
 * already carry their own colours and focus styles.
 */
export const FIELD_SIZE_CLASS =
  "min-h-11 w-full min-w-0 px-3 py-2 text-base sm:px-4";

/** `Select`'s counterpart to {@link FIELD_SIZE_CLASS}. */
export const FIELD_SELECT_SIZE = "md" as const;

/** Full styling for the bare `<input>` elements of the registration steps. */
export function fieldClass(
  options: {
    /** Renders the red border used for missing or invalid values. */
    error?: boolean;
    /** Background and per-field extras (participant cards tint sibling rows). */
    className?: string;
  } = {},
): string {
  return cn(
    FIELD_SIZE_CLASS,
    "focus:ring-primary dark:border-dark-border text-dark dark:text-dark-text rounded-lg border focus:border-transparent focus:ring-2",
    options.error ? "border-red-500 dark:border-red-500" : "border-gray-300",
    options.className,
  );
}
