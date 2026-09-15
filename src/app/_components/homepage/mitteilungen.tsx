import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Pin } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { getDistrictColor } from "@/lib/district-color";
import { extractPlainTextFromMarkdown } from "@/lib/utils";
import { postPath } from "@/lib/slug";

type PostItem = RouterOutputs["posts"]["getAll"]["posts"][number];

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

function Meldung({ post }: { post: PostItem }) {
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
      <div className="bg-ink dark:bg-night-raised relative mb-5 aspect-[3/2] overflow-hidden">
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

      <h3 className="condensed text-ink dark:text-night-text text-[1.75rem] leading-[1.05] font-bold text-balance">
        <Link
          href={postPath(post)}
          className="decoration-primary underline-offset-[5px] group-hover:underline group-hover:decoration-[3px] after:absolute after:inset-0 after:content-['']"
        >
          {post.title}
        </Link>
      </h3>

      <p className="semi-condensed text-dark dark:text-night-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
        <time dateTime={date.toISOString()}>{DATE.format(date)}</time>
        <span>{post.category}</span>
        {post.bezirk ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0"
              style={{ backgroundColor: getDistrictColor(post.bezirk.number) }}
            />
            Bezirk {post.bezirk.number}
          </span>
        ) : null}
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

interface MitteilungenProps {
  posts: PostItem[];
  isLoading: boolean;
}

/** „Aktuelles“ als Druckspalten mit Haarlinien statt als Karten. */
export default function Mitteilungen({ posts, isLoading }: MitteilungenProps) {
  return (
    <section
      aria-labelledby="aktuelles-heading"
      className="bg-paper dark:bg-night border-ink dark:border-night-rule border-t-2 py-16 md:py-24"
    >
      <div className="sheet">
        <div className="border-ink dark:border-night-text flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b-2 pb-4">
          <h2
            id="aktuelles-heading"
            className="condensed text-ink dark:text-night-text text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95] font-extrabold"
          >
            Aktuelles
          </h2>
          <Link
            href="/aktuelles"
            className="semi-condensed text-primary-ink dark:text-primary inline-flex min-h-11 items-center gap-2 text-lg font-semibold underline-offset-4 hover:underline"
          >
            Alle News
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>

        {isLoading ? (
          <div
            aria-busy="true"
            aria-label="Neuigkeiten werden geladen"
            className="grid lg:grid-cols-3"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`border-rule dark:border-night-rule flex flex-col gap-3 border-b py-8 lg:border-b-0 lg:py-10 ${
                  i > 0 ? "lg:border-l lg:pl-10" : ""
                } ${i < 2 ? "lg:pr-10" : ""}`}
              >
                <span className="bg-rule dark:bg-night-rule aspect-[3/2] w-full" />
                <span className="bg-rule dark:bg-night-rule h-6 w-4/5" />
                <span className="bg-rule dark:bg-night-rule h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <ul className="grid lg:grid-cols-3">
            {posts.map((post, i) => (
              <li
                key={post.id}
                className={`stretch-item border-rule dark:border-night-rule relative border-b py-8 lg:border-b-0 lg:py-10 ${
                  i > 0 ? "lg:border-l lg:pl-10" : ""
                } ${i < posts.length - 1 ? "lg:pr-10" : ""}`}
              >
                <Meldung post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-dark dark:text-night-muted py-8">
            Aktuell keine News verfügbar.
          </p>
        )}
      </div>
    </section>
  );
}
