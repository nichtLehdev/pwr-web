"use client";
import { Select } from "@/app/_components/ui";

import { useState } from "react";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";

type ContentType =
  | "posts"
  | "events"
  | "courses"
  | "ensembles"
  | "auswahlchoere"
  | "media"
  | "downloads"
  | "blaeserhefte"
  | "history-events";

export default function ExportImportSection() {
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const { hasPermission } = usePermissions();
  const canExport = hasPermission(PERMISSIONS.DATA_EXPORT);
  const canImport = hasPermission(PERMISSIONS.DATA_IMPORT);

  const contentTypeLabels: Record<ContentType, string> = {
    posts: "Beiträge",
    events: "Termine",
    courses: "Kurse",
    ensembles: "Ensembles",
    auswahlchoere: "Auswahlchöre",
    media: "Medien",
    downloads: "Downloads",
    blaeserhefte: "Bläserhefte",
    "history-events": "Historie-Timeline",
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
        unresolvedReferences?: Array<{
          subject: string;
          field: string;
          value: string;
        }>;
      };

      // A reference the target database did not know is dropped rather than
      // failing the whole import, so it has to be said out loud.
      const unresolved = result.unresolvedReferences ?? [];
      const unresolvedNote =
        unresolved.length > 0
          ? ` ${unresolved.length} Verweis(e) konnten nicht zugeordnet und mussten weggelassen werden: ${unresolved
              .slice(0, 5)
              .map((r) => `${r.subject} (${r.field}: ${r.value})`)
              .join(", ")}${unresolved.length > 5 ? " …" : ""}`
          : "";

      setImportSuccess(
        `Erfolgreich ${result.importedCount} ${contentTypeLabels[selectedType]} importiert.${unresolvedNote}`,
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
      {canExport && (
        <div className="mb-6">
          <h3 className="text-ink dark:text-night-text mb-3 text-base font-medium">
            Export
          </h3>
          <p className="text-dark dark:text-night-muted mb-4 text-sm">
            Exportieren Sie Inhalte als ZIP-Datei (inkl. Medien-Dateien) für
            Backup oder Migration.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                "posts",
                "events",
                "courses",
                "ensembles",
                "auswahlchoere",
                "media",
                "downloads",
                "blaeserhefte",
                "history-events",
              ] as ContentType[]
            ).map((type) => (
              <button
                key={type}
                onClick={() => handleExport(type)}
                className="border-rule dark:border-night-rule dark:bg-night dark:text-night-text text-ink hover:border-ink dark:hover:border-night-text bg-paper flex min-h-11 items-center justify-center gap-2 border px-3 py-2 text-sm font-medium transition-colors"
              >
                <DownloadIcon className="h-4 w-4" />
                {contentTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>
      )}

      {canImport && (
        <div className="border-rule dark:border-night-rule border-t pt-6">
          <h3 className="text-ink dark:text-night-text mb-3 text-base font-medium">
            Import
          </h3>
          <p className="text-dark dark:text-night-muted mb-4 text-sm">
            Importieren Sie Inhalte aus einer ZIP- oder JSON-Datei. ZIP-Dateien
            enthalten auch die Medien-Dateien.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-dark dark:text-night-muted mb-2 block text-sm font-medium">
                Inhaltstyp
              </label>
              <Select
                value={selectedType ?? ""}
                onChange={(e) =>
                  setSelectedType(e.target.value as ContentType | null)
                }
                className="w-full text-sm"
              >
                <option value="">Bitte wählen...</option>
                {(
                  [
                    "posts",
                    "events",
                    "courses",
                    "ensembles",
                    "auswahlchoere",
                    "media",
                    "downloads",
                    "blaeserhefte",
                    "history-events",
                  ] as ContentType[]
                ).map((type) => (
                  <option key={type} value={type}>
                    {contentTypeLabels[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                htmlFor="import-file"
                className="text-dark dark:text-night-muted mb-2 block text-sm font-medium"
              >
                ZIP- oder JSON-Datei
              </label>
              <input
                type="file"
                id="import-file"
                accept=".zip,.json"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-3 py-2 text-sm"
              />
            </div>
            {importError && (
              <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {importError}
              </div>
            )}
            {importSuccess && (
              // Hinweis statt Alarm: Tinte auf Papier an einer Haarlinie
              // statt grünem Kasten — die Meldung erklärt, sie warnt nicht.
              <div className="border-ink dark:border-night-text border-l-2 py-1 pl-4">
                <p className="text-dark dark:text-night-muted text-sm">
                  {importSuccess}
                </p>
              </div>
            )}
            <button
              onClick={handleImport}
              disabled={!selectedType || !importFile || isImporting}
              className="hover:bg-primary-dark bg-primary text-ink flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UploadIcon className="h-4 w-4" />
              {isImporting ? "Importiere..." : "Importieren"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
