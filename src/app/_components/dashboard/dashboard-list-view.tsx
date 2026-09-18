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

/** Kartenraster oder Tabelle, pro Liste dauerhaft gespeichert: die Wahl gehört zur Arbeitsweise. */
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

// Tinte auf Orange im aktiven Zustand, wie beim Sidebar-Pendant — nie Orange
// als Schriftfarbe.
const AKTIV = "on-orange bg-primary text-ink";
const RUHEND =
  "text-dark dark:text-night-muted hover:bg-rule/60 hover:text-ink dark:hover:bg-night-rule dark:hover:text-night-text";

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
        "border-rule dark:border-night-rule inline-flex shrink-0 border p-0.5",
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
              "semi-condensed inline-flex min-h-11 min-w-0 shrink-0 items-center gap-1.5 px-2.5 text-xs font-semibold whitespace-nowrap transition-colors sm:text-sm",
              active ? AKTIV : RUHEND,
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
