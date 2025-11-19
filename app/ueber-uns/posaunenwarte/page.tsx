import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import Image from "next/image";
import { bezirke } from "@/lib/generalData";

export default function PosaunenwartePage() {
  const posaunenwarte = [
    {
      name: "Jörg Häusler",
      position: "Landesposaunenwart",
      districts: ["All Districts"],
      bio: 'Jörg Häusler (*1967), aufgewachsen im ostwestfälischen Espelkamp, wurde bereits im Alter von 16 Jahren als Jungstudent an der Musikhochschule Detmold aufgenommen. In den Jahren 1986 und 1987 erreichte er 1. Preise beim Bundeswettbewerb „Jugend musiziert" in der Ensemble- und der Solowertung. Er studierte Trompete, Instrumentalpädagogik und Musikvermittlung an den Musikhochschulen in Detmold und Essen. Seit 1995 war er als hauptamtlicher Posaunenchorleiter in der Zionsgemeinde Bethel (PC Eckardtsheim) tätig, bevor er 2003 als Landesposaunenwart in das Posaunenwerk der Evangelischen Kirche im Rheinland berufen wurde. Aufgrund seiner Verdienste für die evangelische Bläserarbeit erfolgte im Januar 2017 die Ernennung zum Kirchenmusikdirektor.',
      email: "lpw.haeusler@posaunenwerk-rheinland.de",
      phone: "",
      image: "/images/posaunenwarte/haeusler.jpg",
      color: "bg-primary",
      isLandesposaunenwart: true,
    },
    {
      name: "Sonia Singel-Roemer",
      position: "Regionalposaunenwartin",
      districts: bezirke.filter((b) => {
        return [2, 3, 4, 5].includes(b.id);
      }),
      bio: "Schon früh auf den Instrumenten Flöte, Klavier und Geige ausgebildet, begann Sonia Singel-Roemer im Alter von neun Jahren im Posaunenchor Trompete zu spielen. Später wechselte sie auf Tenorhorn und Posaune, auf der sie schließlich Unterricht bekam. Das Studium der Instrumentalpädagogik (Diplom 1998) und der Orchestermusik (Diplom 2001) mit Hauptfach Posaune an der Folkwang-Hochschule folgten. Während des Studiums erweiterte sie ihre Kenntnisse auf verschiedenen Meisterkursen (bei z.B. Alain Trudel und Michel Becquet). 2004 machte sie die Prüfung zur C-Kirchenmusikerin. Sonia E. Singel-Roemer ist als freiberufliche Posaunistin und Instrumentalpädagogin tätig und lebt mit ihrem Mann und ihren zwei Kindern in Ratingen.",
      email: "rpw.singel-roemer@posaunenwerk-rheinland.de",
      phone: "",
      image: "/images/posaunenwarte/singel-roemer.jpg",
      color: "bg-district-2",
    },
    {
      name: "Eike Klein",
      position: "Regionalposaunenwart",
      districts: bezirke.filter((b) => {
        return [6, 8, 9, 13].includes(b.id);
      }),
      bio: '„Lobet den Herrn mit Posaunen, lobet ihn mit Psalter und Harfe." – Dieses Credo der Posaunenchorarbeit begleitet mich seit frühester Kindheit. Ich studiere Trompete an der Robert Schumann Hochschule in Düsseldorf bei Prof. Peter Mönkediek. Musikalisch groß geworden bin ich in der lippischen Bläserarbeit, wo ich auch meine kirchenmusikalische Ausbildung zum C-Schein absolviert habe. Darüber hinaus leite ich mit viel Freude und Engagement den Posaunenchor Meerbusch-Lank. Posaunenchorarbeit ist für mich das gemeinsame Musizieren von Jung und Alt zum Lobe Gottes und ein lebendiger, freudiger und integrativer Bestandteil der Gemeinschaft.',
      email: "rpw.klein@posaunenwerk-rheinland.de",
      phone: "",
      image: "/images/posaunenwarte/klein.jpg",
      color: "bg-district-6",
    },
    {
      name: "Marion Kutscher",
      position: "Regionalposaunenwartin",
      districts: bezirke.filter((b) => {
        return [10, 11].includes(b.id);
      }),
      bio: "Marion Kutscher studierte im Hauptfach Trompete sowohl Instrumentalpädagogik in Düsseldorf als auch Orchestermusik in Duisburg. Schon während ihres Studiums spezialisierte sie sich bei Thibaud Robinne auf die Naturtrompete und deren historische Aufführungspraxis. Seitdem spielt sie in verschiedenen Ensembles im In- und Ausland. Hervorzuheben sind besonders Konzerte in Frankreich mit den Sopranistinnen Anne-Sophie von Otter und Cecilia Bartoli mit ihrem Orchester 'Les musiciens du prince'. Neben ihrer Tätigkeit als ausführende Künstlerin leitet sie seit 2010 den Bläserchor der Herrnhuter Brüdergemeine Neuwied und gibt auch Trompetenunterricht.",
      email: "rpw.kutscher@posaunenwerk-rheinland.de",
      phone: "",
      image: "/images/posaunenwarte/kutscher.jpg",
      color: "bg-district-10",
    },
    {
      name: "Matthias Schirg",
      position: "Regionalposaunenwart",
      districts: bezirke.filter((b) => {
        return [12].includes(b.id);
      }),
      bio: 'Matthias Schirg (*1996) betreut als Regionalposaunenwart den Bezirk 12 (Saar). Aufgewachsen im Saarland führte ihn der musikalische Weg nach den Anfängen in der Musikschule zum Posaunenchor und somit auch zum Posaunenwerk Rheinland. Er ist seit vielen Jahren Mitglied im Landesjugendposaunenchor Rheinland und regelmäßig Mitarbeiter bei verschiedenen Lehrgängen und Freizeiten. Sein Bachelorstudium mit Schwerpunkt „Instrumentalpädagogik" an der Musikhochschule des Saarlandes steht kurz vor dem Abschluss.',
      email: "rpw.schirg@posaunenwerk-rheinland.de",
      phone: "",
      image: "/images/posaunenwarte/schirg.jpg",
      color: "bg-district-12",
    },
    {
      name: "Gerald Münster",
      position: "Regionalposaunenwart",
      districts: bezirke.filter((b) => {
        return [1, 7].includes(b.id);
      }),
      bio: 'Gerald Münster, den die meisten nur unter seinem Spitznamen „Gerry" kennen, lebt mit seiner Familie in der Nähe von Duisburg-Friemersheim. Er spielt seit mehr als 40 Jahren Blechblasinstrumente, in erster Linie Trompete. Das eigentliche Hobby wurde mit der Zeit zu seiner persönlichen „Berufung". Als Seiteneinsteiger im Fachbereich Musik arbeitet er eng mit zwei Schulen im Duisburger Raum zusammen. Ein besonderes Anliegen ist die Nachwuchsarbeit, also die Betreuung von Jungbläsern jeden Alters.',
      email: "rpw.muenster@posaunenwerk-rheinland.de",
      phone: "02831 9783113",
      image: "/images/posaunenwarte/muenster.jpg",
      color: "bg-district-1",
    },
  ];

  return (
    <div>
      <PageHeader title="Posaunenwarte" color="primary" />

      {/* Hero Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white">
        <div className="container">
          <nav className="text-sm mb-4 flex items-center gap-2 opacity-90">
            <Link href="/" className="hover:text-white transition-colors">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/ueber-uns"
              className="hover:text-white transition-colors"
            >
              Über Uns
            </Link>
            <span>/</span>
            <span>Posaunenwarte</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Unsere Posaunenwarte
            </h1>
            <p className="text-lg md:text-xl leading-relaxed opacity-95">
              Die Posaunenwarte leiten das Posaunenwerk in musikalischer
              Hinsicht. Dabei liegt der Schwerpunkt ihrer Arbeit in der
              Weiterbildung der Bläser und Posaunenchorleiter. Dazu besuchen sie
              die Mitgliedschöre und bieten Lehrgänge und Freizeiten an. Das
              Posaunenwerk beschäftigt einen hauptamtlichen Landesposaunenwart
              und fünf nebenamtlich tätige Regionalposaunenwarte.
            </p>
          </div>
        </div>
      </section>

      {/* Landesposaunenwart */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-12 text-center">
            Landesposaunenwart
          </h2>

          {posaunenwarte
            .filter((pw) => pw.isLandesposaunenwart)
            .map((pw) => (
              <div
                key={pw.name}
                className="max-w-5xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Bild */}
                  <div className="lg:w-2/5">
                    <Image
                      src={pw.image}
                      alt={pw.name}
                      width={600}
                      height={600}
                      className="object-cover w-full h-full"
                    />
                  </div>

                  {/* Content */}
                  <div className="lg:w-3/5 p-8">
                    <div className="mb-4">
                      <span
                        className={`inline-block text-sm font-semibold text-white px-4 py-2 rounded-full ${pw.color}`}
                      >
                        {pw.position}
                      </span>
                    </div>

                    <h3 className="text-3xl font-bold text-dark mb-4">
                      {pw.name}
                    </h3>

                    <div className="mb-6">
                      <span className="inline-block text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                        Alle Bezirke
                      </span>
                    </div>

                    <p className="text-gray-600 leading-relaxed mb-6">
                      {pw.bio}
                    </p>

                    {/* Kontakt */}
                    <div className="space-y-2">
                      {pw.email && (
                        <a
                          href={`mailto:${pw.email}`}
                          className="flex items-center text-primary hover:text-primary-dark font-semibold"
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
                          E-Mail senden
                        </a>
                      )}
                      {pw.phone && (
                        <a
                          href={`tel:${pw.phone.replace(/\s/g, "")}`}
                          className="flex items-center text-gray-600 hover:text-primary"
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
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          {pw.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Regionalposaunenwarte */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-12 text-center">
            Regionalposaunenwarte
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {posaunenwarte
              .filter((pw) => !pw.isLandesposaunenwart)
              .map((pw) => (
                <article
                  key={pw.name}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                  {/* Bild */}
                  <div className={`${pw.color} h-64 relative`}>
                    <Image
                      src={pw.image}
                      alt={pw.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="mb-3">
                      <span
                        className={`inline-block text-xs font-semibold text-white px-3 py-1 rounded-full ${pw.color}`}
                      >
                        {pw.position}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-dark mb-3">
                      {pw.name}
                    </h3>

                    {/* Bezirke */}
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Betreute Bezirke:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pw.districts.map((district, idx) => (
                          <span
                            key={idx}
                            className={`text-xs font-semibold px-3 py-1 rounded-full ${pw.color}/20`}
                            style={{
                              color: pw.color.replace("bg-", "var(--color-"),
                            }}
                          >
                            {typeof district === "string"
                              ? district
                              : district.shortName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-gray-600 leading-relaxed mb-6 line-clamp-16">
                      {pw.bio}
                    </p>

                    {/* Kontakt */}
                    <div className="space-y-2">
                      {pw.email && (
                        <a
                          href={`mailto:${pw.email}`}
                          className="flex items-center text-sm text-primary hover:text-primary-dark font-semibold"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
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
                          E-Mail senden
                        </a>
                      )}
                      {pw.phone && (
                        <a
                          href={`tel:${pw.phone.replace(/\s/g, "")}`}
                          className="flex items-center text-sm text-gray-600 hover:text-primary"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
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
                          {pw.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      {/* Aufgaben */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-12 text-center">
            Aufgaben der Posaunenwarte
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
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
              <h3 className="text-lg font-bold text-dark mb-3">
                Weiterbildung
              </h3>
              <p className="text-gray-600">
                Weiterbildung der Bläser und Posaunenchorleiter durch Lehrgänge,
                Workshops und persönliche Betreuung.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-district-1 rounded-full flex items-center justify-center mb-4">
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
              <h3 className="text-lg font-bold text-dark mb-3">Chorbesuche</h3>
              <p className="text-gray-600">
                Regelmäßige Besuche der Mitgliedschöre zur musikalischen
                Unterstützung und Beratung vor Ort.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-district-2 rounded-full flex items-center justify-center mb-4">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-3">
                Lehrgänge & Freizeiten
              </h3>
              <p className="text-gray-600">
                Organisation und Durchführung von Lehrgängen, Workshops und
                musikalischen Freizeiten.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-district-3 rounded-full flex items-center justify-center mb-4">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-3">Beratung</h3>
              <p className="text-gray-600">
                Beratung zu musikalischen, organisatorischen und technischen
                Fragen der Posaunenchorarbeit.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-district-5 rounded-full flex items-center justify-center mb-4">
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
              <h3 className="text-lg font-bold text-dark mb-3">
                Musikalische Leitung
              </h3>
              <p className="text-gray-600">
                Leitung des Posaunenwerks in allen musikalischen Belangen und
                Pflege des musikalischen Standards.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-district-6 rounded-full flex items-center justify-center mb-4">
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-3">
                Nachwuchsförderung
              </h3>
              <p className="text-gray-600">
                Besondere Förderung der Jungbläserarbeit und des musikalischen
                Nachwuchses in den Bezirken.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            Fragen oder Anliegen?
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Unsere Posaunenwarte stehen Ihnen gerne für Fragen rund um die
            Posaunenchorarbeit zur Verfügung!
          </p>
          <Link
            href="/kontakt"
            className="inline-block px-8 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Kontakt aufnehmen
          </Link>
        </div>
      </section>
    </div>
  );
}
