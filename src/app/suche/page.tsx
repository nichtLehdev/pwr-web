"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";
import PublicPage from "../_components/general/public-page";
import { PageSection } from "../_components/programmheft/page-section";
import { Heading } from "../_components/programmheft/section-head";
import { WayList, WayRow } from "../_components/programmheft/way-list";
import { api } from "@/trpc/react";
import type { SearchResultType } from "@/server/api/routers/search";

const TYPE_LABELS: Record<SearchResultType, string> = {
  post: "Beiträge",
  event: "Veranstaltungen",
  course: "Kurse & Lehrgänge",
  download: "Downloads",
  ensemble: "Ensembles",
  auswahlchor: "Auswahlchöre",
  page: "Seiten",
};

// Content first: someone searching usually wants posts/events/downloads,
// not the Impressum. Static pages come last and are capped by default.
const TYPE_ORDER: SearchResultType[] = [
  "event",
  "course",
  "post",
  "download",
  "ensemble",
  "auswahlchor",
  "page",
];

const PAGE_RESULTS_CAP = 4;

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [input, setInput] = useState(query);
  const [showAllPages, setShowAllPages] = useState(false);

  const { data, isLoading } = api.search.global.useQuery(
    { query, limit: 50 },
    { enabled: query.length >= 2 },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = input.trim();
    if (next.length >= 2) {
      router.push(`/suche?q=${encodeURIComponent(next)}`);
    }
  };

  const grouped = new Map<
    SearchResultType,
    NonNullable<typeof data>["results"]
  >();
  for (const result of data?.results ?? []) {
    const list = grouped.get(result.type) ?? [];
    list.push(result);
    grouped.set(result.type, list);
  }

  return (
    <PublicPage
      title="Suche"
      breadcrumbs={[{ label: "Start", href: "/" }, { label: "Suche" }]}
    >
      <PageSection flush="top">
        <form onSubmit={handleSubmit} className="flex max-w-[38rem] gap-3">
          <div className="relative flex-1">
            <SearchIcon
              className="text-dark dark:text-night-muted pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Wonach suchst du?"
              autoFocus
              className="border-ink dark:border-night-text text-ink dark:text-night-text bg-paper dark:bg-night w-full border-2 py-3 pr-4 pl-11 text-base"
            />
          </div>
          <button
            type="submit"
            className="semi-condensed bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-primary dark:text-ink dark:hover:bg-paper inline-flex min-h-12 items-center px-6 text-lg font-semibold transition-colors"
          >
            Suchen
          </button>
        </form>

        {query.length < 2 ? (
          <p className="text-dark dark:text-night-muted mt-8 text-lg">
            Gib mindestens zwei Zeichen ein, um zu suchen.
          </p>
        ) : isLoading ? (
          <div
            aria-busy="true"
            aria-label="Suche läuft"
            className="mt-8 max-w-[38rem] space-y-3"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="bg-rule dark:bg-night-rule block h-14 w-full"
              />
            ))}
          </div>
        ) : !data || data.results.length === 0 ? (
          <p className="text-dark dark:text-night-muted mt-8 text-lg">
            Keine Ergebnisse für „{query}“.
          </p>
        ) : (
          <div className="mt-10 space-y-14">
            <p className="text-dark dark:text-night-muted text-sm">
              {data.total} {data.total === 1 ? "Ergebnis" : "Ergebnisse"} für „
              {data.query}“
            </p>

            {TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => {
              const allResults = grouped.get(type)!;
              const capped =
                type === "page" && !showAllPages
                  ? allResults.slice(0, PAGE_RESULTS_CAP)
                  : allResults;
              return (
                <section key={type} aria-labelledby={`suche-${type}`}>
                  <Heading as="h2" id={`suche-${type}`} size="list" rule>
                    {TYPE_LABELS[type]}
                  </Heading>
                  <WayList>
                    {capped.map((result) => (
                      <WayRow
                        key={`${result.type}-${result.id}`}
                        href={result.url}
                        title={result.title}
                        description={
                          result.description || result.date ? (
                            <>
                              {result.description}
                              {result.description && result.date ? " · " : null}
                              {result.date ? formatDate(result.date) : null}
                            </>
                          ) : undefined
                        }
                      />
                    ))}
                  </WayList>
                  {type === "page" &&
                    !showAllPages &&
                    allResults.length > PAGE_RESULTS_CAP && (
                      <button
                        onClick={() => setShowAllPages(true)}
                        className="semi-condensed text-primary-ink dark:text-primary mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline"
                      >
                        {allResults.length - PAGE_RESULTS_CAP} weitere Seiten
                        anzeigen
                      </button>
                    )}
                </section>
              );
            })}
          </div>
        )}
      </PageSection>
    </PublicPage>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <PublicPage
          title="Suche"
          breadcrumbs={[{ label: "Start", href: "/" }, { label: "Suche" }]}
        >
          <PageSection flush="top">
            <div
              aria-busy="true"
              aria-label="Lädt"
              className="max-w-[38rem] space-y-3"
            >
              <span className="bg-rule dark:bg-night-rule block h-12 w-full" />
            </div>
          </PageSection>
        </PublicPage>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
