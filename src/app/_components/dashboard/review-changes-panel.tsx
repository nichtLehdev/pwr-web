"use client";

import { useState } from "react";
import { HistoryIcon } from "lucide-react";
import { api } from "@/trpc/react";
import { formatBerlin } from "@/lib/berlin-time";
import { diffLines, diffWords, type DiffPart } from "@/lib/text-diff";
import { cn } from "@/lib/utils";

type FieldValue = string | string[] | null;

/** Unchanged lines kept around each change in long texts. */
const CONTEXT_LINES = 2;

const ADDED =
  "bg-green-100 text-green-900 underline decoration-green-600/40 dark:bg-green-900/30 dark:text-green-200";
const REMOVED =
  "bg-red-100 text-red-900 line-through decoration-red-600/60 dark:bg-red-900/30 dark:text-red-200";

function isLongText(value: FieldValue): boolean {
  return (
    typeof value === "string" && (value.includes("\n") || value.length > 160)
  );
}

function Empty() {
  return <span className="text-dark dark:text-night-muted italic">leer</span>;
}

function InlineDiff({ before, after }: { before: string; after: string }) {
  const parts = diffWords(before, after);
  return (
    <p className="text-ink dark:text-night-text break-words whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span
          key={i}
          className={cn(
            part.type === "added" && ADDED,
            part.type === "removed" && REMOVED,
            // A replaced word would otherwise run into its replacement.
            part.type === "removed" && parts[i + 1]?.type === "added" && "mr-1",
          )}
        >
          {part.text}
        </span>
      ))}
    </p>
  );
}

type Line = { type: DiffPart["type"]; text: string };

/** Lines of a line diff; unchanged runs far from a change are folded away. */
function foldLines(parts: DiffPart[]): (Line | { folded: number })[] {
  const lines: Line[] = parts.flatMap((part) =>
    part.text
      .replace(/\n$/, "")
      .split("\n")
      .map((text) => ({ type: part.type, text })),
  );
  const keep = lines.map((line) => line.type !== "same");
  lines.forEach((line, i) => {
    if (line.type === "same") return;
    for (let d = 1; d <= CONTEXT_LINES; d++) {
      if (i - d >= 0) keep[i - d] = true;
      if (i + d < lines.length) keep[i + d] = true;
    }
  });

  const result: (Line | { folded: number })[] = [];
  let folded = 0;
  lines.forEach((line, i) => {
    if (keep[i]) {
      if (folded) result.push({ folded });
      folded = 0;
      result.push(line);
    } else {
      folded++;
    }
  });
  if (folded) result.push({ folded });
  return result;
}

function LineDiff({ before, after }: { before: string; after: string }) {
  return (
    <div className="border-rule dark:border-night-rule overflow-x-auto border font-mono text-sm">
      {foldLines(diffLines(before, after)).map((line, i) =>
        "folded" in line ? (
          <div
            key={i}
            className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted px-3 py-1 text-xs"
          >
            … {line.folded} unveränderte{" "}
            {line.folded === 1 ? "Zeile" : "Zeilen"}
          </div>
        ) : (
          <div
            key={i}
            className={cn(
              "flex gap-2 px-3 whitespace-pre-wrap",
              line.type === "added" &&
                "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200",
              line.type === "removed" &&
                "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
              line.type === "same" && "text-ink dark:text-night-text",
            )}
          >
            <span aria-hidden className="w-3 shrink-0 select-none">
              {line.type === "added" ? "+" : line.type === "removed" ? "−" : ""}
            </span>
            <span className="min-w-0 break-words">{line.text || " "}</span>
          </div>
        ),
      )}
    </div>
  );
}

