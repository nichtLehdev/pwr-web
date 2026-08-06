import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import type { RouterOutputs } from "@/trpc/react";
import MediaCredit from "@/app/_components/general/media-credit";
import { GraduationCap, Star, Expand, Zap, Heart } from "lucide-react";

type HistoryEvent = RouterOutputs["organization"]["getHistory"][number];

interface HistoryTimelineProps {
  events: HistoryEvent[];
}

const categoryConfig = {
  FOUNDING: {
    label: "Gründung",
    icon: GraduationCap,
    marker: "bg-district-1",
    chip: "bg-district-1/10 text-district-1",
  },
  MILESTONE: {
    label: "Meilenstein",
    icon: Star,
    marker: "bg-primary",
    chip: "bg-primary/10 text-primary",
  },
  EXPANSION: {
    label: "Erweiterung",
    icon: Expand,
    marker: "bg-district-2",
    chip: "bg-district-2/10 text-district-2",
  },
  MODERNIZATION: {
    label: "Modernisierung",
    icon: Zap,
    marker: "bg-district-4",
    chip: "bg-district-4/10 text-district-4",
  },
  PARTNERSHIP: {
    label: "Partnerschaft",
    icon: Heart,
    marker: "bg-district-5",
    chip: "bg-district-5/10 text-district-5",
  },
} as const;

/**
 * All events at once on a vertical rail — the previous one-event-at-a-time
 * carousel hid the story behind a click-through and made the order
 * invisible. Pure markup, no client state.
 */
export default function HistoryTimeline({ events }: HistoryTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-gray-600 dark:text-gray-400">
        Keine Ereignisse verfügbar.
      </p>
    );
  }

  return (
    <ol className="relative space-y-10 md:space-y-14" aria-label="Zeitleiste">
      {/* Rail */}
      <div
        aria-hidden
        className="dark:bg-dark-border absolute top-3 bottom-3 left-5 w-0.5 rounded bg-gray-200"
      />

      {events.map((event) => {
        const config = categoryConfig[event.category ?? "MILESTONE"];
        const Icon = config.icon;

        return (
          <li key={event.id} className="relative pl-16 md:pl-20">
            {/* Marker */}
            <span
              aria-hidden
              className={`absolute top-0.5 left-5 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-md ${config.marker}`}
            >
              <Icon className="h-5 w-5" />
            </span>

            {/* Year + category */}
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="text-primary text-3xl font-bold tabular-nums">
                {event.year}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.chip}`}
              >
                {config.label}
              </span>
            </div>

            <div
              className={`dark:border-dark-border dark:bg-dark-surface overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ${
                event.image ? "md:grid md:grid-cols-[1fr_280px]" : ""
              }`}
            >
              <div className="p-5 md:p-6">
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold md:text-2xl">
                  {event.title}
                </h3>
                <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                  {event.description}
                </p>
              </div>

              {event.image && (
                <figure className="dark:border-dark-border border-t border-gray-100 md:border-t-0 md:border-l">
                  <div className="relative aspect-[16/10] md:h-full md:min-h-[200px]">
                    <ImageWithFallback
                      src={event.image.url}
                      alt={event.image.alt || event.title || "Ereignisbild"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <MediaCredit
                    copyright={event.image.copyright}
                    creator={event.image.creator}
                    showCreatorIcon
                    className="px-3 py-1.5 text-right"
                  />
                </figure>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
