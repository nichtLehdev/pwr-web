import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { ContentStatus } from "~/generated/prisma/client";

export type SearchResultType =
  | "post"
  | "event"
  | "download"
  | "course"
  | "page"
  | "ensemble"
  | "auswahlchor";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  date: Date | null;
  category: string | null;
}

// Static pages that can be searched
const staticPages = [
  {
    id: "page-start",
    title: "Startseite",
    description:
      "Willkommen beim Posaunenwerk Rheinland - Evangelische Blechbläserarbeit im Rheinland",
    url: "/",
    keywords: [
      "start",
      "home",
      "willkommen",
      "posaunenwerk",
      "rheinland",
      "startseite",
    ],
  },
  {
    id: "page-termine",
    title: "Termine",
    description: "Alle Termine und Veranstaltungen des Posaunenwerks Rheinland",
    url: "/termine",
    keywords: ["termine", "veranstaltungen", "kalender", "events", "konzerte"],
  },
  {
    id: "page-aktuelles",
    title: "Aktuelles",
    description: "Neuigkeiten und Beiträge aus dem Posaunenwerk Rheinland",
    url: "/aktuelles",
    keywords: ["aktuelles", "news", "nachrichten", "beiträge", "neuigkeiten"],
  },
  {
    id: "page-kontakt",
    title: "Kontakt",
    description:
      "Kontaktieren Sie das Posaunenwerk Rheinland - Ansprechpartner und Kontaktformular",
    url: "/kontakt",
    keywords: [
      "kontakt",
      "email",
      "telefon",
      "ansprechpartner",
      "nachricht",
      "schreiben",
      "erreichen",
    ],
  },
  {
    id: "page-impressum",
    title: "Impressum",
    description:
      "Impressum und rechtliche Informationen des Posaunenwerks Rheinland",
    url: "/impressum",
    keywords: [
      "impressum",
      "rechtlich",
      "angaben",
      "verantwortlich",
      "herausgeber",
    ],
  },
  {
    id: "page-datenschutz",
    title: "Datenschutz",
    description: "Datenschutzerklärung des Posaunenwerks Rheinland",
    url: "/datenschutz",
    keywords: [
      "datenschutz",
      "dsgvo",
      "privacy",
      "daten",
      "cookies",
      "datenschutzerklärung",
    ],
  },
  {
    id: "page-foerderverein",
    title: "Förderverein",
    description:
      "Der Förderverein unterstützt die Arbeit des Posaunenwerks Rheinland",
    url: "/foerderverein",
    keywords: [
      "förderverein",
      "spenden",
      "unterstützen",
      "mitglied",
      "fördern",
      "beitrag",
    ],
  },
  {
    id: "page-login",
    title: "Login",
    description: "Anmelden im Mitgliederbereich des Posaunenwerks Rheinland",
    url: "/login",
    keywords: ["login", "anmelden", "einloggen", "konto", "mitgliederbereich"],
  },
  {
    id: "page-register",
    title: "Registrieren",
    description: "Neues Konto erstellen beim Posaunenwerk Rheinland",
    url: "/register",
    keywords: [
      "registrieren",
      "anmelden",
      "konto erstellen",
      "neu",
      "registrierung",
    ],
  },
  // Mitmachen section
  {
    id: "page-mitmachen",
    title: "Mitmachen",
    description: "Werden Sie Teil der Posaunenchor-Gemeinschaft im Rheinland",
    url: "/mitmachen",
    keywords: [
      "mitmachen",
      "teilnehmen",
      "engagement",
      "dabei sein",
      "mitglied werden",
    ],
  },
  {
    id: "page-chor-finden",
    title: "Chor finden",
    description: "Finden Sie einen Posaunenchor in Ihrer Nähe",
    url: "/mitmachen/chor-finden",
    keywords: [
      "chor finden",
      "posaunenchor",
      "in der nähe",
      "suchen",
      "beitreten",
      "mitspielen",
    ],
  },
  {
    id: "page-bildung",
    title: "Aus- und Weiterbildung",
    description:
      "Lehrgänge, Kurse und Fortbildungen für Bläserinnen und Bläser",
    url: "/mitmachen/bildung",
    keywords: [
      "bildung",
      "ausbildung",
      "weiterbildung",
      "lehrgang",
      "kurs",
      "fortbildung",
      "lernen",
      "d-prüfung",
      "c-prüfung",
    ],
  },
  {
    id: "page-jungblaeser",
    title: "Jungbläserarbeit",
    description: "Nachwuchsförderung und Jungbläserausbildung im Posaunenwerk",
    url: "/mitmachen/jungblaeser",
    keywords: [
      "jungbläser",
      "nachwuchs",
      "kinder",
      "jugend",
      "anfänger",
      "ausbildung",
      "jugendarbeit",
    ],
  },
  {
    id: "page-ehrenamt",
    title: "Ehrenamtlich engagieren",
    description: "Ehrenamtliche Mitarbeit im Posaunenwerk Rheinland",
    url: "/mitmachen/ehrenamt",
    keywords: ["ehrenamt", "engagieren", "mitarbeit", "freiwillig", "helfen"],
  },
  // Materialien section
  {
    id: "page-materialien",
    title: "Materialien",
    description:
      "Downloads, Noten, Übungen und Arbeitshilfen für Posaunenchöre",
    url: "/materialien",
    keywords: [
      "materialien",
      "downloads",
      "noten",
      "übungen",
      "arbeitshilfen",
      "dokumente",
    ],
  },
  {
    id: "page-uebungen",
    title: "Übungen & Tipps",
    description: "Übungsmaterialien und Tipps für Bläserinnen und Bläser",
    url: "/materialien/uebungen",
    keywords: [
      "übungen",
      "tipps",
      "üben",
      "technik",
      "ansatz",
      "atmung",
      "warm-up",
    ],
  },
  {
    id: "page-blechblatt",
    title: "Rheinisches Blechblatt",
    description: "Das Magazin des Posaunenwerks Rheinland zum Online-Lesen",
    url: "/materialien/blechblatt",
    keywords: [
      "blechblatt",
      "magazin",
      "zeitschrift",
      "heft",
      "ausgabe",
      "pdf",
    ],
  },
  {
    id: "page-literatur",
    title: "Literatur & CDs",
    description: "Empfohlene Literatur und CDs für Posaunenchöre",
    url: "/materialien/literatur",
    keywords: ["literatur", "bücher", "cds", "musik", "empfehlungen", "noten"],
  },
  // Über uns section
  {
    id: "page-ueber-uns",
    title: "Über uns",
    description: "Informationen über das Posaunenwerk Rheinland",
    url: "/ueber-uns",
    keywords: ["über uns", "wir", "posaunenwerk", "organisation", "verband"],
  },
  {
    id: "page-struktur",
    title: "Struktur & Geschichte",
    description: "Aufbau und Geschichte des Posaunenwerks Rheinland",
    url: "/ueber-uns/struktur",
    keywords: [
      "struktur",
      "geschichte",
      "aufbau",
      "organisation",
      "historie",
      "gründung",
    ],
  },
  {
    id: "page-vorstand",
    title: "Vorstand",
    description: "Der Vorstand des Posaunenwerks Rheinland",
    url: "/ueber-uns/vorstand",
    keywords: ["vorstand", "leitung", "vorsitzender", "führung", "gremium"],
  },
  {
    id: "page-posaunenwarte",
    title: "Posaunenwarte",
    description: "Die Posaunenwarte im Posaunenwerk Rheinland",
    url: "/ueber-uns/posaunenwarte",
    keywords: ["posaunenwarte", "landesposaunenwart", "lpw", "rpw", "regional"],
  },
  {
    id: "page-bezirke",
    title: "Bezirke & Obleute",
    description: "Die Bezirke und Obleute des Posaunenwerks Rheinland",
    url: "/ueber-uns/bezirke",
    keywords: ["bezirke", "obleute", "region", "kreise", "kirchenkreis"],
  },
  {
    id: "page-auswahlchoere",
    title: "Auswahlchöre",
    description: "Die Auswahlchöre des Posaunenwerks Rheinland",
    url: "/ueber-uns/auswahlchoere",
    keywords: [
      "auswahlchöre",
      "landesjugendposaunenchor",
      "ljpc",
      "auswahl",
      "ensemble",
    ],
  },
  {
    id: "page-posaunenrat",
    title: "Posaunenrat",
    description: "Der Posaunenrat des Posaunenwerks Rheinland",
    url: "/ueber-uns/posaunenrat",
    keywords: ["posaunenrat", "rat", "gremium", "vertreter", "delegierte"],
  },
];

