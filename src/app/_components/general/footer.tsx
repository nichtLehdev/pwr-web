"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TrackingConsentLink } from "@/app/_components/stats/tracking-consent-link";

const COLUMN_LINK =
  "text-paper/85 hover:text-primary inline-flex min-h-10 items-center text-base underline-offset-4 transition-colors hover:underline";

const SOCIAL_LINK =
  "text-paper/85 hover:bg-primary hover:text-ink inline-flex h-11 w-11 items-center justify-center transition-colors";

function ColumnHeading({ children }: { children: string }) {
  return (
    <h3 className="condensed text-primary mb-3 border-b border-white/20 pb-3 text-[1.5rem] leading-none font-extrabold">
      {children}
    </h3>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    about: [
      { label: "Über uns", href: "/ueber-uns" },
      { label: "Vorstand", href: "/ueber-uns/vorstand" },
      { label: "Auswahlchöre", href: "/ueber-uns/auswahlchoere" },
      { label: "Struktur & Geschichte", href: "/ueber-uns/struktur" },
    ],
    participate: [
      { label: "Mitmachen", href: "/mitmachen" },
      { label: "Chor finden", href: "/mitmachen/chor-finden" },
      { label: "Aus- und Weiterbildung", href: "/mitmachen/bildung" },
      {
        label: "Mitgliedschaft & Versicherung",
        href: "/mitmachen/mitgliedschaft",
      },
      { label: "Förderverein", href: "/foerderverein" },
    ],
    resources: [
      { label: "Termine", href: "/termine" },
      { label: "Aktuelles", href: "/aktuelles" },
      { label: "Materialien", href: "/materialien" },
      { label: "Rheinisches Blechblatt", href: "/materialien/blechblatt" },
      { label: "Spiele & Übungen", href: "/spiele" },
    ],
    legal: [
      { label: "Impressum", href: "/impressum" },
      { label: "Datenschutz", href: "/datenschutz" },
      { label: "Prävention", href: "/praevention" },
      { label: "Lizenzen", href: "/lizenzen" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  };

  return (
    <footer className="programm on-ink font-programm bg-ink text-paper dark:bg-night-raised pb-[env(safe-area-inset-bottom,0px)]">
      <div className="sheet py-14 md:py-20">
        {/* Ohne feste Umbrüche: wo der Vereinsname umbricht, hängt an der
            Schriftgröße. */}
        <p className="condensed max-w-[22ch] text-[clamp(1.875rem,3.6vw,3rem)] leading-[0.98] font-extrabold text-balance">
          Posaunenwerk der Evangelischen Kirche im Rheinland e.V.
        </p>
        <span aria-hidden className="bg-primary mt-6 block h-1.5 w-24" />

        <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <ColumnHeading>Über uns</ColumnHeading>
            <ul>
              {footerLinks.about.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={COLUMN_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>Mitmachen</ColumnHeading>
            <ul>
              {footerLinks.participate.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={COLUMN_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>Ressourcen</ColumnHeading>
            <ul>
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={COLUMN_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <ColumnHeading>Bleib in Kontakt</ColumnHeading>
            <div className="-ml-3 flex">
              <a
                href="https://facebook.com/posaunenwerkrheinland"
                target="_blank"
                rel="noopener noreferrer"
                className={SOCIAL_LINK}
                aria-label="Facebook"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              <a
                href="https://www.instagram.com/posaunenwerk_rheinland/"
                target="_blank"
                rel="noopener noreferrer"
                className={SOCIAL_LINK}
                aria-label="Instagram"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              <a
                href="https://www.youtube.com/@PWRheinland"
                target="_blank"
                rel="noopener noreferrer"
                className={SOCIAL_LINK}
                aria-label="YouTube"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>

            <Link
              href="/newsletter"
              className="semi-condensed text-primary mt-4 inline-flex min-h-10 items-center gap-2 text-lg font-semibold underline-offset-4 hover:underline"
            >
              Newsletter abonnieren
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="sheet text-paper/70 flex flex-col gap-3 py-6 text-sm md:flex-row md:items-center md:justify-between">
          <p>
            © {currentYear} Posaunenwerk Rheinland. Alle Rechte vorbehalten.
          </p>

          <div className="-mx-2 flex flex-wrap items-center gap-x-2">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-primary inline-flex min-h-10 items-center px-2 underline-offset-4 transition-colors hover:underline"
              >
                {link.label}
              </Link>
            ))}
            <TrackingConsentLink className="hover:text-primary inline-flex min-h-10 items-center px-2 underline-offset-4 transition-colors hover:underline" />
          </div>
        </div>
      </div>
    </footer>
  );
}
