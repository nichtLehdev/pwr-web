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
import DownloadPickerModal from "@/app/_components/editor/download-picker-modal";
import { ImageIcon, MusicIcon, SaveIcon, XIcon } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Textarea,
} from "@/app/_components/ui";

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

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageMaterials = hasPermission(
    PERMISSIONS.DOWNLOADS_MANAGE_BLAESERHEFTE,
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
      !permissionsLoading &&
      !canManageMaterials &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageMaterials, router]);

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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageMaterials) {
    return null;
  }

  if (!heft) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Bläserheft nicht gefunden
          </h1>
          <Link
            href="/dashboard/blaeserhefte"
            className="link-ink mt-4 inline-block"
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
        title="Bläserheft bearbeiten"
        description="Bearbeite die Informationen des Bläserhefts"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bläserhefte", href: "/dashboard/blaeserhefte" },
          { label: heft.title, href: `/dashboard/blaeserhefte/${heftId}` },
          { label: "Bearbeiten" },
        ]}
        maxWidth="7xl"
      >
        {/* Error */}
        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label required>Titel</Label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="z.B. Bläserheft 2024"
                  />
                </div>
                <div>
                  <Label required>Untertitel</Label>
                  <Input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="z.B. Heft 75"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label required>Jahr</Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value) || 0)}
                    required
                    min={1900}
                    max={2100}
                  />
                </div>
                <div>
                  <Label>Sortierung</Label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) =>
                      setSortOrder(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div>
                <Label required>Beschreibung</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  maxLength={5000}
                  rows={4}
                  placeholder="Beschreibung des Bläserhefts..."
                />
              </div>

              {/* Image Selection */}
              <div>
                <Label required>Titelbild</Label>
                <div className="flex items-start gap-4">
                  {selectedImageUrl ? (
                    <div className="border-rule dark:border-night-rule relative h-24 w-20 shrink-0 overflow-hidden border">
                      <Image
                        src={selectedImageUrl}
                        alt={selectedImageAlt || "Titelbild"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="border-rule dark:border-night-rule bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-24 w-20 shrink-0 items-center justify-center border">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <Button
                    type="button"
                    onClick={() => setIsMediaPickerOpen(true)}
                    variant="outline"
                    size="sm"
                  >
                    Bild auswählen
                  </Button>
                </div>
              </div>

              {/* Chapters and Highlights */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>Kapitel (eine pro Zeile)</Label>
                  <Textarea
                    value={chapters}
                    onChange={(e) => setChapters(e.target.value)}
                    rows={5}
                    placeholder="Kapitel 1&#10;Kapitel 2&#10;..."
                  />
                </div>
                <div>
                  <Label>Highlights (eines pro Zeile)</Label>
                  <Textarea
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    rows={5}
                    placeholder="Highlight 1&#10;Highlight 2&#10;..."
                  />
                </div>
              </div>

              {/* Audio Sample */}
              <div>
                <Label>Hörprobe</Label>
                <div className="flex items-center gap-4">
                  {audioSample ? (
                    <div className="bg-rule/25 dark:bg-night-raised flex flex-1 items-center gap-3 px-3 py-2">
                      <MusicIcon className="h-5 w-5 shrink-0" />
                      <span className="text-ink dark:text-night-text min-w-0 flex-1 truncate text-sm">
                        {audioSample.split("/").pop() || audioSample}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAudioSample("")}
                        className="text-dark dark:text-night-muted shrink-0 hover:text-red-600"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-dark dark:text-night-muted text-sm">
                      Keine Hörprobe ausgewählt
                    </span>
                  )}
                  <Button
                    type="button"
                    onClick={() => setIsDownloadPickerOpen(true)}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {audioSample ? "Ändern" : "Auswählen"}
                  </Button>
                </div>
              </div>

              {/* Prices */}
              <div>
                <h3 className="condensed text-ink dark:text-night-text mb-3 text-lg font-bold">
                  Preise (in Euro)
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label>Bläserheft</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceBlaeserheft}
                      onChange={(e) =>
                        setPriceBlaeserheft(
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value),
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Beiheft</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceBeiheft}
                      onChange={(e) =>
                        setPriceBeiheft(
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value),
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Trompetenstimmen</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceTrompeten}
                      onChange={(e) =>
                        setPriceTrompeten(
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value),
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>CD</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceCd}
                      onChange={(e) =>
                        setPriceCd(
                          e.target.value === ""
                            ? ""
                            : parseFloat(e.target.value),
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div>
                <h3 className="condensed text-ink dark:text-night-text mb-3 text-lg font-bold">
                  Verfügbarkeit
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={availableBlaeserheft}
                      onChange={(e) =>
                        setAvailableBlaeserheft(e.target.checked)
                      }
                    />
                    <span className="text-ink dark:text-night-text text-sm">
                      Bläserheft
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={availableBeiheft}
                      onChange={(e) => setAvailableBeiheft(e.target.checked)}
                    />
                    <span className="text-ink dark:text-night-text text-sm">
                      Beiheft
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={availableTrompeten}
                      onChange={(e) => setAvailableTrompeten(e.target.checked)}
                    />
                    <span className="text-ink dark:text-night-text text-sm">
                      Trompetenstimmen
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={availableCd}
                      onChange={(e) => setAvailableCd(e.target.checked)}
                    />
                    <span className="text-ink dark:text-night-text text-sm">
                      CD
                    </span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              <SaveIcon className="h-4 w-4" />
              Speichern
            </Button>
            <Link
              href={`/dashboard/blaeserhefte/${heftId}`}
              className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 transition-colors"
            >
              Abbrechen
            </Link>
          </div>
        </form>
      </DashboardPage>
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
    </>
  );
}
