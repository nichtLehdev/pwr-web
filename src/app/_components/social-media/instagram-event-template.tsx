import Image from "next/image";
import { getDistrictColor } from "@/lib/district-color";
import type { JSX } from "react";
import { type RouterOutputs } from "@/trpc/react";

type InstagramEventTemplateProps = {
  event: RouterOutputs["events"]["getEventsByMonth"][0];
  imagePosition?: { x: number; y: number };
};

const categoryLabels: Record<string, string> = {
  COURSE: "Lehrgang",
  CONCERT: "Konzert",
  MEETING: "Treffen",
  WORSHIP: "Gottesdienst",
  WORKSHOP: "Workshop",
  FESTIVAL: "Festival",
  COMPETITION: "Wettbewerb",
  OTHER: "Sonstiges",
};

const CategoryIcon = ({
  category,
  className = "h-8 w-8",
}: {
  category: string;
  className?: string;
}) => {
  const icons: Record<string, JSX.Element> = {
    COURSE: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
    CONCERT: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    ),
    MEETING: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
    WORSHIP: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
    WORKSHOP: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
      </svg>
    ),
    FESTIVAL: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
    COMPETITION: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
      </svg>
    ),
    OTHER: (
      <svg className={className} fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return icons[category] || icons.OTHER;
};

