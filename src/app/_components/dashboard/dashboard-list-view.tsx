"use client";

import { useStoredPreference } from "@/lib/use-stored-preference";
import { LayoutGridIcon, TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardListView = "cards" | "table";

function isDashboardListView(value: string): value is DashboardListView {
  return value === "cards" || value === "table";
}

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
 * Kartenraster oder Tabelle — die Wahl bleibt pro Liste gespeichert, weil sie
 * zur Arbeitsweise gehört und nicht zur einzelnen Sitzung: wer die Termine
 * lieber als Tabelle pflegt, will sie beim nächsten Aufruf wieder so sehen.
 */
export function useDashboardListView(
  storageKey: string,
  fallback: DashboardListView = "cards",
): [DashboardListView, (next: DashboardListView) => void] {
  return useStoredPreference<DashboardListView>(
    storageKey,
    fallback,
    isDashboardListView,
  );
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
