"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag } from "@/app/_components/programmheft/tag";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
} from "@/app/_components/ui";

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
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!canManage) {
    return (
      <DashboardPage title="Wartungsmodus">
        <p className="text-dark dark:text-night-muted">
          Für diesen Bereich fehlt dir die Berechtigung.
        </p>
      </DashboardPage>
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
    <DashboardPage
      title="Wartungsmodus"
      description="Schließt die öffentliche Seite für Besucher. Angemeldete Personen mit Dashboard-Zugriff arbeiten normal weiter."
    >
      {forced && (
        // Hinweis statt Alarm: Tinte auf Papier an einer Haarlinie statt
        // bernsteinfarbenem Kasten.
        <div className="border-ink dark:border-night-text mb-6 flex gap-3 border-l-2 py-2 pl-4">
          <AlertTriangle className="dark:text-night-text text-ink mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-dark dark:text-night-muted text-sm">
            <p className="text-ink dark:text-night-text font-semibold">
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

      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <p className="text-ink dark:text-night-text font-semibold">
              Aktueller Zustand
            </p>
            {/* Folgenreiche Aktion, kein zurückgenommener Hinweis: aktive
                Wartung ist ein Zustand, den man sehen muss, deshalb gefülltes
                Orange statt eines zurückgenommenen Tons. */}
            <Tag tone={enabled ? "orange" : "ink"} className="mt-1">
              {enabled
                ? "Wartungsmodus aktiv — Besucher sehen die Wartungsseite"
                : "Seite ist offen"}
            </Tag>
            {data?.updatedAt && (
              <p className="text-dark dark:text-night-muted mt-1 text-xs">
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

          <div>
            <Label htmlFor="wartung-message">Text auf der Wartungsseite</Label>
            <Textarea
              id="wartung-message"
              value={message}
              onChange={(e) => setMessageDraft(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={data?.defaultMessage ?? ""}
              className="mt-1"
            />
            <span className="text-dark dark:text-night-muted mt-1 block text-xs">
              Leer lassen für den Standardtext.
            </span>
          </div>

          <div>
            <Label htmlFor="wartung-until">
              Voraussichtlich bis (optional)
            </Label>
            <Input
              id="wartung-until"
              type="datetime-local"
              value={until}
              onChange={(e) => setUntilDraft(e.target.value)}
              className="mt-1 max-w-xs"
            />
            <span className="text-dark dark:text-night-muted mt-1 block text-xs">
              Nur ein Hinweis für Besucher. Es schaltet sich nichts automatisch
              wieder ein.
            </span>
          </div>

          <div className="border-rule dark:border-night-rule flex flex-col gap-3 border-t pt-6 sm:flex-row">
            {enabled ? (
              <Button
                type="button"
                variant="success"
                size="lg"
                onClick={() => submit(false)}
                disabled={setMaintenance.isPending || forced}
              >
                {setMaintenance.isPending
                  ? "Wird gespeichert…"
                  : "Seite öffnen"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="danger"
                size="lg"
                onClick={() => submit(true)}
                disabled={setMaintenance.isPending}
              >
                {setMaintenance.isPending
                  ? "Wird gespeichert…"
                  : "Wartungsmodus einschalten"}
              </Button>
            )}

            {enabled && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => submit(true)}
                disabled={setMaintenance.isPending || forced}
              >
                Text speichern
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="text-dark dark:text-night-muted mt-6 space-y-2 text-sm">
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
    </DashboardPage>
  );
}
