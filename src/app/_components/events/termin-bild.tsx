import Image from "next/image";
import type { Media } from "~/generated/prisma/client";
import MediaCredit from "@/app/_components/general/media-credit";
import ZoomableImage from "@/app/_components/general/zoomable-image";
import { Heading } from "@/app/_components/programmheft/section-head";
import { cn } from "@/lib/utils";

type TerminMedia = Pick<Media, "url" | "alt" | "copyright" | "creator">;

/**
 * Beschreibung eines Termins oder Kurses mit Titelbild — dieselbe Haltung wie
 * das Titelbild der Beiträge (Blechblatt): Der Text umfließt das Bild, statt
 * dass es als 869×489px großer Aufmacher über allem steht. Vorher begann die
 * Beschreibung bei 1440×900 erst bei 1482px (Termin) bzw. 1232px (Kurs).
 *
 * - Ab `sm` steht das Bild rechts im Text, 3:2, in der halben Spaltenbreite.
 *   Die Hauptspalte ist mit 869px viel breiter als das Lesemaß der Beiträge;
 *   drei Fünftel wären 521×347px, wieder ein Aufmacher.
 * - Auf dem Handy folgt das Bild dem Text (2:1). Der Seitenkopf der Termine
 *   trägt Motto, Etiketten, Datum und Ort und ist deutlich höher als der der
 *   Beiträge: Mit dem Bild davor stand die erste Textzeile bei 390×844 erst
 *   bei 801–818px, ein zweizeiliger Titel hätte sie unter die Kante geschoben.
 * - Ohne Beschreibung gibt es nichts zu umfließen; das Bild steht dann allein
 *   in drei Fünfteln der Spalte.
 * - Der Bildnachweis steht unter dem Bild, nicht mehr mit Schatten auf dem
 *   Foto, wo er auf hellen Bildern kaum zu lesen war.
 */
export function TerminBeschreibung({
  image,
  fallbackAlt,
  html,
}: {
  image: TerminMedia | null | undefined;
  /** Alternativtext, wenn das Bild keinen eigenen hat (Titel des Termins). */
  fallbackAlt: string;
  /** Bereits gefilterte Beschreibung (`sanitizeHtml`), sonst `null`. */
  html: string | null;
}) {
  if (!html && !image) return null;
  const alt = image ? image.alt || fallbackAlt : "";

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
              "w-full",
              html
                ? "order-last mt-5 sm:order-none sm:float-right sm:mt-0 sm:mb-2 sm:ml-8 sm:w-1/2"
                : "sm:w-3/5",
            )}
          >
            <ZoomableImage
              src={image.url}
              alt={alt}
              copyright={image.copyright}
              creator={image.creator}
              className="bg-ink dark:bg-night-raised aspect-[2/1] w-full overflow-hidden sm:aspect-[3/2]"
            >
              <Image
                src={image.url}
                alt={alt}
                fill
                preload
                sizes="(min-width: 64rem) 34rem, (min-width: 40rem) 60vw, 100vw"
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
          <div
            className="prose dark:prose-invert text-ink dark:text-night-text max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Bild eines mitwirkenden Ensembles oder Auswahlchors. 3:2 wie auf der Seite
 * der Auswahlchöre — dieselben Fotos sollen nicht an zwei Stellen verschieden
 * beschnitten sein. Der Bildnachweis stand vorher nur bei Hover über dem Foto;
 * per Tastatur und auf dem Handy war er nie zu sehen.
 */
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
