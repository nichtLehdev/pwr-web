import Link from "next/link";

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
  // Icon SVGs
  const icons = {
    map: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    ),
    education: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
    users: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
    heart: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    ),
    gift: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
      />
    ),
    shield: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    ),
    building: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
    music: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    ),
    document: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
    globe: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  };

  // Bestimme CSS-Farbe basierend auf color prop
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
    <Link href={href} className="block h-full group">
      <article className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col h-full hover:scale-[1.02] cursor-pointer border-t-4 border-transparent hover:border-primary">
        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all group-hover:scale-110 ${getColorClass(
            color
          )}`}
        >
          <svg
            className="w-7 h-7 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {icons[icon]}
          </svg>
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-dark mb-3 group-hover:text-primary transition-colors">
          {title}
        </h3>

        <p className="text-gray-600 mb-4 grow">{description}</p>

        {/* Link */}
        <div className="inline-flex items-center text-primary font-semibold text-sm mt-auto">
          Mehr erfahren
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
