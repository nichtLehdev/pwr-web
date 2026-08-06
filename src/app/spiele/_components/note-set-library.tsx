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

/** Kleine Filter-Chips (Schlüssel, Sortierung) im Kachel-Stil der Spiele. */
function filterChipClass(active: boolean): string {
  return cn(
    "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors active:scale-[0.99]",
    "text-dark dark:text-dark-text",
    active
      ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
      : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35",
  );
}

const SECONDARY_BUTTON_CLASS =
  "border-dark-border/50 dark:border-dark-border text-dark dark:text-dark-text hover:border-primary/40 dark:hover:border-primary/35 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50";

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
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dark:bg-dark-surface dark:border-dark-border flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-xl outline-none sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:border sm:border-gray-200"
      >
        {/* Kopfzeile */}
        <div className="dark:border-dark-border flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-6">
          <h2
            id={titleId}
            className="text-dark dark:text-dark-text text-lg font-bold"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-dark dark:text-dark-text hover:bg-background-secondary/80 dark:hover:bg-dark-background/50 rounded-lg p-2 transition-colors"
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
                className="border-dark-border/50 dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none"
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
                  <span className="text-dark dark:text-dark-text-muted text-xs">
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
                <div className="text-dark dark:text-dark-text-muted flex items-center justify-center gap-2 py-10 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Notensets werden geladen …
                </div>
              ) : listQuery.isError ? (
                <div className="py-10 text-center">
                  <p className="text-dark dark:text-dark-text-muted text-sm">
                    Notensets konnten nicht geladen werden.
                  </p>
                  <button
                    type="button"
                    onClick={() => void listQuery.refetch()}
                    className={cn(SECONDARY_BUTTON_CLASS, "mt-3")}
                  >
                    Erneut versuchen
                  </button>
                </div>
              ) : sets.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-dark dark:text-dark-text text-sm font-bold">
                    Keine Notensets gefunden.
                  </p>
                  <p className="text-dark dark:text-dark-text-muted mt-1 text-xs">
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
                        className="border-dark-border/50 dark:border-dark-border rounded-lg border p-3 sm:p-4"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-dark dark:text-dark-text font-bold">
                            {set.name}
                          </span>
                          <span className="bg-primary/12 text-primary dark:bg-primary/20 dark:text-primary-light rounded-lg px-1.5 py-0.5 text-[10px] font-bold">
                            {CLEF_LABELS[set.clef]}
                          </span>
                          <span className="text-dark dark:text-dark-text-muted text-xs">
                            {noteCount}
                          </span>
                        </div>
                        <p className="text-dark dark:text-dark-text-muted mt-0.5 text-xs">
                          von {noteSetCreatorLabel(set)} · {set.timesUsed}×
                          gespielt
                        </p>
                        {set.description && (
                          <p className="text-dark dark:text-dark-text-muted mt-1 line-clamp-2 text-xs leading-snug">
                            {set.description}
                          </p>
                        )}
                        <p className="text-dark dark:text-dark-text mt-1.5 text-xs tabular-nums">
                          {pitchPreview(set)}
                        </p>
                        {!use.usable && (
                          <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                            {use.reason}
                          </p>
                        )}

                        {confirmDeleteId === set.id ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-dark dark:text-dark-text text-xs font-bold">
                              Set wirklich löschen?
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeMutation.mutate(
                                  { id: set.id },
                                  {
                                    onSuccess: () => setConfirmDeleteId(null),
                                  },
                                )
                              }
                              disabled={deleting}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:border-red-500 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
                            >
                              {deleting && (
                                <Loader2
                                  className="h-3.5 w-3.5 animate-spin"
                                  aria-hidden
                                />
                              )}
                              Ja, löschen
                            </button>
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
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  Löschen fehlgeschlagen.
                                </span>
                              )}
                          </div>
                        ) : (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUse(set)}
                              disabled={!use.usable}
                              className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark rounded-lg px-3.5 py-2 text-xs font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Verwenden
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(set)}
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
                                  className={SECONDARY_BUTTON_CLASS}
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                                  Bearbeiten
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(set.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:border-red-500 dark:border-red-900 dark:text-red-400"
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
          <div className="dark:border-dark-border shrink-0 border-t border-gray-200 p-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setView({ kind: "create" })}
                disabled={!loggedIn}
                className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Neues Set erstellen
              </button>
              {!loggedIn && !session.isPending && (
                <p className="text-dark dark:text-dark-text-muted text-xs">
                  Zum Veröffentlichen bitte{" "}
                  <Link
                    href="/login"
                    className="text-primary dark:text-primary-light font-bold underline"
                  >
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
