"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { UserIcon, XIcon } from "lucide-react";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { api } from "@/trpc/react";

/**
 * Personen brauchen kein Benutzerkonto: eigene Angaben plus optionale Verknüpfung zu
 * einem Konto, aus dem leer gelassene Felder ergänzt werden.
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
  "border-ink dark:border-night-text dark:bg-night dark:text-night-text block w-full border bg-paper px-3 py-2";

const labelClass =
  "text-dark dark:text-night-muted mb-1 block text-sm font-medium";

const sectionClass =
  "border-rule dark:border-night-rule dark:bg-night border bg-paper p-6";

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
        <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
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
            <div className="bg-rule/25 dark:bg-night-raised flex h-24 w-24 shrink-0 items-center justify-center rounded-full">
              <UserIcon className="text-dark dark:text-night-muted h-12 w-12" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsMediaPickerOpen(true)}
              className="bg-primary hover:bg-primary/90 text-ink min-h-11 px-4 py-2 text-sm font-medium transition-colors"
            >
              {value.imageUrl ? "Bild ändern" : "Bild auswählen"}
            </button>
            {value.imageUrl && (
              <button
                type="button"
                onClick={() => onChange({ imageId: null, imageUrl: null })}
                className="min-h-11 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Bild entfernen
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
          Angaben zur Person
        </h2>
        <p className="text-dark dark:text-night-muted mb-4 text-sm">
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
      <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
        Benutzerverknüpfung
      </h2>
      <p className="text-dark dark:text-night-muted mb-4 text-sm">
        {description}
      </p>

      {userId ? (
        <div className="border-rule dark:border-night-rule dark:bg-night flex items-center gap-2 border px-3 py-2">
          <span className="text-ink dark:text-night-text flex-1 text-sm">
            {userLabel || "Verknüpftes Konto"}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text transition-colors"
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
            <div className="border-rule dark:border-night-rule dark:bg-night bg-paper absolute z-10 mt-1 w-full overflow-hidden border">
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
                      className="hover:bg-rule/30 dark:hover:bg-night-raised block w-full px-4 py-2 text-left text-sm"
                    >
                      <span className="text-ink dark:text-night-text font-medium">
                        {user.displayName ?? user.email}
                      </span>
                      {user.displayName && (
                        <span className="text-dark dark:text-night-muted">
                          {" "}
                          – {user.email}
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="text-dark dark:text-night-muted px-4 py-3 text-sm">
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
