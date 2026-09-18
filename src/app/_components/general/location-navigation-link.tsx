import { NavigationIcon } from "lucide-react";
import { locationMapsUrl, type MappableLocation } from "@/lib/maps";

interface LocationNavigationLinkProps {
  location: MappableLocation | null | undefined;
  /** "button" for address blocks, "inline" next to a one-line address. */
  variant?: "button" | "inline";
  label?: string;
  className?: string;
}

/** "Navigation starten" link; renders nothing without coordinates or address. */
export default function LocationNavigationLink({
  location,
  variant = "button",
  label = "Navigation starten",
  className = "",
}: LocationNavigationLinkProps) {
  const href = locationMapsUrl(location);
  if (!href) return null;

  // Kein Orange als Textfarbe auf hellem Grund (Kontrast); nachts darf der Link orange sein.
  const variantStyles =
    variant === "button"
      ? "semi-condensed bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink mt-4 inline-flex min-h-11 items-center gap-2 px-4 py-2 font-semibold transition-colors"
      : "text-primary-ink dark:text-primary inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 transition-colors hover:underline";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${variantStyles} ${className}`.trim()}
    >
      <NavigationIcon
        className={variant === "button" ? "h-5 w-5" : "h-4 w-4"}
        aria-hidden
      />
      {label}
    </a>
  );
}
