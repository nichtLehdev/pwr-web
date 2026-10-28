"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Trash2, X } from "lucide-react";
import { Button, Input, Label } from "@/app/_components/ui";

export interface LinkPopoverState {
  /** Bildschirmkoordinaten unter dem Link bzw. der Auswahl. */
  x: number;
  y: number;
  /** Bereich im Dokument, auf den sich Text und Link beziehen. */
  from: number;
  to: number;
  text: string;
  href: string;
  /** Bestehender Link: dann gibt es „Entfernen“ und „Öffnen“. */
  editing: boolean;
}

/**
 * Ohne Schema würde `beispiel.de` als relativer Pfad gespeichert.
 * Interne Pfade, Anker und Adressen mit Schema bleiben, wie sie sind.
 */
export function normalizeHref(raw: string): string {
  const href = raw.trim();
  if (!href) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || /^[/#?]/.test(href)) return href;
  if (/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(href)) return `mailto:${href}`;
  return `https://${href}`;
}

export default function LinkPopover({
  state,
  onApply,
  onRemove,
  onClose,
}: {
  state: LinkPopoverState;
  onApply: (text: string, href: string) => void;
  onRemove: () => void;
  /** `refocus`: per Escape oder X geschlossen, der Cursor gehört zurück in den Editor. */
  onClose: (refocus: boolean) => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [text, setText] = useState(state.text);
  const [href, setHref] = useState(state.href);

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        onClose(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(true);
    };
    // Fest positioniert: Scrollt der Editor, stünde das Fenster neben dem Link.
    const handleScroll = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        onClose(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  // Am Rand des Fensters nach innen bzw. über den Link klappen.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(
      margin,
      Math.min(state.x, window.innerWidth - rect.width - margin),
    );
    const top =
      state.y + rect.height + margin > window.innerHeight
        ? Math.max(margin, state.y - rect.height - 32)
        : state.y;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }, [state.x, state.y]);

  const normalized = normalizeHref(href);

  // Ins `body`: Der Editor steht selbst in einem Formular, und sein Rahmen
  // scrollt — verschachtelt würde das Fenster abgeschnitten.
  return createPortal(
    <form
      ref={ref}
      role="dialog"
      aria-label={state.editing ? "Link bearbeiten" : "Link einfügen"}
      className="border-ink bg-paper dark:border-night-text dark:bg-night-raised fixed z-[200] flex w-80 max-w-[calc(100vw-1rem)] flex-col gap-3 border-2 p-3"
      style={{ left: state.x, top: state.y }}
      onSubmit={(e) => {
        // Der Editor steht in Beitragsformularen; Enter darf sie nicht absenden.
        e.preventDefault();
        e.stopPropagation();
        onApply(text, normalized);
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-dark dark:text-night-muted semi-condensed text-xs font-semibold tracking-wide uppercase">
          {state.editing ? "Link bearbeiten" : "Link einfügen"}
        </span>
        <button
          type="button"
          onClick={() => onClose(true)}
          aria-label="Schließen"
          className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-1 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <Label htmlFor="link-popover-text">Text</Label>
        <Input
          id="link-popover-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Angezeigter Text"
          className="py-1 text-sm"
        />
      </div>

      <div>
        <Label htmlFor="link-popover-url">URL</Label>
        <Input
          id="link-popover-url"
          type="text"
          inputMode="url"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="https://…"
          className="py-1 text-sm"
          autoFocus
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!normalized}>
          Übernehmen
        </Button>
        {state.editing && (
          <>
            <a
              href={normalized || state.href}
              target="_blank"
              rel="noopener noreferrer"
              title="Link in neuem Tab öffnen"
              aria-label="Link in neuem Tab öffnen"
              className="text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule p-2 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onRemove}
              title="Link entfernen"
              aria-label="Link entfernen"
              className="hover:bg-rule/60 dark:hover:bg-night-rule ml-auto p-2 text-red-700 transition-colors dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </form>,
    document.body,
  );
}
