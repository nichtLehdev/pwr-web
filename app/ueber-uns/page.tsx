import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ParticipationCard from "@/components/ParticipationCard";

export default function UeberUnsPage() {
  const sections = [
    {
      title: "Struktur & Geschichte",
      description:
        "Erfahre mehr über die Geschichte des Posaunenwerks Rheinland und wie wir organisiert sind.",
      href: "/ueber-uns/struktur",
      icon: "building" as const,
      color: "primary",
    },
    {
      title: "Vorstand",
      description:
        "Lerne die Mitglieder unseres Vorstands kennen, die das Posaunenwerk leiten.",
      href: "/ueber-uns/vorstand",
      icon: "users" as const,
      color: "district-1",
    },
    {
      title: "Auswahlchöre",
      description:
        "Unsere Auswahlchöre repräsentieren die musikalische Spitze des Posaunenwerks.",
      href: "/ueber-uns/auswahlchoere",
      icon: "music" as const,
      color: "district-3",
    },
    {
      title: "Posaunenrat",
      description:
        "Der Posaunenrat berät den Vorstand und vertritt die Interessen der Chöre.",
      href: "/ueber-uns/posaunenrat",
      icon: "users" as const,
      color: "district-2",
    },
    {
      title: "Obleute",
      description:
        "Informationen und Ressourcen speziell für Obleute und Chorleiter.",
      href: "/ueber-uns/obleute",
      icon: "document" as const,
      color: "district-5",
    },
    {
      title: "Namibia-Partnerschaft",
      description:
        "Seit vielen Jahren verbindet uns eine besondere Partnerschaft mit Namibia.",
      href: "/ueber-uns/namibia",
      icon: "globe" as const,
      color: "foerderverein",
    },
  ];

  return (
    <div>
      <PageHeader title="Über uns" color="primary" />

      {/* Hero Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Über das Posaunenwerk Rheinland
            </h1>
            <p className="text-lg md:text-xl leading-relaxed opacity-95 mb-6">
              Das Evangelische Posaunenwerk in der Evangelischen Kirche im
              Rheinland ist die Dachorganisation für knapp 200 Posaunenchöre mit
              etwa 2.000 Mitgliedern. Diese Chöre verteilen sich über das große
              Gebiet der rheinischen Landeskirche, von Emmerich im Norden bis
              nach Saarbrücken im Süden, von Aachen im Westen bis
              Altenkirchen/Westerwald im Osten.
            </p>
            <p className="text-lg md:text-xl leading-relaxed opacity-95">
              Posaunenchöre – das sind gemischte Blechbläserensembles, die zur
              Ehre Gottes und zur Freude der Mitmenschen Musik machen. Sie haben
              eine lange Geschichte und gehören zum immateriellen Kulturerbe in
              Deutschland.
            </p>
          </div>
        </div>
      </section>

      {/* Sections Grid */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <ParticipationCard
                key={section.href}
                title={section.title}
                description={section.description}
                href={section.href}
                icon={section.icon}
                color={section.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Geschichte Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark text-center mb-12">
            Unsere Geschichte
          </h2>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xl">
                    1949
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-2">
                      Gründung des Posaunenwerks
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Das Posaunenwerk Rheinland entstand durch den
                      Zusammenschluss der Posaunenchöre auf dem Gebiet der
                      Evangelischen Kirche im Rheinland. Damit begann eine neue
                      Ära der organisierten Posaunenchorarbeit in unserer
                      Region.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-district-1 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xl">
                    1986
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-2">
                      Rechtliche Selbständigkeit
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Das Posaunenwerk wurde rechtlich selbständig und als
                      Verein organisiert. Diese Struktur ermöglicht es uns bis
                      heute, flexibel und eigenverantwortlich zu agieren.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-district-2 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xl">
                    2016
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-2">
                      UNESCO-Weltkulturerbe
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Ein historischer Moment: Posaunenchöre wurden in die
                      UNESCO-Liste des immateriellen Weltkulturerbes
                      aufgenommen. Diese Anerkennung würdigt die besondere
                      Bedeutung der Posaunenchorarbeit für die deutsche Kultur.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-district-3 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xl">
                    2019
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-2">
                      70 Jahre Posaunenwerk
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Zum 70-jährigen Bestehen veranstaltete das Posaunenwerk
                      vom 24. bis 26. Mai den Landesposaunentag in Trier mit
                      rund 400 Teilnehmenden unter dem Motto
                      &quot;HimmelHochJauchzen&quot;.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-foerderverein rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xl">
                    EPiD
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-2">
                      Teil einer großen Bewegung
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Das Posaunenwerk Rheinland gehört zum Evangelischen
                      Posaunendienst in Deutschland (EPiD) mit mehr als 100.000
                      Posaunenbläser*innen. Der EPiD organisierte große
                      Posaunentage in Leipzig (2008), Dresden (2016) und Hamburg
                      (2024) mit jeweils über 16.000 Teilnehmenden.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <Link
                  href="/ueber-uns/struktur"
                  className="inline-flex items-center text-primary hover:text-primary-dark font-semibold"
                >
                  Mehr zur Geschichte und Struktur
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
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Zahlen & Fakten */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark text-center mb-12">
            Zahlen & Fakten
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                ~200
              </div>
              <p className="text-gray-600">Posaunenchöre</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                ~2.000
              </div>
              <p className="text-gray-600">Aktive Mitglieder</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                13
              </div>
              <p className="text-gray-600">Bezirke</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                1949
              </div>
              <p className="text-gray-600">Gründungsjahr</p>
            </div>
          </div>

          {/* Zusätzliche Info-Karten */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
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
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-dark mb-2">
                    UNESCO-Weltkulturerbe
                  </h3>
                  <p className="text-gray-600 text-sm">
                    2016 wurden Posaunenchöre in die UNESCO-Liste des
                    immateriellen Weltkulturerbes aufgenommen.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-district-1 rounded-full flex items-center justify-center shrink-0">
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
                <div>
                  <h3 className="text-lg font-bold text-dark mb-2">
                    Teil des EPiD
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Mitglied im Evangelischen Posaunendienst in Deutschland mit
                    über 100.000 Bläser*innen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kontakt Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark text-center mb-12">
            Kontakt
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Kontakt-Informationen */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-bold text-dark mb-6">
                Geschäftsstelle
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-dark mb-1">Adresse</p>
                    <p className="text-gray-600">
                      Evangelisches Posaunenwerk Rheinland
                      <br />
                      Hans-Böckler-Straße 7<br />
                      40476 Düsseldorf
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                    <svg
                      className="w-6 h-6 text-primary"
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
                  </div>
                  <div>
                    <p className="font-semibold text-dark mb-1">Telefon</p>
                    <a
                      href="tel:+492118957370"
                      className="text-gray-600 hover:text-primary transition-colors"
                    >
                      +49 211 89 57 370
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                    <svg
                      className="w-6 h-6 text-primary"
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
                  </div>
                  <div>
                    <p className="font-semibold text-dark mb-1">E-Mail</p>
                    <a
                      href="mailto:info@posaunenwerk-rheinland.de"
                      className="text-gray-600 hover:text-primary transition-colors"
                    >
                      info@posaunenwerk-rheinland.de
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg shrink-0">
                    <svg
                      className="w-6 h-6 text-primary"
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
                  <div>
                    <p className="font-semibold text-dark mb-1">
                      Öffnungszeiten
                    </p>
                    <p className="text-gray-600">
                      Mo - Fr: 9:00 - 16:00 Uhr
                      <br />
                      oder nach Vereinbarung
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schnellkontakt */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-bold text-dark mb-6">
                Schnellkontakt
              </h3>

              <p className="text-gray-600 mb-6">
                Haben Sie Fragen oder möchten Sie mehr erfahren? Nutzen Sie
                unser Kontaktformular oder wenden Sie sich direkt an uns.
              </p>

              <div className="space-y-4">
                <Link
                  href="/kontakt"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
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
                  Kontaktformular
                </Link>

                <div className="flex gap-4">
                  <a
                    href="https://facebook.com/posaunenwerkrheinland"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gray-100 text-dark rounded-lg hover:bg-gray-200 transition-colors"
                    aria-label="Facebook"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>

                  <a
                    href="https://www.instagram.com/posaunenwerk_rheinland/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gray-100 text-dark rounded-lg hover:bg-gray-200 transition-colors"
                    aria-label="Instagram"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>

                  <a
                    href="https://www.youtube.com/@PWRheinland"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gray-100 text-dark rounded-lg hover:bg-gray-200 transition-colors"
                    aria-label="YouTube"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Tipp:</strong> Abonnieren Sie unseren Newsletter für
                  aktuelle Informationen und Termine!
                </p>
                <Link
                  href="/newsletter"
                  className="inline-flex items-center text-sm text-primary hover:text-primary-dark font-semibold mt-2"
                >
                  Newsletter abonnieren
                  <svg
                    className="w-4 h-4 ml-1"
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
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            Teil unserer Gemeinschaft werden?
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Entdecke die Vielfalt der Posaunenchormusik und werde Teil unserer
            lebendigen Gemeinschaft!
          </p>
          <Link
            href="/mitmachen"
            className="inline-block px-8 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Jetzt mitmachen
          </Link>
        </div>
      </section>
    </div>
  );
}
