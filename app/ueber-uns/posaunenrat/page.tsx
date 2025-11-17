import PageHeader from "@/components/PageHeader";
import {
  posaunenratMembers,
  vorstandMembers,
  bezirke,
} from "@/lib/generalData";
import Link from "next/link";
import Image from "next/image";

export default function PosaunenratPage() {
  // Sammle alle Vorstandsmitglieder (aus anderen Quellen)

  // Sammle alle Bezirksobleute
  const bezirksobleuteMitglieder = bezirke.flatMap((bezirk) =>
    bezirk.obleute.map((obmann) => ({
      ...obmann,
      district: bezirk.shortName,
      role: obmann.title as "Bezirksobmann" | "Bezirksobfrau",
    }))
  );

  // Filtere die Sachverständigen
  const sachverstaendige = posaunenratMembers.filter(
    (m) => m.role === "Sachverständiger"
  );

  // Landeskirchenmusikdirektor
  const lkmd = posaunenratMembers.find(
    (m) => m.role === "Landeskirchenmusikdirektor"
  );

  return (
    <div>
      <PageHeader title="Landesposaunenrat" color="district-2" />

      {/* Hero Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-district-2 text-white">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
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
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-6">
              Zusammensetzung des Posaunenrats
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
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
                <h3 className="text-xl md:text-2xl font-bold text-dark mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-primary rounded-full"></div>
                  Vorstandsmitglieder
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {vorstandMembers.map((member, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        {member.image && (
                          <div className="shrink-0 w-12 h-12 relative rounded-full overflow-hidden bg-gray-200">
                            <Image
                              src={member.image}
                              alt={member.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-dark">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {member.position}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
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
                <h3 className="text-xl md:text-2xl font-bold text-dark mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-primary rounded-full"></div>
                  Bezirksobleute
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  {bezirksobleuteMitglieder.map((member, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        {member.image && (
                          <div className="shrink-0 w-12 h-12 relative rounded-full overflow-hidden bg-gray-200">
                            <Image
                              src={member.image}
                              alt={member.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-dark">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {member.district}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-gray-600">
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
                  <h3 className="text-xl md:text-2xl font-bold text-dark mb-6 flex items-center gap-3">
                    <div className="w-1 h-8 bg-primary rounded-full"></div>
                    Landeskirchenmusikdirektor
                  </h3>
                  <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
                    <div className="flex items-center gap-4 mb-4">
                      {lkmd.image && (
                        <div className="shrink-0 w-16 h-16 relative rounded-full overflow-hidden bg-gray-200">
                          <Image
                            src={lkmd.image}
                            alt={lkmd.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-lg text-dark">
                          {lkmd.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Landeskirchenmusikdirektor
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sachverständige */}
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-dark mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-primary rounded-full"></div>
                  Sachverständige
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {sachverstaendige.map((member, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100"
                    >
                      <p className="font-semibold text-dark text-center">
                        {member.name}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-6">
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
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8">
              Aufgaben und Verantwortung
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3 className="text-lg font-bold text-dark mb-3">
                  Strategische Führung
                </h3>
                <p className="text-gray-600">
                  Entscheidungen über Grundsätze und Ziele der Geschäftsführung
                  des Posaunenwerkes sowie Beratung des Vorstands.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3 className="text-lg font-bold text-dark mb-3">
                  Personalentscheidungen
                </h3>
                <p className="text-gray-600">
                  Anstellung und Entlassung von Landesposaunenwarten sowie Wahl
                  des Vorstands zu Beginn der Wahlperiode.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3 className="text-lg font-bold text-dark mb-3">
                  Finanzverwaltung
                </h3>
                <p className="text-gray-600">
                  Jährliche Verabschiedung des Haushaltsplans und Kontrolle über
                  die sachgemäße Verwaltung der Finanzen.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-white"
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
                <h3 className="text-lg font-bold text-dark mb-3">
                  Beschlusskontrolle
                </h3>
                <p className="text-gray-600">
                  Überwachung der Ausführung gefasster Beschlüsse und Sicherung
                  der satzungsgemäßen Arbeit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 bg-primary text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Fragen zum Posaunenrat?
            </h2>
            <p className="text-lg mb-8 opacity-95">
              Bei Fragen zur Arbeit des Posaunenrats wenden Sie sich gerne an
              unseren Vorstand.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/ueber-uns/vorstand"
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Zum Vorstand
                <svg
                  className="w-5 h-5 ml-2"
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
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-primary transition-colors"
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
