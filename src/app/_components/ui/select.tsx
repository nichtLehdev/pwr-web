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
      const idx = Math.max(
        0,
        options.findIndex((o) => o.value === value),
      );
      setHighlight(idx);
    }, [open, options, value]);

    React.useEffect(() => {
      if (!open || !listRef.current) return;
      const el = listRef.current.querySelector(`[data-index="${highlight}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }, [highlight, open]);

    const onKeyDownButton = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!open) {
          setOpen(true);
          return;
        }
        const delta = e.key === "ArrowDown" ? 1 : -1;
        setHighlight((h) => {
          let next = h + delta;
          next = Math.max(0, Math.min(options.length - 1, next));
          let guard = 0;
          while (options[next]?.disabled && guard < options.length) {
            next += delta;
            next = Math.max(0, Math.min(options.length - 1, next));
            guard += 1;
          }
          return next;
        });
      } else if (e.key === "Enter" || e.key === " ") {
        if (open) {
          e.preventDefault();
          const opt = options[highlight];
          if (opt && !opt.disabled) {
            commit(opt.value);
            close();
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
        buttonRef.current?.focus();
      }
    };

    const onKeyDownList = (e: React.KeyboardEvent<HTMLUListElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(options.length - 1, h + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
        buttonRef.current?.focus();
      }
    };

    const triggerClasses = cn(
      "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-gray-900 shadow-sm transition-colors",
      fieldSize === "md" ? "h-11 text-base sm:px-4" : "text-sm",
      "focus:border-primary focus:ring-primary focus:ring-1 focus:outline-none",
      "dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text",
      "hover:bg-gray-50 dark:hover:bg-dark-background",
      disabled &&
        "cursor-not-allowed opacity-50 hover:bg-white dark:hover:bg-dark-background-secondary",
      error &&
        "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500",
      open && "border-primary ring-primary ring-1 dark:border-primary",
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
          aria-required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-labelledby={ariaLabelledBy}
          disabled={disabled}
          autoFocus={autoFocus}
          className={triggerClasses}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={onKeyDownButton}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              mutedTrigger && "text-gray-500 dark:text-gray-400",
            )}
          >
            {displayText}
          </span>
          {selectedOption?.trailing ? (
            <span className="shrink-0 font-medium text-gray-700 dark:text-gray-300">
              {selectedOption.trailing}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-gray-400",
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
            className="dark:border-dark-border dark:bg-dark-surface absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:shadow-black/40"
          >
            {options.map((opt, index) => {
              const selected = opt.value === value;
              return (
                <li
                  key={`${index}-${opt.value}`}
                  role="option"
                  aria-selected={selected}
                  data-index={index}
                  className={cn(
                    "dark:text-dark-text flex cursor-pointer items-start gap-2 px-3 py-2 text-gray-900",
                    fieldSize === "md" ? "text-base" : "text-sm",
                    index === highlight && "bg-primary/10 dark:bg-primary/15",
                    opt.disabled && "cursor-not-allowed opacity-40",
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
                    <span className="shrink-0 font-medium text-gray-700 dark:text-gray-300">
                      {opt.trailing}
                    </span>
                  ) : null}
                  {selected && (
                    <Check
                      className="text-primary mt-1 h-4 w-4 shrink-0"
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
