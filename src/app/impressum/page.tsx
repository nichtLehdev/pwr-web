import Link from "next/link";
import PublicPage from "../_components/general/public-page";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

export const metadata = {
  title: "Impressum | Posaunenwerk Rheinland",
  description:
    "Impressum und rechtliche Informationen des Posaunenwerks Rheinland",
};

export default function ImpressumPage() {
  return (
    <PublicPage
      title="Impressum"
      color="primary"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Impressum" },
      ]}
      description={
        <p>
          Angaben gemäß § 5 TMG und weitere rechtliche Informationen
        </p>
      }
    >
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) 2024 Vercel, Inc.
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) Meta Platforms, Inc. and affiliates.
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        Apache License 2.0:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) Microsoft Corporation.
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Licensed under the Apache License, Version 2.0 (the
                        &quot;License&quot;); you may not use this file except
                        in compliance with the License. You may obtain a copy of
                        the License at
                        http://www.apache.org/licenses/LICENSE-2.0
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Unless required by applicable law or agreed to in
                        writing, software distributed under the License is
                        distributed on an &quot;AS IS&quot; BASIS, WITHOUT
                        WARRANTIES OR CONDITIONS OF ANY KIND, either express or
                        implied. See the License for the specific language
                        governing permissions and limitations under the License.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) Tailwind Labs, Inc.
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        Apache License 2.0:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) 2024 Prisma Data, Inc.
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Licensed under the Apache License, Version 2.0 (the
                        &quot;License&quot;); you may not use this file except
                        in compliance with the License. You may obtain a copy of
                        the License at
                        http://www.apache.org/licenses/LICENSE-2.0
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Unless required by applicable law or agreed to in
                        writing, software distributed under the License is
                        distributed on an &quot;AS IS&quot; BASIS, WITHOUT
                        WARRANTIES OR CONDITIONS OF ANY KIND, either express or
                        implied. See the License for the specific language
                        governing permissions and limitations under the License.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) 2022 KATT & tRPC contributors
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) Tanner Linsley
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) Better Auth contributors
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) 2020 Colin McDonnell
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) 2010-2024 Brian Carlson, Luke Chafer, and
                        Contributors
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) 2021-2024 Tiptap Inc.
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) 2011-2024 Christopher Jeffrey and
                        contributors
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
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
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        MIT License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) 2017 Dom Christie
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Permission is hereby granted, free of charge, to any
                        person obtaining a copy of this software and associated
                        documentation files (the &quot;Software&quot;), to deal
                        in the Software without restriction, including without
                        limitation the rights to use, copy, modify, merge,
                        publish, distribute, sublicense, and/or sell copies of
                        the Software, and to permit persons to whom the Software
                        is furnished to do so, subject to the following
                        conditions:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        The above copyright notice and this permission notice
                        shall be included in all copies or substantial portions
                        of the Software.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT
                        WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                        NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
                        NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
                        LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
                        WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
                        ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
                        OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                      </p>
                    </div>
                  </div>

                  {/* Leaflet */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        Leaflet
                      </h3>
                      <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                        BSD 2-Clause
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      JavaScript-Bibliothek für interaktive Karten
                    </p>
                    <a
                      href="https://leafletjs.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://leafletjs.com
                    </a>
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                        BSD 2-Clause License:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Copyright (c) 2010-2024, Vladimir Agafonkin
                        <br />
                        Copyright (c) 2010-2011, CloudMade
                        <br />
                        All rights reserved.
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Redistribution and use in source and binary forms, with
                        or without modification, are permitted provided that the
                        following conditions are met:
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        1. Redistributions of source code must retain the above
                        copyright notice, this list of conditions and the
                        following disclaimer.
                      </p>
                      <p className="mb-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        2. Redistributions in binary form must reproduce the
                        above copyright notice, this list of conditions and the
                        following disclaimer in the documentation and/or other
                        materials provided with the distribution.
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND
                        CONTRIBUTORS &quot;AS IS&quot; AND ANY EXPRESS OR
                        IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
                        IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
                        PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
                        COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY
                        DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
                        CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
                        PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF
                        USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
                        CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
                        CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
                        NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
                        USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
                        OF SUCH DAMAGE.
                      </p>
                    </div>
                    <div className="dark:bg-dark-background-secondary mt-3 rounded bg-gray-50 p-3">
                      <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Hinweis zu Kartenkacheln:
                      </p>
                      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                        Diese Website nutzt Kartenkacheln von OpenStreetMap. Die
                        Karten werden mit folgender Attribution angezeigt:
                        &quot;© OpenStreetMap contributors&quot;. Weitere
                        Informationen finden Sie unter{" "}
                        <a
                          href="https://www.openstreetmap.org/copyright"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          www.openstreetmap.org/copyright
                        </a>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Lucide React */}
                  <div className="dark:border-dark-border rounded-lg border border-gray-200 p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="text-dark dark:text-dark-text text-lg font-semibold">
                        Lucide React
                      </h3>
                      <div className="flex gap-2">
                        <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                          ISC License
                        </span>
                        <span className="bg-primary/10 text-primary dark:bg-primary/20 rounded px-2 py-1 text-xs font-semibold">
                          MIT License
                        </span>
                      </div>
                    </div>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      Icon-Bibliothek für React-Anwendungen
                    </p>
                    <a
                      href="https://lucide.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      https://lucide.dev
                    </a>
                    <div className="mt-3 space-y-3 text-xs">
                      <div className="dark:bg-dark-background-secondary rounded bg-gray-50 p-3">
                        <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                          ISC License (Hauptlizenz):
                        </p>
                        <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                          Copyright (c) für Teile von Lucide werden von Cole
                          Bemis 2013-2023 als Teil von Feather (MIT) gehalten.
                          Alle anderen Copyrights (c) für Lucide werden von
                          Lucide Contributors 2025 gehalten.
                        </p>
                        <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
                          Die Erlaubnis zur Nutzung, Kopie, Modifikation
                          und/oder Verbreitung dieser Software für jeden Zweck
                          mit oder ohne Gebühr wird hiermit erteilt,
                          vorausgesetzt, dass der obige Copyright-Hinweis und
                          diese Erlaubnis in allen Kopien erscheinen.
                        </p>
                        <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
                          DIE SOFTWARE WIRD &quot;WIE BESEHEN&quot;
                          BEREITGESTELLT UND DER AUTOR LEHNT ALLE
                          GEWÄHRLEISTUNGEN IN BEZUG AUF DIESE SOFTWARE AB,
                          EINSCHLIESSLICH ALLER IMPLIZITEN GEWÄHRLEISTUNGEN DER
                          MARKTGÄNGIGKEIT UND EIGNUNG FÜR EINEN BESTIMMTEN
                          ZWECK. IN KEINEM FALL HAFTET DER AUTOR FÜR BESONDERE,
                          DIREKTE, INDIREKTE ODER FOLGESCHÄDEN ODER SCHÄDEN
                          JEGLICHER ART, DIE AUS DEM VERLUST DER NUTZUNG, DATEN
                          ODER GEWINNE RESULTIEREN, OB IN EINEM VERTRAG,
                          FAHRLÄSSIGKEIT ODER ANDERER UNERLAUBTER HANDLUNG, DIE
                          AUS ODER IM ZUSAMMENHANG MIT DER NUTZUNG ODER LEISTUNG
                          DIESER SOFTWARE ENTSTEHEN.
                        </p>
                      </div>
                      <div className="dark:bg-dark-background-secondary rounded bg-gray-50 p-3">
                        <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                          MIT License (für Teile aus Feather Icons):
                        </p>
                        <p className="leading-relaxed text-gray-600 dark:text-gray-400">
                          Copyright (c) 2013-2023 Cole Bemis
                        </p>
                        <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
                          Hiermit wird jeder Person, die eine Kopie dieser
                          Software und der zugehörigen Dokumentationsdateien
                          (die &quot;Software&quot;) erhält, kostenlos die
                          Erlaubnis erteilt, uneingeschränkt mit der Software zu
                          handeln, einschließlich und ohne Einschränkung der
                          Rechte zur Nutzung, Kopie, Modifikation,
                          Zusammenführung, Veröffentlichung, Verbreitung,
                          Unterlizenzierung und/oder zum Verkauf von Kopien der
                          Software, und Personen, denen die Software
                          bereitgestellt wird, dies zu erlauben, unter den
                          folgenden Bedingungen:
                        </p>
                        <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
                          Der obige Copyright-Hinweis und dieser
                          Erlaubnishinweis müssen in allen Kopien oder
                          wesentlichen Teilen der Software enthalten sein.
                        </p>
                        <p className="mt-2 leading-relaxed text-gray-600 dark:text-gray-400">
                          DIE SOFTWARE WIRD &quot;WIE BESEHEN&quot;
                          BEREITGESTELLT, OHNE JEGLICHE GEWÄHRLEISTUNG,
                          AUSDRÜCKLICH ODER IMPLIZIT, EINSCHLIESSLICH, ABER
                          NICHT BESCHRÄNKT AUF DIE GEWÄHRLEISTUNGEN DER
                          MARKTGÄNGIGKEIT, EIGNUNG FÜR EINEN BESTIMMTEN ZWECK
                          UND NICHTVERLETZUNG. IN KEINEM FALL HAFTEN DIE AUTOREN
                          ODER COPYRIGHT-INHABER FÜR JEGLICHE ANSPRÜCHE, SCHÄDEN
                          ODER ANDERE HAFTUNGEN, OB IN EINEM VERTRAGSVERHÄLTNIS,
                          UNERLAUBTER HANDLUNG ODER ANDERWEITIG, DIE AUS, AUS
                          ODER IM ZUSAMMENHANG MIT DER SOFTWARE ODER DER NUTZUNG
                          ODER ANDEREN GESCHÄFTEN MIT DER SOFTWARE ENTSTEHEN.
                        </p>
                      </div>
                    </div>
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
                      <CheckIcon className="text-primary h-4 w-4" />
                      <strong>MIT License</strong> - Erlaubt kommerzielle
                      Nutzung, Modifikation und Verteilung
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="text-primary h-4 w-4" />
                      <strong>Apache License 2.0</strong> - Erlaubt Nutzung,
                      Modifikation und Verteilung mit Patentrechtsgewährung
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="text-primary h-4 w-4" />
                      <strong>BSD-2-Clause</strong> - Permissive Lizenz mit
                      minimalen Einschränkungen
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="text-primary h-4 w-4" />
                      <strong>0BSD</strong> - &ldquo;Zero-Clause&rdquo;
                      BSD-Lizenz, Public Domain äquivalent
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
                    <ArrowRightIcon className="h-4 w-4" />
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
                    <ArrowRightIcon className="h-4 w-4" />
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
    </PublicPage>
  );
}
