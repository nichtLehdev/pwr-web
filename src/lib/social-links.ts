import { SOCIAL_TYPE_OPTIONS } from "@/app/_components/ui/social-icon";

/**
 * One entry of the `socials` Json columns (Ensemble, TeamMember).
 * `type` selects the icon; see SOCIAL_TYPE_OPTIONS for the known values.
 */
export type SocialLink = {
  type: string;
  url: string;
  label?: string;
};

/**
 * The column is untyped Json and can hold whatever an import wrote, so every
 * entry is checked before a page renders it.
 */
export function readSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const { type, url, label } = entry as Record<string, unknown>;
    if (typeof url !== "string" || !url.trim()) return [];
    return [
      {
        type: typeof type === "string" && type.trim() ? type : "website",
        url: url.trim(),
        ...(typeof label === "string" && label.trim()
          ? { label: label.trim() }
          : {}),
      },
    ];
  });
}

/** Falls back to a neutral phrase for types the option list does not know. */
export function socialTypeLabel(type: string): string {
  return (
    SOCIAL_TYPE_OPTIONS.find((option) => option.value === type.toLowerCase())
      ?.label ?? "Profil ansehen"
  );
}
