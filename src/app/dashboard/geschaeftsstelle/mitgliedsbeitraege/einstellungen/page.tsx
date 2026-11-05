"use client";

import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { DashboardPage } from "@/app/_components/dashboard";
import { MEMBERSHIP_PLACEHOLDERS } from "@/lib/membership-billing";
import { MEMBERSHIP_SECTION } from "@/app/_components/dashboard/office-billing-ui";
import { BillingTextsForm } from "@/app/_components/dashboard/office-billing/billing-texts-form";
import {
  BillingLoading,
  BillingNoAccess,
  useBillingPermission,
} from "@/app/_components/dashboard/office-billing/billing-page-gate";

export default function MembershipSettingsPage() {
  const toast = useToast();
  const utils = api.useUtils();
  const { canManage, permissionsLoading } = useBillingPermission();
  const settings = api.membershipBilling.getSettings.useQuery(undefined, {
    enabled: canManage,
  });
  const save = api.membershipBilling.updateSettings.useMutation({
    onSuccess: async () => {
      await utils.membershipBilling.getSettings.invalidate();
      toast.success("Einstellungen gespeichert.");
    },
    onError: (error) => toast.error(error.message),
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
      description="Verwendungszweck und die Texte auf Rechnung und E-Mail. Die Beitragssätze stehen in jeder Abrechnung."
      breadcrumbs={[
        ...MEMBERSHIP_SECTION.breadcrumbs,
        { label: "Texte & Einstellungen" },
      ]}
      maxWidth="4xl"
    >
      <BillingTextsForm
        settings={settings.data.settings}
        defaults={settings.data.defaults}
        placeholders={MEMBERSHIP_PLACEHOLDERS}
        saving={save.isPending}
        onSave={(payload) => save.mutate(payload)}
      />
    </DashboardPage>
  );
}
