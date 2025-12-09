"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";
import { getErrorMessage } from "@/lib/utils";

const ALLOWED_ROLES: UserRole[] = [UserRole.ADMIN];

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

  const { data: bezirk, isLoading: bezirkLoading } =
    api.bezirke.getById.useQuery(
      { id: bezirkId },
      { enabled: !!bezirkId && !!session?.user },
    );

  const [number, setNumber] = useState(bezirk?.number ?? 1);
  const [name, setName] = useState(bezirk?.name ?? "");
  const [shortName, setShortName] = useState(bezirk?.shortName ?? "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (bezirk && !initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNumber(bezirk.number);
      setName(bezirk.name);
      setShortName(bezirk.shortName);
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

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/bezirke/${bezirkId}/edit`);
    }
  }, [session, sessionLoading, router, bezirkId]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!ALLOWED_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    updateMutation.mutate({
      id: bezirkId,
      number,
      name: name.trim(),
      shortName: shortName.trim(),
    });
  };

  if (sessionLoading || profileLoading || bezirkLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !ALLOWED_ROLES.includes(profile.role)) {
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
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Bezirk 01 - Unterer Niederrhein"
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
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. Unterer Niederrhein"
              />
            </div>

            {/* Preview */}
            <div className="dark:border-dark-border rounded-lg border border-gray-200 bg-gray-50 p-4 dark:bg-gray-800">
              <p className="dark:text-dark-muted mb-2 text-sm font-medium text-gray-600">
                Vorschau
              </p>
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
