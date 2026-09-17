import Link from "next/link";
import PublicPage from "../_components/general/public-page";
import { ButtonLink } from "../_components/programmheft/button-link";
import { ClosingCall } from "../_components/programmheft/closing-call";
import { PageSection, Split } from "../_components/programmheft/page-section";
import { PointList } from "../_components/programmheft/point-list";
import { ArrowLink, Heading } from "../_components/programmheft/section-head";
import { WayList, WayRow } from "../_components/programmheft/way-list";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Über uns",
  description:
    "Das Posaunenwerk der Evangelischen Kirche im Rheinland: Auftrag, Struktur, Gremien und die Menschen hinter der Bläserarbeit im Rheinland.",
  path: "/ueber-uns",
});

const SECTIONS = [
  {
    title: "Struktur & Geschichte",
    description:
      "Erfahre mehr über die Geschichte des Posaunenwerks Rheinland und wie wir organisiert sind.",
    href: "/ueber-uns/struktur",
  },
  {
    title: "Vorstand",
    description:
      "Lerne die Mitglieder unseres Vorstands kennen, die das Posaunenwerk leiten.",
    href: "/ueber-uns/vorstand",
  },
  {
    title: "Auswahlchöre",
    description:
      "Unsere Auswahlchöre repräsentieren die musikalische Spitze des Posaunenwerks.",
    href: "/ueber-uns/auswahlchoere",
  },
  {
    title: "Posaunenrat",
    description:
      "Der Posaunenrat berät den Vorstand und vertritt die Interessen der Chöre.",
    href: "/ueber-uns/posaunenrat",
  },
  {
    title: "Bezirke & Obleute",
    description:
      "Informationen zu unseren Bezirken und deren Ansprechpartner*innen.",
    href: "/ueber-uns/bezirke",
  },
  {
    title: "Posaunenwarte",
    description:
      "Die Posaunenwarte leiten das Posaunenwerk in musikalischer Hinsicht.",
    href: "/ueber-uns/posaunenwarte",
  },
];

const GESCHICHTE = [
  {
    year: 1949,
    title: "Gründung des Posaunenwerks",
    description:
      "Das Posaunenwerk Rheinland entstand durch den Zusammenschluss der Posaunenchöre auf dem Gebiet der Evangelischen Kirche im Rheinland. Damit begann eine neue Ära der organisierten Posaunenchorarbeit in unserer Region.",
  },
  {
    year: 1986,
    title: "Rechtliche Selbständigkeit",
    description:
      "Das Posaunenwerk wurde rechtlich selbständig und als Verein organisiert. Diese Struktur ermöglicht es uns bis heute, flexibel und eigenverantwortlich zu agieren.",
  },
  {
    year: 2016,
    title: "UNESCO-Weltkulturerbe",
    description:
      "Ein historischer Moment: Posaunenchöre wurden in die UNESCO-Liste des immateriellen Weltkulturerbes aufgenommen. Diese Anerkennung würdigt die besondere Bedeutung der Posaunenchorarbeit für die deutsche Kultur.",
  },
  {
    year: 2019,
    title: "70 Jahre Posaunenwerk",
    description:
      'Zum 70-jährigen Bestehen veranstaltete das Posaunenwerk vom 24. bis 26. Mai den Landesposaunentag in Trier mit rund 400 Teilnehmenden unter dem Motto "HimmelHochJauchzen".',
  },
  {
    year: "EPiD",
    title: "Teil einer großen Bewegung",
    description:
      "Das Posaunenwerk Rheinland gehört zum Evangelischen Posaunendienst in Deutschland (EPiD) mit mehr als 100.000 Posaunenbläser*innen. Der EPiD organisierte große Posaunentage in Leipzig (2008), Dresden (2016) und Hamburg (2024) mit jeweils über 16.000 Teilnehmenden.",
  },
];

const FAKTEN = [
  { title: "~200", text: "Posaunenchöre" },
  { title: "~2.000", text: "Aktive Bläserinnen & Bläser" },
  { title: "13", text: "Bezirke" },
  { title: "1949", text: "Gründungsjahr" },
  {
    title: "UNESCO-Weltkulturerbe",
    text: "2016 wurden Posaunenchöre in die UNESCO-Liste des immateriellen Weltkulturerbes aufgenommen.",
  },
  {
    title: "Teil des EPiD",
    text: "Mitglied im Evangelischen Posaunendienst in Deutschland mit über 100.000 Bläser*innen.",
  },
];

