import Link from "next/link";
import {
  Map,
  GraduationCap,
  Users,
  Heart,
  Gift,
  Shield,
  Building,
  Music,
  FileText,
  Globe,
  ChevronRight,
} from "lucide-react";

interface ParticipationCardProps {
  title: string;
  description: string;
  icon:
    | "map"
    | "education"
    | "users"
    | "heart"
    | "gift"
    | "shield"
    | "building"
    | "music"
    | "document"
    | "globe";
  href?: string;
  color?: string;
  comingSoon?: boolean;
}

export default function ParticipationCard({
  title,
  description,
  icon,
  href,
  color = "primary",
  comingSoon = false,
}: ParticipationCardProps) {
  const icons = {
    map: <Map className="h-7 w-7" />,
    education: <GraduationCap className="h-7 w-7" />,
    users: <Users className="h-7 w-7" />,
    heart: <Heart className="h-7 w-7" />,
    gift: <Gift className="h-7 w-7" />,
    shield: <Shield className="h-7 w-7" />,
    building: <Building className="h-7 w-7" />,
    music: <Music className="h-7 w-7" />,
    document: <FileText className="h-7 w-7" />,
    globe: <Globe className="h-7 w-7" />,
  };

  const getColorClass = (colorName: string) => {
    const colorMap: { [key: string]: string } = {
      primary: "bg-primary hover:bg-primary-dark",
      "primary-dark": "bg-primary-dark hover:bg-primary",
      foerderverein: "bg-foerderverein hover:bg-foerderverein-dark",
      "district-1": "bg-district-1 hover:opacity-90",
      "district-2": "bg-district-2 hover:opacity-90",
      "district-3": "bg-district-3 hover:opacity-90",
      "district-4": "bg-district-4 hover:opacity-90",
      "district-5": "bg-district-5 hover:opacity-90",
      "district-6": "bg-district-6 hover:opacity-90",
      "district-7": "bg-district-7 hover:opacity-90",
      "district-8": "bg-district-8 hover:opacity-90",
      "district-9": "bg-district-9 hover:opacity-90",
      "district-10": "bg-district-10 hover:opacity-90",
      "district-11": "bg-district-11 hover:opacity-90",
      "district-12": "bg-district-12 hover:opacity-90",
      "district-13": "bg-district-13 hover:opacity-90",
    };
    return colorMap[colorName] || colorMap.primary;
  };

  const card = (
    <article
      className={`dark:bg-dark-surface dark:shadow-dark-border flex h-full flex-col rounded-lg border-t-4 border-transparent bg-white p-6 shadow-md transition-all duration-300 ${
        comingSoon
          ? "cursor-default opacity-90"
          : "hover:border-primary group cursor-pointer hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-2xl"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white transition-all ${
            comingSoon ? "opacity-80" : "group-hover:scale-110"
          } ${getColorClass(color)}`}
        >
          {icons[icon]}
        </div>
        {comingSoon ? (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold tracking-wide text-gray-600 uppercase dark:bg-gray-800 dark:text-gray-300">
            Demnächst
          </span>
        ) : null}
      </div>

      {/* Content */}
      <h3
        className={`text-dark dark:text-dark-text mb-3 line-clamp-2 text-xl font-bold transition-colors ${
          comingSoon ? "" : "group-hover:text-primary"
        }`}
      >
        {title}
      </h3>

      <p className="mb-4 grow text-gray-600 dark:text-gray-400">
        {description}
      </p>

      {/* Link */}
      <div
        className={`mt-auto inline-flex items-center text-sm font-semibold ${
          comingSoon ? "text-gray-500 dark:text-gray-400" : "text-primary"
        }`}
      >
        {comingSoon ? "Bald verfügbar" : "Mehr erfahren"}
        {!comingSoon ? (
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        ) : null}
      </div>
    </article>
  );

  if (comingSoon || !href) {
    return <div className="h-full">{card}</div>;
  }

  return (
    <Link href={href} className="group block h-full">
      {card}
    </Link>
  );
}
