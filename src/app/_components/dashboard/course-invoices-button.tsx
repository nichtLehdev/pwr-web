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
 * Der Sprung in die Rechnungsliste eines Kurses — auf jeder Kursseite derselbe
 * Knopf, damit man ihn nicht auf jeder Seite woanders suchen muss.
 *
 * Ob er erscheint, entscheidet der Server (`canManageCourseInvoices`), nicht die
 * Seite: sonst driften Knopf und Guard auseinander und es entsteht entweder ein
 * Knopf, der 403 wirft, oder eine Berechtigung ohne Knopf.
 *
 * Bewusst auch dann sichtbar, wenn für den Kurs `invoicingEnabled` aus ist: die
 * Rechnungsseite zeigt in dem Fall die bereits bestehenden Rechnungen samt
 * Hinweisbanner, und genau dorthin will man dann.
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
      ? "bg-primary hover:bg-primary/90 text-white"
      : "dark:border-dark-border dark:bg-dark-surface dark:text-dark-text border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700";

  return (
    <Link
      href={`/dashboard/courses/${courseId}/invoices`}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${styles} ${className ?? ""}`}
    >
      <ReceiptTextIcon className="h-4 w-4" />
      {short ? "Rechnungen" : "Rechnungen verwalten"}
    </Link>
  );
}
