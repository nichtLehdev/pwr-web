import PageHeader from "@/components/PageHeader";
import Link from "next/link";

export default function BildungPage() {
  const courseCategories = [
    {
      id: "blaeser",
      title: "Bläserkurse",
      description:
        "Von Anfänger bis Fortgeschrittene – D-Kurse, C-Kurse und mehr",
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
      id: "chorleitung",
      title: "Chorleitung",
      description: "Ausbildung für Chorleiter und angehende Dirigenten",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      ),
      color: "bg-district-5",
    },
    {
      id: "workshops",
      title: "Workshops",
      description:
        "Spezialthemen wie Improvisation, Arrangement, Registerarbeit",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
        />
      ),
      color: "bg-district-6",
    },
    {
      id: "komponisten",
      title: "Komponistenportraits",
      description:
        "Musikalische Reisen durch Leben und Werk großer Komponisten",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      ),
      color: "bg-district-3",
    },
    {
      id: "studienfahrten",
      title: "Studienfahrten",
      description:
        "Musikalische Bildungsreisen zu besonderen Orten und Festivals",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      ),
      color: "bg-primary",
    },
    {
      id: "freizeiten",
      title: "Bläserfreizeiten",
      description:
        "Gemeinsames Musizieren, Lernen und Erleben für alle Altersgruppen",
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
  ];

  return (
    <div>
      <PageHeader title="Aus- und Weiterbildung" color="district-2" />

      {/* Hero Section */}
      <section className="bg-district-2 text-white py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Aus- und Weiterbildung
            </h1>
            <p className="text-lg md:text-xl leading-relaxed">
              Das Posaunenwerk bietet ein umfangreiches Aus- und
              Weiterbildungsprogramm an. Verschiedene Workshops und ein- oder
              mehrtägige Lehrgänge richten sich an die Bläserinnen und Bläser
              und Chorleiter der Chöre im Rheinland. Ebenso gibt es spezielle
              Lehrgänge für junge Bläser und junggebliebene Anfänger jeden
              Alters.
            </p>
          </div>
        </div>
      </section>

      {/* Hinweis: Offen für alle */}
      <section className="py-8 bg-primary/10">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-gray-700">
              <strong>Wichtig:</strong> Unser Angebot richtet sich nicht
              ausschließlich an Mitglieder des Posaunenwerks, sondern steht{" "}
              <strong>allen Interessierten offen</strong>!
            </p>
          </div>
        </div>
      </section>

      {/* Kurs-Kategorien */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-4 text-center">
              Unsere Bildungsangebote
            </h2>
            <p className="text-lg text-gray-600 text-center mb-12 max-w-3xl mx-auto">
              Von Anfängerkursen bis zur Dirigenten-Ausbildung – finde das
              passende Angebot für dein musikalisches Weiterkommen.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courseCategories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all p-6 border-t-4"
                  style={{
                    borderTopColor: `var(--color-${category.color.replace(
                      "bg-",
                      ""
                    )})`,
                  }}
                >
                  <div
                    className={`w-12 h-12 ${category.color} rounded-full flex items-center justify-center mb-4`}
                  >
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {category.icon}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-dark mb-2">
                    {category.title}
                  </h3>
                  <p className="text-gray-600">{category.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Aktuelle Lehrgänge */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-xl p-8 md:p-10 text-center">
              <div className="inline-block p-3 bg-district-2 rounded-full mb-6">
                <svg
                  className="w-12 h-12 text-white"
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
              <h2 className="text-2xl md:text-3xl font-bold text-dark mb-4">
                Aktuelle Lehrgänge & Anmeldung
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Das aktuelle Angebot und Anmeldemöglichkeiten findest du in
                unserer Terminübersicht. Dort kannst du dich direkt für die
                Lehrgänge anmelden.
              </p>
              <Link
                href="/termine"
                className="inline-flex items-center px-8 py-4 bg-district-2 text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
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
                Zu den Lehrgängen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Leistungsstufen & Stempel */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8">
              Leistungsstufen & Stempel
            </h2>

            <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
              <div className="flex items-start gap-4 mb-6">
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
                    Aufbauende Ausbildung
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Begleitend zur Ausbildung eines (Jung-)Bläsers können
                    aufeinander aufbauende Leistungsstufen (Stempel) erworben
                    werden. Hierzu werden durch den Jungbläserausbilder,
                    Chorleiter oder Posaunenwart kleine Prüfungen abgehalten.
                  </p>
                  <p className="text-gray-600 leading-relaxed mb-6">
                    Die erreichte Leistungsstufe wird auf dem Mitgliedsausweis
                    durch einen Stempel dokumentiert.
                  </p>
                  <a
                    href="/downloads/leistungsstempel.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:text-primary-dark font-semibold"
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
                    Infos zu Leistungsstempeln herunterladen
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jungbläserausbildung */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8">
              Jungbläserausbildung
            </h2>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <p className="text-gray-600 leading-relaxed mb-6">
                Eine vom Landesposaunenwart und den Regionalposaunenwarten
                zusammengestellte Arbeitshilfe zum Thema Jungbläserausbildung
                versucht Antworten auf die vielen Fragen rund um das Thema zu
                geben:
              </p>

              <ul className="space-y-2 mb-6 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2"></span>
                  <span>Wie generiere ich neue BläserInnen?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2"></span>
                  <span>Beispielhafter Ablauf einer ersten Kontaktstunde</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2"></span>
                  <span>Verschiedene Kooperationsmodelle zur Ausbildung</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2"></span>
                  <span>
                    Wie integriere ich die jungen Menschen in den Posaunenchor?
                  </span>
                </li>
              </ul>

              <a
                href="/downloads/arbeitshilfe-jungblaeser.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-district-9 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
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
                Arbeitshilfe Jungbläser herunterladen
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Fördermöglichkeiten */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="bg-foerderverein/10 rounded-lg border-l-4 border-foerderverein p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-foerderverein rounded-full flex items-center justify-center shrink-0">
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
                <div>
                  <h3 className="text-xl font-bold text-dark mb-3">
                    Fördermöglichkeiten durch den Förderverein
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Der Förderverein unterstützt die Bildungsarbeit des
                    Posaunenwerks! Geschwisterkinder erhalten eine Ermäßigung
                    von 25 € pro weiterem Kind bei der Anmeldung für Lehrgänge.
                    Zusätzlich trägt der Förderverein weitere Kosten, um die
                    Teilnehmerbeiträge für alle zu reduzieren.
                  </p>
                  <Link
                    href="/foerderverein"
                    className="inline-flex items-center text-foerderverein hover:text-foerderverein-dark font-semibold"
                  >
                    Mehr zum Förderverein →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Downloads & Wichtige Hinweise */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8">
              Wichtige Hinweise & Downloads
            </h2>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-dark mb-2">
                    Für minderjährige Teilnehmer
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Minderjährige Lehrgangsteilnehmer müssen vorab eine
                    ausgefüllte und unterzeichnete Zusatzerklärung einreichen.
                  </p>
                  <a
                    href="/downloads/zusatzerklaerung-minderjaehrige.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:text-primary-dark font-semibold"
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
                    Zusatzerklärung herunterladen
                  </a>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-bold text-dark mb-2">
                    Fragen zur Ausbildung?
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Unser Bildungsreferat berät dich gerne zu allen Fragen rund
                    um Aus- und Weiterbildung.
                  </p>
                  <Link
                    href="/kontakt"
                    className="inline-flex items-center px-6 py-3 bg-district-2 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
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
                    Kontakt aufnehmen
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
