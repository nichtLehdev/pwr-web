import Link from "next/link";
import PublicPage from "../_components/general/public-page";
import { LICENSE_PACKAGES } from "@/lib/licenses.generated";
import { LICENSE_INFO } from "@/lib/license-texts";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Open-Source-Lizenzen",
  description:
    "Die Open-Source-Pakete, die diese Website verwendet, mit ihren Lizenzen im Wortlaut.",
  path: "/lizenzen",
});

/**
 * Plain attribution page: the packages we depend on directly, plus the full
 * text of every licence they stand under.
 *
 * The list is generated from package.json (see scripts/generate-licenses.ts) —
 * it used to be a hand-written list of 15 packages in the Impressum while 45
 * were shipping.
 */
export default function LizenzenPage() {
  // Licences in the order the packages introduce them, so the texts below
  // follow the same reading order as the list above.
  const licenses = [...new Set(LICENSE_PACKAGES.map((pkg) => pkg.license))];

  return (
    <PublicPage
      title="Open-Source-Lizenzen"
      color="primary"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Impressum", href: "/impressum" },
        { label: "Open-Source-Lizenzen" },
      ]}
      description={
        <p>
          Diese Website nutzt die folgenden Open-Source-Pakete. Vielen Dank an
          alle, die daran arbeiten.
        </p>
      }
    >
      <section className="bg-background dark:bg-dark-background py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold">
              Verwendete Pakete
            </h2>

            <ul className="dark:divide-dark-border divide-y divide-gray-200 border-y border-gray-200 dark:border-gray-700">
              {LICENSE_PACKAGES.map((pkg) => (
                <li
                  key={pkg.name}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                >
                  <span>
                    {pkg.homepage ? (
                      <a
                        href={pkg.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-dark dark:text-dark-text hover:text-primary font-medium hover:underline"
                      >
                        {pkg.name}
                      </a>
                    ) : (
                      <span className="text-dark dark:text-dark-text font-medium">
                        {pkg.name}
                      </span>
                    )}{" "}
                    <span className="text-sm text-gray-500 tabular-nums dark:text-gray-400">
                      {pkg.versions.join(", ")}
                    </span>
                    {pkg.copyright && (
                      <span className="block text-sm text-gray-500 dark:text-gray-400">
                        {pkg.copyright}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {pkg.license}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Die Liste wird bei jedem Build automatisch aus den tatsächlich
              eingebundenen Abhängigkeiten erzeugt. Nicht aufgeführt sind
              Pakete, die von den genannten ihrerseits mitgebracht werden, sowie
              Werkzeuge, die nur bei der Entwicklung laufen.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-background dark:bg-dark-background pb-12">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold">
              Die Lizenzen im Wortlaut
            </h2>

            <div className="space-y-10">
              {licenses.map((license) => {
                const info = LICENSE_INFO[license];
                const users = LICENSE_PACKAGES.filter(
                  (pkg) => pkg.license === license,
                ).map((pkg) => pkg.name);

                return (
                  <div key={license}>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-lg font-semibold">
                      {info?.title ?? license}
                    </h3>

                    {info ? (
                      <>
                        <p className="mb-2 text-gray-700 dark:text-gray-300">
                          {info.summary}
                        </p>
                        {info.note && (
                          <p className="mb-2 text-gray-700 dark:text-gray-300">
                            {info.note}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mb-2 text-gray-700 dark:text-gray-300">
                        Der Lizenztext ist über die Projektseiten der unten
                        genannten Pakete abrufbar.
                      </p>
                    )}

                    <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Verwendet von:</span>{" "}
                      {users.join(", ")}
                    </p>

                    {info && (
                      <pre className="dark:border-dark-border dark:bg-dark-background-secondary overflow-x-auto rounded border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {info.text}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background dark:bg-dark-background pb-16">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold">
              Weitere Hinweise
            </h2>

            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                Die Notendarstellung in unseren Übungsspielen nutzt die
                Schriftart{" "}
                <a
                  href="https://github.com/steinbergmedia/bravura"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Bravura
                </a>{" "}
                von Steinberg Media Technologies unter der SIL Open Font License
                1.1.
              </p>
              <p>
                Anbieterkennzeichnung und Haftungshinweise findest du im{" "}
                <Link
                  href="/impressum"
                  className="text-primary hover:underline"
                >
                  Impressum
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  );
}
