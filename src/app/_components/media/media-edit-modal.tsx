"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import {
  Button,
  Input,
  Label,
  Textarea,
  Checkbox,
  Badge,
} from "@/app/_components/ui";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import { CropIcon, DownloadIcon } from "lucide-react";
import ImageCropEditor from "@/app/_components/posts/image-crop-editor";
import { splitMediaTags } from "@/lib/media-tags";
import { FocalPointPicker } from "./focal-point-picker";
import { useMediaDownload } from "./use-media-download";
import { useReplaceMediaFile } from "./use-replace-media-file";
import {
  formatDate,
  formatFileSize,
  getMimeTypeIcon,
  getMimeTypeLabel,
  statusColors,
  statusLabels,
  type MediaItem,
} from "./media-shared";

/**
 * Der Formularzustand, wie ihn der Dialog beim Öffnen aus dem Medium zieht.
 * Strings bleiben Strings — die Umwandlung leerer Felder zu `null` passiert
 * erst beim Speichern, damit die Eingabe sich normal bedienen lässt.
 */
type EditForm = {
  name: string;
  alt: string;
  title: string;
  caption: string;
  copyright: string;
  creator: string;
  tags: string;
  isPublic: boolean;
  focalPointX: number | null;
  focalPointY: number | null;
};

function toForm(media: MediaItem): EditForm {
  return {
    name: media.name,
    alt: media.alt ?? "",
    title: media.title ?? "",
    caption: media.caption ?? "",
    copyright: media.copyright ?? "",
    creator: media.creator ?? "",
    tags: media.tags.join(", "),
    isPublic: media.isPublic,
    focalPointX: media.focalPointX,
    focalPointY: media.focalPointY,
  };
}

