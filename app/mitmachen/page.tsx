import SectionHeader from "@/components/SectionHeader";
import ParticipationCard from "@/components/ParticipationCard";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

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
      <section className="bg-primary text-white py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Mitmachen im Posaunenwerk
            </h1>
            <p className="text-lg md:text-xl mb-8 leading-relaxed">
              Ob als Bläserin oder Bläser, ehrenamtlich Engagierte oder
              Fördernde – es gibt viele Wege, Teil des Posaunenwerks Rheinland
              zu werden. Entdecke die Möglichkeiten, die zu dir passen!
            </p>
          </div>
        </div>
      </section>

      {/* Einstiegsmöglichkeiten */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <SectionHeader
            title="Deine Einstiegsmöglichkeiten"
            linkText=""
            linkHref="#"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
      <section className="py-12 md:py-16 lg:py-20 bg-foerderverein/5">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="bg-foerderverein text-white rounded-2xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
              {/* Dekorative Elemente - subtiler */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative z-10">
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shrink-0">
                    <svg
                      className="w-8 h-8 text-foerderverein"
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
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                      Förderverein – Bläser für Bläser
                    </h2>
                    <p className="text-lg md:text-xl mb-6 leading-relaxed opacity-95">
                      Unterstützen Sie die Arbeit des Posaunenwerks nachhaltig!
                      Werden Sie Mitglied im Förderverein und profitieren Sie
                      von exklusiven Vorteilen.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <p className="font-bold text-lg mb-1">
                          Nur 36 € / Jahr
                        </p>
                        <p className="text-sm opacity-90">für Chöre</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <p className="font-bold text-lg mb-1">
                          Geschenk-CD 2025
                        </p>
                        <p className="text-sm opacity-90">für Neumitglieder</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <p className="font-bold text-lg mb-1">
                          Direkte Förderung
                        </p>
                        <p className="text-sm opacity-90">
                          Lehrgänge & Projekte
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link
                        href="/foerderverein"
                        className="inline-flex items-center justify-center px-8 py-4 bg-white text-foerderverein font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
                      >
                        Mehr zum Förderverein
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
                      <a
                        href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                        className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <svg
                          className="w-5 h-5 mr-2"
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
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8 text-center">
              Warum Posaunenchor?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
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
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark mb-3">
                  Gemeinsam Musik machen
                </h3>
                <p className="text-gray-600">
                  Erlebe die Freude am gemeinsamen Musizieren in einer starken
                  Gemeinschaft von über 11.000 Bläserinnen und Bläsern.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
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
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark mb-3">
                  Glauben leben
                </h3>
                <p className="text-gray-600">
                  Verbinde deine Musikalität mit deinem Glauben und gestalte
                  Gottesdienste und kirchliche Feste aktiv mit.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark mb-3">
                  Persönlich wachsen
                </h3>
                <p className="text-gray-600">
                  Entwickle deine musikalischen Fähigkeiten durch regelmäßiges
                  Üben, Workshops und die Begleitung erfahrener Chorleiter.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
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
                <h3 className="text-xl font-bold text-dark mb-3">
                  Teil einer Bewegung
                </h3>
                <p className="text-gray-600">
                  Werde Teil einer über 150 Jahre alten Tradition mit mehr als
                  330 Posaunenchören im Rheinland.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mitgliedschaft im Posaunenwerk */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg shadow-xl p-8 md:p-12 border-t-4 border-primary">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <svg
                    className="w-7 h-7 text-white"
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
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-4">
                    Mitgliedschaft im Posaunenwerk
                  </h2>
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    Über Ihr Interesse an einer Mitgliedschaft im Posaunenwerk
                    Rheinland freuen wir uns sehr.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Einzelmitgliedschaft */}
                <div className="bg-background-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-dark mb-3">
                    Einzelmitgliedschaft
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Da das Posaunenwerk im Kern ein Verbund von Posaunenchören
                    ist, ist eine Einzelmitgliedschaft nur in besonderen und eng
                    begrenzten Ausnahmefällen möglich. Wir freuen uns, dass Sie
                    uns verbunden sein möchten, und empfehlen hierzu die
                    Mitgliedschaft in unserem{" "}
                    <a
                      href="#foerderverein"
                      className="text-primary hover:text-primary-dark font-semibold"
                    >
                      Förderverein
                    </a>
                    .
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    Über eine solche Mitgliedschaft erhalten Sie auch unser
                    Blechblatt sowie alle Informationen und Einladungen zu
                    unseren Veranstaltungen.
                  </p>
                </div>

                {/* Chormitgliedschaft */}
                <div className="bg-background-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-dark mb-3">
                    Mitgliedschaft für Posaunenchöre
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Die Mitgliedschaft eines Posaunenchores im Posaunenwerk der
                    Ev. Kirche im Rheinland e.V. kann schriftlich bei der
                    Geschäftsstelle beantragt werden.
                  </p>

                  <div className="bg-white rounded-lg p-4 mb-4">
                    <h4 className="font-bold text-dark mb-3">
                      Jährliche Mitgliedsbeiträge:
                    </h4>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full shrink-0"></span>
                        <span>
                          <strong>Grundbeitrag:</strong> 45 €
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full shrink-0"></span>
                        <span>
                          <strong>Je Chormitglied mit Einkommen:</strong> 16 €
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full shrink-0"></span>
                        <span>
                          <strong>Je Chormitglied ohne Einkommen:</strong> 8 €
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href="/downloads/satzung-posaunenwerk.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
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
                      className="inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
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
                <div className="bg-primary-light/10 rounded-lg p-6 border-l-4 border-primary">
                  <h3 className="text-lg font-bold text-dark mb-2">Ehrungen</h3>
                  <p className="text-gray-600 mb-3">
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
                  <p className="text-gray-600">
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
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg shadow-xl p-6 md:p-12 border-t-4 border-district-6">
              <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 mb-6">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-district-6 rounded-full flex items-center justify-center shrink-0">
                  <svg
                    className="w-6 h-6 md:w-7 md:h-7 text-white"
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
                  <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-dark mb-3 md:mb-4 break-words">
                    Instrumenten&shy;versicherung
                  </h2>
                  <p className="text-base md:text-lg text-gray-600 leading-relaxed">
                    Schützen Sie Ihre wertvollen Instrumente optimal mit unserer
                    günstigen Rahmen&shy;versicherung.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Rahmenvertrag */}
                <div className="bg-background-secondary rounded-lg p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-bold text-dark mb-3">
                    Unser Rahmen&shy;vertrag
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
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
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">
                    Innerhalb dieses Rahmens können unsere Mitglieds&shy;chöre
                    Versicherungen abschließen, die durch uns vermittelt und
                    deren Versicherungs&shy;beiträge durch uns eingezogen
                    werden.
                  </p>

                  <div className="bg-primary-light/10 rounded-lg p-3 md:p-4 border-l-4 border-primary">
                    <p className="text-sm md:text-base text-gray-700 leading-relaxed">
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
                <div className="bg-district-6/10 rounded-lg p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-bold text-dark mb-3 flex items-start gap-2">
                    <svg
                      className="w-5 h-5 md:w-6 md:h-6 text-district-6 shrink-0 mt-0.5"
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
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-4">
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

                  <div className="bg-white rounded-lg p-3 md:p-4">
                    <h4 className="text-base md:text-lg font-bold text-dark mb-3">
                      Benötigte Unterlagen:
                    </h4>
                    <ul className="space-y-2 text-sm md:text-base text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-district-6 rounded-full shrink-0 mt-2"></span>
                        <span>
                          Schriftliche Schilderung des Schadens&shy;hergangs
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-district-6 rounded-full shrink-0 mt-2"></span>
                        <span>
                          Genaue Bezeichnung des geschädigten Instrumentes
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-2 h-2 bg-district-6 rounded-full shrink-0 mt-2"></span>
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
                      className="inline-flex items-center justify-center w-full md:w-auto px-6 py-3 bg-district-6 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm md:text-base"
                    >
                      <svg
                        className="w-5 h-5 mr-2 shrink-0"
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
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-6">
              Noch Fragen?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Wir beraten dich gerne persönlich zu allen Möglichkeiten des
              Mitmachens. Nimm einfach Kontakt mit uns auf!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kontakt"
                className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors shadow-lg"
              >
                Kontakt aufnehmen
              </Link>
              <Link
                href="/ueber-uns"
                className="px-8 py-3 bg-transparent border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                Mehr über uns
              </Link>
            </div>

            {/* Ansprechpartner */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-bold text-dark mb-2">Allgemeine Fragen</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Landesposaunenwartin
                </p>
                <a
                  href="mailto:info@posaunenwerk-rheinland.de"
                  className="text-primary hover:text-primary-dark text-sm font-semibold"
                >
                  E-Mail senden →
                </a>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-bold text-dark mb-2">
                  Aus- und Weiterbildung
                </h3>
                <p className="text-sm text-gray-600 mb-3">Bildungsreferat</p>
                <a
                  href="mailto:bildung@posaunenwerk-rheinland.de"
                  className="text-primary hover:text-primary-dark text-sm font-semibold"
                >
                  E-Mail senden →
                </a>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-bold text-dark mb-2">Jungbläserarbeit</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Referent für Jungbläserarbeit
                </p>
                <a
                  href="mailto:jungblaeser@posaunenwerk-rheinland.de"
                  className="text-primary hover:text-primary-dark text-sm font-semibold"
                >
                  E-Mail senden →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-12 md:py-16 bg-dark text-white">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Bleib auf dem Laufenden
            </h2>
            <p className="text-lg mb-6">
              Abonniere unseren Newsletter und verpasse keine Neuigkeiten,
              Termine und Angebote.
            </p>
            <Link
              href="/newsletter"
              className="inline-block px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-light transition-colors"
            >
              Newsletter abonnieren
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
