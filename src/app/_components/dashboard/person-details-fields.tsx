"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { UserIcon, XIcon } from "lucide-react";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { api } from "@/trpc/react";

/**
 * Personen auf öffentlichen Seiten brauchen kein Benutzerkonto. Diese beiden
 * Bausteine bilden das ab: eigene Angaben (Bild, Name, Kontakt) plus eine
 * optionale Verknüpfung zu einem Konto, aus dem leer gelassene Felder ergänzt
 * werden.
 */

export type PersonDetails = {
  name: string;
  email: string;
  phone: string;
  city: string;
  bio: string;
  imageId: string | null;
  imageUrl: string | null;
};

export const emptyPersonDetails = (): PersonDetails => ({
  name: "",
  email: "",
  phone: "",
  city: "",
  bio: "",
  imageId: null,
  imageUrl: null,
});

const inputClass =
  "focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none";

const labelClass =
  "dark:text-dark-text mb-1 block text-sm font-medium text-gray-700";

const sectionClass =
  "dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm";

export function PersonDetailsFields({
  value,
  onChange,
  hasLinkedUser,
  showBio = true,
  showCity = false,
  imageLabel = "Bild",
  nameRequired,
}: {
  value: PersonDetails;
  onChange: (patch: Partial<PersonDetails>) => void;
  /** Steuert nur den Hinweistext — die Felder bleiben immer bearbeitbar. */
  hasLinkedUser: boolean;
  showBio?: boolean;
  showCity?: boolean;
  imageLabel?: string;
  /** Überschreibt die Sternchen-Markierung am Namensfeld. */
  nameRequired?: boolean;
}) {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const nameIsRequired = nameRequired ?? !hasLinkedUser;

  return (
    <>
      <section className={sectionClass}>
        <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
          {imageLabel}
        </h2>
        <div className="flex items-center gap-6">
          {value.imageUrl ? (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full">
              <Image
                src={value.imageUrl}
                alt={value.name || "Profilbild"}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="dark:bg-dark-background-secondary flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <UserIcon className="dark:text-dark-muted h-12 w-12 text-gray-400" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsMediaPickerOpen(true)}
              className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {value.imageUrl ? "Bild ändern" : "Bild auswählen"}
            </button>
            {value.imageUrl && (
              <button
                type="button"
                onClick={() => onChange({ imageId: null, imageUrl: null })}
                className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Bild entfernen
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
          Angaben zur Person
        </h2>
        <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
          {hasLinkedUser
            ? "Ausgefüllte Felder werden veröffentlicht; leere Felder übernehmen die Daten des verknüpften Kontos."
            : "Diese Angaben erscheinen auf der öffentlichen Seite. Ein Benutzerkonto ist dafür nicht nötig."}
        </p>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              Name {nameIsRequired ? "*" : ""}
            </label>
            <input
              type="text"
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Vollständiger Name"
              maxLength={100}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>E-Mail</label>
              <input
                type="email"
                value={value.email}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="email@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Telefon</label>
              <input
                type="tel"
                value={value.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                placeholder="+49 123 456789"
                maxLength={50}
                className={inputClass}
              />
            </div>
          </div>

          {showCity && (
            <div>
              <label className={labelClass}>Ort</label>
              <input
                type="text"
                value={value.city}
                onChange={(e) => onChange({ city: e.target.value })}
                placeholder="Düsseldorf"
                maxLength={100}
                className={inputClass}
              />
            </div>
          )}

          {showBio && (
            <div>
              <label className={labelClass}>Kurzvorstellung</label>
              <textarea
                value={value.bio}
                onChange={(e) => onChange({ bio: e.target.value })}
                rows={4}
                placeholder="Wird auf der öffentlichen Seite angezeigt."
                maxLength={2000}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </section>

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(url, _alt, mediaId) => {
          onChange({ imageId: mediaId ?? null, imageUrl: url });
          setIsMediaPickerOpen(false);
        }}
      />
    </>
  );
}

/** Optionale Verknüpfung zu einem Benutzerkonto. */
export function UserLinkField({
  userId,
  userLabel,
  onSelect,
  onClear,
  description = "Optional: Verknüpfe diese Person mit einem Benutzerkonto. Leer gelassene Angaben werden dann von dort übernommen.",
}: {
  userId: string | null;
  userLabel: string;
  onSelect: (user: {
    id: string;
    displayName: string | null;
    email: string;
  }) => void;
  onClear: () => void;
  description?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results } = api.users.search.useQuery(
    { query: search.trim(), limit: 20 },
    { enabled: search.trim().length >= 2 },
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <section className={sectionClass}>
      <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
        Benutzerverknüpfung
      </h2>
      <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
        {description}
      </p>

      {userId ? (
        <div className="dark:border-dark-border dark:bg-dark-background-secondary flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
          <span className="dark:text-dark-text flex-1 text-sm text-gray-900">
            {userLabel || "Verknüpftes Konto"}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            title="Verknüpfung entfernen"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative" ref={containerRef}>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Name oder E-Mail eingeben..."
            className={inputClass}
          />

          {isOpen && (
            <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="max-h-60 overflow-y-auto">
                {results && results.length > 0 ? (
                  results.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        onSelect(user);
                        setSearch("");
                        setIsOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span className="dark:text-dark-text font-medium text-gray-900">
                        {user.displayName ?? user.email}
                      </span>
                      {user.displayName && (
                        <span className="text-gray-500 dark:text-gray-400">
                          {" "}
                          – {user.email}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {search.trim().length >= 2
                      ? "Keine Benutzer gefunden"
                      : "Tippe, um Benutzer zu suchen"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
