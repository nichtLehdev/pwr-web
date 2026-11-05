"use client";

import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import { Card, Label } from "@/app/_components/ui";
import {
  INSURANCE_BASE_PATH,
  INSURANCE_BREADCRUMBS,
} from "@/app/_components/dashboard/insurance-billing-ui";

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
export default function NewInsuranceRunPage() {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.BILLING_MANAGE);

  const createRun = api.insuranceBilling.createRun.useMutation({
    onSuccess: async (run) => {
      await utils.insuranceBilling.listRuns.invalidate();
      router.push(`${INSURANCE_BASE_PATH}/${run.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  if (permissionsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!canManage) {
    return (
      <DashboardPage title="Neue Abrechnung">
        <p className="text-dark dark:text-night-muted">
          Für diesen Bereich fehlt dir die Berechtigung.
        </p>
      </DashboardPage>
    );
  }

  const onFile = async (selected: File | undefined) => {
    if (!selected) return;
    try {
      const base64 = await readAsBase64(selected);
      createRun.mutate({ filename: selected.name, fileBase64: base64 });
    } catch {
      toast.error("Die Datei konnte nicht gelesen werden.");
    }
  };

  return (
    <DashboardPage
      title="Neue Abrechnung"
      description="Versicherungstabelle hochladen. Daraus entsteht ein Entwurf, den du prüfen, in der Vorschau ansehen und dann ausstellen kannst."
      breadcrumbs={[...INSURANCE_BREADCRUMBS, { label: "Neue Abrechnung" }]}
      maxWidth="4xl"
    >
      <Card>
        <div className="space-y-4 p-6">
          <div>
            <Label htmlFor="sheet">Versicherungstabelle (.xlsx)</Label>
            <p className="text-dark dark:text-night-muted mt-1 text-sm">
              Gelesen wird das Blatt „Aktuell“. Spalten werden über ihre
              Überschrift erkannt (Chor-Nr., Rgn_Name1, Rg_Name2, Rg_Strasse,
              Rgn_Ort, Kommentar mit E-Mail, Chor, „bis … EUR“, Gesamt).
            </p>
          </div>
          <label
            htmlFor="sheet"
            aria-disabled={createRun.isPending}
            className="border-rule dark:border-night-rule hover:border-ink dark:hover:border-night-text flex cursor-pointer items-center gap-3 border border-dashed p-4 transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            {createRun.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <FileSpreadsheet className="h-5 w-5" aria-hidden />
            )}
            <span className="text-sm font-semibold">
              {createRun.isPending
                ? "Tabelle wird gelesen …"
                : "Datei auswählen"}
            </span>
          </label>
          <input
            id="sheet"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            disabled={createRun.isPending}
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
