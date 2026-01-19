import Link from "next/link";
import Image from "next/image";
import { SocialIcon } from "@/app/_components/ui/social-icon";
import { api } from "@/trpc/server";
import PageHeader from "../_components/general/page-header";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  User,
  Monitor,
  Check,
  ArrowRight,
  Music,
  Users,
  Map,
  Send,
} from "lucide-react";

export default async function KontaktPage() {
  const geschaeftsstelle = await api.organization.getTeamByContactType({
    contactType: "GESCHAEFTSSTELLE",
  });
  const internetTeam = await api.organization.getTeamByContactType({
    contactType: "INTERNET_TEAM",
  });

  return (
    <div>
      <PageHeader title="Kontakt" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary py-16 text-white md:py-24">
        <div className="container">
          <nav className="mb-4 flex items-center gap-2 text-sm opacity-90">
            <Link href="/" className="transition-colors hover:text-white">
              Start
            </Link>
            <span>/</span>
            <span>Kontakt</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="mb-6 text-3xl font-bold md:text-4xl lg:text-5xl">
              Kontakt
            </h1>
            <p className="text-lg leading-relaxed opacity-95 md:text-xl">
              Haben Sie Fragen zur Posaunenchorarbeit oder möchten Sie mit uns
              in Kontakt treten? Wir freuen uns auf Ihre Nachricht!
            </p>
          </div>
        </div>
      </section>

      {/* Kontaktmöglichkeiten */}
      <section className="bg-background dark:bg-dark-background py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-dark dark:text-dark-text mb-8 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              So erreichen Sie uns
            </h2>

            <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Geschäftsstelle */}
              <div className="border-primary dark:bg-dark-surface dark:border-dark-border rounded-lg border-t-4 bg-white p-6 shadow-lg dark:border dark:shadow-none">
                <div className="mb-4 flex items-start gap-4">
                  <div className="bg-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                      Geschäftsstelle
                    </h3>
                    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                      Für allgemeine Anfragen und Verwaltung
                    </p>
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">
                        Posaunenwerk der Evangelischen Kirche im Rheinland e.V.
                        <br />
                        Rudolf-Harbig-Str. 20
                        <br />
                        56179 Vallendar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="text-primary h-5 w-5 shrink-0" />
                    <a
                      href={`tel:02613000011`}
                      className="hover:text-primary text-gray-700 transition-colors dark:text-gray-300"
                    >
                      0261 300 00 11
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="text-primary h-5 w-5 shrink-0" />
                    <a
                      href={`mailto:info@posaunenwerk-rheinland.de`}
                      className="hover:text-primary text-gray-700 transition-colors dark:text-gray-300"
                    >
                      info@posaunenwerk-rheinland.de
                    </a>
                  </div>

                  <div className="dark:border-dark-border border-t border-gray-200 pt-4">
                    <h4 className="text-dark dark:text-dark-text mb-2 flex items-center gap-2 font-semibold">
                      <Clock className="text-primary h-5 w-5" />
                      Erreichbarkeit
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p className="leading-relaxed">
                        Die Geschäftsstelle und das Telefon sind nicht jeden Tag
                        besetzt. Bitte senden Sie uns eine E-Mail oder
                        hinterlassen Sie bei einem Anruf gerne Ihre Nachricht
                        auf dem Anrufbeantworter. Sie erhalten dann so schnell
                        wie möglich eine Rückmeldung.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Team-Mitglieder */}
                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h4 className="text-dark dark:text-dark-text mb-4 font-semibold">
                    Unser Team
                  </h4>
                  <div className="space-y-4">
                    {geschaeftsstelle.map((member, index) => (
                      <div
                        key={index}
                        className="dark:hover:bg-dark-background-secondary flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200">
                          {member.user.profileImage ? (
                            <Image
                              src={member.user.profileImage.url}
                              alt={
                                member.user.profileImage.alt ||
                                member.user.displayName ||
                                "Profilbild"
                              }
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="bg-primary/10 flex h-full w-full items-center justify-center">
                              <User className="text-primary h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-dark dark:text-dark-text font-semibold">
                            {member.user.displayName}
                          </p>
                          <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                            {member.role}
                          </p>
                          {member.user.email && (
                            <a
                              href={`mailto:${member.user.email}`}
                              className="text-primary text-xs hover:underline"
                            >
                              {member.user.email}
                            </a>
                          )}
                          {member.responsibilities &&
                            Array.isArray(member.responsibilities) &&
                            member.responsibilities.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {member.responsibilities.join(" • ")}
                                </p>
                              </div>
                            )}
                          {member.socials &&
                            Array.isArray(member.socials) &&
                            member.socials.length > 0 && (
                              <div className="mt-2 flex gap-2">
                                {member.socials.map(
                                  (
                                    social: {
                                      type: string;
                                      url: string;
                                      label?: string;
                                    },
                                    idx: number,
                                  ) => (
                                    <a
                                      key={idx}
                                      href={social.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-primary flex h-6 w-6 items-center justify-center text-gray-500 transition-colors dark:text-gray-400"
                                      title={social.label || social.type}
                                    >
                                      <SocialIcon
                                        type={social.type}
                                        className="h-4 w-4"
                                      />
                                    </a>
                                  ),
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Internet-Team */}
              <div className="border-district-3 dark:bg-dark-surface dark:border-dark-border rounded-lg border-t-4 bg-white p-6 shadow-lg dark:border dark:shadow-none">
                <div className="mb-4 flex items-start gap-4">
                  <div className="bg-district-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                    <Monitor className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-dark dark:text-dark-text mb-2 text-xl font-bold">
                      Internet-Team
                    </h3>
                    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                      Für Website-Fragen und technischen Support
                    </p>
                  </div>
                </div>

                <div className="mb-6 space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Haben Sie Fragen zur Website, technische Probleme oder
                    Anregungen für neue Features? Unser Internet-Team hilft
                    Ihnen gerne weiter.
                  </p>

                  <div className="flex items-center gap-3">
                    <Mail className="text-district-3 h-5 w-5 shrink-0" />
                    <a
                      href={`mailto:webmaster@posaunenwerk-rheinland.de`}
                      className="hover:text-district-3 text-gray-700 transition-colors dark:text-gray-300"
                    >
                      webmaster@posaunenwerk-rheinland.de
                    </a>
                  </div>

                  <div className="bg-district-3/5 dark:bg-district-3/10 rounded-lg p-4">
                    <h4 className="text-dark dark:text-dark-text mb-2 font-semibold">
                      Wir helfen bei:
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <Check className="text-district-3 mt-0.5 h-4 w-4 shrink-0" />
                        Login-Problemen
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="text-district-3 mt-0.5 h-4 w-4 shrink-0" />
                        Veranstaltungen einstellen
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="text-district-3 mt-0.5 h-4 w-4 shrink-0" />
                        Technischen Fragen
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="text-district-3 mt-0.5 h-4 w-4 shrink-0" />
                        Feedback und Verbesserungsvorschlägen
                        <Link
                          href="/feedback"
                          className="bg-district-3/10 text-district-3 hover:bg-district-3/20 ml-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold transition-colors"
                        >
                          Feedback geben
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Team-Mitglieder */}
                <div className="dark:border-dark-border border-t border-gray-200 pt-6">
                  <h4 className="text-dark dark:text-dark-text mb-4 font-semibold">
                    Unser Team
                  </h4>
                  <div className="space-y-4">
                    {internetTeam.map((member, index) => (
                      <div
                        key={index}
                        className="dark:hover:bg-dark-background-secondary flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-200">
                          {member.user.profileImage ? (
                            <Image
                              src={member.user.profileImage.url}
                              alt={
                                member.user.profileImage.alt ||
                                member.user.displayName ||
                                "Profilbild"
                              }
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="bg-district-3/10 flex h-full w-full items-center justify-center">
                              <User className="text-district-3 h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-dark dark:text-dark-text font-semibold">
                            {member.user.displayName}
                          </p>
                          <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                            {member.role}
                          </p>
                          {member.user.email && (
                            <a
                              href={`mailto:${member.user.email}`}
                              className="text-district-3 text-xs hover:underline"
                            >
                              {member.user.email}
                            </a>
                          )}
                          {member.responsibilities &&
                            Array.isArray(member.responsibilities) &&
                            member.responsibilities.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {member.responsibilities.join(" • ")}
                                </p>
                              </div>
                            )}
                          {member.socials &&
                            Array.isArray(member.socials) &&
                            member.socials.length > 0 && (
                              <div className="mt-2 flex gap-2">
                                {member.socials.map(
                                  (
                                    social: {
                                      type: string;
                                      url: string;
                                      label?: string;
                                    },
                                    idx: number,
                                  ) => (
                                    <a
                                      key={idx}
                                      href={social.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-district-3 flex h-6 w-6 items-center justify-center text-gray-500 transition-colors dark:text-gray-400"
                                      title={social.label || social.type}
                                    >
                                      <SocialIcon
                                        type={social.type}
                                        className="h-4 w-4"
                                      />
                                    </a>
                                  ),
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Kontaktformular */}
            <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-lg md:p-8 dark:border dark:shadow-none">
              <h3 className="text-dark dark:text-dark-text mb-2 text-2xl font-bold">
                Allgemeine Anfrage
              </h3>
              <p className="mb-6 text-gray-600 dark:text-gray-400">
                Nutzen Sie unser Kontaktformular für allgemeine Anfragen. Wir
                melden uns zeitnah bei Ihnen.
              </p>

              <form className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
                    >
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 transition-all outline-none focus:border-transparent focus:ring-2"
                      placeholder="Max Mustermann"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
                    >
                      E-Mail *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 transition-all outline-none focus:border-transparent focus:ring-2"
                      placeholder="max@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="phone"
                      className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
                    >
                      Telefon (optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 transition-all outline-none focus:border-transparent focus:ring-2"
                      placeholder="+49 123 456789"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
                    >
                      Betreff *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2 transition-all outline-none focus:border-transparent focus:ring-2"
                    >
                      <option value="">Bitte wählen...</option>
                      <option value="allgemein">Allgemeine Anfrage</option>
                      <option value="chor">Posaunenchor gründen/finden</option>
                      <option value="ausbildung">Ausbildung</option>
                      <option value="termine">Termine & Veranstaltungen</option>
                      <option value="materialien">Noten & Materialien</option>
                      <option value="foerderverein">Förderverein</option>
                      <option value="sonstiges">Sonstiges</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold"
                  >
                    Ihre Nachricht *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    className="focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text w-full resize-y rounded-lg border border-gray-300 px-4 py-2 transition-all outline-none focus:border-transparent focus:ring-2"
                    placeholder="Beschreiben Sie Ihr Anliegen..."
                  />
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="privacy"
                    name="privacy"
                    required
                    className="text-primary focus:ring-primary dark:border-dark-border mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <label
                    htmlFor="privacy"
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    Ich habe die{" "}
                    <Link
                      href="/datenschutz"
                      className="text-primary hover:underline"
                    >
                      Datenschutzerklärung
                    </Link>{" "}
                    zur Kenntnis genommen. Ich stimme zu, dass meine Angaben zur
                    Kontaktaufnahme und für Rückfragen gespeichert werden. *
                  </label>
                </div>

                <div>
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-dark inline-flex items-center rounded-lg px-8 py-3 font-semibold text-white transition-colors"
                  >
                    Nachricht senden
                    <Send className="ml-2 h-5 w-5" />
                  </button>
                  <p className="mt-3 text-xs text-gray-500">* Pflichtfelder</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Weitere Ansprechpartner */}
      <section className="bg-background-secondary dark:bg-dark-background-secondary py-12 md:py-16 lg:py-20">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-dark dark:text-dark-text mb-4 text-center text-2xl font-bold md:text-3xl lg:text-4xl">
              Weitere Ansprechpartner
            </h2>
            <p className="mb-8 text-center text-lg text-gray-600 dark:text-gray-400">
              Je nach Anliegen können Sie sich auch direkt an die zuständigen
              Personen wenden.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Link
                href="/ueber-uns/posaunenwarte"
                className="group dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border dark:shadow-none"
              >
                <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text group-hover:text-primary mb-2 text-lg font-bold transition-colors">
                  Landesposaunenwarte
                </h3>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Für musikalische und inhaltliche Fragen zur Posaunenchorarbeit
                </p>
                <span className="text-primary text-sm font-semibold group-hover:underline">
                  Kontakte ansehen →
                </span>
              </Link>

              <Link
                href="/ueber-uns/vorstand"
                className="group dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border dark:shadow-none"
              >
                <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text group-hover:text-primary mb-2 text-lg font-bold transition-colors">
                  Vorstand
                </h3>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Für strategische und organisatorische Angelegenheiten
                </p>
                <span className="text-primary text-sm font-semibold group-hover:underline">
                  Kontakte ansehen →
                </span>
              </Link>

              <Link
                href="/ueber-uns/bezirke"
                className="group dark:bg-dark-surface dark:border-dark-border rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-lg dark:border dark:shadow-none"
              >
                <div className="bg-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110">
                  <Map className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-dark dark:text-dark-text group-hover:text-primary mb-2 text-lg font-bold transition-colors">
                  Bezirksobleute
                </h3>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Für regionale Anliegen und lokale Posaunenchöre
                </p>
                <span className="text-primary text-sm font-semibold group-hover:underline">
                  Kontakte ansehen →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media & Newsletter */}
      <section className="bg-primary py-12 text-white md:py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Bleiben Sie auf dem Laufenden
            </h2>
            <p className="mb-8 text-lg opacity-95">
              Folgen Sie uns auf Social Media oder abonnieren Sie unseren
              Newsletter für aktuelle Informationen.
            </p>

            <div className="mb-8 flex flex-wrap justify-center gap-4">
              <a
                href="https://facebook.com/posaunenwerkrheinland"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-white/10 px-6 py-3 transition-colors hover:bg-white/20"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>

              <a
                href="https://www.instagram.com/posaunenwerk_rheinland/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-white/10 px-6 py-3 transition-colors hover:bg-white/20"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Instagram
              </a>

              <a
                href="https://www.youtube.com/@PWRheinland"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg bg-white/10 px-6 py-3 transition-colors hover:bg-white/20"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                YouTube
              </a>
            </div>

            <Link
              href="/newsletter"
              className="text-primary inline-flex items-center rounded-lg bg-white px-8 py-4 font-bold shadow-lg transition-colors hover:bg-gray-100"
            >
              <Mail className="mr-2 h-6 w-6" />
              Newsletter abonnieren
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
