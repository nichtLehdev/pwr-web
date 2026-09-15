import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

type Entry = { href: string; title: string; text: string };

const SEITEN: Entry[] = [
  {
    href: "/mitmachen/chor-finden",
    title: "Chor finden",
    text: "Finde einen Posaunenchor in deiner Nähe",
  },
  {
    href: "/mitmachen/bildung",
    title: "Aus- und Weiterbildung",
    text: "Lehrgänge und Fortbildungen für Bläserinnen und Bläser",
  },
  {
    href: "/ueber-uns/auswahlchoere",
    title: "Auswahlchöre",
    text: "Unsere Ensembles und Auswahlchöre",
  },
  {
    href: "/materialien/blechblatt",
    title: "Rheinisches Blechblatt",
    text: "Unser Magazin für die Posaunenchorarbeit",
  },
  {
    href: "/ueber-uns/posaunenwarte",
    title: "Posaunenwarte",
    text: "Unsere Ansprechpartner in den Bezirken",
  },
  {
    href: "/materialien",
    title: "Materialien",
    text: "Noten, CDs und weitere Materialien",
  },
];

const PARTNER: Entry[] = [
  {
    href: "https://www.ekir.de",
    title: "EKiR",
    text: "Evangelische Kirche im Rheinland",
  },
  {
    href: "https://www.epid.de",
    title: "EPiD",
    text: "Evangelischer Posaunendienst in Deutschland",
  },
  {
    href: "https://bundesmusikverband.de/",
    title: "BMCO",
    text: "Bundesverband Musik in der Kirche",
  },
];

function EntryRow({ entry, external }: { entry: Entry; external?: boolean }) {
  const body = (
    <>
      <span className="min-w-0">
        <span className="condensed text-ink dark:text-night-text block text-[1.5rem] leading-tight font-bold">
          {entry.title}
        </span>
        <span className="text-dark dark:text-night-muted mt-1 block text-[0.9375rem]">
          {entry.text}
        </span>
      </span>
      {external ? (
        <ArrowUpRight
          aria-hidden
          className="text-ink dark:text-night-text h-5 w-5 shrink-0"
        />
      ) : (
        <ArrowRight
          aria-hidden
          className="text-ink dark:text-night-text h-5 w-5 shrink-0"
        />
      )}
    </>
  );

  const className = "flex items-center justify-between gap-6 px-1 py-4";

  return (
    <li className="fill-row border-rule dark:border-night-rule border-b">
      {external ? (
        <a
          href={entry.href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {body}
          <span className="sr-only"> (öffnet eine externe Website)</span>
        </a>
      ) : (
        <Link href={entry.href} className={className}>
          {body}
        </Link>
      )}
    </li>
  );
}

function ListHeading({ id, children }: { id: string; children: string }) {
  return (
    <h3
      id={id}
      className="condensed text-ink dark:text-night-text border-ink dark:border-night-text border-b-2 pb-2 text-[1.75rem] leading-none font-extrabold"
    >
      {children}
    </h3>
  );
}

/** „Beliebte Seiten & Partner“ als Register: volle Zeilen statt Kacheln. */
export default function Register() {
  return (
    <section
      aria-labelledby="register-heading"
      className="bg-paper dark:bg-night py-16 md:py-24"
    >
      <div className="sheet">
        <h2
          id="register-heading"
          className="condensed text-ink dark:text-night-text text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.95] font-extrabold"
        >
          Beliebte Seiten &amp; Partner
        </h2>
        <p className="text-dark dark:text-night-muted mt-4 max-w-2xl text-lg">
          Entdecke unsere wichtigsten Seiten und Partnerorganisationen
        </p>

        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-8">
            <ListHeading id="register-seiten">Beliebte Seiten</ListHeading>
            <ul
              aria-labelledby="register-seiten"
              className="grid md:grid-cols-2 md:gap-x-10"
            >
              {SEITEN.map((entry) => (
                <EntryRow key={entry.href} entry={entry} />
              ))}
            </ul>
          </div>
          <div className="lg:col-span-4">
            <ListHeading id="register-partner">Partner</ListHeading>
            <ul aria-labelledby="register-partner">
              {PARTNER.map((entry) => (
                <EntryRow key={entry.href} entry={entry} external />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
