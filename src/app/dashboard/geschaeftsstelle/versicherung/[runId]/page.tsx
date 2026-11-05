"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { DashboardPage } from "@/app/_components/dashboard";
import {
  createDataTableColumnHelper,
  type DataTableColumn,
} from "@/app/_components/ui";
import { formatEuro } from "@/lib/invoice-document";
import {
  formatTaxRate,
  grossPremium,
  insuranceCategoryLabel,
} from "@/lib/insurance-billing";
import { RunRateTiles } from "@/app/_components/dashboard/office-billing/run-rate-tiles";
import { INSURANCE_SECTION } from "@/app/_components/dashboard/office-billing-ui";
import {
  BillingRunView,
  type BillingRunActions,
  type ExcludedReason,
} from "@/app/_components/dashboard/office-billing/billing-run-view";

type Run = RouterOutputs["insuranceBilling"]["getRun"];
type RunInvoice = Run["invoices"][number];

const invoiceColumn = createDataTableColumnHelper<RunInvoice>();

/** Warum ein Chor keine Rechnung bekommt — zum Nachprüfen der zweiten Liste. */
function excludedReasons(invoice: RunInvoice): ExcludedReason[] {
  const reasons: ExcludedReason[] = [];
  if (invoice.sheetMarkedRed) {
    reasons.push({ label: "in der Tabelle rot markiert", tone: "cancelled" });
  }
  if (invoice.quantities.every((quantity) => quantity === 0)) {
    reasons.push({ label: "keine Instrumente", tone: "muted" });
  }
  return reasons.length > 0
    ? reasons
    : [{ label: "von Hand verschoben", tone: "muted" }];
}

function InsuranceRun({ run }: { run: Run }) {
  const utils = api.useUtils();
  // Gilt für beide Listen, damit sie gleich aufgebaut bleiben.
  const [showCategories, setShowCategories] = useState(false);

  const updateRun = api.insuranceBilling.updateRun.useMutation();
  const updateInvoice = api.insuranceBilling.updateInvoice.useMutation();
  const setExcluded = api.insuranceBilling.setExcluded.useMutation();
  const send = api.insuranceBilling.send.useMutation();
  const issueRun = api.insuranceBilling.issueRun.useMutation();
  const deleteRun = api.insuranceBilling.deleteRun.useMutation();
  const setRunRates = api.insuranceBilling.setRunRates.useMutation();

  const after = async <T,>(promise: Promise<T>) => {
    const result = await promise;
    await Promise.all([
      utils.insuranceBilling.getRun.invalidate({ id: run.id }),
      utils.insuranceBilling.listRuns.invalidate(),
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
      await utils.insuranceBilling.listRuns.invalidate();
    },
  };

  const { categories } = run;
  // Zusammengeklappt nur die Summe; die Überschrift klappt die Wertklassen auf.
  const extraColumns = useCallback(
    (): DataTableColumn<RunInvoice>[] => [
      invoiceColumn.accessor(
        (invoice) =>
          invoice.quantities.reduce((sum, quantity) => sum + quantity, 0),
        {
          id: "instruments",
          header: () => (
            <button
              type="button"
              aria-expanded={showCategories}
              onClick={() => setShowCategories((current) => !current)}
              className="hover:text-ink dark:hover:text-night-text inline-flex items-center gap-1 uppercase"
              title={
                showCategories
                  ? "Wertklassen zuklappen"
                  : "Anzahl je Wertklasse aufklappen"
              }
            >
              {showCategories ? (
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              )}
              Instrumente
            </button>
          ),
          enableColumnFilter: false,
          enableSorting: false,
          meta: {
            align: "right",
            label: "Instrumente",
            cellClassName: "tabular-nums",
          },
          cell: ({ getValue }) => (getValue() as number) || "–",
        },
      ),
      ...(showCategories
        ? categories.map((category, index) =>
            invoiceColumn.accessor(
              (invoice) => invoice.quantities[index] ?? 0,
              {
                id: `qty-${category.maxValue}`,
                header: `bis ${category.maxValue.toLocaleString("de-DE")}`,
                enableColumnFilter: false,
                meta: {
                  align: "right",
                  headerClassName: "bg-rule/25 dark:bg-night-raised",
                  cellClassName: "tabular-nums bg-rule/25 dark:bg-night-raised",
                },
                cell: ({ getValue }) => (getValue() as number) || "",
              },
            ),
          )
        : []),
    ],
    [categories, showCategories],
  );

  return (
    <BillingRunView
      section={INSURANCE_SECTION}
      run={run}
      actions={actions}
      extraColumns={extraColumns}
      excludedReasons={excludedReasons}
      draftExplanation={
        <>
          Vorschauen tragen den Stempel „ENTWURF“ und rechnen mit den Prämien
          dieser Abrechnung, dem Steuersatz ({formatTaxRate(run.taxRate)}) und
          den Texten aus den Einstellungen. Beim Ausstellen wird das
          festgeschrieben; danach kannst du versenden.
        </>
      }
      draftNotices={
        run.missingRates.length > 0 && (
          <ul className="space-y-1">
            {run.missingRates.map((maxValue) => (
              <li
                key={maxValue}
                className="font-semibold text-red-700 dark:text-red-400"
              >
                Für „{insuranceCategoryLabel(maxValue)}“ fehlt eine Prämie —
                trage sie unten unter „Prämien je Wertklasse“ ein.
              </li>
            ))}
          </ul>
        )
      }
      draftAside={
        <RunRateTiles
          title="Prämien je Wertklasse"
          description={`Nettoprämie je Instrument für diese Abrechnung, beim Hochladen aus der Tabelle übernommen. Auf der Rechnung steht der Bruttobetrag mit ${formatTaxRate(run.taxRate)} Versicherungssteuer.`}
          unit="€ netto"
          preview={(net) =>
            `${formatEuro(grossPremium(net, run.taxRate))} brutto`
          }
          tiles={run.categories.map((category) => ({
            key: String(category.maxValue),
            label: insuranceCategoryLabel(category.maxValue),
            sheetValue: category.sheetNetPremium,
            value: category.netPremium,
            manual: category.source === "manual",
          }))}
          onSave={(changes) =>
            after(
              setRunRates.mutateAsync({
                id: run.id,
                rates: Object.entries(changes).map(([key, netPremium]) => ({
                  maxValue: Number(key),
                  netPremium,
                })),
              }),
            )
          }
        />
      }
      canIssue={run.missingRates.length === 0}
      issueConfirm="Prämien, Steuersatz und Texte werden dabei festgeschrieben und lassen sich danach nicht mehr ändern."
      sheetTotalTitle="Weicht vom berechneten Betrag ab (andere Prämie oder Steuersatz?)"
    />
  );
}

export default function InsuranceRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManage = hasPermission(PERMISSIONS.BILLING_MANAGE);
  const run = api.insuranceBilling.getRun.useQuery(
    { id: runId },
    { enabled: canManage },
  );

  if (permissionsLoading || (canManage && run.isLoading)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!canManage || !run.data) {
    return (
      <DashboardPage
        title="Abrechnung"
        breadcrumbs={INSURANCE_SECTION.breadcrumbs}
      >
        <p className="text-dark dark:text-night-muted">
          {canManage
            ? "Diese Abrechnung gibt es nicht."
            : "Für diesen Bereich fehlt dir die Berechtigung."}
        </p>
      </DashboardPage>
    );
  }

  return <InsuranceRun run={run.data} />;
}
