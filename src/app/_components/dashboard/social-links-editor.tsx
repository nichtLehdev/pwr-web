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
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <PlusIcon className="h-4 w-4" />
          Link hinzufügen
        </button>
      </div>

      {value.length === 0 ? (
        <p className="dark:text-dark-muted py-4 text-center text-sm text-gray-500">
          {emptyLabel}
        </p>
      ) : (
        <div className="space-y-4">
          {value.map((social, index) => (
            <div
              key={index}
              className="dark:border-dark-border flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-start dark:bg-gray-800/50"
            >
              <div className="sm:w-48">
                <label className="dark:text-dark-muted mb-1 block text-xs font-medium text-gray-500">
                  Typ
                </label>
                <div className="flex items-center gap-2">
                  <div className="dark:bg-dark-background-secondary dark:border-dark-border flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white">
                    <SocialIcon
                      type={social.type}
                      className="h-5 w-5 text-gray-600 dark:text-gray-400"
                    />
                  </div>
                  <Select
                    value={social.type}
                    onChange={(e) => updateLink(index, "type", e.target.value)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
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
                <label className="dark:text-dark-muted mb-1 block text-xs font-medium text-gray-500">
                  URL
                </label>
                <input
                  type="url"
                  value={social.url}
                  onChange={(e) => updateLink(index, "url", e.target.value)}
                  placeholder="https://..."
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="sm:w-40">
                <label className="dark:text-dark-muted mb-1 block text-xs font-medium text-gray-500">
                  Anzeigename
                </label>
                <input
                  type="text"
                  value={social.label || ""}
                  onChange={(e) => updateLink(index, "label", e.target.value)}
                  placeholder="@username"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div className="flex items-end sm:pb-0.5">
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
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
