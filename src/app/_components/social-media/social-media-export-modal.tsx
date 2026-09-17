"use client";
import { Button, Checkbox, Label, Select } from "@/app/_components/ui";
import { cn } from "@/lib/utils";

import { useState, useRef } from "react";
import { api } from "@/trpc/react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { useToast } from "@/app/_components/ui/toast";
import InstagramSummaryTemplate from "./instagram-summary-template";
import InstagramEventTemplate from "./instagram-event-template";
import { ArrowUpRightIcon, DownloadIcon, XIcon } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
} from "@/app/_components/ui/scrollable-modal";

interface SocialMediaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

/** Native size of the Instagram templates - also the exported image size. */
const CANVAS_SIZE = 1080;
/** Size of the on-screen preview box. */
const PREVIEW_SIZE = 540;
const PREVIEW_SCALE = PREVIEW_SIZE / CANVAS_SIZE;

/** Sidebar-Eintrag: aktiv wie im Dashboard eine Druckfläche in Orange mit Tinte. */
function sidebarItemClass(active: boolean) {
  return cn(
    "border-rule dark:border-night-rule w-full border-b px-4 py-3 text-left transition-colors",
    active
      ? "bg-primary text-ink"
      : "text-ink dark:text-night-text hover:bg-rule/60 dark:hover:bg-night-rule",
  );
}

