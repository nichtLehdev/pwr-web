import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/server";
import PageHeader from "@/app/_components/general/page-header";
import {
  BookIcon,
  MailIcon,
  Music2Icon,
  MusicIcon,
  PartyPopperIcon,
  PhoneIcon,
  SchoolIcon,
} from "lucide-react";

export default async function PosaunenwartePage() {
  const posaunenwarte = await api.organization.getPosaunenwarte();

  const pwWithColors = posaunenwarte.map((pw) => {
    if (pw.role === "LPW") {
      return { ...pw, color: "bg-primary" };
    } else {
      const firstDistrict = pw.bezirke?.[0]?.number ?? 1;
      return { ...pw, color: `bg-district-${firstDistrict}` };
    }
  });

  return (
    <div>
      <PageHeader title="Posaunenwarte" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary py-12 text-white md:py-16 lg:py-20">
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
            <span>Posaunenwarte</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Unsere Posaunenwarte
            </h1>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Die Posaunenwarte leiten das Posaunenwerk in musikalischer
              Hinsicht. Dabei liegt der Schwerpunkt ihrer Arbeit in der
              Weiterbildung der Bläser und Posaunenchorleiter. Dazu besuchen sie
              die Mitgliedschöre und bieten Lehrgänge und Freizeiten an. Das
              Posaunenwerk beschäftigt einen hauptamtlichen Landesposaunenwart
              und fünf nebenamtlich tätige Regionalposaunenwarte.
            </p>
          </div>
        </div>
      </section>

      {/* Landesposaunenwart */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Landesposaunenwart
          </h2>

          {posaunenwarte
            .filter((pw) => pw.role === "LPW")
            .map((pw) => (
              <div
                key={pw.id}
                className="dark:bg-dark-surface dark:shadow-dark-border mx-auto max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl"
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Bild */}
                  <div className="lg:w-2/5">
                    <Image
                      src={pw.profileImage?.url || "/default-profile.png"}
                      alt={pw.profileImage?.alt || pw.name || "Posaunenwart"}
                      width={600}
                      height={600}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-8 lg:w-3/5">
                    <div className="mb-4">
                      <span
                        className={`bg-primary inline-block rounded-full px-4 py-2 text-sm font-semibold text-white`}
                      >
                        {pw.districtRoleName || "Landesposaunenwart"}
                      </span>
                    </div>

                    <h3 className="text-dark dark:text-dark-text mb-4 text-3xl font-bold">
                      {pw.name}
                    </h3>

                    <div className="mb-6">
                      <span className="bg-primary/10 dark:bg-primary/20 text-primary inline-block rounded-full px-3 py-1 text-sm font-semibold">
                        Alle Bezirke
                      </span>
                    </div>

                    <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-400">
                      {pw.bio}
                    </p>

                    {/* Kontakt */}
                    <div className="space-y-2">
                      {pw.email && (
                        <a
                          href={`mailto:${pw.email}`}
                          className="text-primary hover:text-primary-dark flex items-center font-semibold"
                        >
                          <MailIcon className="mr-2 h-5 w-5" />
                          E-Mail senden
                        </a>
                      )}
                      {pw.phone && (
                        <a
                          href={`tel:${pw.phone.replace(/\s/g, "")}`}
                          className="hover:text-primary flex items-center text-gray-600 dark:text-gray-400"
                        >
                          <PhoneIcon className="mr-2 h-5 w-5" />
                          {pw.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Regionalposaunenwarte */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Regionalposaunenwarte
          </h2>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
            {pwWithColors
              .filter((pw) => pw.role === "RPW")
              .map((pw) => (
                <article
                  key={pw.id}
                  className="dark:bg-dark-surface dark:shadow-dark-border overflow-hidden rounded-lg bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl"
                >
                  {/* Bild */}
                  <div className={`${pw.color} relative h-64`}>
                    <Image
                      src={pw.profileImage?.url || "/default-profile.png"}
                      alt={pw.profileImage?.alt || pw.name || "Posaunenwart"}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="mb-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${pw.color}`}
                      >
                        {pw.districtRoleName || "Regionalposaunenwart"}
                      </span>
                    </div>

                    <h3 className="text-dark dark:text-dark-text mb-3 text-2xl font-bold">
                      {pw.name}
                    </h3>

                    {/* Bezirke */}
                    <div className="mb-4">
                      <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Betreute Bezirke:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pw.bezirke.map(
                          (
                            bezirk: {
                              id: string;
                              number: number;
                              name: string | null;
                            },
                            idx: number,
                          ) => (
                            <span
                              key={idx}
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${pw.color}/20`}
                              style={{
                                color: pw.color.replace("bg-", "var(--color-"),
                              }}
                            >
                              {`Bezirk ${bezirk.number}${bezirk.name ? ` (${bezirk.name})` : ""}`}
                            </span>
                          ),
                        )}
                      </div>
                    </div>

                    <p className="mb-6 line-clamp-16 leading-relaxed text-gray-600 dark:text-gray-400">
                      {pw.bio}
                    </p>

                    {/* Kontakt */}
                    <div className="space-y-2">
                      {pw.email && (
                        <a
                          href={`mailto:${pw.email}`}
                          className="text-primary hover:text-primary-dark flex items-center text-sm font-semibold"
                        >
                          <MailIcon className="mr-2 h-4 w-4" />
                          E-Mail senden
                        </a>
                      )}
                      {pw.phone && (
                        <a
                          href={`tel:${pw.phone.replace(/\s/g, "")}`}
                          className="hover:text-primary flex items-center text-sm text-gray-600 dark:text-gray-400"
                        >
                          <PhoneIcon className="mr-2 h-4 w-4" />
                          {pw.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      {/* Aufgaben */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Aufgaben der Posaunenwarte
          </h2>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <BookIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                Weiterbildung
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Weiterbildung der Bläser und Posaunenchorleiter durch Lehrgänge,
                Workshops und persönliche Betreuung.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-1 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <Music2Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                Chorbesuche
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Regelmäßige Besuche der Mitgliedschöre zur musikalischen
                Unterstützung und Beratung vor Ort.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-2 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <PartyPopperIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                Lehrgänge & Freizeiten
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Organisation und Durchführung von Lehrgängen, Workshops und
                musikalischen Freizeiten.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-3 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <BookIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                Beratung
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Beratung zu musikalischen, organisatorischen und technischen
                Fragen der Posaunenchorarbeit.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-5 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <MusicIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                Musikalische Leitung
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Leitung des Posaunenwerks in allen musikalischen Belangen und
                Pflege des musikalischen Standards.
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-6 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                <SchoolIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold">
                Nachwuchsförderung
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Besondere Förderung der Jungbläserarbeit und des musikalischen
                Nachwuchses in den Bezirken.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-12 text-white md:py-16 lg:py-20">
        <div className="container text-center">
          <h2 className="mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
            Fragen oder Anliegen?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg md:text-xl">
            Unsere Posaunenwarte stehen Ihnen gerne für Fragen rund um die
            Posaunenchorarbeit zur Verfügung!
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
