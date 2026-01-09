import { getDistrictColor } from "@/lib/district-color";
import type { JSX } from "react";
import { type RouterOutputs } from "@/trpc/react";
import {
  BookOpenIcon,
  UsersIcon,
  MusicIcon,
  PartyPopperIcon,
  WrenchIcon,
  MedalIcon,
  GlobeIcon,
  ChurchIcon,
  UserIcon,
  MapPinIcon,
  ArrowUpRightIcon,
} from "lucide-react";

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
    COURSE: <BookOpenIcon className={className} />,
    CONCERT: <MusicIcon className={className} />,
    MEETING: <UsersIcon className={className} />,
    WORSHIP: <ChurchIcon className={className} />,
    WORKSHOP: <WrenchIcon className={className} />,
    FESTIVAL: <PartyPopperIcon className={className} />,
    COMPETITION: <MedalIcon className={className} />,
    OTHER: <GlobeIcon className={className} />,
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

  const descriptionText = event.description
    ? event.description.replace(/[<>]/g, "").trim()
    : "";

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl || ""}
            alt={imageAlt}
            crossOrigin="anonymous"
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
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
                <MusicIcon className="h-8 w-8" />
              </div>
              <div className="text-xl font-semibold">
                <div className="text-dark font-bold">{performer}</div>
                {conductor && (
                  <div className="text-dark-light flex items-center gap-2 text-lg">
                    <UserIcon className="h-5 w-5" />
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
                <MapPinIcon className="h-8 w-8" />
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-icon.svg"
                alt="Logo"
                crossOrigin="anonymous"
                loading="eager"
                className="h-full w-full object-contain drop-shadow-lg"
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
            <ArrowUpRightIcon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
