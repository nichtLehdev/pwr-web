import Link from "next/link";
import { api } from "@/trpc/server";
import PublicPage from "@/app/_components/general/public-page";
import { ClosingCall } from "@/app/_components/programmheft/closing-call";
import {
  PageSection,
  Split,
} from "@/app/_components/programmheft/page-section";
import { PointList } from "@/app/_components/programmheft/point-list";
import { Heading } from "@/app/_components/programmheft/section-head";
import { WayList, WayRow } from "@/app/_components/programmheft/way-list";
import { buildPageMetadata } from "@/lib/seo";
import {
  VorstandPortrait,
  VorstandPortraitGrid,
} from "./_components/vorstand-portrait";

export const metadata = buildPageMetadata({
  title: "Vorstand",
  description:
    "Der Vorstand des Posaunenwerks Rheinland: Mitglieder, Ämter und Kontaktmöglichkeiten.",
  path: "/ueber-uns/vorstand",
});

const AUFGABEN = [
  {
    title: "Geschäftsführung",
    text: "Führt die laufenden Geschäfte des Posaunenwerkes im Auftrag des Landesposaunenrates.",
  },
  {
    title: "Beschlussumsetzung",
    text: "Setzt die Beschlüsse der Vertreterversammlung und des Posaunenrates um und berichtet darüber.",
  },
  {
    title: "Eilentscheidungen",
    text: "Trifft unaufschiebbare Entscheidungen, wenn dies notwendig ist, bis zur nächsten Sitzung.",
  },
  {
    title: "Vertretung nach außen",
    text: "Der Landesobmann vertritt das Posaunenwerk nach außen und innen gegenüber allen Institutionen.",
  },
  {
    title: "Berichterstattung",
    text: "Erstattet regelmäßig Bericht an den Posaunenrat über die Arbeit und Entwicklung des Posaunenwerks.",
  },
  {
    title: "Ehrenamtliche Arbeit",
    text: "Alle Vorstandsmitglieder arbeiten ehrenamtlich und engagieren sich aus Überzeugung für die Posaunenchorarbeit.",
  },
];

const STRUKTUR = [
  {
    title: "Vertreterversammlung",
    text: "Oberstes Organ des Posaunenwerkes. Kommt mindestens einmal jährlich zusammen, beschließt über die Satzung und wählt die Sachverständigen in den Posaunenrat.",
  },
  {
    title: "Landesposaunenrat",
    text: "Leitet das Posaunenwerk und trifft Entscheidungen über Grundsätze und Ziele. Berät den Vorstand und kontrolliert die Ausführung der Beschlüsse.",
  },
  {
    title: "Vorstand",
    text: "Führt die laufenden Geschäfte des Posaunenwerkes und setzt die Beschlüsse um. Der Landesobmann vertritt das Posaunenwerk nach außen.",
  },
  {
    title: "Posaunenwarte",
    text: "Leiten das Posaunenwerk in musikalischer Hinsicht mit Schwerpunkt auf Weiterbildung der Bläser und Posaunenchorleiter.",
  },
];

export default async function VorstandPage() {
  const vorstandMembers = await api.organization.getVorstand();

  return (
    <PublicPage
      title="Vorstand"
      heroTitle="Der Vorstand des Posaunenwerks"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Über Uns", href: "/ueber-uns" },
        { label: "Vorstand" },
      ]}
      description={
        <>
          <p className="mb-6">
            Der Vorstand führt im Auftrag des Landesposaunenrates die laufenden
            Geschäfte des Posaunenwerkes. Dazu führt er die Beschlüsse der
            Vertreterversammlung und des Landesposaunenrates aus und erstattet
            ihm Bericht.
          </p>
          <p>
            Er kann unaufschiebbare Entscheidungen treffen, wenn dies notwendig
            ist. Der Landesobmann vertritt das Posaunenwerk nach außen und
            innen. Genau wie die Mitglieder der Vertreterversammlung und des
            Landesposaunenrates arbeitet der Vorstand ehrenamtlich.
          </p>
        </>
      }
    >
      {/* Vorstandsmitglieder */}
      <PageSection labelledBy="mitglieder-heading">
        <Split
          head={
            <Heading id="mitglieder-heading" className="hyphens-manual">
              Die Vorstands&shy;mitglieder
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <VorstandPortraitGrid labelledBy="mitglieder-heading">
            {vorstandMembers.map((member, index) => (
              <VorstandPortrait
                key={index}
                name={member.person.name ?? ""}
                role={member.position}
                image={member.person.image}
                email={member.person.email}
                phone={member.person.phone}
              />
            ))}
          </VorstandPortraitGrid>

          <p className="text-ink dark:text-night-text mt-12 max-w-[65ch] text-lg leading-relaxed">
            Bei Fragen oder Anliegen an den Vorstand wenden Sie sich gerne per
            E-Mail an{" "}
            <a
              href="mailto:info@posaunenwerk-rheinland.de"
              className="link-ink"
            >
              info@posaunenwerk-rheinland.de
            </a>{" "}
            oder telefonisch an unsere{" "}
            <Link href="/kontakt" className="link-ink">
              Geschäftsstelle
            </Link>
            .
          </p>
        </Split>
      </PageSection>

      {/* Aufgaben des Vorstands */}
      <PageSection labelledBy="aufgaben-heading" rule>
        <Split
          side="right"
          head={<Heading id="aufgaben-heading">Aufgaben des Vorstands</Heading>}
          bodyClassName="mt-8"
        >
          <PointList items={AUFGABEN} columns={2} />
        </Split>
      </PageSection>

      {/* Organisationsstruktur */}
      <PageSection labelledBy="struktur-heading" rule>
        <Split
          head={
            <Heading id="struktur-heading" className="hyphens-manual">
              Organisations&shy;struktur
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <ol className="border-ink dark:border-night-text border-t-2">
            {STRUKTUR.map((step, index) => (
              <li
                key={step.title}
                className="border-rule dark:border-night-rule flex gap-5 border-b py-5"
              >
                <span className="condensed text-ink dark:text-night-text w-8 shrink-0 text-2xl leading-tight font-extrabold tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="condensed text-ink dark:text-night-text block text-[1.375rem] leading-tight font-bold">
                    {step.title}
                  </span>
                  <span className="text-dark dark:text-night-muted mt-1 block max-w-[60ch] text-base leading-relaxed">
                    {step.text}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <WayList className="mt-10">
            <WayRow href="/ueber-uns/posaunenrat" title="Zum Posaunenrat" />
            <WayRow href="/ueber-uns/struktur" title="Struktur & Geschichte" />
          </WayList>
        </Split>
      </PageSection>

      <ClosingCall
        id="mitarbeit-heading"
        title="Interesse an einer Mitarbeit?"
        text="Viele Funktionen im Posaunenwerk werden ehrenamtlich ausgefüllt. Wenn Sie Interesse haben, sich einzubringen, freuen wir uns über Ihre Kontaktaufnahme!"
        actions={[{ href: "/kontakt", label: "Kontakt aufnehmen" }]}
      />
    </PublicPage>
  );
}
