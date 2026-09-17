import PublicPage from "../_components/general/public-page";
import { api } from "@/trpc/server";
import { ClosingCall } from "../_components/programmheft/closing-call";
import { Panel } from "../_components/programmheft/panel";
import { PageSection, Split } from "../_components/programmheft/page-section";
import { PersonList, PersonRow } from "../_components/programmheft/person-row";
import { PointList, type Point } from "../_components/programmheft/point-list";
import { Heading } from "../_components/programmheft/section-head";
import { ValueTable } from "../_components/programmheft/value-table";
import { WayList, WayRow } from "../_components/programmheft/way-list";
import { capitalizeFirstLetter } from "@/lib/utils";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Förderverein",
  description:
    "Der Förderverein Rheinisches Posaunenwerk: Ziele, Mitgliedschaft und wie deine Unterstützung der Bläserarbeit im Rheinland zugutekommt.",
  path: "/foerderverein",
});

/** Fließtext der Seite: Tinte, ruhige Zeilenlänge. */
const PROSE =
  "text-ink dark:text-night-text max-w-[65ch] text-lg leading-relaxed";

const WAS_WIR_TUN: Point[] = [
  {
    title: "Auswahlchorarbeit",
    text: "Förderung junger, talentierter Bläserinnen und Bläser in unseren Auswahlensembles wie dem Landesjugendposaunenchor und ConSpirito.",
  },
  {
    title: "Geschwisterermäßigung",
    text: "20 % Ermäßigung auf die Lehrgangskosten ab dem zweiten Geschwisterkind – der Förderverein gleicht den Betrag aus.",
  },
  {
    title: "Lehrgangskosten",
    text: "Bis zu 1.000 € pro Jahr zur Reduzierung der Teilnehmerbeiträge für Lehrgänge – das hilft allen Teilnehmenden.",
  },
  {
    title: "Projektförderung",
    text: "CD-Produktionen, Drucksachen, Werbemittel und weitere Projekte des Posaunenwerks – finanziert aus Mitteln des Fördervereins.",
  },
];

const MITGLIED_VORTEILE: Point[] = [
  { title: <strong>Günstiger Jahresbeitrag: nur 36 €</strong> },
  {
    title:
      "Einladung zur jährlichen Mitgliederversammlung mit Berichten und Zukunftsplanungen",
  },
  { title: "Flexible Kündigung möglich bis 3 Monate vor Jahresende" },
  {
    title: (
      <>
        <strong>Geschenk-CD</strong> zum Bläserheft nach Wahl für alle
        Neumitglieder
      </>
    ),
  },
];

/**
 * Förderverein-Seite: die einzige Seite, auf der die blaue Druckfläche für
 * den eigenen Werbeabschnitt „Mitglied werden“ steht (One Field Rule); der
 * Schlussaufruf bleibt wie überall orange. Anrede „Sie“ wie auf den übrigen
 * Über-uns-Seiten.
 */
