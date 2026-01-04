import Link from "next/link";
import Image from "next/image";
import { getDistrictColor } from "@/lib/district-color";
import { ArrowRightIcon, PinIcon } from "lucide-react";

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
                <PinIcon
                  className="text-primary h-4 w-4"
                  aria-label="Angepinnt"
                />
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

          <h3 className="text-dark dark:text-dark-text group-hover:text-primary mb-3 line-clamp-2 text-xl font-bold transition-colors">
            {title}
          </h3>

          <p className="mb-4 line-clamp-3 grow text-gray-600 dark:text-gray-400">
            {excerpt}
          </p>

          <div className="text-primary mt-auto inline-flex items-center text-sm font-semibold">
            Weiterlesen
            <ArrowRightIcon className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </article>
    </Link>
  );
}
