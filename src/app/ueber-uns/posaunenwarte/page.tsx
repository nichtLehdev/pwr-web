import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/server";
import PageHeader from "@/app/_components/general/page-header";

export default async function PosaunenwartePage() {
  const posaunenwarte = await api.organization.getPosaunenwarte();

  // posaunenwarte color mapping. LPW is always primary color, RPW have one (first) of the district colors they are assigned to
  const pwWithColors = posaunenwarte.map((pw) => {
    if (pw.role === "LPW") {
      return { ...pw, color: "bg-primary" };
    } else {
      // Get first district color or default to district-1
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
      <section className="bg-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Landesposaunenwart
          </h2>

          {posaunenwarte
            .filter((pw) => pw.role === "LPW")
            .map((pw) => (
              <div
                key={pw.name}
                className="mx-auto max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl"
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
                        {pw.displayRole || "Landesposaunenwart"}
                      </span>
                    </div>

                    <h3 className="text-dark mb-4 text-3xl font-bold">
                      {pw.name}
                    </h3>

                    <div className="mb-6">
                      <span className="bg-primary/10 text-primary inline-block rounded-full px-3 py-1 text-sm font-semibold">
                        Alle Bezirke
                      </span>
                    </div>

                    <p className="mb-6 leading-relaxed text-gray-600">
                      {pw.bio}
                    </p>

                    {/* Kontakt */}
                    <div className="space-y-2">
                      {pw.email && (
                        <a
                          href={`mailto:${pw.email}`}
                          className="text-primary hover:text-primary-dark flex items-center font-semibold"
                        >
                          <svg
                            className="mr-2 h-5 w-5"
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
                        </a>
                      )}
                      {pw.phone && (
                        <a
                          href={`tel:${pw.phone.replace(/\s/g, "")}`}
                          className="hover:text-primary flex items-center text-gray-600"
                        >
                          <svg
                            className="mr-2 h-5 w-5"
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
      <section className="bg-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Regionalposaunenwarte
          </h2>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
            {pwWithColors
              .filter((pw) => pw.role === "RPW")
              .map((pw) => (
                <article
                  key={pw.name}
                  className="overflow-hidden rounded-lg bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl"
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
                        {pw.displayRole || "Regionalposaunenwart"}
                      </span>
                    </div>

                    <h3 className="text-dark mb-3 text-2xl font-bold">
                      {pw.name}
                    </h3>

                    {/* Bezirke */}
                    <div className="mb-4">
                      <p className="mb-2 text-sm font-semibold text-gray-700">
                        Betreute Bezirke:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pw.bezirke.map((bezirk, idx) => (
                          <span
                            key={idx}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${pw.color}/20`}
                            style={{
                              color: pw.color.replace("bg-", "var(--color-"),
                            }}
                          >
                            {`Bezirk ${bezirk.number} (${bezirk.shortName})`}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="mb-6 line-clamp-16 leading-relaxed text-gray-600">
                      {pw.bio}
                    </p>

                    {/* Kontakt */}
                    <div className="space-y-2">
                      {pw.email && (
                        <a
                          href={`mailto:${pw.email}`}
                          className="text-primary hover:text-primary-dark flex items-center text-sm font-semibold"
                        >
                          <svg
                            className="mr-2 h-4 w-4"
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
                        </a>
                      )}
                      {pw.phone && (
                        <a
                          href={`tel:${pw.phone.replace(/\s/g, "")}`}
                          className="hover:text-primary flex items-center text-sm text-gray-600"
                        >
                          <svg
                            className="mr-2 h-4 w-4"
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
      <section className="bg-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Aufgaben der Posaunenwarte
          </h2>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-lg">
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-dark mb-3 text-lg font-bold">
                Weiterbildung
              </h3>
              <p className="text-gray-600">
                Weiterbildung der Bläser und Posaunenchorleiter durch Lehrgänge,
                Workshops und persönliche Betreuung.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-lg">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-dark mb-3 text-lg font-bold">Chorbesuche</h3>
              <p className="text-gray-600">
                Regelmäßige Besuche der Mitgliedschöre zur musikalischen
                Unterstützung und Beratung vor Ort.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-lg">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-dark mb-3 text-lg font-bold">
                Lehrgänge & Freizeiten
              </h3>
              <p className="text-gray-600">
                Organisation und Durchführung von Lehrgängen, Workshops und
                musikalischen Freizeiten.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-lg">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-dark mb-3 text-lg font-bold">Beratung</h3>
              <p className="text-gray-600">
                Beratung zu musikalischen, organisatorischen und technischen
                Fragen der Posaunenchorarbeit.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-lg">
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
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <h3 className="text-dark mb-3 text-lg font-bold">
                Musikalische Leitung
              </h3>
              <p className="text-gray-600">
                Leitung des Posaunenwerks in allen musikalischen Belangen und
                Pflege des musikalischen Standards.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-lg">
              <div className="bg-district-6 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="text-dark mb-3 text-lg font-bold">
                Nachwuchsförderung
              </h3>
              <p className="text-gray-600">
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
