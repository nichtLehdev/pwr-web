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
  ChevronRight,
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

const typeIcons: Record<SearchResultType, React.ReactNode> = {
  post: <FileText className="h-5 w-5" />,
  event: <Calendar className="h-5 w-5" />,
  download: <Download className="h-5 w-5" />,
  course: <GraduationCap className="h-5 w-5" />,
  page: <Home className="h-5 w-5" />,
  ensemble: <Music className="h-5 w-5" />,
  auswahlchor: <Star className="h-5 w-5" />,
};

const typeColors: Record<SearchResultType, string> = {
  post: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  event: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  download:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  course:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  page: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  ensemble:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  auswahlchor:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

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
    <button
      onClick={onClick}
      className="dark:hover:bg-dark-background-secondary flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
    >
      {/* Type Icon */}
      <div
        className={`mt-0.5 shrink-0 rounded-lg p-2 ${typeColors[result.type]}`}
      >
        {typeIcons[result.type]}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-dark dark:text-dark-text line-clamp-1 font-medium">
            {result.title}
          </span>
        </div>
        {result.description && (
          <p className="dark:text-dark-muted mt-0.5 line-clamp-1 text-sm text-gray-500">
            {result.description}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
          <span>{typeLabels[result.type]}</span>
          {result.date && (
            <>
              <span>•</span>
              <span>
                {new Date(result.date).toLocaleDateString("de-DE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
    </button>
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

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="dark:bg-dark-surface dark:border-dark-border relative z-10 mx-4 w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        {/* Search Input */}
        <div className="dark:border-dark-border flex items-center border-b border-gray-200 px-4">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche nach Terminen, Beiträgen, Downloads..."
            className="dark:bg-dark-surface text-dark dark:text-dark-text w-full border-0 px-4 py-4 text-lg placeholder-gray-400 outline-none focus:ring-0"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="dark:hover:bg-dark-border shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <div className="dark:border-dark-border ml-2 shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-400">
            ESC
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-6 py-8 text-center">
              <div className="dark:text-dark-muted text-gray-500">
                <Search className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">Mindestens 2 Zeichen eingeben</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center px-6 py-8">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-b-2" />
            </div>
          ) : data?.results.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="dark:text-dark-muted text-gray-500">
                <Frown className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">
                  Keine Ergebnisse für &quot;{query}&quot;
                </p>
                <button
                  onClick={() =>
                    handleResultClick(
                      `/suche?q=${encodeURIComponent(debouncedQuery)}`,
                    )
                  }
                  className="text-primary mt-3 text-sm font-medium hover:underline"
                >
                  Auf der Suchseite suchen
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2">
              {/* Link to the full results page */}
              <button
                onClick={() =>
                  handleResultClick(
                    `/suche?q=${encodeURIComponent(debouncedQuery)}`,
                  )
                }
                className="text-primary hover:bg-primary/5 flex w-full items-center gap-2 px-4 py-2 text-sm font-medium"
              >
                <Search className="h-4 w-4" />
                Alle Ergebnisse für &quot;{debouncedQuery}&quot; anzeigen
              </button>

              {/* Pages Section - always first */}
              {(data?.results.filter((r) => r.type === "page").length ?? 0) >
                0 && (
                <>
                  <div className="dark:text-dark-muted px-4 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Seiten
                  </div>
                  {data?.results
                    .filter((r) => r.type === "page")
                    .map((result) => (
                      <SearchResultItem
                        key={`${result.type}-${result.id}`}
                        result={result}
                        onClick={() => handleResultClick(result.url)}
                      />
                    ))}
                </>
              )}

              {/* Divider if we have both pages and other content */}
              {(data?.results.filter((r) => r.type === "page").length ?? 0) >
                0 &&
                (data?.results.filter((r) => r.type !== "page").length ?? 0) >
                  0 && (
                  <div className="dark:border-dark-border my-2 border-t border-gray-200" />
                )}

              {/* Other Content Section */}
              {(data?.results.filter((r) => r.type !== "page").length ?? 0) >
                0 && (
                <>
                  <div className="dark:text-dark-muted px-4 py-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                    Inhalte
                  </div>
                  {data?.results
                    .filter((r) => r.type !== "page")
                    .map((result) => (
                      <SearchResultItem
                        key={`${result.type}-${result.id}`}
                        result={result}
                        onClick={() => handleResultClick(result.url)}
                      />
                    ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="dark:border-dark-border dark:bg-dark-background-secondary flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="dark:border-dark-border dark:bg-dark-surface rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="dark:border-dark-border dark:bg-dark-surface rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↓
              </kbd>
              <span className="ml-1">Navigieren</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="dark:border-dark-border dark:bg-dark-surface rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>
              <span className="ml-1">Öffnen</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="dark:border-dark-border dark:bg-dark-surface rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">
              ⌘
            </kbd>
            <kbd className="dark:border-dark-border dark:bg-dark-surface rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[10px]">
              K
            </kbd>
            <span className="ml-1">Suche öffnen</span>
          </div>
        </div>
      </div>
    </div>
  );
}
