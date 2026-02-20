import PublicPage from "@/app/_components/general/public-page";
import {
  BookOpenIcon,
  BrainIcon,
  CalendarIcon,
  ChurchIcon,
  DownloadIcon,
  MailIcon,
  Music2Icon,
  Music3Icon,
  MusicIcon,
  PartyPopperIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

export default function JungblaserPage() {
  const offerings = [
    {
      id: "kurse",
      title: "Bläserkurse für Kinder & Jugendliche",
      description:
        "Spielerisch ein Blechblasinstrument erlernen – von den ersten Tönen bis zum gemeinsamen Musizieren.",
      icon: <MusicIcon className="h-6 w-6" />,
    },
    {
      id: "freizeiten",
      title: "Jungbläserfreizeiten",
      description:
        "Gemeinsam Musik machen, neue Freunde finden und unvergessliche Erlebnisse teilen.",
      icon: <PartyPopperIcon className="h-6 w-6" />,
    },
    {
      id: "ensembles",
      title: "Jungbläserensembles",
      description:
        "In kleinen Gruppen gemeinsam musizieren und von erfahrenen Dozenten lernen.",
      icon: <UsersIcon className="h-6 w-6" />,
    },
    {
      id: "workshops",
      title: "Workshops & Projekte",
      description:
        "Spannende Themen wie Improvisation, Rhythmik oder Musik und Bewegung für junge Bläser.",
      icon: <Music2Icon className="h-6 w-6" />,
    },
  ];

  const benefits = [
    {
      title: "Musikalische Grundlagen",
      description:
        "Kinder und Jugendliche lernen Notenlesen, Rhythmus und erwerben ein fundiertes musikalisches Verständnis.",
      icon: <Music3Icon className="h-6 w-6" />,
    },
    {
      title: "Gemeinschaft erleben",
      description:
        "Im Chor entstehen Freundschaften, Teamgeist und ein starkes Zusammengehörigkeitsgefühl.",
      icon: <UsersIcon className="h-6 w-6" />,
    },
    {
      title: "Persönliche Entwicklung",
      description:
        "Musik fördert Konzentration, Disziplin, Selbstbewusstsein und Kreativität.",
      icon: <BrainIcon className="h-6 w-6" />,
    },
    {
      title: "Glauben leben",
      description:
        "Junge Menschen erleben, wie Musik und Glaube zusammengehören und Gottesdienste mitgestalten können.",
      icon: <ChurchIcon className="h-6 w-6" />,
    },
  ];

  return (
    <PublicPage
      title="Jungbläserarbeit"
      color="district-9"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Mitmachen", href: "/mitmachen" },
        { label: "Jungbläserarbeit" },
      ]}
      heroTitle="Jungbläserarbeit – Musik von Anfang an"
      description={
        <>
          <p>
            Kinder und Jugendliche für die Musik zu begeistern ist uns ein
            besonderes Anliegen. In unseren Posaunenchören finden junge
            Menschen einen Ort, an dem sie gemeinsam musizieren, lernen und
            wachsen können.
          </p>
          <p>
            Von den ersten Tönen auf dem Instrument bis zum gemeinsamen
            Auftritt – wir begleiten junge Bläserinnen und Bläser auf ihrem
            musikalischen Weg.
          </p>
        </>
      }
    >
      {/* Was ist Jungbläserarbeit */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl lg:text-4xl">
              Was ist Jungbläserarbeit?
            </h2>
            <div className="prose prose-lg max-w-none leading-relaxed text-gray-600 dark:text-gray-400">
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
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Unsere Angebote für Jungbläser
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600 dark:text-gray-400">
              Vielfältige Möglichkeiten für Kinder und Jugendliche, die Welt der
              Blechblasinstrumente zu entdecken.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {offerings.map((offering) => (
                <div
                  key={offering.id}
                  className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-lg transition-all hover:shadow-xl"
                >
                  <div className="bg-district-9 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                    {offering.icon}
                  </div>
                  <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                    {offering.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {offering.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/termine?type=courses&category=Anfänger"
                className="bg-district-9 inline-flex items-center rounded-lg px-8 py-4 font-bold text-white shadow-lg transition-opacity hover:opacity-90"
              >
                <CalendarIcon className="mr-2 h-5 w-5" />
                Aktuelle Termine für Jungbläser
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Warum Jungbläserarbeit */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Warum Jungbläserarbeit?
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md"
                >
                  <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                    {benefit.icon}
                  </div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Für Chorleiter & Ausbilder */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-2xl font-bold md:text-3xl lg:text-4xl">
              Für Chorleiter & Ausbilder
            </h2>

            <div className="space-y-6">
              {/* Arbeitshilfe */}
              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-district-9 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                    <BookOpenIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                      Arbeitshilfe Jungbläserausbildung
                    </h3>
                    <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-400">
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
                      <DownloadIcon className="mr-2 h-5 w-5" />
                      Arbeitshilfe herunterladen
                    </a>
                  </div>
                </div>
              </div>

              {/* Leistungsstempel */}
              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="bg-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                    <StarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                      Leistungsstempel-System
                    </h3>
                    <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-400">
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
              <div className="bg-primary/10 dark:bg-primary/20 border-primary rounded-lg border-l-4 p-8">
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Beratung & Unterstützung
                </h3>
                <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
                  Unser Referent für Jungbläserarbeit steht Ihnen bei allen
                  Fragen rund um die Ausbildung junger Bläserinnen und Bläser
                  zur Seite. Von der Konzeption bis zur praktischen Umsetzung –
                  wir unterstützen Sie gerne!
                </p>
                <Link
                  href="/kontakt"
                  className="bg-primary hover:bg-primary-dark inline-flex items-center rounded-lg px-6 py-3 font-semibold text-white transition-colors"
                >
                  <MailIcon className="mr-2 h-5 w-5" />
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
    </PublicPage>
  );
}
