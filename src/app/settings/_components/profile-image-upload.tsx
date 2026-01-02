"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";
import { User, Image as ImageIcon, Trash2 } from "lucide-react";

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
      <div className="flex items-start gap-6">
        {/* Image Preview */}
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
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
              <User className="text-primary h-16 w-16" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />

          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClick}
                disabled={uploading}
                className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text dark:hover:bg-dark-background inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:outline-none disabled:opacity-50"
              >
                <ImageIcon className="h-5 w-5" />
                {preview ? "Bild ändern" : "Bild hochladen"}
              </button>

              {preview && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-500 dark:hover:bg-red-900/50"
                >
                  <Trash2 className="h-5 w-5" />
                  Entfernen
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>Empfohlen: Quadratisches Bild, mindestens 400x400 Pixel</p>
              <p>Erlaubte Formate: JPEG, PNG, WebP (max. 5MB)</p>
            </div>

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                <p className="text-sm text-red-800 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
