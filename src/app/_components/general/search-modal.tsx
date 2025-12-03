"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { SearchResultType } from "@/server/api/routers/search";

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
  post: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
      />
    </svg>
  ),
  event: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  download: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  ),
  course: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  page: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  ),
  ensemble: (
    <svg
      className="h-5 w-5"
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
  ),
  auswahlchor: (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  ),
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

// Search result item component
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
      <svg
        className="mt-2 h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle closing - reset query via onClose callback
  const handleClose = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    onClose();
  }, [onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close with Escape
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Search query
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
          <svg
            className="h-5 w-5 shrink-0 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
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
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
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
                <svg
                  className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
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
                <svg
                  className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm">
                  Keine Ergebnisse für &quot;{query}&quot;
                </p>
              </div>
            </div>
          ) : (
            <div className="py-2">
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
