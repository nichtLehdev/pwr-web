"use client";

import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import Image from "next/image";
import { UserRole, PosaunenwartRoleType } from "~/generated/prisma/enums";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

const ROLE_LABELS: Record<string, string> = {
  LPW: "Landesposaunenwart",
  RPW: "Regionalposaunenwart",
};

export default function DashboardPosaunenwarteEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { data: session, isPending } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: user, isLoading: userLoading } = api.users.getById.useQuery(
    { id },
    { enabled: !!id },
  );

  const { data: bezirke, isLoading: bezirkeLoading } =
    api.bezirke.getAll.useQuery();

  const addResponsibility =
    api.organization.addPosaunenwartResponsibility.useMutation({
      onSuccess: () => {
        void utils.users.getById.invalidate({ id });
        void utils.organization.getPosaunenwarte.invalidate();
        toast.success("Verantwortung erfolgreich hinzugefügt");
      },
      onError: (err) => {
        setError(err.message);
        toast.error("Fehler: " + err.message);
      },
    });

  const removeResponsibility =
    api.organization.removePosaunenwartResponsibility.useMutation({
      onSuccess: () => {
        void utils.users.getById.invalidate({ id });
        void utils.organization.getPosaunenwarte.invalidate();
        toast.success("Verantwortung erfolgreich entfernt");
      },
      onError: (err) => {
        setError(err.message);
        toast.error("Fehler: " + err.message);
      },
    });

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/posaunenwarte/${id}/edit`);
    }
  }, [isPending, session, router, id]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  useEffect(() => {
    if (user && user.role !== "LPW" && user.role !== "RPW") {
      router.push("/dashboard/posaunenwarte");
    }
  }, [user, router]);

  const handleAddBezirk = async (bezirkId: string) => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await addResponsibility.mutateAsync({
        userId: id,
        bezirkId,
        roleType:
          user.role === "LPW"
            ? PosaunenwartRoleType.LPW
            : PosaunenwartRoleType.RPW,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBezirk = async (bezirkId: string) => {
    setSaving(true);
    setError(null);
    try {
      await removeResponsibility.mutateAsync({
        userId: id,
        bezirkId,
      });
    } finally {
      setSaving(false);
    }
  };

  if (isPending || profileLoading || userLoading || bezirkeLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
    return null;
  }

  if (!user) {
    return (
      <main className="dark:bg-dark-background min-h-screen bg-gray-50">
        <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-xl font-semibold text-gray-900">
              Posaunenwart nicht gefunden
            </h2>
            <Link
              href="/dashboard/posaunenwarte"
              className="text-primary hover:text-primary/80"
            >
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isPosaunenwart = user.role === "LPW" || user.role === "RPW";

  if (!isPosaunenwart) {
    return null;
  }

  const assignedBezirkIds = new Set(
    user.posaunenwarteResponsibilities?.map((r) => r.bezirk.id) || [],
  );
  const assignedBezirke =
    bezirke?.filter((b) => assignedBezirkIds.has(b.id)) || [];
  const availableBezirke =
    bezirke?.filter((b) => !assignedBezirkIds.has(b.id)) || [];

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
                href="/dashboard/posaunenwarte"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Posaunenwarte
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/posaunenwarte/${id}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                {user.displayName || "Details"}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Bearbeiten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          {user.profileImage?.url ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
              <Image
                src={user.profileImage.url}
                alt={user.displayName || ""}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}
          <div>
            <h1 className="dark:text-dark-text text-2xl font-bold text-gray-900">
              Bezirke bearbeiten
            </h1>
            <p className="dark:text-dark-muted text-gray-600">
              {user.displayName}{" "}
              <span
                className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  user.role === "LPW"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                }`}
              >
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex gap-3">
              <svg
                className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Info for LPW */}
        {user.role === "LPW" && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex gap-3">
              <svg
                className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">Hinweis für Landesposaunenwart</p>
                <p className="mt-1">
                  Als Landesposaunenwart ist diese Person automatisch für alle
                  Bezirke zuständig. Die Bezirkszuordnungen hier sind nur für
                  spezielle Verantwortlichkeiten gedacht.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Bezirke */}
        <div className="dark:border-dark-border dark:bg-dark-surface mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
              Zugewiesene Bezirke
            </h2>
            <span className="dark:bg-dark-background-secondary dark:text-dark-muted rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
              {assignedBezirke.length} Bezirk
              {assignedBezirke.length !== 1 ? "e" : ""}
            </span>
          </div>

          {assignedBezirke.length === 0 ? (
            <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-100 bg-gray-50 p-6 text-center">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Keine Bezirke zugewiesen. Wähle unten Bezirke aus, um sie
                hinzuzufügen.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assignedBezirke.map((bezirk) => (
                <div
                  key={bezirk.id}
                  className="dark:border-dark-border flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="dark:bg-dark-background-secondary flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <span className="dark:text-dark-text font-semibold text-gray-700">
                        {bezirk.number}
                      </span>
                    </div>
                    <div>
                      <p className="dark:text-dark-text text-sm font-medium text-gray-900">
                        Bezirk {bezirk.number}
                      </p>
                      {bezirk.name && (
                        <p className="dark:text-dark-muted text-xs text-gray-500">
                          {bezirk.shortName || bezirk.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveBezirk(bezirk.id)}
                    disabled={saving}
                    className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Bezirk entfernen"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Bezirke */}
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
              Verfügbare Bezirke
            </h2>
            <span className="dark:bg-dark-background-secondary dark:text-dark-muted rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
              {availableBezirke.length} verfügbar
            </span>
          </div>

          {availableBezirke.length === 0 ? (
            <div className="dark:border-dark-border dark:bg-dark-background-secondary rounded-lg border border-gray-100 bg-gray-50 p-6 text-center">
              <p className="dark:text-dark-muted text-sm text-gray-600">
                Alle Bezirke wurden bereits zugewiesen.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableBezirke.map((bezirk) => (
                <button
                  key={bezirk.id}
                  type="button"
                  onClick={() => void handleAddBezirk(bezirk.id)}
                  disabled={saving}
                  className="dark:border-dark-border flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:border-green-300 hover:bg-green-50 disabled:opacity-50 dark:bg-gray-800 dark:hover:border-green-600 dark:hover:bg-green-900/20"
                >
                  <div className="dark:bg-dark-background-secondary flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <span className="dark:text-dark-text font-semibold text-gray-700">
                      {bezirk.number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="dark:text-dark-text text-sm font-medium text-gray-900">
                      Bezirk {bezirk.number}
                    </p>
                    {bezirk.name && (
                      <p className="dark:text-dark-muted text-xs text-gray-500">
                        {bezirk.shortName || bezirk.name}
                      </p>
                    )}
                  </div>
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/dashboard/posaunenwarte/${id}`}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Fertig
          </Link>
          <Link
            href="/dashboard/posaunenwarte"
            className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Zur Übersicht
          </Link>
        </div>
      </div>
    </main>
  );
}
