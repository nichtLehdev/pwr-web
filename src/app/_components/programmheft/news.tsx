import Image from "next/image";
import Link from "next/link";
import { Pin } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { extractPlainTextFromMarkdown } from "@/lib/utils";
import { postPath } from "@/lib/slug";
import { BezirkLabel } from "./bezirk-label";

export type NewsPost = RouterOutputs["posts"]["getAll"]["posts"][number];

const DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/**
 * Beiträge ohne (oder mit kaputtem) Titelbild zeigen das Logo auf der
 * dunklen Bildfläche — so bleiben die Spalten gleich hoch aufgebaut.
 */
function LogoFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center px-10">
      <Image
        src="/images/logo-horizontal-dark.svg"
        alt=""
        width={200}
        height={56}
        className="h-auto w-3/5 max-w-[16rem]"
        unoptimized
      />
    </div>
  );
}

/**
 * Meldung: Bildfeld 3:2, Titel, Meta-Zeile, Auszug. Der Titel-Link ist über
 * die ganze Spalte gestreckt; der Rahmen dafür kommt von `.stretch-item`.
 */
export function NewsColumn({
  post,
  titleAs: Title = "h3",
}: {
  post: NewsPost;
  titleAs?: "h2" | "h3";
}) {
  const date = new Date(post.publishedAt ?? post.createdAt);
  const excerpt =
    post.excerpt ||
    (post.content ? extractPlainTextFromMarkdown(post.content) : "");
  const position =
    post.coverImagePositionX != null && post.coverImagePositionY != null
      ? `${post.coverImagePositionX}% ${post.coverImagePositionY}%`
      : undefined;

  return (
    <article className="group flex h-full flex-col">
      {/* `shrink-0`: Ohne das staucht die Flex-Spalte das Bildfeld, sobald
          Titel oder Auszug länger werden — dann stehen die Überschriften der
          Spalten nicht mehr auf einer Linie. */}
      <div className="bg-ink dark:bg-night-raised relative mb-5 aspect-[3/2] shrink-0 overflow-hidden">
        <ImageWithFallback
          src={post.coverImage?.url}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, 100vw"
          className="object-cover"
          style={{ objectPosition: position }}
          fallback={<LogoFallback />}
        />
      </div>

      <Title className="condensed text-ink dark:text-night-text text-[1.75rem] leading-[1.05] font-bold text-balance">
        <Link
          href={postPath(post)}
          className="decoration-primary underline-offset-[5px] group-hover:underline group-hover:decoration-[3px] after:absolute after:inset-0 after:content-['']"
        >
          {post.title}
        </Link>
      </Title>

      <p className="semi-condensed text-dark dark:text-night-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
        <time dateTime={date.toISOString()}>{DATE.format(date)}</time>
        <span>{post.category}</span>
        <BezirkLabel bezirk={post.bezirk} variant="short" />
        {post.pinned ? (
          <span className="inline-flex items-center gap-1">
            <Pin className="h-4 w-4" aria-hidden />
            Angepinnt
          </span>
        ) : null}
      </p>

      {excerpt ? (
        <p className="text-dark dark:text-night-muted mt-3 line-clamp-4 max-w-[60ch] text-base leading-relaxed">
          {excerpt}
        </p>
      ) : null}
    </article>
  );
}

const COLUMN =
  "border-rule dark:border-night-rule border-b py-8 lg:border-b-0 lg:px-5 lg:py-10";

/** Beiträge als Druckspalten, ab 64rem mit 1px-Haarlinien getrennt. */
export function NewsColumns({
  posts,
  isLoading = false,
  emptyText = "Aktuell keine News verfügbar.",
}: {
  posts: NewsPost[];
  isLoading?: boolean;
  emptyText?: string;
}) {
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Neuigkeiten werden geladen"
        className="grid lg:-mx-5 lg:grid-cols-3"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${COLUMN} flex flex-col gap-3 ${
              i > 0 ? "lg:border-l" : ""
            }`}
          >
            <span className="bg-rule dark:bg-night-rule aspect-[3/2] w-full" />
            <span className="bg-rule dark:bg-night-rule h-6 w-4/5" />
            <span className="bg-rule dark:bg-night-rule h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return <p className="text-dark dark:text-night-muted py-8">{emptyText}</p>;
  }

  return (
    // Jede Spalte bekommt denselben Innenabstand auf beiden Seiten, das Raster
    // wird um die Hälfte des Zwischenraums nach außen gezogen. Zwei Gründe:
    // Hingen die Abstände am laufenden Index, wären die mittleren Spalten
    // schmaler, ihre Bildfelder niedriger und die Überschriften stünden nicht
    // mehr auf einer Linie. Und läge der Abstand nur links, säße die
    // Haarlinie bündig an der vorigen Spalte statt zwischen beiden — gemessen
    // 0px zur linken und 41px zur rechten Spalte.
    <ul className="grid lg:-mx-5 lg:grid-cols-3">
      {posts.map((post, i) => (
        <li
          key={post.id}
          className={`stretch-item relative ${COLUMN} ${
            i % 3 !== 0 ? "lg:border-l" : ""
          }`}
        >
          <NewsColumn post={post} />
        </li>
      ))}
    </ul>
  );
}
