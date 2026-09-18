"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Check, Copy, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import { Button } from "@/app/_components/ui/button";
import { fieldControlClasses } from "@/app/_components/programmheft/field";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";
import type { ClefKind } from "../(spiel)/noten-lesen/_lib/types";
import {
  CLEF_LABELS,
  NOTE_SET_CLEFS,
  noteSetCreatorLabel,
  pitchLabelWithOctave,
  sortPitchesForDisplay,
  toNoteSetSummary,
  type NoteSetSummary,
} from "../_lib/note-sets";
import { NoteSetEditor } from "./note-set-editor";

/**
 * Öffentliche Notenset-Bibliothek als Vollbild-Overlay: durchsuchen, filtern,
 * verwenden, teilen — und (angemeldet) eigene Sets erstellen, bearbeiten und
 * löschen. Der Editor läuft im selben Overlay.
 *
 * Gestaltung im Programmheft: Papier statt Weiß, Haarlinien statt Rundungen
 * und Schatten, gewählte Filter als oranges Druckfeld. Das Overlay öffnet sich
 * mitten aus dem Setup der Spiele — die Naht dorthin soll nicht auffallen.
 */

export type NoteSetUsability =
  { usable: true } | { usable: false; reason: string };

export type NoteSetLibraryProps = {
  open: boolean;
  onClose: () => void;
  /** Vorfilter auf einen Schlüssel; mit lockClef versteckt das UI den Filter ganz. */
  clef?: ClefKind;
  lockClef?: boolean;
  /** Host aktiviert das Set (Pool übernehmen etc.). Library ruft vorher selbst recordUse auf. */
  onUse: (set: NoteSetSummary) => void;
  /** Optional: Spiel-spezifische Nutzbarkeit (z. B. Griffe: fehlende Griffe). Default: nutzbar. */
  usability?: (set: NoteSetSummary) => NoteSetUsability;
};

type ViewState =
  { kind: "list" } | { kind: "create" } | { kind: "edit"; set: NoteSetSummary };

type SortOrder = "newest" | "popular";

/**
 * Filter- und Sortier-Chip wie die Auswahlkacheln der Spiele: gewählt ist ein
 * Druckfeld (Orange als Fläche, Tinte als Schrift), sonst eine Haarlinie.
 * Mindestens 44 px hoch — vorher waren es rund 30.
 */
function filterChipClass(active: boolean): string {
  return cn(
    "inline-flex min-h-11 items-center border px-3 text-xs font-bold transition-colors active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
    GAME_FOCUS_RING,
    active
      ? "on-orange border-ink bg-primary text-ink"
      : "border-rule text-ink hover:border-ink dark:border-night-rule dark:text-night-text dark:hover:border-night-text",
  );
}

/** Zweitaktion: Haarlinie, die beim Zeigen zur Tinte wird. */
const SECONDARY_BUTTON_CLASS = cn(
  "border-rule text-ink hover:border-ink dark:border-night-rule dark:text-night-text dark:hover:border-night-text inline-flex min-h-11 items-center gap-1.5 border px-4 text-xs font-bold transition-colors active:scale-[0.99] disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100",
  GAME_FOCUS_RING,
);

/**
 * Löschen bleibt rot — die einzige Signalfarbe, die das Heft behält. Umrandet
 * öffnet die Rückfrage, gefüllt (Button-Variante „danger") bestätigt sie.
 */
const DANGER_BUTTON_CLASS = cn(
  "hover:text-paper dark:hover:text-night inline-flex min-h-11 items-center gap-1.5 border border-red-700 px-4 text-xs font-bold text-red-700 transition-colors hover:bg-red-700 disabled:opacity-50 motion-reduce:transition-none dark:border-red-400 dark:text-red-400 dark:hover:bg-red-400",
  GAME_FOCUS_RING,
);

/** Erste ~10 Notenlabels als Vorschau, sortiert; Rest als „…". */
function pitchPreview(set: NoteSetSummary): string {
  const sorted = sortPitchesForDisplay(set.pitches);
  const labels = sorted.slice(0, 10).map(pitchLabelWithOctave);
  return labels.join(" · ") + (sorted.length > 10 ? " …" : "");
}

export function NoteSetLibrary(
  props: NoteSetLibraryProps,
): React.ReactElement | null {
  // Bei jedem Öffnen frisch mounten: Ansicht, Suche und Filter starten sauber,
  // ohne Reset-Effekte im Panel.
  if (!props.open) return null;
  return <NoteSetLibraryPanel {...props} />;
}

