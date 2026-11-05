"use client";

import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { INSURANCE_SECTION } from "@/app/_components/dashboard/office-billing-ui";
import { BillingUploadPage } from "@/app/_components/dashboard/office-billing/billing-upload";
import {
  BillingLoading,
  BillingNoAccess,
  useBillingPermission,
} from "@/app/_components/dashboard/office-billing/billing-page-gate";

export default function NewInsuranceRunPage() {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const { canManage, permissionsLoading } = useBillingPermission();

  const createRun = api.insuranceBilling.createRun.useMutation({
    onSuccess: async (run) => {
      await utils.insuranceBilling.listRuns.invalidate();
      router.push(`${INSURANCE_SECTION.basePath}/${run.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  if (permissionsLoading) return <BillingLoading />;
  if (!canManage) return <BillingNoAccess title="Neue Abrechnung" />;

  return (
    <BillingUploadPage
      section={INSURANCE_SECTION}
      sheetLabel="Versicherungstabelle (.xlsx)"
      hint="Gelesen wird das Blatt „Aktuell“. Spalten werden über ihre Überschrift erkannt (Chor-Nr., Rgn_Name1, Rg_Name2, Rg_Strasse, Rgn_Ort, Kommentar mit E-Mail, Chor, „bis … EUR“, Gesamt)."
      pending={createRun.isPending}
      onUpload={(input) => createRun.mutate(input)}
    />
  );
}
