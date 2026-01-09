"use client";

import { useState, useRef } from "react";
import { api } from "@/trpc/react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import { useToast } from "@/app/_components/ui/toast";
import InstagramSummaryTemplate from "./instagram-summary-template";
import InstagramEventTemplate from "./instagram-event-template";
import { ArrowUpRightIcon, DownloadIcon, XIcon } from "lucide-react";

interface SocialMediaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

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
      width: 1080,
      height: 1080,
      cacheBust: true,
      skipFonts: true,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="dark:bg-dark-surface dark:border-dark-border relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="dark:border-dark-border dark:bg-dark-background-secondary flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div>
            <h2 className="dark:text-dark-text text-2xl font-bold text-gray-900">
              Instagram Posts generieren
            </h2>
            <p className="dark:text-dark-text-secondary mt-1 text-sm text-gray-600">
              Erstelle Social Media Posts für deine Termine
            </p>
          </div>
          <button
            onClick={onClose}
            className="dark:hover:bg-dark-border rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            disabled={isGenerating}
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Month/Year Selector */}
        <div className="dark:border-dark-border dark:bg-dark-background-secondary border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Monat
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="dark:bg-dark-surface dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-2"
                disabled={isGenerating}
              >
                {monthNames.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Jahr
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="dark:bg-dark-surface dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-3 py-2"
                disabled={isGenerating}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                Gruppierung
              </label>
              <label className="dark:border-dark-border dark:bg-dark-surface flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                <input
                  type="checkbox"
                  checked={groupByDistrict}
                  onChange={(e) => setGroupByDistrict(e.target.checked)}
                  className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                  disabled={isGenerating}
                />
                <span className="dark:text-dark-text text-sm">Nach Bezirk</span>
              </label>
            </div>
            <div className="w-full">
              <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                Kategorien filtern
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={toggleAllCategories}
                  className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={isGenerating}
                >
                  {selectedCategories.length === categoryOptions.length
                    ? "Keine"
                    : "Alle"}
                </button>
                {categoryOptions.map((category) => {
                  const isSelected = selectedCategories.includes(
                    category.value,
                  );
                  return (
                    <button
                      key={category.value}
                      onClick={() => toggleCategory(category.value)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-primary text-white"
                          : "dark:border-dark-border dark:bg-dark-surface dark:text-dark-text border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      disabled={isGenerating}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleDownloadAll}
                disabled={
                  isGenerating || !filteredEvents || filteredEvents.length === 0
                }
                className="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generiere...
                  </>
                ) : (
                  <>
                    <DownloadIcon className="h-5 w-5" />
                    Alle als ZIP
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-200px)] overflow-hidden">
          {/* Sidebar */}
          <div className="dark:border-dark-border dark:bg-dark-background-secondary w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50">
            <button
              onClick={() => setActiveTab("summary")}
              className={`dark:border-dark-border w-full border-b border-gray-200 px-4 py-3 text-left transition-colors ${
                activeTab === "summary"
                  ? "bg-primary text-white"
                  : "dark:text-dark-text dark:hover:bg-dark-border text-gray-700 hover:bg-gray-200"
              }`}
            >
              <div className="font-semibold">Zusammenfassung</div>
              <div className="text-sm opacity-80">
                {filteredEvents?.length || 0} Termine
              </div>
            </button>

            {isLoading && (
              <div className="dark:text-dark-text-secondary px-4 py-8 text-center text-sm text-gray-500">
                Lädt Termine...
              </div>
            )}

            {!isLoading && filteredEvents && filteredEvents.length === 0 && (
              <div className="dark:text-dark-text-secondary px-4 py-8 text-center text-sm text-gray-500">
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
                    <div className="dark:bg-dark-border bg-gray-100 px-4 py-2 text-xs font-bold text-gray-600 uppercase dark:text-gray-400">
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
                          className={`dark:border-dark-border w-full border-b border-gray-200 px-4 py-3 text-left transition-colors ${
                            activeTab === globalIndex
                              ? "bg-primary text-white"
                              : "dark:text-dark-text dark:hover:bg-dark-border text-gray-700 hover:bg-gray-200"
                          }`}
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
                  className={`dark:border-dark-border w-full border-b border-gray-200 px-4 py-3 text-left transition-colors ${
                    activeTab === index
                      ? "bg-primary text-white"
                      : "dark:text-dark-text dark:hover:bg-dark-border text-gray-700 hover:bg-gray-200"
                  }`}
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
                    <button
                      onClick={() =>
                        setActiveSummaryPage((p) => Math.max(0, p - 1))
                      }
                      disabled={activeSummaryPage === 0 || isGenerating}
                      className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                    >
                      ← Vorherige
                    </button>
                    <span className="dark:text-dark-text text-sm font-medium text-gray-700">
                      Seite {activeSummaryPage + 1} von {summaryPageCount}
                    </span>
                    <button
                      onClick={() =>
                        setActiveSummaryPage((p) =>
                          Math.min(summaryPageCount - 1, p + 1),
                        )
                      }
                      disabled={
                        activeSummaryPage === summaryPageCount - 1 ||
                        isGenerating
                      }
                      className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 font-medium transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
                    >
                      Nächste →
                    </button>
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
                        ref={(el) => {
                          if (el) {
                            summaryRefs.current.set(pageIndex, el);
                          }
                        }}
                        className="shadow-lg"
                        style={{
                          width: "540px",
                          height: "540px",
                          display:
                            activeSummaryPage === pageIndex ? "block" : "none",
                        }}
                      >
                        <div
                          style={{
                            transform: "scale(0.5)",
                            transformOrigin: "top left",
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
                    );
                  },
                )}
                <button
                  onClick={handleDownloadSummary}
                  disabled={isGenerating}
                  className="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-lg px-6 py-3 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <DownloadIcon className="h-5 w-5" />
                  {summaryPageCount > 1
                    ? `Seite ${activeSummaryPage + 1} herunterladen`
                    : "Zusammenfassung herunterladen"}
                </button>
              </div>
            )}

            {typeof activeTab === "number" && filteredEvents && (
              <div className="flex flex-col items-center gap-4">
                {filteredEvents[activeTab] &&
                  (filteredEvents[activeTab]!.coverImage?.url ||
                    filteredEvents[activeTab]!.ensemble?.image?.url ||
                    filteredEvents[activeTab]!.auswahlChor?.image?.url) && (
                    <div className="dark:text-dark-text-secondary flex items-center gap-2 text-sm text-gray-600">
                      <ArrowUpRightIcon className="h-5 w-5" />
                      Bild ziehen, um Position anzupassen
                    </div>
                  )}
                <div
                  className="relative"
                  style={{ width: "540px", height: "540px" }}
                >
                  {filteredEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="shadow-lg"
                      style={{
                        width: "540px",
                        height: "540px",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        opacity: activeTab === index ? 1 : 0,
                        zIndex: activeTab === index ? 10 : 1,
                        pointerEvents: activeTab === index ? "auto" : "none",
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
                          transform: "scale(0.5)",
                          transformOrigin: "top left",
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
                  ))}
                </div>
                {filteredEvents[activeTab] && (
                  <button
                    onClick={() =>
                      handleDownloadEvent(
                        filteredEvents[activeTab]!.id,
                        filteredEvents[activeTab]!.title,
                      )
                    }
                    disabled={isGenerating}
                    className="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-lg px-6 py-3 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <DownloadIcon className="h-5 w-5" />
                    Event herunterladen
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