function NoteSetLibraryPanel({
  onClose,
  clef,
  lockClef,
  onUse,
  usability,
}: NoteSetLibraryProps): React.ReactElement {
  const session = useSession();
  const userId = session.data?.user.id;
  const utils = api.useUtils();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [view, setView] = useState<ViewState>({ kind: "list" });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterClef, setFilterClef] = useState<ClefKind | undefined>(clef);
  const [orderBy, setOrderBy] = useState<SortOrder>("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Suche entprellen (~300 ms), erst dann an den Server geben.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fokus in den Dialog holen, beim Schließen zurückgeben; Body-Scroll sperren.
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = bodyOverflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const effectiveClef = lockClef ? clef : filterClef;
  const listQuery = api.noteSets.list.useQuery(
    {
      ...(effectiveClef ? { clef: effectiveClef } : {}),
      ...(debouncedSearch !== "" ? { search: debouncedSearch } : {}),
      orderBy,
    },
    {
      placeholderData: (prev) => prev,
    },
  );

  const sets = useMemo(() => {
    const rows = listQuery.data ?? [];
    return rows
      .map(toNoteSetSummary)
      .filter((s): s is NoteSetSummary => s !== null);
  }, [listQuery.data]);

  const recordUse = api.noteSets.recordUse.useMutation();
  const removeMutation = api.noteSets.remove.useMutation({
    onSuccess: () => {
      void utils.noteSets.list.invalidate();
      void utils.noteSets.mine.invalidate();
    },
  });

  const handleUse = useCallback(
    (set: NoteSetSummary) => {
      // Fire-and-forget: Zähler hochsetzen, aber das Spiel nicht warten lassen.
      recordUse.mutate({ publicId: set.publicId });
      onUse(set);
      onClose();
    },
    [recordUse, onUse, onClose],
  );

  const handleCopyLink = useCallback((set: NoteSetSummary) => {
    const url = `${window.location.origin}${window.location.pathname}?set=${set.publicId}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedId(set.id);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 1800);
      })
      .catch(() => {
        // Clipboard nicht verfügbar (z. B. unsicherer Kontext) — still ignorieren.
      });
  }, []);

  const handleSaved = useCallback(() => {
    void utils.noteSets.list.invalidate();
    void utils.noteSets.mine.invalidate();
    setView({ kind: "list" });
  }, [utils]);

  const loggedIn = session.data != null;
  const editorClef =
    view.kind === "edit" ? view.set.clef : (effectiveClef ?? clef ?? "treble");
  const title =
    view.kind === "list"
      ? "Notenset-Bibliothek"
      : view.kind === "create"
        ? "Neues Notenset"
        : "Notenset bearbeiten";

  const handleDismiss = () => {
    // Im Editor wirkt Escape/Klick daneben als „Abbrechen" zurück zur Liste,
    // damit nicht versehentlich das ganze Overlay samt Eingaben zugeht.
    if (view.kind === "list") onClose();
    else setView({ kind: "list" });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          handleDismiss();
        }
      }}
      role="presentation"
    >
      {/* Papier mit Tintenrahmen statt weißer Karte mit Schatten — dieselbe
          Hülle, die der Teilnehmerbogen im Anmeldeformular schon trägt. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-paper dark:bg-night sm:border-ink dark:sm:border-night-text flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden outline-none sm:h-auto sm:max-h-[90vh] sm:border-2"
      >
        {/* Kopfzeile */}
        <div className="border-ink dark:border-night-text flex shrink-0 items-center justify-between gap-3 border-b-2 px-4 py-3 sm:px-6">
          <h2
            id={titleId}
            className="condensed text-ink dark:text-night-text text-base font-extrabold sm:text-lg"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className={cn(
              "text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night -mr-2 flex h-11 w-11 shrink-0 items-center justify-center transition-colors motion-reduce:transition-none",
              GAME_FOCUS_RING,
            )}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Inhalt */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view.kind === "list" ? (
            <div className="space-y-4 p-4 sm:p-6">
              {/* Suche */}
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nach Name suchen …"
                aria-label="Notensets nach Name durchsuchen"
                className={cn(fieldControlClasses, "text-sm", GAME_FOCUS_RING)}
              />

              {/* Filter und Sortierung */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {!lockClef ? (
                  <div
                    role="group"
                    aria-label="Nach Schlüssel filtern"
                    className="flex flex-wrap gap-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => setFilterClef(undefined)}
                      aria-pressed={filterClef === undefined}
                      className={filterChipClass(filterClef === undefined)}
                    >
                      Alle
                    </button>
                    {NOTE_SET_CLEFS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFilterClef(c)}
                        aria-pressed={filterClef === c}
                        className={filterChipClass(filterClef === c)}
                      >
                        {CLEF_LABELS[c]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-dark dark:text-night-muted text-xs">
                    {clef ? CLEF_LABELS[clef] : ""}
                  </span>
                )}
                <div
                  role="group"
                  aria-label="Sortierung"
                  className="flex gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => setOrderBy("newest")}
                    aria-pressed={orderBy === "newest"}
                    className={filterChipClass(orderBy === "newest")}
                  >
                    Neueste
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderBy("popular")}
                    aria-pressed={orderBy === "popular"}
                    className={filterChipClass(orderBy === "popular")}
                  >
                    Beliebt
                  </button>
                </div>
              </div>

              {/* Liste */}
              {listQuery.isPending ? (
                <div className="text-dark dark:text-night-muted flex items-center justify-center gap-2 py-10 text-sm">
                  <Loader2
                    className="h-4 w-4 motion-safe:animate-spin"
                    aria-hidden
                  />
                  Notensets werden geladen …
                </div>
              ) : listQuery.isError ? (
                <div className="py-10 text-center">
                  <p className="text-dark dark:text-night-muted text-sm">
                    Notensets konnten nicht geladen werden.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 min-h-11 text-sm"
                    onClick={() => void listQuery.refetch()}
                  >
                    Erneut versuchen
                  </Button>
                </div>
              ) : sets.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-ink dark:text-night-text text-sm font-bold">
                    Keine Notensets gefunden.
                  </p>
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Passe Suche oder Filter an — oder erstelle das erste Set.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {sets.map((set) => {
                    const isOwn =
                      set.creatorId != null && set.creatorId === userId;
                    const use = usability?.(set) ?? { usable: true as const };
                    const noteCount =
                      set.pitches.length === 1
                        ? "1 Note"
                        : `${set.pitches.length} Noten`;
                    const deleting =
                      removeMutation.isPending && confirmDeleteId === set.id;
                    return (
                      <li
                        key={set.id}
                        className="border-rule dark:border-night-rule border p-3 sm:p-4"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-ink dark:text-night-text font-bold">
                            {set.name}
                          </span>
                          <span className="on-orange bg-primary text-ink px-1.5 py-0.5 text-[10px] font-bold">
                            {CLEF_LABELS[set.clef]}
                          </span>
                          <span className="text-dark dark:text-night-muted text-xs">
                            {noteCount}
                          </span>
                        </div>
                        <p className="text-dark dark:text-night-muted mt-0.5 text-xs">
                          von {noteSetCreatorLabel(set)} · {set.timesUsed}×
                          gespielt
                        </p>
                        {set.description && (
                          <p className="text-dark dark:text-night-muted mt-1 line-clamp-2 text-xs leading-snug">
                            {set.description}
                          </p>
                        )}
                        <p className="text-ink dark:text-night-text mt-1.5 text-xs tabular-nums">
                          {pitchPreview(set)}
                        </p>
                        {!use.usable && (
                          <p className="mt-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                            {use.reason}
                          </p>
                        )}

                        {confirmDeleteId === set.id ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-ink dark:text-night-text text-xs font-bold">
                              Set wirklich löschen?
                            </span>
                            <Button
                              type="button"
                              variant="danger"
                              className="min-h-11 gap-1.5 text-xs"
                              onClick={() =>
                                removeMutation.mutate(
                                  { id: set.id },
                                  {
                                    onSuccess: () => setConfirmDeleteId(null),
                                  },
                                )
                              }
                              disabled={deleting}
                            >
                              {deleting && (
                                <Loader2
                                  className="h-3.5 w-3.5 motion-safe:animate-spin"
                                  aria-hidden
                                />
                              )}
                              Ja, löschen
                            </Button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deleting}
                              className={SECONDARY_BUTTON_CLASS}
                            >
                              Abbrechen
                            </button>
                            {removeMutation.isError &&
                              confirmDeleteId === set.id && (
                                <span className="text-xs text-red-700 dark:text-red-400">
                                  Löschen fehlgeschlagen.
                                </span>
                              )}
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {/* Vorlese-Name nennt das Set, nicht nur die
                                Handlung: „Verwenden" stand vorher viermal
                                gleichlautend in der Liste. */}
                            <Button
                              type="button"
                              className="min-h-11 text-xs"
                              aria-label={`${set.name} verwenden`}
                              onClick={() => handleUse(set)}
                              disabled={!use.usable}
                            >
                              Verwenden
                            </Button>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(set)}
                              aria-label={`Link zu ${set.name} kopieren`}
                              className={SECONDARY_BUTTON_CLASS}
                            >
                              {copiedId === set.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5" aria-hidden />
                                  Kopiert!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" aria-hidden />
                                  Link kopieren
                                </>
                              )}
                            </button>
                            {isOwn && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setView({ kind: "edit", set })}
                                  aria-label={`${set.name} bearbeiten`}
                                  className={SECONDARY_BUTTON_CLASS}
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                                  Bearbeiten
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(set.id)}
                                  aria-label={`${set.name} löschen`}
                                  className={DANGER_BUTTON_CLASS}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                  Löschen
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <NoteSetEditor
              clef={editorClef}
              lockClef={lockClef}
              initial={view.kind === "edit" ? view.set : undefined}
              onSaved={handleSaved}
              onCancel={() => setView({ kind: "list" })}
            />
          )}
        </div>

        {/* Fußzeile nur in der Listenansicht — der Editor bringt seine eigene Leiste mit. */}
        {view.kind === "list" && (
          <div className="border-ink dark:border-night-text shrink-0 border-t-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                className="min-h-11 gap-2 text-sm"
                onClick={() => setView({ kind: "create" })}
                disabled={!loggedIn}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Neues Set erstellen
              </Button>
              {!loggedIn && !session.isPending && (
                <p className="text-dark dark:text-night-muted text-xs">
                  Zum Veröffentlichen bitte{" "}
                  <Link href="/login" className="link-ink">
                    anmelden
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
