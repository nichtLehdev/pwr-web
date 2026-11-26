"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { DashboardPage } from "@/app/_components/dashboard";

/** Spinner, dann entweder der Inhalt oder der Hinweis auf die fehlende Berechtigung. */
export function useBillingPermission() {
  const { hasPermission, isLoading } = usePermissions();
  return {
    canManage: hasPermission(PERMISSIONS.BILLING_MANAGE),
    permissionsLoading: isLoading,
  };
}

export function BillingLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden />
    </div>
  );
}

export function BillingNoAccess({
  title,
  breadcrumbs,
  message = "Für diesen Bereich fehlt dir die Berechtigung.",
}: {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  message?: ReactNode;
}) {
  return (
    <DashboardPage title={title} breadcrumbs={breadcrumbs}>
      <p className="text-dark dark:text-night-muted">{message}</p>
    </DashboardPage>
  );
}
