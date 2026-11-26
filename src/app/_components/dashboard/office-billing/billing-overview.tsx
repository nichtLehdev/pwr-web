"use client";

import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  LINK_OUTLINE,
  LINK_PRIMARY,
  type BillingSection,
} from "@/app/_components/dashboard/office-billing-ui";
import { BillingRunsTable, type BillingRunRow } from "./billing-runs-table";
import {
  BillingLoading,
  BillingNoAccess,
  useBillingPermission,
} from "./billing-page-gate";

/** Startseite einer Abrechnung: alle Läufe, dazu Einstellungen und Hochladen. */
export function BillingOverviewPage({
  section,
  description,
  emptyHint,
  useRuns,
}: {
  section: BillingSection;
  description: string;
  emptyHint: string;
  /** Der listRuns-Hook des jeweiligen Routers. */
  useRuns: (enabled: boolean) => {
    data: BillingRunRow[] | undefined;
    isLoading: boolean;
  };
}) {
  const { canManage, permissionsLoading } = useBillingPermission();
  const runs = useRuns(canManage);

  if (permissionsLoading || (canManage && runs.isLoading)) {
    return <BillingLoading />;
  }
  if (!canManage) return <BillingNoAccess title={section.title} />;

  return (
    <DashboardPage
      title={section.title}
      description={description}
      breadcrumbs={[
        ...section.breadcrumbs.slice(0, -1),
        { label: section.title },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${section.basePath}/einstellungen`}
            className={LINK_OUTLINE}
          >
            <Settings className="h-4 w-4" aria-hidden />
            Texte & Einstellungen
          </Link>
          <Link href={`${section.basePath}/neu`} className={LINK_PRIMARY}>
            <Plus className="h-4 w-4" aria-hidden />
            Neue Abrechnung
          </Link>
        </div>
      }
    >
      <BillingRunsTable
        section={section}
        runs={runs.data}
        emptyHint={emptyHint}
      />
    </DashboardPage>
  );
}
