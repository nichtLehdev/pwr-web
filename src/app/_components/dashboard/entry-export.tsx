"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { downloadResponseAsFile } from "@/lib/download-file";
import type { SelectableExportType } from "@/lib/export-selection";
import { useToast } from "@/app/_components/ui/toast";
import type { DashboardOverflowItem } from "./dashboard-overflow-menu";

/**
 * Export eines einzelnen Eintrags (Termin, Kurs, Beitrag) von seiner
 * Detailseite aus — dasselbe ZIP wie der Gesamtexport unter Export/Import,
 * nur mit diesem einen Eintrag und seinen Medien.
 *
 * Als Hook statt als fertiger Knopf, weil die Seiten die Aktion zweimal zeigen:
 * ab `sm` als Knopf in der Kopfzeile, auf dem Telefon im „…“-Menü. Beide
 * müssen denselben Ladezustand teilen, sonst ließe sich der Export im Menü
 * ein zweites Mal starten, während der Knopf noch lädt.
 */
export function useEntryExport(type: SelectableExportType, id: string) {
  const { hasPermission } = usePermissions();
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Die Route prüft dieselbe Berechtigung; hier geht es nur darum, keinen
  // Knopf zu zeigen, der mit 401 endet.
  const canExport = hasPermission(PERMISSIONS.DATA_EXPORT);

  const exportEntry = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/export/${type}?ids=${encodeURIComponent(id)}`,
      );
      if (!response.ok) {
        toast.error(
          response.status === 404
            ? "Der Eintrag wurde nicht gefunden. Vielleicht wurde er inzwischen gelöscht."
            : response.status === 401
              ? "Für den Export fehlt die Berechtigung."
              : "Export fehlgeschlagen. Bitte versuchen Sie es erneut.",
        );
        return;
      }
      await downloadResponseAsFile(response, `${type}-export.zip`);
    } catch {
      toast.error("Export fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setIsExporting(false);
    }
  };

  const label = isExporting ? "Wird exportiert …" : "Exportieren";

  const menuItem: DashboardOverflowItem = {
    label,
    icon: DownloadIcon,
    disabled: isExporting,
    onSelect: () => void exportEntry(),
  };

  return { canExport, isExporting, exportEntry, label, menuItem };
}

/**
 * Der Kopfzeilen-Knopf ab `sm`. Auf dem Telefon ausgeblendet — dort steht
 * derselbe Eintrag im „…“-Menü (`menuItem`), damit die Kopfzeile nicht in
 * drei Knopfreihen zerfällt.
 */
export function EntryExportButton({
  exporter,
}: {
  exporter: ReturnType<typeof useEntryExport>;
}) {
  return (
    <button
      type="button"
      onClick={() => void exporter.exportEntry()}
      disabled={exporter.isExporting}
      aria-busy={exporter.isExporting}
      className="border-rule dark:border-night-rule text-ink dark:text-night-text bg-paper dark:bg-night hover:bg-rule/25 dark:hover:bg-night-raised hidden min-h-11 items-center gap-2 border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60 sm:inline-flex"
    >
      <DownloadIcon className="h-4 w-4" aria-hidden />
      {exporter.label}
    </button>
  );
}
