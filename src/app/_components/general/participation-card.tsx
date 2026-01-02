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
  href: string;
  color?: string;
}

export default function ParticipationCard({
  title,
  description,
  icon,
  href,
  color = "primary",
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

  return (
    <Link href={href} className="group block h-full">
      <article className="hover:border-primary dark:bg-dark-surface dark:shadow-dark-border flex h-full cursor-pointer flex-col rounded-lg border-t-4 border-transparent bg-white p-6 shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-2xl">
        {/* Icon */}
        <div
          className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full text-white transition-all group-hover:scale-110 ${getColorClass(
            color,
          )}`}
        >
          {icons[icon]}
        </div>

        {/* Content */}
        <h3 className="text-dark dark:text-dark-text group-hover:text-primary mb-3 line-clamp-2 text-xl font-bold transition-colors">
          {title}
        </h3>

        <p className="mb-4 grow text-gray-600 dark:text-gray-400">
          {description}
        </p>

        {/* Link */}
        <div className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
          Mehr erfahren
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </article>
    </Link>
  );
}
