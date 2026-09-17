import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Download, Mail } from "lucide-react";

/**
 * Wohin ein Link führt, bestimmt Element, Ziel und Pfeil: interne Seiten per
 * Next-Link mit Pfeil, fremde Websites und Dateien in neuem Tab (mit Hinweis
 * für Screenreader), E-Mail und Telefon als einfacher Anker.
 */
export type LinkKind = "internal" | "external" | "mail" | "download";

export function linkKindFor(href: string): LinkKind {
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return "mail";
  if (/^https?:\/\//.test(href)) return "external";
  return "internal";
}

interface SmartLinkProps {
  href: string;
  kind?: LinkKind;
  /** Dateityp für den Screenreader-Hinweis bei `download`, z. B. „PDF“. */
  fileType?: string;
  className?: string;
  children: ReactNode;
}

export function SmartLink({
  href,
  kind = linkKindFor(href),
  fileType = "PDF",
  className,
  children,
}: SmartLinkProps) {
  if (kind === "internal") {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  if (kind === "mail") {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      <span className="sr-only">
        {kind === "download"
          ? ` (${fileType}, öffnet in neuem Tab)`
          : " (öffnet eine externe Website)"}
      </span>
    </a>
  );
}

export function LinkIcon({
  kind,
  className,
}: {
  kind: LinkKind;
  className?: string;
}) {
  const Icon = {
    internal: ArrowRight,
    external: ArrowUpRight,
    mail: Mail,
    download: Download,
  }[kind];
  return <Icon aria-hidden className={className} />;
}