export default function SocialMediaExportModal({
  isOpen,
  onClose,
}: SocialMediaExportModalProps) {
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | number>("summary");
  const [activeSummaryPage, setActiveSummaryPage] = useState(0);
  const [groupByDistrict, setGroupByDistrict] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [imagePositions, setImagePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewImageRef = useRef<HTMLDivElement>(null);

  const summaryRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const eventRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleMouseDown = (e: React.MouseEvent) => {
    if (typeof activeTab !== "number" || !events?.[activeTab]) return;
    const event = events[activeTab];
    const imageUrl =
      event.coverImage?.url ||
      event.ensemble?.image?.url ||
      event.auswahlChor?.image?.url;
    if (!imageUrl) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || typeof activeTab !== "number" || !events?.[activeTab])
      return;

    const event = events[activeTab];
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const currentPos = imagePositions[event.id] || { x: 50, y: 50 };

    const newX = Math.max(0, Math.min(100, currentPos.x - deltaX / 5.4));
    const newY = Math.max(0, Math.min(100, currentPos.y - deltaY / 5.4));

    setImagePositions((prev) => ({
      ...prev,
      [event.id]: { x: newX, y: newY },
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const { data: events, isLoading } = api.events.getEventsByMonth.useQuery(
    {
      month: selectedMonth,
      year: selectedYear,
    },
    {
      enabled: isOpen,
    },
  );

  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const categoryOptions = [
    { value: "KONZERT", label: "Konzert" },
    { value: "GOTTESDIENST", label: "Gottesdienst" },
    { value: "PROBE", label: "Probe" },
    { value: "ANDERE", label: "Andere" },
  ];

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const toggleAllCategories = () => {
    if (selectedCategories.length === categoryOptions.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categoryOptions.map((c) => c.value));
    }
  };

  const filteredEvents =
    events && selectedCategories.length > 0
      ? events.filter((event) => selectedCategories.includes(event.category))
      : events;

  const eventsPerPage = 5;
  const summaryPageCount = filteredEvents
    ? Math.ceil(filteredEvents.length / eventsPerPage)
    : 0;

  const groupedEvents =
    filteredEvents && groupByDistrict
      ? filteredEvents.reduce(
          (acc, event) => {
            const districtKey = event.bezirk
              ? `Bezirk ${event.bezirk.number}`
              : "Allgemein";
            if (!acc[districtKey]) {
              acc[districtKey] = [];
            }
            acc[districtKey]!.push(event);
            return acc;
          },
          {} as Record<string, typeof filteredEvents>,
        )
      : null;

  const downloadImage = async (element: HTMLElement): Promise<Blob> => {
    await document.fonts.ready;

    const images = element.querySelectorAll("img");

    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          img.onload = () => {
            resolve(undefined);
          };
          img.onerror = () => {
            resolve(undefined);
          };
          if (!img.src) {
            resolve(undefined);
          }
        });
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 200));

    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2,
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      cacheBust: true,
      skipFonts: true,
      backgroundColor: "#ffffff",
      // The preview shrinks the template with a CSS transform. html-to-image
      // clones the node with its inline styles, so without resetting the
      // transform the template would only cover a corner of the canvas.
      style: {
        transform: "none",
        transformOrigin: "top left",
        margin: "0",
      },
    });

    const base64Response = dataUrl.split(",")[1];
    if (!base64Response) {
      throw new Error("Invalid data URL");
    }
    const binaryString = atob(base64Response);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/png" });

    return blob;
  };

  const handleDownloadSummary = async () => {
    const element = summaryRefs.current.get(activeSummaryPage);
    if (!element) return;

    setIsGenerating(true);
    try {
      const blob = await downloadImage(element);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const pageLabel =
        summaryPageCount > 1 ? `-seite-${activeSummaryPage + 1}` : "";
      link.download = `termine-${monthNames[selectedMonth - 1]}-${selectedYear}${pageLabel}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Zusammenfassung heruntergeladen!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Fehler beim Generieren des Bildes");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadEvent = async (eventId: string, eventTitle: string) => {
    const element = eventRefs.current.get(eventId);
    if (!element) return;

    setIsGenerating(true);
    try {
      const safeTitle = eventTitle
        .replace(/[^a-z0-9äöüß]/gi, "-")
        .toLowerCase();
      const blob = await downloadImage(element);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `event-${safeTitle}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Event-Bild heruntergeladen!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Fehler beim Generieren des Bildes");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!filteredEvents || filteredEvents.length === 0) return;

    setIsGenerating(true);
    const originalTab = activeTab;

    try {
      const zip = new JSZip();

      setActiveTab("summary");
      await new Promise((resolve) => setTimeout(resolve, 100));

      for (let pageIndex = 0; pageIndex < summaryPageCount; pageIndex++) {
        setActiveSummaryPage(pageIndex);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const element = summaryRefs.current.get(pageIndex);
        if (element) {
          const summaryBlob = await downloadImage(element);
          const pageLabel =
            summaryPageCount > 1 ? `-seite-${pageIndex + 1}` : "";
          zip.file(
            `00-zusammenfassung-${monthNames[selectedMonth - 1]}-${selectedYear}${pageLabel}.png`,
            summaryBlob,
          );
        }
      }

      for (let i = 0; i < filteredEvents.length; i++) {
        const event = filteredEvents[i];
        if (!event) continue;

        setActiveTab(i);
        await new Promise((resolve) => setTimeout(resolve, 300));

        const element = eventRefs.current.get(event.id);
        if (!element) {
          console.warn(`Element not found for event ${event.id}`);
          continue;
        }

        const safeTitle = event.title
          .replace(/[^a-z0-9äöüß]/gi, "-")
          .toLowerCase();
        const blob = await downloadImage(element);

        const eventDate = new Date(event.eventDate);
        const dayNum = String(eventDate.getDate()).padStart(2, "0");
        zip.file(`${dayNum}-${safeTitle}.png`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `instagram-posts-${monthNames[selectedMonth - 1]}-${selectedYear}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Alle Bilder als ZIP heruntergeladen!");
    } catch (error) {
      console.error("Error generating ZIP:", error);
      toast.error("Fehler beim Erstellen des ZIP-Archivs");
    } finally {
      setActiveTab(originalTab);
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ScrollableModal>
      <ScrollableModalCard
        maxW="6xl"
        className="relative max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="condensed text-ink dark:text-night-text text-2xl font-bold">
              Instagram Posts generieren
            </h2>
            <p className="text-dark dark:text-night-muted mt-1 text-sm">
              Erstelle Social Media Posts für deine Termine
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Schließen"
            className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-2 transition-colors"
            disabled={isGenerating}
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Month/Year Selector */}
        <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised border-b px-6 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Monat</Label>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                disabled={isGenerating}
              >
                {monthNames.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Jahr</Label>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                disabled={isGenerating}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Gruppierung</Label>
              <label className="border-rule dark:border-night-rule bg-paper dark:bg-night flex min-h-11 items-center gap-2 border px-3 py-2">
                <Checkbox
                  checked={groupByDistrict}
                  onChange={(e) => setGroupByDistrict(e.target.checked)}
                  disabled={isGenerating}
                />
                <span className="text-ink dark:text-night-text text-sm">
                  Nach Bezirk
                </span>
              </label>
            </div>
            <div className="w-full">
              <Label>Kategorien filtern</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleAllCategories}
                  disabled={isGenerating}
                >
                  {selectedCategories.length === categoryOptions.length
                    ? "Keine"
                    : "Alle"}
                </Button>
                {categoryOptions.map((category) => {
                  const isSelected = selectedCategories.includes(
                    category.value,
                  );
                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => toggleCategory(category.value)}
                      aria-pressed={isSelected}
                      className={cn(
                        "semi-condensed px-3 py-1.5 text-sm font-semibold transition-colors",
                        isSelected
                          ? "bg-primary text-ink"
                          : "border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/60 dark:hover:bg-night-rule bg-paper dark:bg-night border",
                      )}
                      disabled={isGenerating}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                onClick={() => void handleDownloadAll()}
                disabled={
                  isGenerating || !filteredEvents || filteredEvents.length === 0
                }
                isLoading={isGenerating}
                className="gap-2"
              >
                <DownloadIcon className="h-5 w-5" />
                Alle als ZIP
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-200px)] overflow-hidden">
          {/* Sidebar */}
          <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised w-64 shrink-0 overflow-y-auto border-r">
            <button
              onClick={() => setActiveTab("summary")}
              className={sidebarItemClass(activeTab === "summary")}
            >
              <div className="font-semibold">Zusammenfassung</div>
              <div className="text-sm opacity-80">
                {filteredEvents?.length || 0} Termine
              </div>
            </button>

            {isLoading && (
              <div className="text-dark dark:text-night-muted px-4 py-8 text-center text-sm">
                Lädt Termine...
              </div>
            )}

            {!isLoading && filteredEvents && filteredEvents.length === 0 && (
              <div className="text-dark dark:text-night-muted px-4 py-8 text-center text-sm">
                {selectedCategories.length > 0
                  ? "Keine Termine mit den gewählten Kategorien"
                  : "Keine Termine in diesem Monat"}
              </div>
            )}

            {!isLoading &&
              filteredEvents &&
              groupByDistrict &&
              groupedEvents &&
              Object.entries(groupedEvents).map(
                ([districtName, districtEvents]) => (
                  <div key={districtName}>
                    <div className="bg-rule/25 dark:bg-night-raised text-dark dark:text-night-muted semi-condensed px-4 py-2 text-xs font-semibold tracking-wide uppercase">
                      {districtName} ({districtEvents.length})
                    </div>
                    {districtEvents.map((event) => {
                      const globalIndex = filteredEvents.findIndex(
                        (e) => e.id === event.id,
                      );
                      return (
                        <button
                          key={event.id}
                          onClick={() => setActiveTab(globalIndex)}
                          className={sidebarItemClass(
                            activeTab === globalIndex,
                          )}
                        >
                          <div className="truncate font-semibold">
                            {event.title}
                          </div>
                          <div className="text-sm opacity-80">
                            {new Date(event.eventDate).toLocaleDateString(
                              "de-DE",
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ),
              )}

            {!isLoading &&
              filteredEvents &&
              !groupByDistrict &&
              filteredEvents.map((event, index) => (
                <button
                  key={event.id}
                  onClick={() => setActiveTab(index)}
                  className={sidebarItemClass(activeTab === index)}
                >
                  <div className="truncate font-semibold">{event.title}</div>
                  <div className="text-sm opacity-80">
                    {new Date(event.eventDate).toLocaleDateString("de-DE")}
                  </div>
                </button>
              ))}
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === "summary" && filteredEvents && (
              <div className="flex flex-col items-center gap-4">
                {summaryPageCount > 1 && (
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setActiveSummaryPage((p) => Math.max(0, p - 1))
                      }
                      disabled={activeSummaryPage === 0 || isGenerating}
                    >
                      ← Vorherige
                    </Button>
                    <span className="text-ink dark:text-night-text text-sm font-medium">
                      Seite {activeSummaryPage + 1} von {summaryPageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setActiveSummaryPage((p) =>
                          Math.min(summaryPageCount - 1, p + 1),
                        )
                      }
                      disabled={
                        activeSummaryPage === summaryPageCount - 1 ||
                        isGenerating
                      }
                    >
                      Nächste →
                    </Button>
                  </div>
                )}
                {Array.from({ length: summaryPageCount }).map(
                  (_, pageIndex) => {
                    const startIndex = pageIndex * eventsPerPage;
                    const endIndex = Math.min(
                      startIndex + eventsPerPage,
                      filteredEvents.length,
                    );
                    const pageEvents = filteredEvents.slice(
                      startIndex,
                      endIndex,
                    );

                    return (
                      <div
                        key={pageIndex}
                        className="overflow-hidden"
                        style={{
                          width: `${PREVIEW_SIZE}px`,
                          height: `${PREVIEW_SIZE}px`,
                          display:
                            activeSummaryPage === pageIndex ? "block" : "none",
                        }}
                      >
                        <div
                          style={{
                            transform: `scale(${PREVIEW_SCALE})`,
                            transformOrigin: "top left",
                          }}
                        >
                          <div
                            ref={(el) => {
                              if (el) {
                                summaryRefs.current.set(pageIndex, el);
                              }
                            }}
                            style={{
                              width: `${CANVAS_SIZE}px`,
                              height: `${CANVAS_SIZE}px`,
                            }}
                          >
                            <InstagramSummaryTemplate
                              events={pageEvents}
                              month={selectedMonth}
                              year={selectedYear}
                              pageNumber={
                                summaryPageCount > 1 ? pageIndex + 1 : undefined
                              }
                              totalPages={
                                summaryPageCount > 1
                                  ? summaryPageCount
                                  : undefined
                              }
                              totalEvents={filteredEvents.length}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
                <Button
                  type="button"
                  onClick={() => void handleDownloadSummary()}
                  disabled={isGenerating}
                  isLoading={isGenerating}
                  className="gap-2"
                >
                  <DownloadIcon className="h-5 w-5" />
                  {summaryPageCount > 1
                    ? `Seite ${activeSummaryPage + 1} herunterladen`
                    : "Zusammenfassung herunterladen"}
                </Button>
              </div>
            )}

            {typeof activeTab === "number" && filteredEvents && (
              <div className="flex flex-col items-center gap-4">
                {filteredEvents[activeTab] &&
                  (filteredEvents[activeTab]!.coverImage?.url ||
                    filteredEvents[activeTab]!.ensemble?.image?.url ||
                    filteredEvents[activeTab]!.auswahlChor?.image?.url) && (
                    <div className="text-dark dark:text-night-muted flex items-center gap-2 text-sm">
                      <ArrowUpRightIcon className="h-5 w-5" />
                      Bild ziehen, um Position anzupassen
                    </div>
                  )}
                <div
                  className="relative"
                  style={{
                    width: `${PREVIEW_SIZE}px`,
                    height: `${PREVIEW_SIZE}px`,
                  }}
                >
                  {filteredEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="overflow-hidden"
                      style={{
                        width: `${PREVIEW_SIZE}px`,
                        height: `${PREVIEW_SIZE}px`,
                        position: "absolute",
                        top: 0,
                        left: 0,
                        opacity: activeTab === index ? 1 : 0,
                        zIndex: activeTab === index ? 10 : 1,
                        pointerEvents: activeTab === index ? "auto" : "none",
                      }}
                    >
                      <div
                        className={
                          activeTab === index && isDragging
                            ? "cursor-grabbing"
                            : activeTab === index
                              ? "cursor-grab"
                              : ""
                        }
                        onMouseDown={
                          activeTab === index ? handleMouseDown : undefined
                        }
                        onMouseMove={
                          activeTab === index ? handleMouseMove : undefined
                        }
                        onMouseUp={
                          activeTab === index ? handleMouseUp : undefined
                        }
                        onMouseLeave={
                          activeTab === index ? handleMouseUp : undefined
                        }
                        style={{
                          transform: `scale(${PREVIEW_SCALE})`,
                          transformOrigin: "top left",
                        }}
                      >
                        <div
                          ref={(el) => {
                            if (el) {
                              eventRefs.current.set(event.id, el);
                            }
                            if (activeTab === index && el) {
                              previewImageRef.current = el;
                            }
                          }}
                          style={{
                            width: `${CANVAS_SIZE}px`,
                            height: `${CANVAS_SIZE}px`,
                          }}
                        >
                          <InstagramEventTemplate
                            event={event}
                            imagePosition={
                              imagePositions[event.id] || {
                                x: 50,
                                y: 50,
                              }
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredEvents[activeTab] && (
                  <Button
                    type="button"
                    onClick={() =>
                      void handleDownloadEvent(
                        filteredEvents[activeTab]!.id,
                        filteredEvents[activeTab]!.title,
                      )
                    }
                    disabled={isGenerating}
                    isLoading={isGenerating}
                    className="gap-2"
                  >
                    <DownloadIcon className="h-5 w-5" />
                    Event herunterladen
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
