"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { ArtikelBild } from "./bild-erweiterung";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TurndownService from "turndown";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { marked } from "marked";
import MediaPickerModal from "./media-picker-modal";
import DownloadPickerModal from "./download-picker-modal";
import { Button, Input } from "@/app/_components/ui";
import { cn } from "@/lib/utils";
import "@/styles/article-content.css";
import "@/styles/beschreibung.css";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  Table as TableIcon,
  Undo,
  Redo,
  X,
  Plus,
  Rows3,
  Columns3,
  Merge,
  Split,
  Trash2,
} from "lucide-react";

/**
 * `voll`: Beitragseditor mit Bildern, Downloads, Tabellen, Ausrichtung.
 * `beschreibung`: Termine/Kurse unter einer h2 — Überschriften ab h3, ohne Bilder, Downloads, Tabellen, Ausrichtung.
 */
export type RichTextVariant = "voll" | "beschreibung";

interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  variant?: RichTextVariant;
  /** Die Fläche ist kein `input`, ein `label` mit `htmlFor` greift nicht — sonst hat sie keinen Namen. */
  ariaLabel?: string;
  /** Nur die Ansage „Erforderlich“; geprüft wird beim Absenden im Formular. */
  ariaRequired?: boolean;
  /** Lets surrounding UI insert at the cursor (e.g. mail placeholder chips). Null while initializing. */
  onEditorReady?: (editor: Editor | null) => void;
}

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndownService.addRule("underline", {
  filter: ["u"],
  replacement: function (content) {
    return `<u>${content}</u>`;
  },
});

turndownService.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement: function (content) {
    return `~~${content}~~`;
  },
});

/**
 * Bilder mit Breiten- oder Ausrichtungsklasse als rohes HTML: gespeichert wird Markdown,
 * das keine Klassen kennt; `marked` und der Filter lassen `class` durch.
 * Bilder ohne Klasse bleiben bewusst Markdown, damit sich am Bestand nichts ändert.
 */
turndownService.addRule("bildMitKlasse", {
  filter: (node) =>
    node.nodeName === "IMG" &&
    /(^|\s)bild-/.test((node as HTMLElement).getAttribute("class") ?? ""),
  replacement: function (_content, node) {
    const el = node as HTMLElement;
    const wert = (name: string) =>
      (el.getAttribute(name) ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Nur das Vokabular übernehmen: Die Knotenansicht hängt bei Anwahl
    // zusätzlich Umrandungsklassen an, die nichts im Beitrag zu suchen haben.
    const klassen = (el.getAttribute("class") ?? "")
      .split(/\s+/)
      .filter((k) => k.startsWith("bild-"))
      .join(" ");
    return `\n\n<img src="${wert("src")}" alt="${wert("alt")}" class="${klassen}">\n\n`;
  },
});

turndownService.addRule("tableCell", {
  filter: ["th", "td"],
  replacement: function (content) {
    return " " + content.trim().replace(/\n/g, " ") + " |";
  },
});

turndownService.addRule("tableRow", {
  filter: "tr",
  replacement: function (content, node) {
    const cells = content.trim();
    const element = node as HTMLElement;
    const cellCount = element.querySelectorAll("th, td").length;

    const parent = element.parentNode as HTMLElement | null;
    const table = element.closest("table");
    const isInThead = parent && parent.tagName === "THEAD";
    const hasThCells = element.querySelectorAll("th").length > 0;

    const allRows = table?.querySelectorAll("tr");
    const isFirstRowOfTable = allRows && allRows[0] === element;

    const isHeader = isInThead || hasThCells || isFirstRowOfTable;

    let result = "|" + cells + "\n";
    if (isHeader) {
      result += "|" + " --- |".repeat(cellCount) + "\n";
    }
    return result;
  },
});

turndownService.addRule("table", {
  filter: "table",
  replacement: function (content) {
    return "\n\n" + content + "\n\n";
  },
});

turndownService.addRule("thead", {
  filter: "thead",
  replacement: function (content) {
    return content;
  },
});

turndownService.addRule("tbody", {
  filter: "tbody",
  replacement: function (content) {
    return content;
  },
});

marked.use({
  gfm: true,
  breaks: true,
});

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-2 transition-colors",
        isActive
          ? "bg-primary text-ink"
          : "text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="bg-rule dark:bg-night-rule mx-1 h-6 w-px" />;
}

