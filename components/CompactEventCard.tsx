import Link from "next/link";

interface CompactEventCardProps {
  id: number;
  title: string;
  date: string;
  endDate?: string;
  location: string;
  category: string;
  type: "event" | "course";
  districtName: string;
}

export default function CompactEventCard({
  id,
  title,
  date,
  endDate,
  location,
  category,
  type,
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

  // Prüfe ob mehrtägig
  const isMultiDay =
    endDate && new Date(endDate).toDateString() !== dateObj.toDateString();
  const endDateObj = endDate ? new Date(endDate) : null;
  const endDateStr = endDateObj?.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });

  return (
    <Link
      href={`/termine/${id}`}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all"
    >
      {/* Date Badge */}
      <div
        className={`shrink-0 ${
          isMultiDay ? "min-w-20" : "w-12"
        } h-12 bg-gray-100 rounded-lg flex ${
          isMultiDay ? "flex-row" : "flex-col"
        } items-center justify-center gap-1 px-2`}
      >
        {isMultiDay ? (
          <>
            <div className="flex flex-col items-center">
              <span className="text-xs font-semibold text-gray-600 uppercase leading-tight">
                {dateStr.split(" ")[1]}
              </span>
              <span className="text-base font-bold text-dark leading-tight">
                {dateStr.split(" ")[0].replace(".", "")}
              </span>
            </div>
            <span className="text-gray-400 text-sm">→</span>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold text-gray-500 uppercase leading-tight">
                {endDateStr?.split(" ")[1]}
              </span>
              <span className="text-sm font-bold text-gray-600 leading-tight">
                {endDateStr?.split(" ")[0].replace(".", "")}
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="text-xs font-semibold text-gray-600 uppercase">
              {dateStr.split(" ")[1]}
            </span>
            <span className="text-lg font-bold text-dark">
              {dateStr.split(" ")[0].replace(".", "")}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
              type === "course"
                ? "bg-primary/10 text-primary"
                : "bg-dark/10 text-dark"
            }`}
          >
            {category}
          </span>
        </div>
        <h3 className="text-sm font-bold text-dark line-clamp-2 mb-1">
          {title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {time}
          </span>
          <span className="flex items-center gap-1">
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            {location}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <svg
        className="w-5 h-5 text-gray-400 shrink-0"
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
  );
}
