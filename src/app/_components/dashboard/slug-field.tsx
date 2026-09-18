"use client";

import { useId, useState } from "react";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import {
  MAX_SLUG_LENGTH,
  normalizeSlugInput,
  SLUG_PROBLEM_MESSAGES,
  slugProblem,
} from "@/lib/slug";

interface SlugFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** What the server derives from the title when left empty; shown as placeholder. */
  autoSlug: string;
  /** Public path the slug hangs off, e.g. "/termine/event/". */
  basePath: string;
  /** The slug this entry already has — set when editing, absent when creating. */
  currentSlug?: string | null;
  disabled?: boolean;
}

/**
 * URL part of a Termin, Kurs, Beitrag or Chor; empty means derived from the title. Typing here
 * is the exception to the mint-once rule in content-slug.ts, so edits say what renaming costs.
 */
export default function SlugField({
  value,
  onChange,
  autoSlug,
  basePath,
  currentSlug,
  disabled,
}: SlugFieldProps) {
  const fieldId = useId();
  const [touched, setTouched] = useState(false);

  const trimmed = value.trim();
  const problem = trimmed ? slugProblem(trimmed) : null;
  // Only nag once they have moved on; complaining mid-word is noise.
  const showProblem = touched && problem !== null;

  const isRename =
    Boolean(currentSlug) && trimmed !== "" && trimmed !== currentSlug;

  // An empty field means different things in the two modes: when creating, the
  // server derives one; when editing, it keeps the slug the entry already has.
  const fallback = currentSlug ?? autoSlug;
  const effective = trimmed || fallback;

  return (
    <div>
      <Label htmlFor={fieldId}>URL-Slug</Label>
      <Input
        id={fieldId}
        type="text"
        value={value}
        onChange={(e) => onChange(normalizeSlugInput(e.target.value))}
        onBlur={() => {
          setTouched(true);
          // The trailing dash is only there to let the next word be typed.
          const settled = value.replace(/-+$/, "");
          if (settled !== value) onChange(settled);
        }}
        placeholder={fallback || "wird-aus-dem-titel-erzeugt"}
        maxLength={MAX_SLUG_LENGTH}
        error={showProblem}
        disabled={disabled}
        aria-describedby={`${fieldId}-hint`}
        spellCheck={false}
      />

      <div id={`${fieldId}-hint`} className="mt-1 space-y-1">
        {effective ? (
          <p className="text-dark dark:text-night-muted text-xs">
            Adresse:{" "}
            <span className="font-mono break-all">
              {basePath}
              {effective}
            </span>
          </p>
        ) : null}

        {showProblem ? (
          <p className="text-xs text-red-600 dark:text-red-400">
            {SLUG_PROBLEM_MESSAGES[problem]}
          </p>
        ) : (
          <p className="text-dark dark:text-night-muted text-xs">
            {currentSlug
              ? "Leer lassen, um den bisherigen Slug zu behalten."
              : "Leer lassen, um ihn automatisch aus dem Titel zu erzeugen."}
          </p>
        )}

        {isRename ? (
          <p className="text-primary-ink dark:text-primary text-xs">
            Achtung: Die bisherige Adresse{" "}
            <span className="font-mono break-all">
              {basePath}
              {currentSlug}
            </span>{" "}
            funktioniert danach nicht mehr — bereits geteilte Links laufen ins
            Leere.
          </p>
        ) : null}
      </div>
    </div>
  );
}
