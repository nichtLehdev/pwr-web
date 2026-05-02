"use client";
import { Select } from "@/app/_components/ui";

import { useState, useEffect, useRef, startTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import { PostCategory, ContentStatus } from "~/generated/prisma/enums";
import RichTextEditor from "@/app/_components/editor/rich-text-editor";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import ImagePositionEditor from "@/app/_components/posts/image-position-editor";
import { useToast } from "@/app/_components/ui/toast";
import { ImageIcon, AlertTriangle, X } from "lucide-react";
import {
  DashboardFormZoneHeader,
  DashboardPage,
  DashboardSectionedFormLayout,
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

// Dashboard access is now controlled by permissions

export default function EditPostPage() {
  const router = useRouter();
  const toast = useToast();
  const params = useParams();
  const postId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, { enabled: !!session?.user });

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery(
    undefined,
    { enabled: !!session?.user?.id },
  );

  const hasDashboardAccess =
    Array.isArray(userPermissions) && userPermissions.length > 0;
  const hasApprovePermission =
    Array.isArray(userPermissions) &&
    userPermissions.some((perm: string) => perm === "posts.approve");
  const isHigherRole = hasApprovePermission;

  const { data: post, isLoading: postLoading } = api.posts.getById.useQuery(
    { id: postId },
    { enabled: !!postId && !!session?.user },
  );

  const [title, setTitle] = useState(post?.title ?? "");
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
  const hasRestoredRef = useRef(false);
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

  const formData = {
    title,
    excerpt,
    content,
    category,
    bezirkId,
    pinned,
    coverImageId,
    coverImagePositionX,
    coverImagePositionY,
    authorId,
    authorName,
    status,
  };

  const { restore, clear } = useAutosave(`post-${postId}-edit`, formData);

  const hasUnsavedChanges = originalDataRef.current
    ? JSON.stringify(formData) !== JSON.stringify(originalDataRef.current)
    : Boolean(title.trim() || excerpt.trim() || content.trim());

  useBeforeUnload(hasUnsavedChanges && !isSubmitting);

  useEffect(() => {
    if (!hasRestoredRef.current && !postLoading && !post) {
      const saved = restore();
      if (saved) {
        startTransition(() => {
          setTitle(saved.title || "");
          setExcerpt(saved.excerpt || "");
          setContent(saved.content || "");
          setCategory(saved.category || "MAGAZIN");
          setBezirkId(saved.bezirkId || "");
          setPinned(saved.pinned || false);
          setCoverImageId(saved.coverImageId || null);
          setCoverImagePositionX(saved.coverImagePositionX || null);
          setCoverImagePositionY(saved.coverImagePositionY || null);
          setAuthorId(saved.authorId || null);
          setAuthorName(saved.authorName || "");
          setStatus(saved.status || "DRAFT");
        });
      }
      hasRestoredRef.current = true;
    }
  }, [restore, postLoading, post]);

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
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/");
    }
  }, [profile, profileLoading, hasDashboardAccess, router]);

  useEffect(() => {
    if (post && profile && !hasRedirected.current) {
      const hasEditPermission =
        Array.isArray(userPermissions) &&
        userPermissions.some(
          (perm: string) => perm === "posts.edit" || perm === "posts.approve",
        );
      const canEdit =
        post.createdById === session?.user?.id || hasEditPermission;

      if (!canEdit) {
        hasRedirected.current = true;
        router.push(`/dashboard/posts/${postId}`);
      }
    }
  }, [post, profile, session, router, postId, userPermissions]);

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

  if (sessionLoading || profileLoading || postLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !post) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Beitrag nicht gefunden
          </h1>
          <Link
            href="/dashboard/posts"
            className="text-primary mt-4 inline-block hover:underline"
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
        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <DashboardSectionedFormLayout
            navItems={EDIT_POST_NAV_ITEMS}
            contentClassName="space-y-0"
          >
            {/* Basic Information */}
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
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z.B. Neues Bläserheft erschienen"
                    maxLength={200}
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
                    maxLength={500}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Kategorie *
                  </label>
                  <Select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as PostCategory)
                    }
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
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
              id="post-edit-media"
              className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
            >
              <DashboardFormZoneHeader
                step={2}
                title="Titelbild"
                description="Titelbild waehlen und Position anpassen."
              />
              <div className="space-y-4">
                {coverImageUrl ? (
                  <div className="relative">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
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
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        Bild ändern
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowImagePositionEditor(true)}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
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
                    className="dark:border-dark-border dark:hover:bg-dark-background-secondary flex w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 transition-colors hover:border-gray-400 hover:bg-gray-50"
                  >
                    <div className="text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <span className="dark:text-dark-muted mt-2 block text-sm font-medium text-gray-600">
                        Titelbild auswählen
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </section>

            {/* Content */}
            <section
              id="post-edit-content"
              className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
            >
              <DashboardFormZoneHeader
                step={3}
                title="Inhalt"
                description="Text und Medien im Beitrag aktualisieren."
              />
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
            <section
              id="post-edit-district"
              className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
            >
              <DashboardFormZoneHeader
                step={4}
                title="Bezirk"
                description="Bezirkszuordnung anpassen."
              />
              <div className="space-y-4">
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Bezirk auswählen
                  </label>
                  <Select
                    value={bezirkId}
                    onChange={(e) => setBezirkId(e.target.value)}
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  >
                    <option value="">Übergreifend / Kein Bezirk</option>
                    {bezirke?.map((bezirk) => (
                      <option key={bezirk.id} value={bezirk.id}>
                        Bezirk {bezirk.number} – {bezirk.shortName}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </section>

            {/* Author */}
            <section
              id="post-edit-author"
              className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
            >
              <DashboardFormZoneHeader
                step={5}
                title="Autor"
                description="Verknuepften oder benutzerdefinierten Autor setzen."
              />
              <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
                Optional: Wenn der Beitrag von jemand anderem geschrieben wurde
                oder du einen benutzerdefinierten Autorennamen verwenden
                möchtest.
              </p>
              <div className="space-y-4">
                <div className="author-dropdown-container relative">
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
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
                      className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 focus:ring-1 focus:outline-none"
                    />
                    {authorId && (
                      <button
                        type="button"
                        onClick={handleClearAuthor}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                      <div className="dark:border-dark-border dark:bg-dark-surface absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {filteredUsers.slice(0, 10).map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleAuthorSelect(user)}
                            className="dark:hover:bg-dark-background-secondary w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                          >
                            <div className="dark:text-dark-text font-medium text-gray-900">
                              {user.displayName || "Kein Name"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                <div className="relative">
                  <div className="dark:border-dark-border my-4 flex items-center gap-2 border-t border-gray-200">
                    <span className="dark:text-dark-muted dark:bg-dark-surface bg-white px-2 text-sm text-gray-500">
                      Oder
                    </span>
                  </div>
                </div>

                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
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
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-1 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Wenn kein Autor ausgewählt wird, wird der Ersteller des
                    Beitrags als Autor angezeigt.
                  </p>
                </div>
              </div>
            </section>

            {/* Options for users with approve permission */}
            {hasApprovePermission && (
              <section className="dark:border-dark-border border-t border-gray-200/80 pt-10">
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

            {/* Status section */}
            <section
              id="post-edit-status"
              className="dashboard-form-scroll-anchor dark:border-dark-border border-t border-gray-200/80 pt-10"
            >
              <DashboardFormZoneHeader
                step={6}
                title="Status"
                description="Pruef- und Veroeffentlichungsstatus festlegen."
              />

              {/* Notice for approved/rejected posts being edited */}
              {(post?.status === ContentStatus.APPROVED ||
                post?.status === ContentStatus.REJECTED) &&
                !isHigherRole && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          {post?.status === ContentStatus.APPROVED
                            ? "Hinweis zur erneuten Freigabe"
                            : "Hinweis zur erneuten Prüfung"}
                        </p>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
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
                    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
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
                        className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
                      />
                      <span className="dark:text-dark-text text-sm text-gray-700">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
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

            {/* Actions */}
            <div className="dark:border-dark-border mt-10 flex flex-col gap-3 border-t border-gray-200/80 pt-6 sm:flex-row sm:justify-end">
              <Link
                href={`/dashboard/posts/${postId}`}
                data-skip-warning
                onClick={() => clear()}
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-6 py-2.5 text-center font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Abbrechen
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || updatePostMutation.isPending}
                className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
              >
                {isSubmitting || updatePostMutation.isPending
                  ? "Wird gespeichert..."
                  : "Änderungen speichern"}
              </button>
            </div>
          </DashboardSectionedFormLayout>
        </form>
      </DashboardPage>
      {/* Media Picker Modal */}
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
    </>
  );
}
