import { api } from "@/trpc/server";
import PublicPage from "@/app/_components/general/public-page";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { ClosingCall } from "@/app/_components/programmheft/closing-call";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { PersonContactRow } from "@/app/_components/programmheft/person-contact-row";
import { PointList } from "@/app/_components/programmheft/point-list";
import { Heading } from "@/app/_components/programmheft/section-head";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Posaunenwarte",
  description:
    "Die Posaunenwarte im Rheinland: Ansprechpartner für Chöre, Lehrgänge und Bläserarbeit in den 13 Bezirken.",
  path: "/ueber-uns/posaunenwarte",
});

const AUFGABEN = [
  {
    title: "Weiterbildung",
    text: "Weiterbildung der Bläser und Posaunenchorleiter durch Lehrgänge, Workshops und persönliche Betreuung.",
  },
  {
    title: "Chorbesuche",
    text: "Regelmäßige Besuche der Mitgliedschöre zur musikalischen Unterstützung und Beratung vor Ort.",
  },
  {
    title: "Lehrgänge & Freizeiten",
    text: "Organisation und Durchführung von Lehrgängen, Workshops und musikalischen Freizeiten.",
  },
  {
    title: "Beratung",
    text: "Beratung zu musikalischen, organisatorischen und technischen Fragen der Posaunenchorarbeit.",
  },
  {
    title: "Musikalische Leitung",
    text: "Leitung des Posaunenwerks in allen musikalischen Belangen und Pflege des musikalischen Standards.",
  },
  {
    title: "Nachwuchsförderung",
    text: "Besondere Förderung der Jungbläserarbeit und des musikalischen Nachwuchses in den Bezirken.",
  },
];

export default async function PosaunenwartePage() {
  const posaunenwarte = await api.organization.getPosaunenwarte();
  const lpw = posaunenwarte.filter((pw) => pw.role === "LPW");
  const rpw = posaunenwarte.filter((pw) => pw.role === "RPW");

  return (
    <PublicPage
      title="Posaunenwarte"
      heroTitle="Unsere Posaunenwarte"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Über Uns", href: "/ueber-uns" },
        { label: "Posaunenwarte" },
      ]}
      description={
        <p>
          Die Posaunenwarte leiten das Posaunenwerk in musikalischer Hinsicht.
          Dabei liegt der Schwerpunkt ihrer Arbeit in der Weiterbildung der
          Bläser und Posaunenchorleiter. Dazu besuchen sie die Mitgliedschöre
          und bieten Lehrgänge und Freizeiten an. Das Posaunenwerk beschäftigt
          einen hauptamtlichen Landesposaunenwart und fünf nebenamtlich tätige
          Regionalposaunenwarte.
        </p>
      }
    >
      {/* Landesposaunenwart */}
      <PageSection labelledBy="lpw-heading">
        <Split
          head={
            <Heading id="lpw-heading" className="hyphens-manual">
              Landes&shy;posaunenwart
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <ul className="border-ink dark:border-night-text border-t-2">
            {lpw.map((pw) => (
              <li key={pw.id}>
                <PersonContactRow
                  size="lead"
                  name={pw.name ?? ""}
                  role={pw.districtRoleName || "Landesposaunenwart"}
                  image={pw.profileImage}
                  email={pw.email}
                  phone={pw.phone}
                  bio={pw.bio}
                  meta={
                    <p className="text-dark dark:text-night-muted mt-1 text-[0.9375rem]">
                      Alle Bezirke
                    </p>
                  }
                />
              </li>
            ))}
          </ul>
        </Split>
      </PageSection>

      {/* Regionalposaunenwarte */}
      <PageSection labelledBy="rpw-heading" rule>
        {/* Volle Satzbreite statt Kopfspalte: Jede Zeile bringt mit Foto und
            Kurzporträt schon reichlich Höhe mit, bei fünf Personen wird die
            Liste sehr lang. In einem Split stünde daneben eine dritte, ab
            der Überschrift dauerhaft leere Spalte (vgl. materialien/literatur,
            Abschnitt „Unsere Bläserhefte“). */}
        <Heading id="rpw-heading" className="hyphens-manual">
          Regional&shy;posaunenwarte
        </Heading>
        <ul className="border-ink dark:border-night-text mt-10 border-t-2">
          {rpw.map((pw) => (
            <li key={pw.id}>
              <PersonContactRow
                name={pw.name ?? ""}
                role={pw.districtRoleName || "Regionalposaunenwart"}
                image={pw.profileImage}
                email={pw.email}
                phone={pw.phone}
                bio={pw.bio}
                meta={
                  pw.bezirke.length > 0 ? (
                    <div className="mt-2">
                      <p className="semi-condensed text-dark dark:text-night-muted text-sm font-semibold">
                        Betreute Bezirke:
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
                        {pw.bezirke.map((bezirk) => (
                          <span
                            key={bezirk.id}
                            className="text-ink dark:text-night-text text-sm"
                          >
                            <BezirkLabel bezirk={bezirk} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      </PageSection>

      {/* Aufgaben */}
      <PageSection labelledBy="aufgaben-heading" rule>
        <Split
          head={
            <Heading id="aufgaben-heading">Aufgaben der Posaunenwarte</Heading>
          }
          bodyClassName="mt-8"
        >
          <PointList items={AUFGABEN} columns={2} />
        </Split>
      </PageSection>

      <ClosingCall
        id="fragen-heading"
        title="Fragen oder Anliegen?"
        text="Unsere Posaunenwarte stehen Ihnen gerne für Fragen rund um die Posaunenchorarbeit zur Verfügung!"
        actions={[{ href: "/kontakt", label: "Kontakt aufnehmen" }]}
      />
    </PublicPage>
  );
}
