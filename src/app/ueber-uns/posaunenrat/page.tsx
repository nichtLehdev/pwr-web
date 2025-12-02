import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/server";
import PageHeader from "@/app/_components/general/page-header";
import PeopleCard from "@/app/_components/general/people-card";

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
      ...bezirk.obleute.map((obleute) => ({
        ...obleute,
        districtNumber: bezirk.number,
        districtName: bezirk.shortName,
      })),
    ];
  });

  // Filtere die Sachverständigen
  const sachverstaendige = posaunenratMembers.filter(
    (m) => m.role === "SACHVERSTAENDIGE" || m.role === "SACHVERSTAENDIGER",
  );

  // Landeskirchenmusikdirektor
  const lkmd = posaunenratMembers.find(
    (m) => m.role === "LANDESKIRCHENMUSIKDIREKTOR",
  );

  return (
    <div>
      <PageHeader title="Landesposaunenrat" color="district-2" />

      {/* Hero Section */}
      <section className="bg-district-2 py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/ueber-uns"
              className="transition-colors hover:text-white"
            >
              Über Uns
            </Link>
            <span>/</span>
            <span>Posaunenrat</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Landesposaunenrat
            </h1>
            <div className="space-y-4 text-lg leading-relaxed opacity-95">
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
          </div>
        </div>
      </section>

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
                      subtitle={`${member.obleuteRole} für Bezirk ${member.districtNumber} (${member.districtName})`}
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
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
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
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
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
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
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
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
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
                <svg
                  className="ml-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
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
    </div>
  );
}
