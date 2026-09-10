"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Wrench } from "lucide-react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/app/_components/ui/toast";

function toLocalInput(value: Date | null): string {
  if (!value) return "";
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export default function MaintenanceDashboardPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.SYSTEM_MANAGE);

  const toast = useToast();
  const utils = api.useUtils();
  const state = api.maintenance.get.useQuery();

  // `null` heißt "noch nichts eingetippt" — dann gilt der Wert aus der Abfrage.
  const [messageDraft, setMessageDraft] = useState<string | null>(null);
  const [untilDraft, setUntilDraft] = useState<string | null>(null);

  const message = messageDraft ?? state.data?.message ?? "";
  const until = untilDraft ?? toLocalInput(state.data?.until ?? null);

  const setMaintenance = api.maintenance.set.useMutation({
    onSuccess: async (row) => {
      setMessageDraft(null);
      setUntilDraft(null);
      await utils.maintenance.get.invalidate();
      toast.success(
        row.enabled
          ? "Wartungsmodus ist an — Besucher sehen die Wartungsseite."
          : "Wartungsmodus ist aus. Die Seite ist wieder offen.",
      );
    },
    onError: (error) => toast.error(error.message),
  });

  if (permissionsLoading || state.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="container py-12">
        <p className="text-dark dark:text-dark-text">
          Für diesen Bereich fehlt dir die Berechtigung.
        </p>
      </div>
    );
  }

  const data = state.data;
  const enabled = data?.enabled ?? false;
  const forced = data?.forcedByEnv ?? false;

  const submit = (nextEnabled: boolean) =>
    setMaintenance.mutate({
      enabled: nextEnabled,
      message: message.trim() || undefined,
      until: until ? new Date(until) : null,
    });

  return (
    <div className="container max-w-3xl py-8 md:py-12">
      <div className="mb-8 flex items-start gap-4">
        <div className="bg-primary/10 dark:bg-primary/20 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
          <Wrench className="text-primary h-6 w-6" />
        </div>
        <div>
          <h1 className="text-dark dark:text-dark-text text-2xl font-bold md:text-3xl">
            Wartungsmodus
          </h1>
          <p className="text-dark-light dark:text-dark-text-secondary mt-1">
            Schließt die öffentliche Seite für Besucher. Angemeldete Personen
            mit Dashboard-Zugriff arbeiten normal weiter.
          </p>
        </div>
      </div>

      {forced && (
        <div className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">
              Die Wartung ist über die Umgebungsvariable erzwungen.
            </p>
            <p className="mt-1">
              <code>MAINTENANCE_MODE</code> steht auf dem Server auf{" "}
              <code>true</code>. Der Schalter hier ändert daran nichts — dazu
              muss der Wert im Stack entfernt werden.
            </p>
          </div>
        </div>
      )}

      <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-dark dark:text-dark-text font-semibold">
              Aktueller Zustand
            </p>
            <p
              className={`mt-1 text-sm font-medium ${
                enabled
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {enabled
                ? "Wartungsmodus aktiv — Besucher sehen die Wartungsseite"
                : "Seite ist offen"}
            </p>
            {data?.updatedAt && (
              <p className="text-dark-light dark:text-dark-text-secondary mt-1 text-xs">
                Zuletzt geändert am{" "}
                {new Intl.DateTimeFormat("de-DE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(data.updatedAt)}
                {data.updatedBy?.displayName
                  ? ` von ${data.updatedBy.displayName}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        <label className="mb-2 block">
          <span className="text-dark dark:text-dark-text text-sm font-medium">
            Text auf der Wartungsseite
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessageDraft(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={data?.defaultMessage ?? ""}
            className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <span className="text-dark-light dark:text-dark-text-secondary text-xs">
            Leer lassen für den Standardtext.
          </span>
        </label>

        <label className="mt-4 mb-6 block">
          <span className="text-dark dark:text-dark-text text-sm font-medium">
            Voraussichtlich bis (optional)
          </span>
          <input
            type="datetime-local"
            value={until}
            onChange={(e) => setUntilDraft(e.target.value)}
            className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text mt-1 block rounded-lg border border-gray-300 px-3 py-2"
          />
          <span className="text-dark-light dark:text-dark-text-secondary text-xs">
            Nur ein Hinweis für Besucher. Es schaltet sich nichts automatisch
            wieder ein.
          </span>
        </label>

        <div className="dark:border-dark-border flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row">
          {enabled ? (
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={setMaintenance.isPending || forced}
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {setMaintenance.isPending ? "Wird gespeichert…" : "Seite öffnen"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={setMaintenance.isPending}
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              {setMaintenance.isPending
                ? "Wird gespeichert…"
                : "Wartungsmodus einschalten"}
            </button>
          )}

          {enabled && (
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={setMaintenance.isPending || forced}
              className="text-dark dark:text-dark-text dark:border-dark-border dark:hover:bg-dark-background inline-flex items-center justify-center rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Text speichern
            </button>
          )}
        </div>
      </div>

      <div className="text-dark-light dark:text-dark-text-secondary mt-6 space-y-2 text-sm">
        <p>
          <strong>Was im Wartungsmodus passiert:</strong> Öffentliche Seiten
          zeigen die Wartungsseite mit Status 503. Anmeldung, Dashboard und die
          Datei-Auslieferung bleiben erreichbar.
        </p>
        <p>
          Öffentliche Formulare — Kontakt, Newsletter, Kursanmeldung — sind
          gesperrt, auch für freigeschaltete Besucher. So läuft während der
          Umstellung nichts Neues in die Datenbank.
        </p>
      </div>
    </div>
  );
}
