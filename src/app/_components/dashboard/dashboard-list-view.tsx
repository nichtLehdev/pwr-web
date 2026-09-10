"use client";

import { useCallback, useSyncExternalStore } from "react";
import { LayoutGridIcon, TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardListView = "cards" | "table";

const VIEWS: {
  value: DashboardListView;
  label: string;
  title: string;
  icon: typeof TableIcon;
}[] = [
  {
    value: "cards",
    label: "Karten",
    title: "Kartenansicht",
    icon: LayoutGridIcon,
  },
  {
    value: "table",
    label: "Tabelle",
    title: "Tabellenansicht",
    icon: TableIcon,
  },
];

/**
 * Abonnenten der gespeicherten Ansicht. `localStorage` meldet Änderungen nur an
 * *andere* Tabs, nicht an den schreibenden — die Listen dieses Tabs brauchen
 * deshalb einen eigenen Verteiler.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readView(storageKey: string): DashboardListView | null {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === "cards" || stored === "table" ? stored : null;
  } catch {
    // Privater Modus oder blockierte Site-Daten: dann eben die Vorgabe.
    return null;
  }
}

/**
 * Kartenraster oder Tabelle — die Wahl bleibt pro Liste gespeichert, weil sie
 * zur Arbeitsweise gehört und nicht zur einzelnen Sitzung: wer die Termine
 * lieber als Tabelle pflegt, will sie beim nächsten Aufruf wieder so sehen.
 *
 * `useSyncExternalStore` statt eines Effekts: der Server kennt `localStorage`
 * nicht und liefert immer die Vorgabe, und React weiß dadurch selbst, dass die
 * erste Client-Ausgabe davon abweichen darf.
 */
export function useDashboardListView(
  storageKey: string,
  fallback: DashboardListView = "cards",
): [DashboardListView, (next: DashboardListView) => void] {
  const view = useSyncExternalStore(
    subscribe,
    () => readView(storageKey) ?? fallback,
    () => fallback,
  );

  const update = useCallback(
    (next: DashboardListView) => {
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Nicht speicherbar — dann bleibt es bei der Vorgabe.
      }
      listeners.forEach((listener) => listener());
    },
    [storageKey],
  );

  return [view, update];
}

/** Umschalter zwischen Kartenraster und Tabelle. */
export function DashboardListViewToggle({
  view,
  onChange,
  className,
}: {
  view: DashboardListView;
  onChange: (next: DashboardListView) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Ansicht"
      className={cn(
        "dark:border-dark-border inline-flex shrink-0 rounded-md border border-gray-200/90 p-0.5",
        className,
      )}
    >
      {VIEWS.map((entry) => {
        const Icon = entry.icon;
        const active = view === entry.value;
        return (
          <button
            key={entry.value}
            type="button"
            onClick={() => onChange(entry.value)}
            aria-pressed={active}
            title={entry.title}
            className={cn(
              "inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              active
                ? "dark:bg-dark-surface dark:text-dark-text bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{entry.label}</span>
          </button>
        );
      })}
    </div>
  );
}
