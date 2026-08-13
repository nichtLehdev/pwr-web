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
  /**
   * What the server derives from the title when the field is left empty.
   * Shown as the placeholder so the URL is visible before anyone types.
   */
  autoSlug: string;
  /** Public path the slug hangs off, e.g. "/termine/event/". */
  basePath: string;
  /** The slug this entry already has — set when editing, absent when creating. */
  currentSlug?: string | null;
  disabled?: boolean;
}

/**
 * The URL part of a Termin, Kurs, Beitrag or Chor.
 *
 * Optional everywhere: left empty it stays derived from the title, which is
 * what most authors want. Typing in it is the deliberate act that the
 * mint-once rule in content-slug.ts carves out — so when it is an edit, the
 * field says plainly what renaming costs.
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
          <p className="dark:text-dark-muted text-xs text-gray-500">
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
          <p className="dark:text-dark-muted text-xs text-gray-500">
            {currentSlug
              ? "Leer lassen, um den bisherigen Slug zu behalten."
              : "Leer lassen, um ihn automatisch aus dem Titel zu erzeugen."}
          </p>
        )}

        {isRename ? (
          <p className="text-xs text-amber-700 dark:text-amber-500">
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
