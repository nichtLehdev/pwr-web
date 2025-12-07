"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import {
  PostCategory,
  ContentStatus,
  UserRole,
} from "~/generated/prisma/enums";
import RichTextEditor from "@/app/_components/editor/rich-text-editor";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { useToast } from "@/app/_components/ui/toast";

const categoryLabels: Record<PostCategory, string> = {
  MAGAZIN: "Magazin",
  EVENT: "Event",
  AUSBILDUNG: "Ausbildung",
  BEZIRKE: "Bezirke",
  ANDERE: "Andere",
};

// Roles that can create posts for any district and directly approve
const HIGHER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW, UserRole.RPW];

export default function NewPostPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  // Fetch user profile for role and bezirk
  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  // Determine user permissions
  const userRole = profile?.role ?? UserRole.USER;
  const isHigherRole = HIGHER_ROLES.includes(userRole);
  const userBezirkId = profile?.bezirkId ?? null;

  // Form state
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("MAGAZIN");
  const [bezirkId, setBezirkId] = useState<string>(() => {
    // Initialize with userBezirkId for non-higher roles when available
    return !isHigherRole && userBezirkId ? userBezirkId : "";
  });
  const [pinned, setPinned] = useState(false);
  const [coverImageId, setCoverImageId] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Submission state
  const [submitAsDraft, setSubmitAsDraft] = useState(false);
  const [submitAsApproved, setSubmitAsApproved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch bezirke
  const { data: bezirke } = api.bezirke.getAll.useQuery();

  // Create post mutation
  const createPostMutation = api.posts.create.useMutation({
    onSuccess: (post) => {
      toast.success("Beitrag erfolgreich erstellt");
      router.push(`/dashboard/posts/${post.id}`);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/posts/new");
    }
  }, [session, sessionLoading, router]);

  // Redirect if user doesn't have permission to create posts
  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      // Only OBLEUTE and higher can create posts
      const allowedRoles: UserRole[] = [
        UserRole.ADMIN,
        UserRole.LPW,
        UserRole.RPW,
        UserRole.OBLEUTE,
      ];
      const canCreatePosts = allowedRoles.includes(profile.role);

      if (!canCreatePosts) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [profile, profileLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Validation
    if (!title.trim()) {
      setError("Bitte gib einen Titel ein.");
      setIsSubmitting(false);
      return;
    }

    if (!content.trim()) {
      setError("Bitte gib einen Inhalt ein.");
      setIsSubmitting(false);
      return;
    }

    createPostMutation.mutate({
      title: title.trim(),
      excerpt: excerpt.trim() || undefined,
      content: content.trim(),
      category,
      bezirkId: bezirkId || undefined,
      pinned,
      coverImageId: coverImageId || undefined,
      status: submitAsDraft
        ? ContentStatus.DRAFT
        : submitAsApproved
          ? ContentStatus.APPROVED
          : ContentStatus.PENDING,
    });
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="dark:text-dark-muted dark:hover:text-primary hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href="/dashboard/posts"
                className="dark:text-dark-muted dark:hover:text-primary hover:text-primary text-gray-500"
              >
                Beiträge
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Neuer Beitrag</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Neuen Beitrag erstellen
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Erstelle einen neuen Beitrag für die Webseite
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Grundinformationen
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Titel *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Neues Bläserheft erschienen"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Kurzfassung
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  placeholder="Eine kurze Zusammenfassung des Beitrags (wird in Übersichten angezeigt)"
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                />
              </div>

              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Kategorie *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PostCategory)}
                  className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Cover Image */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Titelbild
            </h2>
            <div className="space-y-4">
              {coverImageUrl ? (
                <div className="relative">
                  <div className="dark:border-dark-border relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200">
                    <Image
                      src={coverImageUrl}
                      alt="Titelbild"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background-secondary rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      Bild ändern
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImageId(null);
                        setCoverImageUrl(null);
                      }}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Bild entfernen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="dark:border-dark-border hover:border-primary dark:hover:bg-dark-background-secondary flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:bg-gray-50"
                >
                  <svg
                    className="h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="dark:text-dark-text mt-2 text-sm font-medium text-gray-700">
                    Titelbild auswählen
                  </span>
                  <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Aus der Medienbibliothek auswählen oder neues Bild hochladen
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Content */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Inhalt
            </h2>
            <div className="space-y-4">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Beitragsinhalt *
                </label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Schreibe hier deinen Beitrag..."
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Nutze die Werkzeugleiste zur Formatierung. Unterstützt
                  Überschriften, Listen, Links, Bilder und mehr.
                </p>
              </div>
            </div>
          </section>

          {/* District */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Bezirk
            </h2>
            <div className="space-y-4">
              {!isHigherRole && userBezirkId ? (
                // Restricted users: show their assigned bezirk (locked)
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Dein Bezirk
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={
                        bezirke?.find((b) => b.id === userBezirkId)
                          ? `Bezirk ${bezirke.find((b) => b.id === userBezirkId)?.number} – ${bezirke.find((b) => b.id === userBezirkId)?.name}`
                          : "Wird geladen..."
                      }
                      disabled
                      className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-900 opacity-60"
                    />
                    <svg
                      className="h-5 w-5 shrink-0 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Du kannst nur Beiträge für deinen eigenen Bezirk erstellen.
                  </p>
                </div>
              ) : !isHigherRole && !userBezirkId ? (
                // Restricted users without bezirk assignment
                <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Hinweis:</strong> Du bist keinem Bezirk zugeordnet.
                    Der Beitrag wird ohne Bezirkszuordnung erstellt.
                  </p>
                </div>
              ) : (
                // Higher roles: full bezirk selection
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Bezirk auswählen
                  </label>
                  <select
                    value={bezirkId}
                    onChange={(e) => setBezirkId(e.target.value)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  >
                    <option value="">Übergreifend / Kein Bezirk</option>
                    {bezirke?.map((bezirk) => (
                      <option key={bezirk.id} value={bezirk.id}>
                        Bezirk {bezirk.number} – {bezirk.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Options for admins */}
          {(userRole === UserRole.ADMIN || userRole === UserRole.LPW) && (
            <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
                Admin-Optionen
              </h2>
              <div className="space-y-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="focus:ring-primary text-primary h-4 w-4 rounded border-gray-300"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    Beitrag anpinnen (wird ganz oben angezeigt)
                  </span>
                </label>
              </div>
            </section>
          )}

          {/* Submit Options */}
          <section className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
              Veröffentlichung
            </h2>
            <div className="space-y-4">
              {/* Status selection for higher roles */}
              {isHigherRole ? (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="submitStatus"
                      checked={!submitAsDraft && submitAsApproved}
                      onChange={() => {
                        setSubmitAsDraft(false);
                        setSubmitAsApproved(true);
                      }}
                      className="focus:ring-primary text-primary mt-0.5 h-4 w-4 border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
                        Direkt veröffentlichen
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Beitrag wird sofort auf der Webseite angezeigt.
                      </p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="submitStatus"
                      checked={!submitAsDraft && !submitAsApproved}
                      onChange={() => {
                        setSubmitAsDraft(false);
                        setSubmitAsApproved(false);
                      }}
                      className="focus:ring-primary text-primary mt-0.5 h-4 w-4 border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
                        Zur Prüfung einreichen
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Beitrag wird zur Prüfung durch einen Redakteur
                        eingereicht.
                      </p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="submitStatus"
                      checked={submitAsDraft}
                      onChange={() => {
                        setSubmitAsDraft(true);
                        setSubmitAsApproved(false);
                      }}
                      className="focus:ring-primary text-primary mt-0.5 h-4 w-4 border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
                        Als Entwurf speichern
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Beitrag wird noch nicht veröffentlicht und ist nur
                        für dich sichtbar.
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={submitAsDraft}
                      onChange={(e) => setSubmitAsDraft(e.target.checked)}
                      className="focus:ring-primary text-primary mt-0.5 h-4 w-4 rounded border-gray-300"
                    />
                    <div>
                      <span className="dark:text-dark-text font-medium text-gray-700">
                        Als Entwurf speichern
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Der Beitrag wird noch nicht zur Prüfung eingereicht und
                        ist nur für dich sichtbar.
                      </p>
                    </div>
                  </label>

                  {!submitAsDraft && (
                    <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Hinweis:</strong> Nach dem Erstellen wird der
                        Beitrag zur Prüfung eingereicht. Ein Redakteur wird den
                        Beitrag prüfen und freigeben.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/posts"
              className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || createPostMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting || createPostMutation.isPending
                ? "Wird erstellt..."
                : submitAsDraft
                  ? "Entwurf speichern"
                  : submitAsApproved
                    ? "Veröffentlichen"
                    : "Beitrag einreichen"}
            </button>
          </div>
        </form>

        {/* Media Picker Modal */}
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url, _alt, mediaId) => {
            setCoverImageUrl(url);
            setCoverImageId(mediaId ?? null);
            setShowMediaPicker(false);
          }}
        />
      </div>
    </main>
  );
}
