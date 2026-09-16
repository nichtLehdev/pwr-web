import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { ContactForm } from "@/app/_components/forms/contact-form";
import { api } from "@/trpc/server";
import { env } from "@/env";
import PublicPage from "../_components/general/public-page";
import { ClosingCall } from "../_components/programmheft/closing-call";
import { PageSection, Split } from "../_components/programmheft/page-section";
import { Heading, SectionHead } from "../_components/programmheft/section-head";
import { WayList, WayRow } from "../_components/programmheft/way-list";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Kontakt",
  description:
    "Kontakt zum Posaunenwerk der Evangelischen Kirche im Rheinland — Geschäftsstelle in Vallendar, Ansprechpartner und Kontaktformular.",
  path: "/kontakt",
});

/** Fließtext der Seite: Tinte, ruhige Zeilenlänge. */
const PROSE =
  "text-ink dark:text-night-text max-w-[65ch] space-y-4 text-lg leading-relaxed";

/** Kleiner Kopf innerhalb eines Abschnitts, z. B. „Erreichbarkeit“. */
const LABEL_HEAD =
  "semi-condensed text-ink dark:text-night-text text-lg font-semibold";

const WEITERE_ANSPRECHPARTNER = [
  {
    href: "/ueber-uns/posaunenwarte",
    title: "Posaunenwarte",
    description:
      "Für musikalische und inhaltliche Fragen zur Posaunenchorarbeit",
  },
  {
    href: "/ueber-uns/vorstand",
    title: "Vorstand",
    description: "Für strategische und organisatorische Angelegenheiten",
  },
  {
    href: "/ueber-uns/bezirke",
    title: "Bezirksobleute",
    description: "Für regionale Anliegen und lokale Posaunenchöre",
  },
];

const HILFE_BEI = [
  "Login-Problemen",
  "Veranstaltungen einstellen",
  "Technischen Fragen",
];

type OrgTeamMember = Awaited<
  ReturnType<typeof api.organization.getTeamByContactType>
>[number];

/**
 * Team-Mitglied als Registerzeile: rundes Foto (einzige Rundung im Heft, wo
 * eines vorliegt), Name, Amt, E-Mail als Textlink, Zuständigkeiten und
 * Social-Links als kleiner Fließtext darunter.
 */
