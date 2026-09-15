import type { ReactNode } from "react";
import PublicPage from "../_components/general/public-page";
import { PageSection, Split } from "../_components/programmheft/page-section";
import { Heading, ArrowLink } from "../_components/programmheft/section-head";
import { PointList } from "../_components/programmheft/point-list";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung und Informationen zum Umgang mit personenbezogenen Daten",
  path: "/datenschutz",
});

/** Fließtext der Seite: Tinte, ruhige Zeilenlänge (Legal Page Rule: 65ch). */
const PROSE =
  "text-ink dark:text-night-text max-w-[65ch] space-y-4 text-lg leading-relaxed";

/** Kleiner Kopf innerhalb eines Abschnitts, z. B. „Verwendete Cookies“. */
const LABEL_HEAD =
  "semi-condensed text-ink dark:text-night-text text-lg font-semibold";

/** Aufzählung im Tabellensatz statt grauer Kästen (Legal Page Rule). */
function LegalBullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="border-ink dark:border-night-text mt-3 border-t-2">
      {items.map((item, index) => (
        <li
          key={index}
          className="border-rule dark:border-night-rule text-ink dark:text-night-text flex gap-3 border-b px-1 py-3 text-lg leading-snug"
        >
          <span
            aria-hidden
            className="bg-ink dark:bg-night-text mt-2 h-2 w-2 shrink-0"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

const RECHTE = [
  {
    title: "Recht auf Auskunft (Art. 15 DSGVO)",
    text: "Sie haben das Recht, Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten zu verlangen.",
  },
  {
    title: "Recht auf Berichtigung (Art. 16 DSGVO)",
    text: "Sie haben das Recht, die Berichtigung unrichtiger oder die Vervollständigung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen.",
  },
  {
    title: "Recht auf Löschung (Art. 17 DSGVO)",
    text: "Sie haben das Recht, die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen, soweit nicht die weitere Verarbeitung erforderlich ist.",
  },
  {
    title: "Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)",
    text: "Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen.",
  },
  {
    title: "Recht auf Datenübertragbarkeit (Art. 20 DSGVO)",
    text: "Sie haben das Recht, die Sie betreffenden personenbezogenen Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten.",
  },
  {
    title: "Widerspruchsrecht (Art. 21 DSGVO)",
    text: "Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die Verarbeitung Sie betreffender personenbezogener Daten Widerspruch einzulegen.",
  },
  {
    title: "Beschwerderecht bei einer Aufsichtsbehörde",
    text: "Sie haben das Recht, sich bei einer Aufsichtsbehörde zu beschweren, insbesondere in dem Mitgliedstaat Ihres Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.",
  },
];

export default function DatenschutzPage() {
  return (
    <PublicPage
      title="Datenschutzerklärung"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Datenschutzerklärung" },
      ]}
      description={
        <p>
          Informationen zum Datenschutz und zur Verarbeitung personenbezogener
          Daten gemäß Art. 13 DSGVO
        </p>
      }
    >
      <PageSection labelledBy="hinweise-heading">
        <Split
          head={<Heading id="hinweise-heading">Allgemeine Hinweise</Heading>}
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Wir freuen uns über Ihr Interesse an unserer Website. Der Schutz
              Ihrer personenbezogenen Daten ist uns ein wichtiges Anliegen. Im
              Folgenden informieren wir Sie ausführlich über den Umgang mit
              Ihren Daten.
            </p>
            <p>
              Die folgenden Hinweise geben einen einfachen Überblick darüber,
              was mit Ihren personenbezogenen Daten passiert, wenn Sie unsere
              Website besuchen. Personenbezogene Daten sind alle Daten, mit
              denen Sie persönlich identifiziert werden können. Ausführliche
              Informationen zum Thema Datenschutz entnehmen Sie unserer unter
              diesem Text aufgeführten Datenschutzerklärung.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="verantwortliche-heading" rule>
        <Split
          head={
            <Heading id="verantwortliche-heading">
              1. Verantwortliche Stelle
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Die verantwortliche Stelle für die Datenverarbeitung auf dieser
              Website ist:
            </p>
            <p>
              <strong className="font-semibold">
                Posaunenwerk der Evangelischen Kirche im Rheinland e.V.
              </strong>
              <br />
              Rudolf-Harbig-Str. 20
              <br />
              56179 Vallendar
              <br />
              Deutschland
            </p>
            <p>
              <strong className="font-semibold">Telefon:</strong>{" "}
              <a href="tel:02613000011" className="link-ink">
                0261 300 00 11
              </a>
              <br />
              <strong className="font-semibold">E-Mail:</strong>{" "}
              <a
                href="mailto:info@posaunenwerk-rheinland.de"
                className="link-ink"
              >
                info@posaunenwerk-rheinland.de
              </a>
            </p>
            <p className="text-dark dark:text-night-muted text-base">
              Verantwortliche Stelle ist die natürliche oder juristische Person,
              die allein oder gemeinsam mit anderen über die Zwecke und Mittel
              der Verarbeitung von personenbezogenen Daten (z.B. Namen,
              E-Mail-Adressen o. Ä.) entscheidet.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="datenerfassung-heading" rule>
        <Split
          head={
            <Heading id="datenerfassung-heading" className="text-balance">
              2. Datenerfassung auf unserer Website
            </Heading>
          }
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              2.1 Wie erfassen wir Ihre Daten?
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese
                mitteilen. Hierbei kann es sich z.B. um Daten handeln, die Sie
                in ein Kontaktformular eingeben oder bei einer Registrierung
                angeben.
              </p>
              <p>
                Andere Daten werden automatisch beim Besuch der Website durch
                unsere IT-Systeme erfasst. Das sind vor allem technische Daten
                (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des
                Seitenaufrufs). Die Erfassung dieser Daten erfolgt automatisch,
                sobald Sie unsere Website betreten.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              2.2 Wofür nutzen wir Ihre Daten?
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Ein Teil der Daten wird erhoben, um eine fehlerfreie
                Bereitstellung der Website zu gewährleisten. Andere Daten können
                zur Analyse Ihres Nutzerverhaltens verwendet werden.
              </p>
              <p>
                Personenbezogene Daten, die Sie uns über Kontaktformulare
                mitteilen, werden ausschließlich zur Bearbeitung Ihrer Anfrage
                und für den Fall von Anschlussfragen bei uns gespeichert.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              2.3 Welche Rechte haben Sie bezüglich Ihrer Daten?
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Sie haben jederzeit das Recht, unentgeltlich Auskunft über
                Herkunft, Empfänger und Zweck Ihrer gespeicherten
                personenbezogenen Daten zu erhalten. Sie haben außerdem ein
                Recht, die Berichtigung, Sperrung oder Löschung dieser Daten zu
                verlangen. Hierzu sowie zu weiteren Fragen zum Thema Datenschutz
                können Sie sich jederzeit unter der im Impressum angegebenen
                Adresse an uns wenden. Des Weiteren steht Ihnen ein
                Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="hosting-heading" rule>
        <Split
          head={
            <Heading id="hosting-heading" className="text-balance">
              3. Hosting und Server-Log-Dateien
            </Heading>
          }
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              3.1 Hosting
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Diese Website wird extern gehostet. Die personenbezogenen Daten,
                die auf dieser Website erfasst werden, werden auf den Servern
                des Hosters gespeichert. Hierbei kann es sich v.a. um
                IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten,
                Vertragsdaten, Kontaktdaten, Namen, Webseitenzugriffe und
                sonstige Daten, die über eine Website generiert werden, handeln.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              3.2 Server-Log-Dateien
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Der Provider der Seiten erhebt und speichert automatisch
                Informationen in so genannten Server-Log-Dateien, die Ihr
                Browser automatisch an uns übermittelt. Dies sind:
              </p>
            </div>
            <LegalBullets
              items={[
                "Browsertyp und Browserversion",
                "Verwendetes Betriebssystem",
                "Referrer URL (die zuvor besuchte Seite)",
                "Hostname des zugreifenden Rechners",
                "Uhrzeit der Serveranfrage",
                "IP-Adresse",
              ]}
            />
            <div className={`${PROSE} mt-5`}>
              <p>
                Eine Zusammenführung dieser Daten mit anderen Datenquellen wird
                nicht vorgenommen. Die Erfassung dieser Daten erfolgt auf
                Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Der Websitebetreiber
                hat ein berechtigtes Interesse an der technisch fehlerfreien
                Darstellung und der Optimierung seiner Website – hierzu müssen
                die Server-Log-Files erfasst werden.
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="kontaktformular-heading" rule>
        <Split
          head={
            <Heading id="kontaktformular-heading" className="text-balance">
              4. Kontaktformular und E-Mail-Kontakt
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Wenn Sie uns per Kontaktformular oder E-Mail Anfragen zukommen
              lassen, werden Ihre Angaben aus dem Anfrageformular inklusive der
              von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der
              Anfrage und für den Fall von Anschlussfragen bei uns gespeichert.
            </p>
            <p>
              Diese Daten geben wir nicht ohne Ihre Einwilligung weiter. Die
              Verarbeitung der in das Kontaktformular eingegebenen Daten erfolgt
              somit ausschließlich auf Grundlage Ihrer Einwilligung (Art. 6 Abs.
              1 lit. a DSGVO). Sie können diese Einwilligung jederzeit
              widerrufen. Dazu reicht eine formlose Mitteilung per E-Mail an
              uns. Die Rechtmäßigkeit der bis zum Widerruf erfolgten
              Datenverarbeitungsvorgänge bleibt vom Widerruf unberührt.
            </p>
            <p>
              Die von Ihnen im Kontaktformular eingegebenen Daten verbleiben bei
              uns, bis Sie uns zur Löschung auffordern, Ihre Einwilligung zur
              Speicherung widerrufen oder der Zweck für die Datenspeicherung
              entfällt (z.B. nach abgeschlossener Bearbeitung Ihrer Anfrage).
              Zwingende gesetzliche Bestimmungen – insbesondere
              Aufbewahrungsfristen – bleiben unberührt.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="registrierung-heading" rule>
        <Split
          head={
            <Heading id="registrierung-heading">
              5. Registrierung und Login
            </Heading>
          }
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              5.1 Benutzerkonten
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Sie haben die Möglichkeit, sich auf unserer Website zu
                registrieren. Hierbei werden die bei der Registrierung
                eingegebenen Daten bei uns gespeichert. Diese Daten werden
                ausschließlich für die Nutzung unseres Angebots verwendet.
              </p>
              <p>
                Bei der Registrierung werden folgende Pflichtangaben erhoben:
              </p>
            </div>
            <LegalBullets
              items={[
                "E-Mail-Adresse",
                "Passwort (verschlüsselt gespeichert)",
                "Vorname",
                "Nachname",
              ]}
            />
            <div className={`${PROSE} mt-5`}>
              <p>Optional können Sie zusätzlich folgende Daten angeben:</p>
            </div>
            <LegalBullets
              items={[
                "Benutzername",
                "Anzeigename",
                "Telefonnummer",
                "Straße und Hausnummer",
                "Postleitzahl",
                "Stadt",
                "Geburtsdatum",
                "Profilbild",
                "Biografie",
                "Einstellungen und Präferenzen",
              ]}
            />
            <div className={`${PROSE} mt-5`}>
              <p>
                Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a
                DSGVO mit Ihrer Einwilligung. Sie können Ihre Einwilligung
                jederzeit durch eine Nachricht an die im Impressum angegebene
                Kontaktadresse widerrufen.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              5.2 Passwort-Sicherheit
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Ihre Passwörter werden mit modernen kryptografischen Verfahren
                (bcrypt) verschlüsselt gespeichert. Wir haben zu keinem
                Zeitpunkt Zugriff auf Ihr Klartext-Passwort.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              5.3 Löschung von Daten
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Die bei der Registrierung erfassten Daten werden von uns
                gespeichert, solange Sie auf unserer Website registriert sind
                und werden anschließend gelöscht. Sie können Ihr Benutzerkonto
                jederzeit löschen lassen. Gesetzliche Aufbewahrungsfristen
                bleiben unberührt.
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="kursanmeldungen-heading" rule>
        <Split
          head={
            <Heading id="kursanmeldungen-heading" className="text-balance">
              6. Kursanmeldungen und Teilnehmerdaten
            </Heading>
          }
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              6.1 Anmeldedaten
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Bei der Anmeldung zu einem Kurs oder Lehrgang werden folgende
                Daten des Anmelders erfasst:
              </p>
            </div>
            <LegalBullets
              items={[
                "Vorname und Nachname",
                "E-Mail-Adresse",
                "Telefonnummer (optional)",
                "Straße und Hausnummer (optional)",
                "Postleitzahl (optional)",
                "Stadt (optional)",
              ]}
            />
            <div className={`${PROSE} mt-5`}>
              <p>
                Falls eine separate Rechnungsadresse angegeben wird, werden
                zusätzlich folgende Daten gespeichert:
              </p>
            </div>
            <LegalBullets
              items={[
                "Firmenname (optional)",
                "Vorname und Nachname des Rechnungsempfängers",
                "Rechnungsadresse (Straße, PLZ, Stadt)",
                "E-Mail-Adresse für Rechnungen (optional)",
              ]}
            />
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              6.2 Teilnehmerdaten
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Für jeden angemeldeten Teilnehmer werden folgende Daten erfasst:
              </p>
            </div>
            <LegalBullets
              items={[
                "Vorname und Nachname",
                "Geburtsdatum",
                "Stadt",
                "Instrument (optional)",
                "Ausgewählte Preisoption",
                "Zusätzliche, kurs-spezifische Felder (falls vorhanden)",
              ]}
            />
            <div className={`${PROSE} mt-5`}>
              <p>
                Diese Daten werden zur Durchführung der Kursanmeldung, zur
                Kommunikation bezüglich des Kurses, zur Rechnungsstellung und
                zur Verwaltung der Teilnehmer benötigt. Die Verarbeitung erfolgt
                auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der
                ordnungsgemäßen Verwaltung).
              </p>
              <p>
                <strong className="font-semibold">
                  Besonderer Hinweis zu Minderjährigen:
                </strong>{" "}
                Bei der Anmeldung von Minderjährigen werden deren Daten
                ebenfalls erfasst. Die Einwilligung zur Datenverarbeitung
                erfolgt durch den Erziehungsberechtigten, der die Anmeldung
                vornimmt.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              6.3 Geschwisterkindrabatt
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Bei der Anwendung eines Geschwisterkindrabatts werden Teilnehmer
                in Geschwistergruppen zusammengefasst. Hierfür wird eine
                Gruppierungs-ID gespeichert, die es ermöglicht, Geschwister zu
                identifizieren und den Rabatt korrekt zu berechnen. Diese Daten
                werden nur für die Zwecke der Rabattberechnung verwendet.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              6.4 Zahlungs- und Rechnungsdaten
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Zur Abwicklung der Zahlung und Rechnungsstellung werden folgende
                Daten gespeichert:
              </p>
            </div>
            <LegalBullets
              items={[
                "Gesamtpreis der Anmeldung",
                "Zahlungsstatus",
                "Anmeldestatus",
                "Rechnungsnummer (falls Rechnung erstellt wurde)",
                "Rechnungsdatum (falls Rechnung erstellt wurde)",
              ]}
            />
            <div className={`${PROSE} mt-5`}>
              <p>
                Diese Daten werden zur Erfüllung vertraglicher Verpflichtungen
                und zur Erfüllung gesetzlicher Aufbewahrungspflichten benötigt.
                Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b
                DSGVO (Vertragserfüllung) und Art. 6 Abs. 1 lit. c DSGVO
                (gesetzliche Verpflichtung).
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              6.5 Speicherdauer
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Anmelde- und Teilnehmerdaten werden gespeichert, solange dies
                zur Erfüllung der vertraglichen Verpflichtungen und zur
                Erfüllung gesetzlicher Aufbewahrungspflichten (insbesondere
                steuer- und handelsrechtlicher Art) erforderlich ist. In der
                Regel beträgt die Aufbewahrungsfrist für Rechnungen 10 Jahre
                gemäß § 147 AO (Abgabenordnung).
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="teilnehmer-heading" rule>
        <Split
          head={
            <Heading id="teilnehmer-heading">
              7. Gespeicherte Teilnehmer
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Registrierte Benutzer haben die Möglichkeit, Teilnehmerdaten zu
              speichern, um diese bei zukünftigen Anmeldungen wiederzuverwenden.
              Hierbei werden folgende Daten gespeichert:
            </p>
          </div>
          <LegalBullets
            items={[
              "Vorname und Nachname",
              "Geburtsdatum",
              "Stadt",
              "Instrument (optional)",
              "Zusätzliche, kurs-spezifische Felder (optional)",
            ]}
          />
          <div className={`${PROSE} mt-5`}>
            <p>
              Diese Daten werden ausschließlich für den angemeldeten Benutzer
              gespeichert und können von diesem jederzeit gelöscht werden. Die
              Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO
              mit Ihrer Einwilligung. Sie können Ihre gespeicherten Teilnehmer
              jederzeit in den Einstellungen verwalten und löschen.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="newsletter-heading" rule>
        <Split
          head={<Heading id="newsletter-heading">8. Newsletter</Heading>}
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              8.1 Newsletter-Daten
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Wenn Sie den auf der Website angebotenen Newsletter beziehen
                möchten, benötigen wir von Ihnen eine E-Mail-Adresse sowie
                Informationen, welche uns die Überprüfung gestatten, dass Sie
                der Inhaber der angegebenen E-Mail-Adresse sind und mit dem
                Empfang des Newsletters einverstanden sind.
              </p>
              <p>
                Die Datenverarbeitung zum Zwecke des Newsletter-Versands erfolgt
                auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
                Eine erteilte Einwilligung zur Speicherung der Daten, der
                E-Mail-Adresse sowie deren Nutzung zum Versand des Newsletters
                können Sie jederzeit widerrufen. In jedem Newsletter findet sich
                dazu ein entsprechender Link.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              8.2 Double-Opt-In-Verfahren
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Die Anmeldung zu unserem Newsletter erfolgt in einem
                Double-Opt-In-Verfahren. Das heißt, Sie erhalten nach der
                Anmeldung eine E-Mail, in der Sie um die Bestätigung Ihrer
                Anmeldung gebeten werden. Diese Bestätigung ist notwendig, damit
                sich niemand mit fremden E-Mail-Adressen anmelden kann.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              8.3 Nachweis der Einwilligung
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Um die Einwilligung nachweisen zu können (Art. 7 Abs. 1 DSGVO),
                speichern wir zusätzlich den Zeitpunkt der Anmeldung und der
                Bestätigung, die dabei verwendeten IP-Adressen sowie die Fassung
                des Einwilligungstextes, dem Sie zugestimmt haben. Diese Angaben
                dienen ausschließlich dem Nachweis und werden bei Ihrer
                Abmeldung gelöscht.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              8.4 Speicherdauer
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Ihre Daten werden für den Newsletter-Versand gespeichert, bis
                Sie sich abmelden. Anmeldungen, die nicht innerhalb von 30 Tagen
                bestätigt werden, löschen wir automatisch.
              </p>
              <p>
                Nach einer Abmeldung bewahren wir Ihre E-Mail-Adresse zusammen
                mit den Zeitstempeln der An- und Abmeldung auf, damit Sie nicht
                versehentlich erneut angeschrieben werden und wir zurückliegende
                Versände belegen können (Art. 6 Abs. 1 lit. f DSGVO). Name und
                Nachweisdaten werden dabei gelöscht. Auf Wunsch entfernen wir
                Ihre Adresse vollständig — wenden Sie sich dazu an die im
                Impressum genannte Adresse.
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="feedback-heading" rule>
        <Split
          head={<Heading id="feedback-heading">9. Feedback-Formular</Heading>}
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Über unser Feedback-Formular können Sie Fehler melden, Features
              vorschlagen oder allgemeines Feedback geben. Hierbei werden
              folgende Daten erfasst:
            </p>
          </div>
          <LegalBullets
            items={[
              "E-Mail-Adresse (optional, für Rückfragen)",
              "Art des Feedbacks (Fehler, Feature-Vorschlag, Allgemeines)",
              "Betreff",
              "Feedback-Text",
              "URL der betroffenen Seite (optional)",
              "Geräteinformationen (optional)",
            ]}
          />
          <div className={`${PROSE} mt-5`}>
            <p>
              Diese Daten werden ausschließlich zur Bearbeitung Ihres Feedbacks
              und zur Verbesserung unserer Website verwendet. Die Verarbeitung
              erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse an der Verbesserung unserer Dienste). Die Daten werden
              gelöscht, sobald sie für die Bearbeitung nicht mehr benötigt
              werden.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="nutzungsstatistik-heading" rule>
        <Split
          head={
            <Heading id="nutzungsstatistik-heading" className="text-balance">
              10. Nutzungsstatistik (Page View Tracking)
            </Heading>
          }
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              10.1 Erfassung von Seitenaufrufen
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Um unsere Website zu verbessern, erfassen wir anonym die Nutzung
                unserer Webseite (Seitenaufrufe). Hierbei werden folgende Daten
                gespeichert:
              </p>
            </div>
            <LegalBullets
              items={[
                "Aufgerufene Seite (URL)",
                "Bereich der Seite (z.B. Hero-Bereich, Footer)",
                "Zeitpunkt des Aufrufs",
                "Ihre Einwilligungseinstellung",
              ]}
            />
            <div className={`${PROSE} mt-5`}>
              <p>
                <strong className="font-semibold">Wichtig:</strong> Es werden
                keine personenbezogenen Daten gespeichert, es sei denn, Sie
                haben ausdrücklich zugestimmt, dass Seitenaufrufe Ihrem
                Benutzerkonto zugeordnet werden dürfen. In diesem Fall wird
                zusätzlich Ihre Benutzer-ID gespeichert.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              10.2 Einwilligung
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Beim ersten Besuch unserer Website werden Sie über die Erfassung
                von Nutzungsstatistiken informiert und können zwischen folgenden
                Optionen wählen:
              </p>
            </div>
            <LegalBullets
              items={[
                <>
                  <strong className="font-semibold">Ablehnen:</strong> Es werden
                  keine Nutzungsstatistiken erfasst.
                </>,
                <>
                  <strong className="font-semibold">Nur anonym:</strong> Es
                  werden anonyme Seitenaufrufe erfasst, ohne Zuordnung zu Ihrem
                  Benutzerkonto.
                </>,
                <>
                  <strong className="font-semibold">
                    Anonym + Zuordnung zu meinem Konto:
                  </strong>{" "}
                  Es werden Seitenaufrufe erfasst und Ihrem Benutzerkonto
                  zugeordnet (nur wenn Sie eingeloggt sind).
                </>,
              ]}
            />
            <div className={`${PROSE} mt-5`}>
              <p>
                Ihre Einwilligung wird in einem Cookie gespeichert und kann
                jederzeit in den Einstellungen geändert werden. Die Verarbeitung
                erfolgt auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO mit Ihrer
                Einwilligung.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              10.3 Zweck der Verarbeitung
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Die Nutzungsstatistiken dienen ausschließlich der Verbesserung
                unserer Website, der Analyse des Nutzerverhaltens und der
                Optimierung der Benutzerfreundlichkeit. Die Daten werden nicht
                an Dritte weitergegeben und nicht für Werbezwecke verwendet.
              </p>
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="cookies-heading" rule>
        <Split
          head={<Heading id="cookies-heading">11. Cookies</Heading>}
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Unsere Internetseiten verwenden teilweise so genannte Cookies.
              Cookies richten auf Ihrem Rechner keinen Schaden an und enthalten
              keine Viren. Cookies dienen dazu, unser Angebot
              nutzerfreundlicher, effektiver und sicherer zu machen. Cookies
              sind kleine Textdateien, die auf Ihrem Rechner abgelegt werden und
              die Ihr Browser speichert.
            </p>
            <p>
              Die meisten der von uns verwendeten Cookies sind so genannte
              &quot;Session-Cookies&quot;. Sie werden nach Ende Ihres Besuchs
              automatisch gelöscht. Andere Cookies bleiben auf Ihrem Endgerät
              gespeichert bis Sie diese löschen. Diese Cookies ermöglichen es
              uns, Ihren Browser beim nächsten Besuch wiederzuerkennen.
            </p>
            <p>
              Sie können Ihren Browser so einstellen, dass Sie über das Setzen
              von Cookies informiert werden und Cookies nur im Einzelfall
              erlauben, die Annahme von Cookies für bestimmte Fälle oder
              generell ausschließen sowie das automatische Löschen der Cookies
              beim Schließen des Browsers aktivieren. Bei der Deaktivierung von
              Cookies kann die Funktionalität dieser Website eingeschränkt sein.
            </p>
          </div>

          <h4 className={`${LABEL_HEAD} mt-8`}>Verwendete Cookies</h4>
          <LegalBullets
            items={[
              <>
                <strong className="font-semibold">Session-Cookies:</strong> Für
                die Aufrechterhaltung Ihrer Sitzung (notwendig für
                Login-Funktionen)
              </>,
              <>
                <strong className="font-semibold">Theme-Präferenz:</strong>{" "}
                Speicherung Ihrer Dark/Light-Mode-Einstellung
              </>,
              <>
                <strong className="font-semibold">Authentifizierung:</strong>{" "}
                Sichere Anmeldung und Session-Management
              </>,
              <>
                <strong className="font-semibold">
                  Tracking-Einwilligung:
                </strong>{" "}
                Speicherung Ihrer Einwilligung zur Erfassung von
                Nutzungsstatistiken
              </>,
            ]}
          />
        </Split>
      </PageSection>

      <PageSection labelledBy="session-heading" rule>
        <Split
          head={<Heading id="session-heading">12. Session-Daten</Heading>}
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Bei der Anmeldung auf unserer Website werden Session-Daten
              gespeichert, die für die Aufrechterhaltung Ihrer Anmeldesitzung
              erforderlich sind. Hierbei werden folgende Daten erfasst:
            </p>
          </div>
          <LegalBullets
            items={[
              "Session-Token (zur Identifikation Ihrer Sitzung)",
              "IP-Adresse (zur Sicherheit und Betrugsprävention)",
              "User-Agent (Browser- und Geräteinformationen)",
              "Ablaufdatum der Session",
            ]}
          />
          <div className={`${PROSE} mt-5`}>
            <p>
              Diese Daten werden zur Sicherstellung der Funktionalität der
              Website, zur Sicherheit und zur Betrugsprävention benötigt. Die
              Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO
              (berechtigtes Interesse an der Sicherheit und Funktionalität der
              Website). Session-Daten werden automatisch gelöscht, sobald Sie
              sich abmelden oder die Session abläuft.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="ssl-heading" rule>
        <Split
          head={
            <Heading id="ssl-heading" className="text-balance">
              13. SSL- bzw. TLS-Verschlüsselung
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der
              Übertragung vertraulicher Inhalte, wie zum Beispiel Anfragen, die
              Sie an uns als Seitenbetreiber senden, eine SSL-bzw.
              TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie
              daran, dass die Adresszeile des Browsers von &quot;http://&quot;
              auf &quot;https://&quot; wechselt und an dem Schloss-Symbol in
              Ihrer Browserzeile.
            </p>
            <p>
              Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die
              Daten, die Sie an uns übermitteln, nicht von Dritten mitgelesen
              werden.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="rechte-heading" rule>
        <Split
          head={
            <Heading id="rechte-heading" className="text-balance">
              14. Ihre Rechte als betroffene Person
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Sie haben nach der DSGVO verschiedene Rechte. Diese ergeben sich
              insbesondere aus den Artikeln 15 bis 21 DSGVO:
            </p>
          </div>

          <PointList items={RECHTE} className="mt-6" />

          <div className={`${PROSE} mt-8`}>
            <p>
              <strong className="font-semibold">
                Kontakt für Betroffenenrechte:
              </strong>
              <br />
              Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{" "}
              <a
                href="mailto:info@posaunenwerk-rheinland.de"
                className="link-ink"
              >
                info@posaunenwerk-rheinland.de
              </a>
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="speicherdauer-heading" rule>
        <Split
          head={<Heading id="speicherdauer-heading">15. Speicherdauer</Heading>}
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Soweit innerhalb dieser Datenschutzerklärung keine speziellere
              Speicherdauer genannt wurde, verbleiben Ihre personenbezogenen
              Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt.
              Wenn Sie ein berechtigtes Löschersuchen geltend machen oder eine
              Einwilligung zur Datenverarbeitung widerrufen, werden Ihre Daten
              gelöscht, sofern wir keine anderen rechtlich zulässigen Gründe für
              die Speicherung Ihrer personenbezogenen Daten haben (z.B. steuer-
              oder handelsrechtliche Aufbewahrungsfristen); im letztgenannten
              Fall erfolgt die Löschung nach Fortfall dieser Gründe.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="social-media-heading" rule>
        <Split
          head={<Heading id="social-media-heading">16. Social Media</Heading>}
          bodyClassName="mt-8 space-y-12"
        >
          <div>
            <Heading as="h3" size="list" rule>
              16.1 Social-Media-Plugins
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>
                Auf unserer Website verwenden wir ausschließlich direkte Links
                zu unseren Social-Media-Präsenzen. Es werden keine
                Social-Media-Plugins eingebunden, die bereits beim Laden der
                Seite Daten an die Anbieter übertragen. Erst wenn Sie aktiv auf
                einen Link klicken, werden Sie zu der jeweiligen Plattform
                weitergeleitet.
              </p>
            </div>
          </div>

          <div>
            <Heading as="h3" size="list" rule>
              16.2 Unsere Social-Media-Präsenzen
            </Heading>
            <div className={`${PROSE} mt-5`}>
              <p>Wir sind auf folgenden Plattformen vertreten:</p>
            </div>
            <LegalBullets
              items={[
                <>
                  <strong className="font-semibold">Facebook:</strong> Die
                  Datenverarbeitung erfolgt durch Meta Platforms Ireland Limited
                </>,
                <>
                  <strong className="font-semibold">Instagram:</strong> Die
                  Datenverarbeitung erfolgt durch Meta Platforms Ireland Limited
                </>,
                <>
                  <strong className="font-semibold">YouTube:</strong> Die
                  Datenverarbeitung erfolgt durch Google Ireland Limited
                </>,
              ]}
            />
            <p className="text-dark dark:text-night-muted mt-5 max-w-[65ch] text-sm leading-relaxed">
              Bitte beachten Sie, dass beim Besuch unserer
              Social-Media-Präsenzen die jeweiligen Datenschutzbestimmungen der
              Plattformen gelten.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="aenderungen-heading" rule>
        <Split
          head={
            <Heading id="aenderungen-heading" className="text-balance">
              17. Änderungen dieser Datenschutzerklärung
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit
              sie stets den aktuellen rechtlichen Anforderungen entspricht oder
              um Änderungen unserer Leistungen in der Datenschutzerklärung
              umzusetzen, z.B. bei der Einführung neuer Services. Für Ihren
              erneuten Besuch gilt dann die neue Datenschutzerklärung.
            </p>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="fragen-heading" rule>
        <Split
          head={
            <Heading id="fragen-heading" className="text-balance">
              Fragen zum Datenschutz?
            </Heading>
          }
          bodyClassName="mt-8"
        >
          <div className={PROSE}>
            <p>
              Bei Fragen zum Datenschutz, zur Verarbeitung Ihrer Daten oder zur
              Ausübung Ihrer Rechte können Sie sich jederzeit an uns wenden:
            </p>
            <p>
              <strong className="font-semibold">
                Posaunenwerk der Evangelischen Kirche im Rheinland e.V.
              </strong>
              <br />
              Rudolf-Harbig-Str. 20
              <br />
              56179 Vallendar
            </p>
            <p>
              <strong className="font-semibold">E-Mail:</strong>{" "}
              <a
                href="mailto:info@posaunenwerk-rheinland.de"
                className="link-ink"
              >
                info@posaunenwerk-rheinland.de
              </a>
              <br />
              <strong className="font-semibold">Telefon:</strong>{" "}
              <a href="tel:02613000011" className="link-ink">
                0261 300 00 11
              </a>
            </p>
          </div>
          <ArrowLink href="/kontakt" className="mt-4">
            Zur Kontaktseite
          </ArrowLink>
        </Split>
      </PageSection>

      <PageSection spacing="close" rule>
        <p className="text-dark dark:text-night-muted text-sm">
          Stand dieser Datenschutzerklärung: Februar 2026
        </p>
      </PageSection>
    </PublicPage>
  );
}
