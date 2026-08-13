"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/utils";
import { DashboardPage } from "@/app/_components/dashboard";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import {
  SaveIcon,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react";

/**
 * Ein Bezirksamt im Formular. `id` fehlt bei neu angelegten Zeilen; alles
 * andere wird so übernommen, wie es hier steht — ein Benutzerkonto ist
 * optional, ein Name reicht.
 */
type PersonDraft = {
  id?: string;
  userId: string | null;
  roleName: string;
  name: string;
  email: string;
  phone: string;
  street: string;
  zipCode: string;
  city: string;
  bio: string;
  imageId: string | null;
  imageUrl: string | null;
};

const emptyDraft = (roleName: string): PersonDraft => ({
  userId: null,
  roleName,
  name: "",
  email: "",
  phone: "",
  street: "",
  zipCode: "",
  city: "",
  bio: "",
  imageId: null,
  imageUrl: null,
});

export default function EditBezirkPage() {
  const router = useRouter();
  const params = useParams();
  const bezirkId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageBezirke = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_BEZIRKE,
  );

  const { data: bezirk, isLoading: bezirkLoading } =
    api.bezirke.getById.useQuery(
      { id: bezirkId },
      { enabled: !!bezirkId && !!session?.user },
    );

  const [people, setPeople] = useState<PersonDraft[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: users } = api.bezirke.getUsersForDropdown.useQuery(undefined, {
    enabled: !!session?.user && !!canManageBezirke,
  });

  useEffect(() => {
    if (bezirk && !initialized) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPeople(
        bezirk.obleute.map((person) => ({
          id: person.id,
          userId: person.userId,
          roleName: person.roleName,
          // Rohwerte des Datensatzes: was hier steht, wird auch veröffentlicht.
          name: person.person.name ?? "",
          email: person.person.email ?? "",
          phone: person.person.phone ?? "",
          street: person.person.street ?? "",
          zipCode: person.person.zipCode ?? "",
          city: person.person.city ?? "",
          bio: person.person.bio ?? "",
          imageId: person.image?.id ?? null,
          imageUrl: person.image?.url ?? null,
        })),
      );
      setInitialized(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [bezirk, initialized]);

  const utils = api.useUtils();

  const setPeopleMutation = api.bezirke.setPeople.useMutation();

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/bezirke/${bezirkId}/edit`);
    }
  }, [session, sessionLoading, router, bezirkId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageBezirke &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageBezirke, router]);

  const updatePerson = (index: number, patch: Partial<PersonDraft>) => {
    setPeople((current) =>
      current.map((person, i) =>
        i === index ? { ...person, ...patch } : person,
      ),
    );
  };

  const removePerson = (index: number) => {
    setPeople((current) => current.filter((_, i) => i !== index));
  };

  const movePerson = (index: number, direction: -1 | 1) => {
    setPeople((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const incomplete = people.find(
      (person) =>
        !person.roleName.trim() || (!person.userId && !person.name.trim()),
    );
    if (incomplete) {
      setError(
        "Jeder Eintrag braucht eine Funktionsbezeichnung sowie einen Benutzer oder einen Namen.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await setPeopleMutation.mutateAsync({
        bezirkId,
        people: people.map((person, index) => ({
          id: person.id,
          userId: person.userId,
          roleName: person.roleName.trim(),
          name: person.name.trim() || null,
          email: person.email.trim() || null,
          phone: person.phone.trim() || null,
          street: person.street.trim() || null,
          zipCode: person.zipCode.trim() || null,
          city: person.city.trim() || null,
          bio: person.bio.trim() || null,
          imageId: person.imageId,
          sortOrder: index,
        })),
      });

      await utils.bezirke.getAll.invalidate();
      await utils.bezirke.getById.invalidate({ id: bezirkId });
      toast.success("Obleute erfolgreich gespeichert");
      router.push(`/dashboard/bezirke/${bezirkId}`);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error("Fehler beim Speichern: " + message);
      setIsSubmitting(false);
    }
  };

  if (sessionLoading || profileLoading || bezirkLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageBezirke) {
    return null;
  }

  if (!bezirk) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Bezirk nicht gefunden
          </h1>
          <Link
            href="/dashboard/bezirke"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardPage
      title="Obleute bearbeiten"
      description={`Bezirk ${String(bezirk.number).padStart(2, "0")} – ${bezirk.shortName}`}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Bezirke", href: "/dashboard/bezirke" },
        { label: bezirk.shortName, href: `/dashboard/bezirke/${bezirkId}` },
        { label: "Obleute" },
      ]}
      maxWidth="7xl"
    >
      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Obleute */}
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
              Obleute
            </h2>
            <button
              type="button"
              onClick={() =>
                setPeople((current) => [
                  ...current,
                  emptyDraft("Bezirksobmann"),
                ])
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <PlusIcon className="h-4 w-4" />
              Person hinzufügen
            </button>
          </div>
          <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
            Ein Benutzerkonto ist nicht nötig – Name und Kontaktdaten können
            direkt hier gepflegt werden. Ist ein Konto verknüpft, füllen dessen
            Daten alle Felder, die hier leer bleiben. Die Reihenfolge bestimmt
            die Anzeige auf der Bezirksseite.
          </p>

          {people.length === 0 ? (
            <p className="dark:text-dark-muted py-4 text-center text-sm text-gray-500">
              Noch keine Obleute eingetragen.
            </p>
          ) : (
            <div className="space-y-4">
              {people.map((person, index) => (
                <PersonCard
                  key={person.id ?? `new-${index}`}
                  person={person}
                  index={index}
                  total={people.length}
                  users={users}
                  onChange={(patch) => updatePerson(index, patch)}
                  onRemove={() => removePerson(index)}
                  onMove={(direction) => movePerson(index, direction)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Speichern...
              </>
            ) : (
              <>
                <SaveIcon className="h-4 w-4" />
                Speichern
              </>
            )}
          </button>
          <Link
            href={`/dashboard/bezirke/${bezirkId}`}
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </DashboardPage>
  );
}

type UserOption = {
  id: string;
  displayName: string | null;
  email: string;
  username: string | null;
};

const inputClass =
  "dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:outline-none";

function PersonCard({
  person,
  index,
  total,
  users,
  onChange,
  onRemove,
  onMove,
}: {
  person: PersonDraft;
  index: number;
  total: number;
  users?: UserOption[];
  onChange: (patch: Partial<PersonDraft>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const linkedUser = users?.find((user) => user.id === person.userId);

  return (
    <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex-1">
          <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-500">
            Funktion *
          </label>
          <input
            type="text"
            value={person.roleName}
            onChange={(e) => onChange({ roleName: e.target.value })}
            placeholder="z.B. Bezirksobmann, Stell. Bezirksobfrau"
            maxLength={100}
            className={inputClass}
          />
        </div>
        <div className="flex items-end gap-1 pt-5">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
            title="Nach oben"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-700"
            title="Nach unten"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Entfernen"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Benutzerverknüpfung */}
      <div className="mb-4">
        <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-500">
          Benutzerkonto (optional)
        </label>
        {person.userId ? (
          <div className="dark:border-dark-border dark:bg-dark-surface flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <span className="dark:text-dark-text flex-1 text-sm text-gray-900">
              {linkedUser
                ? (linkedUser.displayName ?? linkedUser.email)
                : "Verknüpftes Konto"}
            </span>
            <button
              type="button"
              onClick={() => onChange({ userId: null })}
              className="text-gray-400 transition-colors hover:text-gray-600"
              title="Verknüpfung entfernen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <UserPicker
            users={users}
            onSelect={(userId) => onChange({ userId })}
          />
        )}
      </div>

      {/* Bild */}
      <div className="mb-4 flex items-center gap-4">
        {person.imageUrl ? (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
            <Image
              src={person.imageUrl}
              alt={person.name || "Profilbild"}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="dark:bg-dark-surface flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-400">
            <UserIcon className="h-8 w-8" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setIsMediaPickerOpen(true)}
            className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors"
          >
            {person.imageUrl ? "Bild ändern" : "Bild auswählen"}
          </button>
          {person.imageUrl && (
            <button
              type="button"
              onClick={() => onChange({ imageId: null, imageUrl: null })}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Bild entfernen
            </button>
          )}
        </div>
      </div>

      {/* Kontaktdaten */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-500">
            Name {person.userId ? "" : "*"}
          </label>
          <input
            type="text"
            value={person.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Vollständiger Name"
            maxLength={100}
            className={inputClass}
          />
        </div>
        <div>
          <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-500">
            E-Mail
          </label>
          <input
            type="email"
            value={person.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="email@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-500">
            Telefon
          </label>
          <input
            type="tel"
            value={person.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+49 123 456789"
            maxLength={50}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-500">
            Straße
          </label>
          <input
            type="text"
            value={person.street}
            onChange={(e) => onChange({ street: e.target.value })}
            placeholder="Musterstraße 1"
            maxLength={200}
            className={inputClass}
          />
        </div>
        <div>
          <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-500">
            PLZ
          </label>
          <input
            type="text"
            value={person.zipCode}
            onChange={(e) => onChange({ zipCode: e.target.value })}
            placeholder="40213"
            maxLength={20}
            className={inputClass}
          />
        </div>
        <div>
          <label className="dark:text-dark-text mb-1 block text-xs font-medium text-gray-500">
            Ort
          </label>
          <input
            type="text"
            value={person.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Düsseldorf"
            maxLength={100}
            className={inputClass}
          />
        </div>
      </div>

      {person.userId && (
        <p className="dark:text-dark-muted mt-2 text-xs text-gray-500">
          Ausgefüllte Felder werden veröffentlicht; leere Felder übernehmen die
          Daten des verknüpften Kontos.
        </p>
      )}

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(url, _alt, mediaId) => {
          onChange({ imageId: mediaId ?? null, imageUrl: url });
          setIsMediaPickerOpen(false);
        }}
      />
    </div>
  );
}

function UserPicker({
  users,
  onSelect,
}: {
  users?: UserOption[];
  onSelect: (userId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredUsers =
    users?.filter((user) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        (user.displayName?.toLowerCase() ?? "").includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.username?.toLowerCase() ?? "").includes(query)
      );
    }) ?? [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Benutzer suchen (optional)..."
        className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-1 focus:outline-none"
      />

      {isOpen && (
        <div className="dark:bg-dark-surface dark:border-dark-border absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filteredUsers.length > 0 ? (
            <div className="py-1">
              {filteredUsers.slice(0, 50).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onSelect(user.id);
                    setSearchQuery("");
                    setIsOpen(false);
                  }}
                  className="dark:text-dark-text w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="font-medium">
                    {user.displayName ?? user.email}
                  </div>
                  {user.displayName && (
                    <div className="text-xs text-gray-500">{user.email}</div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              Keine Benutzer gefunden
            </div>
          )}
        </div>
      )}
    </div>
  );
}
