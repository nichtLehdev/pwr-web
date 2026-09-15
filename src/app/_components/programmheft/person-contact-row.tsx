import Image from "next/image";
import type { ReactNode } from "react";
import { Mail, Phone } from "lucide-react";
import type { Media } from "~/generated/prisma/client";
import { cn } from "@/lib/utils";

/** Textlink-Stimme wie bei `PersonRow`, wiederverwendet für Mail und Telefon. */
const LINK =
  "semi-condensed text-primary-ink dark:text-primary -my-1 inline-flex min-h-11 items-center gap-2 text-base font-semibold underline-offset-4 hover:underline";

interface PersonContactRowProps {
  name: string;
  /** Amt oder Zuständigkeit, steht unter dem Namen. */
  role?: ReactNode;
  image?: Pick<Media, "url" | "alt" | "copyright" | "creator"> | null;
  email?: string | null;
  phone?: string | null;
  /** Kurzporträt unter Amt/Zusatz. */
  bio?: ReactNode;
  /** Weitere Angaben zwischen Amt und Porträt, z. B. Bezirksmarken. */
  meta?: ReactNode;
  /** `lead`: größeres Foto für eine hervorgehobene Person (Landesposaunenwart). */
  size?: "default" | "lead";
  className?: string;
}

/**
 * Personenzeile mit Telefon und Kurzporträt (Erweiterung von `PersonRow` für
 * Vorstand und Posaunenwarte, deren Daten zusätzlich Telefon und Bio führen).
 * Gleiche Stimme wie `PersonRow`: rundes Foto, Titel-Stimme für den Namen,
 * Body-Schiefer für Amt und Text, Textlinks mit Icon für Kontaktwege. Ohne
 * Foto entfällt der Bildblock ganz statt eines Platzhalters.
 */
export function PersonContactRow({
  name,
  role,
  image,
  email,
  phone,
  bio,
  meta,
  size = "default",
  className,
}: PersonContactRowProps) {
  const credit = image
    ? [image.copyright, image.creator].filter(Boolean).join(" · ")
    : "";
  const photoSize = size === "lead" ? "h-24 w-24 sm:h-28 sm:w-28" : "h-14 w-14";

  return (
    <div
      className={cn(
        "border-rule dark:border-night-rule flex flex-col gap-4 border-b py-6 sm:flex-row sm:items-start sm:gap-5",
        className,
      )}
    >
      {image ? (
        <div
          className={cn(
            "bg-rule dark:bg-night-rule relative shrink-0 overflow-hidden rounded-full",
            photoSize,
          )}
        >
          <Image
            src={image.url}
            alt={image.alt || name}
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="min-w-0">
        <p
          className={cn(
            "condensed text-ink dark:text-night-text leading-tight font-bold",
            size === "lead" ? "text-[1.75rem]" : "text-[1.375rem]",
          )}
        >
          {name}
        </p>
        {role ? (
          <p className="text-dark dark:text-night-muted mt-0.5 text-[0.9375rem]">
            {role}
          </p>
        ) : null}
        {meta}
        {bio ? (
          <p className="text-ink dark:text-night-text mt-3 max-w-[60ch] text-base leading-relaxed">
            {bio}
          </p>
        ) : null}
        {email || phone ? (
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            {email ? (
              <a href={`mailto:${email}`} className={LINK}>
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                E-Mail senden
                <span className="sr-only"> an {name}</span>
              </a>
            ) : null}
            {phone ? (
              <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className={LINK}>
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                {phone}
                <span className="sr-only"> anrufen</span>
              </a>
            ) : null}
          </div>
        ) : null}
        {credit ? (
          <p className="text-dark dark:text-night-muted mt-1 text-sm">
            <span className="sr-only">Bildnachweis: </span>
            {credit}
          </p>
        ) : null}
      </div>
    </div>
  );
}
