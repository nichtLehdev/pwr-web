"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size" | "multiple"
> & {
  error?: boolean;
  /**
   * `md` matches the shared `Input` (16px text, 44px tall) so a select can sit
   * in a row of text inputs without looking shorter. Below 16px iOS Safari also
   * zooms the page in when the control is focused.
   */
  fieldSize?: "sm" | "md";
  children: React.ReactNode;
};

type ParsedOption = {
  value: string;
  label: string;
  disabled?: boolean;
  /**
   * Text pinned to the right of the label (e.g. a price), set via
   * `data-trailing` on the `<option>`. It never truncates, so it stays readable
   * on narrow screens where the label itself has to be cut off.
   */
  trailing?: string;
};

function optionTextContent(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(optionTextContent).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return optionTextContent(props.children);
  }
  return "";
}

function parseOptions(children: React.ReactNode): ParsedOption[] {
  const out: ParsedOption[] = [];

  const walk = (nodes: React.ReactNode, groupLabel?: string) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;

      if (child.type === "option") {
        const props =
          child.props as React.OptionHTMLAttributes<HTMLOptionElement> & {
            "data-trailing"?: string;
          };
        const textLabel =
          optionTextContent(props.children).trim() || String(props.value ?? "");
        const displayLabel = groupLabel
          ? `${groupLabel} · ${textLabel}`
          : textLabel;
        out.push({
          value: props.value != null ? String(props.value) : "",
          label: displayLabel,
          disabled: props.disabled,
          trailing: props["data-trailing"],
        });
      } else if (child.type === "optgroup") {
        const og =
          child.props as React.OptgroupHTMLAttributes<HTMLOptGroupElement> & {
            children?: React.ReactNode;
          };
        const gl =
          og.label != null && String(og.label).trim() !== ""
            ? String(og.label).trim()
            : undefined;
        walk(og.children, gl);
      }
    });
  };

  walk(children);
  return out;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      error,
      fieldSize = "sm",
      children,
      value: valueProp,
      defaultValue,
      onChange,
      disabled,
      id,
      name,
      required,
      autoFocus,
      "aria-label": ariaLabel,
      "aria-invalid": ariaInvalid,
      "aria-describedby": ariaDescribedBy,
      "aria-labelledby": ariaLabelledBy,
    },
    ref,
  ) => {
    const options = React.useMemo(() => parseOptions(children), [children]);
    const listId = React.useId();
    const generatedId = React.useId();
    const buttonId = id ?? generatedId;

    const [open, setOpen] = React.useState(false);
    const [highlight, setHighlight] = React.useState(0);
    const [internalValue, setInternalValue] = React.useState(() =>
      defaultValue != null ? String(defaultValue) : "",
    );

    const isControlled = valueProp !== undefined;
    const value = isControlled ? String(valueProp ?? "") : internalValue;

    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const listRef = React.useRef<HTMLUListElement>(null);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    const setButtonRef = React.useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLButtonElement | null>).current =
            node;
        }
      },
      [ref],
    );

    const selectedOption = options.find((o) => o.value === value);
    const displayText =
      selectedOption?.label ?? (value === "" ? "Auswählen…" : value);
    const mutedTrigger = value === "";

    const commit = React.useCallback(
      (next: string) => {
        if (!isControlled) {
          setInternalValue(next);
        }
        const synthetic = {
          target: { value: next },
          currentTarget: { value: next },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange?.(synthetic);
      },
      [isControlled, onChange],
    );

    const close = React.useCallback(() => {
      setOpen(false);
    }, []);

    React.useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        const el = wrapperRef.current;
        if (el && !el.contains(e.target as Node)) {
          close();
        }
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open, close]);

    React.useEffect(() => {
      if (!open) return;
      // Beim Öffnen steht die Markierung auf der Auswahl — auch wenn sie
      // inzwischen gesperrt ist, damit man hört, wo man steht. Ohne Auswahl
      // auf dem ersten wählbaren Eintrag statt auf einem gesperrten.
      const selectedIndex = options.findIndex((o) => o.value === value);
      const firstEnabled = options.findIndex((o) => !o.disabled);
      setHighlight(
        selectedIndex >= 0 ? selectedIndex : Math.max(0, firstEnabled),
      );
    }, [open, options, value]);

    React.useEffect(() => {
      if (!open || !listRef.current) return;
      const el = listRef.current.querySelector(`[data-index="${highlight}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }, [highlight, open]);

    /**
     * Der nächste wählbare Eintrag in Pfeilrichtung. Gibt es keinen mehr,
     * bleibt die Markierung stehen — vorher blieb sie am Rand auf einem
     * gesperrten Eintrag hängen, den Enter dann stumm nicht übernahm.
     */
    const stepHighlight = (delta: 1 | -1) =>
      setHighlight((h) => {
        for (let i = h + delta; i >= 0 && i < options.length; i += delta) {
          if (!options[i]?.disabled) return i;
        }
        return h;
      });

    const onKeyDownButton = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        stepHighlight(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Enter" || e.key === " ") {
        if (open) {
          e.preventDefault();
          const opt = options[highlight];
          if (opt && !opt.disabled) {
            commit(opt.value);
            close();
          }
        }
      } else if (e.key === "Escape" && open) {
        // Escape schließt nur die Liste. Weitergereicht schloss es auch das
        // umgebende Fenster (Teilnehmer-Fenster) — mitsamt allen Eingaben.
        e.preventDefault();
        e.stopPropagation();
        close();
        buttonRef.current?.focus();
      }
    };

    const onKeyDownList = (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        stepHighlight(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        buttonRef.current?.focus();
      }
    };

    const optionId = (index: number) => `${listId}-option-${index}`;

    // `role="combobox"` verbietet „Name aus Inhalt": Der sichtbare Text im
    // Auslöser zählt nicht als Name. Ohne aria-label, aria-labelledby oder ein
    // `id`, auf das ein <label for> zeigt, bleibt der Knopf namenlos — axe meldet
    // das als `button-name`, WCAG 4.1.2 Stufe A.
    //
    // Der Platzhalter (die Option mit leerem Wert, „Alle Bezirke", „Bitte
    // wählen") ist der einzige Text, der den Zweck benennt und im Gegensatz zu
    // `displayText` nicht mit der Auswahl wechselt — ein Name, der sich beim
    // Auswählen ändert, wäre für Sprachsteuerung unbrauchbar.
    //
    // Gibt der Aufrufer ein `id` mit, hat er die Kopplung über <label for>
    // selbst in der Hand; ein aria-label würde dessen sichtbaren Text
    // überschreiben und „sprich, was du siehst" brechen. Deshalb hier nichts.
    const platzhalterLabel = options.find((o) => o.value === "")?.label;
    const hatEigenenNamen = Boolean(ariaLabel ?? ariaLabelledBy ?? id);
    const ariaLabelEffektiv = hatEigenenNamen ? ariaLabel : platzhalterLabel;

    const triggerClasses = cn(
      "border-ink bg-paper text-ink flex w-full min-w-0 items-center justify-between gap-2 border px-3 py-2 text-left transition-colors",
      // Ohne eigene Schriftgröße, wie `Input`: Mit `text-sm` war der Auslöser
      // 38px hoch und stand neben 42px hohen Eingabefeldern sichtbar zu klein
      // (gemeldet am Förderverein-Formular). Wer ein kompaktes Feld will,
      // gibt `text-sm` über `className` mit, wie die Filterleisten es tun.
      fieldSize === "md" ? "h-11 text-base sm:px-4" : undefined,
      "dark:border-night-text dark:bg-night dark:text-night-text",
      "hover:bg-rule/30 dark:hover:bg-night-raised",
      disabled &&
        "hover:bg-paper dark:hover:bg-night cursor-not-allowed opacity-50",
      error && "border-red-600 dark:border-red-400",
      // Geoeffnet: zweite Linie statt Farbwechsel — der Zustand soll sich
      // abheben, ohne dass Orange zur Rahmenfarbe wird.
      open && "border-2",
      className,
    );

    return (
      <div ref={wrapperRef} className="relative w-full">
        {name != null && name !== "" && (
          <input type="hidden" name={name} value={value} readOnly />
        )}
        <button
          id={buttonId}
          ref={setButtonRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          // Der Fokus bleibt auf dem Knopf; welcher Eintrag gerade markiert
          // ist, erfahren Vorlesegeräte nur hierüber.
          aria-activedescendant={
            open && options[highlight] ? optionId(highlight) : undefined
          }
          aria-required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-labelledby={ariaLabelledBy}
          aria-label={ariaLabelEffektiv}
          disabled={disabled}
          autoFocus={autoFocus}
          className={triggerClasses}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={onKeyDownButton}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              mutedTrigger && "text-dark dark:text-night-muted",
            )}
          >
            {displayText}
          </span>
          {selectedOption?.trailing ? (
            <span className="text-ink dark:text-night-text shrink-0 font-medium">
              {selectedOption.trailing}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "text-dark dark:text-night-muted h-4 w-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {open && !disabled && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onKeyDownList}
            className="border-ink bg-paper dark:border-night-text dark:bg-night-raised absolute z-50 mt-1 max-h-60 w-full overflow-auto border py-1"
          >
            {options.map((opt, index) => {
              const selected = opt.value === value;
              return (
                <li
                  key={`${index}-${opt.value}`}
                  id={optionId(index)}
                  role="option"
                  aria-selected={selected}
                  // Gesperrt auch für Vorlesegeräte: vorher nur ausgegraut und
                  // als ganz normale Auswahl vorgelesen, die dann stumm nicht
                  // übernommen wurde.
                  aria-disabled={opt.disabled || undefined}
                  data-index={index}
                  className={cn(
                    "text-ink dark:text-night-text flex items-start gap-2 px-3",
                    // md: 44px hohe Zeilen, dieselbe Trefferfläche wie das Feld.
                    fieldSize === "md" ? "py-2.5 text-base" : "py-2",
                    index === highlight && "bg-rule/60 dark:bg-night-rule",
                    // Nur eine der beiden Zeigerformen: nebeneinander entschied
                    // die Reihenfolge im Stylesheet, und es blieb der Zeiger.
                    opt.disabled
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer",
                    selected && "font-medium",
                  )}
                  onMouseEnter={() => !opt.disabled && setHighlight(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (opt.disabled) return;
                    commit(opt.value);
                    close();
                    buttonRef.current?.focus();
                  }}
                >
                  <span
                    className={cn(
                      "min-w-0 flex-1",
                      // A label paired with a trailing value is meant to be read
                      // in full — wrap it instead of hiding the end of it.
                      opt.trailing ? "break-words" : "truncate",
                    )}
                  >
                    {opt.label}
                  </span>
                  {opt.trailing ? (
                    <span className="text-ink dark:text-night-text shrink-0 font-medium">
                      {opt.trailing}
                    </span>
                  ) : null}
                  {selected && (
                    <Check
                      className="text-ink dark:text-night-text mt-1 h-4 w-4 shrink-0"
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export { Select };
