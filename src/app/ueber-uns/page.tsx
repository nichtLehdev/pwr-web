import Link from "next/link";
import PageHeader from "../_components/general/page-header";
import ParticipationCard from "../_components/general/participation-card";
import {
  ArrowRightIcon,
  BuildingIcon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
} from "lucide-react";

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
      title: "Bezirke & Obleute",
      description:
        "Informationen zu unseren Bezirken und deren Ansprechpartner*innen.",
      href: "/ueber-uns/bezirke",
      icon: "document" as const,
      color: "district-5",
    },
    {
      title: "Posaunenwarte",
      description:
        "Die Posaunenwarte leiten das Posaunenwerk in musikalischer Hinsicht.",
      href: "/ueber-uns/posaunenwarte",
      icon: "users" as const,
      color: "primary",
    },
  ];

  return (
    <div>
      <PageHeader title="Über uns" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary dark:bg-primary-dark py-12 text-white md:py-16 lg:py-20">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <span>Förderverein</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Über das Posaunenwerk Rheinland
            </h1>
            <p className="mb-6 text-lg leading-relaxed opacity-95 md:text-xl">
              Das Evangelische Posaunenwerk in der Evangelischen Kirche im
              Rheinland ist die Dachorganisation für knapp 200 Posaunenchöre mit
              etwa 2.000 Mitgliedern. Diese Chöre verteilen sich über das große
              Gebiet der rheinischen Landeskirche, von Emmerich im Norden bis
              nach Saarbrücken im Süden, von Aachen im Westen bis
              Altenkirchen/Westerwald im Osten.
            </p>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Posaunenchöre – das sind gemischte Blechbläserensembles, die zur
              Ehre Gottes und zur Freude der Mitmenschen Musik machen. Sie haben
              eine lange Geschichte und gehören zum immateriellen Kulturerbe in
              Deutschland.
            </p>
          </div>
        </div>
      </section>

      {/* Sections Grid */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Unsere Geschichte
          </h2>

          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white">
                    1949
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                      Gründung des Posaunenwerks
                    </h3>
                    <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                      Das Posaunenwerk Rheinland entstand durch den
                      Zusammenschluss der Posaunenchöre auf dem Gebiet der
                      Evangelischen Kirche im Rheinland. Damit begann eine neue
                      Ära der organisierten Posaunenchorarbeit in unserer
                      Region.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-district-1 flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white">
                    1986
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                      Rechtliche Selbständigkeit
                    </h3>
                    <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                      Das Posaunenwerk wurde rechtlich selbständig und als
                      Verein organisiert. Diese Struktur ermöglicht es uns bis
                      heute, flexibel und eigenverantwortlich zu agieren.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-district-2 flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white">
                    2016
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                      UNESCO-Weltkulturerbe
                    </h3>
                    <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                      Ein historischer Moment: Posaunenchöre wurden in die
                      UNESCO-Liste des immateriellen Weltkulturerbes
                      aufgenommen. Diese Anerkennung würdigt die besondere
                      Bedeutung der Posaunenchorarbeit für die deutsche Kultur.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-district-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white">
                    2019
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                      70 Jahre Posaunenwerk
                    </h3>
                    <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                      Zum 70-jährigen Bestehen veranstaltete das Posaunenwerk
                      vom 24. bis 26. Mai den Landesposaunentag in Trier mit
                      rund 400 Teilnehmenden unter dem Motto
                      &quot;HimmelHochJauchzen&quot;.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-foerderverein flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white">
                    EPiD
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                      Teil einer großen Bewegung
                    </h3>
                    <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                      Das Posaunenwerk Rheinland gehört zum Evangelischen
                      Posaunendienst in Deutschland (EPiD) mit mehr als 100.000
                      Posaunenbläser*innen. Der EPiD organisierte große
                      Posaunentage in Leipzig (2008), Dresden (2016) und Hamburg
                      (2024) mit jeweils über 16.000 Teilnehmenden.
                    </p>
                  </div>
                </div>
              </div>

              <div className="dark:border-dark-border mt-8 border-t border-gray-200 pt-8">
                <Link
                  href="/ueber-uns/struktur"
                  className="text-primary hover:text-primary-dark dark:hover:text-primary-light inline-flex items-center font-semibold"
                >
                  Mehr zur Geschichte und Struktur
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Zahlen & Fakten */}
      <section className="bg-background-secondary dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Zahlen & Fakten
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 text-center shadow-lg">
              <div className="text-primary dark:text-primary-light mb-2 text-4xl font-bold md:text-5xl">
                ~200
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Posaunenenchöre
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 text-center shadow-lg">
              <div className="text-primary dark:text-primary-light mb-2 text-4xl font-bold md:text-5xl">
                ~2.000
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Aktive Bläserinnen & Bläser
              </p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 text-center shadow-lg">
              <div className="text-primary dark:text-primary-light mb-2 text-4xl font-bold md:text-5xl">
                13
              </div>
              <p className="text-gray-600 dark:text-gray-400">Bezirke</p>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 text-center shadow-lg">
              <div className="text-primary dark:text-primary-light mb-2 text-4xl font-bold md:text-5xl">
                1949
              </div>
              <p className="text-gray-600 dark:text-gray-400">Gründungsjahr</p>
            </div>
          </div>

          {/* Zusätzliche Info-Karten */}
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="bg-foerderverein flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <ArrowRightIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                    UNESCO-Weltkulturerbe
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    2016 wurden Posaunenchöre in die UNESCO-Liste des
                    immateriellen Weltkulturerbes aufgenommen.
                  </p>
                </div>
              </div>
            </div>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="bg-district-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <ArrowRightIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                    Teil des EPiD
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
      <section className="bg-background dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
            Kontakt
          </h2>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Kontakt-Informationen */}
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg">
              <h3 className="text-dark dark:text-dark-text mb-6 text-xl font-bold">
                Geschäftsstelle
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 dark:bg-primary/20 shrink-0 rounded-lg p-3">
                    <BuildingIcon className="text-primary dark:text-primary-light h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-dark dark:text-dark-text mb-1 font-semibold">
                      Adresse
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Evangelisches Posaunenwerk Rheinland
                      <br />
                      Hans-Böckler-Straße 7<br />
                      40476 Düsseldorf
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 dark:bg-primary/20 shrink-0 rounded-lg p-3">
                    <PhoneIcon className="text-primary dark:text-primary-light h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-dark dark:text-dark-text mb-1 font-semibold">
                      Telefon
                    </p>
                    <a
                      href="tel:+492118957370"
                      className="hover:text-primary dark:hover:text-primary-light text-gray-600 transition-colors dark:text-gray-400"
                    >
                      +49 211 89 57 370
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 dark:bg-primary/20 shrink-0 rounded-lg p-3">
                    <MailIcon className="text-primary dark:text-primary-light h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-dark dark:text-dark-text mb-1 font-semibold">
                      E-Mail
                    </p>
                    <a
                      href="mailto:info@posaunenwerk-rheinland.de"
                      className="hover:text-primary dark:hover:text-primary-light text-gray-600 transition-colors dark:text-gray-400"
                    >
                      info@posaunenwerk-rheinland.de
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 dark:bg-primary/20 shrink-0 rounded-lg p-3">
                    <ClockIcon className="text-primary dark:text-primary-light h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-dark dark:text-dark-text mb-1 font-semibold">
                      Öffnungszeiten
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Mo - Fr: 9:00 - 16:00 Uhr
                      <br />
                      oder nach Vereinbarung
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schnellkontakt */}
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg">
              <h3 className="text-dark dark:text-dark-text mb-6 text-xl font-bold">
                Schnellkontakt
              </h3>

              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Haben Sie Fragen oder möchten Sie mehr erfahren? Nutzen Sie
                unser Kontaktformular oder wenden Sie sich direkt an uns.
              </p>

              <div className="space-y-4">
                <Link
                  href="/kontakt"
                  className="bg-primary hover:bg-primary-dark inline-flex w-full items-center justify-center rounded-lg px-6 py-3 font-semibold text-white transition-colors"
                >
                  Kontaktformular
                  <ArrowRightIcon className="mr-2 h-5 w-5" />
                </Link>

                <div className="flex gap-4">
                  <a
                    href="https://facebook.com/posaunenwerkrheinland"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-border inline-flex flex-1 items-center justify-center rounded-lg bg-gray-100 px-4 py-3 transition-colors hover:bg-gray-200"
                    aria-label="Facebook"
                  >
                    <svg
                      className="h-5 w-5"
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
                    className="text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-border inline-flex flex-1 items-center justify-center rounded-lg bg-gray-100 px-4 py-3 transition-colors hover:bg-gray-200"
                    aria-label="Instagram"
                  >
                    <svg
                      className="h-5 w-5"
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
                    className="text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-border inline-flex flex-1 items-center justify-center rounded-lg bg-gray-100 px-4 py-3 transition-colors hover:bg-gray-200"
                    aria-label="YouTube"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="bg-primary/10 dark:bg-primary/20 mt-6 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Tipp:</strong> Abonnieren Sie unseren Newsletter für
                  aktuelle Informationen und Termine!
                </p>
                <Link
                  href="/newsletter"
                  className="text-primary hover:text-primary-dark dark:hover:text-primary-light mt-2 inline-flex items-center text-sm font-semibold"
                >
                  Newsletter abonnieren
                  <ArrowRightIcon className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary dark:bg-primary-dark py-12 text-white md:py-16 lg:py-20">
        <div className="container text-center">
          <h2 className="mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
            Teil unserer Gemeinschaft werden?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg md:text-xl">
            Entdecke die Vielfalt der Posaunenchormusik und werde Teil unserer
            lebendigen Gemeinschaft!
          </p>
          <Link
            href="/mitmachen"
            className="text-primary inline-block rounded-lg bg-white px-8 py-3 font-semibold transition-colors hover:bg-gray-100"
          >
            Jetzt mitmachen
          </Link>
        </div>
      </section>
    </div>
  );
}