export default function InstagramEventTemplate({
  event,
  imagePosition = { x: 50, y: 50 },
}: InstagramEventTemplateProps) {
  const imageUrl =
    event.coverImage?.url ||
    event.ensemble?.image?.url ||
    event.auswahlChor?.image?.url ||
    null;

  const imageAlt =
    event.coverImage?.alt ||
    event.ensemble?.image?.alt ||
    event.auswahlChor?.image?.alt ||
    event.title;

  const categoryLabel = categoryLabels[event.category] || event.category;
  const districtColor = event.bezirk
    ? getDistrictColor(event.bezirk.number)
    : "#faa619";

  const eventDay = new Date(event.eventDate).getDate();
  const eventMonth = new Date(event.eventDate).toLocaleDateString("de-DE", {
    month: "long",
  });
  const eventYear = new Date(event.eventDate).getFullYear();
  const eventTime = new Date(event.eventDate).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const eventWeekday = new Date(event.eventDate).toLocaleDateString("de-DE", {
    weekday: "long",
  });

  // Extract description text without HTML
  const descriptionText = event.description
    ? event.description.replace(/<[^>]*>/g, "").trim()
    : "";

  // Determine who is performing
  const performer =
    event.ensemble?.name ||
    event.auswahlChor?.name ||
    event.performingEnsembleName ||
    null;

  const conductor =
    event.ensemble?.conductor?.displayName ||
    event.auswahlChor?.conductor?.displayName ||
    event.leitung ||
    null;

  return (
    <div
      className="relative flex h-[1080px] w-[1080px] flex-col overflow-hidden bg-white"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Image Section - larger and more prominent */}
      {imageUrl && imageAlt ? (
        <div className="relative h-[540px] w-full">
          <Image
            src={imageUrl || ""}
            alt={imageAlt}
            fill
            className="object-cover"
            style={{
              objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
            }}
          />
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

          {/* Category badge on image */}
          <div className="absolute top-8 left-8">
            <div
              className="flex items-center gap-3 rounded-full px-6 py-3 text-2xl font-bold text-white shadow-xl backdrop-blur-md"
              style={{ backgroundColor: `${districtColor}dd` }}
            >
              <CategoryIcon category={event.category} className="h-10 w-10" />
              {categoryLabel}
            </div>
          </div>

          {/* Date badge on image */}
          <div className="absolute bottom-8 left-8">
            <div className="flex items-center gap-4 rounded-2xl bg-white/95 p-5 shadow-xl backdrop-blur-sm">
              <div
                className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-lg"
                style={{ backgroundColor: districtColor }}
              >
                <div className="text-4xl font-black">{eventDay}</div>
                <div className="text-sm font-bold uppercase">
                  {eventMonth.slice(0, 3)}
                </div>
              </div>
              <div className="text-dark">
                <div className="text-xl font-bold capitalize">
                  {eventWeekday}
                </div>
                <div className="text-lg">
                  {eventMonth} {eventYear}
                </div>
                {eventTime !== "00:00" && (
                  <div className="text-lg font-semibold">{eventTime} Uhr</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Decorative background when no image - fixed gradient
        <div
          className="relative h-[540px] w-full overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${districtColor} 0%, ${districtColor}ee 100%)`,
          }}
        >
          {/* Decorative elements */}
          <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute bottom-20 -left-20 h-60 w-60 rounded-full bg-white/5" />
          <div className="absolute top-40 right-40 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute top-60 left-60 h-24 w-24 rounded-full bg-white/10" />

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-12 text-white">
            {/* Category badge */}
            <div className="mb-8 flex items-center gap-3 rounded-full bg-white/20 px-8 py-4 text-3xl font-bold backdrop-blur-md">
              <CategoryIcon category={event.category} className="h-12 w-12" />
              {categoryLabel}
            </div>

            {/* Date badge */}
            <div className="text-dark flex items-center gap-6 rounded-3xl bg-white/20 p-6 backdrop-blur-md">
              <div className="flex h-32 w-32 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/30 shadow-2xl backdrop-blur-sm">
                <div className="text-5xl font-black">{eventDay}</div>
                <div className="text-lg font-bold uppercase">
                  {eventMonth.slice(0, 3)}
                </div>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold capitalize">
                  {eventWeekday}
                </div>
                <div className="text-xl">
                  {eventMonth} {eventYear}
                </div>
                {eventTime !== "00:00" && (
                  <div className="text-2xl font-bold">{eventTime} Uhr</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="flex flex-1 flex-col justify-between bg-white px-10 py-8">
        <div className="space-y-4">
          {/* Title - much larger */}
          <h1 className="text-dark text-5xl leading-tight font-black">
            {event.title}
          </h1>

          {/* Motto */}
          {event.motto && (
            <p className="text-3xl font-bold italic opacity-80">
              &quot;{event.motto}&quot;
            </p>
          )}

          {/* Performer Info */}
          {performer && (
            <div className="flex items-start gap-4 rounded-2xl bg-linear-to-r from-gray-50 to-white p-5 shadow-sm">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: districtColor }}
              >
                <svg
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
              <div className="text-xl font-semibold">
                <div className="text-dark font-bold">{performer}</div>
                {conductor && (
                  <div className="text-dark-light flex items-center gap-2 text-lg">
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                    Leitung: {conductor}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-4 rounded-2xl bg-linear-to-r from-gray-50 to-white p-5 shadow-sm">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: districtColor }}
              >
                <svg
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-xl font-semibold">
                {event.location.name && (
                  <div className="text-dark font-bold">
                    {event.location.name}
                  </div>
                )}
                {event.location.street && (
                  <div className="text-dark-light">{event.location.street}</div>
                )}
                {(event.location.zipCode || event.location.city) && (
                  <div className="text-dark font-bold">
                    {event.location.zipCode} {event.location.city}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description Preview */}
          {descriptionText && (
            <div className="rounded-2xl bg-linear-to-r from-gray-50 to-white p-5 shadow-sm">
              <p className="text-dark-light line-clamp-3 text-lg leading-relaxed">
                {descriptionText.substring(0, 180)}
                {descriptionText.length > 180 && "..."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="mt-6 flex items-center justify-between rounded-2xl px-6 py-5 text-white"
          style={{ backgroundColor: districtColor }}
        >
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <Image
                src="/images/logo-icon.svg"
                alt="Logo"
                fill
                className="object-contain drop-shadow-lg"
              />
            </div>
            <div>
              <div className="text-xl font-bold">Posaunenwerk Rheinland</div>
              {event.bezirk && (
                <div className="text-lg font-bold">
                  Bezirk {event.bezirk.number} • {event.bezirk.shortName}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <div className="text-lg font-semibold">Mehr Infos:</div>
              <div className="text-xl font-bold">posaunenwerk-rheinland.de</div>
            </div>
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
