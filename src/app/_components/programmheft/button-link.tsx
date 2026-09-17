import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LinkIcon, SmartLink, linkKindFor, type LinkKind } from "./link";

/**
 * Schaltfläche als Link, rechteckig und gedruckt.
 * - `primary` auf Papier: Tinte, Hover Orange; im Nachtdruck Orange, Hover Papier
 * - `primary` auf Orange: Tinte, Hover kehrt um auf Papier
 * - `outline`: 2px-Rahmen, Hover füllt mit Schriftfarbe
 */
export type ButtonVariant = "primary" | "outline";

const ON_PAPER: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper",
  outline:
    "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night border-2",
};

/** Orange bleibt im Nachtdruck Orange, darauf steht immer Tinte. */
const ON_ORANGE: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:bg-paper hover:text-ink",
  outline: "border-ink text-ink hover:bg-ink hover:text-paper border-2",
};

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  surface?: "paper" | "orange";
  kind?: LinkKind;
  fileType?: string;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({
  href,
  variant = "primary",
  surface = "paper",
  kind,
  fileType,
  className,
  children,
}: ButtonLinkProps) {
  const resolved = kind ?? linkKindFor(href);
  const look = (surface === "orange" ? ON_ORANGE : ON_PAPER)[variant];

  return (
    <SmartLink
      href={href}
      kind={resolved}
      fileType={fileType}
      className={cn(
        "semi-condensed inline-flex min-h-12 items-center gap-3 px-6 text-lg font-semibold transition-colors",
        look,
        className,
      )}
    >
      {children}
      <LinkIcon kind={resolved} className="h-5 w-5 shrink-0" />
    </SmartLink>
  );
}
