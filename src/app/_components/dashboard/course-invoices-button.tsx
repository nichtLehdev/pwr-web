"use client";

import Link from "next/link";
import { ReceiptTextIcon } from "lucide-react";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";

interface CourseInvoicesButtonProps {
  courseId: string;
  /** `primary` for pages where invoicing is the point, `secondary` elsewhere. */
  variant?: "primary" | "secondary";
  /** Shortens the label to "Rechnungen" where header space is tight. */
  short?: boolean;
  className?: string;
}

/**
 * Ob er erscheint, entscheidet der Server (`canManageCourseInvoices`), damit Knopf und Guard nicht
 * auseinanderdriften. Auch bei `invoicingEnabled` aus sichtbar: dann zeigt die Seite bestehende Rechnungen.
 */
export function CourseInvoicesButton({
  courseId,
  variant = "secondary",
  short = false,
  className,
}: CourseInvoicesButtonProps) {
  const { data: session } = useSession();
  const { data: access } = api.invoices.canManageCourseInvoices.useQuery(
    { courseId },
    { enabled: !!courseId && !!session?.user },
  );

  if (!access?.canManage) return null;

  const styles =
    variant === "primary"
      ? // Weiß auf Orange fällt unter AA — auf Orange steht immer Tinte.
        "on-orange bg-primary hover:bg-primary/90 text-ink"
      : "border-rule dark:border-night-rule text-ink dark:text-night-text border bg-paper dark:bg-night hover:bg-rule/30 dark:hover:bg-night-raised";

  return (
    <Link
      href={`/dashboard/courses/${courseId}/invoices`}
      className={`inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium transition-colors ${styles} ${className ?? ""}`}
    >
      <ReceiptTextIcon className="h-4 w-4" />
      {short ? "Rechnungen" : "Rechnungen verwalten"}
    </Link>
  );
}
