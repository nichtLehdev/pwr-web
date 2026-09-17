"use client";

import { PlusIcon, TrashIcon } from "lucide-react";
import { Select } from "@/app/_components/ui";
import {
  SocialIcon,
  SOCIAL_TYPE_OPTIONS,
} from "@/app/_components/ui/social-icon";
import type { SocialLink } from "@/lib/social-links";

/** Rows without a URL never reach the API; see the routers' socials input. */
export function cleanSocialLinks(links: SocialLink[]): SocialLink[] {
  return links
    .filter((link) => link.url.trim())
    .map((link) => ({
      type: link.type,
      url: link.url.trim(),
      ...(link.label?.trim() ? { label: link.label.trim() } : {}),
    }));
}

type SocialLinksEditorProps = {
  value: SocialLink[];
  onChange: (links: SocialLink[]) => void;
  emptyLabel?: string;
};

export function SocialLinksEditor({
  value,
  onChange,
  emptyLabel = "Keine Social Media Links vorhanden.",
}: SocialLinksEditorProps) {
  const updateLink = (
    index: number,
    field: keyof SocialLink,
    fieldValue: string,
  ) => {
    const current = value[index];
    if (!current) return;
    const updated = [...value];
    updated[index] = { ...current, [field]: fieldValue };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() =>
            onChange([...value, { type: "website", url: "", label: "" }])
          }
          className="bg-rule/25 dark:bg-night-raised text-ink dark:text-night-text hover:bg-rule/50 dark:hover:bg-night-rule inline-flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Link hinzufügen
        </button>
      </div>

      {value.length === 0 ? (
        <p className="text-dark dark:text-night-muted py-4 text-center text-sm">
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-4">
          {value.map((social, index) => (
            <div
              key={index}
              className="border-rule dark:border-night-rule dark:bg-night-raised bg-rule/25 flex flex-col gap-3 border p-4 sm:flex-row sm:items-start"
            >
              <div className="sm:w-48">
                <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
                  Typ
                </label>
                <div className="flex items-center gap-2">
                  <div className="border-ink dark:border-night-text dark:bg-night bg-paper flex h-9 w-9 items-center justify-center border">
                    <SocialIcon
                      type={social.type}
                      className="text-dark dark:text-night-muted h-5 w-5"
                    />
                  </div>
                  <Select
                    value={social.type}
                    onChange={(e) => updateLink(index, "type", e.target.value)}
                    className="flex-1 text-sm"
                  >
                    {SOCIAL_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex-1">
                <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
                  URL
                </label>
                <input
                  type="url"
                  value={social.url}
                  onChange={(e) => updateLink(index, "url", e.target.value)}
                  placeholder="https://..."
                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper block w-full border px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:w-40">
                <label className="text-dark dark:text-night-muted mb-1 block text-xs font-medium">
                  Anzeigename
                </label>
                <input
                  type="text"
                  value={social.label || ""}
                  onChange={(e) => updateLink(index, "label", e.target.value)}
                  placeholder="@username"
                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper block w-full border px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-end sm:pb-0.5">
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                  title="Entfernen"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
