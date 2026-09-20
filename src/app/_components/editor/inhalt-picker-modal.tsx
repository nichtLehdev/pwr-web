"use client";
import { useEffect, useMemo, useState } from "react";
import { Button, Input } from "@/app/_components/ui";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { X } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";
import {
  LINK_TARGET_LABELS,
  LINK_TARGET_TYPES,
  type LinkTarget,
  type LinkTargetType,
} from "@/lib/content-link";
import { formatBerlin } from "@/lib/berlin-time";

/** Register-Reihe wie im Medien- und Download-Picker. */
function tabClass(active: boolean) {
  return cn(
    "semi-condensed border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
    active
      ? "border-ink text-ink dark:border-night-text dark:text-night-text"
      : "text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text border-transparent",
  );
}

/** Datumshinweise kommen als ISO-Zeichenkette; alles andere ist schon Text. */
function hintText(target: LinkTarget): string | null {
  if (!target.hint) return null;
  const date = new Date(target.hint);
  return Number.isNaN(date.getTime())
    ? target.hint
    : formatBerlin(date, "datumLangZweistellig");
}

interface InhaltPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Markierter Text im Editor; ohne Auswahl wird der Titel eingefügt. */
  selectedText: string;
  onSelect: (href: string, title: string) => void;
}

export default function InhaltPickerModal({
  isOpen,
  onClose,
  selectedText,
  onSelect,
}: InhaltPickerModalProps) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState<LinkTargetType | "all">("all");
  const [selected, setSelected] = useState<LinkTarget | null>(null);

  // Tippen soll nicht jede Taste zur Abfrage machen.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = api.search.linkTargets.useQuery(
    { query: debounced, type, limit: 8 },
    { enabled: isOpen },
  );

  const targets = useMemo(() => data?.targets ?? [], [data]);

  if (!isOpen) return null;

  /** Der Dialog bleibt montiert; ohne Zurücksetzen stünde beim nächsten Öffnen die alte Suche da. */
  const close = () => {
    setSearch("");
    setDebounced("");
    setType("all");
    setSelected(null);
    onClose();
  };

  const insert = (target: LinkTarget) => {
    onSelect(target.href, target.title);
    close();
  };

  return (
    <ScrollableModal zIndex="z-100">
      <ScrollableModalCard maxW="2xl" className="overflow-hidden">
        <ScrollableModalHeader className="border-rule dark:border-night-rule border-b pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-ink dark:text-night-text text-xl font-semibold">
              Inhalt verlinken
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Schließen"
              className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </ScrollableModalHeader>

        <div className="border-rule dark:border-night-rule flex flex-wrap border-b">
          <button
            type="button"
            onClick={() => setType("all")}
            className={tabClass(type === "all")}
          >
            Alle
          </button>
          {LINK_TARGET_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={tabClass(type === value)}
            >
              {LINK_TARGET_LABELS[value]}
            </button>
          ))}
        </div>

        <ScrollableModalBody className="min-h-0 p-4">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Titel suchen…"
            aria-label="Inhalt suchen"
            autoFocus
          />

          <div className="mt-4" aria-live="polite">
            {isLoading ? (
              <p className="text-dark dark:text-night-muted py-6 text-sm">
                Wird gesucht…
              </p>
            ) : targets.length === 0 ? (
              <p className="text-dark dark:text-night-muted py-6 text-sm">
                {debounced
                  ? `Nichts gefunden für „${debounced}".`
                  : "Keine verlinkbaren Inhalte vorhanden."}
              </p>
            ) : (
              <ul className="divide-rule dark:divide-night-rule divide-y">
                {targets.map((target) => {
                  const active =
                    selected?.id === target.id && selected.type === target.type;
                  const hint = hintText(target);
                  return (
                    <li key={`${target.type}-${target.id}`}>
                      <button
                        type="button"
                        onClick={() => setSelected(target)}
                        onDoubleClick={() => insert(target)}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full items-baseline gap-3 px-2 py-3 text-left transition-colors",
                          active
                            ? "bg-ink text-paper dark:bg-night-text dark:text-night"
                            : "hover:bg-rule/40 dark:hover:bg-night-rule",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">
                            {target.title}
                          </span>
                          {hint && (
                            <span
                              className={cn(
                                "block text-sm",
                                active
                                  ? "opacity-80"
                                  : "text-dark dark:text-night-muted",
                              )}
                            >
                              {hint}
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "semi-condensed shrink-0 text-sm font-semibold",
                            active
                              ? "opacity-80"
                              : "text-dark dark:text-night-muted",
                          )}
                        >
                          {LINK_TARGET_LABELS[target.type]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ScrollableModalBody>

        <ScrollableModalFooter className="flex items-center justify-between gap-3">
          <p className="text-dark dark:text-night-muted min-w-0 text-sm">
            {selected
              ? selectedText
                ? `„${selectedText}" verweist auf ${selected.title}`
                : `Einfügen als „${selected.title}"`
              : "Wähle einen Inhalt aus."}
          </p>
          <div className="flex shrink-0 gap-3">
            <Button type="button" variant="outline" onClick={close}>
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={() => selected && insert(selected)}
              disabled={!selected}
            >
              Verlinken
            </Button>
          </div>
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
