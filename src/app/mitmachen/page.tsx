import Link from "next/link";
import PageHeader from "../_components/general/page-header";
import SectionHeader from "../_components/section-header";
import ParticipationCard from "../_components/general/participation-card";

export default function MitmachenPage() {
  const participationOptions: {
    id: string;
    title: string;
    description: string;
    icon: "map" | "education" | "users" | "heart" | "gift" | "shield";
    href: string;
    color: string;
  }[] = [
    {
      id: "chor-finden",
      title: "Chor finden",
      description:
        "Finde einen Posaunenchor in deiner Nähe und werde Teil einer musikalischen Gemeinschaft.",
      icon: "map",
      href: "/mitmachen/chor-finden",
      color: "primary",
    },
    {
      id: "ausbildung",
      title: "Aus- und Weiterbildung",
      description:
        "Von Anfängerkursen bis zu Fortbildungen – entdecke unsere vielfältigen Bildungsangebote.",
      icon: "education",
      href: "/mitmachen/bildung",
      color: "district-2",
    },
    {
      id: "jungblaeser",
      title: "Jungbläserarbeit",
      description:
        "Musik von Anfang an – Angebote für Kinder und Jugendliche im Posaunenchor.",
      icon: "users",
      href: "/mitmachen/jungblaeser",
      color: "district-3",
    },
    {
      id: "ehrenamt",
      title: "Ehrenamtlich engagieren",
      description:
        "Bringe deine Fähigkeiten ein und gestalte die Zukunft des Posaunenwerks aktiv mit.",
      icon: "heart",
      href: "/mitmachen/ehrenamt",
      color: "district-5",
    },
    {
      id: "foerdern",
      title: "Fördern & Spenden",
      description:
        "Unterstütze unsere Arbeit durch eine Mitgliedschaft im Förderverein oder eine Spende.",
      icon: "gift",
      href: "/foerderverein",
      color: "foerderverein",
    },
  ];

  return (
    <div>
      <PageHeader title="Mitmachen im Posaunenwerk" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary dark:bg-primary-dark py-16 text-white md:py-24">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <span>Mitmachen</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Mitmachen im Posaunenwerk
            </h1>
            <p className="mb-8 text-lg leading-relaxed md:text-xl">
              Ob als Bläserin oder Bläser, ehrenamtlich Engagierte oder
              Fördernde – es gibt viele Wege, Teil des Posaunenwerks Rheinland
              zu werden. Entdecke die Möglichkeiten, die zu dir passen!
            </p>
          </div>
        </div>
      </section>

      {/* Einstiegsmöglichkeiten */}
      <section className="bg-background dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <SectionHeader
            title="Deine Einstiegsmöglichkeiten"
            linkText=""
            linkHref="#"
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {participationOptions.map((option) => (
              <ParticipationCard
                key={option.id}
                title={option.title}
                description={option.description}
                icon={option.icon}
                href={option.href}
                color={option.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Förderverein CTA Banner */}
      <section className="bg-foerderverein/5 dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <div className="bg-foerderverein dark:bg-foerderverein-dark relative overflow-hidden rounded-2xl p-8 text-white shadow-2xl md:p-12">
              {/* Dekorative Elemente - subtiler */}
              <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5"></div>
              <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/5"></div>

              <div className="relative z-10">
                <div className="mb-6 flex items-start gap-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white">
                    <svg
                      className="text-foerderverein h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
                      Förderverein – Bläser für Bläser
                    </h2>
                    <p className="mb-6 text-lg leading-relaxed opacity-95 md:text-xl">
                      Unterstützen Sie die Arbeit des Posaunenwerks nachhaltig!
                      Werden Sie Mitglied im Förderverein und profitieren Sie
                      von exklusiven Vorteilen.
                    </p>

                    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="flex h-full items-center rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                        <p className="text-xl font-bold">
                          Nur 36 € / Jahr
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                        <p className="mb-1 text-lg font-bold">
                          Geschenk-CD 2025
                        </p>
                        <p className="text-sm opacity-90">für Neumitglieder</p>
                      </div>
                      <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                        <p className="mb-1 text-lg font-bold">
                          Direkte Förderung
                        </p>
                        <p className="text-sm opacity-90">
                          Lehrgänge & Projekte
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row">
                      <Link
                        href="/foerderverein"
                        className="text-foerderverein inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 font-bold shadow-lg transition-colors hover:bg-gray-100"
                      >
                        Mehr zum Förderverein
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
                      <a
                        href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                        className="inline-flex items-center justify-center rounded-lg border-2 border-white bg-transparent px-8 py-4 font-semibold text-white transition-colors hover:bg-white/10"
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
                        Mitglied werden
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Warum Posaunenchor? */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Warum Posaunenchor?
            </h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="dark:bg-dark-surface rounded-lg bg-white p-6 shadow-md">
                <div className="bg-primary dark:bg-primary-light mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Gemeinsam Musik machen
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Erlebe die Freude am gemeinsamen Musizieren in einer starken
                  Gemeinschaft von über 11.000 Bläserinnen und Bläsern.
                </p>
              </div>

              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-primary dark:bg-primary-light mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Glauben leben
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Verbinde deine Musikalität mit deinem Glauben und gestalte
                  Gottesdienste und kirchliche Feste aktiv mit.
                </p>
              </div>

              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-primary dark:bg-primary-light mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Persönlich wachsen
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Entwickle deine musikalischen Fähigkeiten durch regelmäßiges
                  Üben, Workshops und die Begleitung erfahrener Chorleiter.
                </p>
              </div>

              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-primary dark:bg-primary-light mb-4 flex h-12 w-12 items-center justify-center rounded-full">
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
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Teil einer Bewegung
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Werde Teil einer über 150 Jahre alten Tradition mit mehr als
                  330 Posaunenchören im Rheinland.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mitgliedschaft im Posaunenwerk */}
      <section
        className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20"
        id="mitgliedschaft"
      >
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <div className="border-primary dark:bg-dark-surface rounded-lg border-t-4 bg-white p-8 shadow-xl md:p-12">
              <div className="mb-6 flex items-start gap-4">
                <div className="bg-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
                  <svg
                    className="h-7 w-7 text-white"
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
                <div>
                  <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
                    Mitgliedschaft im Posaunenwerk
                  </h2>
                  <p className="mb-6 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                    Über Ihr Interesse an einer Mitgliedschaft im Posaunenwerk
                    Rheinland freuen wir uns sehr.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Einzelmitgliedschaft */}
                <div className="bg-background-secondary dark:bg-dark-background-secondary rounded-lg p-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                    Einzelmitgliedschaft
                  </h3>
                  <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-400">
                    Da das Posaunenwerk im Kern ein Verbund von Posaunenchören
                    ist, ist eine Einzelmitgliedschaft nur in besonderen und eng
                    begrenzten Ausnahmefällen möglich. Wir freuen uns, dass Sie
                    uns verbunden sein möchten, und empfehlen hierzu die
                    Mitgliedschaft in unserem{" "}
                    <a
                      href="/foerderverein"
                      className="text-primary hover:text-primary-dark font-semibold"
                    >
                      Förderverein
                    </a>
                    .
                  </p>
                  <p className="leading-relaxed text-gray-600">
                    Über eine solche Mitgliedschaft erhalten Sie auch unser
                    Blechblatt sowie alle Informationen und Einladungen zu
                    unseren Veranstaltungen.
                  </p>
                </div>

                {/* Chormitgliedschaft */}
                <div className="bg-background-secondary dark:bg-dark-background-secondary rounded-lg p-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                    Mitgliedschaft für Posaunenchöre
                  </h3>
                  <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-400">
                    Die Mitgliedschaft eines Posaunenchores im Posaunenwerk der
                    Ev. Kirche im Rheinland e.V. kann schriftlich bei der
                    Geschäftsstelle beantragt werden.
                  </p>

                  <div className="dark:bg-dark-surface mb-4 rounded-lg bg-white p-4">
                    <h4 className="text-dark dark:text-dark-text mb-3 font-bold">
                      Jährliche Mitgliedsbeiträge:
                    </h4>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                      <li className="flex items-center gap-2">
                        <span className="bg-primary h-2 w-2 shrink-0 rounded-full"></span>
                        <span>
                          <strong>Grundbeitrag:</strong> 45 €
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="bg-primary h-2 w-2 shrink-0 rounded-full"></span>
                        <span>
                          <strong>Je Chormitglied mit Einkommen:</strong> 16 €
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="bg-primary h-2 w-2 shrink-0 rounded-full"></span>
                        <span>
                          <strong>Je Chormitglied ohne Einkommen:</strong> 8 €
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a
                      href="/downloads/satzung-posaunenwerk.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary hover:bg-primary-dark inline-flex items-center justify-center rounded-lg px-6 py-3 font-semibold text-white transition-colors"
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
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Satzung herunterladen
                    </a>
                    <a
                      href="/downloads/aufnahmeantrag-choere.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-primary text-primary hover:bg-primary inline-flex items-center justify-center rounded-lg border-2 bg-white px-6 py-3 font-semibold transition-colors hover:text-white"
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Aufnahmeantrag herunterladen
                    </a>
                  </div>
                </div>

                {/* Ehrungen */}
                <div className="bg-primary-light/10 dark:bg-primary-light/20 border-primary rounded-lg border-l-4 p-6">
                  <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                    Ehrungen
                  </h3>
                  <p className="mb-3 text-gray-600 dark:text-gray-400">
                    Informationen zu Ehrungen finden sich in der{" "}
                    <a
                      href="/downloads/ehrenordnung.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark font-semibold"
                    >
                      Ehrenordnung des Posaunenwerks
                    </a>
                    .
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Fragen zu Ehrungen oder zur Mitgliedschaft im Allgemeinen
                    beantwortet gerne die{" "}
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
        </div>
      </section>

      {/* Instrumentenversicherung */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <div className="border-district-6 dark:bg-dark-surface dark:shadow-dark-border rounded-lg border-t-4 bg-white p-6 shadow-xl md:p-12">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                <div className="bg-district-6 flex h-12 w-12 shrink-0 items-center justify-center rounded-full md:h-14 md:w-14">
                  <svg
                    className="h-6 w-6 text-white md:h-7 md:w-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-dark dark:text-dark-text mb-3 text-xl font-bold wrap-break-word md:mb-4 md:text-2xl lg:text-3xl xl:text-4xl">
                    Instrumenten&shy;versicherung
                  </h2>
                  <p className="text-base leading-relaxed text-gray-600 md:text-lg dark:text-gray-400">
                    Schützen Sie Ihre wertvollen Instrumente optimal mit unserer
                    günstigen Rahmen&shy;versicherung.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Rahmenvertrag */}
                <div className="bg-background-secondary dark:bg-dark-background-secondary rounded-lg p-4 md:p-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-bold md:text-xl">
                    Unser Rahmen&shy;vertrag
                  </h3>
                  <p className="mb-3 text-sm leading-relaxed text-gray-600 md:mb-4 md:text-base dark:text-gray-400">
                    Das Posaunenwerk der Ev. Kirche im Rheinland e.V. hat einen
                    Rahmenvertrag über eine preisgünstige
                    Musik&shy;instrumenten&shy;versicherung mit der{" "}
                    <strong className="whitespace-nowrap">
                      Sparkassen-Versicherung AG
                    </strong>{" "}
                    in 70365 Stuttgart abgeschlossen, vermittelt durch{" "}
                    <strong>ECCLESIA</strong> - Versicherungs&shy;dienst GmbH in
                    32754 Detmold.
                  </p>
                  <p className="mb-3 text-sm leading-relaxed text-gray-600 md:mb-4 md:text-base dark:text-gray-400">
                    Innerhalb dieses Rahmens können unsere Mitglieds&shy;chöre
                    Versicherungen abschließen, die durch uns vermittelt und
                    deren Versicherungs&shy;beiträge durch uns eingezogen
                    werden.
                  </p>

                  <div className="bg-primary-light/10 dark:bg-primary-light/20 border-primary rounded-lg border-l-4 p-3 md:p-4">
                    <p className="text-sm leading-relaxed text-gray-700 md:text-base dark:text-gray-300">
                      <strong>Hinweis:</strong> Die Versicherung verlängert sich
                      automatisch zu den gleichen Bedingungen um ein weiteres
                      Jahr, wenn uns bis zum{" "}
                      <strong className="whitespace-nowrap">
                        30. November
                      </strong>{" "}
                      keine Änderungs&shy;meldung bzw. Kündigung zugeht.
                    </p>
                  </div>
                </div>

                {/* Im Schadenfall */}
                <div className="bg-district-6/10 dark:bg-district-6/20 rounded-lg p-4 md:p-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 flex items-start gap-2 text-lg font-bold md:text-xl">
                    <svg
                      className="text-district-6 mt-0.5 h-5 w-5 shrink-0 md:h-6 md:w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>Im Schadensfall</span>
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-gray-600 md:text-base dark:text-gray-400">
                    Ansprechpartner beim Posaunenwerk für die Meldung und
                    Abwicklung eines unter den Versicherungs&shy;schutz
                    fallenden Schadens ist die{" "}
                    <Link
                      href="/kontakt"
                      className="text-primary hover:text-primary-dark font-semibold whitespace-nowrap"
                    >
                      Geschäftsstelle
                    </Link>
                    .
                  </p>

                  <div className="dark:bg-dark-surface rounded-lg bg-white p-3 md:p-4">
                    <h4 className="text-dark dark:text-dark-text mb-3 text-base font-bold md:text-lg">
                      Benötigte Unterlagen:
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600 md:text-base dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="bg-district-6 mt-2 h-2 w-2 shrink-0 rounded-full"></span>
                        <span>
                          Schriftliche Schilderung des Schadens&shy;hergangs
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-district-6 mt-2 h-2 w-2 shrink-0 rounded-full"></span>
                        <span>
                          Genaue Bezeichnung des geschädigten Instrumentes
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-district-6 mt-2 h-2 w-2 shrink-0 rounded-full"></span>
                        <span>
                          Wenn möglich: Angebot einer Fachfirma zur
                          Schadens&shy;höhe
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4">
                    <Link
                      href="/kontakt"
                      className="bg-district-6 inline-flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:w-auto md:text-base"
                    >
                      <svg
                        className="mr-2 h-5 w-5 shrink-0"
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
                      Schaden melden
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kontakt & Beratung */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl lg:text-4xl">
              Noch Fragen?
            </h2>
            <p className="mb-8 text-lg text-gray-600 dark:text-gray-400">
              Wir beraten dich gerne persönlich zu allen Möglichkeiten des
              Mitmachens. Nimm einfach Kontakt mit uns auf!
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/kontakt"
                className="bg-primary hover:bg-primary-dark rounded-lg px-8 py-3 font-semibold text-white shadow-lg transition-colors"
              >
                Kontakt aufnehmen
              </Link>
              <Link
                href="/ueber-uns"
                className="border-primary text-primary hover:bg-primary rounded-lg border-2 bg-transparent px-8 py-3 font-semibold transition-colors hover:text-white"
              >
                Mehr über uns
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-dark dark:bg-dark-background-secondary py-12 text-white md:py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Bleib auf dem Laufenden
            </h2>
            <p className="mb-6 text-lg">
              Abonniere unseren Newsletter und verpasse keine Neuigkeiten,
              Termine und Angebote.
            </p>
            <Link
              href="/newsletter"
              className="bg-primary hover:bg-primary-light inline-block rounded-lg px-8 py-3 font-semibold text-white transition-colors"
            >
              Newsletter abonnieren
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
