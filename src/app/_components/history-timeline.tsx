import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import type { RouterOutputs } from "@/trpc/react";
import MediaCredit from "@/app/_components/general/media-credit";
import ZoomableImage from "@/app/_components/general/zoomable-image";
import { Tag } from "@/app/_components/programmheft/tag";

type HistoryEvent = RouterOutputs["organization"]["getHistory"][number];

interface HistoryTimelineProps {
  events: HistoryEvent[];
}

const CATEGORY_LABEL: Record<NonNullable<HistoryEvent["category"]>, string> = {
  FOUNDING: "Gründung",
  MILESTONE: "Meilenstein",
  EXPANSION: "Erweiterung",
  MODERNIZATION: "Modernisierung",
  PARTNERSHIP: "Partnerschaft",
};

/** Zeitleiste als Tabellensatz. Kategorien sind ein neutrales Etikett, nie eine Bezirksfarbe. */
export default function HistoryTimeline({ events }: HistoryTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-dark dark:text-night-muted">
        Keine Ereignisse verfügbar.
      </p>
    );
  }

  return (
    <ol
      aria-label="Zeitleiste"
      className="border-ink dark:border-night-text border-t-2"
    >
      {events.map((event) => {
        const category = event.category ? CATEGORY_LABEL[event.category] : null;

        return (
          <li
            key={event.id}
            className="border-rule dark:border-night-rule grid grid-cols-[4rem_1fr] gap-x-6 border-b py-6 sm:grid-cols-[5rem_1fr]"
          >
            <span className="condensed text-ink dark:text-night-text text-[2.25rem] leading-none font-extrabold tabular-nums">
              {event.year}
            </span>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="condensed text-ink dark:text-night-text text-[1.5rem] leading-tight font-bold">
                  {event.title}
                </h3>
                {category ? <Tag tone="inverse">{category}</Tag> : null}
              </div>
              <p className="text-dark dark:text-night-muted mt-2 max-w-[60ch] text-base leading-relaxed">
                {event.description}
              </p>

              {event.image ? (
                <figure className="mt-4 max-w-sm">
                  <ZoomableImage
                    src={event.image.url}
                    alt={event.image.alt || event.title || "Ereignisbild"}
                    copyright={event.image.copyright}
                    creator={event.image.creator}
                    className="bg-ink dark:bg-night-raised aspect-[3/2] w-full overflow-hidden"
                  >
                    <ImageWithFallback
                      src={event.image.url}
                      alt={event.image.alt || event.title || "Ereignisbild"}
                      fill
                      sizes="(min-width: 640px) 24rem, 100vw"
                      className="object-cover"
                    />
                  </ZoomableImage>
                  <MediaCredit
                    copyright={event.image.copyright}
                    creator={event.image.creator}
                    showCreatorIcon
                    className="mt-1.5"
                  />
                </figure>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
