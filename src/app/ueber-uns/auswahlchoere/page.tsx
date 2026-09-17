import PublicPage from "@/app/_components/general/public-page";
import { api } from "@/trpc/server";
import ConcertCard from "@/app/_components/events/concert-card";
import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import ZoomableImage from "@/app/_components/general/zoomable-image";
import {
  ArrowLink,
  Heading,
} from "@/app/_components/programmheft/section-head";
import { Note } from "@/app/_components/programmheft/note";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { buildPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata = buildPageMetadata({
  title: "Auswahlchöre",
  description:
    "Die Auswahlchöre des Posaunenwerks Rheinland: Besetzung, Leitung, Probenarbeit und Wege zur Mitwirkung.",
  path: "/ueber-uns/auswahlchoere",
});

/** Bildfeld im Kopf; mit Foto als Vergrößern-Button, ohne als Logo-Fläche. */
const ENSEMBLE_FRAME =
  "bg-ink dark:bg-night-raised relative mt-8 aspect-[3/2] w-full max-w-xl overflow-hidden";

export default async function AuswahlchoerePage() {
  const ensembles = (await api.auswahlchoere.getAll({})).auswahlchoere;

  return (
    <PublicPage
      title="Auswahlchöre"
      heroTitle="Unsere Auswahlchöre"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Über Uns", href: "/ueber-uns" },
        { label: "Auswahlchöre" },
      ]}
      description={
        <p>
          Die Auswahlchöre des Posaunenwerks Rheinland repräsentieren die
          musikalische Spitze unserer Arbeit. Sie setzen sich aus besonders
          engagierten und talentierten Bläserinnen und Bläsern zusammen und
          präsentieren die Vielfalt der Posaunenchormusik auf höchstem Niveau.
        </p>
      }
    >
      {/* Ensembles */}
      {ensembles.map((ensemble, index) => (
        <PageSection
          key={ensemble.name}
          id={ensemble.slug}
          labelledBy={`${ensemble.slug}-heading`}
          rule={index > 0}
          className="scroll-mt-24"
        >
          <Split
            side={index % 2 === 0 ? "left" : "right"}
            head={
              <>
                <Heading
                  id={`${ensemble.slug}-heading`}
                  className="text-balance break-words hyphens-auto"
                >
                  {ensemble.name}
                </Heading>
                <p className="text-primary-ink dark:text-primary mt-3 text-xl font-semibold">
                  {ensemble.subtitle}
                </p>
                <p className="text-dark dark:text-night-muted mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem]">
                  <span>Seit {ensemble.founded}</span>
                  <span>{ensemble.members}</span>
                  {ensemble.conductor ? (
                    <span>
                      {ensemble.conductor.districtRoleName
                        ? `${ensemble.conductor.districtRoleName} `
                        : ""}
                      {ensemble.conductor.displayName}
                    </span>
                  ) : null}
                </p>
                {/* Das Bild gehört in den Kopf, nicht in den Inhalt: Sonst
                    endet die Kopfspalte nach Name, Untertitel und Angaben und
                    läuft neben Text und Terminen mehrere hundert Pixel leer
                    mit — auf dieser Seite waren das bis zu 629px. Mit dem Bild
                    trägt sie eigene Höhe. So bleiben die zwei alternierenden
                    Spalten erhalten und die tote Fläche verschwindet, statt
                    dass der Abschnitt zu einer einzigen Spalte gestapelt
                    wird. */}
                {ensemble.image?.url ? (
                  <ZoomableImage
                    src={ensemble.image.url}
                    alt={`Ein Bild des Ensembles ${ensemble.name}`}
                    copyright={ensemble.image.copyright}
                    creator={ensemble.image.creator}
                    className={ENSEMBLE_FRAME}
                  >
                    <ImageWithFallback
                      src={ensemble.image.url}
                      alt={`Ein Bild des Ensembles ${ensemble.name}`}
                      fill
                      priority={index < 2}
                      sizes="(min-width: 1024px) 30vw, 100vw"
                      className="object-cover"
                    />
                  </ZoomableImage>
                ) : (
                  <div className={ENSEMBLE_FRAME}>
                    <ImageWithFallback
                      src={null}
                      alt={`Ein Bild des Ensembles ${ensemble.name}`}
                      fill
                    />
                  </div>
                )}
              </>
            }
            // Text, Termine und Hinweis teilen sich ein Satzmaß. `text-lg` am
            // Block, damit `65ch` in der Schriftgröße des Fließtexts rechnet;
            // Termine und Hinweis setzen ihre Größen selbst.
            //
            // Steht der Kopf mit dem Bild rechts, rückt der Block an ihn
            // heran. Sonst endet er bei 65 Zeichen linksbündig mitten in der
            // Spalte: gemessen 242px Leere bis zur Bildkante, während es bei
            // linksstehendem Kopf die 40px Rasterabstand sind.
            bodyClassName={cn(
              "mt-8 max-w-[65ch] space-y-10 text-lg",
              index % 2 !== 0 && "lg:ml-auto",
            )}
          >
            <p className="text-ink dark:text-night-text leading-relaxed">
              {ensemble.description}
            </p>

            {ensemble.events && ensemble.events.length > 0 ? (
              <div>
                <Heading as="h3" size="list" rule>
                  Kommende Termine
                </Heading>
                <ul className="mt-3">
                  {ensemble.events.map((event, i) => (
                    <li key={i}>
                      <ConcertCard concert={event} ensemble={ensemble} i={i} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {ensemble.showApplication ? (
              <Note tone="info" title="Interesse am LaJuPo?" titleAs="h3">
                <p>
                  Teilnehmen kann, wer 15-25 Jahre alt ist. Die Teilnahme
                  erfolgt über ein Vorspiel, das alle 2 Jahre stattfindet. Mit
                  der Teilnahme verpflichtet man sich für 2 Jahre bei den 3-4
                  Proben&shy;wochenenden und Konzerten pro Jahr. Die nächste
                  Legislatur beginnt 2027.
                </p>
                <ArrowLink href="/kontakt" className="mt-4">
                  Jetzt informieren
                </ArrowLink>
              </Note>
            ) : null}
          </Split>
        </PageSection>
      ))}
    </PublicPage>
  );
}
