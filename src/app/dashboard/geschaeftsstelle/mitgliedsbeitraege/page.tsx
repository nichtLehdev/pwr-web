"use client";

import { api } from "@/trpc/react";
import { MEMBERSHIP_SECTION } from "@/app/_components/dashboard/office-billing-ui";
import { BillingOverviewPage } from "@/app/_components/dashboard/office-billing/billing-overview";

const useRuns = (enabled: boolean) =>
  api.membershipBilling.listRuns.useQuery(undefined, { enabled });

export default function MembershipBillingPage() {
  return (
    <BillingOverviewPage
      section={MEMBERSHIP_SECTION}
      description="Jahresbeiträge der Chöre und Einzelmitglieder aus der Mitgliedertabelle der Geschäftsstelle berechnen und per E-Mail versenden. Die Beitragssätze gehören zu jeder Abrechnung und lassen sich dort im Entwurf anpassen."
      emptyHint="Noch keine Abrechnung. Lade die Mitgliedertabelle über „Neue Abrechnung“ hoch."
      useRuns={useRuns}
    />
  );
}
