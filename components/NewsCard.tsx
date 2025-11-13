import Link from "next/link";
import Image from "next/image";
import { getDistrictColor } from "@/lib/districtColors";

interface NewsCardProps {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image?: string;
  pinned?: boolean;
  district?: string;
}

export default function NewsCard({
  id,
  title,
  excerpt,
  date,
  category,
  image,
  pinned = false,
  district,
}: NewsCardProps) {
  const districtColor = district ? getDistrictColor(district) : undefined;

  return (
    <Link href={`/aktuelles/${id}`} className="block h-full group">
      <article
        className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full border-l-4 hover:scale-[1.02] cursor-pointer"
        style={{ borderLeftColor: districtColor || "transparent" }}
      >
        {/* Beitragsbild */}
        {image && (
          <div className="relative w-full h-48 bg-gray-200 overflow-hidden">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        <div className="p-6 flex flex-col grow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {pinned && (
                <svg
                  className="w-4 h-4 text-primary"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Angepinnt"
                >
                  <path d="M16 12V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v8l-2 2v2h5v5l1 1 1-1v-5h5v-2l-2-2zm-6 0V4h4v8.13l1.07 1.07.6.6H8.34l.6-.6L10 12.13z" />
                </svg>
              )}
              <span className="text-xs font-semibold text-primary">
                {category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {district && (
                <span
                  className="text-xs font-semibold text-white px-3 py-1 rounded-full"
                  style={{ backgroundColor: districtColor }}
                >
                  {district}
                </span>
              )}
              <time className="text-xs text-gray-500">
                {new Date(date).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </div>
          </div>

          <h3 className="text-xl font-bold text-dark mb-3 group-hover:text-primary transition-colors">
            {title}
          </h3>

          <p className="text-gray-600 mb-4 line-clamp-3 grow">{excerpt}</p>

          <div className="inline-flex items-center text-primary font-semibold text-sm mt-auto">
            Weiterlesen
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
        </div>
      </article>
    </Link>
  );
}
