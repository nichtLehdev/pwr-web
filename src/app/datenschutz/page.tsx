import Link from "next/link";
import PageHeader from "../_components/general/page-header";

export const metadata = {
  title: "Datenschutzerklärung | Posaunenwerk Rheinland",
  description:
    "Datenschutzerklärung und Informationen zum Umgang mit personenbezogenen Daten",
};

export default function DatenschutzPage() {
  return (
    <div>
      <PageHeader title="Datenschutzerklärung" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary py-16 text-white md:py-24">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <span>Datenschutzerklärung</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Datenschutzerklärung
            </h1>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Informationen zum Datenschutz und zur Verarbeitung
              personenbezogener Daten gemäß Art. 13 DSGVO
            </p>
          </div>
        </div>
      </section>

      {/* Einleitung */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Allgemeine Hinweise
              </h2>

              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p className="leading-relaxed">
                  Wir freuen uns über Ihr Interesse an unserer Website. Der
                  Schutz Ihrer personenbezogenen Daten ist uns ein wichtiges
                  Anliegen. Im Folgenden informieren wir Sie ausführlich über
                  den Umgang mit Ihren Daten.
                </p>
                <p className="leading-relaxed">
                  Die folgenden Hinweise geben einen einfachen Überblick
                  darüber, was mit Ihren personenbezogenen Daten passiert, wenn
                  Sie unsere Website besuchen. Personenbezogene Daten sind alle
                  Daten, mit denen Sie persönlich identifiziert werden können.
                  Ausführliche Informationen zum Thema Datenschutz entnehmen Sie
                  unserer unter diesem Text aufgeführten Datenschutzerklärung.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verantwortliche Stelle */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                1. Verantwortliche Stelle
              </h2>

              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Die verantwortliche Stelle für die Datenverarbeitung auf
                  dieser Website ist:
                </p>

                <div className="dark:border-dark-border rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border dark:bg-gray-800/30">
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-dark dark:text-dark-text">
                      Evangelisches Posaunenwerk in der Evangelischen Kirche im
                      Rheinland
                    </strong>
                    <br />
                    Rudolf-Harbig-Str. 20
                    <br />
                    56179 Vallendar
                    <br />
                    Deutschland
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Telefon:</strong>{" "}
                      <a
                        href="tel:02613000011"
                        className="text-primary hover:underline"
                      >
                        0261 300 00 11
                      </a>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>E-Mail:</strong>{" "}
                      <a
                        href="mailto:info@posaunenwerk-rheinland.de"
                        className="text-primary hover:underline"
                      >
                        info@posaunenwerk-rheinland.de
                      </a>
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Verantwortliche Stelle ist die natürliche oder juristische
                  Person, die allein oder gemeinsam mit anderen über die Zwecke
                  und Mittel der Verarbeitung von personenbezogenen Daten (z.B.
                  Namen, E-Mail-Adressen o. Ä.) entscheidet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Datenerfassung */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                2. Datenerfassung auf unserer Website
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    2.1 Wie erfassen wir Ihre Daten?
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Ihre Daten werden zum einen dadurch erhoben, dass Sie uns
                      diese mitteilen. Hierbei kann es sich z.B. um Daten
                      handeln, die Sie in ein Kontaktformular eingeben oder bei
                      einer Registrierung angeben.
                    </p>
                    <p className="leading-relaxed">
                      Andere Daten werden automatisch beim Besuch der Website
                      durch unsere IT-Systeme erfasst. Das sind vor allem
                      technische Daten (z.B. Internetbrowser, Betriebssystem
                      oder Uhrzeit des Seitenaufrufs). Die Erfassung dieser
                      Daten erfolgt automatisch, sobald Sie unsere Website
                      betreten.
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    2.2 Wofür nutzen wir Ihre Daten?
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Ein Teil der Daten wird erhoben, um eine fehlerfreie
                      Bereitstellung der Website zu gewährleisten. Andere Daten
                      können zur Analyse Ihres Nutzerverhaltens verwendet
                      werden.
                    </p>
                    <p className="leading-relaxed">
                      Personenbezogene Daten, die Sie uns über Kontaktformulare
                      mitteilen, werden ausschließlich zur Bearbeitung Ihrer
                      Anfrage und für den Fall von Anschlussfragen bei uns
                      gespeichert.
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    2.3 Welche Rechte haben Sie bezüglich Ihrer Daten?
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Sie haben jederzeit das Recht, unentgeltlich Auskunft über
                      Herkunft, Empfänger und Zweck Ihrer gespeicherten
                      personenbezogenen Daten zu erhalten. Sie haben außerdem
                      ein Recht, die Berichtigung, Sperrung oder Löschung dieser
                      Daten zu verlangen. Hierzu sowie zu weiteren Fragen zum
                      Thema Datenschutz können Sie sich jederzeit unter der im
                      Impressum angegebenen Adresse an uns wenden. Des Weiteren
                      steht Ihnen ein Beschwerderecht bei der zuständigen
                      Aufsichtsbehörde zu.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Server-Log-Dateien */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                3. Hosting und Server-Log-Dateien
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    3.1 Hosting
                  </h3>
                  <p className="mb-3 text-gray-700 dark:text-gray-300">
                    Diese Website wird extern gehostet. Die personenbezogenen
                    Daten, die auf dieser Website erfasst werden, werden auf den
                    Servern des Hosters gespeichert. Hierbei kann es sich v.a.
                    um IP-Adressen, Kontaktanfragen, Meta- und
                    Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen,
                    Webseitenzugriffe und sonstige Daten, die über eine Website
                    generiert werden, handeln.
                  </p>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    3.2 Server-Log-Dateien
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Der Provider der Seiten erhebt und speichert automatisch
                      Informationen in so genannten Server-Log-Dateien, die Ihr
                      Browser automatisch an uns übermittelt. Dies sind:
                    </p>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>Browsertyp und Browserversion</li>
                      <li>Verwendetes Betriebssystem</li>
                      <li>Referrer URL (die zuvor besuchte Seite)</li>
                      <li>Hostname des zugreifenden Rechners</li>
                      <li>Uhrzeit der Serveranfrage</li>
                      <li>IP-Adresse</li>
                    </ul>
                    <p className="leading-relaxed">
                      Eine Zusammenführung dieser Daten mit anderen Datenquellen
                      wird nicht vorgenommen. Die Erfassung dieser Daten erfolgt
                      auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der
                      Websitebetreiber hat ein berechtigtes Interesse an der
                      technisch fehlerfreien Darstellung und der Optimierung
                      seiner Website – hierzu müssen die Server-Log-Files
                      erfasst werden.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kontaktformular */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                4. Kontaktformular und E-Mail-Kontakt
              </h2>

              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p className="leading-relaxed">
                  Wenn Sie uns per Kontaktformular oder E-Mail Anfragen zukommen
                  lassen, werden Ihre Angaben aus dem Anfrageformular inklusive
                  der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung
                  der Anfrage und für den Fall von Anschlussfragen bei uns
                  gespeichert.
                </p>
                <p className="leading-relaxed">
                  Diese Daten geben wir nicht ohne Ihre Einwilligung weiter. Die
                  Verarbeitung der in das Kontaktformular eingegebenen Daten
                  erfolgt somit ausschließlich auf Grundlage Ihrer Einwilligung
                  (Art. 6 Abs. 1 lit. a DSGVO). Sie können diese Einwilligung
                  jederzeit widerrufen. Dazu reicht eine formlose Mitteilung per
                  E-Mail an uns. Die Rechtmäßigkeit der bis zum Widerruf
                  erfolgten Datenverarbeitungsvorgänge bleibt vom Widerruf
                  unberührt.
                </p>
                <p className="leading-relaxed">
                  Die von Ihnen im Kontaktformular eingegebenen Daten verbleiben
                  bei uns, bis Sie uns zur Löschung auffordern, Ihre
                  Einwilligung zur Speicherung widerrufen oder der Zweck für die
                  Datenspeicherung entfällt (z.B. nach abgeschlossener
                  Bearbeitung Ihrer Anfrage). Zwingende gesetzliche Bestimmungen
                  – insbesondere Aufbewahrungsfristen – bleiben unberührt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Registrierung und Login */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                5. Registrierung und Login
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    5.1 Benutzerkonten
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Sie haben die Möglichkeit, sich auf unserer Website zu
                      registrieren. Hierbei werden die bei der Registrierung
                      eingegebenen Daten bei uns gespeichert. Diese Daten werden
                      ausschließlich für die Nutzung unseres Angebots verwendet.
                    </p>
                    <p className="leading-relaxed">
                      Bei der Registrierung werden folgende Pflichtangaben
                      erhoben:
                    </p>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>Name</li>
                      <li>E-Mail-Adresse</li>
                      <li>Passwort (verschlüsselt gespeichert)</li>
                    </ul>
                    <p className="leading-relaxed">
                      Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1
                      lit. a DSGVO mit Ihrer Einwilligung. Sie können Ihre
                      Einwilligung jederzeit durch eine Nachricht an die im
                      Impressum angegebene Kontaktadresse widerrufen.
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    5.2 Passwort-Sicherheit
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Ihre Passwörter werden mit modernen kryptografischen
                      Verfahren (bcrypt) verschlüsselt gespeichert. Wir haben zu
                      keinem Zeitpunkt Zugriff auf Ihr Klartext-Passwort.
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    5.3 Löschung von Daten
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Die bei der Registrierung erfassten Daten werden von uns
                      gespeichert, solange Sie auf unserer Website registriert
                      sind und werden anschließend gelöscht. Sie können Ihr
                      Benutzerkonto jederzeit löschen lassen. Gesetzliche
                      Aufbewahrungsfristen bleiben unberührt.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                6. Newsletter
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    6.1 Newsletter-Daten
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Wenn Sie den auf der Website angebotenen Newsletter
                      beziehen möchten, benötigen wir von Ihnen eine
                      E-Mail-Adresse sowie Informationen, welche uns die
                      Überprüfung gestatten, dass Sie der Inhaber der
                      angegebenen E-Mail-Adresse sind und mit dem Empfang des
                      Newsletters einverstanden sind.
                    </p>
                    <p className="leading-relaxed">
                      Die Datenverarbeitung zum Zwecke des Newsletter-Versands
                      erfolgt auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1
                      lit. a DSGVO). Eine erteilte Einwilligung zur Speicherung
                      der Daten, der E-Mail-Adresse sowie deren Nutzung zum
                      Versand des Newsletters können Sie jederzeit widerrufen.
                      In jedem Newsletter findet sich dazu ein entsprechender
                      Link.
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    6.2 Double-Opt-In-Verfahren
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Die Anmeldung zu unserem Newsletter erfolgt in einem
                      Double-Opt-In-Verfahren. Das heißt, Sie erhalten nach der
                      Anmeldung eine E-Mail, in der Sie um die Bestätigung Ihrer
                      Anmeldung gebeten werden. Diese Bestätigung ist notwendig,
                      damit sich niemand mit fremden E-Mail-Adressen anmelden
                      kann.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cookies */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                7. Cookies
              </h2>

              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p className="leading-relaxed">
                  Unsere Internetseiten verwenden teilweise so genannte Cookies.
                  Cookies richten auf Ihrem Rechner keinen Schaden an und
                  enthalten keine Viren. Cookies dienen dazu, unser Angebot
                  nutzerfreundlicher, effektiver und sicherer zu machen. Cookies
                  sind kleine Textdateien, die auf Ihrem Rechner abgelegt werden
                  und die Ihr Browser speichert.
                </p>
                <p className="leading-relaxed">
                  Die meisten der von uns verwendeten Cookies sind so genannte
                  &quot;Session-Cookies&quot;. Sie werden nach Ende Ihres
                  Besuchs automatisch gelöscht. Andere Cookies bleiben auf Ihrem
                  Endgerät gespeichert bis Sie diese löschen. Diese Cookies
                  ermöglichen es uns, Ihren Browser beim nächsten Besuch
                  wiederzuerkennen.
                </p>
                <p className="leading-relaxed">
                  Sie können Ihren Browser so einstellen, dass Sie über das
                  Setzen von Cookies informiert werden und Cookies nur im
                  Einzelfall erlauben, die Annahme von Cookies für bestimmte
                  Fälle oder generell ausschließen sowie das automatische
                  Löschen der Cookies beim Schließen des Browsers aktivieren.
                  Bei der Deaktivierung von Cookies kann die Funktionalität
                  dieser Website eingeschränkt sein.
                </p>

                <div className="dark:border-dark-border mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border dark:bg-gray-800/30">
                  <h4 className="text-dark dark:text-dark-text mb-2 font-semibold">
                    Verwendete Cookies
                  </h4>
                  <ul className="ml-6 list-disc space-y-2 text-sm">
                    <li>
                      <strong>Session-Cookies:</strong> Für die
                      Aufrechterhaltung Ihrer Sitzung (notwendig für
                      Login-Funktionen)
                    </li>
                    <li>
                      <strong>Theme-Präferenz:</strong> Speicherung Ihrer
                      Dark/Light-Mode-Einstellung
                    </li>
                    <li>
                      <strong>Authentifizierung:</strong> Sichere Anmeldung und
                      Session-Management
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SSL/TLS-Verschlüsselung */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                8. SSL- bzw. TLS-Verschlüsselung
              </h2>

              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p className="leading-relaxed">
                  Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der
                  Übertragung vertraulicher Inhalte, wie zum Beispiel Anfragen,
                  die Sie an uns als Seitenbetreiber senden, eine SSL-bzw.
                  TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen
                  Sie daran, dass die Adresszeile des Browsers von
                  &quot;http://&quot; auf &quot;https://&quot; wechselt und an
                  dem Schloss-Symbol in Ihrer Browserzeile.
                </p>
                <p className="leading-relaxed">
                  Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können
                  die Daten, die Sie an uns übermitteln, nicht von Dritten
                  mitgelesen werden.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ihre Rechte */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                9. Ihre Rechte als betroffene Person
              </h2>

              <div className="space-y-6">
                <p className="text-gray-700 dark:text-gray-300">
                  Sie haben nach der DSGVO verschiedene Rechte. Diese ergeben
                  sich insbesondere aus den Artikeln 15 bis 21 DSGVO:
                </p>

                <div className="space-y-4">
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-semibold">
                      Recht auf Auskunft (Art. 15 DSGVO)
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Sie haben das Recht, Auskunft über Ihre von uns
                      verarbeiteten personenbezogenen Daten zu verlangen.
                    </p>
                  </div>

                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-semibold">
                      Recht auf Berichtigung (Art. 16 DSGVO)
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Sie haben das Recht, die Berichtigung unrichtiger oder die
                      Vervollständigung Ihrer bei uns gespeicherten
                      personenbezogenen Daten zu verlangen.
                    </p>
                  </div>

                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-semibold">
                      Recht auf Löschung (Art. 17 DSGVO)
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Sie haben das Recht, die Löschung Ihrer bei uns
                      gespeicherten personenbezogenen Daten zu verlangen, soweit
                      nicht die weitere Verarbeitung erforderlich ist.
                    </p>
                  </div>

                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-semibold">
                      Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Sie haben das Recht, die Einschränkung der Verarbeitung
                      Ihrer personenbezogenen Daten zu verlangen.
                    </p>
                  </div>

                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-semibold">
                      Recht auf Datenübertragbarkeit (Art. 20 DSGVO)
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Sie haben das Recht, die Sie betreffenden
                      personenbezogenen Daten in einem strukturierten, gängigen
                      und maschinenlesbaren Format zu erhalten.
                    </p>
                  </div>

                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-semibold">
                      Widerspruchsrecht (Art. 21 DSGVO)
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Sie haben das Recht, aus Gründen, die sich aus Ihrer
                      besonderen Situation ergeben, jederzeit gegen die
                      Verarbeitung Sie betreffender personenbezogener Daten
                      Widerspruch einzulegen.
                    </p>
                  </div>

                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-semibold">
                      Beschwerderecht bei einer Aufsichtsbehörde
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Sie haben das Recht, sich bei einer Aufsichtsbehörde zu
                      beschweren, insbesondere in dem Mitgliedstaat Ihres
                      Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des
                      mutmaßlichen Verstoßes.
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong className="text-dark dark:text-dark-text">
                      Kontakt für Betroffenenrechte:
                    </strong>
                    <br />
                    Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
                    <a
                      href="mailto:info@posaunenwerk-rheinland.de"
                      className="text-primary hover:underline"
                    >
                      info@posaunenwerk-rheinland.de
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Datenspeicherung */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                10. Speicherdauer
              </h2>

              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p className="leading-relaxed">
                  Soweit innerhalb dieser Datenschutzerklärung keine speziellere
                  Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen
                  Daten bei uns, bis der Zweck für die Datenverarbeitung
                  entfällt. Wenn Sie ein berechtigtes Löschersuchen geltend
                  machen oder eine Einwilligung zur Datenverarbeitung
                  widerrufen, werden Ihre Daten gelöscht, sofern wir keine
                  anderen rechtlich zulässigen Gründe für die Speicherung Ihrer
                  personenbezogenen Daten haben (z.B. steuer- oder
                  handelsrechtliche Aufbewahrungsfristen); im letztgenannten
                  Fall erfolgt die Löschung nach Fortfall dieser Gründe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                11. Social Media
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    11.1 Social-Media-Plugins
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Auf unserer Website verwenden wir ausschließlich direkte
                    Links zu unseren Social-Media-Präsenzen. Es werden keine
                    Social-Media-Plugins eingebunden, die bereits beim Laden der
                    Seite Daten an die Anbieter übertragen. Erst wenn Sie aktiv
                    auf einen Link klicken, werden Sie zu der jeweiligen
                    Plattform weitergeleitet.
                  </p>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    11.2 Unsere Social-Media-Präsenzen
                  </h3>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed">
                      Wir sind auf folgenden Plattformen vertreten:
                    </p>
                    <ul className="ml-6 list-disc space-y-2">
                      <li>
                        <strong>Facebook:</strong> Die Datenverarbeitung erfolgt
                        durch Meta Platforms Ireland Limited
                      </li>
                      <li>
                        <strong>Instagram:</strong> Die Datenverarbeitung
                        erfolgt durch Meta Platforms Ireland Limited
                      </li>
                      <li>
                        <strong>YouTube:</strong> Die Datenverarbeitung erfolgt
                        durch Google Ireland Limited
                      </li>
                    </ul>
                    <p className="text-sm leading-relaxed">
                      Bitte beachten Sie, dass beim Besuch unserer
                      Social-Media-Präsenzen die jeweiligen
                      Datenschutzbestimmungen der Plattformen gelten.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Änderungen */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                12. Änderungen dieser Datenschutzerklärung
              </h2>

              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                <p className="leading-relaxed">
                  Wir behalten uns vor, diese Datenschutzerklärung anzupassen,
                  damit sie stets den aktuellen rechtlichen Anforderungen
                  entspricht oder um Änderungen unserer Leistungen in der
                  Datenschutzerklärung umzusetzen, z.B. bei der Einführung neuer
                  Services. Für Ihren erneuten Besuch gilt dann die neue
                  Datenschutzerklärung.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kontakt */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Fragen zum Datenschutz?
              </h2>

              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Bei Fragen zum Datenschutz, zur Verarbeitung Ihrer Daten oder
                  zur Ausübung Ihrer Rechte können Sie sich jederzeit an uns
                  wenden:
                </p>

                <div className="dark:border-dark-border rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border dark:bg-gray-800/30">
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-dark dark:text-dark-text">
                      Evangelisches Posaunenwerk in der Evangelischen Kirche im
                      Rheinland
                    </strong>
                    <br />
                    Rudolf-Harbig-Str. 20
                    <br />
                    56179 Vallendar
                  </p>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>E-Mail:</strong>{" "}
                      <a
                        href="mailto:info@posaunenwerk-rheinland.de"
                        className="text-primary hover:underline"
                      >
                        info@posaunenwerk-rheinland.de
                      </a>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Telefon:</strong>{" "}
                      <a
                        href="tel:02613000011"
                        className="text-primary hover:underline"
                      >
                        0261 300 00 11
                      </a>
                    </p>
                  </div>
                </div>

                <Link
                  href="/kontakt"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Zur Kontaktseite
                  <svg
                    className="h-4 w-4"
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

      {/* Stand */}
      <section className="bg-background dark:bg-dark-background py-8">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Stand dieser Datenschutzerklärung: November 2025
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
