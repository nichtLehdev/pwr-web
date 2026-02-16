"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import { SaveIcon, Search, X, ChevronDown, ChevronUp } from "lucide-react";

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

  const { data: canManageBezirke } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const { data: bezirk, isLoading: bezirkLoading } =
    api.bezirke.getById.useQuery(
      { id: bezirkId },
      { enabled: !!bezirkId && !!session?.user },
    );

  const [number, setNumber] = useState(bezirk?.number ?? 1);
  const [name, setName] = useState(bezirk?.name ?? "");
  const [shortName, setShortName] = useState(bezirk?.shortName ?? "");
  const [obleuteAssignments, setObleuteAssignments] = useState<
    Array<{ userId: string; roleName: string }>
  >([]);
  const [stellObleuteAssignments, setStellObleuteAssignments] = useState<
    Array<{ userId: string; roleName: string }>
  >([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: users } = api.bezirke.getUsersForDropdown.useQuery(undefined, {
    enabled: !!session?.user && !!canManageBezirke,
  });

  useEffect(() => {
    if (bezirk && !initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNumber(bezirk.number);
      setName(bezirk.name);
      setShortName(bezirk.shortName);

      // Set current users with their custom role names
      // Distinguish between obleute and stell. obleute based on role name
      const allDistrictUsers = bezirk.users || [];

      const obleute: UserAssignment[] = [];
      const stellObleute: UserAssignment[] = [];

      allDistrictUsers.forEach((u) => {
        const roleName = u.districtRoleName || "Obleute";
        const assignment = { userId: u.id, roleName };

        // Check if role name contains "stell" (case-insensitive) to categorize
        if (roleName.toLowerCase().includes("stell")) {
          stellObleute.push(assignment);
        } else {
          obleute.push(assignment);
        }
      });

      setObleuteAssignments(obleute);
      setStellObleuteAssignments(stellObleute);

      setInitialized(true);
    }
  }, [bezirk, initialized]);

  const utils = api.useUtils();

  const updateMutation = api.bezirke.update.useMutation({
    onSuccess: async () => {
      await utils.bezirke.getAll.invalidate();
      await utils.bezirke.getById.invalidate({ id: bezirkId });
      toast.success("Bezirk erfolgreich aktualisiert");
      router.push(`/dashboard/bezirke/${bezirkId}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Aktualisieren: " + err.message);
    },
  });

  const assignUsersMutation = api.bezirke.assignUsers.useMutation({
    onSuccess: async () => {
      await utils.bezirke.getAll.invalidate();
      await utils.bezirke.getById.invalidate({ id: bezirkId });
    },
    onError: (err) => {
      toast.error("Fehler beim Zuweisen der Benutzer: " + err.message);
    },
  });

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
      !canManageBezirke &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageBezirke]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Update district info
      await updateMutation.mutateAsync({
        id: bezirkId,
        number,
        name: name.trim(),
        shortName: shortName.trim(),
      });

      // Assign users
      await assignUsersMutation.mutateAsync({
        bezirkId,
        obleuteAssignments: obleuteAssignments || [],
        stellObleuteAssignments: stellObleuteAssignments || [],
      });

      toast.success("Bezirk erfolgreich aktualisiert");
      router.push(`/dashboard/bezirke/${bezirkId}`);
    } catch (err) {
      setIsSubmitting(false);
      // Error handling is done in mutation callbacks
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
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href="/dashboard/bezirke"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Bezirke
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/bezirke/${bezirkId}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                {bezirk.shortName}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Bearbeiten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Bezirk bearbeiten
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Bearbeite die Informationen des Bezirks
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="dark:border-dark-border dark:bg-dark-surface space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {/* Number */}
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Bezirksnummer *
              </label>
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
                required
                min={1}
                max={13}
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
              <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                Bezirksnummer zwischen 1 und 13
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Vollständiger Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Short Name */}
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Kurzname *
              </label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                required
                maxLength={50}
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Preview */}
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Vorschau
              </label>
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{
                    backgroundColor: `var(--color-district-${number})`,
                  }}
                >
                  {number}
                </span>
                <div>
                  <p className="dark:text-dark-text font-medium text-gray-900">
                    {name || "Bezirksname"}
                  </p>
                  <p className="dark:text-dark-muted text-sm text-gray-500">
                    {shortName || "Kurzname"}
                  </p>
                </div>
              </div>
            </div>

            {/* Obleute Selection */}
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Obleute
              </label>
              <UserAssignmentSelect
                users={users}
                assignments={obleuteAssignments}
                onAssignmentsChange={setObleuteAssignments}
                placeholder="Obleute auswählen..."
                defaultRoleName="Obleute"
              />
            </div>

            {/* Stell. Obleute Selection */}
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Stell. Obleute
              </label>
              <UserAssignmentSelect
                users={users}
                assignments={stellObleuteAssignments}
                onAssignmentsChange={setStellObleuteAssignments}
                placeholder="Stell. Obleute auswählen..."
                defaultRoleName="Stell. Obleute"
              />
            </div>
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
      </div>
    </main>
  );
}

type UserOption = {
  id: string;
  displayName: string | null;
  email: string;
  username: string | null;
};

type UserAssignment = {
  userId: string;
  roleName: string;
};

function UserAssignmentSelect({
  users,
  assignments,
  onAssignmentsChange,
  placeholder = "Benutzer suchen...",
  defaultRoleName = "Obleute",
}: {
  users?: UserOption[];
  assignments: UserAssignment[];
  onAssignmentsChange: (assignments: UserAssignment[]) => void;
  placeholder?: string;
  defaultRoleName?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedUserIds = assignments.map((a) => a.userId);
  const selectedUsers =
    users?.filter((u) => selectedUserIds.includes(u.id)) || [];

  // Filter users based on search query, excluding already selected ones
  const filteredUsers =
    users?.filter((user) => {
      // Exclude already selected users
      if (selectedUserIds.includes(user.id)) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const displayName = user.displayName?.toLowerCase() || "";
      const email = user.email.toLowerCase();
      const username = user.username?.toLowerCase() || "";
      return (
        displayName.includes(query) ||
        email.includes(query) ||
        username.includes(query)
      );
    }) || [];

  // Close dropdown when clicking outside
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

  const handleSelect = (userId: string) => {
    onAssignmentsChange([
      ...assignments,
      { userId, roleName: defaultRoleName },
    ]);
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleRemove = (userId: string) => {
    onAssignmentsChange(assignments.filter((a) => a.userId !== userId));
  };

  const handleRoleNameChange = (userId: string, roleName: string) => {
    onAssignmentsChange(
      assignments.map((a) => (a.userId === userId ? { ...a, roleName } : a)),
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Users with Role Name Inputs */}
      {selectedUsers.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedUsers.map((user) => {
            const assignment = assignments.find((a) => a.userId === user.id);
            return (
              <div
                key={user.id}
                className="dark:border-dark-border dark:bg-dark-surface flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2"
              >
                <div className="flex-1">
                  <div className="dark:text-dark-text text-sm font-medium">
                    {user.displayName || user.email}
                  </div>
                  {user.displayName && (
                    <div className="text-xs text-gray-500">{user.email}</div>
                  )}
                </div>
                <input
                  type="text"
                  value={assignment?.roleName || defaultRoleName}
                  onChange={(e) =>
                    handleRoleNameChange(user.id, e.target.value)
                  }
                  placeholder={defaultRoleName}
                  maxLength={100}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary focus:ring-primary w-40 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:ring-1 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(user.id)}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 py-2 pr-10 pl-10 focus:ring-1 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400"
        >
          {isOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="dark:bg-dark-surface dark:border-dark-border absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filteredUsers.length > 0 ? (
            <div className="py-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user.id)}
                  className="dark:text-dark-text dark:hover:bg-dark-surface w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                >
                  <div className="font-medium">
                    {user.displayName || user.email}
                  </div>
                  {user.displayName && (
                    <div className="text-xs text-gray-500">{user.email}</div>
                  )}
                  {user.username && (
                    <div className="text-xs text-gray-400">
                      @{user.username}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              {searchQuery.trim()
                ? "Keine weiteren Benutzer gefunden"
                : selectedUsers.length > 0
                  ? "Tippen Sie, um weitere Benutzer hinzuzufügen..."
                  : "Tippen Sie, um zu suchen..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
