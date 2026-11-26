"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { api, type RouterOutputs } from "@/trpc/react";
import {
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui";
import { formatEuro } from "@/lib/invoice-document";
import { MEMBERSHIP_SECTION } from "@/app/_components/dashboard/office-billing-ui";
import { RunRateTiles } from "@/app/_components/dashboard/office-billing/run-rate-tiles";
import {
  BillingRunView,
  type BillingRunActions,
  type ExcludedReason,
} from "@/app/_components/dashboard/office-billing/billing-run-view";
import {
  BillingLoading,
  BillingNoAccess,
  useBillingPermission,
} from "@/app/_components/dashboard/office-billing/billing-page-gate";

type Run = RouterOutputs["membershipBilling"]["getRun"];
type RunInvoice = Run["invoices"][number];

const invoiceColumn = createDataTableColumnHelper<RunInvoice>();

function excludedReasons(invoice: RunInvoice): ExcludedReason[] {
  const reasons: ExcludedReason[] = [];
  if (invoice.sheetMarkedRed) {
    reasons.push({ label: "in der Tabelle rot markiert", tone: "cancelled" });
  }
  if (!invoice.sheetHasTotal) {
    reasons.push({ label: "kein Gesamtbetrag in der Tabelle", tone: "muted" });
  }
  return reasons.length > 0
    ? reasons
    : [{ label: "von Hand verschoben", tone: "muted" }];
}

/** "16 / 16", "Vorjahr" oder "–" — was hinter dem Staffelbeitrag steckt. */
function membersText(invoice: RunInvoice): string {
  if (invoice.graduatedFeeFixed !== null) {
    return invoice.membersWithIncome === null &&
      invoice.membersWithoutIncome === null
      ? "Vorjahr"
      : "von Hand";
  }
  if (
    invoice.membersWithIncome === null &&
    invoice.membersWithoutIncome === null
  ) {
    return "–";
  }
  return `${invoice.membersWithIncome ?? 0} / ${invoice.membersWithoutIncome ?? 0}`;
}

function lineAmount(invoice: RunInvoice, key: string): number {
  return invoice.lines.find((line) => line.key === key)?.amount ?? 0;
}

function MembershipRun({ run }: { run: Run }) {
  const utils = api.useUtils();
  const updateRun = api.membershipBilling.updateRun.useMutation();
  const updateInvoice = api.membershipBilling.updateInvoice.useMutation();
  const setExcluded = api.membershipBilling.setExcluded.useMutation();
  const send = api.membershipBilling.send.useMutation();
  const issueRun = api.membershipBilling.issueRun.useMutation();
  const deleteRun = api.membershipBilling.deleteRun.useMutation();
  const setRunRates = api.membershipBilling.setRunRates.useMutation();

  const after = async <T,>(promise: Promise<T>) => {
    const result = await promise;
    await Promise.all([
      utils.membershipBilling.getRun.invalidate({ id: run.id }),
      utils.membershipBilling.listRuns.invalidate(),
    ]);
    return result;
  };
  const actions: BillingRunActions = {
    updateRun: (input) =>
      after(updateRun.mutateAsync({ id: run.id, ...input })),
    updateEmail: (id, email) => after(updateInvoice.mutateAsync({ id, email })),
    setExcluded: (invoiceIds, excluded) =>
      after(setExcluded.mutateAsync({ runId: run.id, invoiceIds, excluded })),
    send: (input) => after(send.mutateAsync({ runId: run.id, ...input })),
    issue: () => after(issueRun.mutateAsync({ id: run.id })),
    remove: async () => {
      await deleteRun.mutateAsync({ id: run.id });
      await utils.membershipBilling.listRuns.invalidate();
    },
  };

  const extraColumns = useCallback(
    (): DataTableColumn<RunInvoice>[] => [
      invoiceColumn.accessor(membersText, {
        id: "members",
        header: "Mitgl. mit / ohne Eink.",
        enableColumnFilter: false,
        enableSorting: false,
        meta: {
          align: "right",
          label: "Mitglieder",
          cellClassName: "whitespace-nowrap tabular-nums",
        },
        cell: ({ row }) => (
          <span
            title={
              row.original.graduatedFeeFixed !== null
                ? `Staffelbeitrag von Hand: ${formatEuro(row.original.graduatedFeeFixed)}`
                : undefined
            }
          >
            {membersText(row.original)}
          </span>
        ),
      }),
      invoiceColumn.accessor((invoice) => lineAmount(invoice, "graduated"), {
        id: "graduated",
        header: "Staffel",
        enableColumnFilter: false,
        meta: {
          align: "right",
          label: "Staffelbeitrag",
          cellClassName: "whitespace-nowrap tabular-nums",
        },
        cell: ({ getValue }) =>
          (getValue() as number) ? formatEuro(getValue() as number) : "–",
      }),
      invoiceColumn.accessor((invoice) => invoice.magazineCount, {
        id: "magazine",
        header: "Hefte",
        enableColumnFilter: false,
        meta: {
          align: "right",
          label: "Hefte POSAUNENCHOR",
          cellClassName: "tabular-nums",
        },
        cell: ({ getValue }) => (getValue() as number) || "–",
      }),
    ],
    [],
  );

  return (
    <BillingRunView
      section={MEMBERSHIP_SECTION}
      run={run}
      actions={actions}
      extraColumns={extraColumns}
      excludedReasons={excludedReasons}
      draftExplanation={
        <>
          Vorschauen tragen den Stempel „ENTWURF“ und rechnen mit den
          Beitragssätzen dieser Abrechnung und den Texten aus den Einstellungen.
          Von Hand eingetragene Beträge der Tabelle (Vorjahresbetrag, fester
          Gesamtbetrag) werden übernommen. Beim Ausstellen wird alles
          festgeschrieben; danach kannst du versenden.
        </>
      }
      draftNotices={
        run.missingRatesMessage && (
          <p className="font-semibold text-red-700 dark:text-red-400">
            {run.missingRatesMessage} Trage den Satz unten unter „Beitragssätze“
            ein.
          </p>
        )
      }
      draftAside={
        <RunRateTiles
          title="Beitragssätze"
          description="Sätze dieser Abrechnung, beim Hochladen aus den Formeln der Tabelle übernommen. Von Hand eingetragene Beträge der Tabelle (Vorjahresbetrag, fester Gesamtbetrag) bleiben davon unberührt."
          tiles={run.rates.map((rate) => ({
            key: rate.key,
            label: rate.label,
            hint: rate.hint,
            sheetValue: rate.sheetValue,
            value: rate.value,
            manual: rate.source === "manual",
          }))}
          onSave={(changes) =>
            after(setRunRates.mutateAsync({ id: run.id, ...changes }))
          }
        />
      }
      canIssue={run.missingRates.length === 0}
      issueConfirm="Beitragssätze und Texte werden dabei festgeschrieben und lassen sich danach nicht mehr ändern."
      sheetTotalTitle="Weicht vom berechneten Betrag ab (andere Beitragssätze oder von Hand eingetragener Teilbetrag?)"
    />
  );
}

export default function MembershipRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const { canManage, permissionsLoading } = useBillingPermission();
  const run = api.membershipBilling.getRun.useQuery(
    { id: runId },
    { enabled: canManage },
  );

  if (permissionsLoading || (canManage && run.isLoading)) {
    return <BillingLoading />;
  }
  if (!canManage || !run.data) {
    return (
      <BillingNoAccess
        title="Abrechnung"
        breadcrumbs={MEMBERSHIP_SECTION.breadcrumbs}
        message={
          canManage
            ? "Diese Abrechnung gibt es nicht."
            : "Für diesen Bereich fehlt dir die Berechtigung."
        }
      />
    );
  }

  return <MembershipRun run={run.data} />;
}
