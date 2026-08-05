"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import ImageWithFallback from "@/app/_components/ui/image-with-fallback";
import { api } from "@/trpc/react";
import type { SearchResultType } from "@/server/api/routers/search";
import {
  CalendarIcon,
  DownloadIcon,
  FileTextIcon,
  GraduationCapIcon,
  LayoutIcon,
  MusicIcon,
  SearchIcon,
} from "lucide-react";

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

const TYPE_ICONS: Record<SearchResultType, React.ReactNode> = {
  post: <FileTextIcon className="h-5 w-5" />,
  event: <CalendarIcon className="h-5 w-5" />,
  course: <GraduationCapIcon className="h-5 w-5" />,
  download: <DownloadIcon className="h-5 w-5" />,
  ensemble: <MusicIcon className="h-5 w-5" />,
  auswahlchor: <MusicIcon className="h-5 w-5" />,
  page: <LayoutIcon className="h-5 w-5" />,
};

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
    <div className="bg-background-secondary dark:bg-dark-background-secondary min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-dark dark:text-dark-text mb-6 text-3xl font-bold">
          Suche
        </h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Wonach suchst du?"
                autoFocus
                className="dark:bg-dark-surface dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 bg-white py-3 pr-4 pl-10 shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark rounded-lg px-5 py-3 font-semibold text-white"
            >
              Suchen
            </button>
          </div>
        </form>

        {query.length < 2 ? (
          <p className="text-gray-500 dark:text-gray-400">
            Gib mindestens zwei Zeichen ein, um zu suchen.
          </p>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          </div>
        ) : !data || data.results.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            Keine Ergebnisse für „{query}“.
          </p>
        ) : (
          <div className="space-y-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
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
                <section key={type}>
                  <h2 className="dark:text-dark-muted mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    {TYPE_LABELS[type]}
                  </h2>
                  <ul className="space-y-2">
                    {capped.map((result) => (
                      <li key={`${result.type}-${result.id}`}>
                        <Link
                          href={result.url}
                          className="dark:bg-dark-surface dark:border-dark-border flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                        >
                          <ImageWithFallback
                            src={result.imageUrl}
                            alt=""
                            width={48}
                            height={48}
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            fallback={
                              <span className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                                {TYPE_ICONS[result.type]}
                              </span>
                            }
                          />
                          <div className="min-w-0">
                            <p className="text-dark dark:text-dark-text font-semibold">
                              {result.title}
                            </p>
                            {result.description && (
                              <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                                {result.description}
                              </p>
                            )}
                            {result.date && (
                              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                {formatDate(result.date)}
                              </p>
                            )}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {type === "page" &&
                    !showAllPages &&
                    allResults.length > PAGE_RESULTS_CAP && (
                      <button
                        onClick={() => setShowAllPages(true)}
                        className="text-primary mt-2 text-sm font-medium hover:underline"
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
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
