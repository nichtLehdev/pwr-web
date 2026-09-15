"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";
import ImageWithFallback from "@/app/_components/ui/image-with-fallback";

type CarouselItem = RouterOutputs["homepage"]["getCarouselItems"][number];

const SLIDE_MS = 7000;

interface TitelblattProps {
  items: CarouselItem[];
  isLoading: boolean;
  defaultTitle: string;
  defaultSubtitle: string;
}

/**
 * Titelblatt der Startseite: orange Druckfläche mit Leitsatz und der
 * Bildstrecke aus dem Dashboard-Karussell.
 *
 * Auf dem Handy löst sich der Block in zwei Rasterzellen auf (`contents`):
 * Titel oben, dann „Kommende Termine“ (order-2), dann das Foto — so stehen
 * offene Anmeldungen direkt unter dem Titel statt hinter dem Bild.
 *
 * Die Bildstrecke wechselt nur, solange niemand hinsieht oder hineinklickt,
 * lässt sich anhalten und bleibt bei `prefers-reduced-motion` ganz stehen
 * (WCAG 2.2.2).
 */
export default function Titelblatt({
  items,
  isLoading,
  defaultTitle,
  defaultSubtitle,
}: TitelblattProps) {
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const count = items.length;
  const autoplay = count > 1 && !hovering && !userPaused && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(
      () => setIndex((current) => (current + 1) % count),
      SLIDE_MS,
    );
    return () => clearInterval(id);
  }, [autoplay, count]);

  const current = items[index] ?? items[0];
  const title = current?.title || defaultTitle;
  const subtitle = current?.subtitle || defaultSubtitle;
  const credit = current
    ? [current.media.copyright, current.media.creator]
        .filter(Boolean)
        .join(" · ")
    : "";

  const show = (next: number) => setIndex((next + count) % count);

  // Das Foto ist angeschnitten wie auf einem Titelblatt: es läuft bis an die
  // Kanten der orangen Fläche; Bildnachweis und Steuerung stehen darüber.
  const photoCell =
    "bg-primary order-3 pt-3 lg:order-none lg:flex lg:flex-1 lg:flex-col lg:bg-transparent lg:pt-0";

  return (
    <section
      className="on-orange text-ink lg:bg-primary contents lg:col-span-7 lg:flex lg:flex-col"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
    >
      <div className="bg-primary order-1 px-5 pt-10 pb-8 sm:px-10 lg:order-none lg:bg-transparent lg:px-14 lg:pt-10 lg:pb-8">
        <h1 className="condensed text-[clamp(2.75rem,6vw,5.75rem)] leading-[0.9] font-extrabold tracking-[-0.01em] text-balance">
          {title}
        </h1>
        <span aria-hidden className="bg-ink mt-5 block h-1.5 w-24" />
        <p className="semi-condensed mt-5 max-w-[26ch] text-[clamp(1.25rem,2.1vw,1.875rem)] leading-snug font-medium text-balance">
          {subtitle}
        </p>
        <Link
          href="/mitmachen"
          className="semi-condensed bg-ink text-paper hover:bg-paper hover:text-ink mt-8 inline-flex h-12 items-center gap-3 px-6 text-lg font-semibold transition-colors"
        >
          Jetzt mitmachen
          <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      {isLoading ? (
        <div className={photoCell}>
          <div
            aria-hidden
            className="bg-ink/10 aspect-[4/3] lg:aspect-auto lg:min-h-[18rem] lg:flex-1"
          />
        </div>
      ) : count > 0 ? (
        <div className={photoCell}>
          <figure className="flex flex-col lg:flex-1">
            <div className="bg-ink relative aspect-[4/3] w-full overflow-hidden lg:aspect-auto lg:min-h-[18rem] lg:flex-1">
              {items.map((item, i) => (
                <div
                  key={item.id}
                  aria-hidden={i !== index}
                  className={`titelblatt-photo absolute inset-0 ${
                    i === index ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <ImageWithFallback
                    src={item.media.url}
                    alt={item.media.alt || item.media.name}
                    fill
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    className="object-cover"
                    style={
                      item.media.focalPointX != null &&
                      item.media.focalPointY != null
                        ? {
                            objectPosition: `${item.media.focalPointX}% ${item.media.focalPointY}%`,
                          }
                        : undefined
                    }
                    priority={i === 0}
                    // Folgebilder sofort laden: lazy starten sie hinter
                    // opacity-0 nicht zuverlässig, und der Wechsel zeigte
                    // dann eine schwarze Fläche. Es sind höchstens fünf.
                    loading={i === 0 ? undefined : "eager"}
                  />
                </div>
              ))}
            </div>

            <figcaption className="order-first flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 pb-1 text-sm sm:px-10 lg:px-14">
              <span className="inline-flex items-center gap-1.5 font-medium">
                {credit ? (
                  <>
                    <Camera className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="sr-only">Bildnachweis: </span>
                    {credit}
                  </>
                ) : null}
              </span>

              {count > 1 && (
                <div
                  role="group"
                  aria-label="Bildstrecke"
                  className="-mr-3 flex items-center"
                >
                  <button
                    type="button"
                    onClick={() => show(index - 1)}
                    className="hover:bg-ink hover:text-paper inline-flex h-11 w-11 items-center justify-center transition-colors"
                    aria-label="Vorheriges Bild"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>
                  <span className="semi-condensed min-w-[3.75rem] text-center text-base font-semibold tabular-nums">
                    {index + 1} / {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => show(index + 1)}
                    className="hover:bg-ink hover:text-paper inline-flex h-11 w-11 items-center justify-center transition-colors"
                    aria-label="Nächstes Bild"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                  {!reducedMotion && (
                    <button
                      type="button"
                      onClick={() => setUserPaused((paused) => !paused)}
                      aria-pressed={userPaused}
                      className="hover:bg-ink hover:text-paper inline-flex h-11 w-11 items-center justify-center transition-colors"
                      aria-label={
                        userPaused
                          ? "Bildwechsel fortsetzen"
                          : "Bildwechsel anhalten"
                      }
                    >
                      {userPaused ? (
                        <Play className="h-5 w-5" aria-hidden />
                      ) : (
                        <Pause className="h-5 w-5" aria-hidden />
                      )}
                    </button>
                  )}
                </div>
              )}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </section>
  );
}
