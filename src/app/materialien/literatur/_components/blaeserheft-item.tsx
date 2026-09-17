import Image from "next/image";
import { Tag } from "@/app/_components/programmheft/tag";
import { ValueTable } from "@/app/_components/programmheft/value-table";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

export type BlaeserheftData =
  RouterOutputs["materials"]["getBlaserhefte"][number];

/** Kleiner Kopf innerhalb eines Heft-Eintrags, z. B. „Kapitel:“. */
const LABEL_HEAD =
  "semi-condensed text-ink dark:text-night-text text-base font-semibold";

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="border-ink dark:border-night-text mt-3 border-t-2">
      {items.map((item, idx) => (
        <li
          key={idx}
          className="border-rule dark:border-night-rule text-ink dark:text-night-text flex gap-3 border-b px-1 py-2.5 text-base leading-snug"
        >
          <span
            aria-hidden
            className="bg-ink dark:bg-night-text mt-2 h-1.5 w-1.5 shrink-0"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Ein Bläserheft als Druckspalte: Cover als echtes Bild im Originalverhältnis,
 * ohne Rundung, Titel, Zustände als Etiketten, Beschreibung, Kapitel,
 * Highlights, Hörprobe und Preise im Tabellensatz.
 */
export function BlaeserheftItem({
  heft,
  reverse,
  divider,
}: {
  heft: BlaeserheftData;
  reverse: boolean;
  /** Trennt vom vorherigen Eintrag mit einer Haarlinie statt eines Kartenabstands. */
  divider: boolean;
}) {
  const priceRows = [
    heft.availableBlaeserheft && heft.priceBlaeserheft
      ? { label: "Bläserheft", value: `${heft.priceBlaeserheft} €` }
      : null,
    heft.availableBeiheft && heft.priceBeiheft
      ? { label: "Beiheft", value: `${heft.priceBeiheft} €` }
      : null,
    heft.availableTrompeten && heft.priceTrompeten
      ? { label: "Trompeten in B", value: `${heft.priceTrompeten} €` }
      : null,
    heft.availableCd && heft.priceCd
      ? { label: "CD", value: `${heft.priceCd} €` }
      : null,
  ].filter((row): row is { label: string; value: string } => row != null);

  return (
    <article
      className={cn(
        // Raster statt Flex: Als Flex-Kind war das Bildfeld mit `w-full` und
        // `shrink-0` mehrdeutig — WebKit gab ihm die ganze Zeilenbreite und
        // quetschte den Text auf ein Wort. Eine feste Rasterspalte kann das
        // nicht passieren.
        "flex flex-col gap-8 lg:grid lg:items-start lg:gap-10",
        reverse ? "lg:grid-cols-[1fr_20rem]" : "lg:grid-cols-[20rem_1fr]",
        divider && "border-rule dark:border-night-rule mt-16 border-t pt-16",
      )}
    >
      {/* Die Cover liegen alle im Querformat 3:2 vor. Das Feld übernimmt genau
          dieses Verhältnis, damit nichts beschnitten wird; `self-start`
          verhindert, dass die Flex-Zeile die Spalte auf Texthöhe streckt. */}
      <div
        className={cn(
          "bg-ink dark:bg-night-raised relative aspect-[3/2] w-full overflow-hidden",
          reverse && "lg:col-start-2 lg:row-start-1",
        )}
      >
        <Image
          src={heft.image.url}
          alt={heft.image.alt || heft.title || "Bläserheft Cover"}
          fill
          sizes="(min-width: 1024px) 20rem, 100vw"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="condensed text-ink dark:text-night-text text-[1.75rem] leading-[1.05] font-bold text-balance">
          {heft.title}
        </h3>
        <p className="semi-condensed text-primary-ink dark:text-primary mt-1 text-lg font-semibold">
          {heft.subtitle}
        </p>

        {!heft.availableBlaeserheft || heft.year >= 2024 ? (
          <p className="mt-3 flex flex-wrap items-center gap-2">
            {!heft.availableBlaeserheft ? (
              <Tag tone="inverse">Vergriffen</Tag>
            ) : null}
            {heft.year >= 2024 ? <Tag tone="orange">Neu</Tag> : null}
          </p>
        ) : null}

        <p className="text-dark dark:text-night-muted mt-4 max-w-[65ch] text-lg leading-relaxed">
          {heft.description}
        </p>

        {heft.chapters && heft.chapters.length > 0 ? (
          <div className="mt-6">
            <h4 className={LABEL_HEAD}>Kapitel:</h4>
            <BulletList items={heft.chapters} />
          </div>
        ) : null}

        {heft.highlights && heft.highlights.length > 0 ? (
          <div className="mt-6">
            <h4 className={LABEL_HEAD}>Besondere Highlights:</h4>
            <BulletList items={heft.highlights} />
          </div>
        ) : null}

        {heft.audioSample ? (
          <div className="mt-6">
            <h4 className={LABEL_HEAD}>Hörprobe:</h4>
            <audio controls className="mt-3 w-full max-w-md">
              <source src={heft.audioSample} type="audio/mpeg" />
              Ihr Browser unterstützt das Audio-Element nicht.
            </audio>
          </div>
        ) : null}

        <div className="border-rule dark:border-night-rule mt-8 border-t pt-6">
          <h4 className={LABEL_HEAD}>Verfügbar:</h4>
          <ValueTable rows={priceRows} className="mt-3" />
        </div>
      </div>
    </article>
  );
}
