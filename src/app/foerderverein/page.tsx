import Link from "next/link";
import PageHeader from "../_components/general/page-header";
import { api } from "@/trpc/server";
import PeopleCard from "../_components/general/people-card";
import { capitalizeFirstLetter } from "@/lib/utils";
import {
  DownloadIcon,
  HandCoinsIcon,
  MusicIcon,
  CalendarIcon,
} from "lucide-react";
import { MailIcon, GiftIcon } from "lucide-react";
import { UsersIcon } from "lucide-react";

const sonderaktionen = [
  {
    title: "Geschenk-CD für Neumitglieder",
    description:
      "Wer bis zum 31. Dezember 2025 Mitglied wird, erhält eine CD zum Bläserheft nach Wahl geschenkt!",
    options: ["England", "Skandinavien", "Osteuropa", "Italien", "USA"],
  },
  {
    title: "Werbeaktion mit Verlosung",
    description:
      "Wer bis Ende Juni 2025 ein Mitglied wirbt, bekommt die Chance auf einen der drei Hauptpreise!",
    subtitle: "Verlosung am 12. Juli in Bonn während unseres Fördervereintags.",
  },
];

export default async function FoerdervereinPage() {
  const foerdervereinMembers = await api.organization.getFoerderverein();
  const boardMembers = foerdervereinMembers.filter(
    (member) => member.role !== "BEISITZER" && member.role !== "MITGLIED",
  );
  const beisitzMembers = foerdervereinMembers.filter(
    (member) => member.role === "BEISITZER",
  );

  return (
    <div>
      <PageHeader
        title="Förderverein Rheinisches Posaunenwerk"
        color="foerderverein"
      />

      {/* Hero Section */}
      <section className="bg-foerderverein dark:bg-foerderverein-dark py-16 text-white md:py-24">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <Link
              href="/ueber-uns"
              className="transition-colors hover:text-white"
            >
              Über Uns
            </Link>
            <span>/</span>
            <span>Förderverein</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Förderverein Rheinisches Posaunenwerk
            </h1>
            <p className="mb-8 text-lg leading-relaxed md:text-xl">
              Bläser für Bläser – Unterstützen Sie die Arbeit des Posaunenwerks
              und werden Sie Teil unserer Gemeinschaft!
            </p>
          </div>
        </div>
      </section>

      {/* Sonderaktionen 2025 */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h2 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold md:text-3xl lg:text-4xl">
                Sonderaktionen 2025
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Jetzt Mitglied werden und von exklusiven Vorteilen profitieren!
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {sonderaktionen.map((aktion, i) => (
                <div
                  key={i}
                  className="border-foerderverein dark:bg-dark-surface dark:shadow-dark-border rounded-lg border-l-4 bg-white p-6 shadow-lg"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <MusicIcon className="text-foerderverein h-8 w-8 shrink-0" />
                    <div>
                      <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                        {aktion.title}
                      </h3>
                      <p className="mb-3 text-gray-600 dark:text-gray-400">
                        {aktion.description}
                      </p>
                      {aktion.options && (
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          Auswahl: {aktion.options.join(", ")}
                          <br />
                          <em>
                            (Bitte bei der Anmeldung die Auswahl vermerken)
                          </em>
                        </p>
                      )}
                      {aktion.subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          {aktion.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <a
                href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                className="bg-foerderverein inline-flex items-center rounded-lg px-8 py-4 text-lg font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
              >
                <MailIcon className="mr-2 h-6 w-6" />
                Jetzt Mitglied werden
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Was wir tun */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-6 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Was wir tun
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-center text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              Seit 2008 unterstützt der Förderverein das Posaunenwerk bei seinen
              Aufgaben. Durch zweckgebundene Spenden bauen wir einen
              Vermögensstock auf, mit dessen Erträgen wir die Arbeit des
              Posaunenwerks nachhaltig fördern.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-foerderverein mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Auswahlchorarbeit
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Förderung junger, talentierter Bläserinnen und Bläser in
                  unseren Auswahlensembles wie dem Landesjugendposaunenchor und
                  ConSpirito.
                </p>
              </div>

              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-foerderverein mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Geschwisterermäßigung
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  25 € Ermäßigung pro weiteres Geschwisterkind bei Lehrgängen
                  des Posaunenwerks – der Förderverein gleicht den Betrag aus.
                </p>
              </div>

              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-foerderverein mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Lehrgangskosten
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Bis zu 1.000 € pro Jahr zur Reduzierung der Teilnehmerbeiträge
                  für Lehrgänge – das hilft allen Teilnehmenden.
                </p>
              </div>

              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-6 shadow-md">
                <div className="bg-foerderverein mb-4 flex h-12 w-12 items-center justify-center rounded-full">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text mb-3 text-xl font-bold">
                  Projektförderung
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  CD-Produktionen, Drucksachen, Werbemittel und weitere Projekte
                  des Posaunenwerks – finanziert aus Mitteln des Fördervereins.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mitglied werden */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-6 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Mitglied werden
            </h2>
            <p className="mb-12 text-center text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              Unterstützen Sie die Arbeit des Posaunenwerks kontinuierlich und
              werden Sie Teil unserer Gemeinschaft. Ihre Beiträge fließen direkt
              in Förderprojekte, Werbemittel und weitere wichtige Aufgaben.
            </p>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-xl md:p-12">
              <h3 className="text-dark dark:text-dark-text mb-6 text-2xl font-bold">
                Ihre Vorteile als Mitglied:
              </h3>

              <div className="mb-8 space-y-4">
                <div className="flex items-start gap-3">
                  <HandCoinsIcon className="text-foerderverein mt-0.5 h-6 w-6 shrink-0" />
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Günstiger Jahresbeitrag: nur 36 €</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <MusicIcon className="text-foerderverein mt-0.5 h-6 w-6 shrink-0" />
                  <p className="text-gray-700 dark:text-gray-300">
                    Einladung zur jährlichen Mitgliederversammlung mit Berichten
                    und Zukunftsplanungen
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarIcon className="text-foerderverein mt-0.5 h-6 w-6 shrink-0" />
                  <p className="text-gray-700 dark:text-gray-300">
                    Flexible Kündigung möglich bis 3 Monate vor Jahresende
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <GiftIcon className="text-foerderverein mt-0.5 h-6 w-6 shrink-0" />
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>2025:</strong> Geschenk-CD für Neumitglieder!
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                  className="bg-foerderverein inline-flex items-center justify-center rounded-lg px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <MailIcon className="mr-2 h-5 w-5" />
                  Mitglied werden
                </a>
                <a
                  href="/downloads/foerderverein-flyer.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-foerderverein text-foerderverein hover:bg-foerderverein inline-flex items-center justify-center rounded-lg border-2 bg-white px-8 py-3 font-semibold transition-colors hover:text-white"
                >
                  <DownloadIcon className="mr-2 h-5 w-5" />
                  Flyer herunterladen
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Spenden & CD */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-12 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Weitere Unterstützungsmöglichkeiten
            </h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Spenden */}
              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg">
                <h3 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
                  Spenden & Kollekten
                </h3>
                <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-400">
                  Gerne werden wir bei freudigen oder traurigen Anlässen als
                  Spendenempfänger benannt. Wir stellen Spendenbescheinigungen
                  aus und sind als steuerbegünstigt anerkannt.
                </p>

                <div className="bg-background-secondary dark:bg-dark-background-secondary mb-6 rounded-lg p-4">
                  <p className="text-dark dark:text-dark-text mb-2 font-semibold">
                    Bankverbindung:
                  </p>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    Förderverein Rheinisches Posaunenwerk e.V.
                    <br />
                    KD-Bank Dortmund
                    <br />
                    <strong>IBAN:</strong> DE65 3506 0190 1014 1990 19
                    <br />
                    <strong>BIC:</strong> GENODED1DKD
                  </p>
                </div>

                <p className="text-sm text-gray-500 italic dark:text-gray-500">
                  Das Finanzamt Essen-Süd hat den Förderverein als
                  steuerbegünstigt anerkannt und berechtigt,
                  Spendenbescheinigungen auszustellen.
                </p>
              </div>

              {/* CD */}
              <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg">
                <h3 className="text-dark dark:text-dark-text mb-4 text-2xl font-bold">
                  CD &quot;Unter Sternen und Satelliten&quot;
                </h3>
                <p className="mb-4 leading-relaxed text-gray-600 dark:text-gray-400">
                  Unsere Ensembles haben eine wunderbare CD eingespielt – mit
                  Trompeter <strong>Markus Stockhausen</strong> als Solist.
                  Komplett vom Förderverein finanziert!
                </p>
                <p className="mb-6 text-gray-600 dark:text-gray-400">
                  Die CD wurde bereits auf dem Deutschen Evangelischen
                  Posaunentag präsentiert und erhielt viel Applaus.
                </p>

                <div className="bg-foerderverein/10 dark:bg-foerderverein/20 mb-6 rounded-lg p-4">
                  <p className="text-dark dark:text-dark-text mb-1 text-2xl font-bold">
                    15 €
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    zzgl. 2 € Versandkostenpauschale
                  </p>
                </div>

                <a
                  href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=CD-Bestellung 'Unter Sternen und Satelliten'"
                  className="bg-foerderverein inline-flex w-full items-center justify-center rounded-lg px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <MailIcon className="mr-2 h-5 w-5" />
                  Jetzt bestellen
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vorstand */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Unser Vorstand
            </h2>

            <div className="dark:bg-dark-surface dark:shadow-dark-border rounded-lg bg-white p-8 shadow-lg">
              <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                {boardMembers.map((member) => (
                  <PeopleCard
                    key={member.id}
                    image={
                      (member.image || member.user?.profileImage) ?? undefined
                    }
                    name={
                      member.name || member.user?.displayName || "Unbekannt"
                    }
                    subtitle={capitalizeFirstLetter(member.role)}
                    email={member.user?.email || undefined}
                  />
                ))}
              </div>

              <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                <h3 className="text-dark dark:text-dark-text mb-3 font-bold">
                  Beisitzer
                </h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {beisitzMembers.map((member) => (
                    <p
                      key={member.id}
                      className="text-gray-700 dark:text-gray-300"
                    >
                      {member.name}{" "}
                      {member.user?.city && `(${member.user.city})`}
                    </p>
                  ))}
                </div>
              </div>

              <div className="dark:border-dark-border mt-6 border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
      <section className="bg-foerderverein py-12 text-white md:py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Werden Sie Teil unserer Gemeinschaft!
            </h2>
            <p className="mb-8 text-lg">
              Unterstützen Sie die Arbeit des Posaunenwerks und profitieren Sie
              von exklusiven Vorteilen.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="mailto:foerderverein@posaunenwerk-rheinland.de?subject=Mitgliedschaft im Förderverein"
                className="text-foerderverein inline-block rounded-lg bg-white px-8 py-3 font-semibold transition-colors hover:bg-gray-100"
              >
                Mitglied werden
              </a>
              <Link
                href="/kontakt"
                className="inline-block rounded-lg border-2 border-white bg-transparent px-8 py-3 font-semibold text-white transition-colors hover:bg-white/10"
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
