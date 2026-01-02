import { getDistrictColor } from "@/lib/district-color";
import { MapPinIcon } from "lucide-react";

interface Event {
  id: string;
  title: string;
  eventDate: Date;
  location?: {
    city?: string | null;
  } | null;
  category: string;
  bezirk?: {
    number: number;
    name: string;
  } | null;
}

interface InstagramSummaryTemplateProps {
  events: Event[];
  month: number;
  year: number;
  pageNumber?: number;
  totalPages?: number;
  totalEvents?: number;
}

const monthNames = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export default function InstagramSummaryTemplate({
  events,
  month,
  year,
  pageNumber,
  totalPages,
  totalEvents,
}: InstagramSummaryTemplateProps) {
  const monthName = monthNames[month - 1];

  return (
    <div
      className="relative flex h-[1080px] w-[1080px] flex-col overflow-hidden bg-white"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Decorative Header Background */}
      <div className="bg-primary relative h-80 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute bottom-0 -left-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute top-32 right-32 h-24 w-24 rounded-full bg-white/20" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-12 text-center text-white">
          <h1 className="mb-3 text-7xl font-black tracking-tight">
            {monthName}
          </h1>
          <div className="text-4xl font-bold">{year}</div>
          <div className="mt-4 rounded-full bg-white/20 px-8 py-3 text-3xl font-bold backdrop-blur-sm">
            {totalEvents ? totalEvents : events.length}{" "}
            {totalEvents
              ? totalEvents === 1
                ? "Termin"
                : "Termine"
              : events.length === 1
                ? "Termin"
                : "Termine"}
            {pageNumber && totalPages && (
              <div className="mt-1 text-xl opacity-90">
                Seite {pageNumber} von {totalPages}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-hidden bg-linear-to-b from-gray-50 to-white px-10 py-4">
        <div className="space-y-3">
          {events.map((event) => {
            const districtColor = event.bezirk
              ? getDistrictColor(event.bezirk.number)
              : "#faa619";
            return (
              <div
                key={event.id}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-md"
              >
                <div
                  className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-lg"
                  style={{ backgroundColor: districtColor }}
                >
                  <div className="text-3xl font-black">
                    {new Date(event.eventDate).getDate()}
                  </div>
                  <div className="text-sm font-semibold uppercase">
                    {new Date(event.eventDate)
                      .toLocaleDateString("de-DE", {
                        month: "short",
                      })
                      .replace(".", "")}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-dark mb-1 line-clamp-2 text-2xl leading-tight font-bold">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    {event.location?.city && (
                      <p className="text-dark-light flex items-center gap-2 text-lg font-medium">
                        <MapPinIcon
                          className="h-5 w-5 shrink-0"
                        />
                        {event.location.city}
                      </p>
                    )}
                    {event.bezirk && (
                      <span
                        className="rounded-full px-3 py-1 text-sm font-bold text-white"
                        style={{ backgroundColor: districtColor }}
                      >
                        Bez. {event.bezirk.number}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-dark flex items-center justify-between px-10 py-6 text-white">
        <div className="text-2xl font-bold">Posaunenwerk Rheinland</div>
        <div className="text-xl">📍 posaunenwerk-rheinland.de</div>
      </div>
    </div>
  );
}
