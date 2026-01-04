import PageHeader from "@/app/_components/general/page-header";
import { BookOpenIcon, ComputerIcon, GlobeIcon, HeartIcon, MailIcon, Music2Icon, MusicIcon, PartyPopperIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

export default function EhrenamtPage() {
  const opportunities = [
    {
      id: "chorleitung",
      title: "Chorleitung",
      description:
        "Leite einen Posaunenchor und bringe deine musikalischen Fähigkeiten ein. Wir unterstützen dich mit Aus- und Weiterbildungsangeboten.",
      icon: (
        <MusicIcon
          className="h-6 w-6"
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
        <Music2Icon 
          className="h-6 w-6"
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
        <UsersIcon 
          className="h-6 w-6"
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
        <PartyPopperIcon 
          className="h-6 w-6"
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
        <GlobeIcon 
          className="h-6 w-6"
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
        <ComputerIcon
          className="h-6 w-6"
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
      <section className="bg-district-5 py-16 text-white md:py-24">
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
            <span>Ehrenamtlich engagieren</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Ehrenamtlich engagieren
            </h1>
            <p className="mb-6 text-lg leading-relaxed md:text-xl">
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
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Wo kannst du dich engagieren?
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600 dark:text-gray-400">
              Es gibt vielfältige Möglichkeiten, das Posaunenwerk mit deinen
              Fähigkeiten und deiner Zeit zu unterstützen.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg border-t-4 bg-white p-6 shadow-lg transition-all hover:shadow-xl"
                  style={{
                    borderTopColor: `var(--color-${opportunity.color.replace(
                      "bg-",
                      "",
                    )})`,
                  }}
                >
                  <div
                    className={`h-12 w-12 ${opportunity.color} mb-4 flex items-center justify-center rounded-full`}
                  >
                    {opportunity.icon}
                  </div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                    {opportunity.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {opportunity.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vorteile */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Warum ehrenamtlich engagieren?
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-district-5 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <HeartIcon
                        className="h-5 w-5 text-white"
                      />
                    </div>
                    <div>
                      <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Unterstützung */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-xl md:p-10">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Wir unterstützen dich!
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <BookOpenIcon
                      className="h-5 w-5 text-white"
                    />
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                      Aus- und Weiterbildung
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Wir bieten Schulungen und Fortbildungen an, damit du für
                      deine Aufgabe gut gerüstet bist.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <BookOpenIcon 
                      className="h-5 w-5 text-white"
                    />
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                      Vernetzung
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Tausche dich mit anderen Ehrenamtlichen aus und profitiere
                      von ihren Erfahrungen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <UsersIcon 
                      className="h-5 w-5 text-white"
                    />
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                      Begleitung
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Du bist nicht allein! Wir stehen dir mit Rat und Tat zur
                      Seite.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <UsersIcon 
                      className="h-5 w-5 text-white"
                    />
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-bold">
                      Anerkennung
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
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
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg md:p-10">
              <div className="mb-6 flex items-start gap-4">
                <MusicIcon 
                  className="h-12 w-12 text-primary"
                />
                <div>
                  <p className="mb-4 text-lg leading-relaxed text-gray-700 italic dark:text-gray-300">
                    &quot;Die Arbeit als Chorleiter erfüllt mich sehr. Es ist
                    wunderbar zu sehen, wie sich die Bläserinnen und Bläser
                    entwickeln und gemeinsam Musik machen. Die Unterstützung
                    durch das Posaunenwerk gibt mir Sicherheit und hilft mir,
                    immer besser zu werden.&quot;
                  </p>
                  <p className="text-dark dark:text-dark-text font-semibold">
                    Michael K., Chorleiter seit 2018
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kontakt CTA */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl lg:text-4xl">
              Bereit, dich einzubringen?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
              Wir freuen uns auf dein Engagement! Kontaktiere uns und lass uns
              gemeinsam herausfinden, wo und wie du dich am besten einbringen
              kannst.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/kontakt"
                className="bg-district-5 inline-flex items-center justify-center rounded-lg px-8 py-4 font-bold text-white shadow-lg transition-opacity hover:opacity-90"
              >
                <MailIcon 
                  className="mr-2 h-5 w-5"
                />
                Jetzt Kontakt aufnehmen
              </Link>
              <Link
                href="/mitmachen/bildung"
                className="border-district-5 text-district-5 hover:bg-district-5 inline-flex items-center justify-center rounded-lg border-2 bg-white px-8 py-4 font-semibold transition-colors hover:text-white"
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
