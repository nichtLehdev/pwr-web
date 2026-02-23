"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/app/_components/ui";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

/** Returns a data URL of the cropped region scaled to fit inside maxW x maxH (for previews). */
function getCroppedPreviewDataUrl(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  maxW: number,
  maxH: number,
): string | null {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const x = Math.round(pixelCrop.x * scaleX);
  const y = Math.round(pixelCrop.y * scaleY);
  const w = Math.round(pixelCrop.width * scaleX);
  const h = Math.round(pixelCrop.height * scaleY);
  if (w <= 0 || h <= 0) return null;

  const scale = Math.min(maxW / w, maxH / h, 1);
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, x, y, w, h, 0, 0, outW, outH);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function getCroppedImageBlob(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  mimeType: string = "image/jpeg",
): Promise<{ blob: Blob; width: number; height: number }> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const x = Math.round(pixelCrop.x * scaleX);
  const y = Math.round(pixelCrop.y * scaleY);
  const w = Math.round(pixelCrop.width * scaleX);
  const h = Math.round(pixelCrop.height * scaleY);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("No canvas context"));

  ctx.drawImage(image, x, y, w, h, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve({ blob, width: w, height: h })
          : reject(new Error("toBlob failed")),
      mimeType,
      0.92,
    );
  });
}

interface ImageCropEditorProps {
  imageUrl: string;
  /** Called with the cropped image blob, suggested filename, and dimensions. Caller should upload and then e.g. replace media. */
  onCropComplete: (
    blob: Blob,
    suggestedFilename: string,
    width: number,
    height: number,
  ) => void;
  onClose: () => void;
  /** Optional fixed aspect ratio, e.g. 16/9 or 1 for square. */
  aspect?: number;
}

export default function ImageCropEditor({
  imageUrl,
  onCropComplete,
  onClose,
  aspect,
}: ImageCropEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<{
    avatar: string | null;
    cover: string | null;
    card: string | null;
  }>({ avatar: null, cover: null, card: null });

  useEffect(() => {
    if (
      !imgRef.current ||
      !completedCrop ||
      completedCrop.width === 0 ||
      completedCrop.height === 0
    ) {
      setPreviews({ avatar: null, cover: null, card: null });
      return;
    }
    const img = imgRef.current;
    const avatar = getCroppedPreviewDataUrl(img, completedCrop, 96, 96);
    const cover = getCroppedPreviewDataUrl(img, completedCrop, 320, 180);
    const card = getCroppedPreviewDataUrl(img, completedCrop, 240, 160);
    setPreviews({
      avatar: avatar ?? null,
      cover: cover ?? null,
      card: card ?? null,
    });
  }, [completedCrop]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const cropInit = aspect
        ? makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height)
        : centerCrop({ unit: "%", width: 90, height: 90 }, width, height);
      setCrop(cropInit);
      setCompletedCrop(convertToPixelCrop(cropInit, width, height));
    },
    [aspect],
  );

  const handleSave = async () => {
    if (
      !imgRef.current ||
      !completedCrop ||
      completedCrop.width === 0 ||
      completedCrop.height === 0
    ) {
      setError("Bitte einen Zuschnitt auswählen.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const { blob, width, height } = await getCroppedImageBlob(
        imgRef.current,
        completedCrop,
        "image/jpeg",
      );
      const ext = imageUrl.includes(".png") ? "png" : "jpg";
      const name = `cropped-${Date.now()}.${ext}`;
      onCropComplete(blob, name, width, height);
      // Parent is responsible for closing (e.g. after upload + replace)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Zuschnitt konnte nicht erstellt werden.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollableModal className="bg-black/80">
      <ScrollableModalCard maxW="4xl" className="dark:bg-dark-surface">
        <ScrollableModalHeader className="dark:border-dark-border border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
              Bild zuschneiden
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Schließen"
            >
              <svg
                className="h-6 w-6"
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
        </ScrollableModalHeader>

        <ScrollableModalBody className="p-0">
          <div className="dark:border-dark-border border-b border-gray-200 bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Ziehe den Rahmen, um den gewünschten Ausschnitt zu wählen. Mit
              Speichern wird das Bild durch den zugeschnittenen Bereich ersetzt.
            </p>
          </div>

          <div className="p-6">
            <div className="dark:border-dark-border relative max-h-[70vh] overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-100 dark:bg-gray-800">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                className="max-h-[70vh]"
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Zuschneiden"
                  style={{
                    maxHeight: "70vh",
                    width: "100%",
                    objectFit: "contain",
                  }}
                  onLoad={onImageLoad}
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            </div>

            {/* Desktop preview: how crop looks as Avatar, Cover, Card */}
            <div className="dark:border-dark-border mt-6 hidden border-t border-gray-200 pt-6 md:block">
              <p className="dark:text-dark-text mb-3 text-sm font-medium text-gray-700">
                Vorschau (Desktop)
              </p>
              <div className="grid grid-cols-3 gap-6">
                <div className="flex flex-col items-center gap-2">
                  <p className="dark:text-dark-muted text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Profilbild
                  </p>
                  <div className="dark:bg-dark-background-secondary dark:ring-dark-border flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
                    {previews.avatar ? (
                      <img
                        src={previews.avatar}
                        alt="Profilbild-Vorschau"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="dark:text-dark-muted text-xs text-gray-400">
                        …
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="dark:text-dark-muted text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Cover
                  </p>
                  <div className="dark:bg-dark-background-secondary dark:ring-dark-border flex h-[4.5rem] w-40 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                    {previews.cover ? (
                      <img
                        src={previews.cover}
                        alt="Cover-Vorschau"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="dark:text-dark-muted text-xs text-gray-400">
                        …
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="dark:text-dark-muted text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Kartenvorschau
                  </p>
                  <div className="dark:bg-dark-background-secondary dark:ring-dark-border flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
                    {previews.card ? (
                      <img
                        src={previews.card}
                        alt="Karten-Vorschau"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="dark:text-dark-muted text-xs text-gray-400">
                        …
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
        </ScrollableModalBody>

        <ScrollableModalFooter>
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!completedCrop || isSaving}
            >
              {isSaving ? "Wird gespeichert…" : "Zuschnitt speichern"}
            </Button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
