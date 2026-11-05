"use client";

import type { ReactNode } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import { Card, Label } from "@/app/_components/ui";
import type { BillingSection } from "@/app/_components/dashboard/office-billing-ui";

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Hochladen legt sofort einen Entwurf an — wie eine Kursrechnung. Prüfen,
 * Vorschau und Ausstellen passieren auf der Seite des Laufs.
 */
export function BillingUploadPage({
  section,
  sheetLabel,
  hint,
  pending,
  onUpload,
}: {
  section: BillingSection;
  /** "Versicherungstabelle (.xlsx)" */
  sheetLabel: string;
  hint: ReactNode;
  pending: boolean;
  onUpload: (input: { filename: string; fileBase64: string }) => void;
}) {
  const toast = useToast();

  const onFile = async (selected: File | undefined) => {
    if (!selected) return;
    try {
      onUpload({
        filename: selected.name,
        fileBase64: await readAsBase64(selected),
      });
    } catch {
      toast.error("Die Datei konnte nicht gelesen werden.");
    }
  };

  return (
    <DashboardPage
      title="Neue Abrechnung"
      description="Tabelle hochladen. Daraus entsteht ein Entwurf, den du prüfen, in der Vorschau ansehen und dann ausstellen kannst."
      breadcrumbs={[...section.breadcrumbs, { label: "Neue Abrechnung" }]}
      maxWidth="4xl"
    >
      <Card>
        <div className="space-y-4 p-6">
          <div>
            <Label htmlFor="sheet">{sheetLabel}</Label>
            <p className="text-dark dark:text-night-muted mt-1 text-sm">
              {hint}
            </p>
          </div>
          <label
            htmlFor="sheet"
            aria-disabled={pending}
            className="border-rule dark:border-night-rule hover:border-ink dark:hover:border-night-text flex cursor-pointer items-center gap-3 border border-dashed p-4 transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <FileSpreadsheet className="h-5 w-5" aria-hidden />
            )}
            <span className="text-sm font-semibold">
              {pending ? "Tabelle wird gelesen …" : "Datei auswählen"}
            </span>
          </label>
          <input
            id="sheet"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            disabled={pending}
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </Card>
    </DashboardPage>
  );
}