const SOCIALS = [
  {
    label: "Facebook",
    href: "https://facebook.com/posaunenwerkrheinland",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/posaunenwerk_rheinland/",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@PWRheinland",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
];

const ICON_BUTTON =
  "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex h-11 w-11 items-center justify-center border-2 transition-colors";

export default function UeberUnsPage() {
  return (
    <PublicPage
      title="Über uns"
      heroTitle="Über das Posaunenwerk Rheinland"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Über uns" }]}
      description={
        <>
          <p className="mb-6">
            Das Posaunenwerk der Evangelischen Kirche im Rheinland e.V. ist die
            Dachorganisation für knapp 200 Posaunenchöre mit etwa 2.000
            Mitgliedern. Diese Chöre verteilen sich über das große Gebiet der
            rheinischen Landeskirche, von Emmerich im Norden bis nach
            Saarbrücken im Süden, von Aachen im Westen bis
            Altenkirchen/Westerwald im Osten.
          </p>
          <p>
            Posaunenchöre – das sind gemischte Blechbläserensembles, die zur
            Ehre Gottes und zur Freude der Mitmenschen Musik machen. Sie haben
            eine lange Geschichte und gehören zum immateriellen Kulturerbe in
            Deutschland.
          </p>
        </>
      }
    >
      {/* Unterseiten als Register direkt unter dem Seitenkopf */}
      <PageSection>
        <WayList rule={false} columns={2}>
          {SECTIONS.map((section) => (
            <WayRow
              key={section.href}
              href={section.href}
              title={section.title}
              description={section.description}
            />
          ))}
        </WayList>
      </PageSection>

      <PageSection labelledBy="geschichte-heading" rule>
        <Split
          head={<Heading id="geschichte-heading">Unsere Geschichte</Heading>}
          bodyClassName="mt-8"
        >
          <PointList
            items={GESCHICHTE.map((event) => ({
              title: event.title,
              text: (
                <>
                  <span className="semi-condensed text-ink dark:text-night-text mb-1 block text-sm font-semibold tabular-nums">
                    {event.year}
                  </span>
                  {event.description}
                </>
              ),
            }))}
          />
          <ArrowLink href="/ueber-uns/struktur" className="mt-8">
            Mehr zur Geschichte und Struktur
          </ArrowLink>
        </Split>
      </PageSection>

      <PageSection labelledBy="fakten-heading" rule>
        <Split
          side="right"
          head={<Heading id="fakten-heading">Zahlen & Fakten</Heading>}
          bodyClassName="mt-8"
        >
          <PointList items={FAKTEN} columns={3} titleAs="p" />
        </Split>
      </PageSection>

      <PageSection labelledBy="kontakt-heading" rule>
        <Split
          head={<Heading id="kontakt-heading">Kontakt</Heading>}
          bodyClassName="mt-8"
        >
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <Heading as="h3" size="list" rule>
                Geschäftsstelle
              </Heading>
              <dl className="mt-5 space-y-5">
                <div>
                  <dt className="semi-condensed text-dark dark:text-night-muted text-sm font-semibold">
                    Adresse
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1 text-lg leading-relaxed">
                    Posaunenwerk der Evangelischen Kirche im Rheinland e.V.
                    <br />
                    Rudolf-Harbig-Str. 20
                    <br />
                    56179 Vallendar
                  </dd>
                </div>
                <div>
                  <dt className="semi-condensed text-dark dark:text-night-muted text-sm font-semibold">
                    Telefon
                  </dt>
                  <dd className="mt-1">
                    <a href="tel:02613000011" className="link-ink text-lg">
                      0261 300 00 11
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="semi-condensed text-dark dark:text-night-muted text-sm font-semibold">
                    E-Mail
                  </dt>
                  <dd className="mt-1">
                    <a
                      href="mailto:info@posaunenwerk-rheinland.de"
                      className="link-ink text-lg"
                    >
                      info@posaunenwerk-rheinland.de
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="semi-condensed text-dark dark:text-night-muted text-sm font-semibold">
                    Öffnungszeiten
                  </dt>
                  <dd className="text-ink dark:text-night-text mt-1 text-lg leading-relaxed">
                    Mo - Fr: 9:00 - 16:00 Uhr
                    <br />
                    oder nach Vereinbarung
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <Heading as="h3" size="list" rule>
                Schnellkontakt
              </Heading>
              <p className="text-ink dark:text-night-text mt-5 max-w-[60ch] text-lg leading-relaxed">
                Haben Sie Fragen oder möchten Sie mehr erfahren? Nutzen Sie
                unser Kontaktformular oder wenden Sie sich direkt an uns.
              </p>
              <ButtonLink href="/kontakt" className="mt-6">
                Kontaktformular
              </ButtonLink>

              <div
                className="mt-8 flex flex-wrap gap-3"
                role="list"
                aria-label="Soziale Netzwerke"
              >
                {SOCIALS.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={ICON_BUTTON}
                    aria-label={social.label}
                  >
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path d={social.path} />
                    </svg>
                  </a>
                ))}
              </div>

              <p className="text-ink dark:text-night-text mt-8 max-w-[60ch] text-lg leading-relaxed">
                <strong className="font-semibold">Tipp:</strong> Abonnieren Sie
                unseren Newsletter für aktuelle Informationen und Termine!
              </p>
              <Link href="/newsletter" className="link-ink mt-2 inline-block">
                Newsletter abonnieren
              </Link>
            </div>
          </div>
        </Split>
      </PageSection>

      <ClosingCall
        id="mitmachen-heading"
        title="Teil unserer Gemeinschaft werden?"
        text="Entdecke die Vielfalt der Posaunenchormusik und werde Teil unserer lebendigen Gemeinschaft!"
        actions={[{ href: "/mitmachen", label: "Jetzt mitmachen" }]}
      />
    </PublicPage>
  );
}
