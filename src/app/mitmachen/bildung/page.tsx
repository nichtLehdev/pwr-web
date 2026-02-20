import PublicPage from "@/app/_components/general/public-page";
import {
  BookOpenIcon,
  CalendarIcon,
  DownloadIcon,
  MusicIcon,
} from "lucide-react";
import { Globe2Icon, GiftIcon, MapPinIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { StarIcon } from "lucide-react";

export default function BildungPage() {
  const courseCategories = [
    {
      id: "blaeser",
      title: "Bläserkurse",
      description:
        "Von Anfänger bis Fortgeschrittene, von Jung bis Alt – Lehrgänge für alle Leistungsstufen",
      icon: <MusicIcon className="h-6 w-6" />,
      color: "bg-district-2",
    },
    {
      id: "chorleitung",
      title: "Chorleitung",
      description: "Ausbildung für Chorleiter und angehende Dirigenten",
      icon: <MusicIcon className="h-6 w-6" />,
      color: "bg-district-5",
    },
    {
      id: "workshops",
      title: "Workshops",
      description:
        "Spezialthemen wie Improvisation, Arrangement, Registerarbeit",
      icon: <MusicIcon className="h-6 w-6" />,
      color: "bg-district-6",
    },
    {
      id: "komponisten",
      title: "Komponistenportraits",
      description:
        "Musikalische Reisen durch Leben und Werk großer Komponisten",
      icon: <BookOpenIcon className="h-6 w-6" />,
      color: "bg-district-3",
    },
    {
      id: "studienfahrten",
      title: "Studienfahrten",
      description:
        "Musikalische Bildungsreisen zu besonderen Orten und Festivals",
      icon: <MapPinIcon className="h-6 w-6" />,
      color: "bg-primary",
    },
    {
      id: "freizeiten",
      title: "Bläserfreizeiten",
      description:
        "Gemeinsames Musizieren, Lernen und Erleben für alle Altersgruppen",
      icon: <Globe2Icon className="text-primary dark:text-dark-text h-6 w-6" />,
      color: "bg-district-9",
    },
  ];

  return (
    <PublicPage
      title="Aus- und Weiterbildung"
      color="district-2"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Mitmachen", href: "/mitmachen" },
        { label: "Aus- und Weiterbildung" },
      ]}
      description={
        <p>
          Das Posaunenwerk bietet ein umfangreiches Aus- und
          Weiterbildungsprogramm an. Verschiedene Workshops und ein- oder
          mehrtägige Lehrgänge richten sich an die Bläserinnen und Bläser
          und Chorleiter der Chöre im Rheinland. Ebenso gibt es spezielle
          Lehrgänge für junge Bläser und junggebliebene Anfänger jeden
          Alters.
        </p>
      }
    >
      {/* Hinweis: Offen für alle */}
      <section className="bg-primary/10 dark:bg-dark-background-secondary py-8">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <strong>Wichtig:</strong> Unser Angebot richtet sich nicht
              ausschließlich an Mitglieder des Posaunenwerks, sondern steht{" "}
              <strong>allen Interessierten offen</strong>!
            </p>
          </div>
        </div>
      </section>

      {/* Kurs-Kategorien */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Unsere Bildungsangebote
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600 dark:text-gray-400">
              Von Anfängerkursen bis zur Dirigenten-Ausbildung – finde das
              passende Angebot für dein musikalisches Weiterkommen.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courseCategories.map((category) => (
                <div
                  key={category.id}
                  className="dark:bg-dark-surface dark:border-dark-border rounded-lg border-t-4 bg-white p-6 shadow-lg transition-all hover:shadow-xl dark:border dark:shadow-none"
                  style={{
                    borderTopColor: `var(--color-${category.color.replace(
                      "bg-",
                      "",
                    )})`,
                  }}
                >
                  <div
                    className={`h-12 w-12 ${category.color} mb-4 flex items-center justify-center rounded-full`}
                  >
                    {category.icon}
                  </div>
                  <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                    {category.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {category.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Aktuelle Lehrgänge */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-8 text-center shadow-xl md:p-10 dark:border dark:shadow-none">
              <div className="bg-district-2 mb-6 inline-block rounded-full p-3">
                <CalendarIcon className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl">
                Aktuelle Lehrgänge & Anmeldung
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                Das aktuelle Angebot und Anmeldemöglichkeiten findest du in
                unserer Terminübersicht. Dort kannst du dich direkt für die
                Lehrgänge anmelden.
              </p>
              <Link
                href="/termine?type=courses"
                className="bg-district-2 inline-flex items-center rounded-lg px-8 py-4 font-bold text-white shadow-lg transition-opacity hover:opacity-90"
              >
                <CalendarIcon className="mr-2 h-5 w-5" />
                Zu den Lehrgängen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Leistungsstufen & Stempel */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-2xl font-bold md:text-3xl lg:text-4xl">
              Leistungsstufen & Stempel
            </h2>

            <div className="dark:bg-dark-surface dark:border-dark-border mb-6 rounded-lg bg-white p-8 shadow-lg dark:border dark:shadow-none">
              <div className="mb-6 flex items-start gap-4">
                <div className="bg-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <StarIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                    Aufbauende Ausbildung
                  </h3>
                  <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-400">
                    Begleitend zur Ausbildung eines (Jung-)Bläsers können
                    aufeinander aufbauende Leistungsstufen (Stempel) erworben
                    werden. Hierzu werden durch den Jungbläserausbilder,
                    Chorleiter oder Posaunenwart kleine Prüfungen abgehalten.
                  </p>
                  <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-400">
                    Die erreichte Leistungsstufe wird auf dem Mitgliedsausweis
                    durch einen Stempel dokumentiert.
                  </p>
                  <a
                    href="/downloads/leistungsstempel.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark inline-flex items-center font-semibold"
                  >
                    <DownloadIcon className="mr-2 h-5 w-5" />
                    Infos zu Leistungsstempeln herunterladen
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jungbläserausbildung */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-2xl font-bold md:text-3xl lg:text-4xl">
              Jungbläserausbildung
            </h2>

            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-8 shadow-lg dark:border dark:shadow-none">
              <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-400">
                Eine vom Landesposaunenwart und den Regionalposaunenwarten
                zusammengestellte Arbeitshilfe zum Thema Jungbläserausbildung
                versucht Antworten auf die vielen Fragen rund um das Thema zu
                geben:
              </p>

              <ul className="mb-6 space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full"></span>
                  <span>Wie generiere ich neue BläserInnen?</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full"></span>
                  <span>Beispielhafter Ablauf einer ersten Kontaktstunde</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full"></span>
                  <span>Verschiedene Kooperationsmodelle zur Ausbildung</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary mt-2 h-2 w-2 shrink-0 rounded-full"></span>
                  <span>
                    Wie integriere ich die jungen Menschen in den Posaunenchor?
                  </span>
                </li>
              </ul>

              <a
                href="/downloads/arbeitshilfe-jungblaeser.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-district-9 inline-flex items-center rounded-lg px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
              >
                <DownloadIcon className="mr-2 h-5 w-5" />
                Arbeitshilfe Jungbläser herunterladen
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Fördermöglichkeiten */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="bg-foerderverein/10 dark:bg-foerderverein/20 border-foerderverein rounded-lg border-l-4 p-8">
              <div className="flex items-start gap-4">
                <div className="bg-foerderverein flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <GiftIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                    Fördermöglichkeiten durch den Förderverein
                  </h3>
                  <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
                    Der Förderverein unterstützt die Bildungsarbeit des
                    Posaunenwerks! Geschwisterkinder erhalten eine Ermäßigung
                    von 25 € pro weiterem Kind bei der Anmeldung für Lehrgänge.
                    Zusätzlich trägt der Förderverein weitere Kosten, um die
                    Teilnehmerbeiträge für alle zu reduzieren.
                  </p>
                  <Link
                    href="/foerderverein"
                    className="text-foerderverein hover:text-foerderverein-dark inline-flex items-center font-semibold"
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
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-2xl font-bold md:text-3xl lg:text-4xl">
              Wichtige Hinweise & Downloads
            </h2>

            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-8 shadow-lg dark:border dark:shadow-none">
              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                    Für minderjährige Teilnehmer
                  </h3>
                  <p className="mb-4 text-gray-600 dark:text-gray-400">
                    Minderjährige Lehrgangsteilnehmer müssen vorab eine
                    ausgefüllte und unterzeichnete Zusatzerklärung einreichen.
                  </p>
                  <a
                    href="/downloads/zusatzerklaerung-minderjaehrige.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-dark inline-flex items-center font-semibold"
                  >
                    <DownloadIcon className="mr-2 h-5 w-5" />
                    Zusatzerklärung herunterladen
                  </a>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                    Fragen zur Ausbildung?
                  </h3>
                  <p className="mb-4 text-gray-600 dark:text-gray-400">
                    Unser Bildungsreferat berät dich gerne zu allen Fragen rund
                    um Aus- und Weiterbildung.
                  </p>
                  <Link
                    href="/kontakt"
                    className="bg-district-2 inline-flex items-center rounded-lg px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    <MailIcon className="mr-2 h-5 w-5" />
                    Kontakt aufnehmen
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
