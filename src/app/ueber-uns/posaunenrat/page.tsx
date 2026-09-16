import Link from "next/link";
import { api } from "@/trpc/server";
import PublicPage from "@/app/_components/general/public-page";
import { ClosingCall } from "@/app/_components/programmheft/closing-call";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import {
  PersonList,
  PersonRow,
} from "@/app/_components/programmheft/person-row";
import { PointList } from "@/app/_components/programmheft/point-list";
import { Heading } from "@/app/_components/programmheft/section-head";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Landesposaunenrat",
  description:
    "Der Landesposaunenrat des Posaunenwerks Rheinland — Mitglieder, Aufgaben und Zuständigkeiten des leitenden Gremiums der rheinischen Bläserarbeit.",
  path: "/ueber-uns/posaunenrat",
});

const AUFGABEN = [
  {
    title: "Strategische Führung",
    text: "Entscheidungen über Grundsätze und Ziele der Geschäftsführung des Posaunenwerkes sowie Beratung des Vorstands.",
  },
  {
    title: "Personalentscheidungen",
    text: "Anstellung und Entlassung von Landesposaunenwarten sowie Wahl des Vorstands zu Beginn der Wahlperiode.",
  },
  {
    title: "Finanzverwaltung",
    text: "Jährliche Verabschiedung des Haushaltsplans und Kontrolle über die sachgemäße Verwaltung der Finanzen.",
  },
  {
    title: "Beschlusskontrolle",
    text: "Überwachung der Ausführung gefasster Beschlüsse und Sicherung der satzungsgemäßen Arbeit.",
  },
];

