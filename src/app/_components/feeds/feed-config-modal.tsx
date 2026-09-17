"use client";

import { useEffect, useState, useMemo } from "react";
import { X, Rss, Calendar, Copy, Check } from "lucide-react";
import { api } from "@/trpc/react";
import { Button, Checkbox, Input, Label } from "@/app/_components/ui";
import { cn } from "@/lib/utils";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

interface FeedConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedType: "rss" | "ical";
}

/** Segmentierte Auswahl: aktiv als Druckfläche in Orange mit Tinte. */
function segmentClass(active: boolean) {
  return cn(
    "px-4 py-2 text-sm font-semibold transition-colors",
    active
      ? "bg-primary text-ink"
      : "border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/60 dark:hover:bg-night-rule border bg-paper dark:bg-night",
  );
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
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open");
    } else {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
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
    <ScrollableModal zIndex="z-100" onBackdropClick={onClose}>
      <ScrollableModalCard maxW="2xl" className="overflow-hidden">
        <ScrollableModalHeader className="border-rule dark:border-night-rule border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {feedType === "rss" ? (
                <Rss className="h-6 w-6 text-orange-500" />
              ) : (
                <Calendar className="h-6 w-6 text-blue-500" />
              )}
              <h2 className="text-ink dark:text-night-text text-xl font-bold">
                {feedType === "rss" ? "RSS Feed" : "iCal Feed"} konfigurieren
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-2 transition-colors"
              aria-label="Schließen"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </ScrollableModalHeader>

        <ScrollableModalBody className="space-y-6">
          {/* iCal Type Selection */}
          {feedType === "ical" && (
            <div>
              <Label>Typ auswählen</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setIcalType("events")}
                  className={segmentClass(icalType === "events")}
                >
                  Veranstaltungen
                </button>
                <button
                  onClick={() => setIcalType("courses")}
                  className={segmentClass(icalType === "courses")}
                >
                  Lehrgänge
                </button>
                <button
                  onClick={() => setIcalType("both")}
                  className={segmentClass(icalType === "both")}
                >
                  Beide
                </button>
              </div>
            </div>
          )}

          {/* District Selection */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <Label>Bezirke filtern (optional)</Label>
              <button
                onClick={handleSelectAll}
                className="text-primary-ink dark:text-primary text-xs font-semibold underline-offset-4 transition-colors hover:underline"
              >
                {selectedBezirke.length === bezirke.length &&
                !bezirksuebergreifend
                  ? "Alle abwählen"
                  : "Alle auswählen"}
              </button>
            </div>
            <div className="border-rule dark:border-night-rule max-h-64 space-y-2 overflow-y-auto border p-3">
              {bezirke.length === 0 ? (
                <p className="text-dark dark:text-night-muted text-sm">
                  Lade Bezirke...
                </p>
              ) : (
                <>
                  {/* Bezirksübergreifend Option - First in list */}
                  <label className="text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule flex cursor-pointer items-center gap-3 p-2 transition-colors">
                    <Checkbox
                      checked={bezirksuebergreifend}
                      onChange={handleBezirksuebergreifendToggle}
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
                        className="text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule flex cursor-pointer items-center gap-3 p-2 transition-colors"
                      >
                        <Checkbox
                          checked={selectedBezirke.includes(bezirk.id)}
                          onChange={() => handleBezirkToggle(bezirk.id)}
                        />
                        <span className="text-sm">
                          Bezirk {bezirk.number} - {bezirk.shortName}
                        </span>
                      </label>
                    ))}
                </>
              )}
            </div>
            <p className="text-dark dark:text-night-muted mt-2 text-xs">
              {selectedBezirke.length === 0 && !bezirksuebergreifend
                ? "Keine Filterung: Alle Bezirke werden angezeigt"
                : `${bezirksuebergreifend ? "Bezirksübergreifend" : ""}${bezirksuebergreifend && selectedBezirke.length > 0 ? " + " : ""}${selectedBezirke.length > 0 ? `${selectedBezirke.length} Bezirk${selectedBezirke.length === 1 ? "" : "e"}` : ""} ausgewählt`}
            </p>
          </div>

          {/* Feed URL */}
          <div>
            <Label>Feed-URL</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={feedUrl}
                readOnly
                aria-label="Feed-URL"
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                onClick={() => void handleCopy()}
                aria-label="URL kopieren"
                className="gap-2"
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
              </Button>
            </div>
            <p className="text-dark dark:text-night-muted mt-2 text-xs">
              {feedType === "rss"
                ? "Diese URL können Sie in Ihren RSS-Reader einfügen."
                : "Diese URL können Sie in Ihren Kalender importieren (Google Calendar, Outlook, Apple Calendar, etc.)."}
            </p>
          </div>
        </ScrollableModalBody>

        <ScrollableModalFooter>
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Schließen
            </Button>
            {feedType === "rss" && (
              <a
                href={feedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="semi-condensed bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted inline-flex h-10 items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors"
              >
                <Rss className="h-4 w-4" />
                Feed öffnen
              </a>
            )}
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
