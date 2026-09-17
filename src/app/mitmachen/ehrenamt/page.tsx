import PublicPage from "@/app/_components/general/public-page";
import { ClosingCall } from "@/app/_components/programmheft/closing-call";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { PointList } from "@/app/_components/programmheft/point-list";
import {
  Heading,
  SectionHead,
} from "@/app/_components/programmheft/section-head";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Ehrenamtlich engagieren",
  description:
    "Ehrenamt im Posaunenwerk Rheinland: Aufgaben, Einsatzfelder und Wege, sich in der rheinischen Bläserarbeit einzubringen.",
  path: "/mitmachen/ehrenamt",
});

const MOEGLICHKEITEN = [
  {
    title: "Chorleitung",
    text: "Leite einen Posaunenchor und bringe deine musikalischen Fähigkeiten ein. Wir unterstützen dich mit Aus- und Weiterbildungsangeboten.",
  },
  {
    title: "Jungbläser-Ausbildung",
    text: "Gib dein Wissen an die nächste Generation weiter und begleite junge Menschen auf ihrem musikalischen Weg.",
  },
  {
    title: "Vorstandsarbeit",
    text: "Gestalte die Zukunft des Posaunenwerks mit. Ob auf Bezirks-, Regional- oder Landesebene – dein Engagement zählt!",
  },
  {
    title: "Organisation & Veranstaltungen",
    text: "Hilf bei der Planung und Durchführung von Konzerten, Freizeiten, Lehrgängen und anderen Events.",
  },
  {
    title: "Kommunikation & Öffentlichkeitsarbeit",
    text: "Gestalte Flyer, pflege Social Media, schreibe Berichte oder fotografiere bei Veranstaltungen.",
  },
  {
    title: "Technik & IT",
    text: "Bringe deine technischen Fähigkeiten ein – ob bei Tontechnik, Website-Pflege oder digitalen Projekten.",
  },
];

const WARUM = [
  {
    title: "Sinnvolle Tätigkeit",
    text: "Dein Engagement macht einen echten Unterschied für Menschen und Gemeinschaften.",
  },
  {
    title: "Gemeinschaft",
    text: "Lerne Gleichgesinnte kennen und knüpfe neue Freundschaften.",
  },
  {
    title: "Persönliche Entwicklung",
    text: "Erweitere deine Fähigkeiten und sammle wertvolle Erfahrungen.",
  },
  {
    title: "Flexible Gestaltung",
    text: "Engagiere dich in dem Umfang, der zu deinem Leben passt.",
  },
];

const UNTERSTUETZUNG = [
  {
    title: "Aus- und Weiterbildung",
    text: "Wir bieten Schulungen und Fortbildungen an, damit du für deine Aufgabe gut gerüstet bist.",
  },
  {
    title: "Vernetzung",
    text: "Tausche dich mit anderen Ehrenamtlichen aus und profitiere von ihren Erfahrungen.",
  },
  {
    title: "Begleitung",
    text: "Du bist nicht allein! Wir stehen dir mit Rat und Tat zur Seite.",
  },
  {
    title: "Anerkennung",
    text: "Dein Engagement wird wertgeschätzt und gewürdigt – persönlich und bei besonderen Anlässen.",
  },
];

/** Ehrenamtlich engagieren, durchgehend mit „du“ (wie auf /mitmachen). */
export default function EhrenamtPage() {
  return (
    <PublicPage
      title="Ehrenamtlich engagieren"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Mitmachen", href: "/mitmachen" },
        { label: "Ehrenamtlich engagieren" },
      ]}
      description={
        <>
          <p>
            Das Posaunenwerk Rheinland lebt vom Engagement vieler Menschen, die
            ihre Zeit, ihre Talente und ihre Leidenschaft einbringen. Ohne
            ehrenamtliche Helferinnen und Helfer wäre unsere Arbeit nicht
            möglich.
          </p>
          <p>
            Ob musikalisch, organisatorisch oder kreativ – es gibt viele
            Möglichkeiten, sich einzubringen. Finde die Aufgabe, die zu dir
            passt!
          </p>
        </>
      }
    >
      <PageSection labelledBy="engagieren-heading">
        <Split
          head={
            <SectionHead
              id="engagieren-heading"
              title="Wo kannst du dich engagieren?"
              intro="Es gibt vielfältige Möglichkeiten, das Posaunenwerk mit deinen Fähigkeiten und deiner Zeit zu unterstützen."
            />
          }
          bodyClassName="mt-8"
        >
          <PointList items={MOEGLICHKEITEN} columns={2} />
        </Split>
      </PageSection>

      <PageSection labelledBy="warum-heading" rule>
        <Split
          side="right"
          head={
            <Heading id="warum-heading">Warum ehrenamtlich engagieren?</Heading>
          }
          bodyClassName="mt-8"
        >
          <PointList items={WARUM} columns={2} />
        </Split>
      </PageSection>

      <PageSection labelledBy="unterstuetzung-heading" rule>
        <Split
          head={
            <Heading id="unterstuetzung-heading" className="hyphens-manual">
              Wir unterstützen dich!
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <PointList items={UNTERSTUETZUNG} columns={2} />
        </Split>
      </PageSection>

      <PageSection labelledBy="erfahrungsbericht-heading" rule>
        <h2 id="erfahrungsbericht-heading" className="sr-only">
          Erfahrungsbericht
        </h2>
        <blockquote className="border-ink dark:border-night-text border-t-2 pt-8">
          <p className="text-ink dark:text-night-text max-w-[60ch] text-xl leading-relaxed italic sm:text-2xl">
            „Die Arbeit als Chorleiter erfüllt mich sehr. Es ist wunderbar zu
            sehen, wie sich die Bläserinnen und Bläser entwickeln und gemeinsam
            Musik machen. Die Unterstützung durch das Posaunenwerk gibt mir
            Sicherheit und hilft mir, immer besser zu werden.“
          </p>
          <footer className="mt-4">
            <span className="condensed text-ink dark:text-night-text text-lg leading-tight font-bold not-italic">
              Michael K.
            </span>
            <span className="text-dark dark:text-night-muted ml-2 text-base not-italic">
              Chorleiter seit 2018
            </span>
          </footer>
        </blockquote>
      </PageSection>

      <ClosingCall
        id="bereit-heading"
        title="Bereit, dich einzubringen?"
        text="Wir freuen uns auf dein Engagement! Kontaktiere uns und lass uns gemeinsam herausfinden, wo und wie du dich am besten einbringen kannst."
        actions={[
          { href: "/kontakt", label: "Jetzt Kontakt aufnehmen" },
          {
            href: "/mitmachen/bildung",
            label: "Weiterbildungsangebote ansehen",
          },
        ]}
      />
    </PublicPage>
  );
}
