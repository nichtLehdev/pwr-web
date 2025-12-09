import Link from "next/link";
import React from "react";
import type { RouterOutputs } from "@/trpc/react";
import { capitalizeFirstLetter } from "@/lib/utils";

type Event = Omit<
  RouterOutputs["events"]["getById"],
  | "bezirk"
  | "auswahlChor"
  | "coverImage"
  | "reviewer"
  | "createdBy"
  | "ensemble"
>;
type AuswahlChor =
  RouterOutputs["auswahlchoereRouter"]["getAll"]["auswahlchoere"][0];

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
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
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
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>

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
