import { NavigationIcon } from "lucide-react";
import { locationMapsUrl, type MappableLocation } from "@/lib/maps";

interface LocationNavigationLinkProps {
  location: MappableLocation | null | undefined;
  /** "button" for address blocks, "inline" next to a one-line address. */
  variant?: "button" | "inline";
  label?: string;
  className?: string;
}

/**
 * "Navigation starten" link for a publicly shown location.
 *
 * Renders nothing when the location has neither coordinates nor an address,
 * so callers can drop it in without repeating that check.
 */
export default function LocationNavigationLink({
  location,
  variant = "button",
  label = "Navigation starten",
  className = "",
}: LocationNavigationLinkProps) {
  const href = locationMapsUrl(location);
  if (!href) return null;

  const variantStyles =
    variant === "button"
      ? "bg-primary hover:bg-primary-dark mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors"
      : "text-primary hover:text-primary-dark inline-flex items-center gap-1 text-sm font-semibold transition-colors";

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
