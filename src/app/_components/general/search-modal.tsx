"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { SearchResultType } from "@/server/api/routers/search";
import {
  FileText,
  Calendar,
  Download,
  GraduationCap,
  Home,
  Music,
  Star,
  X,
  Search,
  Frown,
} from "lucide-react";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeLabels: Record<SearchResultType, string> = {
  post: "Beitrag",
  event: "Termin",
  download: "Download",
  course: "Lehrgang",
  page: "Seite",
  ensemble: "Posaunenchor",
  auswahlchor: "Auswahlchor",
};

/**
 * Die Art steht als Wort in der Metazeile; das Zeichen davor ist ein blankes
 * Glyph in Tinte — keine Farbfläche und kein Icon-Kreis.
 */
const typeIcons: Record<SearchResultType, React.ReactNode> = {
  post: <FileText className="h-4 w-4 shrink-0" aria-hidden />,
  event: <Calendar className="h-4 w-4 shrink-0" aria-hidden />,
  download: <Download className="h-4 w-4 shrink-0" aria-hidden />,
  course: <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />,
  page: <Home className="h-4 w-4 shrink-0" aria-hidden />,
  ensemble: <Music className="h-4 w-4 shrink-0" aria-hidden />,
  auswahlchor: <Star className="h-4 w-4 shrink-0" aria-hidden />,
};

/** Kleiner Kopf über einer Ergebnisgruppe. */
const GROUP_HEAD =
  "semi-condensed text-dark dark:text-night-muted px-4 pt-4 pb-2 text-sm font-semibold";

/** Taste in der Fußzeile: eckig, Haarlinie, Ziffernbreite. */
const KEY_CAP =
  "border-rule dark:border-night-rule text-dark dark:text-night-muted border px-1.5 py-0.5 font-mono text-[10px]";

function SearchResultItem({
  result,
  onClick,
}: {
  result: {
    id: string;
    type: SearchResultType;
    title: string;
    description: string | null;
    url: string;
    date: Date | null;
  };
  onClick: () => void;
}) {
  return (
    <li className="fill-row border-rule dark:border-night-rule border-b">
      <button
        onClick={onClick}
        className="block w-full px-4 py-3 text-left"
        type="button"
      >
        <span className="semi-condensed text-ink dark:text-night-text line-clamp-1 block text-base font-semibold">
          {result.title}
        </span>
        {result.description && (
          <span className="text-dark dark:text-night-muted mt-0.5 line-clamp-1 block text-sm">
            {result.description}
          </span>
        )}
        <span className="text-dark dark:text-night-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5">
            {typeIcons[result.type]}
            {typeLabels[result.type]}
          </span>
          {result.date && (
            <span>
              {new Date(result.date).toLocaleDateString("de-DE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  const { data, isLoading } = api.search.global.useQuery(
    { query: debouncedQuery, limit: 20 },
    { enabled: debouncedQuery.length >= 2 },
  );

  const handleResultClick = useCallback(
    (url: string) => {
      handleClose();
      router.push(url);
    },
    [handleClose, router],
  );

  if (!isOpen) return null;

  const pages = data?.results.filter((r) => r.type === "page") ?? [];
  const contents = data?.results.filter((r) => r.type !== "page") ?? [];

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh]">
      <div className="bg-ink/55 absolute inset-0" onClick={handleClose} />

      <div className="border-ink bg-paper dark:border-night-rule dark:bg-night-raised relative z-10 mx-4 w-full max-w-2xl border-2">
        <div className="border-rule dark:border-night-rule flex items-center gap-3 border-b px-4">
          <Search
            className="text-dark dark:text-night-muted h-5 w-5 shrink-0"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche nach Terminen, Beiträgen, Downloads…"
            aria-label="Suchbegriff"
            className="text-ink dark:text-night-text placeholder:text-dark dark:placeholder:text-night-muted w-full bg-transparent py-4 text-lg outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night inline-flex h-9 w-9 shrink-0 items-center justify-center transition-colors"
              type="button"
            >
              <X className="h-5 w-5" aria-hidden />
              <span className="sr-only">Suche zurücksetzen</span>
            </button>
          )}
          <span className={`${KEY_CAP} shrink-0`}>ESC</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 ? (
            <p className="text-dark dark:text-night-muted px-6 py-10 text-center text-sm">
              Mindestens 2 Zeichen eingeben
            </p>
          ) : isLoading ? (
            <p className="text-dark dark:text-night-muted px-6 py-10 text-center text-sm">
              Suche läuft …
            </p>
          ) : data?.results.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Frown
                className="text-dark dark:text-night-muted mx-auto mb-3 h-8 w-8"
                aria-hidden
              />
              <p className="text-dark dark:text-night-muted text-sm">
                Keine Ergebnisse für &quot;{query}&quot;
              </p>
              <button
                onClick={() =>
                  handleResultClick(
                    `/suche?q=${encodeURIComponent(debouncedQuery)}`,
                  )
                }
                className="link-ink mt-4 inline-flex min-h-11 items-center text-sm"
                type="button"
              >
                Auf der Suchseite suchen
              </button>
            </div>
          ) : (
            <div>
              <ul className="border-ink dark:border-night-text border-b-2">
                <li className="fill-row">
                  <button
                    onClick={() =>
                      handleResultClick(
                        `/suche?q=${encodeURIComponent(debouncedQuery)}`,
                      )
                    }
                    className="semi-condensed text-ink dark:text-night-text flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold"
                    type="button"
                  >
                    <Search className="h-4 w-4 shrink-0" aria-hidden />
                    Alle Ergebnisse für &quot;{debouncedQuery}&quot; anzeigen
                  </button>
                </li>
              </ul>

              {pages.length > 0 && (
                <>
                  <p className={GROUP_HEAD}>Seiten</p>
                  <ul className="border-ink dark:border-night-text border-t-2">
                    {pages.map((result) => (
                      <SearchResultItem
                        key={`${result.type}-${result.id}`}
                        result={result}
                        onClick={() => handleResultClick(result.url)}
                      />
                    ))}
                  </ul>
                </>
              )}

              {contents.length > 0 && (
                <>
                  <p className={GROUP_HEAD}>Inhalte</p>
                  <ul className="border-ink dark:border-night-text border-t-2">
                    {contents.map((result) => (
                      <SearchResultItem
                        key={`${result.type}-${result.id}`}
                        result={result}
                        onClick={() => handleResultClick(result.url)}
                      />
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-rule dark:border-night-rule text-dark dark:text-night-muted flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t px-4 py-3 text-xs">
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className={KEY_CAP}>↑</kbd>
              <kbd className={KEY_CAP}>↓</kbd>
              <span className="ml-1">Navigieren</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className={KEY_CAP}>↵</kbd>
              <span className="ml-1">Öffnen</span>
            </span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className={KEY_CAP}>⌘</kbd>
            <kbd className={KEY_CAP}>K</kbd>
            <span className="ml-1">Suche öffnen</span>
          </span>
        </div>
      </div>
    </div>
  );
}
