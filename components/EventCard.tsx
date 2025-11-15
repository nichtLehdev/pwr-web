import Link from "next/link";
import { getDistrictColor } from "@/lib/districtColors";

interface EventCardProps {
  id: number;
  title: string;
  date: string;
  location: string;
  category: string;
  district: string;
  openToParticipants?: boolean;
}

export default function EventCard({
  id,
  title,
  date,
  location,
  category,
  district,
  openToParticipants,
}: EventCardProps) {
  const districtColor = getDistrictColor(district);

  return (
    <Link href={`/termine/event/${id}`} className="block h-full group">
      <article
        className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 p-6 flex flex-col h-full border-l-4 hover:scale-[1.02] cursor-pointer"
        style={{ borderLeftColor: districtColor }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">{category}</span>
            {openToParticipants && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border-2 border-green-300 px-2 py-1 rounded-full">
                <svg
                  className="w-3 h-3"
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
            className="text-xs font-semibold text-white px-3 py-1 rounded-full shrink-0"
            style={{ backgroundColor: districtColor }}
          >
            {district}
          </span>
        </div>

        <h3 className="text-xl font-bold text-dark mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

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

        <div className="inline-flex items-center text-primary font-semibold text-sm mt-auto">
          Details ansehen
          <svg
            className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
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
