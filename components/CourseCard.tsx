import Link from "next/link";
import { getDistrictColor } from "@/lib/districtColors";

interface CourseCardProps {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  courseType: string;
  spotsAvailable: number;
  registrationOpen: boolean;
  districtName: string;
}

export default function CourseCard({
  id,
  title,
  startDate,
  endDate,
  location,
  courseType,
  spotsAvailable,
  registrationOpen,
  districtName,
}: CourseCardProps) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const isSameDay = start.toDateString() === end.toDateString();

  // Berechne Dauer in Tagen
  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

  const districtColor = getDistrictColor(districtName);

  return (
    <article
      className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 flex flex-col h-full border-l-4"
      style={{ borderLeftColor: districtColor }}
    >
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <span
          className="text-xs font-semibold text-white px-3 py-1 rounded-full"
          style={{ backgroundColor: districtColor }}
        >
          {courseType}
        </span>
        <div className="flex gap-2">
          {!isSameDay && (
            <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              {durationDays} {durationDays === 1 ? "Tag" : "Tage"}
            </span>
          )}
          {registrationOpen && spotsAvailable > 0 && (
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
              Anmeldung offen
            </span>
          )}
          {registrationOpen && spotsAvailable === 0 && (
            <span className="text-xs font-semibold text-red-700 bg-red-100 px-3 py-1 rounded-full">
              Ausgebucht
            </span>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold text-dark mb-2">{title}</h3>

      <div className="space-y-2 text-sm text-gray-600 mb-4 flex-col">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 shrink-0"
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
          {isSameDay ? (
            <span>
              {start.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          ) : (
            <span>
              {start.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
              })}
              {" - "}
              {end.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 shrink-0"
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

        {registrationOpen && spotsAvailable > 0 && (
          <div className="flex items-center gap-2 text-primary font-semibold">
            <svg
              className="w-4 h-4 shrink-0"
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
            Noch {spotsAvailable} {spotsAvailable === 1 ? "Platz" : "Plätze"}{" "}
            frei
          </div>
        )}
      </div>

      <Link
        href={`/termine/${id}`}
        className="inline-flex items-center text-primary hover:text-primary-dark font-semibold text-sm mt-auto"
      >
        {registrationOpen && spotsAvailable > 0
          ? "Jetzt anmelden"
          : "Details ansehen"}
        <svg
          className="w-4 h-4 ml-1"
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
      </Link>
    </article>
  );
}
