"use client";

import { api } from "@/trpc/react";
import { INSURANCE_SECTION } from "@/app/_components/dashboard/office-billing-ui";
import { BillingOverviewPage } from "@/app/_components/dashboard/office-billing/billing-overview";

const useRuns = (enabled: boolean) =>
  api.insuranceBilling.listRuns.useQuery(undefined, { enabled });

export default function InsuranceBillingPage() {
  return (
    <BillingOverviewPage
      section={INSURANCE_SECTION}
      description="Rechnungen für die Instrumentenversicherung aus der Excel-Tabelle der Geschäftsstelle erstellen und per E-Mail versenden. Die Prämien gehören zu jeder Abrechnung und lassen sich dort im Entwurf anpassen."
      emptyHint="Noch keine Abrechnung. Lade die Versicherungstabelle über „Neue Abrechnung“ hoch."
      useRuns={useRuns}
    />
  );
}
