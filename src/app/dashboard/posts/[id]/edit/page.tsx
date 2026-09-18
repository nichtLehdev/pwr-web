"use client";
import { Select } from "@/app/_components/ui";

import { useState, useEffect, useMemo, useRef, startTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import type { PermissionKey } from "@/lib/permissions";
import { districtFieldState } from "@/lib/district-scope";
import { getErrorMessage } from "@/lib/utils";
import { slugify } from "@/lib/slug";
import { PostCategory, ContentStatus } from "~/generated/prisma/enums";
import RichTextEditor from "@/app/_components/editor/rich-text-editor-lazy";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import ImagePositionEditor from "@/app/_components/posts/image-position-editor";
import { useToast } from "@/app/_components/ui/toast";
import { ImageIcon, AlertTriangle, Lock, X } from "lucide-react";
import {
  DashboardFormZoneHeader,
  DashboardPage,
  DashboardSectionedFormLayout,
  DraftRestorePrompt,
  SlugField,
  type DashboardSectionNavItem,
} from "@/app/_components/dashboard";
import { useAutosave } from "@/lib/useAutosave";
import { useBeforeUnload } from "@/lib/useBeforeUnload";

const categoryLabels: Record<PostCategory, string> = {
  MAGAZIN: "Magazin",
  EVENT: "Event",
  AUSBILDUNG: "Ausbildung",
  BEZIRKE: "Bezirke",
  ANDERE: "Andere",
};

const statusLabels: Record<ContentStatus, string> = {
  DRAFT: "Entwurf",
  PENDING: "Zur Prüfung",
  APPROVED: "Veröffentlicht",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

const EDIT_POST_NAV_ITEMS: DashboardSectionNavItem[] = [
  { href: "#post-edit-basic", label: "Grundlagen" },
  { href: "#post-edit-media", label: "Titelbild" },
  { href: "#post-edit-content", label: "Inhalt" },
  { href: "#post-edit-district", label: "Bezirk" },
  { href: "#post-edit-author", label: "Autor" },
  { href: "#post-edit-status", label: "Status" },
];

export default function EditPostPage() {
  const router = useRouter();
  const toast = useToast();
  const params = useParams();
  const postId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const {
    hasDashboardAccess,
    hasPermission,
    isLoading: permissionsLoading,
  } = usePermissions();

  const hasApprovePermission = hasPermission("posts.approve" as PermissionKey);
  const isHigherRole = hasApprovePermission;
  const scopedBezirkIds = profile?.bezirkScopes?.map((s) => s.bezirkId) ?? [];
  // Zuständigkeit (bezirkScopes), nicht Zugehörigkeit (`profile.bezirkId`, trägt
  // öffentlich ein Amt) entscheidet, wofür jemand schreiben darf.
  const { selectableBezirkIds } = districtFieldState(
    isHigherRole,
    scopedBezirkIds,
  );

  const { data: post, isLoading: postLoading } = api.posts.getById.useQuery(
    { id: postId },
    { enabled: !!postId && !!session?.user },
  );

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [category, setCategory] = useState<PostCategory>(
    post?.category ?? "MAGAZIN",
  );
  const [bezirkId, setBezirkId] = useState<string>(post?.bezirkId ?? "");
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const [coverImageId, setCoverImageId] = useState<string | null>(
    post?.coverImageId ?? null,
  );
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    post?.coverImage?.url ?? null,
  );
  const [coverImagePositionX, setCoverImagePositionX] = useState<number | null>(
    post?.coverImagePositionX ?? null,
  );
  const [coverImagePositionY, setCoverImagePositionY] = useState<number | null>(
    post?.coverImagePositionY ?? null,
  );

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [showImagePositionEditor, setShowImagePositionEditor] = useState(false);
  const [authorId, setAuthorId] = useState<string | null>(
    post?.authorId ?? null,
  );
  const [authorName, setAuthorName] = useState<string>(post?.authorName ?? "");
  const [authorSearch, setAuthorSearch] = useState(() => {
    if (post?.author) {
      return post.author.displayName || post.author.email || "";
    }
    return "";
  });
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  const initializedFromPost = useRef(false);

  const [status, setStatus] = useState<ContentStatus>(post?.status ?? "DRAFT");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Erst wenn die Serverdaten in den Feldern stehen, darf der Autosave laufen. */
  const [formInitialized, setFormInitialized] = useState(false);
  const originalDataRef = useRef<{
    title: string;
    excerpt: string;
    content: string;
    category: PostCategory;
    bezirkId: string;
    pinned: boolean;
    coverImageId: string | null;
    coverImagePositionX: number | null;
    coverImagePositionY: number | null;
    authorId: string | null;
    authorName: string;
    status: ContentStatus;
  } | null>(null);

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
      status,
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
      status,
    ],
  );

  const { pendingDraft, restoreDraft, discardDraft, clear, storageFailed } =
    useAutosave({
      name: `post-${postId}-edit`,
      data: formData,
      userId: session?.user?.id,
      ready: formInitialized,
    });

  const hasUnsavedChanges = originalDataRef.current
    ? JSON.stringify(formData) !== JSON.stringify(originalDataRef.current)
    : Boolean(title.trim() || excerpt.trim() || content.trim());

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
      setStatus(saved.status || "DRAFT");
    });
  };

  useEffect(() => {
    if (post && initializedFromPost.current && !originalDataRef.current) {
      originalDataRef.current = {
        title: post.title || "",
        excerpt: post.excerpt || "",
        content: post.content || "",
        category: post.category || "MAGAZIN",
        bezirkId: post.bezirkId || "",
        pinned: post.pinned || false,
        coverImageId: post.coverImageId || null,
        coverImagePositionX: post.coverImagePositionX || null,
        coverImagePositionY: post.coverImagePositionY || null,
        authorId: post.authorId || null,
        authorName: post.authorName || "",
        status: post.status || "DRAFT",
      };
    }
  }, [post]);

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

  useEffect(() => {
    if (post && !initializedFromPost.current) {
      setTitle(post.title || "");
      setSlug(post.slug ?? "");
      setExcerpt(post.excerpt || "");
      setContent(post.content || "");
      setCategory(post.category || "MAGAZIN");
      setBezirkId(post.bezirkId || "");
      setPinned(post.pinned || false);
      setCoverImageId(post.coverImageId || null);
      setCoverImageUrl(post.coverImage?.url || null);
      setCoverImagePositionX(post.coverImagePositionX || null);
      setCoverImagePositionY(post.coverImagePositionY || null);
      setStatus(post.status || "DRAFT");

      if (post.author && post.author.id !== authorId) {
        setAuthorId(post.author.id);
        setAuthorSearch(post.author.displayName || post.author.email || "");
      } else if (post.authorName && !authorId && !authorName) {
        setAuthorName(post.authorName);
        setAuthorSearch(post.authorName);
      }
      initializedFromPost.current = true;
      setFormInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  const utils = api.useUtils();

  const updatePostMutation = api.posts.update.useMutation({
    onSuccess: async () => {
      clear();
      await utils.posts.getById.invalidate({ id: postId });
      toast.success("Änderungen gespeichert");
      router.push(`/dashboard/posts/${postId}`);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/posts/${postId}/edit`);
    }
  }, [session, sessionLoading, router, postId]);

  useEffect(() => {
    if (!permissionsLoading && !hasDashboardAccess && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [permissionsLoading, hasDashboardAccess, router]);

  useEffect(() => {
    if (post && profile && !hasRedirected.current) {
      const hasEditPermission =
        hasPermission("posts.edit" as PermissionKey) ||
        hasPermission("posts.approve" as PermissionKey);
      const canEdit =
        post.createdById === session?.user?.id || hasEditPermission;

      if (!canEdit) {
        hasRedirected.current = true;
        router.push(`/dashboard/posts/${postId}`);
      }
    }
  }, [post, profile, session, router, postId, hasPermission]);

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

    let finalStatus = status;
    if (
      (post?.status === ContentStatus.APPROVED &&
        status === ContentStatus.APPROVED) ||
      (post?.status === ContentStatus.REJECTED &&
        status === ContentStatus.REJECTED)
    ) {
      finalStatus = ContentStatus.PENDING;
    }

    updatePostMutation.mutate({
      id: postId,
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
      content: content.trim(),
      category,
      bezirkId: bezirkId || null,
      coverImageId: coverImageId || null,
      coverImagePositionX: coverImagePositionX,
      coverImagePositionY: coverImagePositionY,
      pinned,
      status: finalStatus,
      authorId: authorId || null,
      authorName: authorName.trim() || null,
    });
  };

  if (sessionLoading || profileLoading || permissionsLoading || postLoading) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !post) {
    return (
      <div className="dark:bg-night bg-paper flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Beitrag nicht gefunden
          </h1>
          <Link
            href="/dashboard/posts"
            className="text-primary-ink dark:text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardPage
        title="Beitrag bearbeiten"
        description="Bearbeite die Details des Beitrags"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Beiträge", href: "/dashboard/posts" },
          { label: post.title, href: `/dashboard/posts/${postId}` },
          { label: "Bearbeiten" },
        ]}
        maxWidth="7xl"
      >
        <DraftRestorePrompt
          draft={pendingDraft}
          onRestore={handleRestoreDraft}
          onDiscard={discardDraft}
          storageFailed={storageFailed}
        />

        {error && (
          <div className="mb-6 bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <DashboardSectionedFormLayout
            navItems={EDIT_POST_NAV_ITEMS}
            contentClassName="space-y-0"
          >
            <section
              id="post-edit-basic"
              className="dashboard-form-scroll-anchor"
            >
              <DashboardFormZoneHeader
                step={1}
                title="Grundlagen"
                description="Titel, Kurzfassung und Kategorie bearbeiten."
              />
              <div className="space-y-4">
                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z.B. Neues Bläserheft erschienen"
                    maxLength={200}
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                    required
                  />
                </div>

                <SlugField
                  value={slug}
                  onChange={setSlug}
                  autoSlug={slugify(title)}
                  basePath="/aktuelles/"
                  currentSlug={post?.slug}
                />

                <div>
                  <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                    Kurzfassung
                  </label>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    rows={2}
                    placeholder="Eine kurze Zusammenfassung des Beitrags (wird in Übersichten angezeigt)"
                    maxLength={500}
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text text-ink bg-paper block w-full border px-3 py-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor="post-category"
                    className="text-ink dark:text-night-text mb-1 block text-sm font-medium"
                  >
                    Kategorie *
                  </label>
                  <Select
                    id="post-category"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as PostCategory)
                    }
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

            <section
              id="post-edit-media"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <DashboardFormZoneHeader
                step={2}
                title="Titelbild"
                description="Titelbild waehlen und Position anpassen."
              />
              <div className="space-y-4">
                {coverImageUrl ? (
                  <div className="relative">
                    <div className="dark:bg-night-raised bg-rule/25 relative aspect-video w-full overflow-hidden">
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
                      <button
                        type="button"
                        onClick={() => setIsMediaPickerOpen(true)}
                        className="text-primary-ink dark:text-primary text-sm font-medium hover:underline"
                      >
                        Bild ändern
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowImagePositionEditor(true)}
                        className="text-primary-ink dark:text-primary text-sm font-medium hover:underline"
                      >
                        Position anpassen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageId(null);
                          setCoverImageUrl(null);
                          setCoverImagePositionX(null);
                          setCoverImagePositionY(null);
                        }}
                        className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        Bild entfernen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsMediaPickerOpen(true)}
                    className="border-ink dark:border-night-text dark:hover:bg-night-raised hover:border-primary hover:bg-rule/25 flex min-h-11 w-full items-center justify-center border-2 border-dashed px-6 py-8 transition-colors"
                  >
                    <div className="text-center">
                      <ImageIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
                      <span className="text-dark dark:text-night-muted mt-2 block text-sm font-medium">
                        Titelbild auswählen
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </section>

            <section
              id="post-edit-content"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <DashboardFormZoneHeader
                step={3}
                title="Inhalt"
                description="Text und Medien im Beitrag aktualisieren."
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

            <section
              id="post-edit-district"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <DashboardFormZoneHeader
                step={4}
                title="Bezirk"
                description="Bezirkszuordnung anpassen."
              />
              <div className="space-y-4">
                {selectableBezirkIds !== null &&
                selectableBezirke.length < 2 ? (
                  <div>
                    <label className="text-ink dark:text-night-text mb-1 block text-sm font-medium">
                      Dein Bezirk
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={
                          !bezirke
                            ? "Wird geladen..."
                            : bezirke.find((b) => b.id === bezirkId)
                              ? `Bezirk ${bezirke.find((b) => b.id === bezirkId)?.number} – ${bezirke.find((b) => b.id === bezirkId)?.name}`
                              : "Übergreifend / Kein Bezirk"
                        }
                        disabled
                        className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-rule/25 text-ink block w-full cursor-not-allowed border px-3 py-2 opacity-60"
                      />
                      <Lock className="text-dark dark:text-night-muted h-5 w-5 shrink-0" />
                    </div>
                    <p className="text-dark dark:text-night-muted mt-1 text-xs">
                      Du kannst Beiträge nur deinem eigenen Bezirk zuordnen.
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

            <section
              id="post-edit-author"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <DashboardFormZoneHeader
                step={5}
                title="Autor"
                description="Verknuepften oder benutzerdefinierten Autor setzen."
              />
              <p className="text-dark dark:text-night-muted mb-4 text-sm">
                Optional: Wenn der Beitrag von jemand anderem geschrieben wurde
                oder du einen benutzerdefinierten Autorennamen verwenden
                möchtest.
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

            <section
              id="post-edit-status"
              className="dashboard-form-scroll-anchor border-rule dark:border-night-rule border-t pt-10"
            >
              <DashboardFormZoneHeader
                step={6}
                title="Status"
                description="Pruef- und Veroeffentlichungsstatus festlegen."
              />

              {(post?.status === ContentStatus.APPROVED ||
                post?.status === ContentStatus.REJECTED) &&
                !isHigherRole && (
                  <div className="border-ink dark:border-night-text mb-4 border-l-2 py-2 pl-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="dark:text-night-text text-ink mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="dark:text-night-text text-ink font-medium">
                          {post?.status === ContentStatus.APPROVED
                            ? "Hinweis zur erneuten Freigabe"
                            : "Hinweis zur erneuten Prüfung"}
                        </p>
                        <p className="text-dark dark:text-night-muted mt-1 text-sm">
                          {post?.status === ContentStatus.APPROVED
                            ? "Dieser Beitrag ist bereits freigegeben. Nach dem Speichern wird er erneut zur Prüfung eingereicht und muss wieder freigegeben werden."
                            : "Dieser Beitrag wurde abgelehnt. Nach dem Speichern wird er erneut zur Prüfung eingereicht."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {isHigherRole ? (
                <div className="space-y-3">
                  {((post?.status === ContentStatus.APPROVED &&
                    status === ContentStatus.APPROVED) ||
                    (post?.status === ContentStatus.REJECTED &&
                      status === ContentStatus.REJECTED)) && (
                    <p className="text-dark dark:text-night-muted mb-3 text-sm">
                      Hinweis: Bei Änderungen wird der Status automatisch auf
                      &quot;Ausstehend&quot; zurückgesetzt, es sei denn, du
                      wählst einen anderen Status.
                    </p>
                  )}
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <input
                        type="radio"
                        name="status"
                        checked={status === value}
                        onChange={() => setStatus(value as ContentStatus)}
                        className="text-primary border-ink dark:border-night-text h-4 w-4"
                      />
                      <span className="text-ink dark:text-night-text text-sm">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-dark dark:text-night-muted text-sm">
                  Aktueller Status:{" "}
                  <span className="font-medium">
                    {statusLabels[post?.status ?? ContentStatus.DRAFT]}
                  </span>
                  {(post?.status === ContentStatus.APPROVED ||
                    post?.status === ContentStatus.REJECTED) && (
                    <span className="ml-1">
                      → wird zu &quot;Ausstehend&quot;
                    </span>
                  )}
                </p>
              )}
            </section>

            <div className="border-rule dark:border-night-rule mt-10 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Link
                href={`/dashboard/posts/${postId}`}
                data-skip-warning
                onClick={() => clear()}
                className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-6 py-2.5 text-center font-medium transition-colors"
              >
                Abbrechen
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || updatePostMutation.isPending}
                className="bg-primary hover:bg-primary-dark text-ink min-h-11 px-6 py-2.5 font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting || updatePostMutation.isPending
                  ? "Wird gespeichert..."
                  : "Änderungen speichern"}
              </button>
            </div>
          </DashboardSectionedFormLayout>
        </form>
      </DashboardPage>
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(url, _alt, mediaId, focalPointX, focalPointY) => {
          setCoverImageUrl(url);
          setCoverImageId(mediaId || null);
          setCoverImagePositionX(focalPointX ?? null);
          setCoverImagePositionY(focalPointY ?? null);
          setIsMediaPickerOpen(false);
        }}
      />

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
    </>
  );
}
