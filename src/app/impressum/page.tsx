import Link from "next/link";
import PageHeader from "../_components/general/page-header";

export const metadata = {
  title: "Impressum | Posaunenwerk Rheinland",
  description:
    "Impressum und rechtliche Informationen des Posaunenwerks Rheinland",
};

export default function ImpressumPage() {
  return (
    <div>
      <PageHeader title="Impressum" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary py-16 text-white md:py-24">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <span>Impressum</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Impressum
            </h1>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Angaben gemäß § 5 TMG und weitere rechtliche Informationen
            </p>
          </div>
        </div>
      </section>

      {/* Angaben gemäß § 5 TMG */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Angaben gemäß § 5 TMG
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Diensteanbieter
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300">
                    <p className="font-semibold">
                      Evangelisches Posaunenwerk in der Evangelischen Kirche im
                      Rheinland
                    </p>
                    <p className="mt-2">
                      Rudolf-Harbig-Str. 20
                      <br />
                      56179 Vallendar
                      <br />
                      Deutschland
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Kontaktmöglichkeiten
                  </h3>
                  <div className="space-y-2 text-gray-700 dark:text-gray-300">
                    <p>
                      <span className="font-semibold">Telefon:</span>{" "}
                      <a
                        href="tel:02613000011"
                        className="text-primary hover:underline"
                      >
                        0261 300 00 11
                      </a>
                    </p>
                    <p>
                      <span className="font-semibold">E-Mail:</span>{" "}
                      <a
                        href="mailto:info@posaunenwerk-rheinland.de"
                        className="text-primary hover:underline"
                      >
                        info@posaunenwerk-rheinland.de
                      </a>
                    </p>
                    <p>
                      <span className="font-semibold">Website:</span>{" "}
                      <a
                        href="https://www.posaunenwerk-rheinland.de"
                        className="text-primary hover:underline"
                      >
                        www.posaunenwerk-rheinland.de
                      </a>
                    </p>
                  </div>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Vertretungsberechtigte Personen
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Vertreten durch den Vorstand des Posaunenwerks Rheinland
                  </p>
                  <Link
                    href="/ueber-uns/vorstand"
                    className="text-primary mt-2 inline-block text-sm hover:underline"
                  >
                    Zur Vorstandsübersicht →
                  </Link>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Zugehörigkeit
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Das Evangelische Posaunenwerk ist ein Werk der{" "}
                    <a
                      href="https://www.ekir.de"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Evangelischen Kirche im Rheinland
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verantwortlich für den Inhalt */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Verantwortlich für den Inhalt
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Redaktionell Verantwortlicher
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:
                    <br />
                    Landesposaunenwart des Posaunenwerks Rheinland
                    <br />
                    Rudolf-Harbig-Str. 20
                    <br />
                    56179 Vallendar
                  </p>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-semibold">
                    Technische Betreuung
                  </h3>
                  <p className="mb-2 text-gray-700 dark:text-gray-300">
                    Bei technischen Fragen zur Website wenden Sie sich bitte an
                    unser Internet-Team:
                  </p>
                  <a
                    href="mailto:webmaster@posaunenwerk-rheinland.de"
                    className="text-primary hover:underline"
                  >
                    webmaster@posaunenwerk-rheinland.de
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Haftungsausschluss */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Haftungsausschluss
              </h2>

              <div className="space-y-6 text-gray-700 dark:text-gray-300">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Haftung für Inhalte
                  </h3>
                  <p className="leading-relaxed">
                    Die Inhalte unserer Seiten wurden mit größter Sorgfalt
                    erstellt. Für die Richtigkeit, Vollständigkeit und
                    Aktualität der Inhalte können wir jedoch keine Gewähr
                    übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG
                    für eigene Inhalte auf diesen Seiten nach den allgemeinen
                    Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
                    Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
                    gespeicherte fremde Informationen zu überwachen oder nach
                    Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
                    hinweisen. Verpflichtungen zur Entfernung oder Sperrung der
                    Nutzung von Informationen nach den allgemeinen Gesetzen
                    bleiben hiervon unberührt. Eine diesbezügliche Haftung ist
                    jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
                    Rechtsverletzung möglich. Bei Bekanntwerden von
                    entsprechenden Rechtsverletzungen werden wir diese Inhalte
                    umgehend entfernen.
                  </p>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Haftung für Links
                  </h3>
                  <p className="leading-relaxed">
                    Unser Angebot enthält Links zu externen Webseiten Dritter,
                    auf deren Inhalte wir keinen Einfluss haben. Deshalb können
                    wir für diese fremden Inhalte auch keine Gewähr übernehmen.
                    Für die Inhalte der verlinkten Seiten ist stets der
                    jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                    Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung
                    auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte
                    waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine
                    permanente inhaltliche Kontrolle der verlinkten Seiten ist
                    jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung
                    nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen
                    werden wir derartige Links umgehend entfernen.
                  </p>
                </div>

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Urheberrecht
                  </h3>
                  <p className="leading-relaxed">
                    Die durch die Seitenbetreiber erstellten Inhalte und Werke
                    auf diesen Seiten unterliegen dem deutschen Urheberrecht.
                    Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
                    der Verwertung außerhalb der Grenzen des Urheberrechtes
                    bedürfen der schriftlichen Zustimmung des jeweiligen Autors
                    bzw. Erstellers. Downloads und Kopien dieser Seite sind nur
                    für den privaten, nicht kommerziellen Gebrauch gestattet.
                    Soweit die Inhalte auf dieser Seite nicht vom Betreiber
                    erstellt wurden, werden die Urheberrechte Dritter beachtet.
                    Insbesondere werden Inhalte Dritter als solche
                    gekennzeichnet. Sollten Sie trotzdem auf eine
                    Urheberrechtsverletzung aufmerksam werden, bitten wir um
                    einen entsprechenden Hinweis. Bei Bekanntwerden von
                    Rechtsverletzungen werden wir derartige Inhalte umgehend
                    entfernen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source Lizenzen */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Open Source Lizenzen
              </h2>

              <div className="space-y-6">
                <p className="text-gray-700 dark:text-gray-300">
                  Diese Website nutzt verschiedene Open-Source-Softwarepakete.
                  Wir möchten den Entwicklern dieser Projekte für ihre
                  großartige Arbeit danken. Im Folgenden finden Sie eine
                  Übersicht der verwendeten Hauptkomponenten und deren Lizenzen:
                </p>

                <div className="space-y-4">
                  {/* Next.js */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        Next.js
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      React Framework für Produktionsanwendungen
                    </p>
                    <a
                      href="https://nextjs.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://nextjs.org
                    </a>
                  </div>

                  {/* React */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        React
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      JavaScript Bibliothek für Benutzeroberflächen
                    </p>
                    <a
                      href="https://react.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://react.dev
                    </a>
                  </div>

                  {/* TypeScript */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        TypeScript
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        Apache-2.0
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      Typisiertes Superset von JavaScript
                    </p>
                    <a
                      href="https://www.typescriptlang.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://www.typescriptlang.org
                    </a>
                  </div>

                  {/* Tailwind CSS */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        Tailwind CSS
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      Utility-First CSS Framework
                    </p>
                    <a
                      href="https://tailwindcss.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://tailwindcss.com
                    </a>
                  </div>

                  {/* Prisma */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        Prisma
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        Apache-2.0
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      Next-generation ORM für Node.js & TypeScript
                    </p>
                    <a
                      href="https://www.prisma.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://www.prisma.io
                    </a>
                  </div>

                  {/* tRPC */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        tRPC
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      End-to-end typesafe APIs
                    </p>
                    <a
                      href="https://trpc.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://trpc.io
                    </a>
                  </div>

                  {/* TanStack Query */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        TanStack Query (React Query)
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      Powerful asynchronous state management
                    </p>
                    <a
                      href="https://tanstack.com/query"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://tanstack.com/query
                    </a>
                  </div>

                  {/* Better Auth */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        Better Auth
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      Authentication library for TypeScript
                    </p>
                    <a
                      href="https://www.better-auth.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://www.better-auth.com
                    </a>
                  </div>

                  {/* Zod */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        Zod
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      TypeScript-first schema validation
                    </p>
                    <a
                      href="https://zod.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://zod.dev
                    </a>
                  </div>

                  {/* PostgreSQL */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        PostgreSQL (pg)
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      PostgreSQL client für Node.js
                    </p>
                    <a
                      href="https://node-postgres.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://node-postgres.com
                    </a>
                  </div>

                  {/* TipTap */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        TipTap
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      Headless Rich-Text-Editor Framework für React
                    </p>
                    <a
                      href="https://tiptap.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://tiptap.dev
                    </a>
                  </div>

                  {/* Marked */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        Marked
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      Markdown Parser und Compiler für JavaScript
                    </p>
                    <a
                      href="https://marked.js.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://marked.js.org
                    </a>
                  </div>

                  {/* Turndown */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        Turndown
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        MIT License
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      HTML zu Markdown Konverter
                    </p>
                    <a
                      href="https://github.com/mixmark-io/turndown"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://github.com/mixmark-io/turndown
                    </a>
                  </div>
                </div>

                <div className="dark:border-dark-border mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border dark:bg-gray-800/30">
                  <h4 className="text-dark dark:text-dark-text mb-2 font-semibold">
                    Weitere verwendete Pakete
                  </h4>
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                    Diese Website nutzt zahlreiche weitere Open-Source-Pakete.
                    Alle verwendeten Bibliotheken und deren vollständige
                    Lizenzinformationen finden Sie in unserer{" "}
                    <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700">
                      package.json
                    </code>{" "}
                    Datei.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Die wichtigsten verwendeten Lizenzen sind:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <svg
                        className="text-primary h-4 w-4"
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
                      <strong>MIT License</strong> - Erlaubt kommerzielle
                      Nutzung, Modifikation und Verteilung
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="text-primary h-4 w-4"
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
                      <strong>Apache License 2.0</strong> - Erlaubt Nutzung,
                      Modifikation und Verteilung mit Patentrechtsgewährung
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="text-primary h-4 w-4"
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
                      <strong>BSD-2-Clause</strong> - Permissive Lizenz mit
                      minimalen Einschränkungen
                    </li>
                    <li className="flex items-center gap-2">
                      <svg
                        className="text-primary h-4 w-4"
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
                      <strong>0BSD</strong> - "Zero-Clause" BSD-Lizenz, Public
                      Domain äquivalent
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Datenschutz & Weitere Informationen */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold md:text-3xl">
                Weitere Informationen
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Datenschutz
                  </h3>
                  <p className="mb-3 text-gray-700 dark:text-gray-300">
                    Informationen zum Datenschutz und zur Verarbeitung
                    personenbezogener Daten finden Sie in unserer
                    Datenschutzerklärung.
                  </p>
                  <Link
                    href="/datenschutz"
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    Zur Datenschutzerklärung
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

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Kontakt
                  </h3>
                  <p className="mb-3 text-gray-700 dark:text-gray-300">
                    Bei Fragen oder Anregungen zu dieser Website oder unserem
                    Angebot stehen wir Ihnen gerne zur Verfügung.
                  </p>
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

                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h3 className="text-dark dark:text-dark-text mb-3 text-lg font-semibold">
                    Bildnachweise
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Die auf dieser Website verwendeten Bilder sind, sofern nicht
                    anders angegeben, Eigentum des Posaunenwerks Rheinland oder
                    wurden mit entsprechender Erlaubnis zur Nutzung
                    bereitgestellt. Bildnachweise werden, wo erforderlich,
                    direkt bei den jeweiligen Bildern angegeben.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stand der Information */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-8">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Stand dieser Impressumsangaben: Dezember 2025
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
