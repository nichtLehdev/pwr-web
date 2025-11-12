import Link from "next/link";
import { getDistrictColor } from "@/lib/districtColors";

interface EventCardProps {
  id: number;
  title: string;
  date: string;
  location: string;
  category: string;
  district: string;
}

export default function EventCard({
  id,
  title,
  date,
  location,
  category,
  district,
}: EventCardProps) {
  const districtColor = getDistrictColor(district);

  return (
    <article
      className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 flex flex-col h-full border-l-4"
      style={{ borderLeftColor: districtColor }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs text-gray-500">{category}</span>
        <span
          className="text-xs font-semibold text-white px-3 py-1 rounded-full"
          style={{ backgroundColor: districtColor }}
        >
          {district}
        </span>
      </div>

      <h3 className="text-xl font-bold text-dark mb-2">{title}</h3>

      <div className="space-y-2 text-sm text-gray-600 mb-4 grow">
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
          {new Date(date).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </div>
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
          {location}
        </div>
      </div>

      <Link
        href={`/termine/${id}`}
        className="inline-flex items-center text-primary hover:text-primary-dark font-semibold text-sm mt-auto"
      >
        Details ansehen
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
