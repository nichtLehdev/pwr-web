"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import PublicPage from "../../_components/general/public-page";
import { ButtonLink } from "../../_components/programmheft/button-link";
import { ClosingCall } from "../../_components/programmheft/closing-call";
import { PageSection } from "../../_components/programmheft/page-section";
import { Heading } from "../../_components/programmheft/section-head";
import {
  PointList,
  type Point,
} from "../../_components/programmheft/point-list";
import LoadingSpinner from "../../_components/general/loading-spinner";

const INFO_ITEMS: Point[] = [
  {
    title: "Über das Blechblatt",
    text: "Das Rheinische Blechblatt erscheint viermal im Jahr und informiert über alle wichtigen Ereignisse, Termine und Neuigkeiten aus dem Posaunenwerk Rheinland. Es ist das zentrale Kommunikationsmedium für unsere Mitglieder.",
  },
  {
    title: "Beiträge einreichen",
    text: (
      <>
        Sie haben eine Nachricht aus Ihrem Chor, möchten einen Bericht verfassen
        oder haben Anregungen für das Blechblatt? Wir freuen uns über Ihre
        Beiträge!
        <span className="mt-3 block">
          <Link
            href="/kontakt"
            className="link-ink inline-flex min-h-11 items-center gap-2 text-base"
          >
            Kontakt aufnehmen
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </span>
      </>
    ),
  },
];

