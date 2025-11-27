import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import { capitalizeFirstLetter } from "@/lib/utils";

interface EventCardProps {
  id: string;
  title: string;
  date: Date;
  location: string;
  category: string;
  district?: number;
  openToParticipants?: boolean;
  cancelled?: boolean;
}

export default function EventCard({
  id,
  title,
  date,
  location,
  category,
  district,
  openToParticipants,
  cancelled,
}: EventCardProps) {
  const districtColor = getDistrictColor(district);

  return (
    <Link href={`/termine/event/${id}`} className="group block h-full">
      <article
        className={`dark:shadow-dark-border bg-background-secondary dark:bg-dark-surface relative flex h-full cursor-pointer flex-col rounded-lg border-l-4 p-6 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          cancelled ? "opacity-75" : ""
        }`}
        style={{
          borderLeftColor: districtColor,
        }}
      >
        {/* Cancelled Banner */}
        {cancelled && (
          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-center rounded-t-lg bg-red-600 py-2">
            <svg
              className="mr-2 h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-bold tracking-wider text-white uppercase">
              Abgesagt
            </span>
          </div>
        )}

        <div
          className={`mb-4 flex items-start justify-between ${cancelled ? "mt-8" : ""}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {capitalizeFirstLetter(category)}
            </span>
            {openToParticipants && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-green-300 bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Mitspielen möglich
              </span>
            )}
          </div>
          <span
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: districtColor }}
          >
            {district ? `Bezirk ${district}` : "Bezirksübergreifend"}
          </span>
        </div>

        <h3
          className={`group-hover:text-primary dark:group-hover:text-primary mb-2 text-xl font-bold transition-colors dark:text-white ${
            cancelled
              ? "text-gray-500 line-through dark:text-gray-400"
              : "text-dark"
          }`}
        >
          {title}
        </h3>

        <div
          className={`mb-4 grow space-y-2 text-sm ${
            cancelled
              ? "text-gray-400 dark:text-gray-500"
              : "text-gray-600 dark:text-gray-300"
          }`}
        >
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
            {`${date.toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}, ${date.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}`}
          </div>
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
            {location}
          </div>
        </div>

        <div className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
          Details ansehen
          <svg
            className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </article>
    </Link>
  );
}
