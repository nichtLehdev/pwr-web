"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
} from "@/app/_components/ui";
import {
  INSURANCE_PLACEHOLDERS,
  insurancePaymentReference,
} from "@/lib/insurance-billing";
import { INSURANCE_BREADCRUMBS } from "@/app/_components/dashboard/insurance-billing-ui";

type SettingsData = RouterOutputs["insuranceBilling"]["getSettings"];

const TEXT_FIELDS = [
  {
    key: "introText",
    label: "Einleitung auf der Rechnung",
    rows: 5,
  },
  { key: "closingText", label: "Schlusssatz auf der Rechnung", rows: 2 },
  { key: "signatureName", label: "Unterzeichnet von", rows: 1 },
  { key: "emailSubject", label: "Betreff der E-Mail", rows: 1 },
  { key: "emailBody", label: "Text der E-Mail", rows: 12 },
] as const;

type TextKey = (typeof TEXT_FIELDS)[number]["key"];

function SettingsForm({ data }: { data: SettingsData }) {
  const toast = useToast();
  const utils = api.useUtils();
  const [taxPercent, setTaxPercent] = useState(
    String(Math.round(data.settings.taxRate * 10000) / 100).replace(".", ","),
  );
  const [prefix, setPrefix] = useState(data.settings.paymentReferencePrefix);
  const [texts, setTexts] = useState<Record<TextKey, string>>({
    introText: data.settings.introText,
    closingText: data.settings.closingText,
    signatureName: data.settings.signatureName,
    emailSubject: data.settings.emailSubject,
    emailBody: data.settings.emailBody,
  });

  const save = api.insuranceBilling.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.insuranceBilling.getSettings.invalidate();
      toast.success("Einstellungen gespeichert.");
    },
    onError: (error) => toast.error(error.message),
  });

  const taxRate = Number(taxPercent.replace(",", ".")) / 100;
  const taxValid =
    taxPercent.trim() !== "" &&
    Number.isFinite(taxRate) &&
    taxRate >= 0 &&
    taxRate <= 1;

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (!taxValid) return;
        // Was dem Standard entspricht, wird nicht gespeichert — so wandert
        // eine spätere Verbesserung des Standardtexts automatisch mit.
        const textOrNull = (key: TextKey) =>
          texts[key].trim() === data.defaults[key].trim() ? null : texts[key];
        save.mutate({
          taxRate,
          paymentReferencePrefix: prefix,
          introText: textOrNull("introText"),
          closingText: textOrNull("closingText"),
          signatureName: textOrNull("signatureName"),
          emailSubject: textOrNull("emailSubject"),
          emailBody: textOrNull("emailBody"),
        });
      }}
    >
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="taxRate">Versicherungssteuer in %</Label>
            <Input
              id="taxRate"
              inputMode="decimal"
              value={taxPercent}
              error={!taxValid}
              onChange={(event) => setTaxPercent(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="prefix">Kennung im Verwendungszweck</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
            />
            <p className="text-dark dark:text-night-muted mt-1 text-xs">
              Beispiel: {insurancePaymentReference(prefix, "02-07")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div>
            <h2 className="text-ink dark:text-night-text text-lg font-semibold">
              Texte
            </h2>
            <p className="text-dark dark:text-night-muted mt-1 text-sm">
              Platzhalter werden je Chor ersetzt:{" "}
              {INSURANCE_PLACEHOLDERS.map((placeholder, index) => (
                <span key={placeholder.key}>
                  {index > 0 && ", "}
                  <code>{`{${placeholder.key}}`}</code> ({placeholder.label})
                </span>
              ))}
              . Neue Texte gelten für neu angelegte Abrechnungen; der
              E-Mail-Text gilt sofort für jeden Versand.
            </p>
          </div>
          {TEXT_FIELDS.map((field) => (
            <div key={field.key}>
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                {texts[field.key].trim() !==
                  data.defaults[field.key].trim() && (
                  <button
                    type="button"
                    className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text text-xs font-semibold underline-offset-4 hover:underline"
                    onClick={() =>
                      setTexts((current) => ({
                        ...current,
                        [field.key]: data.defaults[field.key],
                      }))
                    }
                  >
                    Standard wiederherstellen
                  </button>
                )}
              </div>
              {field.rows === 1 ? (
                <Input
                  id={field.key}
                  value={texts[field.key]}
                  onChange={(event) =>
                    setTexts((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              ) : (
                <Textarea
                  id={field.key}
                  rows={field.rows}
                  value={texts[field.key]}
                  onChange={(event) =>
                    setTexts((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" disabled={!taxValid} isLoading={save.isPending}>
        Einstellungen speichern
      </Button>
    </form>
  );
}

export default function InsuranceSettingsPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.BILLING_MANAGE);
  const settings = api.insuranceBilling.getSettings.useQuery(undefined, {
    enabled: canManage,
  });

  if (permissionsLoading || (canManage && settings.isLoading)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <DashboardPage
      title="Texte & Einstellungen"
      description="Versicherungssteuer, Verwendungszweck und die Texte auf Rechnung und E-Mail."
      breadcrumbs={[
        ...INSURANCE_BREADCRUMBS,
        { label: "Texte & Einstellungen" },
      ]}
      maxWidth="4xl"
    >
      {canManage && settings.data ? (
        <SettingsForm data={settings.data} />
      ) : (
        <p className="text-dark dark:text-night-muted">
          Für diesen Bereich fehlt dir die Berechtigung.
        </p>
      )}
    </DashboardPage>
  );
}