export default function BlechblattPage() {
  const { data: editions, isLoading } =
    api.materials.getBlechblattEditions.useQuery();

  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(
    null,
  );
  const [pdfKey, setPdfKey] = useState(0);

  const selectedEdition = useMemo(() => {
    if (!editions || editions.length === 0) return null;
    if (selectedEditionId) {
      return editions.find((e) => e.id === selectedEditionId) ?? editions[0]!;
    }
    return editions[0]!;
  }, [editions, selectedEditionId]);

  const pdfUrl = selectedEdition?.fileUrl ?? null;

  const pdfUrlWithCacheBust = pdfUrl
    ? `${pdfUrl}${pdfUrl.includes("?") ? "&" : "?"}t=${pdfKey}`
    : null;

  const handleEditionChange = (editionId: string) => {
    setSelectedEditionId(editionId);
    setPdfKey((prev) => prev + 1);
  };

  return (
    <PublicPage
      title="Rheinisches Blechblatt"
      breadcrumbs={[
        { label: "Start", href: "/" },
        { label: "Materialien", href: "/materialien" },
        { label: "Rheinisches Blechblatt" },
      ]}
      description={
        <p>
          Das Rheinische Blechblatt ist unser Magazin für die
          Posaunenchorarbeit. Es erscheint vierteljährlich und enthält Berichte,
          Termine, Neuigkeiten und Impulse aus dem gesamten Posaunenwerk
          Rheinland.
        </p>
      }
    >
      <PageSection flush="top">
        {isLoading ? (
          <LoadingSpinner text="Blechblatt-Ausgaben werden geladen..." />
        ) : editions && editions.length > 0 ? (
          <div>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 lg:max-w-sm lg:flex-1">
                <label
                  htmlFor="edition-select"
                  className="semi-condensed text-ink dark:text-night-text text-sm font-semibold"
                >
                  Ausgabe wählen
                </label>
                <div className="relative mt-2">
                  <select
                    id="edition-select"
                    value={selectedEdition?.id ?? ""}
                    onChange={(e) => handleEditionChange(e.target.value)}
                    className="border-ink dark:border-night-text text-ink dark:bg-night dark:text-night-text bg-paper h-12 w-full appearance-none border-2 px-4 pr-10 text-base outline-none"
                  >
                    {editions.map((edition) => (
                      <option key={edition.id} value={edition.id}>
                        {edition.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="text-dark dark:text-night-muted pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2"
                  />
                </div>
              </div>

              {selectedEdition ? (
                <div className="text-dark dark:text-night-muted text-sm lg:max-w-xs lg:text-right">
                  {selectedEdition.description ? (
                    <p>{selectedEdition.description}</p>
                  ) : null}
                  {selectedEdition.fileSize ? (
                    <p className="mt-1 text-xs">
                      PDF ·{" "}
                      {selectedEdition.fileSize >= 1048576
                        ? `${(selectedEdition.fileSize / 1048576).toFixed(1)} MB`
                        : `${(selectedEdition.fileSize / 1024).toFixed(1)} KB`}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {pdfUrl ? (
              <div className="border-ink dark:border-night-text mt-8 border-2">
                <div className="border-ink dark:border-night-text flex flex-wrap items-center justify-between gap-3 border-b-2 px-4 py-3 md:px-6">
                  <h2 className="condensed text-ink dark:text-night-text truncate text-lg font-bold">
                    {selectedEdition?.title ?? "PDF-Vorschau"}
                  </h2>
                  <ButtonLink
                    href={selectedEdition?.fileUrl ?? "#"}
                    kind="download"
                    fileType="PDF"
                    variant="outline"
                  >
                    Herunterladen
                  </ButtonLink>
                </div>
                <div className="relative w-full" style={{ height: "80vh" }}>
                  <embed
                    key={`pdf-${pdfKey}-${selectedEdition?.id}`}
                    src={`${pdfUrlWithCacheBust}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                    type="application/pdf"
                    className="h-full w-full"
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-14">
              <Heading as="h2" size="list" rule>
                Alle Ausgaben
              </Heading>
              <ul className="border-ink dark:border-night-text mt-6 grid border-t-2 md:grid-cols-2 md:gap-x-10">
                {editions.map((edition) => {
                  const selected = selectedEdition?.id === edition.id;
                  return (
                    <li
                      key={edition.id}
                      className="border-rule dark:border-night-rule border-b"
                    >
                      <button
                        type="button"
                        onClick={() => handleEditionChange(edition.id)}
                        aria-pressed={selected}
                        className="fill-row flex min-h-16 w-full items-center gap-3 px-1 py-3 text-left"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-2 w-2 shrink-0",
                            selected && "bg-ink dark:bg-primary",
                          )}
                        />
                        <span className="min-w-0">
                          <span className="condensed text-ink dark:text-night-text block text-[1.25rem] leading-tight font-bold">
                            {edition.title}
                          </span>
                          <span className="semi-condensed text-dark dark:text-night-muted mt-0.5 block text-sm font-semibold">
                            {new Date(edition.createdAt).toLocaleDateString(
                              "de-DE",
                              { year: "numeric", month: "long" },
                            )}
                          </span>
                          {edition.description ? (
                            <span className="text-dark dark:text-night-muted mt-1 block max-w-[46ch] text-sm">
                              {edition.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : (
          <div className="border-ink dark:border-night-text border-t-2 py-16 text-center">
            <h2 className="condensed text-ink dark:text-night-text text-[1.75rem] leading-tight font-bold">
              Keine Ausgaben verfügbar
            </h2>
            <p className="text-dark dark:text-night-muted mx-auto mt-4 max-w-md text-lg leading-relaxed">
              Aktuell sind keine Blechblatt-Ausgaben online verfügbar. Bitte
              schauen Sie später noch einmal vorbei.
            </p>
            <Link
              href="/materialien"
              className="link-ink mt-6 inline-flex min-h-11 items-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
              Zurück zu Materialien
            </Link>
          </div>
        )}
      </PageSection>

      <PageSection rule>
        <PointList items={INFO_ITEMS} />
      </PageSection>

      <ClosingCall
        id="blechblatt-cta-heading"
        title="Weitere Materialien entdecken"
        text="Entdecken Sie weitere Materialien wie Bläserhefte, Noten und Übungen für Ihre Posaunenchorarbeit."
        actions={[{ href: "/materialien", label: "Alle Materialien ansehen" }]}
      />
    </PublicPage>
  );
}