function TeamMemberRow({ member }: { member: OrgTeamMember }) {
  const responsibilities =
    member.responsibilities &&
    Array.isArray(member.responsibilities) &&
    member.responsibilities.length > 0
      ? (member.responsibilities as string[]).join(" • ")
      : null;
  const socials =
    member.socials && Array.isArray(member.socials) && member.socials.length > 0
      ? (member.socials as { type: string; url: string; label?: string }[])
      : null;

  return (
    <li className="border-rule dark:border-night-rule flex items-start gap-4 border-b py-4">
      {member.person.image ? (
        <div className="bg-rule dark:bg-night-rule relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
          <Image
            src={member.person.image.url}
            alt={member.person.image.alt || member.person.name || "Profilbild"}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="border-ink dark:border-night-text text-dark dark:text-night-muted flex h-14 w-14 shrink-0 items-center justify-center border-2">
          <User className="h-6 w-6" aria-hidden />
        </div>
      )}
      <div className="min-w-0">
        <p className="condensed text-ink dark:text-night-text text-[1.375rem] leading-tight font-bold">
          {member.person.name}
        </p>
        <p className="text-dark dark:text-night-muted mt-0.5 text-[0.9375rem]">
          {member.role}
        </p>
        {member.person.email ? (
          <a
            href={`mailto:${member.person.email}`}
            className="link-ink mt-1 inline-flex min-h-11 items-center text-sm"
          >
            {member.person.email}
          </a>
        ) : null}
        {responsibilities ? (
          <p className="text-dark dark:text-night-muted mt-1 text-sm">
            {responsibilities}
          </p>
        ) : null}
        {socials ? (
          <p className="mt-1 flex flex-wrap gap-x-3">
            {socials.map((social, idx) => (
              <a
                key={idx}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-ink text-sm"
              >
                {social.label || social.type}
                <span className="sr-only"> (öffnet eine externe Website)</span>
              </a>
            ))}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export default async function KontaktPage() {
  const geschaeftsstelle = await api.organization.getTeamByContactType({
    contactType: "GESCHAEFTSSTELLE",
  });
  const internetTeam = await api.organization.getTeamByContactType({
    contactType: "INTERNET_TEAM",
  });

  return (
    <PublicPage
      title="Kontakt"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Kontakt" }]}
      description={
        <p>
          Haben Sie Fragen zur Posaunenchorarbeit oder möchten Sie mit uns in
          Kontakt treten? Wir freuen uns auf Ihre Nachricht!
        </p>
      }
    >
      <PageSection labelledBy="erreichen-heading">
        <Split
          head={<Heading id="erreichen-heading">So erreichen Sie uns</Heading>}
          bodyClassName="mt-8"
        >
          <div className="grid gap-y-12 sm:grid-cols-2 sm:gap-x-10 lg:gap-x-16">
            <div className="border-rule dark:border-night-rule border-b pb-12 sm:border-b-0 sm:pr-10 sm:pb-0 lg:pr-16">
              <Heading as="h3" size="list" rule>
                Geschäftsstelle
              </Heading>
              <div className={`${PROSE} mt-5`}>
                <p>Für allgemeine Anfragen und Verwaltung</p>
                <p>
                  Posaunenwerk der Evangelischen Kirche im Rheinland e.V.
                  <br />
                  Rudolf-Harbig-Str. 20
                  <br />
                  56179 Vallendar
                </p>
                <p>
                  <a href="tel:02613000011" className="link-ink">
                    0261 300 00 11
                  </a>
                  <br />
                  <a
                    href="mailto:info@posaunenwerk-rheinland.de"
                    className="link-ink"
                  >
                    info@posaunenwerk-rheinland.de
                  </a>
                </p>
              </div>

              <h4 className={`${LABEL_HEAD} mt-8`}>Erreichbarkeit</h4>
              <p className="text-ink dark:text-night-text mt-3 max-w-[65ch] text-lg leading-relaxed">
                Die Geschäftsstelle und das Telefon sind nicht jeden Tag
                besetzt. Bitte senden Sie uns eine E-Mail oder hinterlassen Sie
                bei einem Anruf gerne Ihre Nachricht auf dem Anrufbeantworter.
                Sie erhalten dann so schnell wie möglich eine Rückmeldung.
              </p>

              {geschaeftsstelle.length > 0 ? (
                <>
                  <h4 className={`${LABEL_HEAD} mt-8`}>Unser Team</h4>
                  <ul className="border-ink dark:border-night-text mt-3 border-t-2">
                    {geschaeftsstelle.map((member, index) => (
                      <TeamMemberRow key={index} member={member} />
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            <div className="border-rule dark:border-night-rule sm:border-l sm:pl-10 lg:pl-16">
              <Heading as="h3" size="list" rule>
                Internet-Team
              </Heading>
              <div className={`${PROSE} mt-5`}>
                <p>Für Website-Fragen und technischen Support</p>
                <p>
                  Haben Sie Fragen zur Website, technische Probleme oder
                  Anregungen für neue Features? Unser Internet-Team hilft Ihnen
                  gerne weiter.
                </p>
                <p>
                  <a
                    href="mailto:webmaster@posaunenwerk-rheinland.de"
                    className="link-ink"
                  >
                    webmaster@posaunenwerk-rheinland.de
                  </a>
                </p>
              </div>

              <h4 className={`${LABEL_HEAD} mt-8`}>Wir helfen bei:</h4>
              <ul className="border-ink dark:border-night-text mt-3 border-t-2">
                {HILFE_BEI.map((item) => (
                  <li
                    key={item}
                    className="border-rule dark:border-night-rule text-ink dark:text-night-text flex gap-3 border-b px-1 py-3 text-lg leading-snug"
                  >
                    <span
                      aria-hidden
                      className="bg-ink dark:bg-night-text mt-2 h-2 w-2 shrink-0"
                    />
                    {item}
                  </li>
                ))}
                <li className="border-rule dark:border-night-rule text-ink dark:text-night-text flex flex-wrap items-center gap-3 border-b px-1 py-3 text-lg leading-snug">
                  <span
                    aria-hidden
                    className="bg-ink dark:bg-night-text mt-2 h-2 w-2 shrink-0 self-start"
                  />
                  <span>
                    Feedback und Verbesserungsvorschlägen
                    {/* Feedback page only exists where the GitHub
                      integration is configured (beta) */}
                    {env.GITHUB_TOKEN && env.GITHUB_REPO && (
                      <Link
                        href="/feedback"
                        className="link-ink ml-2 text-base"
                      >
                        Feedback geben
                      </Link>
                    )}
                  </span>
                </li>
              </ul>

              {internetTeam.length > 0 ? (
                <>
                  <h4 className={`${LABEL_HEAD} mt-8`}>Unser Team</h4>
                  <ul className="border-ink dark:border-night-text mt-3 border-t-2">
                    {internetTeam.map((member, index) => (
                      <TeamMemberRow key={index} member={member} />
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </Split>
      </PageSection>

      <PageSection labelledBy="formular-heading" rule>
        <Split
          head={
            <SectionHead
              id="formular-heading"
              title="Allgemeine Anfrage"
              intro="Nutzen Sie unser Kontaktformular für allgemeine Anfragen. Wir melden uns zeitnah bei Ihnen."
            />
          }
          bodyClassName="mt-8"
        >
          <ContactForm />
        </Split>
      </PageSection>

      <PageSection labelledBy="ansprechpartner-heading" rule>
        <Split
          head={
            <SectionHead
              id="ansprechpartner-heading"
              title="Weitere Ansprechpartner"
              intro="Je nach Anliegen können Sie sich auch direkt an die zuständigen Personen wenden."
            />
          }
          bodyClassName="mt-8"
        >
          <WayList labelledBy="ansprechpartner-heading">
            {WEITERE_ANSPRECHPARTNER.map((weg) => (
              <WayRow
                key={weg.href}
                href={weg.href}
                title={weg.title}
                description={weg.description}
              />
            ))}
          </WayList>
        </Split>
      </PageSection>

      <ClosingCall
        id="bleiben-heading"
        title="Bleiben Sie auf dem Laufenden"
        text="Folgen Sie uns auf Social Media oder abonnieren Sie unseren Newsletter für aktuelle Informationen."
        actions={[
          { href: "/newsletter", label: "Newsletter abonnieren" },
          {
            href: "https://facebook.com/posaunenwerkrheinland",
            label: "Facebook",
          },
          {
            href: "https://www.instagram.com/posaunenwerk_rheinland/",
            label: "Instagram",
          },
          { href: "https://www.youtube.com/@PWRheinland", label: "YouTube" },
        ]}
      />
    </PublicPage>
  );
}
