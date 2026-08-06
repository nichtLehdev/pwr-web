"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useSession } from "@/lib/auth";
import type { ClefKind, WrittenPitch } from "../(spiel)/noten-lesen/_lib/types";
import {
  CLEF_LABELS,
  NOTE_SET_CLEFS,
  noteSetPitchKey,
  pitchLabelWithOctave,
  selectablePitchesByOctave,
  sortPitchesForDisplay,
  toNoteSetSummary,
  type NoteSetSummary,
} from "../_lib/note-sets";

/**
 * Editor für ein öffentliches Notenset: Name, Beschreibung, Schlüssel und die
 * eigentliche Notenauswahl als Chip-Raster (eine Chip pro Schreibweise —
 * Es4 / E4 / Eis4 sind getrennte Einträge). Wird im Bibliotheks-Overlay
 * gerendert, funktioniert aber auch eigenständig in jedem Scroll-Container
 * (die Speicherleiste ist sticky zum nächstgelegenen Scroll-Vorfahren).
 */

export type NoteSetEditorProps = {
  clef: ClefKind;
  lockClef?: boolean;
  /** Bei Bearbeitung eines eigenen Sets vorbefüllt. */
  initial?: NoteSetSummary;
  onSaved: (set: NoteSetSummary) => void;
  onCancel: () => void;
};

/** Deutsche Oktavnamen als Zusatzhinweis (Nummern bleiben primär). */
const OCTAVE_NAMES: Record<number, string> = {
  1: "Kontra-Oktave",
  2: "große Oktave",
  3: "kleine Oktave",
  4: "eingestrichene Oktave",
  5: "zweigestrichene Oktave",
  6: "dreigestrichene Oktave",
  7: "viergestrichene Oktave",
};

/** Chip-Optik wie die aktiven Kacheln der Spiele; min. 44 px Touch-Ziel. */
function pitchChipClass(active: boolean): string {
  return cn(
    "min-h-11 min-w-11 rounded-lg border px-2.5 py-2 text-sm font-bold transition-colors active:scale-[0.99]",
    "text-dark dark:text-dark-text",
    active
      ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
      : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35",
  );
}

function clefChipClass(active: boolean): string {
  return cn(
    "rounded-lg border px-3 py-2 text-sm font-bold transition-colors active:scale-[0.99]",
    "text-dark dark:text-dark-text",
    active
      ? "border-primary bg-amber-50/90 dark:bg-amber-950/30"
      : "border-dark-border/50 hover:border-primary/40 dark:border-dark-border dark:hover:border-primary/35",
  );
}

const QUICK_ACTION_CLASS =
  "text-dark dark:text-dark-text-muted border-dark-border/50 dark:border-dark-border hover:border-primary/40 dark:hover:border-primary/35 rounded-lg border px-2 py-1 text-xs font-bold transition-colors";

