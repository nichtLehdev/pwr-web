import Image from "next/image";
import type { Media } from "~/generated/prisma/client";
import MediaCredit from "@/app/_components/general/media-credit";
import ZoomableImage from "@/app/_components/general/zoomable-image";
import { Heading } from "@/app/_components/programmheft/section-head";
import { isPortrait, naturalAspectStyle } from "@/lib/image-orientation";
import { cn } from "@/lib/utils";
import "@/styles/beschreibung.css";

type TerminMedia = Pick<
  Media,
  "url" | "alt" | "copyright" | "creator" | "width" | "height"
>;

/**
 * Beschreibung mit Titelbild, das der Text umfließt (ab `sm` rechts, halbe Spaltenbreite).
 * Auf dem Handy folgt das Bild dem Text, weil der hohe Seitenkopf ihn sonst unter die Kante schiebt.
 * Hochformate bleiben ungeschnitten und werden dafür schmaler gesetzt.
 */
export function TerminBeschreibung({
  image,
  fallbackAlt,
  html,
}: {
  image: TerminMedia | null | undefined;
  /** Alternativtext, wenn das Bild keinen eigenen hat (Titel des Termins). */
  fallbackAlt: string;
  /** Bereits gefiltertes HTML aus `renderDescriptionHtml`. */
  html: string | null;
}) {
  if (!html && !image) return null;
  const alt = image ? image.alt || fallbackAlt : "";
  const portrait = isPortrait(image);

  return (
    <div>
      {html ? (
        <Heading as="h2" size="list" rule>
          Beschreibung
        </Heading>
      ) : null}
      {/* Unter `sm` Flex-Spalte, damit das Bild hinter den Text rückt, ohne
          die Reihenfolge im Quelltext zu ändern; ab `sm` Blocksatz mit Float. */}
      <div className={cn("flex flex-col sm:flow-root", html && "mt-4")}>
        {image ? (
          <figure
            className={cn(
              portrait ? "w-2/3 self-center sm:w-2/5" : "w-full",
              html
                ? "order-last mt-5 sm:order-none sm:float-right sm:mt-0 sm:mb-2 sm:ml-8"
                : null,
              !portrait && (html ? "sm:w-1/2" : "sm:w-3/5"),
            )}
          >
            <ZoomableImage
              src={image.url}
              alt={alt}
              copyright={image.copyright}
              creator={image.creator}
              className={cn(
                "bg-ink dark:bg-night-raised w-full overflow-hidden",
                !portrait && "aspect-[2/1] sm:aspect-[3/2]",
              )}
              style={portrait ? naturalAspectStyle(image) : undefined}
            >
              <Image
                src={image.url}
                alt={alt}
                fill
                preload
                sizes={
                  portrait
                    ? "(min-width: 64rem) 22rem, (min-width: 40rem) 40vw, 66vw"
                    : "(min-width: 64rem) 34rem, (min-width: 40rem) 60vw, 100vw"
                }
                className="object-cover"
              />
            </ZoomableImage>
            <figcaption>
              <MediaCredit
                copyright={image.copyright}
                creator={image.creator}
                className="mt-2"
              />
            </figcaption>
          </figure>
        ) : null}
        {html ? (
          /* `beschreibung` statt `prose`: das Typography-Plugin ist nicht geladen. */
          <div
            className="beschreibung"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Bild eines mitwirkenden Ensembles; 3:2 wie auf der Auswahlchöre-Seite, damit der Beschnitt gleich ist. */
export function MitwirkendeBild({
  image,
  fallbackAlt,
}: {
  image: TerminMedia;
  /** Alternativtext, wenn das Bild keinen eigenen hat (Name des Ensembles). */
  fallbackAlt: string;
}) {
  const alt = image.alt || fallbackAlt;
  return (
    <figure className="w-full shrink-0 md:ml-auto md:w-80">
      <ZoomableImage
        src={image.url}
        alt={alt}
        copyright={image.copyright}
        creator={image.creator}
        className="bg-ink dark:bg-night-raised aspect-[3/2] w-full overflow-hidden"
      >
        <Image
          src={image.url}
          alt={alt}
          fill
          sizes="(min-width: 48rem) 20rem, 100vw"
          className="object-cover"
        />
      </ZoomableImage>
      <figcaption>
        <MediaCredit
          copyright={image.copyright}
          creator={image.creator}
          className="mt-2"
        />
      </figcaption>
    </figure>
  );
}
