import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import Image from "next/image";
import { geschaeftsstelle, internetTeam } from "@/lib/generalData";
import { getSocialIcon } from "@/lib/utils";

export default function KontaktPage() {
  return (
    <div>
      <PageHeader title="Kontakt" color="primary" />

      {/* Hero Section */}
      <section className="bg-primary text-white py-16 md:py-24">
        <div className="container">
          <nav className="text-sm mb-4 flex items-center gap-2 opacity-90">
            <Link href="/" className="hover:text-white transition-colors">
              Start
            </Link>
            <span>/</span>
            <span>Kontakt</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Kontakt
            </h1>
            <p className="text-lg md:text-xl leading-relaxed opacity-95">
              Haben Sie Fragen zur Posaunenchorarbeit oder möchten Sie mit uns
              in Kontakt treten? Wir freuen uns auf Ihre Nachricht!
            </p>
          </div>
        </div>
      </section>

      {/* Kontaktmöglichkeiten */}
      <section className="py-12 md:py-16 lg:py-20 bg-background">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-8 text-center">
              So erreichen Sie uns
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Geschäftsstelle */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-primary">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shrink-0">
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-2">
                      {geschaeftsstelle.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      {geschaeftsstelle.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {geschaeftsstelle.address && (
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-primary shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-gray-700">
                          Evangelisches Posaunenwerk
                          <br />
                          in der Evangelischen Kirche im Rheinland
                          <br />
                          {geschaeftsstelle.address.street}
                          <br />
                          {geschaeftsstelle.address.zip}{" "}
                          {geschaeftsstelle.address.city}
                        </p>
                      </div>
                    </div>
                  )}

                  {geschaeftsstelle.phone && (
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-primary shrink-0"
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
                      <a
                        href={`tel:${geschaeftsstelle.phone.replace(
                          /\s/g,
                          ""
                        )}`}
                        className="text-gray-700 hover:text-primary transition-colors"
                      >
                        {geschaeftsstelle.phone}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-primary shrink-0"
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
                    <a
                      href={`mailto:${geschaeftsstelle.email}`}
                      className="text-gray-700 hover:text-primary transition-colors"
                    >
                      {geschaeftsstelle.email}
                    </a>
                  </div>

                  {geschaeftsstelle.openingHours && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="font-semibold text-dark mb-2 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-primary"
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
                        Erreichbarkeit
                      </h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        {geschaeftsstelle.openingHours.note && (
                          <p className="leading-relaxed">
                            {geschaeftsstelle.openingHours.note}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Team-Mitglieder */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-dark mb-4">Unser Team</h4>
                  <div className="space-y-4">
                    {geschaeftsstelle.members.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="shrink-0 w-12 h-12 relative rounded-full overflow-hidden bg-gray-200">
                          {member.image ? (
                            <Image
                              src={member.image}
                              alt={member.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <svg
                                className="w-6 h-6 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-dark">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            {member.role}
                          </p>
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="text-xs text-primary hover:underline"
                            >
                              {member.email}
                            </a>
                          )}
                          {member.responsibilities &&
                            member.responsibilities.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">
                                  {member.responsibilities.join(" • ")}
                                </p>
                              </div>
                            )}
                          {member.socials && member.socials.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {member.socials.map((social, idx) => (
                                <a
                                  key={idx}
                                  href={social.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-primary transition-colors"
                                  title={social.label || social.platform}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                  >
                                    {getSocialIcon(social.platform)}
                                  </svg>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Internet-Team */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-district-3">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-district-3 rounded-full flex items-center justify-center shrink-0">
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
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-dark mb-2">
                      {internetTeam.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      {internetTeam.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <p className="text-gray-600">
                    Haben Sie Fragen zur Website, technische Probleme oder
                    Anregungen für neue Features? Unser Internet-Team hilft
                    Ihnen gerne weiter.
                  </p>

                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-district-3 shrink-0"
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
                    <a
                      href={`mailto:${internetTeam.email}`}
                      className="text-gray-700 hover:text-district-3 transition-colors"
                    >
                      {internetTeam.email}
                    </a>
                  </div>

                  <div className="bg-district-3/5 rounded-lg p-4">
                    <h4 className="font-semibold text-dark mb-2">
                      Wir helfen bei:
                    </h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-district-3 shrink-0 mt-0.5"
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
                        Login-Problemen
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-district-3 shrink-0 mt-0.5"
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
                        Veranstaltungen einstellen
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-district-3 shrink-0 mt-0.5"
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
                        Technischen Fragen
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-district-3 shrink-0 mt-0.5"
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
                        Feedback und Verbesserungsvorschlägen
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Team-Mitglieder */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-semibold text-dark mb-4">Unser Team</h4>
                  <div className="space-y-4">
                    {internetTeam.members.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="shrink-0 w-12 h-12 relative rounded-full overflow-hidden bg-gray-200">
                          {member.image ? (
                            <Image
                              src={member.image}
                              alt={member.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-district-3/10">
                              <svg
                                className="w-6 h-6 text-district-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-dark">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            {member.role}
                          </p>
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="text-xs text-district-3 hover:underline"
                            >
                              {member.email}
                            </a>
                          )}
                          {member.responsibilities &&
                            member.responsibilities.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">
                                  {member.responsibilities.join(" • ")}
                                </p>
                              </div>
                            )}
                          {member.socials && member.socials.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {member.socials.map((social, idx) => (
                                <a
                                  key={idx}
                                  href={social.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-district-3 transition-colors"
                                  title={social.label || social.platform}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                  >
                                    {getSocialIcon(social.platform)}
                                  </svg>
                                </a>
                              ))}
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
            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
              <h3 className="text-2xl font-bold text-dark mb-2">
                Allgemeine Anfrage
              </h3>
              <p className="text-gray-600 mb-6">
                Nutzen Sie unser Kontaktformular für allgemeine Anfragen. Wir
                melden uns zeitnah bei Ihnen.
              </p>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-semibold text-dark mb-2"
                    >
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder="Max Mustermann"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-dark mb-2"
                    >
                      E-Mail *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder="max@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-semibold text-dark mb-2"
                    >
                      Telefon (optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      placeholder="+49 123 456789"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-semibold text-dark mb-2"
                    >
                      Betreff *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
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
                    className="block text-sm font-semibold text-dark mb-2"
                  >
                    Ihre Nachricht *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-y"
                    placeholder="Beschreiben Sie Ihr Anliegen..."
                  />
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="privacy"
                    name="privacy"
                    required
                    className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="privacy" className="text-sm text-gray-600">
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
                    className="inline-flex items-center px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Nachricht senden
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
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </button>
                  <p className="text-xs text-gray-500 mt-3">* Pflichtfelder</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Weitere Ansprechpartner */}
      <section className="py-12 md:py-16 lg:py-20 bg-background-secondary">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-dark mb-4 text-center">
              Weitere Ansprechpartner
            </h2>
            <p className="text-lg text-gray-600 mb-8 text-center">
              Je nach Anliegen können Sie sich auch direkt an die zuständigen
              Personen wenden.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/ueber-uns/posaunenwarte"
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 group"
              >
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
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
                <h3 className="text-lg font-bold text-dark mb-2 group-hover:text-primary transition-colors">
                  Landesposaunenwarte
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Für musikalische und inhaltliche Fragen zur Posaunenchorarbeit
                </p>
                <span className="text-primary text-sm font-semibold group-hover:underline">
                  Kontakte ansehen →
                </span>
              </Link>

              <Link
                href="/ueber-uns/vorstand"
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 group"
              >
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
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
                <h3 className="text-lg font-bold text-dark mb-2 group-hover:text-primary transition-colors">
                  Vorstand
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Für strategische und organisatorische Angelegenheiten
                </p>
                <span className="text-primary text-sm font-semibold group-hover:underline">
                  Kontakte ansehen →
                </span>
              </Link>

              <Link
                href="/ueber-uns/bezirke"
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 group"
              >
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
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
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-dark mb-2 group-hover:text-primary transition-colors">
                  Bezirksobleute
                </h3>
                <p className="text-sm text-gray-600 mb-3">
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
      <section className="py-12 md:py-16 bg-primary text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Bleiben Sie auf dem Laufenden
            </h2>
            <p className="text-lg mb-8 opacity-95">
              Folgen Sie uns auf Social Media oder abonnieren Sie unseren
              Newsletter für aktuelle Informationen.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <a
                href="https://facebook.com/posaunenwerkrheinland"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
              className="inline-flex items-center px-8 py-4 bg-white text-primary font-bold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
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
              Newsletter abonnieren
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