/** tRPC-Fehlercode defensiv auslesen (ohne any). */
function trpcErrorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  const data = (err as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function saveErrorMessage(err: unknown): string {
  switch (trpcErrorCode(err)) {
    case "UNAUTHORIZED":
      return "Bitte melde dich an, um Sets zu veröffentlichen.";
    case "FORBIDDEN":
      return "Du kannst nur deine eigenen Sets bearbeiten.";
    case "BAD_REQUEST":
      return "Eingaben ungültig — bitte Name und Notenauswahl prüfen.";
    case "NOT_FOUND":
      return "Das Set existiert nicht mehr.";
    default:
      return "Speichern fehlgeschlagen. Bitte versuche es später erneut.";
  }
}

export function NoteSetEditor({
  clef,
  lockClef,
  initial,
  onSaved,
  onCancel,
}: NoteSetEditorProps): React.ReactElement {
  const session = useSession();
  const userId = session.data?.user.id;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [editClef, setEditClef] = useState<ClefKind>(initial?.clef ?? clef);
  const [selected, setSelected] = useState<ReadonlyMap<string, WrittenPitch>>(
    () => {
      const m = new Map<string, WrittenPitch>();
      for (const p of initial?.pitches ?? []) m.set(noteSetPitchKey(p), p);
      return m;
    },
  );
  const [droppedHint, setDroppedHint] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const octaveSections = useMemo(
    () => selectablePitchesByOctave(editClef),
    [editClef],
  );

  const createMutation = api.noteSets.create.useMutation();
  const updateMutation = api.noteSets.update.useMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  // Nur echte Eigentümer-Bearbeitung wird zum Update; sonst neue Veröffentlichung.
  const isUpdate =
    initial != null &&
    initial.creatorId != null &&
    initial.creatorId === userId;

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();

  const blockReason = !session.data
    ? "Zum Veröffentlichen bitte anmelden."
    : trimmedName.length < 3
      ? "Der Name braucht mindestens 3 Zeichen."
      : trimmedName.length > 60
        ? "Der Name darf höchstens 60 Zeichen haben."
        : trimmedDescription.length > 300
          ? "Die Beschreibung darf höchstens 300 Zeichen haben."
          : selected.size < 2
            ? "Bitte mindestens 2 Noten auswählen."
            : selected.size > 96
              ? "Höchstens 96 Noten pro Set."
              : null;

  function handleClefChange(next: ClefKind) {
    if (next === editClef) return;
    // Auswahl behalten, soweit sie in den Bereich des neuen Schlüssels passt.
    const allowed = new Set(
      selectablePitchesByOctave(next).flatMap((s) =>
        s.pitches.map(noteSetPitchKey),
      ),
    );
    const kept = new Map([...selected].filter(([key]) => allowed.has(key)));
    const dropped = selected.size - kept.size;
    setSelected(kept);
    setDroppedHint(
      dropped > 0
        ? dropped === 1
          ? "1 Note lag außerhalb des neuen Schlüsselbereichs und wurde entfernt."
          : `${dropped} Noten lagen außerhalb des neuen Schlüsselbereichs und wurden entfernt.`
        : null,
    );
    setEditClef(next);
  }

  function togglePitch(p: WrittenPitch) {
    const key = noteSetPitchKey(p);
    const next = new Map(selected);
    if (next.has(key)) next.delete(key);
    else next.set(key, p);
    setSelected(next);
  }

  function addNaturals(pitches: WrittenPitch[]) {
    const next = new Map(selected);
    for (const p of pitches) {
      if (p.alter === 0) next.set(noteSetPitchKey(p), p);
    }
    setSelected(next);
  }

  function clearOctave(pitches: WrittenPitch[]) {
    const next = new Map(selected);
    for (const p of pitches) next.delete(noteSetPitchKey(p));
    setSelected(next);
  }

  async function handleSave() {
    if (blockReason || saving) return;
    setSaveError(null);
    const payload = {
      name: trimmedName,
      description: trimmedDescription === "" ? undefined : trimmedDescription,
      clef: editClef,
      pitches: sortPitchesForDisplay([...selected.values()]),
    };
    try {
      const row =
        isUpdate && initial
          ? await updateMutation.mutateAsync({ id: initial.id, ...payload })
          : await createMutation.mutateAsync(payload);
      const summary = toNoteSetSummary(row);
      if (!summary) {
        setSaveError("Unerwartete Antwort vom Server.");
        return;
      }
      onSaved(summary);
    } catch (err) {
      setSaveError(saveErrorMessage(err));
    }
  }

  const selectedCountLabel =
    selected.size === 1
      ? "1 Note ausgewählt"
      : `${selected.size} Noten ausgewählt`;

  return (
    <div className="flex flex-col">
      <div className="space-y-5 p-4 sm:p-6">
        {/* Name */}
        <div>
          <label
            htmlFor="note-set-name"
            className="text-dark dark:text-dark-text mb-1 block text-sm font-bold"
          >
            Name
          </label>
          <input
            id="note-set-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="z. B. Anfängertöne Tenorhorn"
            className="border-dark-border/50 dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none"
          />
          <p className="text-dark dark:text-dark-text-muted mt-1 text-xs">
            3–60 Zeichen
          </p>
        </div>

        {/* Beschreibung */}
        <div>
          <label
            htmlFor="note-set-description"
            className="text-dark dark:text-dark-text mb-1 block text-sm font-bold"
          >
            Beschreibung <span className="font-normal">(optional)</span>
          </label>
          <textarea
            id="note-set-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Wofür ist das Set gedacht?"
            className="border-dark-border/50 dark:border-dark-border dark:bg-dark-background dark:text-dark-text focus:border-primary w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none"
          />
          <p className="text-dark dark:text-dark-text-muted mt-1 text-xs">
            {trimmedDescription.length}/300 Zeichen
          </p>
        </div>

        {/* Schlüssel */}
        {!lockClef && (
          <div>
            <p className="text-dark dark:text-dark-text mb-2 text-sm font-bold">
              Schlüssel
            </p>
            <div
              role="group"
              aria-label="Schlüssel wählen"
              className="flex flex-wrap gap-2"
            >
              {NOTE_SET_CLEFS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleClefChange(c)}
                  aria-pressed={editClef === c}
                  className={clefChipClass(editClef === c)}
                >
                  {CLEF_LABELS[c]}
                </button>
              ))}
            </div>
            {droppedHint && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                {droppedHint}
              </p>
            )}
          </div>
        )}

        {/* Notenauswahl */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-dark dark:text-dark-text text-sm font-bold">
              Noten auswählen
            </p>
            <div className="flex items-center gap-3">
              <span
                className="text-dark dark:text-dark-text-muted text-xs"
                aria-live="polite"
              >
                {selectedCountLabel}
              </span>
              <button
                type="button"
                onClick={() => setSelected(new Map())}
                disabled={selected.size === 0}
                className={cn(QUICK_ACTION_CLASS, "disabled:opacity-50")}
              >
                Alles leeren
              </button>
            </div>
          </div>
          <p className="text-dark dark:text-dark-text-muted mb-3 text-xs leading-snug">
            Jede Schreibweise ist ein eigener Eintrag — Es4, E4 und Eis4 lassen
            sich getrennt wählen. Mindestens 2 Noten.
          </p>

          <div className="space-y-4">
            {octaveSections.map(({ octave, pitches }) => (
              <section
                key={octave}
                className="border-dark-border/50 dark:border-dark-border rounded-lg border p-3"
              >
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-dark dark:text-dark-text text-sm font-bold">
                    Oktave {octave}
                    {OCTAVE_NAMES[octave] && (
                      <span className="text-dark dark:text-dark-text-muted ml-2 text-xs font-normal">
                        ({OCTAVE_NAMES[octave]})
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addNaturals(pitches)}
                      className={QUICK_ACTION_CLASS}
                    >
                      Stammtöne
                    </button>
                    <button
                      type="button"
                      onClick={() => clearOctave(pitches)}
                      className={QUICK_ACTION_CLASS}
                    >
                      Leeren
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pitches.map((p) => {
                    const key = noteSetPitchKey(p);
                    const active = selected.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePitch(p)}
                        aria-pressed={active}
                        className={pitchChipClass(active)}
                      >
                        {pitchLabelWithOctave(p)}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Speicherleiste am unteren Rand des Overlays */}
      <div className="dark:border-dark-border dark:bg-dark-surface sticky bottom-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        {saveError && (
          <p className="mb-2 text-xs font-bold text-red-600 dark:text-red-400">
            {saveError}
          </p>
        )}
        {!session.data && !session.isPending && (
          <p className="text-dark dark:text-dark-text-muted mb-2 text-xs">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-dark dark:text-dark-text-muted text-xs">
            {blockReason ?? selectedCountLabel}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="border-dark-border/50 dark:border-dark-border text-dark dark:text-dark-text hover:border-primary/40 dark:hover:border-primary/35 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={blockReason != null || saving}
              className="bg-primary hover:bg-primary-light dark:hover:bg-primary-dark inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {isUpdate ? "Änderungen speichern" : "Set veröffentlichen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
