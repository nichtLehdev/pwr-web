"use client";

import { useState, useEffect, useMemo, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { districtFieldState } from "@/lib/district-scope";
import {
  DashboardFormZoneHeader,
  DashboardPage,
  DashboardSectionedFormLayout,
  DraftRestorePrompt,
  SlugField,
  type DashboardSectionNavItem,
} from "@/app/_components/dashboard";
import { getErrorMessage } from "@/lib/utils";
import { slugify } from "@/lib/slug";
import { PostCategory, ContentStatus } from "~/generated/prisma/enums";
import RichTextEditor from "@/app/_components/editor/rich-text-editor-lazy";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import ImagePositionEditor from "@/app/_components/posts/image-position-editor";
import { useToast } from "@/app/_components/ui/toast";
import { ImageIcon, Lock, X } from "lucide-react";
import { useAutosave } from "@/lib/useAutosave";
import { useBeforeUnload } from "@/lib/useBeforeUnload";
import { Button, Input, Label, Textarea, Select } from "@/app/_components/ui";

const NEW_POST_NAV_ITEMS: DashboardSectionNavItem[] = [
  { href: "#post-form-basic", label: "Grundlagen" },
  { href: "#post-form-media", label: "Titelbild" },
  { href: "#post-form-content", label: "Inhalt" },
  { href: "#post-form-district", label: "Bezirk" },
  { href: "#post-form-author", label: "Autor" },
  { href: "#post-form-publish", label: "Veröffentlichung" },
];

const categoryLabels: Record<PostCategory, string> = {
  MAGAZIN: "Magazin",
  EVENT: "Event",
  AUSBILDUNG: "Ausbildung",
  BEZIRKE: "Bezirke",
  ANDERE: "Andere",
};

// Dashboard access is now controlled by permissions

export default function NewPostPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const { hasDashboardAccess, hasPermission } = usePermissions();

  const hasApprovePermission = hasPermission(PERMISSIONS.POSTS_APPROVE);
  const hasCreatePermission = hasPermission(PERMISSIONS.POSTS_CREATE);
  const isHigherRole = hasApprovePermission;
  const scopedBezirkIds = profile?.bezirkScopes?.map((s) => s.bezirkId) ?? [];
  // Zuständigkeit statt Zugehörigkeit: `profile.bezirkId` sagt, wo jemand im
  // Werk verortet ist (und trägt öffentlich ein Amt), nicht wofür er schreiben
  // darf. Beides zu vermischen hieße, für eine einzelne Ausnahme ein Amt zu
  // vergeben.
  const { lockedBezirkId, hasNoDistrict, selectableBezirkIds } =
    districtFieldState(isHigherRole, scopedBezirkIds);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("MAGAZIN");
  const [bezirkId, setBezirkId] = useState<string>(() => {
    return !isHigherRole && lockedBezirkId ? lockedBezirkId : "";
  });
  const [pinned, setPinned] = useState(false);
  const [coverImageId, setCoverImageId] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImagePositionX, setCoverImagePositionX] = useState<number | null>(
    null,
  );
  const [coverImagePositionY, setCoverImagePositionY] = useState<number | null>(
    null,
  );
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showImagePositionEditor, setShowImagePositionEditor] = useState(false);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>("");
  const [authorSearch, setAuthorSearch] = useState("");
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  const [submitAsDraft, setSubmitAsDraft] = useState(false);
  const [submitAsApproved, setSubmitAsApproved] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formData = useMemo(
    () => ({
      title,
      slug,
      excerpt,
      content,
      category,
      bezirkId,
      pinned,
      coverImageId,
      coverImageUrl,
      coverImagePositionX,
      coverImagePositionY,
      authorId,
      authorName,
      authorSearch,
      submitAsDraft,
      submitAsApproved,
    }),
    [
      title,
      slug,
      excerpt,
      content,
      category,
      bezirkId,
      pinned,
      coverImageId,
      coverImageUrl,
      coverImagePositionX,
      coverImagePositionY,
      authorId,
      authorName,
      authorSearch,
      submitAsDraft,
      submitAsApproved,
    ],
  );

  const { pendingDraft, restoreDraft, discardDraft, clear, storageFailed } =
    useAutosave({
      name: "post-new",
      data: formData,
      userId: session?.user?.id,
      ready: !sessionLoading && !profileLoading,
    });

  const hasUnsavedChanges = Boolean(
    title.trim() || excerpt.trim() || content.trim(),
  );
  useBeforeUnload(hasUnsavedChanges && !isSubmitting);

  const handleRestoreDraft = () => {
    const saved = restoreDraft();
    if (!saved) return;
    startTransition(() => {
      setTitle(saved.title || "");
      setSlug(saved.slug || "");
      setExcerpt(saved.excerpt || "");
      setContent(saved.content || "");
      setCategory(saved.category || "MAGAZIN");
      setBezirkId(saved.bezirkId || "");
      setPinned(saved.pinned || false);
      setCoverImageId(saved.coverImageId || null);
      setCoverImageUrl(saved.coverImageUrl || null);
      setCoverImagePositionX(saved.coverImagePositionX || null);
      setCoverImagePositionY(saved.coverImagePositionY || null);
      setAuthorId(saved.authorId || null);
      setAuthorName(saved.authorName || "");
      setAuthorSearch(saved.authorSearch || "");
      setSubmitAsDraft(saved.submitAsDraft || false);
      setSubmitAsApproved(saved.submitAsApproved || false);
    });
  };

  const { data: bezirke } = api.bezirke.getAll.useQuery();
  const selectableBezirke = selectableBezirkIds
    ? (bezirke?.filter((b) => selectableBezirkIds.includes(b.id)) ?? [])
    : (bezirke ?? []);
  const { data: users } = api.users.list.useQuery(
    { page: 1, limit: 100 },
    { enabled: !!session?.user },
  );

  const filteredUsers = users?.users.filter((user) => {
    if (!authorSearch.trim()) return true;
    const searchLower = authorSearch.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const handleAuthorSelect = (user: {
    id: string;
    displayName: string | null;
    email: string;
  }) => {
    setAuthorId(user.id);
    setAuthorName("");
    setAuthorSearch(user.displayName || user.email);
    setShowAuthorDropdown(false);
  };

  const handleClearAuthor = () => {
    setAuthorId(null);
    setAuthorName("");
    setAuthorSearch("");
  };

  const createPostMutation = api.posts.create.useMutation({
    onSuccess: (post) => {
      clear();
      toast.success("Beitrag erfolgreich erstellt");
      router.push(`/dashboard/posts/${post.id}`);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/posts/new");
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      // Nicht nur "irgendein Dashboard-Recht": ohne das Anlage-Recht lehnt der
      // Server ab, das Formular soll gar nicht erst aufgehen.
      if (!hasDashboardAccess || !hasCreatePermission) {
        hasRedirected.current = true;
        router.push("/dashboard");
      }
    }
  }, [
    profile,
    profileLoading,
    router,
    hasDashboardAccess,
    hasCreatePermission,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".author-dropdown-container")) {
        setShowAuthorDropdown(false);
      }
    };

    if (showAuthorDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showAuthorDropdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

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
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
      content: content.trim(),
      category,
      bezirkId: bezirkId || undefined,
      pinned,
      coverImageId: coverImageId || undefined,
      coverImagePositionX: coverImagePositionX,
      coverImagePositionY: coverImagePositionY,
      authorId: authorId || null,
      authorName: authorName.trim() || null,
      status: submitAsDraft
        ? ContentStatus.DRAFT
        : submitAsApproved
          ? ContentStatus.APPROVED
          : ContentStatus.PENDING,
    });
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardPage
      title="Neuer Beitrag"
      description="Erstelle einen neuen Beitrag für die Webseite"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Beiträge", href: "/dashboard/posts" },
        { label: "Neuer Beitrag" },
      ]}
      maxWidth="7xl"
    >
      <DraftRestorePrompt
        draft={pendingDraft}
        onRestore={handleRestoreDraft}
        onDiscard={discardDraft}
        storageFailed={storageFailed}
      />

      {/* Error Message */}
      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <DashboardSectionedFormLayout
          navItems={NEW_POST_NAV_ITEMS}
          contentClassName="space-y-0"
        >
          {/* Basic Information */}
          <section
            id="post-form-basic"
            className="dashboard-form-scroll-anchor"
          >
            <DashboardFormZoneHeader
              step={1}
              title="Grundlagen"
              description="Titel, Kurzfassung und Kategorie des Beitrags."
            />
            <div className="space-y-4">
              <div>
                <Label required>Titel</Label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Neues Bläserheft erschienen"
                  maxLength={200}
                  required
                />
              </div>

              <SlugField
                value={slug}
                onChange={setSlug}
                autoSlug={slugify(title)}
                basePath="/aktuelles/"
              />

              <div>
                <Label>Kurzfassung</Label>
                <Textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  placeholder="Eine kurze Zusammenfassung des Beitrags (wird in Übersichten angezeigt)"
                  maxLength={500}
                />
              </div>

              <div>
                <Label htmlFor="post-category" required>
                  Kategorie
                </Label>
                <Select
                  id="post-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PostCategory)}
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          {/* Cover Image */}
          <section
            id="post-form-media"
            className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
          >
            <DashboardFormZoneHeader
              step={2}
              title="Titelbild"
              description="Optionales Bild fuer Vorschau und Header."
            />
            <div className="space-y-4">
              {coverImageUrl ? (
                <div className="relative">
                  <div className="border-rule dark:border-night-rule relative aspect-video w-full overflow-hidden border">
                    <Image
                      src={coverImageUrl}
                      alt="Titelbild"
                      fill
                      className="object-cover"
                      style={{
                        objectPosition:
                          coverImagePositionX !== null &&
                          coverImagePositionY !== null
                            ? `${coverImagePositionX}% ${coverImagePositionY}%`
                            : undefined,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      variant="outline"
                      size="sm"
                    >
                      Bild ändern
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowImagePositionEditor(true)}
                      variant="outline"
                      size="sm"
                    >
                      Position anpassen
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setCoverImageId(null);
                        setCoverImageUrl(null);
                        setCoverImagePositionX(null);
                        setCoverImagePositionY(null);
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Bild entfernen
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="border-ink dark:border-night-text hover:border-primary dark:hover:bg-night-raised hover:bg-rule/25 flex min-h-11 w-full flex-col items-center justify-center border-2 border-dashed p-8 transition-colors"
                >
                  <ImageIcon className="text-dark dark:text-night-muted h-12 w-12" />
                  <span className="text-ink dark:text-night-text mt-2 text-sm font-medium">
                    Titelbild auswählen
                  </span>
                  <span className="text-dark dark:text-night-muted mt-1 text-xs">
                    Aus der Medienbibliothek auswählen oder neues Bild hochladen
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Content */}
          <section
            id="post-form-content"
            className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
          >
            <DashboardFormZoneHeader
              step={3}
              title="Inhalt"
              description="Hauptinhalt des Beitrags mit Editor."
            />
            <div className="space-y-4">
              <div>
                <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                  Beitragsinhalt *
                </label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Schreibe hier deinen Beitrag..."
                />
                <p className="text-dark dark:text-night-muted mt-2 text-xs">
                  Nutze die Werkzeugleiste zur Formatierung. Unterstützt
                  Überschriften, Listen, Links, Bilder und mehr.
                </p>
              </div>
            </div>
          </section>

          {/* District */}
          <section
            id="post-form-district"
            className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
          >
            <DashboardFormZoneHeader
              step={4}
              title="Bezirk"
              description="Ordne den Beitrag einem Bezirk oder uebergreifend zu."
            />
            <div className="space-y-4">
              {!isHigherRole && lockedBezirkId ? (
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Dein Bezirk
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={
                        bezirke?.find((b) => b.id === lockedBezirkId)
                          ? `Bezirk ${bezirke.find((b) => b.id === lockedBezirkId)?.number} – ${bezirke.find((b) => b.id === lockedBezirkId)?.name}`
                          : "Wird geladen..."
                      }
                      disabled
                      className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-rule/25 text-ink block w-full cursor-not-allowed border px-3 py-2 opacity-60"
                    />
                    <Lock className="text-dark dark:text-night-muted h-5 w-5 shrink-0" />
                  </div>
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Du kannst nur Beiträge für deinen eigenen Bezirk erstellen.
                  </p>
                </div>
              ) : hasNoDistrict ? (
                <div className="bg-yellow-50 p-4 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Hinweis:</strong> Du bist keinem Bezirk zugeordnet.
                    Der Beitrag wird ohne Bezirkszuordnung erstellt.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Bezirk auswählen
                  </label>
                  <Select
                    value={bezirkId}
                    onChange={(e) => setBezirkId(e.target.value)}
                  >
                    {selectableBezirkIds === null && (
                      <option value="">Übergreifend / Kein Bezirk</option>
                    )}
                    {selectableBezirke.map((bezirk) => (
                      <option key={bezirk.id} value={bezirk.id}>
                        Bezirk {bezirk.number} – {bezirk.shortName}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </section>

          {/* Author */}
          <section
            id="post-form-author"
            className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
          >
            <DashboardFormZoneHeader
              step={5}
              title="Autor"
              description="Optionalen Autor verknuepfen oder Namen setzen."
            />
            <p className="text-dark dark:text-night-muted mb-4 text-sm">
              Optional: Wenn der Beitrag von jemand anderem geschrieben wurde
              oder du einen benutzerdefinierten Autorennamen verwenden möchtest.
            </p>
            <div className="space-y-4">
              <div className="author-dropdown-container relative">
                <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                  Autor suchen (Benutzer verknüpfen)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={authorSearch}
                    onChange={(e) => {
                      setAuthorSearch(e.target.value);
                      setShowAuthorDropdown(true);
                      if (!e.target.value) {
                        setAuthorId(null);
                        setAuthorName("");
                      }
                    }}
                    onFocus={() => setShowAuthorDropdown(true)}
                    placeholder="Name oder E-Mail eingeben..."
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2 pr-10"
                  />
                  {authorId && (
                    <button
                      type="button"
                      onClick={handleClearAuthor}
                      className="text-dark dark:text-night-muted hover:text-ink dark:hover:text-night-text absolute top-1/2 right-3 -translate-y-1/2"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* User Dropdown */}
                {showAuthorDropdown &&
                  authorSearch &&
                  filteredUsers &&
                  filteredUsers.length > 0 && (
                    <div className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper absolute z-10 mt-1 max-h-60 w-full overflow-auto border">
                      {filteredUsers.slice(0, 10).map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleAuthorSelect(user)}
                          className="hover:bg-rule/25 dark:hover:bg-night-rule w-full px-4 py-2 text-left text-sm transition-colors"
                        >
                          <div className="text-ink dark:text-night-text font-medium">
                            {user.displayName || "Kein Name"}
                          </div>
                          <div className="text-dark dark:text-night-muted text-xs">
                            {user.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>

              <div className="relative">
                <div className="border-rule dark:border-night-rule my-4 flex items-center gap-2 border-t">
                  <span className="text-dark dark:text-night-muted dark:bg-night bg-paper px-2 text-sm">
                    Oder
                  </span>
                </div>
              </div>

              <div>
                <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                  Benutzerdefinierter Autorenname
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => {
                    setAuthorName(e.target.value);
                    if (e.target.value) {
                      setAuthorId(null);
                      setAuthorSearch("");
                    }
                  }}
                  placeholder="z.B. Redaktionsteam, Pressestelle..."
                  maxLength={200}
                  className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                />
                <p className="text-dark dark:text-night-muted mt-1 text-xs">
                  Wenn kein Autor ausgewählt wird, wird der Ersteller des
                  Beitrags als Autor angezeigt.
                </p>
              </div>
            </div>
          </section>

          {/* Options for users with approve permission */}
          {hasApprovePermission && (
            <section className="border-rule dark:border-night-rule border-t pt-10">
              <h2 className="text-ink dark:text-night-text mb-4 text-lg font-semibold">
                Admin-Optionen
              </h2>
              <div className="space-y-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                    className="text-primary border-ink dark:border-night-text h-4 w-4"
                  />
                  <span className="text-ink dark:text-night-text text-sm">
                    Beitrag anpinnen (wird ganz oben angezeigt)
                  </span>
                </label>
              </div>
            </section>
          )}

          {/* Submit Options */}
          <section
            id="post-form-publish"
            className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
          >
            <DashboardFormZoneHeader
              step={6}
              title="Veröffentlichung"
              description="Speichern, einreichen oder direkt veröffentlichen."
            />
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
                      className="text-primary border-ink dark:border-night-text mt-0.5 h-4 w-4"
                    />
                    <div>
                      <span className="text-ink dark:text-night-text font-medium">
                        Direkt veröffentlichen
                      </span>
                      <p className="text-dark dark:text-night-muted text-sm">
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
                      className="text-primary border-ink dark:border-night-text mt-0.5 h-4 w-4"
                    />
                    <div>
                      <span className="text-ink dark:text-night-text font-medium">
                        Zur Prüfung einreichen
                      </span>
                      <p className="text-dark dark:text-night-muted text-sm">
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
                      className="text-primary border-ink dark:border-night-text mt-0.5 h-4 w-4"
                    />
                    <div>
                      <span className="text-ink dark:text-night-text font-medium">
                        Als Entwurf speichern
                      </span>
                      <p className="text-dark dark:text-night-muted text-sm">
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
                      className="text-primary border-ink dark:border-night-text mt-0.5 h-4 w-4"
                    />
                    <div>
                      <span className="text-ink dark:text-night-text font-medium">
                        Als Entwurf speichern
                      </span>
                      <p className="text-dark dark:text-night-muted text-sm">
                        Der Beitrag wird noch nicht zur Prüfung eingereicht und
                        ist nur für dich sichtbar.
                      </p>
                    </div>
                  </label>

                  {!submitAsDraft && (
                    <div className="bg-blue-50 p-3 dark:bg-blue-900/20">
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
          <div className="border-rule dark:border-night-rule mt-10 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/posts"
              data-skip-warning
              onClick={() => clear()}
              className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-6 py-2.5 text-center font-medium transition-colors"
            >
              Abbrechen
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || createPostMutation.isPending}
              isLoading={isSubmitting || createPostMutation.isPending}
            >
              {submitAsDraft
                ? "Entwurf speichern"
                : submitAsApproved
                  ? "Veröffentlichen"
                  : "Beitrag einreichen"}
            </Button>
          </div>
        </DashboardSectionedFormLayout>
      </form>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url, _alt, mediaId, focalPointX, focalPointY) => {
          setCoverImageUrl(url);
          setCoverImageId(mediaId ?? null);
          setCoverImagePositionX(focalPointX ?? null);
          setCoverImagePositionY(focalPointY ?? null);
          setShowMediaPicker(false);
        }}
      />

      {/* Image Position Editor */}
      {showImagePositionEditor && coverImageUrl && (
        <ImagePositionEditor
          imageUrl={coverImageUrl}
          positionX={coverImagePositionX}
          positionY={coverImagePositionY}
          onPositionChange={(x, y) => {
            setCoverImagePositionX(x);
            setCoverImagePositionY(y);
          }}
          onClose={() => setShowImagePositionEditor(false)}
        />
      )}
    </DashboardPage>
  );
}