function ListDiff({ before, after }: { before: string[]; after: string[] }) {
  const removed = before.filter((item) => !after.includes(item));
  const added = after.filter((item) => !before.includes(item));
  if (removed.length === 0 && added.length === 0) {
    return (
      <p className="text-ink dark:text-night-text text-sm">
        Reihenfolge geändert
      </p>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      {removed.map((item) => (
        <li key={`-${item}`} className={cn("flex gap-2 px-2 py-0.5", REMOVED)}>
          <span aria-hidden>−</span>
          <span className="sr-only">Entfernt:</span>
          {item}
        </li>
      ))}
      {added.map((item) => (
        <li
          key={`+${item}`}
          className="flex gap-2 bg-green-100 px-2 py-0.5 text-green-900 dark:bg-green-900/30 dark:text-green-200"
        >
          <span aria-hidden>+</span>
          <span className="sr-only">Neu:</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function FieldDiff({
  before,
  after,
}: {
  before: FieldValue;
  after: FieldValue;
}) {
  if (Array.isArray(before) || Array.isArray(after)) {
    const toList = (value: FieldValue) =>
      Array.isArray(value) ? value : value === null ? [] : [value];
    return <ListDiff before={toList(before)} after={toList(after)} />;
  }
  if (before !== null && after !== null) {
    return isLongText(before) || isLongText(after) ? (
      <LineDiff before={before} after={after} />
    ) : (
      <InlineDiff before={before} after={after} />
    );
  }
  // Set or cleared: there is nothing to line up, show both sides.
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
      <dt className="text-dark dark:text-night-muted">Vorher</dt>
      <dd className="text-ink dark:text-night-text break-words whitespace-pre-wrap">
        {before ?? <Empty />}
      </dd>
      <dt className="text-dark dark:text-night-muted">Jetzt</dt>
      <dd className="text-ink dark:text-night-text break-words whitespace-pre-wrap">
        {after ?? <Empty />}
      </dd>
    </dl>
  );
}

/**
 * Prüfansicht für erneut eingereichte Inhalte: zeigt nur, was sich seit der
 * letzten Freigabe oder Ablehnung geändert hat.
 */
export function ReviewChangesPanel({
  contentType,
  contentId,
}: {
  contentType: "post" | "event" | "course";
  contentId: string;
}) {
  const [open, setOpen] = useState(true);
  const { data, isLoading, isError } = api.reviewChanges.get.useQuery({
    contentType,
    contentId,
  });

  if (isLoading) {
    return (
      <p className="text-dark dark:text-night-muted text-sm">
        Änderungen werden geladen…
      </p>
    );
  }
  if (isError || !data) return null;

  if (!data.snapshot) {
    return (
      <p className="text-dark dark:text-night-muted text-sm">
        Zu diesem Inhalt ist keine frühere Prüfung gespeichert — bitte
        vollständig prüfen.
      </p>
    );
  }

  const { snapshot, changes } = data;
  const reviewed = `${snapshot.status === "REJECTED" ? "Abgelehnt" : "Freigegeben"} am ${formatBerlin(snapshot.reviewedAt, "datumLangUhrzeit")}${snapshot.reviewerName ? ` von ${snapshot.reviewerName}` : ""}`;

  if (changes.length === 0) {
    return (
      <p className="text-dark dark:text-night-muted text-sm">
        Seit der letzten Prüfung wurde nichts geändert ({reviewed}).
      </p>
    );
  }

  return (
    <div className="border-rule dark:border-night-rule border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="hover:bg-rule/25 dark:hover:bg-night-raised flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left"
      >
        <HistoryIcon className="text-ink dark:text-night-text h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="text-ink dark:text-night-text block text-sm font-semibold">
            {changes.length === 1
              ? "1 Feld seit der letzten Prüfung geändert"
              : `${changes.length} Felder seit der letzten Prüfung geändert`}
          </span>
          <span className="text-dark dark:text-night-muted block text-xs">
            {reviewed}
          </span>
        </span>
        <span className="text-dark dark:text-night-muted text-xs">
          {open ? "Ausblenden" : "Anzeigen"}
        </span>
      </button>
      {open && (
        <ul className="border-rule dark:border-night-rule divide-rule dark:divide-night-rule divide-y border-t">
          {changes.map((change) => (
            <li key={change.key} className="space-y-2 px-4 py-3">
              <h3 className="text-dark dark:text-night-muted text-xs font-semibold tracking-wide uppercase">
                {change.label}
              </h3>
              <FieldDiff before={change.before} after={change.after} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
