"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";
import { User, Image as ImageIcon, Trash2 } from "lucide-react";
import { Note } from "@/app/_components/programmheft/note";

/** Schaltflächen-Stimme des Programmhefts, wie auf der übrigen Settings-Seite. */
const BTN_OUTLINE =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night semi-condensed inline-flex min-h-12 items-center justify-center gap-2 border-2 px-6 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

interface ProfileImageUploadProps {
  currentImage?: {
    url: string;
    alt?: string | null;
  } | null;
  onImageUploaded: (mediaId: string) => void;
  onImageRemoved: () => void;
}

export default function ProfileImageUpload({
  currentImage,
  onImageUploaded,
  onImageRemoved,
}: ProfileImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    currentImage?.url ?? null,
  );
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMedia = api.media.create.useMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Nur JPEG, PNG und WebP Dateien sind erlaubt");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Die Datei ist zu groß. Maximale Größe: 5MB");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload fehlgeschlagen");
      }

      const data = await response.json();

      const extension = data.file.mimeType.split("/")[1] || "jpg";

      const media = await createMedia.mutateAsync({
        name: file.name,
        filename: data.file.filename,
        url: data.file.url,
        path: data.file.url,
        mimeType: data.file.mimeType,
        size: data.file.size,
        extension: extension,
        alt: "Profilbild",
        folder: "profiles",
        isPublic: false,
      });

      setPreview(data.file.url);
      onImageUploaded(media.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
      setPreview(currentImage?.url ?? null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onImageRemoved();
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
        {/* Image Preview */}
        <div className="bg-rule dark:bg-night-rule relative h-32 w-32 shrink-0 overflow-hidden rounded-full">
          {preview ? (
            <Image
              src={preview}
              alt={currentImage?.alt || "Profilbild"}
              fill
              className="object-cover"
              unoptimized={preview.startsWith("data:")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User
                className="text-dark dark:text-night-muted h-16 w-16"
                aria-hidden
              />
            </div>
          )}
          {uploading && (
            <div className="bg-ink/60 absolute inset-0 flex items-center justify-center">
              <div className="border-paper h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="w-full flex-1 sm:w-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleClick}
                disabled={uploading}
                className={`${BTN_OUTLINE} w-full sm:w-auto`}
              >
                <ImageIcon className="h-5 w-5" aria-hidden />
                {preview ? "Bild ändern" : "Bild hochladen"}
              </button>

              {preview && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={uploading}
                  className={`${BTN_OUTLINE} w-full sm:w-auto`}
                >
                  <Trash2 className="h-5 w-5" aria-hidden />
                  Entfernen
                </button>
              )}
            </div>

            <div className="text-dark dark:text-night-muted text-xs">
              <p>Empfohlen: Quadratisches Bild, mindestens 400x400 Pixel</p>
              <p>Erlaubte Formate: JPEG, PNG, WebP (max. 5MB)</p>
            </div>

            {error && (
              <Note tone="error">
                <p>{error}</p>
              </Note>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