function ContextMenuItem({
  onClick,
  disabled = false,
  destructive = false,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : destructive
            ? "text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            : "text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {children}
    </button>
  );
}

function ContextMenuSeparator() {
  return <div className="bg-rule dark:bg-night-rule my-1 h-px" />;
}

function TableContextMenu({
  editor,
  position,
  onClose,
}: {
  editor: Editor;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menuRef.current.style.left = `${position.x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menuRef.current.style.top = `${position.y - rect.height}px`;
    }
  }, [position]);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="border-ink bg-paper dark:border-night-text dark:bg-night-raised fixed z-[200] min-w-52 border-2 p-1"
      style={{ left: position.x, top: position.y }}
    >
      <div className="text-dark dark:text-night-muted semi-condensed px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
        Zeile
      </div>
      <ContextMenuItem
        icon={Rows3}
        onClick={() => run(() => editor.chain().focus().addRowBefore().run())}
      >
        Zeile darüber einfügen
      </ContextMenuItem>
      <ContextMenuItem
        icon={Rows3}
        onClick={() => run(() => editor.chain().focus().addRowAfter().run())}
      >
        Zeile darunter einfügen
      </ContextMenuItem>
      <ContextMenuItem
        icon={Trash2}
        destructive
        onClick={() => run(() => editor.chain().focus().deleteRow().run())}
      >
        Zeile löschen
      </ContextMenuItem>

      <ContextMenuSeparator />

      <div className="text-dark dark:text-night-muted semi-condensed px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
        Spalte
      </div>
      <ContextMenuItem
        icon={Columns3}
        onClick={() =>
          run(() => editor.chain().focus().addColumnBefore().run())
        }
      >
        Spalte links einfügen
      </ContextMenuItem>
      <ContextMenuItem
        icon={Columns3}
        onClick={() => run(() => editor.chain().focus().addColumnAfter().run())}
      >
        Spalte rechts einfügen
      </ContextMenuItem>
      <ContextMenuItem
        icon={Trash2}
        destructive
        onClick={() => run(() => editor.chain().focus().deleteColumn().run())}
      >
        Spalte löschen
      </ContextMenuItem>

      <ContextMenuSeparator />

      <div className="text-dark dark:text-night-muted semi-condensed px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
        Zelle
      </div>
      <ContextMenuItem
        icon={Merge}
        disabled={!editor.can().mergeCells()}
        onClick={() => run(() => editor.chain().focus().mergeCells().run())}
      >
        Zellen verbinden
      </ContextMenuItem>
      <ContextMenuItem
        icon={Split}
        disabled={!editor.can().splitCell()}
        onClick={() => run(() => editor.chain().focus().splitCell().run())}
      >
        Zelle teilen
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() =>
          run(() => editor.chain().focus().toggleHeaderRow().run())
        }
      >
        Kopfzeile umschalten
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem
        icon={Trash2}
        destructive
        onClick={() => run(() => editor.chain().focus().deleteTable().run())}
      >
        Tabelle löschen
      </ContextMenuItem>
    </div>
  );
}

function Toolbar({
  editor,
  onOpenMediaPicker,
  onOpenDownloadPicker,
  variant = "voll",
}: {
  editor: Editor | null;
  onOpenMediaPicker: () => void;
  onOpenDownloadPicker: () => void;
  variant?: RichTextVariant;
}) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showTableMenu, setShowTableMenu] = useState(false);

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => {
      forceUpdate((n) => n + 1);
    };

    editor.on("transaction", updateHandler);
    editor.on("selectionUpdate", updateHandler);

    return () => {
      editor.off("transaction", updateHandler);
      editor.off("selectionUpdate", updateHandler);
    };
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl })
        .run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const voll = variant === "voll";
  // Die Beschreibung steht unter einem h2 der Seite; ihre erste Stufe ist
  // deshalb h3. Im Beitrag ist der Titel das h1, dort beginnt sie bei h2.
  const kopfStufen = voll ? [2, 3, 4] : [3, 4];

  const isMarkActive = (markName: string) => {
    if (!editor) return false;

    if (editor.isActive(markName)) return true;

    const storedMarks = editor.state.storedMarks;
    if (storedMarks) {
      return storedMarks.some((mark) => mark.type.name === markName);
    }

    return false;
  };

  if (!editor) return null;

  return (
    <div className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b p-2 backdrop-blur-sm">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={isMarkActive("bold")}
        title="Fett (Strg+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={isMarkActive("italic")}
        title="Kursiv (Strg+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      {voll && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={isMarkActive("underline")}
            title="Unterstrichen (Strg+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={isMarkActive("strike")}
            title="Durchgestrichen"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
        </>
      )}

      <ToolbarSeparator />

      {/* Der Knopf zählt ab 1, die Stufe richtet sich nach `kopfStufen`. */}
      {kopfStufen.map((level, index) => (
        <ToolbarButton
          key={level}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: level as 2 | 3 | 4 })
              .run()
          }
          isActive={editor.isActive("heading", { level })}
          title={`Überschrift ${index + 1}`}
        >
          <span className="text-sm font-bold">H{index + 1}</span>
        </ToolbarButton>
      ))}

      <ToolbarSeparator />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Aufzählung"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Nummerierung"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      {voll && (
        <>
          <ToolbarSeparator />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            isActive={
              editor.isActive({ textAlign: "left" }) ||
              (!editor.isActive({ textAlign: "center" }) &&
                !editor.isActive({ textAlign: "right" }) &&
                !editor.isActive({ textAlign: "justify" }))
            }
            title="Linksbündig"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            isActive={editor.isActive({ textAlign: "center" })}
            title="Zentriert"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            isActive={editor.isActive({ textAlign: "right" })}
            title="Rechtsbündig"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarSeparator />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            title="Zitat"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontale Linie"
          >
            <div className="h-4 w-4 border-t-2 border-current" />
          </ToolbarButton>
        </>
      )}

      <ToolbarSeparator />

      <div className="relative">
        <ToolbarButton
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
            } else {
              setShowLinkInput(!showLinkInput);
            }
          }}
          isActive={editor.isActive("link")}
          title="Link einfügen"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        {showLinkInput && (
          <div className="border-ink bg-paper dark:border-night-text dark:bg-night-raised absolute top-full right-0 z-50 mt-1 flex items-center gap-2 border-2 p-2">
            <Input
              type="url"
              placeholder="https://…"
              aria-label="Link-URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setLink()}
              className="w-64 py-1 text-sm"
              autoFocus
            />
            <Button type="button" onClick={setLink} size="sm">
              OK
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl("");
              }}
              aria-label="Abbrechen"
              className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text px-2 py-1 text-sm transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {voll && (
        <ToolbarButton onClick={onOpenMediaPicker} title="Bild einfügen">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
      )}

      {voll && (
        <ToolbarButton onClick={onOpenDownloadPicker} title="Download einfügen">
          <FileText className="h-4 w-4" />
        </ToolbarButton>
      )}

      {voll && (
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowTableMenu(!showTableMenu)}
            isActive={editor.isActive("table")}
            title="Tabelle"
          >
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          {showTableMenu && (
            <div className="border-ink bg-paper dark:border-night-text dark:bg-night-raised absolute top-full left-0 z-50 mt-1 min-w-48 border-2 p-1">
              <button
                type="button"
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run();
                  setShowTableMenu(false);
                }}
                disabled={editor.isActive("table")}
                className="text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Tabelle einfügen (3×3)
              </button>
              {editor.isActive("table") && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      setShowTableMenu(false);
                    }}
                    className="hover:bg-rule/60 dark:hover:bg-night-rule flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 transition-colors dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    Tabelle löschen
                  </button>
                  <div className="bg-rule dark:bg-night-rule my-1 h-px" />
                  <p className="text-dark dark:text-night-muted px-3 py-1.5 text-xs">
                    Rechtsklick auf Zelle für weitere Optionen
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <ToolbarSeparator />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Rückgängig (Strg+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Wiederholen (Strg+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Schreiben Sie hier Ihren Text...",
  className = "",
  onEditorReady,
  variant = "voll",
  ariaLabel,
  ariaRequired,
}: RichTextEditorProps) {
  const voll = variant === "voll";
  const isInitialized = useRef(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showDownloadPicker, setShowDownloadPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const initialHtml = content ? String(marked.parse(content)) : "";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Beschreibungen stehen unter der h2 ihres Abschnitts (siehe
        // `RichTextVariant`); h2 wäre dort eine zweite Seitenüberschrift.
        heading: {
          levels: voll ? [2, 3, 4] : [3, 4],
        },
      }),
      // Ohne eigene Klasse: Links gestaltet article-content.css. Eine Klasse hier
      // würde in jeden gespeicherten Beitrag geschrieben.
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      // Nur im Beitrag: ohne diese Erweiterungen bringt auch eingefügter Text
      // Bilder, Ausrichtung, Unterstreichung und Tabellen nicht in eine Beschreibung.
      ...(voll
        ? [
            // Breite und Ausrichtung als Klassen, mit einrastenden Ziehgriffen.
            ArtikelBild,
            Underline,
            TextAlign.configure({
              types: ["heading", "paragraph"],
              defaultAlignment: "left",
            }),
            // Gestaltung steht im Stylesheet; `resizable` ist Verhalten.
            Table.configure({
              resizable: true,
            }),
            TableRow,
            // Ohne eigene Klassen: sie würden in jeden Beitrag geschrieben;
            // Tabellenlinien bestimmt article-content.css.
            TableCell,
            TableHeader,
          ]
        : []),
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Dieselbe Satzgestaltung wie in der Anzeige.
        class: voll
          ? "article-content p-4 min-h-[300px] focus:outline-none"
          : "beschreibung p-4 min-h-[180px] focus:outline-none",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        ...(ariaRequired ? { "aria-required": "true" } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      onChange(markdown);
    },
  });

  useEffect(() => {
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  const handleImageSelect = useCallback(
    (url: string, alt: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url, alt }).run();
      }
      setShowMediaPicker(false);
    },
    [editor],
  );

  const handleDownloadSelect = useCallback(
    (title: string, url: string, fileType: string) => {
      if (editor) {
        editor
          .chain()
          .focus()
          .insertContent(
            `<a href="${url}" target="_blank" rel="noopener noreferrer">📥 ${title} (${fileType})</a>`,
          )
          .run();
      }
      setShowDownloadPicker(false);
    },
    [editor],
  );

  const handleContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!editor) return;

      const target = e.target as HTMLElement;
      const isInTable = !!target.closest("table");

      if (isInTable && editor.isActive("table")) {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      } else {
        setContextMenu(null);
      }
    },
    [editor],
  );

  useEffect(() => {
    if (editor && content && !isInitialized.current) {
      const newHtml = String(marked.parse(content));
      if (newHtml !== editor.getHTML()) {
        editor.commands.setContent(newHtml);
      }
      isInitialized.current = true;
    }
  }, [editor, content]);

  return (
    <>
      <div
        className={cn(
          "border-rule dark:border-night-rule dark:bg-night-raised bg-paper relative flex flex-col border",
          className,
        )}
        style={{ maxHeight: "600px", overflowY: "auto" }}
      >
        <Toolbar
          editor={editor}
          onOpenMediaPicker={() => setShowMediaPicker(true)}
          onOpenDownloadPicker={() => setShowDownloadPicker(true)}
          variant={variant}
        />
        <div
          className="text-ink dark:text-night-text"
          onContextMenu={handleContextMenu}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {contextMenu && editor && (
        <TableContextMenu
          editor={editor}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Bild- und Download-Auswahl gibt es nur im Beitragseditor. */}
      {voll && (
        <>
          <MediaPickerModal
            isOpen={showMediaPicker}
            onClose={() => setShowMediaPicker(false)}
            onSelect={handleImageSelect}
          />

          <DownloadPickerModal
            isOpen={showDownloadPicker}
            onClose={() => setShowDownloadPicker(false)}
            onSelect={handleDownloadSelect}
          />
        </>
      )}
    </>
  );
}