export default async function PosaunenratPage() {
  const [bezirke, posaunenratResponse, vorstandResponse] = await Promise.all([
    api.bezirke.getAll(),
    api.organization.getPosaunenrat(),
    api.organization.getVorstand(),
  ]);

  const posaunenratMembers = posaunenratResponse || [];
  const vorstandMembers = vorstandResponse || [];

  const obleute = bezirke.flatMap((bezirk) =>
    bezirk.obleute.map((person) => ({
      ...person,
      districtNumber: bezirk.number,
      districtName: bezirk.shortName,
    })),
  );

  const sachverstaendige = posaunenratMembers.filter(
    (m) => m.role === "SACHVERSTAENDIGE" || m.role === "SACHVERSTAENDIGER",
  );

  const lkmd = posaunenratMembers.find(
    (m) =>
      m.role === "LANDESKIRCHENMUSIKDIREKTOR" ||
      m.role === "LANDESKIRCHENMUSIKDIREKTORIN",
  );

  const lkmdLabel =
    lkmd?.role === "LANDESKIRCHENMUSIKDIREKTORIN"
      ? "Landeskirchenmusikdirektorin"
      : "Landeskirchenmusikdirektor";

  return (
    <PublicPage
      title="Landesposaunenrat"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Über Uns", href: "/ueber-uns" },
        { label: "Posaunenrat" },
      ]}
      description={
        <div className="space-y-4">
          <p>
            Geleitet wird das Posaunenwerk vom Posaunenrat. Dazu trifft er
            Entscheidungen über die Grundsätze und Ziele der Geschäftsführung
            des Posaunenwerkes. Er berät den Vorstand in seiner Arbeit und
            kontrolliert die Ausführung der Beschlüsse. Der Posaunenrat
            entscheidet auch über die Anstellung von Landesposaunenwarten oder
            deren Entlassung.
          </p>
          <p>
            Eine weitere wichtige Aufgabe ist die jährliche Verabschiedung des
            Haushaltsplanes und die Kontrolle über die sachgemäße Verwaltung der
            Finanzen. Zu Beginn der Wahlperiode wählt der Posaunenrat aus seiner
            Mitte den Vorstand für sechs Jahre.
          </p>
          <p className="font-semibold">
            Der Landesposaunenrat kommt mindestens einmal jährlich zusammen.
          </p>
        </div>
      }
    >
      {/* Zusammensetzung */}
      <PageSection labelledBy="zusammensetzung-heading">
        <Split
          head={
            <Heading
              id="zusammensetzung-heading"
              className="text-balance hyphens-manual"
            >
              Zusammen&shy;setzung des Posaunenrats
            </Heading>
          }
          bodyClassName="mt-8 space-y-14"
        >
          <p className="text-ink dark:text-night-text max-w-[65ch] text-lg leading-relaxed">
            Dem Landesposaunenrat gehören die Vorstandsmitglieder, die
            Bezirksobleute, die Landeskirchenmusikdirektorin bzw. der
            Landeskirchenmusikdirektor und etwa zehn Sachverständige an –
            Theologen, Musiker, Pädagogen, Verwaltungsfachleute und sonstige in
            der Posaunenarbeit erfahrene Persönlichkeiten.
          </p>

          {/* Vorstandsmitglieder */}
          <div>
            <Heading as="h3" size="list" rule>
              Vorstandsmitglieder
            </Heading>
            <PersonList className="mt-5">
              {vorstandMembers.map((member, index) => (
                <PersonRow
                  key={index}
                  image={member.person.image}
                  name={member.person.name ?? ""}
                  role={member.position}
                />
              ))}
            </PersonList>
            <p className="text-dark dark:text-night-muted mt-4 text-base leading-relaxed">
              Details zu den Vorstandsmitgliedern finden Sie auf der{" "}
              <Link href="/ueber-uns/vorstand" className="link-ink">
                Vorstand-Seite →
              </Link>
            </p>
          </div>

          {/* Bezirksobleute */}
          <div>
            <Heading as="h3" size="list" rule>
              Bezirksobleute
            </Heading>
            <PersonList className="mt-5">
              {obleute.map((member, index) => (
                <PersonRow
                  key={index}
                  image={member.image}
                  name={member.name ?? ""}
                  role={`${member.roleName} für Bezirk ${member.districtNumber} (${member.districtName})`}
                />
              ))}
            </PersonList>
            <p className="text-dark dark:text-night-muted mt-4 text-base leading-relaxed">
              Ausführliche Informationen zu den Bezirksobfrauen und -obmännern
              finden Sie auf der{" "}
              <Link href="/ueber-uns/bezirke" className="link-ink">
                Bezirke-Seite →
              </Link>
            </p>
          </div>

          {/* Landeskirchenmusikdirektor:in */}
          {lkmd && (
            <div>
              <Heading as="h3" size="list" rule>
                {lkmdLabel}
              </Heading>
              <PersonList columns={1} className="mt-5">
                <PersonRow
                  image={lkmd.person.image}
                  name={lkmd.person.name ?? "Unbekannt"}
                  role={lkmdLabel}
                />
              </PersonList>
            </div>
          )}

          {/* Sachverständige */}
          <div>
            <Heading as="h3" size="list" rule>
              Sachverständige
            </Heading>
            <PersonList columns={4} className="mt-5">
              {sachverstaendige.map((member, index) => (
                <PersonRow key={index} name={member.person.name ?? ""} />
              ))}
            </PersonList>
            <p className="text-dark dark:text-night-muted mt-6 max-w-[65ch] text-base leading-relaxed">
              Die Sachverständigen sind Theologen, Musiker, Pädagogen,
              Verwaltungsfachleute und sonstige in der Posaunenarbeit erfahrene
              Persönlichkeiten, die den Posaunenrat mit ihrer fachlichen
              Expertise unterstützen.
            </p>
          </div>
        </Split>
      </PageSection>

      {/* Aufgaben und Verantwortung */}
      <PageSection labelledBy="aufgaben-heading" rule>
        <Split
          side="right"
          head={
            <Heading id="aufgaben-heading">Aufgaben und Verantwortung</Heading>
          }
          bodyClassName="mt-8"
        >
          <PointList items={AUFGABEN} columns={2} />
        </Split>
      </PageSection>

      <ClosingCall
        id="fragen-heading"
        title="Fragen zum Posaunenrat?"
        text="Bei Fragen zur Arbeit des Posaunenrats wenden Sie sich gerne an unseren Vorstand."
        actions={[
          { href: "/ueber-uns/vorstand", label: "Zum Vorstand" },
          { href: "/kontakt", label: "Kontakt aufnehmen" },
        ]}
      />
    </PublicPage>
  );
}