/**
 * Search static pages by query
 */
function searchStaticPages(query: string, limit: number): SearchResult[] {
  const searchTerm = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const page of staticPages) {
    // Check if query matches title, description, or keywords
    const titleMatch = page.title.toLowerCase().includes(searchTerm);
    const descriptionMatch = page.description
      .toLowerCase()
      .includes(searchTerm);
    const keywordMatch = page.keywords.some((keyword) =>
      keyword.toLowerCase().includes(searchTerm),
    );

    if (titleMatch || descriptionMatch || keywordMatch) {
      results.push({
        id: page.id,
        type: "page",
        title: page.title,
        description: page.description,
        url: page.url,
        imageUrl: null,
        date: null,
        category: null,
      });
    }

    if (results.length >= limit) break;
  }

  return results;
}

export const searchRouter = createTRPCRouter({
  // Global site search across posts, events, downloads, and courses
  global: publicProcedure
    .input(
      z.object({
        query: z.string().min(2),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const searchTerm = input.query.trim();
      const limitPerType = Math.ceil(input.limit / 4);

      // Search posts
      const postsPromise = ctx.db.post.findMany({
        where: {
          status: ContentStatus.APPROVED,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { excerpt: { contains: searchTerm, mode: "insensitive" } },
            { content: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          excerpt: true,
          publishedAt: true,
          category: true,
          coverImage: { select: { url: true } },
        },
        take: limitPerType,
        orderBy: { publishedAt: "desc" },
      });

      // Search events (only future or recent events)
      const eventsPromise = ctx.db.event.findMany({
        where: {
          status: ContentStatus.APPROVED,
          eventDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Within last 30 days or future
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
            { motto: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          eventDate: true,
          category: true,
          coverImage: { select: { url: true } },
        },
        take: limitPerType,
        orderBy: { eventDate: "asc" },
      });

      // Search downloads
      const downloadsPromise = ctx.db.download.findMany({
        where: {
          status: ContentStatus.APPROVED,
          isPublic: true,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          createdAt: true,
        },
        take: limitPerType,
        orderBy: { createdAt: "desc" },
      });

      // Search courses
      const coursesPromise = ctx.db.course.findMany({
        where: {
          status: ContentStatus.APPROVED,
          OR: [
            { title: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          startDate: true,
          courseType: true,
        },
        take: limitPerType,
        orderBy: { startDate: "asc" },
      });

      // Search ensembles (Posaunenchöre)
      const ensemblesPromise = ctx.db.ensemble.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          bezirk: { select: { shortName: true } },
          image: { select: { url: true } },
        },
        take: limitPerType,
        orderBy: { name: "asc" },
      });

      // Search Auswahlchöre
      const auswahlchoerePromise = ctx.db.auswahlChor.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { subtitle: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          subtitle: true,
          description: true,
          image: { select: { url: true } },
        },
        take: limitPerType,
        orderBy: { name: "asc" },
      });

      const [posts, events, downloads, courses, ensembles, auswahlchoere] =
        await Promise.all([
          postsPromise,
          eventsPromise,
          downloadsPromise,
          coursesPromise,
          ensemblesPromise,
          auswahlchoerePromise,
        ]);

      // Transform results to unified format
      const results: SearchResult[] = [];

      // Add posts
      for (const post of posts) {
        results.push({
          id: post.id,
          type: "post",
          title: post.title,
          description: post.excerpt,
          url: `/aktuelles/${post.id}`,
          imageUrl: post.coverImage?.url ?? null,
          date: post.publishedAt,
          category: post.category,
        });
      }

      // Add events
      for (const event of events) {
        results.push({
          id: event.id,
          type: "event",
          title: event.title,
          description: event.description,
          url: `/termine/${event.id}`,
          imageUrl: event.coverImage?.url ?? null,
          date: event.eventDate,
          category: event.category,
        });
      }

      // Add downloads
      for (const download of downloads) {
        results.push({
          id: download.id,
          type: "download",
          title: download.title,
          description: download.description,
          url: `/materialien#${download.id}`,
          imageUrl: null,
          date: download.createdAt,
          category: download.category,
        });
      }

      // Add courses
      for (const course of courses) {
        results.push({
          id: course.id,
          type: "course",
          title: course.title,
          description: course.description,
          url: `/mitmachen/bildung/${course.id}`,
          imageUrl: null,
          date: course.startDate,
          category: course.courseType,
        });
      }

      // Add ensembles (Posaunenchöre)
      for (const ensemble of ensembles) {
        results.push({
          id: ensemble.id,
          type: "ensemble",
          title: ensemble.name,
          description:
            ensemble.description ??
            (ensemble.bezirk
              ? `Posaunenchor im ${ensemble.bezirk.shortName}`
              : "Posaunenchor"),
          url: `/mitmachen/chor-finden?search=${encodeURIComponent(ensemble.name)}`,
          imageUrl: ensemble.image?.url ?? null,
          date: null,
          category: ensemble.bezirk?.shortName ?? null,
        });
      }

      // Add Auswahlchöre
      for (const chor of auswahlchoere) {
        results.push({
          id: chor.id,
          type: "auswahlchor",
          title: chor.name,
          description: chor.subtitle,
          url: `/ueber-uns/auswahlchoere#${chor.slug}`,
          imageUrl: chor.image?.url ?? null,
          date: null,
          category: "Auswahlchor",
        });
      }

      // Add static pages
      const pageResults = searchStaticPages(searchTerm, limitPerType);
      results.push(...pageResults);

      // Sort by relevance (title matches first) then by date
      results.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        const query = searchTerm.toLowerCase();

        const aStartsWithQuery = aTitle.startsWith(query);
        const bStartsWithQuery = bTitle.startsWith(query);
        const aContainsQuery = aTitle.includes(query);
        const bContainsQuery = bTitle.includes(query);

        // Prioritize title matches
        if (aStartsWithQuery && !bStartsWithQuery) return -1;
        if (!aStartsWithQuery && bStartsWithQuery) return 1;
        if (aContainsQuery && !bContainsQuery) return -1;
        if (!aContainsQuery && bContainsQuery) return 1;

        // Then sort by date (most recent first)
        const aDate = a.date?.getTime() ?? 0;
        const bDate = b.date?.getTime() ?? 0;
        return bDate - aDate;
      });

      return {
        results: results.slice(0, input.limit),
        total: results.length,
        query: searchTerm,
      };
    }),
});
