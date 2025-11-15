import PageHeader from "@/components/PageHeader";
import Link from "next/link";

export default function JungblaserPage() {
  const offerings = [
    {
      id: "kurse",
      title: "Bläserkurse für Kinder & Jugendliche",
      description:
        "Spielerisch ein Blechblasinstrument erlernen – von den ersten Tönen bis zum gemeinsamen Musizieren.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      ),
    },
    {
      id: "freizeiten",
      title: "Jungbläserfreizeiten",
      description:
        "Gemeinsam Musik machen, neue Freunde finden und unvergessliche Erlebnisse teilen.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    {
      id: "ensembles",
      title: "Jungbläserensembles",
      description:
        "In kleinen Gruppen gemeinsam musizieren und von erfahrenen Dozenten lernen.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      ),
    },
    {
      id: "workshops",
      title: "Workshops & Projekte",
      description:
        "Spannende Themen wie Improvisation, Rhythmik oder Musik und Bewegung für junge Bläser.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      ),
    },
  ];

  const benefits = [
    {
      title: "Musikalische Grundlagen",
      description:
        "Kinder und Jugendliche lernen Notenlesen, Rhythmus und erwerben ein fundiertes musikalisches Verständnis.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      ),
    },
    {
      title: "Gemeinschaft erleben",
      description:
        "Im Chor entstehen Freundschaften, Teamgeist und ein starkes Zusammengehörigkeitsgefühl.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      ),
    },
    {
      title: "Persönliche Entwicklung",
      description:
        "Musik fördert Konzentration, Disziplin, Selbstbewusstsein und Kreativität.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
    },
    {
      title: "Glauben leben",
      description:
        "Junge Menschen erleben, wie Musik und Glaube zusammengehören und Gottesdienste mitgestalten können.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Jungbläserarbeit" color="district-9" />

      {/* Hero Section */}
      <section className="bg-district-9 text-white py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Jungbläserarbeit – Musik von Anfang an
            </h1>
            <p className="text-lg md:text-xl leading-relaxed mb-6">
              Kinder und Jugendliche für die Musik zu begeistern ist uns ein
              besonderes Anliegen. In unseren Posaunenchören finden junge
              Menschen einen Ort, an dem sie gemeinsam musizieren, lernen und
              wachsen können.
            </p>
            <p className="text-lg leading-relaxed opacity-95">
              Von den ersten Tönen auf dem Instrument bis zum gemeinsamen
              Auftritt – wir begleiten junge Bläserinnen und Bläser auf ihrem
              musikalischen Weg.
            </p>
          </div>
        </div>
      </section>

      {/* Was ist Jungbläserarbeit */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-6">
              Was ist Jungbläserarbeit?
            </h2>
            <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed">
              <p className="mb-4">
                Jungbläserarbeit umfasst alle Angebote und Aktivitäten für
                Kinder und Jugendliche, die ein Blechblasinstrument erlernen
                möchten oder bereits spielen. Ob Trompete, Posaune, Horn oder
                Tuba – bei uns können junge Menschen ab etwa 8 Jahren ihr
                Wunschinstrument entdecken.
              </p>
              <p className="mb-4">
                In kleinen Gruppen oder im Einzelunterricht lernen sie die
                Grundlagen, bevor sie dann im Jungbläserchor gemeinsam
                musizieren. Ziel ist es, die jungen Bläserinnen und Bläser
                Schritt für Schritt in die Posaunenchöre zu integrieren.
              </p>
              <p>
                Unsere Jungbläserarbeit verbindet musikalische Ausbildung mit
                christlichen Werten und Gemeinschaftserlebnissen – sei es bei
                Freizeiten, Workshops oder besonderen Projekten.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Unsere Angebote */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-4 text-center">
              Unsere Angebote für Jungbläser
            </h2>
            <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
              Vielfältige Möglichkeiten für Kinder und Jugendliche, die Welt der
              Blechblasinstrumente zu entdecken.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {offerings.map((offering) => (
                <div
                  key={offering.id}
                  className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all p-6"
                >
                  <div className="w-12 h-12 bg-district-9 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {offering.icon}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-dark mb-2">
                    {offering.title}
                  </h3>
                  <p className="text-gray-600">{offering.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/termine?type=courses&category=Beginners"
                className="inline-flex items-center px-8 py-4 bg-district-9 text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Aktuelle Termine für Jungbläser
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Warum Jungbläserarbeit */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-12 text-center">
              Warum Jungbläserarbeit?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-6">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {benefit.icon}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-dark mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Für Chorleiter & Ausbilder */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8">
              Für Chorleiter & Ausbilder
            </h2>

            <div className="space-y-6">
              {/* Arbeitshilfe */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-district-9 rounded-full flex items-center justify-center shrink-0">
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
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-dark mb-3">
                      Arbeitshilfe Jungbläserausbildung
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      Eine umfassende Arbeitshilfe mit praktischen Tipps und
                      Anleitungen für alle, die in der Jungbläserausbildung
                      tätig sind oder es werden wollen.
                    </p>
                    <a
                      href="/downloads/arbeitshilfe-jungblaeser.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-district-9 hover:opacity-80 font-semibold"
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
                      Arbeitshilfe herunterladen
                    </a>
                  </div>
                </div>
              </div>

              {/* Leistungsstempel */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shrink-0">
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
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-dark mb-3">
                      Leistungsstempel-System
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      Mit aufeinander aufbauenden Leistungsstufen können Sie den
                      Fortschritt Ihrer Jungbläser dokumentieren und motivieren.
                    </p>
                    <Link
                      href="/mitmachen/bildung#leistungsstufen"
                      className="inline-flex items-center text-primary hover:text-primary-dark font-semibold"
                    >
                      Mehr zu Leistungsstempeln →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Unterstützung */}
              <div className="bg-primary/10 rounded-lg border-l-4 border-primary p-8">
                <h3 className="text-xl font-bold text-dark mb-3">
                  Beratung & Unterstützung
                </h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Unser Referent für Jungbläserarbeit steht Ihnen bei allen
                  Fragen rund um die Ausbildung junger Bläserinnen und Bläser
                  zur Seite. Von der Konzeption bis zur praktischen Umsetzung –
                  wir unterstützen Sie gerne!
                </p>
                <Link
                  href="/kontakt"
                  className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
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
                  Kontakt Jungbläser-Referent
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 lg:py-20 bg-district-9 text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Interesse geweckt?
            </h2>
            <p className="text-lg mb-8 opacity-95">
              Finde einen Chor in deiner Nähe und starte deine musikalische
              Reise!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/mitmachen/chor-finden"
                className="inline-block px-8 py-3 bg-white text-district-9 font-bold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Chor finden
              </Link>
              <Link
                href="/termine"
                className="inline-block px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                Termine ansehen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
