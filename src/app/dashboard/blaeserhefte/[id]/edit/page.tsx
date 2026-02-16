"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { getErrorMessage } from "@/lib/utils";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import DownloadPickerModal from "@/app/_components/editor/download-picker-modal";
import { ImageIcon, MusicIcon, SaveIcon, XIcon } from "lucide-react";

export default function EditBlaeserheftPage() {
  const router = useRouter();
  const params = useParams();
  const heftId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageMaterials } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const { data: heft, isLoading: heftLoading } =
    api.materials.getBlaserheftById.useQuery(
      { id: heftId },
      { enabled: !!heftId && !!session?.user },
    );

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [description, setDescription] = useState("");
  const [chapters, setChapters] = useState("");
  const [highlights, setHighlights] = useState("");
  const [imageId, setImageId] = useState("");
  const [audioSample, setAudioSample] = useState("");
  const [priceBlaeserheft, setPriceBlaeserheft] = useState<number | "">("");
  const [priceBeiheft, setPriceBeiheft] = useState<number | "">("");
  const [priceTrompeten, setPriceTrompeten] = useState<number | "">("");
  const [priceCd, setPriceCd] = useState<number | "">("");
  const [availableBlaeserheft, setAvailableBlaeserheft] = useState(true);
  const [availableBeiheft, setAvailableBeiheft] = useState(true);
  const [availableTrompeten, setAvailableTrompeten] = useState(false);
  const [availableCd, setAvailableCd] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isDownloadPickerOpen, setIsDownloadPickerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [selectedImageAlt, setSelectedImageAlt] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (heft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(heft.title || "");
      setSubtitle(heft.subtitle || "");
      setYear(heft.year || new Date().getFullYear());
      setDescription(heft.description || "");
      setChapters(
        typeof heft.chapters === "string"
          ? heft.chapters
          : Array.isArray(heft.chapters)
            ? heft.chapters.join("\n")
            : "",
      );
      setHighlights(
        typeof heft.highlights === "string"
          ? heft.highlights
          : Array.isArray(heft.highlights)
            ? heft.highlights.join("\n")
            : "",
      );
      setImageId(heft.imageId || "");
      setSelectedImageUrl(heft.image?.url || "");
      setSelectedImageAlt(heft.image?.alt || "");
      setAudioSample(heft.audioSample || "");
      setPriceBlaeserheft(heft.priceBlaeserheft ?? "");
      setPriceBeiheft(heft.priceBeiheft ?? "");
      setPriceTrompeten(heft.priceTrompeten ?? "");
      setPriceCd(heft.priceCd ?? "");
      setAvailableBlaeserheft(heft.availableBlaeserheft);
      setAvailableBeiheft(heft.availableBeiheft);
      setAvailableTrompeten(heft.availableTrompeten);
      setAvailableCd(heft.availableCd);
      setSortOrder(heft.sortOrder || 0);
    }
  }, [heft]);

  const utils = api.useUtils();

  const updateMutation = api.materials.updateBlaserheft.useMutation({
    onSuccess: async () => {
      await utils.materials.getBlaserhefte.invalidate();
      await utils.materials.getBlaserheftById.invalidate({ id: heftId });
      toast.success("Bläserheft erfolgreich aktualisiert");
      router.push(`/dashboard/blaeserhefte/${heftId}`);
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
      router.push(`/login?callbackUrl=/dashboard/blaeserhefte/${heftId}/edit`);
    }
  }, [session, sessionLoading, router, heftId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !canManageMaterials &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageMaterials, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    updateMutation.mutate({
      id: heftId,
      title: title.trim(),
      subtitle: subtitle.trim(),
      year,
      description: description.trim(),
      chapters: chapters.trim() || undefined,
      highlights: highlights.trim() || undefined,
      imageId,
      audioSample: audioSample.trim() || null,
      priceBlaeserheft: priceBlaeserheft === "" ? undefined : priceBlaeserheft,
      priceBeiheft: priceBeiheft === "" ? undefined : priceBeiheft,
      priceTrompeten: priceTrompeten === "" ? undefined : priceTrompeten,
      priceCd: priceCd === "" ? undefined : priceCd,
      availableBlaeserheft,
      availableBeiheft,
      availableTrompeten,
      availableCd,
      sortOrder,
    });
  };

  if (sessionLoading || profileLoading || heftLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageMaterials) {
    return null;
  }

  if (!heft) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Bläserheft nicht gefunden
          </h1>
          <Link
            href="/dashboard/blaeserhefte"
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
                href="/dashboard/blaeserhefte"
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                Bläserhefte
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li>
              <Link
                href={`/dashboard/blaeserhefte/${heftId}`}
                className="hover:text-primary dark:text-dark-muted dark:hover:text-primary text-gray-500"
              >
                {heft.title}
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Bearbeiten</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
            Bläserheft bearbeiten
          </h1>
          <p className="dark:text-dark-muted mt-2 text-gray-600">
            Bearbeite die Informationen des Bläserhefts
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
            {/* Basic Info */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Titel *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Bläserheft 2024"
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Untertitel *
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  required
                  maxLength={200}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Heft 75"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Jahr *
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || 0)}
                  required
                  min={1900}
                  max={2100}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Sortierung
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Beschreibung *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={5000}
                rows={4}
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="Beschreibung des Bläserhefts..."
              />
            </div>

            {/* Image Selection */}
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Titelbild *
              </label>
              <div className="flex items-start gap-4">
                {selectedImageUrl ? (
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border">
                    <Image
                      src={selectedImageUrl}
                      alt={selectedImageAlt || "Titelbild"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="dark:bg-dark-background-secondary dark:text-dark-muted flex h-24 w-20 shrink-0 items-center justify-center rounded-lg border bg-gray-100 text-gray-400">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsMediaPickerOpen(true)}
                  className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Bild auswählen
                </button>
              </div>
            </div>

            {/* Chapters and Highlights */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Kapitel (eine pro Zeile)
                </label>
                <textarea
                  value={chapters}
                  onChange={(e) => setChapters(e.target.value)}
                  rows={5}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Kapitel 1&#10;Kapitel 2&#10;..."
                />
              </div>
              <div>
                <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                  Highlights (eines pro Zeile)
                </label>
                <textarea
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  rows={5}
                  className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Highlight 1&#10;Highlight 2&#10;..."
                />
              </div>
            </div>

            {/* Audio Sample */}
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Hörprobe
              </label>
              <div className="flex items-center gap-4">
                {audioSample ? (
                  <div className="dark:bg-dark-background-secondary flex flex-1 items-center gap-3 rounded-lg bg-gray-100 px-3 py-2">
                    <MusicIcon className="h-5 w-5 shrink-0" />
                    <span className="dark:text-dark-text min-w-0 flex-1 truncate text-sm text-gray-700">
                      {audioSample.split("/").pop() || audioSample}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAudioSample("")}
                      className="dark:text-dark-muted shrink-0 text-gray-400 hover:text-red-500"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span className="dark:text-dark-muted text-sm text-gray-500">
                    Keine Hörprobe ausgewählt
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsDownloadPickerOpen(true)}
                  className="dark:border-dark-border dark:text-dark-text shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {audioSample ? "Ändern" : "Auswählen"}
                </button>
              </div>
            </div>

            {/* Prices */}
            <div>
              <h3 className="dark:text-dark-text mb-3 text-lg font-medium text-gray-900">
                Preise (in Euro)
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="dark:text-dark-muted mb-1 block text-sm text-gray-600">
                    Bläserheft
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceBlaeserheft}
                    onChange={(e) =>
                      setPriceBlaeserheft(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="dark:text-dark-muted mb-1 block text-sm text-gray-600">
                    Beiheft
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceBeiheft}
                    onChange={(e) =>
                      setPriceBeiheft(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="dark:text-dark-muted mb-1 block text-sm text-gray-600">
                    Trompetenstimmen
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceTrompeten}
                    onChange={(e) =>
                      setPriceTrompeten(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="dark:text-dark-muted mb-1 block text-sm text-gray-600">
                    CD
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceCd}
                    onChange={(e) =>
                      setPriceCd(
                        e.target.value === "" ? "" : parseFloat(e.target.value),
                      )
                    }
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Availability */}
            <div>
              <h3 className="dark:text-dark-text mb-3 text-lg font-medium text-gray-900">
                Verfügbarkeit
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={availableBlaeserheft}
                    onChange={(e) => setAvailableBlaeserheft(e.target.checked)}
                    className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    Bläserheft
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={availableBeiheft}
                    onChange={(e) => setAvailableBeiheft(e.target.checked)}
                    className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    Beiheft
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={availableTrompeten}
                    onChange={(e) => setAvailableTrompeten(e.target.checked)}
                    className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    Trompetenstimmen
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={availableCd}
                    onChange={(e) => setAvailableCd(e.target.checked)}
                    className="text-primary h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="dark:text-dark-text text-sm text-gray-700">
                    CD
                  </span>
                </label>
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
                  <SaveIcon className="h-4 w-4" />
                  Speichern
                </>
              )}
            </button>
            <Link
              href={`/dashboard/blaeserhefte/${heftId}`}
              className="dark:border-dark-border dark:text-dark-text inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
          </div>
        </form>
      </div>

      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(url, alt, mediaId) => {
          if (mediaId) {
            setImageId(mediaId);
          }
          setSelectedImageUrl(url);
          setSelectedImageAlt(alt);
          setIsMediaPickerOpen(false);
        }}
      />

      <DownloadPickerModal
        isOpen={isDownloadPickerOpen}
        onClose={() => setIsDownloadPickerOpen(false)}
        onSelect={(title, url) => {
          setAudioSample(url);
          setIsDownloadPickerOpen(false);
        }}
      />
    </main>
  );
}