export default async function FoerdervereinPage() {
  const foerdervereinMembers = await api.organization.getFoerderverein();
  const boardMembers = foerdervereinMembers.filter(
    (member) => member.role !== "BEISITZER" && member.role !== "MITGLIED",
  );
  const beisitzMembers = foerdervereinMembers.filter(
    (member) => member.role === "BEISITZER",
  );

  return (
    <PublicPage
      title="Förderverein Rheinisches Posaunenwerk"
      tone="foerderverein"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Über Uns", href: "/ueber-uns" },
        { label: "Förderverein" },
      ]}
      description={
        <p>
          Bläser für Bläser – Unterstützen Sie die Arbeit des Posaunenwerks und
          werden Sie Teil unserer Gemeinschaft!
        </p>
      }
    >
      {/* Was wir tun */}
      {/* Kein `flush="top"`: Diese Seite war die einzige ohne oberes Polster am
          ersten Abschnitt — gemessen 85px zwischen Titel und erster
          Überschrift, während /mitmachen, /materialien und /kontakt
          übereinstimmend bei 181px liegen. */}
      <PageSection labelledBy="was-wir-tun-heading">
        <Split
          head={<Heading id="was-wir-tun-heading">Was wir tun</Heading>}
          bodyClassName="mt-8"
        >
          <p className={PROSE}>
            Seit 2008 unterstützt der Förderverein das Posaunenwerk bei seinen
            Aufgaben. Durch zweckgebundene Spenden bauen wir einen
            Vermögensstock auf, mit dessen Erträgen wir die Arbeit des
            Posaunenwerks nachhaltig fördern.
          </p>
          <PointList items={WAS_WIR_TUN} columns={2} className="mt-10" />
        </Split>
      </PageSection>

      {/* Mitglied werden — die eine blaue Fläche dieser Seite (One Field Rule) */}
      <PageSection labelledBy="mitglied-heading" surface="foerderverein">
        <Split
          side="right"
          head={
            <>
              <Heading id="mitglied-heading" className="text-balance">
                Mitglied werden
              </Heading>
              <span aria-hidden className="bg-ink mt-6 block h-1.5 w-24" />
              <p className="mt-6 max-w-[40ch] text-xl leading-relaxed">
                Unterstützen Sie die Arbeit des Posaunenwerks kontinuierlich und
                werden Sie Teil unserer Gemeinschaft. Ihre Beiträge fließen
                direkt in Förderprojekte, Werbemittel und weitere wichtige
                Aufgaben.
              </p>
            </>
          }
          bodyClassName="mt-10"
        >
          <PointList items={MITGLIED_VORTEILE} columns={2} titleAs="p" />
          <WayList className="mt-10">
            <WayRow
              href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
              title="Mitglied werden"
            />
            <WayRow
              href="/downloads/foerderverein-flyer.pdf"
              title="Flyer herunterladen"
              kind="download"
              fileType="PDF"
            />
          </WayList>
        </Split>
      </PageSection>

      {/* Weitere Unterstützungsmöglichkeiten */}
      <PageSection labelledBy="unterstuetzung-heading" rule>
        <Split
          head={
            <Heading id="unterstuetzung-heading" className="hyphens-manual">
              Weitere Unterstützungs&shy;möglichkeiten
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className="grid gap-12 md:grid-cols-2 md:gap-10">
            <div>
              <Heading as="h3" size="list" rule>
                Spenden &amp; Kollekten
              </Heading>
              <p className={`${PROSE} mt-5`}>
                Gerne werden wir bei freudigen oder traurigen Anlässen als
                Spendenempfänger benannt. Wir stellen Spendenbescheinigungen aus
                und sind als steuerbegünstigt anerkannt.
              </p>

              <Panel
                as="section"
                labelledBy="bankverbindung-heading"
                className="mt-6"
              >
                <Heading as="h3" id="bankverbindung-heading" size="list">
                  Bankverbindung
                </Heading>
                <p className="text-ink dark:text-night-text mt-4 text-lg leading-relaxed">
                  Förderverein Rheinisches Posaunenwerk e.V.
                  <br />
                  KD-Bank Dortmund
                  <br />
                  <strong className="font-semibold">IBAN:</strong> DE65 3506
                  0190 1014 1990 19
                  <br />
                  <strong className="font-semibold">BIC:</strong> GENODED1DKD
                </p>
              </Panel>

              <p className="text-dark dark:text-night-muted mt-4 text-sm leading-relaxed">
                Das Finanzamt Essen-Süd hat den Förderverein als
                steuerbegünstigt anerkannt und berechtigt,
                Spendenbescheinigungen auszustellen.
              </p>
            </div>

            <div className="md:border-rule md:dark:border-night-rule md:border-l md:pl-10">
              <Heading as="h3" size="list" rule>
                CD &quot;Unter Sternen und Satelliten&quot;
              </Heading>
              <div className={`${PROSE} mt-5 space-y-4`}>
                <p>
                  Unsere Ensembles haben eine wunderbare CD eingespielt – mit
                  Trompeter{" "}
                  <strong className="font-semibold">Markus Stockhausen</strong>{" "}
                  als Solist. Komplett vom Förderverein finanziert!
                </p>
                <p>
                  Die CD wurde bereits auf dem Deutschen Evangelischen
                  Posaunentag präsentiert und erhielt viel Applaus.
                </p>
              </div>

              <ValueTable
                rows={[{ label: "CD-Bestellung", value: "15 €" }]}
                className="mt-6 max-w-xs"
              />
              <p className="text-dark dark:text-night-muted mt-2 text-sm">
                zzgl. 2 € Versandkostenpauschale
              </p>

              <WayList className="mt-8">
                <WayRow
                  href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=CD-Bestellung 'Unter Sternen und Satelliten'"
                  title="Jetzt bestellen"
                />
              </WayList>
            </div>
          </div>
        </Split>
      </PageSection>

      {/* Vorstand */}
      <PageSection labelledBy="vorstand-heading" rule>
        <Split
          side="right"
          head={<Heading id="vorstand-heading">Unser Vorstand</Heading>}
          bodyClassName="mt-8"
        >
          <PersonList columns={2}>
            {boardMembers.map((member) => (
              <PersonRow
                key={member.id}
                image={member.person.image}
                name={member.person.name ?? "Unbekannt"}
                role={capitalizeFirstLetter(member.role)}
                email={member.person.email}
              />
            ))}
          </PersonList>

          {beisitzMembers.length > 0 ? (
            <>
              <Heading as="h3" size="list" rule className="mt-12">
                Beisitzer
              </Heading>
              <ul className="mt-3 grid gap-x-10 sm:grid-cols-2">
                {beisitzMembers.map((member) => (
                  <li
                    key={member.id}
                    className="border-rule dark:border-night-rule text-ink dark:text-night-text border-b py-3 text-lg"
                  >
                    {member.person.name}{" "}
                    {member.person.city && `(${member.person.city})`}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="border-rule dark:border-night-rule text-dark dark:text-night-muted mt-10 border-t pt-6 text-sm leading-relaxed">
            <strong className="text-ink dark:text-night-text font-semibold">
              Sitz des Fördervereins:
            </strong>{" "}
            Zweigertstraße 52, 45130 Essen
            <br />
            Geführt beim Amtsgericht Essen, Aktenzeichen VR 4887
          </p>
        </Split>
      </PageSection>

      <ClosingCall
        id="cta-heading"
        title="Werden Sie Teil unserer Gemeinschaft!"
        text="Unterstützen Sie die Arbeit des Posaunenwerks und profitieren Sie von exklusiven Vorteilen."
        actions={[
          {
            href: "mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein",
            label: "Mitglied werden",
          },
          { href: "/kontakt", label: "Kontakt aufnehmen" },
        ]}
      />
    </PublicPage>
  );
}
