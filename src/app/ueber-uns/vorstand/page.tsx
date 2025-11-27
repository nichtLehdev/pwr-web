import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/server";
import PageHeader from "@/app/_components/general/page-header";

export default async function VorstandPage() {
  const vorstandMembers = await api.organization.getVorstand();

  return (
    <div>
      <PageHeader title="Vorstand" color="district-1" />

      {/* Hero Section */}
      <section className="bg-district-1 py-12 text-white md:py-16 lg:py-20">
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
            <span>Vorstand</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Der Vorstand des Posaunenwerks
            </h1>
            <p className="mb-6 text-lg leading-relaxed opacity-95 md:text-xl">
              Der Vorstand führt im Auftrag des Landesposaunenrates die
              laufenden Geschäfte des Posaunenwerkes. Dazu führt er die
              Beschlüsse der Vertreterversammlung und des Landesposaunenrates
              aus und erstattet ihm Bericht.
            </p>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Er kann unaufschiebbare Entscheidungen treffen, wenn dies
              notwendig ist. Der Landesobmann vertritt das Posaunenwerk nach
              außen und innen. Genau wie die Mitglieder der Vertreterversammlung
              und des Landesposaunenrates arbeitet der Vorstand ehrenamtlich.
            </p>
          </div>
        </div>
      </section>

      {/* Vorstandsmitglieder */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Die Vorstandsmitglieder
          </h2>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {vorstandMembers.map((member, index) => (
              <div key={index}>
                {member.user && (
                  <article className="dark:bg-dark-surface dark:shadow-dark-border flex flex-col overflow-hidden rounded-lg bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl">
                    <div className={`h-64 ${member.color} relative`}>
                      <Image
                        src={
                          member.user.profileImage?.url ||
                          "/images/placeholder-profile.png"
                        }
                        alt={
                          member.user.profileImage?.alt ||
                          member.user.displayName ||
                          "Vorstandsmitglied"
                        }
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-dark mb-1 text-2xl font-bold">
                        {member.user.displayName}
                      </h3>
                      <p className="text-primary mb-3 text-sm font-semibold">
                        {member.position}
                      </p>
                      {/* Kontakt Info */}
                      <div className="mt-auto flex flex-col flex-wrap gap-x-4 gap-y-1">
                        <Link
                          href={`mailto:${member.user.email}`}
                          className="hover:text-primary flex items-center text-sm text-gray-700 transition-colors dark:text-gray-300"
                        >
                          <svg
                            className="mr-2 h-4 w-4 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          E-Mail senden
                        </Link>
                        {(member.user.phone || member.phone) && (
                          <Link
                            href={`tel:${(
                              (member.user?.phone || member.phone) ??
                              ""
                            ).replace(/[^0-9+]/g, "")}`}
                            className="hover:text-primary flex items-center text-sm text-gray-700 transition-colors dark:text-gray-300"
                          >
                            <svg
                              className="mr-2 h-4 w-4 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            {member.user.phone || member.phone}
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                )}
                {!member.user && (
                  <article
                    key={index}
                    className="dark:bg-dark-surface dark:shadow-dark-border flex flex-col overflow-hidden rounded-lg bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl"
                  >
                    <div className={`h-64 ${member.color} relative`}>
                      <Image
                        src={
                          member.image?.url || "/images/placeholder-profile.png"
                        }
                        alt={
                          member.image?.alt ||
                          member.name ||
                          "Vorstandsmitglied"
                        }
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-dark dark:text-dark-text mb-1 text-2xl font-bold">
                        {member.name}
                      </h3>
                      <p className="text-primary mb-3 text-sm font-semibold">
                        {member.position}
                      </p>
                      {/* Kontakt Info */}
                      <div className="mt-auto flex flex-col flex-wrap gap-x-4 gap-y-1">
                        <Link
                          href={`mailto:${member.email}`}
                          className="hover:text-primary flex items-center text-sm text-gray-700 transition-colors dark:text-gray-300"
                        >
                          <svg
                            className="mr-2 h-4 w-4 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          E-Mail senden
                        </Link>
                        {member.phone && (
                          <Link
                            href={`tel:${member.phone.replace(/[^0-9+]/g, "")}`}
                            className="hover:text-primary flex items-center text-sm text-gray-700 transition-colors dark:text-gray-300"
                          >
                            <svg
                              className="mr-2 h-4 w-4 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            {member.phone}
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                )}
              </div>
            ))}
          </div>

          <div className="bg-primary/10 dark:bg-primary/20 mx-auto mt-12 max-w-3xl rounded-lg p-6">
            <div className="flex items-start gap-4">
              <svg
                className="text-primary mt-1 h-6 w-6 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-dark dark:text-dark-text mb-2 font-bold">
                  Kontakt zum Vorstand
                </h3>
                <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                  Bei Fragen oder Anliegen an den Vorstand wenden Sie sich gerne
                  per E-Mail an{" "}
                  <a
                    href="mailto:info@posaunenwerk-rheinland.de"
                    className="text-primary hover:text-primary-dark font-semibold"
                  >
                    info@posaunenwerk-rheinland.de
                  </a>{" "}
                  oder telefonisch an unsere{" "}
                  <Link
                    href="/kontakt"
                    className="text-primary hover:text-primary-dark font-semibold"
                  >
                    Geschäftsstelle
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Aufgaben des Vorstands */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Aufgaben des Vorstands
          </h2>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
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
                Geschäftsführung
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Führt die laufenden Geschäfte des Posaunenwerkes im Auftrag des
                Landesposaunenrates.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-1 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                Beschlussumsetzung
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Setzt die Beschlüsse der Vertreterversammlung und des
                Posaunenrates um und berichtet darüber.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-2 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                Eilentscheidungen
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Trifft unaufschiebbare Entscheidungen, wenn dies notwendig ist,
                bis zur nächsten Sitzung.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-3 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                Vertretung nach außen
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Der Landesobmann vertritt das Posaunenwerk nach außen und innen
                gegenüber allen Institutionen.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-5 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                Berichterstattung
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Erstattet regelmäßig Bericht an den Posaunenrat über die Arbeit
                und Entwicklung des Posaunenwerks.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-foerderverein mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                Ehrenamtliche Arbeit
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Alle Vorstandsmitglieder arbeiten ehrenamtlich und engagieren
                sich aus Überzeugung für die Posaunenchorarbeit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Organisationsstruktur Info */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Organisationsstruktur
            </h2>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <span className="text-sm font-bold text-white">1</span>
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                      Vertreterversammlung
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Oberstes Organ des Posaunenwerkes. Kommt mindestens einmal
                      jährlich zusammen, beschließt über die Satzung und wählt
                      die Sachverständigen in den Posaunenrat.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-district-1 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <span className="text-sm font-bold text-white">2</span>
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                      Landesposaunenrat
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Leitet das Posaunenwerk und trifft Entscheidungen über
                      Grundsätze und Ziele. Berät den Vorstand und kontrolliert
                      die Ausführung der Beschlüsse.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-district-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <span className="text-sm font-bold text-white">3</span>
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                      Vorstand
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Führt die laufenden Geschäfte des Posaunenwerkes und setzt
                      die Beschlüsse um. Der Landesobmann vertritt das
                      Posaunenwerk nach außen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-district-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                    <span className="text-sm font-bold text-white">4</span>
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                      Posaunenwarte
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Leiten das Posaunenwerk in musikalischer Hinsicht mit
                      Schwerpunkt auf Weiterbildung der Bläser und
                      Posaunenchorleiter.
                    </p>
                  </div>
                </div>
              </div>

              <div className="dark:border-dark-border mt-8 border-t border-gray-200 pt-8">
                <div className="flex flex-col justify-center gap-4 sm:flex-row">
                  <Link
                    href="/ueber-uns/posaunenrat"
                    className="bg-primary hover:bg-primary-dark inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white transition-colors"
                  >
                    Zum Posaunenrat
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
                    href="/ueber-uns/struktur"
                    className="border-primary text-primary hover:bg-primary inline-flex items-center justify-center rounded-lg border-2 bg-transparent px-6 py-3 font-semibold transition-colors hover:text-white"
                  >
                    Struktur & Geschichte
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary dark:bg-primary-dark py-12 text-white md:py-16 lg:py-20">
        <div className="container text-center">
          <h2 className="mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
            Interesse an einer Mitarbeit?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg md:text-xl">
            Viele Funktionen im Posaunenwerk werden ehrenamtlich ausgefüllt.
            Wenn Sie Interesse haben, sich einzubringen, freuen wir uns über
            Ihre Kontaktaufnahme!
          </p>
          <Link
            href="/kontakt"
            className="text-primary inline-block rounded-lg bg-white px-8 py-3 font-semibold transition-colors hover:bg-gray-100"
          >
            Kontakt aufnehmen
          </Link>
        </div>
      </section>
    </div>
  );
}
