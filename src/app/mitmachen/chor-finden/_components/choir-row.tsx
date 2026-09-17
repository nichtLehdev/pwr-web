import Link from "next/link";
import {
  ClockIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { ensemblePath } from "@/lib/slug";

type Choir = RouterOutputs["ensembles"]["getAll"]["ensembles"][number];

const META_ROW =
  "text-ink dark:text-night-text flex items-start gap-2 text-[0.9375rem]";
const META_ICON = "text-dark dark:text-night-muted mt-0.5 h-4 w-4 shrink-0";
/** Textlink-Stimme wie bei `PersonContactRow`, wiederverwendet für Kontaktwege. */
const LINK =
  "semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold underline-offset-4 hover:underline";

/**
 * Chorzeile: gleiche Grammatik wie `PersonContactRow` (Titel-Stimme, Meta mit
 * Bezirksmarke, Body-Zeilen mit Icon, Textlink für Kontaktwege) statt einer
 * Karte. Kein eigener Rahmen — die Haarlinie zwischen Chören kommt von der
 * umgebenden Liste.
 */
export function ChoirRow({ choir }: { choir: Choir }) {
  const email =
    choir.representative?.email ??
    choir.representativeEmail ??
    choir.conductorEmail ??
    "";
  const phone = choir.representativePhone ?? choir.conductorPhone;
  const rehearsal =
    choir.rehearsalSchedules && choir.rehearsalSchedules.length > 0
      ? choir.rehearsalSchedules.map((s) => `${s.day} ${s.time}`).join(", ")
      : choir.rehearsalDay && choir.rehearsalTime
        ? `${choir.rehearsalDay} um ${choir.rehearsalTime} Uhr`
        : null;

  return (
    <div className="py-6">
      <Link
        href={ensemblePath(choir)}
        className="condensed text-ink dark:text-night-text text-[1.375rem] leading-tight font-bold hover:underline"
      >
        {choir.name}
      </Link>
      <p className="text-dark dark:text-night-muted mt-1 text-[0.9375rem]">
        {choir.location ? (
          <span>
            {choir.location.city}, {choir.location.zipCode}
          </span>
        ) : null}
        {choir.bezirk ? (
          <span className="inline-flex items-center gap-1.5">
            {choir.location ? " · " : null}
            <BezirkLabel bezirk={choir.bezirk} variant="short" />
          </span>
        ) : null}
      </p>

      <div className="mt-3 space-y-1.5">
        {rehearsal ? (
          <div className={META_ROW}>
            <ClockIcon aria-hidden className={META_ICON} />
            <span>Proben: {rehearsal}</span>
          </div>
        ) : null}
        {choir.location ? (
          <div className={META_ROW}>
            <MapPinIcon aria-hidden className={META_ICON} />
            <span>
              {choir.location.street}, {choir.location.zipCode}{" "}
              {choir.location.city}
            </span>
          </div>
        ) : null}
        {phone ? (
          <div className={META_ROW}>
            <PhoneIcon aria-hidden className={META_ICON} />
            <span>Telefon: {phone}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        {choir.contactWebsite ? (
          <a
            href={choir.contactWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK}
          >
            <GlobeIcon className="h-4 w-4 shrink-0" aria-hidden />
            Webseite
            <span className="sr-only"> (öffnet eine externe Website)</span>
          </a>
        ) : null}
        <a href={`mailto:${email}`} className={cn(LINK, "-my-1")}>
          <MailIcon className="h-4 w-4 shrink-0" aria-hidden />
          Kontakt aufnehmen
          <span className="sr-only"> zu {choir.name}</span>
        </a>
      </div>
    </div>
  );
}
