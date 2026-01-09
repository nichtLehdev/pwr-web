"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Rss, Calendar, Copy, Check } from "lucide-react";
import { api } from "@/trpc/react";

interface FeedConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedType: "rss" | "ical";
}

export default function FeedConfigModal({
  isOpen,
  onClose,
  feedType,
}: FeedConfigModalProps) {
  const [selectedBezirke, setSelectedBezirke] = useState<string[]>([]);
  const [bezirksuebergreifend, setBezirksuebergreifend] = useState(false);
  const [icalType, setIcalType] = useState<"events" | "courses" | "both">(
    "both",
  );
  const [copied, setCopied] = useState(false);

  const { data: bezirkeData } = api.bezirke.getAll.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  const bezirke = bezirkeData || [];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    };
  }, []);

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const feedUrl = useMemo(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams();

    if (bezirksuebergreifend) {
      params.set("bezirksuebergreifend", "true");
    }

    if (selectedBezirke.length > 0) {
      selectedBezirke.forEach((id) => {
        params.append("bezirkId", id);
      });
    }

    if (feedType === "ical") {
      if (icalType !== "both") {
        params.set("type", icalType);
      }
    }

    const queryString = params.toString();
    const endpoint = feedType === "rss" ? "/api/feed/rss" : "/api/feed/ical";
    return `${baseUrl}${endpoint}${queryString ? `?${queryString}` : ""}`;
  }, [feedType, selectedBezirke, bezirksuebergreifend, icalType]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleBezirkToggle = (bezirkId: string) => {
    setSelectedBezirke((prev) =>
      prev.includes(bezirkId)
        ? prev.filter((id) => id !== bezirkId)
        : [...prev, bezirkId],
    );
  };

  const handleSelectAll = () => {
    if (selectedBezirke.length === bezirke.length && !bezirksuebergreifend) {
      setSelectedBezirke([]);
      setBezirksuebergreifend(false);
    } else {
      setSelectedBezirke(bezirke.map((b) => b.id));
      setBezirksuebergreifend(true);
    }
  };

  const handleBezirksuebergreifendToggle = () => {
    setBezirksuebergreifend((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background dark:bg-dark-surface relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dark:border-dark-border flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            {feedType === "rss" ? (
              <Rss className="h-6 w-6 text-orange-500" />
            ) : (
              <Calendar className="h-6 w-6 text-blue-500" />
            )}
            <h2 className="text-dark dark:text-dark-text text-xl font-bold">
              {feedType === "rss" ? "RSS Feed" : "iCal Feed"} konfigurieren
            </h2>
          </div>
          <button
            onClick={onClose}
            className="dark:hover:bg-dark-background rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-200 dark:bg-transparent dark:text-gray-400"
            aria-label="Schließen"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-180px)] space-y-6 overflow-y-auto p-6">
          {/* iCal Type Selection */}
          {feedType === "ical" && (
            <div>
              <label className="text-dark dark:text-dark-text mb-3 block text-sm font-semibold">
                Typ auswählen
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setIcalType("events")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    icalType === "events"
                      ? "bg-primary text-white"
                      : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-border bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  Veranstaltungen
                </button>
                <button
                  onClick={() => setIcalType("courses")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    icalType === "courses"
                      ? "bg-primary text-white"
                      : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-border bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  Lehrgänge
                </button>
                <button
                  onClick={() => setIcalType("both")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    icalType === "both"
                      ? "bg-primary text-white"
                      : "text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:hover:bg-dark-border bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  Beide
                </button>
              </div>
            </div>
          )}

          {/* District Selection */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-dark dark:text-dark-text block text-sm font-semibold">
                Bezirke filtern (optional)
              </label>
              <button
                onClick={handleSelectAll}
                className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary text-xs font-semibold transition-colors"
              >
                {selectedBezirke.length === bezirke.length &&
                !bezirksuebergreifend
                  ? "Alle abwählen"
                  : "Alle auswählen"}
              </button>
            </div>
            <div className="dark:border-dark-border max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
              {bezirke.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Lade Bezirke...
                </p>
              ) : (
                <>
                  {/* Bezirksübergreifend Option - First in list */}
                  <label className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary flex cursor-pointer items-center gap-3 rounded p-2 transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={bezirksuebergreifend}
                      onChange={handleBezirksuebergreifendToggle}
                      className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">
                      Bezirksübergreifend
                    </span>
                  </label>

                  {/* District options */}
                  {bezirke
                    .sort((a, b) => a.number - b.number)
                    .map((bezirk) => (
                      <label
                        key={bezirk.id}
                        className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary flex cursor-pointer items-center gap-3 rounded p-2 transition-colors hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBezirke.includes(bezirk.id)}
                          onChange={() => handleBezirkToggle(bezirk.id)}
                          className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm">
                          Bezirk {bezirk.number} - {bezirk.shortName}
                        </span>
                      </label>
                    ))}
                </>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {selectedBezirke.length === 0 && !bezirksuebergreifend
                ? "Keine Filterung: Alle Bezirke werden angezeigt"
                : `${bezirksuebergreifend ? "Bezirksübergreifend" : ""}${bezirksuebergreifend && selectedBezirke.length > 0 ? " + " : ""}${selectedBezirke.length > 0 ? `${selectedBezirke.length} Bezirk${selectedBezirke.length === 1 ? "" : "e"}` : ""} ausgewählt`}
            </p>
          </div>

          {/* Feed URL */}
          <div>
            <label className="text-dark dark:text-dark-text mb-2 block text-sm font-semibold">
              Feed-URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={feedUrl}
                readOnly
                className="text-dark dark:text-dark-text dark:bg-dark-background-secondary dark:border-dark-border focus:border-primary focus:ring-primary/20 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary-dark flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
                aria-label="URL kopieren"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {feedType === "rss"
                ? "Diese URL können Sie in Ihren RSS-Reader einfügen."
                : "Diese URL können Sie in Ihren Kalender importieren (Google Calendar, Outlook, Apple Calendar, etc.)."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="dark:border-dark-border flex items-center justify-end gap-3 border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="text-dark dark:text-dark-text dark:hover:bg-dark-background-secondary dark:bg-dark-background rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold transition-colors hover:bg-gray-200"
          >
            Schließen
          </button>
          {feedType === "rss" && (
            <a
              href={feedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary-dark flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              <Rss className="h-4 w-4" />
              Feed öffnen
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
