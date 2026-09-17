import { PageSection } from "@/app/_components/programmheft/page-section";
import {
  Heading,
  SectionHead,
} from "@/app/_components/programmheft/section-head";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";

type Entry = { href: string; title: string; text: string };

const SEITEN: Entry[] = [
  {
    href: "/mitmachen/chor-finden",
    title: "Chor finden",
    text: "Finde einen Posaunenchor in deiner Nähe",
  },
  {
    href: "/mitmachen/bildung",
    title: "Aus- und Weiterbildung",
    text: "Lehrgänge und Fortbildungen für Bläserinnen und Bläser",
  },
  {
    href: "/ueber-uns/auswahlchoere",
    title: "Auswahlchöre",
    text: "Unsere Ensembles und Auswahlchöre",
  },
  {
    href: "/materialien/blechblatt",
    title: "Rheinisches Blechblatt",
    text: "Unser Magazin für die Posaunenchorarbeit",
  },
  {
    href: "/ueber-uns/posaunenwarte",
    title: "Posaunenwarte",
    text: "Unsere Ansprechpartner in den Bezirken",
  },
  {
    href: "/materialien",
    title: "Materialien",
    text: "Noten, CDs und weitere Materialien",
  },
];

const PARTNER: Entry[] = [
  {
    href: "https://www.ekir.de",
    title: "EKiR",
    text: "Evangelische Kirche im Rheinland",
  },
  {
    href: "https://www.epid.de",
    title: "EPiD",
    text: "Evangelischer Posaunendienst in Deutschland",
  },
  {
    href: "https://bundesmusikverband.de/",
    title: "BMCO",
    text: "Bundesverband Musik in der Kirche",
  },
];

/** „Beliebte Seiten & Partner“ als Register: volle Zeilen statt Kacheln. */
export default function Register() {
  return (
    <PageSection labelledBy="register-heading">
      <SectionHead
        id="register-heading"
        title="Beliebte Seiten & Partner"
        intro="Entdecke unsere wichtigsten Seiten und Partnerorganisationen"
      />

      <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-8">
          <Heading as="h3" id="register-seiten" size="list" rule>
            Beliebte Seiten
          </Heading>
          <WayList labelledBy="register-seiten" rule={false} columns={2}>
            {SEITEN.map((entry) => (
              <WayRow
                key={entry.href}
                href={entry.href}
                title={entry.title}
                description={entry.text}
              />
            ))}
          </WayList>
        </div>
        <div className="lg:col-span-4">
          <Heading as="h3" id="register-partner" size="list" rule>
            Partner
          </Heading>
          <WayList labelledBy="register-partner" rule={false}>
            {PARTNER.map((entry) => (
              <WayRow
                key={entry.href}
                href={entry.href}
                title={entry.title}
                description={entry.text}
              />
            ))}
          </WayList>
        </div>
      </div>
    </PageSection>
  );
}
