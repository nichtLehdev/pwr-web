import PageHeader from "@/components/PageHeader";
import Link from "next/link";

export default function EhrenamtPage() {
  const opportunities = [
    {
      id: "chorleitung",
      title: "Chorleitung",
      description:
        "Leite einen Posaunenchor und bringe deine musikalischen Fähigkeiten ein. Wir unterstützen dich mit Aus- und Weiterbildungsangeboten.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      ),
      color: "bg-district-2",
    },
    {
      id: "jugendarbeit",
      title: "Jungbläser-Ausbildung",
      description:
        "Gib dein Wissen an die nächste Generation weiter und begleite junge Menschen auf ihrem musikalischen Weg.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      ),
      color: "bg-district-9",
    },
    {
      id: "vorstand",
      title: "Vorstandsarbeit",
      description:
        "Gestalte die Zukunft des Posaunenwerks mit. Ob auf Bezirks-, Regional- oder Landesebene – dein Engagement zählt!",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      ),
      color: "bg-primary",
    },
    {
      id: "organisation",
      title: "Organisation & Veranstaltungen",
      description:
        "Hilf bei der Planung und Durchführung von Konzerten, Freizeiten, Lehrgängen und anderen Events.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      ),
      color: "bg-district-4",
    },
    {
      id: "kommunikation",
      title: "Kommunikation & Öffentlichkeitsarbeit",
      description:
        "Gestalte Flyer, pflege Social Media, schreibe Berichte oder fotografiere bei Veranstaltungen.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
        />
      ),
      color: "bg-district-7",
    },
    {
      id: "technik",
      title: "Technik & IT",
      description:
        "Bringe deine technischen Fähigkeiten ein – ob bei Tontechnik, Website-Pflege oder digitalen Projekten.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      ),
      color: "bg-district-6",
    },
  ];

  const benefits = [
    {
      title: "Sinnvolle Tätigkeit",
      description:
        "Dein Engagement macht einen echten Unterschied für Menschen und Gemeinschaften.",
    },
    {
      title: "Gemeinschaft",
      description:
        "Lerne Gleichgesinnte kennen und knüpfe neue Freundschaften.",
    },
    {
      title: "Persönliche Entwicklung",
      description:
        "Erweitere deine Fähigkeiten und sammle wertvolle Erfahrungen.",
    },
    {
      title: "Flexible Gestaltung",
      description: "Engagiere dich in dem Umfang, der zu deinem Leben passt.",
    },
  ];

  return (
    <div>
      <PageHeader title="Ehrenamtlich engagieren" color="district-5" />

      {/* Hero Section */}
      <section className="bg-district-5 text-white py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Ehrenamtlich engagieren
            </h1>
            <p className="text-lg md:text-xl leading-relaxed mb-6">
              Das Posaunenwerk Rheinland lebt vom Engagement vieler Menschen,
              die ihre Zeit, ihre Talente und ihre Leidenschaft einbringen. Ohne
              ehrenamtliche Helferinnen und Helfer wäre unsere Arbeit nicht
              möglich.
            </p>
            <p className="text-lg leading-relaxed opacity-95">
              Ob musikalisch, organisatorisch oder kreativ – es gibt viele
              Möglichkeiten, sich einzubringen. Finde die Aufgabe, die zu dir
              passt!
            </p>
          </div>
        </div>
      </section>

      {/* Möglichkeiten */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-4 text-center">
              Wo kannst du dich engagieren?
            </h2>
            <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
              Es gibt vielfältige Möglichkeiten, das Posaunenwerk mit deinen
              Fähigkeiten und deiner Zeit zu unterstützen.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all p-6 border-t-4"
                  style={{
                    borderTopColor: `var(--color-${opportunity.color.replace(
                      "bg-",
                      ""
                    )})`,
                  }}
                >
                  <div
                    className={`w-12 h-12 ${opportunity.color} rounded-full flex items-center justify-center mb-4`}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {opportunity.icon}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-dark mb-3">
                    {opportunity.title}
                  </h3>
                  <p className="text-gray-600">{opportunity.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vorteile */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-12 text-center">
              Warum ehrenamtlich engagieren?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-district-5 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-dark mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Unterstützung */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-xl p-8 md:p-10">
              <h2 className="text-2xl md:text-3xl font-bold text-dark mb-6">
                Wir unterstützen dich!
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
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
                  <div>
                    <h3 className="text-lg font-bold text-dark mb-2">
                      Aus- und Weiterbildung
                    </h3>
                    <p className="text-gray-600">
                      Wir bieten Schulungen und Fortbildungen an, damit du für
                      deine Aufgabe gut gerüstet bist.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
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
                  <div>
                    <h3 className="text-lg font-bold text-dark mb-2">
                      Vernetzung
                    </h3>
                    <p className="text-gray-600">
                      Tausche dich mit anderen Ehrenamtlichen aus und profitiere
                      von ihren Erfahrungen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark mb-2">
                      Begleitung
                    </h3>
                    <p className="text-gray-600">
                      Du bist nicht allein! Wir stehen dir mit Rat und Tat zur
                      Seite.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark mb-2">
                      Anerkennung
                    </h3>
                    <p className="text-gray-600">
                      Dein Engagement wird wertgeschätzt und gewürdigt –
                      persönlich und bei besonderen Anlässen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Erfahrungsbericht */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 md:p-10">
              <div className="flex items-start gap-4 mb-6">
                <svg
                  className="w-12 h-12 text-primary shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <div>
                  <p className="text-lg text-gray-700 leading-relaxed mb-4 italic">
                    &quot;Die Arbeit als Chorleiter erfüllt mich sehr. Es ist
                    wunderbar zu sehen, wie sich die Bläserinnen und Bläser
                    entwickeln und gemeinsam Musik machen. Die Unterstützung
                    durch das Posaunenwerk gibt mir Sicherheit und hilft mir,
                    immer besser zu werden.&quot;
                  </p>
                  <p className="font-semibold text-dark">
                    Michael K., Chorleiter seit 2018
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kontakt CTA */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-6">
              Bereit, dich einzubringen?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Wir freuen uns auf dein Engagement! Kontaktiere uns und lass uns
              gemeinsam herausfinden, wo und wie du dich am besten einbringen
              kannst.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kontakt"
                className="inline-flex items-center justify-center px-8 py-4 bg-district-5 text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
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
                Jetzt Kontakt aufnehmen
              </Link>
              <Link
                href="/mitmachen/bildung"
                className="inline-flex items-center justify-center px-8 py-4 bg-white border-2 border-district-5 text-district-5 font-semibold rounded-lg hover:bg-district-5 hover:text-white transition-colors"
              >
                Weiterbildungsangebote ansehen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
