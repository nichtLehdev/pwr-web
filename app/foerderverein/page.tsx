import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export default function FoerdervereinPage() {
  return (
    <div>
      <PageHeader
        title="Förderverein Rheinisches Posaunenwerk"
        color="foerderverein"
      />

      {/* Hero Section */}
      <section className="bg-foerderverein text-white py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Förderverein Rheinisches Posaunenwerk
            </h1>
            <p className="text-lg md:text-xl mb-8 leading-relaxed">
              Bläser für Bläser – Unterstützen Sie die Arbeit des Posaunenwerks
              und werden Sie Teil unserer Gemeinschaft!
            </p>
          </div>
        </div>
      </section>

      {/* Sonderaktionen 2025 */}
      <section className="py-12 md:py-16 lg:py-20 bg-primary/10">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-4">
                Sonderaktionen 2025
              </h2>
              <p className="text-lg text-gray-600">
                Jetzt Mitglied werden und von exklusiven Vorteilen profitieren!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-foerderverein">
                <div className="flex items-start gap-3 mb-4">
                  <svg
                    className="w-8 h-8 text-foerderverein shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-2">
                      Geschenk-CD für Neumitglieder
                    </h3>
                    <p className="text-gray-600 mb-3">
                      Wer bis zum <strong>31. Dezember 2025</strong> Mitglied
                      wird, erhält eine CD zum Bläserheft nach Wahl geschenkt!
                    </p>
                    <p className="text-sm text-gray-500">
                      Auswahl: England, Skandinavien, Osteuropa, Italien oder
                      Frankreich
                      <br />
                      <em>(Bitte bei der Anmeldung die Auswahl vermerken)</em>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-foerderverein">
                <div className="flex items-start gap-3 mb-4">
                  <svg
                    className="w-8 h-8 text-foerderverein shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                    />
                  </svg>
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-2">
                      Werbeaktion mit Verlosung
                    </h3>
                    <p className="text-gray-600 mb-3">
                      Wer bis <strong>Ende Juni 2025</strong> ein Mitglied
                      wirbt, bekommt die Chance auf einen der drei Hauptpreise!
                    </p>
                    <p className="text-sm text-gray-500">
                      Verlosung am <strong>12. Juli in Bonn</strong> während
                      unseres Fördervereintags
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <a
                href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                className="inline-flex items-center px-8 py-4 bg-foerderverein text-white font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-lg text-lg"
              >
                <svg
                  className="w-6 h-6 mr-2"
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
                Jetzt Mitglied werden
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Was wir tun */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-6 text-center">
              Was wir tun
            </h2>
            <p className="text-lg text-gray-600 text-center mb-12 leading-relaxed max-w-3xl mx-auto">
              Seit 2008 unterstützt der Förderverein das Posaunenwerk bei seinen
              Aufgaben. Durch zweckgebundene Spenden bauen wir einen
              Vermögensstock auf, mit dessen Erträgen wir die Arbeit des
              Posaunenwerks nachhaltig fördern.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
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
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark mb-3">
                  Auswahlchorarbeit
                </h3>
                <p className="text-gray-600">
                  Förderung junger, talentierter Bläserinnen und Bläser in
                  unseren Auswahlensembles wie dem Landesjugendposaunenchor und
                  ConSpirito.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark mb-3">
                  Geschwisterermäßigung
                </h3>
                <p className="text-gray-600">
                  25 € Ermäßigung pro weiteres Geschwisterkind bei Lehrgängen
                  des Posaunenwerks – der Förderverein gleicht den Betrag aus.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
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
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark mb-3">
                  Lehrgangskosten
                </h3>
                <p className="text-gray-600">
                  Bis zu 1.000 € pro Jahr zur Reduzierung der Teilnehmerbeiträge
                  für Lehrgänge – das hilft allen Teilnehmenden.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
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
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark mb-3">
                  Projektförderung
                </h3>
                <p className="text-gray-600">
                  CD-Produktionen, Drucksachen, Werbemittel und weitere Projekte
                  des Posaunenwerks – finanziert aus Mitteln des Fördervereins.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mitglied werden */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-6 text-center">
              Mitglied werden
            </h2>
            <p className="text-lg text-gray-600 text-center mb-12 leading-relaxed">
              Unterstützen Sie die Arbeit des Posaunenwerks kontinuierlich und
              werden Sie Teil unserer Gemeinschaft. Ihre Beiträge fließen direkt
              in Förderprojekte, Werbemittel und weitere wichtige Aufgaben.
            </p>

            <div className="bg-white rounded-lg shadow-xl p-8 md:p-12">
              <h3 className="text-2xl font-bold text-dark mb-6">
                Ihre Vorteile als Mitglied:
              </h3>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-foerderverein shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-gray-700">
                    <strong>Günstiger Jahresbeitrag für Chöre: nur 36 €</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-foerderverein shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-gray-700">
                    Einladung zur jährlichen Mitgliederversammlung mit Berichten
                    und Zukunftsplanungen
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-foerderverein shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-gray-700">
                    Flexible Kündigung möglich bis 3 Monate vor Jahresende
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <svg
                    className="w-6 h-6 text-foerderverein shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-gray-700">
                    <strong>2025:</strong> Geschenk-CD für Neumitglieder!
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                  className="inline-flex items-center justify-center px-8 py-3 bg-foerderverein text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
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
                  Mitglied werden
                </a>
                <a
                  href="/downloads/foerderverein-flyer.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-3 bg-white border-2 border-foerderverein text-foerderverein font-semibold rounded-lg hover:bg-foerderverein hover:text-white transition-colors"
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
                  Flyer herunterladen
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spenden & CD */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-12 text-center">
              Weitere Unterstützungsmöglichkeiten
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Spenden */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h3 className="text-2xl font-bold text-dark mb-4">
                  Spenden & Kollekten
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Gerne werden wir bei freudigen oder traurigen Anlässen als
                  Spendenempfänger benannt. Wir stellen Spendenbescheinigungen
                  aus und sind als steuerbegünstigt anerkannt.
                </p>

                <div className="bg-background-secondary rounded-lg p-4 mb-6">
                  <p className="font-semibold text-dark mb-2">
                    Bankverbindung:
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Förderverein Rheinisches Posaunenwerk e.V.
                    <br />
                    KD-Bank Dortmund
                    <br />
                    <strong>IBAN:</strong> DE65 3506 0190 1014 1990 19
                    <br />
                    <strong>BIC:</strong> GENODED1DKD
                  </p>
                </div>

                <p className="text-sm text-gray-500 italic">
                  Das Finanzamt Essen-Süd hat den Förderverein als
                  steuerbegünstigt anerkannt und berechtigt,
                  Spendenbescheinigungen auszustellen.
                </p>
              </div>

              {/* CD */}
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h3 className="text-2xl font-bold text-dark mb-4">
                  CD `&quot;`Unter Sternen und Satelliten`&quot;`
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Unsere Ensembles haben eine wunderbare CD eingespielt – mit
                  Trompeter <strong>Markus Stockhausen</strong> als Solist.
                  Komplett vom Förderverein finanziert!
                </p>
                <p className="text-gray-600 mb-6">
                  Die CD wurde bereits auf dem Deutschen Evangelischen
                  Posaunentag präsentiert und erhielt viel Applaus.
                </p>

                <div className="bg-foerderverein/10 rounded-lg p-4 mb-6">
                  <p className="text-2xl font-bold text-dark mb-1">15 €</p>
                  <p className="text-sm text-gray-600">
                    zzgl. 2 € Versandkostenpauschale
                  </p>
                </div>

                <a
                  href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=CD-Bestellung 'Unter Sternen und Satelliten'"
                  className="inline-flex items-center justify-center w-full px-6 py-3 bg-foerderverein text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
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
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Jetzt bestellen
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vorstand */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8 text-center">
              Unser Vorstand
            </h2>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-bold text-dark mb-1">Vorsitzender</h3>
                  <p className="text-gray-700">
                    Stefan Schmelting (Goch-Pfalzdorf)
                  </p>
                  <p className="text-sm text-gray-600">
                    Kuhstraße 74, 47574 Goch
                  </p>
                  <p className="text-sm text-gray-600">Tel: 0174 / 1832850</p>
                  <a
                    href="mailto:stefan.schmelting@posaunenwerk-rheinland.de"
                    className="text-primary hover:text-foerderverein text-sm font-semibold"
                  >
                    E-Mail senden →
                  </a>
                </div>

                <div>
                  <h3 className="font-bold text-dark mb-1">
                    Stv. Vorsitzender
                  </h3>
                  <p className="text-gray-700">Frank Beekmann (Bonn)</p>
                </div>

                <div>
                  <h3 className="font-bold text-dark mb-1">Schatzmeister</h3>
                  <p className="text-gray-700">Tim Neuhaus (Dinslaken)</p>
                  <p className="text-sm text-gray-600">
                    Ursulastraße 22, 46537 Dinslaken
                  </p>
                  <a
                    href="mailto:tim.neuhaus@ekir.de"
                    className="text-primary hover:text-foerderverein text-sm font-semibold"
                  >
                    E-Mail senden →
                  </a>
                </div>

                <div>
                  <h3 className="font-bold text-dark mb-1">Schriftführerin</h3>
                  <p className="text-gray-700">Birgit Münster (Geldern)</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-bold text-dark mb-3">Beisitzer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p className="text-gray-700">Eike Klein (Meerbusch)</p>
                  <p className="text-gray-700">Eberhard Petersen (Bonn)</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Sitz des Fördervereins:</strong> Zweigertstraße 52,
                  45130 Essen
                  <br />
                  Geführt beim Amtsgericht Essen, Aktenzeichen VR 4887
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-foerderverein text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Werden Sie Teil unserer Gemeinschaft!
            </h2>
            <p className="text-lg mb-8">
              Unterstützen Sie die Arbeit des Posaunenwerks und profitieren Sie
              von exklusiven Vorteilen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                className="inline-block px-8 py-3 bg-white text-foerderverein font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Mitglied werden
              </a>
              <Link
                href="/kontakt"
                className="inline-block px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
