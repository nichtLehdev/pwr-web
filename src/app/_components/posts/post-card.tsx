import Link from "next/link";
import Image from "next/image";
import { getDistrictColor } from "@/lib/district-color";

interface PostCardProps {
  id: string;
  title: string;
  excerpt: string;
  date: Date;
  category: string;
  image?: string;
  pinned?: boolean;
  district?: number;
}

export default function PostCard({
  id,
  title,
  excerpt,
  date,
  category,
  image,
  pinned = false,
  district,
}: PostCardProps) {
  const districtColor = getDistrictColor(district);

  return (
    <Link href={`/aktuelles/${id}`} className="group block h-full">
      <article
        className="dark:bg-dark-surface dark:shadow-dark-border flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border-l-4 bg-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
        style={{ borderLeftColor: districtColor || "transparent" }}
      >
        {/* Beitragsbild */}
        {image && (
          <div className="relative h-48 w-full overflow-hidden bg-gray-200">
            <Image
              src={image}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        <div className="flex grow flex-col p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pinned && (
                <svg
                  className="text-primary h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-label="Angepinnt"
                >
                  <path d="M16 12V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v8l-2 2v2h5v5l1 1 1-1v-5h5v-2l-2-2zm-6 0V4h4v8.13l1.07 1.07.6.6H8.34l.6-.6L10 12.13z" />
                </svg>
              )}
              <span className="text-primary text-xs font-semibold">
                {category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {district && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: districtColor }}
                >
                  {`Bezirk ${district}`}
                </span>
              )}
              <time className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(date).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </div>
          </div>

          <h3 className="text-dark dark:text-dark-text group-hover:text-primary mb-3 text-xl font-bold transition-colors">
            {title}
          </h3>

          <p className="mb-4 line-clamp-3 grow text-gray-600 dark:text-gray-400">
            {excerpt}
          </p>

          <div className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
            Weiterlesen
            <svg
              className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
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
