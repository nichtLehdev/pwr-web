"use client";

import { useState } from "react";
import { DownloadIcon, UploadIcon } from "lucide-react";

type ContentType =
  | "posts"
  | "events"
  | "courses"
  | "ensembles"
  | "media"
  | "downloads"
  | "blaeserhefte";

export default function ExportImportSection() {
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

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
      const response = await fetch(`/api/export/${type}`);

      if (!response.ok) {
        throw new Error("Export fehlgeschlagen");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${type}-export-${new Date().toISOString().split("T")[0]}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1]!;
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch(`/api/import/${selectedType}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Import fehlgeschlagen");
      }

      const result = (await response.json()) as {
        success: boolean;
        importedCount: number;
      };

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
    <div>
      <div className="mb-6">
          <h3 className="dark:text-dark-text mb-3 text-base font-medium text-gray-900">
            Export
          </h3>
          <p className="dark:text-dark-muted mb-4 text-sm text-gray-600">
            Exportieren Sie Inhalte als ZIP-Datei (inkl. Medien-Dateien) für
            Backup oder Migration.
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
                <DownloadIcon className="h-4 w-4" />
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
            Importieren Sie Inhalte aus einer ZIP- oder JSON-Datei. ZIP-Dateien
            enthalten auch die Medien-Dateien.
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
                ZIP- oder JSON-Datei
              </label>
              <input
                type="file"
                accept=".zip,.json"
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
              <UploadIcon className="h-4 w-4" />
              {isImporting ? "Importiere..." : "Importieren"}
            </button>
          </div>
        </div>
    </div>
  );
}
