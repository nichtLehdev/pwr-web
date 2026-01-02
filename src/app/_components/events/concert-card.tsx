import Link from "next/link";
import React from "react";
import type { RouterOutputs } from "@/trpc/react";
import { capitalizeFirstLetter } from "@/lib/utils";
import { Calendar, MapPin } from "lucide-react";

type Event = Omit<
  RouterOutputs["events"]["getById"],
  | "bezirk"
  | "auswahlChor"
  | "coverImage"
  | "reviewer"
  | "createdBy"
  | "ensemble"
>;
type AuswahlChor = RouterOutputs["auswahlchoere"]["getAll"]["auswahlchoere"][0];

interface ConcertCardProps {
  concert: Event;
  ensemble: AuswahlChor;
  i: number;
}

const ConcertCard: React.FC<ConcertCardProps> = ({ concert, ensemble, i }) => {
  return (
    <Link href={`/termine/event/${concert.id}`}>
      <div
        key={i}
        className="dark:bg-dark-surface dark:hover:shadow-dark-border mb-4 rounded-md border-l-4 bg-white py-2 pl-4 transition-all hover:shadow-md"
        style={{ borderColor: ensemble.colorHex }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[200px] flex-1">
            <h4 className="text-dark dark:text-dark-text mb-1 line-clamp-2 font-bold">
              {concert.title}
            </h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {/* Date Information */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(concert.eventDate).toLocaleDateString("de-DE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                ,{" "}
                {new Date(concert.eventDate).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              {/* Location Information */}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />

                {concert.location && (
                  <span className="font-semibold">
                    {concert.location.name}, {concert.location.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Category Tag */}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${ensemble.color} shrink-0 text-white`}
          >
            {capitalizeFirstLetter(concert.category)}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ConcertCard;
