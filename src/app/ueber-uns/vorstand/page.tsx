import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/server";
import PublicPage from "@/app/_components/general/public-page";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CircleUserRoundIcon,
  ClockIcon,
  HeartIcon,
  MailIcon,
  SquareArrowOutUpRightIcon,
  UsersIcon,
} from "lucide-react";
import { CheckIcon, PhoneIcon } from "lucide-react";

export default async function VorstandPage() {
  const vorstandMembers = await api.organization.getVorstand();

  return (
    <PublicPage
      title="Vorstand"
      heroTitle="Der Vorstand des Posaunenwerks"
      color="district-1"
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
                          "/images/profile-placeholder.jpg"
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
                          <MailIcon className="mr-2 h-4 w-4 shrink-0" />
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
                            <PhoneIcon className="mr-2 h-4 w-4 shrink-0" />
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
                          member.image?.url || "/images/profile-placeholder.jpg"
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
                          <MailIcon className="mr-2 h-4 w-4 shrink-0" />
                          E-Mail senden
                        </Link>
                        {member.phone && (
                          <Link
                            href={`tel:${member.phone.replace(/[^0-9+]/g, "")}`}
                            className="hover:text-primary flex items-center text-sm text-gray-700 transition-colors dark:text-gray-300"
                          >
                            <PhoneIcon className="mr-2 h-4 w-4 shrink-0" />
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
              <CircleUserRoundIcon className="text-primary mt-1 h-6 w-6 shrink-0" />
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
                <BookOpenIcon className="h-6 w-6 text-white" />
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
                <CheckIcon className="h-6 w-6 text-white" />
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
                <ClockIcon className="h-6 w-6 text-white" />
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
                <UsersIcon className="h-6 w-6 text-white" />
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
                <SquareArrowOutUpRightIcon className="h-6 w-6 text-white" />
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
                <HeartIcon className="h-6 w-6 text-white" />
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
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
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
    </PublicPage>
  );
}
