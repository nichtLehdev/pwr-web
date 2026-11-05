"use client";

import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { MEMBERSHIP_SECTION } from "@/app/_components/dashboard/office-billing-ui";
import { BillingUploadPage } from "@/app/_components/dashboard/office-billing/billing-upload";
import {
  BillingLoading,
  BillingNoAccess,
  useBillingPermission,
} from "@/app/_components/dashboard/office-billing/billing-page-gate";

export default function NewMembershipRunPage() {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const { canManage, permissionsLoading } = useBillingPermission();

  const createRun = api.membershipBilling.createRun.useMutation({
    onSuccess: async (run) => {
      await Promise.all([
        utils.membershipBilling.listRuns.invalidate(),
        utils.membershipBilling.getSettings.invalidate(),
      ]);
      router.push(`${MEMBERSHIP_SECTION.basePath}/${run.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  if (permissionsLoading) return <BillingLoading />;
  if (!canManage) return <BillingNoAccess title="Neue Abrechnung" />;

  return (
    <BillingUploadPage
      section={MEMBERSHIP_SECTION}
      sheetLabel="Mitgliedertabelle (.xlsx)"
      hint="Gelesen wird das Blatt „aktuelle“. Spalten werden über ihre Überschrift erkannt (Chor-Nr., Chorname, Rgn_Name1, Rg_Name2, Rg_Strasse, Rgn_Ort, Email Versand, MitEink, OhneEink, StaffBetrag, PosMag, PCMBetrag, RückstBeitrag, Gesamt, Kommentar); die Beitragssätze kommen aus den Formeln. Rechnungen gibt es für Zeilen mit Gesamtbetrag, die nicht ganz rot markiert sind."
      pending={createRun.isPending}
      onUpload={(input) => createRun.mutate(input)}
    />
  );
}
