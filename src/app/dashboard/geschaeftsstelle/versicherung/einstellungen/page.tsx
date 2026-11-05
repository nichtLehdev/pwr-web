"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import { Input, Label } from "@/app/_components/ui";
import { INSURANCE_PLACEHOLDERS } from "@/lib/insurance-billing";
import { INSURANCE_SECTION } from "@/app/_components/dashboard/office-billing-ui";
import { BillingTextsForm } from "@/app/_components/dashboard/office-billing/billing-texts-form";
import {
  BillingLoading,
  BillingNoAccess,
  useBillingPermission,
} from "@/app/_components/dashboard/office-billing/billing-page-gate";

type SettingsData = RouterOutputs["insuranceBilling"]["getSettings"];

function SettingsForm({ data }: { data: SettingsData }) {
  const toast = useToast();
  const utils = api.useUtils();
  const [taxPercent, setTaxPercent] = useState(
    String(Math.round(data.settings.taxRate * 10000) / 100).replace(".", ","),
  );
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
    <BillingTextsForm
      settings={data.settings}
      defaults={data.defaults}
      placeholders={INSURANCE_PLACEHOLDERS}
      extraValid={taxValid}
      saving={save.isPending}
      onSave={(payload) => save.mutate({ ...payload, taxRate })}
      extraFields={
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
      }
    />
  );
}

export default function InsuranceSettingsPage() {
  const { canManage, permissionsLoading } = useBillingPermission();
  const settings = api.insuranceBilling.getSettings.useQuery(undefined, {
    enabled: canManage,
  });

  if (permissionsLoading || (canManage && settings.isLoading)) {
    return <BillingLoading />;
  }
  if (!canManage || !settings.data) {
    return <BillingNoAccess title="Texte & Einstellungen" />;
  }

  return (
    <DashboardPage
      title="Texte & Einstellungen"
      description="Versicherungssteuer, Verwendungszweck und die Texte auf Rechnung und E-Mail."
      breadcrumbs={[
        ...INSURANCE_SECTION.breadcrumbs,
        { label: "Texte & Einstellungen" },
      ]}
      maxWidth="4xl"
    >
      <SettingsForm data={settings.data} />
    </DashboardPage>
  );
}
