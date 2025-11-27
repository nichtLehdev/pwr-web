import PageHeader from "@/app/_components/general/page-header";
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
      <section className="bg-district-9 py-16 text-white md:py-24">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/mitmachen"
              className="transition-colors hover:text-white"
            >
              Mitmachen
            </Link>
            <span>/</span>
            <span>Jungbläserarbeit</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Jungbläserarbeit – Musik von Anfang an
            </h1>
            <p className="mb-6 text-lg leading-relaxed md:text-xl">
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
      <section className="bg-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark mb-6 text-2xl font-bold md:text-3xl lg:text-4xl">
              Was ist Jungbläserarbeit?
            </h2>
            <div className="prose prose-lg max-w-none leading-relaxed text-gray-600">
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
      <section className="bg-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-dark mb-4 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Unsere Angebote für Jungbläser
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600">
              Vielfältige Möglichkeiten für Kinder und Jugendliche, die Welt der
              Blechblasinstrumente zu entdecken.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {offerings.map((offering) => (
                <div
                  key={offering.id}
                  className="rounded-lg bg-white p-6 shadow-lg transition-all hover:shadow-xl"
                >
                  <div className="bg-district-9 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {offering.icon}
                    </svg>
                  </div>
                  <h3 className="text-dark mb-2 text-xl font-bold">
                    {offering.title}
                  </h3>
                  <p className="text-gray-600">{offering.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/termine?type=courses&category=Anfänger"
                className="bg-district-9 inline-flex items-center rounded-lg px-8 py-4 font-bold text-white shadow-lg transition-opacity hover:opacity-90"
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
      <section className="bg-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Warum Jungbläserarbeit?
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="rounded-lg bg-white p-6 shadow-md">
                  <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {benefit.icon}
                    </svg>
                  </div>
                  <h3 className="text-dark mb-3 text-xl font-bold">
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
      <section className="bg-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark mb-8 text-2xl font-bold md:text-3xl lg:text-4xl">
              Für Chorleiter & Ausbilder
            </h2>

            <div className="space-y-6">
              {/* Arbeitshilfe */}
              <div className="rounded-lg bg-white p-8 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-district-9 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
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
                  <div className="flex-1">
                    <h3 className="text-dark mb-3 text-xl font-bold">
                      Arbeitshilfe Jungbläserausbildung
                    </h3>
                    <p className="mb-4 leading-relaxed text-gray-600">
                      Eine umfassende Arbeitshilfe mit praktischen Tipps und
                      Anleitungen für alle, die in der Jungbläserausbildung
                      tätig sind oder es werden wollen.
                    </p>
                    <a
                      href="/downloads/arbeitshilfe-jungblaeser.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-district-9 inline-flex items-center font-semibold hover:opacity-80"
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
                      Arbeitshilfe herunterladen
                    </a>
                  </div>
                </div>
              </div>

              {/* Leistungsstempel */}
              <div className="rounded-lg bg-white p-8 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
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
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-dark mb-3 text-xl font-bold">
                      Leistungsstempel-System
                    </h3>
                    <p className="mb-4 leading-relaxed text-gray-600">
                      Mit aufeinander aufbauenden Leistungsstufen können Sie den
                      Fortschritt Ihrer Jungbläser dokumentieren und motivieren.
                    </p>
                    <Link
                      href="/mitmachen/bildung#leistungsstufen"
                      className="text-primary hover:text-primary-dark inline-flex items-center font-semibold"
                    >
                      Mehr zu Leistungsstempeln →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Unterstützung */}
              <div className="bg-primary/10 border-primary rounded-lg border-l-4 p-8">
                <h3 className="text-dark mb-3 text-xl font-bold">
                  Beratung & Unterstützung
                </h3>
                <p className="mb-4 leading-relaxed text-gray-700">
                  Unser Referent für Jungbläserarbeit steht Ihnen bei allen
                  Fragen rund um die Ausbildung junger Bläserinnen und Bläser
                  zur Seite. Von der Konzeption bis zur praktischen Umsetzung –
                  wir unterstützen Sie gerne!
                </p>
                <Link
                  href="/kontakt"
                  className="bg-primary hover:bg-primary-dark inline-flex items-center rounded-lg px-6 py-3 font-semibold text-white transition-colors"
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
                  Kontakt Jungbläser-Referent
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-district-9 py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Interesse geweckt?
            </h2>
            <p className="mb-8 text-lg opacity-95">
              Finde einen Chor in deiner Nähe und starte deine musikalische
              Reise!
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/mitmachen/chor-finden"
                className="text-district-9 inline-block rounded-lg bg-white px-8 py-3 font-bold transition-colors hover:bg-gray-100"
              >
                Chor finden
              </Link>
              <Link
                href="/termine"
                className="inline-block rounded-lg border-2 border-white bg-transparent px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10"
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