export function MediaEditModal({
  media,
  onClose,
}: {
  media: MediaItem;
  onClose: () => void;
}) {
  const toast = useToast();
  const utils = api.useUtils();
  const { downloadOne } = useMediaDownload();

  const [form, setForm] = useState<EditForm>(() => toForm(media));
  const [error, setError] = useState("");
  const [isCropping, setIsCropping] = useState(false);

  /**
   * Der Zuschnitt läuft *über* diesem Dialog, nicht an seiner Stelle: „Abbrechen“
   * im Zuschneide-Fenster führt damit zurück ins Formular, und die bereits
   * getippten Angaben stehen noch da.
   */
  const { replace, isBusy: isReplacing } = useReplaceMediaFile(() => {
    setIsCropping(false);
    // Der Server verwirft den Fokuspunkt beim Ersetzen — er zeigte auf einen
    // Ausschnitt, den es nicht mehr gibt. Das Formular muss mitziehen, sonst
    // schriebe „Speichern“ den alten Punkt wieder zurück.
    setForm((current) => ({
      ...current,
      focalPointX: null,
      focalPointY: null,
    }));
  });

  const updateMutation = api.media.update.useMutation({
    onSuccess: () => {
      void utils.media.getAll.invalidate();
      void utils.media.getStatistics.invalidate();
      toast.success("Änderungen gespeichert");
      onClose();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
      toast.error(mutationError.message);
    },
  });

  const isImage = media.mimeType.startsWith("image/");

  const set = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSave = () => {
    const name = form.name.trim();
    if (!name) {
      setError("Der Name darf nicht leer sein.");
      return;
    }

    updateMutation.mutate({
      id: media.id,
      name,
      // `|| null` statt `|| undefined`: ein geleertes Feld soll die Spalte
      // leeren. Mit `undefined` ließe Prisma den alten Wert stehen, und der
      // Dialog meldete eine Änderung, die nie stattgefunden hat.
      alt: form.alt.trim() || null,
      title: form.title.trim() || null,
      caption: form.caption.trim() || null,
      copyright: form.copyright.trim() || null,
      creator: form.creator.trim() || null,
      tags: splitMediaTags(form.tags),
      isPublic: form.isPublic,
      focalPointX: form.focalPointX,
      focalPointY: form.focalPointY,
    });
  };

  return (
    <ScrollableModal onClose={isCropping ? undefined : onClose}>
      <ScrollableModalCard maxW="4xl">
        <ScrollableModalHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
              Medium bearbeiten
            </h2>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[media.status]}`}
            >
              {statusLabels[media.status]}
            </span>
          </div>
        </ScrollableModalHeader>

        <ScrollableModalBody>
          {/* Links das Bild samt Werkzeugen, rechts die Metadaten: das
              Formular ist der eigentliche Zweck des Dialogs und bekommt die
              Spalte, die nicht scrollen muss. */}
          <div className="grid gap-6 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <div className="space-y-3">
              {isImage ? (
                <FocalPointPicker
                  url={media.url}
                  alt={media.alt ?? media.name}
                  x={form.focalPointX}
                  y={form.focalPointY}
                  onChange={({ x, y }) =>
                    setForm((current) => ({
                      ...current,
                      focalPointX: x,
                      focalPointY: y,
                    }))
                  }
                />
              ) : (
                <div className="dark:border-dark-border flex aspect-video items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-5xl dark:bg-gray-800">
                  {getMimeTypeIcon(media.mimeType)}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {isImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCropping(true)}
                  >
                    <CropIcon className="mr-1.5 h-4 w-4" />
                    Zuschneiden
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadOne(media)}
                >
                  <DownloadIcon className="mr-1.5 h-4 w-4" />
                  Herunterladen
                </Button>
              </div>

              <dl className="dark:text-dark-muted space-y-1 text-xs text-gray-500">
                <div className="flex justify-between gap-4">
                  <dt>Typ</dt>
                  <dd>{getMimeTypeLabel(media.mimeType)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Größe</dt>
                  <dd className="tabular-nums">
                    {formatFileSize(media.size)}
                    {media.width && media.height
                      ? ` · ${media.width}×${media.height}`
                      : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Hochgeladen</dt>
                  <dd>{formatDate(media.createdAt)}</dd>
                </div>
                {media.uploadedBy && (
                  <div className="flex justify-between gap-4">
                    <dt>Von</dt>
                    <dd className="truncate">{media.uploadedBy.displayName}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt>Dateiname</dt>
                  <dd className="truncate font-mono" title={media.filename}>
                    {media.filename}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="mediaName" required>
                  Name
                </Label>
                <Input
                  id="mediaName"
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  error={!form.name.trim()}
                />
                <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                  Interne Bezeichnung in der Medienübersicht und im Download.
                </p>
              </div>

              <div>
                <Label htmlFor="mediaAlt">Alt-Text</Label>
                <Input
                  id="mediaAlt"
                  value={form.alt}
                  onChange={(event) => set("alt", event.target.value)}
                  placeholder="Beschreibung für Screenreader"
                />
              </div>

              <div>
                <Label htmlFor="mediaTitle">Titel</Label>
                <Input
                  id="mediaTitle"
                  value={form.title}
                  onChange={(event) => set("title", event.target.value)}
                  placeholder="Anzeigetitel"
                />
              </div>

              <div>
                <Label htmlFor="mediaCaption">Bildunterschrift</Label>
                <Textarea
                  id="mediaCaption"
                  rows={2}
                  value={form.caption}
                  onChange={(event) => set("caption", event.target.value)}
                  placeholder="Optionale Bildunterschrift"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="mediaCopyright">Copyright</Label>
                  <Input
                    id="mediaCopyright"
                    value={form.copyright}
                    onChange={(event) => set("copyright", event.target.value)}
                    placeholder="z. B. © 2025 Posaunenwerk"
                  />
                </div>
                <div>
                  <Label htmlFor="mediaCreator">Fotograf:in</Label>
                  <Input
                    id="mediaCreator"
                    value={form.creator}
                    onChange={(event) => set("creator", event.target.value)}
                    placeholder="Name der Urheberin"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="mediaTags">Tags</Label>
                <Input
                  id="mediaTags"
                  value={form.tags}
                  onChange={(event) => set("tags", event.target.value)}
                  placeholder="Kommagetrennte Tags"
                />
                {splitMediaTags(form.tags).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {splitMediaTags(form.tags).map((tag) => (
                      <Badge key={tag} size="sm" variant="default">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="mediaIsPublic"
                  checked={form.isPublic}
                  onChange={(event) => set("isPublic", event.target.checked)}
                />
                <Label htmlFor="mediaIsPublic" className="mb-0">
                  Öffentlich sichtbar
                </Label>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </div>
        </ScrollableModalBody>

        <ScrollableModalFooter>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending || isReplacing}
              isLoading={updateMutation.isPending}
            >
              Speichern
            </Button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>

      {isCropping && (
        <ImageCropEditor
          imageUrl={media.url}
          onClose={() => setIsCropping(false)}
          onCropComplete={(blob, filename, width, height) =>
            replace(media.id, blob, filename, width, height)
          }
        />
      )}
    </ScrollableModal>
  );
}
