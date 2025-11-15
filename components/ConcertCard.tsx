import { AuswahlChor, Event } from "@/types/strapi";
import Link from "next/link";
import React from "react";

interface ConcertCardProps {
  concert: Event;
  ensemble: AuswahlChor;
  i: number; // The key index
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ConcertCard: React.FC<ConcertCardProps> = ({ concert, ensemble, i }) => {
  return (
    <Link href={`/termine/event/${concert.id}`}>
      <div
        key={i}
        className="border-l-4 pl-4 py-2 hover:shadow-md transition-all bg-white rounded-md mb-4"
        style={{ borderColor: ensemble.colorHex }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h4 className="font-bold text-dark mb-1">{concert.title}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              {/* Date Information */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
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
                {formatDate(concert.eventDate)}, {getTime(concert.eventDate)}
              </div>

              {/* Location Information */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4"
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

                {concert.location.venue ? `${concert.location.venue}, ` : ""}
                {concert.location.city}
              </div>
            </div>
          </div>

          {/* Category Tag */}
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${ensemble.color} text-white shrink-0`}
          >
            {concert.category}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ConcertCard;
