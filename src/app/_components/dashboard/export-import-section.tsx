"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { UserRole } from "~/generated/prisma/enums";

const ExportImportIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
);

const ArrowDownIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const ArrowUpIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

type ContentType =
  | "posts"
  | "events"
  | "courses"
  | "ensembles"
  | "media"
  | "downloads"
  | "blaeserhefte";

interface ExportImportSectionProps {
  userRole: UserRole;
}

export default function ExportImportSection({
  userRole,
}: ExportImportSectionProps) {
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Export utils
  const utils = api.useUtils();

  // Import mutations
  const importPosts = api.posts.importPosts.useMutation();
  const importEvents = api.events.importEvents.useMutation();
  const importCourses = api.courses.importCourses.useMutation();
  const importEnsembles = api.ensembles.importEnsembles.useMutation();
  const importMedia = api.media.importMedia.useMutation();
  const importDownloads = api.materials.importDownloads.useMutation();
  const importBlaeserhefte = api.materials.importBlaeserhefte.useMutation();

  if (userRole !== UserRole.ADMIN) {
    return null;
  }

  const contentTypeLabels: Record<ContentType, string> = {
    posts: "Beiträge",
    events: "Termine",
    courses: "Kurse",
    ensembles: "Ensembles",
    media: "Medien",
    downloads: "Downloads",
    blaeserhefte: "Bläserhefte",
  };

  const handleExport = async (type: ContentType) => {
    try {
      let data: unknown;
      let filename: string;

      switch (type) {
        case "posts":
          data = await utils.posts.exportPosts.fetch();
          filename = `posts-export-${new Date().toISOString().split("T")[0]}.json`;
          break;
        case "events":
          data = await utils.events.exportEvents.fetch();
          filename = `events-export-${new Date().toISOString().split("T")[0]}.json`;
          break;
        case "courses":
          data = await utils.courses.exportCourses.fetch();
          filename = `courses-export-${new Date().toISOString().split("T")[0]}.json`;
          break;
        case "ensembles":
          data = await utils.ensembles.exportEnsembles.fetch();
          filename = `ensembles-export-${new Date().toISOString().split("T")[0]}.json`;
          break;
        case "media":
          data = await utils.media.exportMedia.fetch();
          filename = `media-export-${new Date().toISOString().split("T")[0]}.json`;
          break;
        case "downloads":
          data = await utils.materials.exportDownloads.fetch();
          filename = `downloads-export-${new Date().toISOString().split("T")[0]}.json`;
          break;
        case "blaeserhefte":
          data = await utils.materials.exportBlaeserhefte.fetch();
          filename = `blaeserhefte-export-${new Date().toISOString().split("T")[0]}.json`;
          break;
      }

      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export fehlgeschlagen. Bitte versuchen Sie es erneut.");
    }
  };

  const handleImport = async () => {
    if (!selectedType || !importFile) {
      setImportError("Bitte wählen Sie einen Typ und eine Datei aus.");
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const text = await importFile.text();
      const jsonData = JSON.parse(text);

      let result: { success: boolean; importedCount: number };

      switch (selectedType) {
        case "posts":
          result = await importPosts.mutateAsync({
            posts: jsonData.posts || [],
          });
          break;
        case "events":
          result = await importEvents.mutateAsync({
            events: jsonData.events || [],
          });
          break;
        case "courses":
          result = await importCourses.mutateAsync({
            courses: jsonData.courses || [],
          });
          break;
        case "ensembles":
          result = await importEnsembles.mutateAsync({
            ensembles: jsonData.ensembles || [],
          });
          break;
        case "media":
          result = await importMedia.mutateAsync({
            media: jsonData.media || [],
          });
          break;
        case "downloads":
          result = await importDownloads.mutateAsync({
            downloads: jsonData.downloads || [],
          });
          break;
        case "blaeserhefte":
          result = await importBlaeserhefte.mutateAsync({
            blaeserhefte: jsonData.blaeserhefte || [],
          });
          break;
        default:
          throw new Error("Unbekannter Typ");
      }

      setImportSuccess(
        `Erfolgreich ${result.importedCount} ${contentTypeLabels[selectedType]} importiert.`,
      );
      setImportFile(null);
      setSelectedType(null);
    } catch (error) {
      console.error("Import failed:", error);
      setImportError(
        error instanceof Error
          ? error.message
          : "Import fehlgeschlagen. Bitte überprüfen Sie die Datei.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="mb-10">
      <h2 className="dark:text-dark-text mb-4 text-lg font-semibold text-gray-900">
        Export & Import
      </h2>
      <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-6">
          <h3 className="dark:text-dark-text mb-3 text-base font-medium text-gray-900">
            Export
          </h3>
          <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
            Exportieren Sie Inhalte als JSON-Datei für Backup oder Migration.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {(
              [
                "posts",
                "events",
                "courses",
                "ensembles",
                "media",
                "downloads",
                "blaeserhefte",
              ] as ContentType[]
            ).map((type) => (
              <button
                key={type}
                onClick={() => handleExport(type)}
                className="hover:border-primary dark:border-dark-border dark:bg-dark-background dark:text-dark-text dark:hover:border-primary flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all"
              >
                <ArrowDownIcon />
                {contentTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="dark:border-dark-border border-t border-gray-200 pt-6">
          <h3 className="dark:text-dark-text mb-3 text-base font-medium text-gray-900">
            Import
          </h3>
          <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
            Importieren Sie Inhalte aus einer JSON-Datei.
          </p>
          <div className="space-y-4">
            <div>
              <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                Inhaltstyp
              </label>
              <select
                value={selectedType ?? ""}
                onChange={(e) =>
                  setSelectedType(e.target.value as ContentType | null)
                }
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              >
                <option value="">Bitte wählen...</option>
                {(
                  [
                    "posts",
                    "events",
                    "courses",
                    "ensembles",
                    "media",
                    "downloads",
                    "blaeserhefte",
                  ] as ContentType[]
                ).map((type) => (
                  <option key={type} value={type}>
                    {contentTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                JSON-Datei
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:outline-none"
              />
            </div>
            {importError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {importError}
              </div>
            )}
            {importSuccess && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                {importSuccess}
              </div>
            )}
            <button
              onClick={handleImport}
              disabled={!selectedType || !importFile || isImporting}
              className="hover:bg-primary-dark bg-primary flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              <ArrowUpIcon />
              {isImporting ? "Importiere..." : "Importieren"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
