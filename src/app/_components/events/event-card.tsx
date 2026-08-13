import Link from "next/link";
import { getDistrictColor } from "@/lib/district-color";
import { capitalizeFirstLetter } from "@/lib/utils";
import {
  AlertTriangle,
  Users,
  Calendar,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { eventPath } from "@/lib/slug";

interface EventCardProps {
  id: string;
  slug?: string | null;
  title: string;
  date: Date;
  duration?: number | null;
  location: string;
  category: string;
  district?: number;
  openToParticipants?: boolean;
  cancelled?: boolean;
}

export default function EventCard({
  id,
  slug,
  title,
  date,
  duration,
  location,
  category,
  district,
  openToParticipants,
  cancelled,
}: EventCardProps) {
  const districtColor = getDistrictColor(district);

  return (
    <Link href={eventPath({ id, slug })} className="group block h-full">
      <article
        className={`dark:shadow-dark-border bg-background-secondary dark:bg-dark-surface relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border-l-4 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
          cancelled ? "opacity-75" : ""
        }`}
        style={{
          borderLeftColor: districtColor,
        }}
      >
        <div className="p-6">
          {/* Cancelled Banner */}
          {cancelled && (
            <div className="mb-4 flex items-center justify-center rounded-lg bg-red-600 py-2">
              <AlertTriangle className="mr-2 h-5 w-5 text-white" />
              <span className="text-sm font-bold tracking-wider text-white uppercase">
                Abgesagt
              </span>
            </div>
          )}

          <div
            className={`mb-4 flex items-start justify-between ${cancelled ? "" : ""}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {capitalizeFirstLetter(category)}
              </span>
              {openToParticipants && (
                <span className="inline-flex items-center gap-1 rounded-full border-2 border-green-300 bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                  <Users className="h-3 w-3" />
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
            className={`group-hover:text-primary dark:group-hover:text-primary mb-2 line-clamp-2 text-xl font-bold transition-colors dark:text-white ${
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
              <Calendar className="h-4 w-4" />
              <span>
                {`${date.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}, ${date.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
                {duration && duration > 0 && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    ({Math.floor(duration / 60)}h{" "}
                    {duration % 60 > 0 ? `${duration % 60}min` : ""})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {location}
            </div>
          </div>

          <div className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
            Details ansehen
            <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </article>
    </Link>
  );
}
