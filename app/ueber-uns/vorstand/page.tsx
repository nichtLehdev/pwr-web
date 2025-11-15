import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import Image from "next/image";

export default function VorstandPage() {
  const vorstandMembers = [
    {
      name: "Friedemann Schmidt-Eggert",
      position: "Landesobmann",
      description:
        "Der Landesobmann vertritt das Posaunenwerk nach außen und innen und leitet den Vorstand. Er koordiniert die Arbeit und ist Ansprechpartner für überregionale Themen.",
      email: "landesobmann@posaunenwerk-rheinland.de",
      phone: "02644-9990785",
      image: "/images/vorstand/schmidt-eggert.jpg",
      color: "bg-primary",
    },
    {
      name: "Beate Ising",
      position: "Stellvertretende Landesobfrau",
      description:
        "Unterstützt den Landesobmann in allen Belangen und vertritt ihn bei Bedarf. Koordiniert spezielle Projekte und Arbeitskreise.",
      email: "stellv.landesobfrau@posaunenwerk-rheinland.de",
      phone: "02297-7221",
      image: "/images/vorstand/ising.jpg",
      color: "bg-district-1",
    },
    {
      name: "Dietmar Persian",
      position: "Stellvertretender Landesobmann",
      description:
        "Unterstützt den Landesobmann in allen Belangen und vertritt ihn bei Bedarf. Koordiniert spezielle Projekte und Arbeitskreise.",
      email: "stellv.landesobmann@posaunenwerk-rheinland.de",
      phone: "02192-7491",
      image: "/images/vorstand/persian.jpg",
      color: "bg-district-2",
    },
    {
      name: "Frank Beekmann",
      position: "Schatzmeister",
      description:
        "Verwaltet die Finanzen des Posaunenwerks, erstellt den Haushaltsplan und sorgt für die ordnungsgemäße Buchführung.",
      email: "schatzmeister@posaunenwerk-rheinland.de",
      phone: "0228-85098516",
      image: "/images/vorstand/beekmann.jpg",
      color: "bg-district-3",
    },
    {
      name: "Tim Neuhaus",
      position: "Geschäftsführer",
      description:
        "Verantwortlich für die operative Geschäftsführung und Koordination der täglichen Abläufe im Posaunenwerk.",
      email: "geschaeftsfuehrer@posaunenwerk-rheinland.de",
      phone: "0176-72213949",
      image: "/images/vorstand/neuhaus.png",
      color: "bg-district-5",
    },
  ];

  return (
    <div>
      <PageHeader title="Vorstand" color="district-1" />

      {/* Hero Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-district-1 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Der Vorstand des Posaunenwerks
            </h1>
            <p className="text-lg md:text-xl leading-relaxed opacity-95 mb-6">
              Der Vorstand führt im Auftrag des Landesposaunenrates die
              laufenden Geschäfte des Posaunenwerkes. Dazu führt er die
              Beschlüsse der Vertreterversammlung und des Landesposaunenrates
              aus und erstattet ihm Bericht.
            </p>
            <p className="text-lg md:text-xl leading-relaxed opacity-95">
              Er kann unaufschiebbare Entscheidungen treffen, wenn dies
              notwendig ist. Der Landesobmann vertritt das Posaunenwerk nach
              außen und innen. Genau wie die Mitglieder der Vertreterversammlung
              und des Landesposaunenrates arbeitet der Vorstand ehrenamtlich.
            </p>
          </div>
        </div>
      </section>

      {/* Vorstandsmitglieder */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-12 text-center">
            Die Vorstandsmitglieder
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {vorstandMembers.map((member, index) => (
              <article
                key={index}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
              >
                <div className={`h-64 ${member.color} relative`}>
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-2xl font-bold text-dark mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm font-semibold text-primary mb-3">
                    {member.position}
                  </p>
                  {/* Kontakt Info */}
                  <div className="mt-auto flex flex-col flex-wrap gap-x-4 gap-y-1">
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center text-sm text-gray-700 hover:text-primary transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2 shrink-0"
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
                    <a
                      href={`tel:${member.phone.replace(/[^0-9+]/g, "")}`}
                      className="flex items-center text-sm text-gray-700 hover:text-primary transition-colors"
                    >
                      <svg
                        className="w-4 h-4 mr-2 shrink-0"
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
                      {member.phone}
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 p-6 bg-primary/10 rounded-lg max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <svg
                className="w-6 h-6 text-primary shrink-0 mt-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-bold text-dark mb-2">
                  Kontakt zum Vorstand
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Bei Fragen oder Anliegen an den Vorstand wenden Sie sich gerne
                  per E-Mail an{" "}
                  <a
                    href="mailto:info@posaunenwerk-rheinland.de"
                    className="text-primary hover:text-primary-dark font-semibold"
                  >
                    info@posaunenwerk-rheinland.de
                  </a>{" "}
                  oder telefonisch an unsere{" "}
                  <Link
                    href="/kontakt"
                    className="text-primary hover:text-primary-dark font-semibold"
                  >
                    Geschäftsstelle
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Aufgaben des Vorstands */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-12 text-center">
            Aufgaben des Vorstands
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-3">
                Geschäftsführung
              </h3>
              <p className="text-gray-600">
                Führt die laufenden Geschäfte des Posaunenwerkes im Auftrag des
                Landesposaunenrates.
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-3">
                Beschlussumsetzung
              </h3>
              <p className="text-gray-600">
                Setzt die Beschlüsse der Vertreterversammlung und des
                Posaunenrates um und berichtet darüber.
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-3">
                Eilentscheidungen
              </h3>
              <p className="text-gray-600">
                Trifft unaufschiebbare Entscheidungen, wenn dies notwendig ist,
                bis zur nächsten Sitzung.
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-3">
                Vertretung nach außen
              </h3>
              <p className="text-gray-600">
                Der Landesobmann vertritt das Posaunenwerk nach außen und innen
                gegenüber allen Institutionen.
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-3">
                Berichterstattung
              </h3>
              <p className="text-gray-600">
                Erstattet regelmäßig Bericht an den Posaunenrat über die Arbeit
                und Entwicklung des Posaunenwerks.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="w-12 h-12 bg-foerderverein rounded-full flex items-center justify-center mb-4">
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
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-3">
                Ehrenamtliche Arbeit
              </h3>
              <p className="text-gray-600">
                Alle Vorstandsmitglieder arbeiten ehrenamtlich und engagieren
                sich aus Überzeugung für die Posaunenchorarbeit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Organisationsstruktur Info */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8 text-center">
              Organisationsstruktur
            </h2>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark mb-2">
                      Vertreterversammlung
                    </h3>
                    <p className="text-gray-600">
                      Oberstes Organ des Posaunenwerkes. Kommt mindestens einmal
                      jährlich zusammen, beschließt über die Satzung und wählt
                      die Sachverständigen in den Posaunenrat.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-district-1 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark mb-2">
                      Landesposaunenrat
                    </h3>
                    <p className="text-gray-600">
                      Leitet das Posaunenwerk und trifft Entscheidungen über
                      Grundsätze und Ziele. Berät den Vorstand und kontrolliert
                      die Ausführung der Beschlüsse.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-district-2 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark mb-2">
                      Vorstand
                    </h3>
                    <p className="text-gray-600">
                      Führt die laufenden Geschäfte des Posaunenwerkes und setzt
                      die Beschlüsse um. Der Landesobmann vertritt das
                      Posaunenwerk nach außen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-district-3 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark mb-2">
                      Posaunenwarte
                    </h3>
                    <p className="text-gray-600">
                      Leiten das Posaunenwerk in musikalischer Hinsicht mit
                      Schwerpunkt auf Weiterbildung der Bläser und
                      Posaunenchorleiter.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/ueber-uns/posaunenrat"
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Zum Posaunenrat
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
                  <Link
                    href="/ueber-uns/struktur"
                    className="inline-flex items-center justify-center px-6 py-3 bg-transparent border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors"
                  >
                    Struktur & Geschichte
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
            Interesse an einer Mitarbeit?
          </h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Viele Funktionen im Posaunenwerk werden ehrenamtlich ausgefüllt.
            Wenn Sie Interesse haben, sich einzubringen, freuen wir uns über
            Ihre Kontaktaufnahme!
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
