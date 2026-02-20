import Link from "next/link";
import { api } from "@/trpc/server";
import PublicPage from "@/app/_components/general/public-page";
import PeopleCard from "@/app/_components/general/people-card";
import { BuildingIcon, CheckIcon } from "lucide-react";
import { ArrowRightIcon, UsersIcon } from "lucide-react";
import { BanknoteIcon } from "lucide-react";

export default async function PosaunenratPage() {
  const [bezirke, posaunenratResponse, vorstandResponse] = await Promise.all([
    api.bezirke.getAll(),
    api.organization.getPosaunenrat(),
    api.organization.getVorstand(),
  ]);

  const posaunenratMembers = posaunenratResponse || [];
  const vorstandMembers = vorstandResponse || [];

  const obleute = bezirke.flatMap((bezirk) => {
    return [
      ...bezirk.users.map((obleute) => ({
        ...obleute,
        districtNumber: bezirk.number,
        districtName: bezirk.shortName,
      })),
    ];
  });

  const sachverstaendige = posaunenratMembers.filter(
    (m) => m.role === "SACHVERSTAENDIGE" || m.role === "SACHVERSTAENDIGER",
  );

  const lkmd = posaunenratMembers.find(
    (m) => m.role === "LANDESKIRCHENMUSIKDIREKTOR",
  );

  return (
    <PublicPage
      title="Landesposaunenrat"
      color="district-2"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Über Uns", href: "/ueber-uns" },
        { label: "Posaunenrat" },
      ]}
      description={
        <div className="space-y-4">
          <p>
            Geleitet wird das Posaunenwerk vom Posaunenrat. Dazu trifft er
            Entscheidungen über die Grundsätze und Ziele der
            Geschäftsführung des Posaunenwerkes. Er berät den Vorstand in
            seiner Arbeit und kontrolliert die Ausführung der Beschlüsse.
            Der Posaunenrat entscheidet auch über die Anstellung von
            Landesposaunenwarten oder deren Entlassung.
          </p>
          <p>
            Eine weitere wichtige Aufgabe ist die jährliche Verabschiedung
            des Haushaltsplanes und die Kontrolle über die sachgemäße
            Verwaltung der Finanzen. Zu Beginn der Wahlperiode wählt der
            Posaunenrat aus seiner Mitte den Vorstand für sechs Jahre.
          </p>
          <p className="font-semibold">
            Der Landesposaunenrat kommt mindestens einmal jährlich zusammen.
          </p>
        </div>
      }
    >
      {/* Zusammensetzung */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl lg:text-4xl">
              Zusammensetzung des Posaunenrats
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              Dem Landesposaunenrat gehören die Vorstandsmitglieder, die
              Bezirksobleute, der Landeskirchenmusikdirektor und etwa zehn
              Sachverständige an – Theologen, Musiker, Pädagogen,
              Verwaltungsfachleute und sonstige in der Posaunenarbeit erfahrene
              Persönlichkeiten.
            </p>

            {/* Mitglieder-Übersicht */}
            <div className="space-y-12">
              {/* Vorstandsmitglieder */}
              <div>
                <h3 className="text-dark dark:text-dark-text mb-6 flex items-center gap-3 text-xl font-bold md:text-2xl">
                  <div className="bg-primary h-8 w-1 rounded-full"></div>
                  Vorstandsmitglieder
                </h3>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {vorstandMembers.map((member, index) => (
                    <PeopleCard
                      key={index}
                      image={member.image ?? undefined}
                      name={member.name || member.user?.displayName}
                      subtitle={member.position}
                    />
                  ))}
                </div>
                <p className="mb-4 text-gray-600 dark:text-gray-400">
                  Details zu den Vorstandsmitgliedern finden Sie auf der{" "}
                  <Link
                    href="/ueber-uns/vorstand"
                    className="text-primary hover:text-primary-dark font-semibold"
                  >
                    Vorstand-Seite →
                  </Link>
                </p>
              </div>

              {/* Bezirksobleute */}
              <div>
                <h3 className="text-dark dark:text-dark-text mb-6 flex items-center gap-3 text-xl font-bold md:text-2xl">
                  <div className="bg-primary h-8 w-1 rounded-full"></div>
                  Bezirksobleute
                </h3>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {obleute.map((member, index) => (
                    <PeopleCard
                      key={index}
                      image={member.profileImage ?? undefined}
                      name={member.displayName}
                      subtitle={`${member.districtRoleName} für Bezirk ${member.districtNumber} (${member.districtName})`}
                    />
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Ausführliche Informationen zu den Bezirksobfrauen und
                  -obmännern finden Sie auf der{" "}
                  <Link
                    href="/ueber-uns/bezirke"
                    className="text-primary hover:text-primary-dark font-semibold"
                  >
                    Bezirke-Seite →
                  </Link>
                </p>
              </div>

              {/* Landeskirchenmusikdirektor */}
              {lkmd && (
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-6 flex items-center gap-3 text-xl font-bold md:text-2xl">
                    <div className="bg-primary h-8 w-1 rounded-full"></div>
                    Landeskirchenmusikdirektor
                  </h3>
                  <PeopleCard
                    image={lkmd.image ?? undefined}
                    name={lkmd.name || lkmd.user?.displayName || "Unbekannt"}
                    subtitle="Landeskirchenmusikdirektor"
                  />
                </div>
              )}

              {/* Sachverständige */}
              <div>
                <h3 className="text-dark dark:text-dark-text mb-6 flex items-center gap-3 text-xl font-bold md:text-2xl">
                  <div className="bg-primary h-8 w-1 rounded-full"></div>
                  Sachverständige
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {sachverstaendige.map((member, index) => (
                    <div
                      key={index}
                      className="dark:border-dark-border dark:bg-dark-surface dark:shadow-dark-border rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <p className="text-dark dark:text-dark-text text-center font-semibold">
                        {member.name}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
                  Die Sachverständigen sind Theologen, Musiker, Pädagogen,
                  Verwaltungsfachleute und sonstige in der Posaunenarbeit
                  erfahrene Persönlichkeiten, die den Posaunenrat mit ihrer
                  fachlichen Expertise unterstützen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Aufgaben und Verantwortung */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-2xl font-bold md:text-3xl lg:text-4xl">
              Aufgaben und Verantwortung
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <BuildingIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                  Strategische Führung
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Entscheidungen über Grundsätze und Ziele der Geschäftsführung
                  des Posaunenwerkes sowie Beratung des Vorstands.
                </p>
              </div>

              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                  Personalentscheidungen
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Anstellung und Entlassung von Landesposaunenwarten sowie Wahl
                  des Vorstands zu Beginn der Wahlperiode.
                </p>
              </div>

              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <BanknoteIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                  Finanzverwaltung
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Jährliche Verabschiedung des Haushaltsplans und Kontrolle über
                  die sachgemäße Verwaltung der Finanzen.
                </p>
              </div>

              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <CheckIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                  Beschlusskontrolle
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Überwachung der Ausführung gefasster Beschlüsse und Sicherung
                  der satzungsgemäßen Arbeit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-12 text-white md:py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Fragen zum Posaunenrat?
            </h2>
            <p className="mb-8 text-lg opacity-95">
              Bei Fragen zur Arbeit des Posaunenrats wenden Sie sich gerne an
              unseren Vorstand.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/ueber-uns/vorstand"
                className="text-primary inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-semibold transition-colors hover:bg-gray-100"
              >
                Zum Vorstand
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/kontakt"
                className="hover:text-primary inline-flex items-center justify-center rounded-lg border-2 border-white px-6 py-3 font-semibold text-white transition-colors hover:bg-white"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
