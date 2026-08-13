import Link from "next/link";
import { X, Users, Clock, MapPin, ChevronRight } from "lucide-react";
import { coursePath, eventPath } from "@/lib/slug";

interface CompactEventCardProps {
  id: string;
  slug?: string | null;
  title: string;
  date: Date;
  endDate?: Date;
  location: string;
  category: string;
  type: "event" | "course";
  openToParticipants?: boolean;
  cancelled?: boolean;
}

export default function CompactEventCard({
  id,
  slug,
  title,
  date,
  endDate,
  location,
  category,
  type,
  openToParticipants,
  cancelled,
}: CompactEventCardProps) {
  const dateObj = new Date(date);
  const time = dateObj.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = dateObj.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });

  const isMultiDay =
    endDate && new Date(endDate).toDateString() !== dateObj.toDateString();
  const endDateObj = endDate ? new Date(endDate) : null;
  const endDateStr = endDateObj?.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });

  return (
    <Link
      href={
        type === "course" ? coursePath({ id, slug }) : eventPath({ id, slug })
      }
      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
        cancelled
          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : "hover:border-primary dark:border-dark-border dark:bg-dark-surface dark:hover:shadow-dark-border border-gray-200 bg-white hover:shadow-md"
      }`}
    >
      {/* Date Badge */}
      <div
        className={`shrink-0 ${
          isMultiDay ? "min-w-20" : "w-12"
        } flex h-12 rounded-lg ${
          cancelled
            ? "bg-red-100 dark:bg-red-900/30"
            : "dark:bg-dark-background-secondary bg-gray-100"
        } ${isMultiDay ? "flex-row" : "flex-col"} items-center justify-center gap-1 px-2`}
      >
        {isMultiDay ? (
          <>
            <div className="flex flex-col items-center">
              <span className="text-xs leading-tight font-semibold text-gray-600 uppercase dark:text-gray-400">
                {dateStr.split(" ")[1]}
              </span>
              <span className="text-dark dark:text-dark-text text-base leading-tight font-bold">
                {(dateStr.split(" ")[0] ?? "").replace(".", "")}
              </span>
            </div>
            <span className="text-sm text-gray-400 dark:text-gray-500">→</span>
            <div className="flex flex-col items-center">
              <span className="text-[10px] leading-tight font-semibold text-gray-500 uppercase dark:text-gray-400">
                {endDateStr?.split(" ")[1]}
              </span>
              <span className="text-sm leading-tight font-bold text-gray-600 dark:text-gray-300">
                {(endDateStr?.split(" ")[0] ?? "").replace(".", "")}
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="text-xs font-semibold text-gray-600 uppercase dark:text-gray-400">
              {dateStr.split(" ")[1]}
            </span>
            <span className="text-dark dark:text-dark-text text-lg font-bold">
              {(dateStr.split(" ")[0] ?? "").replace(".", "")}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-start gap-2">
          {cancelled && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              <X className="h-3 w-3" />
              Abgesagt
            </span>
          )}
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
              type === "course"
                ? "bg-primary/10 text-primary"
                : "bg-dark/10 dark:bg-dark-text/10 text-dark dark:text-dark-text"
            }`}
          >
            {category}
          </span>
          {openToParticipants && (
            <span className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-600 dark:bg-green-900/20 dark:text-green-400">
              <Users className="h-2.5 w-2.5" />
              Mitspielen
            </span>
          )}
        </div>
        <h3
          className={`mb-1 line-clamp-2 text-sm font-bold ${
            cancelled
              ? "text-gray-500 line-through dark:text-gray-400"
              : "text-dark dark:text-dark-text"
          }`}
        >
          {title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {location}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" />
    </Link>
  );
}
