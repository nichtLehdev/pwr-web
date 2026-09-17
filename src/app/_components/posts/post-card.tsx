import Link from "next/link";
import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { getDistrictColor, getDistrictTextColor } from "@/lib/district-color";
import { extractPlainTextFromMarkdown } from "@/lib/utils";
import { ArrowRightIcon, PinIcon } from "lucide-react";
import { postPath } from "@/lib/slug";

interface PostCardProps {
  id: string;
  /** Absent only for rows created before the slug backfill ran. */
  slug?: string | null;
  title: string;
  excerpt: string;
  date: Date;
  category: string;
  image?: string;
  imagePositionX?: number | null;
  imagePositionY?: number | null;
  pinned?: boolean;
  district?: number;
  content?: string;
}

export default function PostCard({
  id,
  slug,
  title,
  excerpt,
  date,
  category,
  image,
  imagePositionX,
  imagePositionY,
  pinned = false,
  district,
  content,
}: PostCardProps) {
  const districtColor = getDistrictColor(district);

  const displayExcerpt =
    excerpt || (content ? extractPlainTextFromMarkdown(content) : "");

  return (
    <Link href={postPath({ id, slug })} className="group block h-full">
      <article
        className="border-rule dark:border-night-rule dark:bg-night-raised bg-paper flex h-full cursor-pointer flex-col overflow-hidden border border-l-4 transition-transform duration-300 hover:scale-[1.02]"
        style={{ borderLeftColor: districtColor || "transparent" }}
      >
        {/* Beitragsbild */}
        <div className="bg-rule/25 dark:bg-night-raised relative h-48 w-full overflow-hidden">
          <ImageWithFallback
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            style={{
              objectPosition:
                imagePositionX !== null &&
                imagePositionX !== undefined &&
                imagePositionY !== null &&
                imagePositionY !== undefined
                  ? `${imagePositionX}% ${imagePositionY}%`
                  : undefined,
            }}
          />
        </div>

        <div className="flex grow flex-col p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pinned && (
                <PinIcon
                  className="text-primary-ink h-4 w-4"
                  aria-label="Angepinnt"
                />
              )}
              <span className="text-primary-ink text-xs font-semibold">
                {category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {district && (
                <span
                  className="px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: districtColor,
                    color: getDistrictTextColor(district),
                  }}
                >
                  {`Bezirk ${district}`}
                </span>
              )}
              <time className="text-dark dark:text-night-muted text-xs">
                {new Date(date).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </div>
          </div>

          <h3 className="text-ink dark:text-night-text group-hover:text-primary-ink dark:group-hover:text-primary mb-3 line-clamp-2 text-xl font-bold transition-colors">
            {title}
          </h3>

          {displayExcerpt && (
            <p className="text-dark dark:text-night-muted mb-4 line-clamp-3 grow">
              {displayExcerpt}
            </p>
          )}

          <div className="text-primary-ink dark:text-primary mt-auto inline-flex items-center text-sm font-semibold">
            Weiterlesen
            <ArrowRightIcon className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </article>
    </Link>
  );
}
