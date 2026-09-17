import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Formularfeld (öffentliche Variante der Dashboard-Inputs): quadratisch,
 * 2px-Tintenrahmen bei Fokus statt Ring, keine Rundung. Gilt für
 * `<input>`, `<textarea>` und natives `<select>` gleichermaßen, damit ein
 * Select in einer Zeile mit Textfeldern nicht abweicht.
 *
 * Neu angelegt für /kontakt und /feedback, weil die Dashboard-Inputs
 * (`ui/select` u.a.) gerundet sind und Klassen nicht zuverlässig
 * überschreiben lassen (`cn` mergt hier nur, es entfernt keine
 * widersprüchlichen Utilities).
 */
export const fieldControlClasses =
  "border-rule dark:border-night-rule bg-paper dark:bg-night text-ink dark:text-night-text placeholder:text-dark dark:placeholder:text-night-muted focus:border-ink dark:focus:border-night-text block min-h-11 w-full border-2 px-3 py-2 text-base transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

/** Label über einem Feld — immer sichtbar (Forms Rule), nie nur Platzhalter. */
export function FieldLabel({
  htmlFor,
  required,
  className,
  children,
  ...props
}: {
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<LabelHTMLAttributes<HTMLLabelElement>, "htmlFor" | "className">) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "semi-condensed text-ink dark:text-night-text mb-2 block text-base font-semibold",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden className="text-primary-ink dark:text-primary">
          {" "}
          *
        </span>
      ) : null}
    </label>
  );
}

/** Hilfstext unter einem Feld, z. B. Zeichenlimit. */
export function FieldHint({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p id={id} className="text-dark dark:text-night-muted mt-2 text-sm">
      {children}
    </p>
  );
}

/** Fehlermeldung am Feld (Forms Rule: Fehler werden am Feld benannt). */
export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400"
    >
      {children}
    </p>
  );
}

/**
 * Kontrollkästchen ohne Rundung: leeres Papier-Quadrat, angehakt füllt es
 * sich mit Tinte. Klickziel über das Label mindestens 44px hoch.
 */
export function Checkbox({
  id,
  checked,
  onChange,
  required,
  className,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3",
        className,
      )}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        required={required}
        className="border-ink checked:bg-ink dark:border-night-text dark:checked:bg-night-text bg-paper dark:bg-night mt-0.5 h-5 w-5 shrink-0 cursor-pointer appearance-none border-2"
      />
      <span className="text-ink dark:text-night-text text-base leading-snug">
        {children}
      </span>
    </label>
  );
}
