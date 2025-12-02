"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TurndownService from "turndown";
import { useCallback, useEffect, useRef, useState } from "react";
import { marked } from "marked";
import MediaPickerModal from "./media-picker-modal";
import DownloadPickerModal from "./download-picker-modal";
import "@/styles/article-content.css";

interface RichTextEditorProps {
  content: string; // Markdown content
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

// Initialize turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

// Add table support to turndown
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

    // Check if this is a header row
    const parent = element.parentNode as HTMLElement | null;
    const table = element.closest("table");
    const isInThead = parent && parent.tagName === "THEAD";
    const hasThCells = element.querySelectorAll("th").length > 0;

    // Check if this is the first row of the table (for tables without thead)
    const allRows = table?.querySelectorAll("tr");
    const isFirstRowOfTable = allRows && allRows[0] === element;

    // Treat as header if: in thead, has th cells, or is first row of table
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

// Configure marked for Markdown to HTML conversion
marked.use({
  gfm: true,
  breaks: true,
});

// Toolbar button component
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
      className={`rounded p-2 transition-colors ${
        isActive
          ? "bg-primary text-white"
          : "dark:hover:bg-dark-background-secondary text-gray-700 hover:bg-gray-100 dark:text-gray-300"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </button>
  );
}

// Toolbar separator
function ToolbarSeparator() {
  return <div className="dark:bg-dark-border mx-1 h-6 w-px bg-gray-300" />;
}

// Toolbar component
function Toolbar({
  editor,
  onOpenMediaPicker,
  onOpenDownloadPicker,
}: {
  editor: Editor | null;
  onOpenMediaPicker: () => void;
  onOpenDownloadPicker: () => void;
}) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showTableMenu, setShowTableMenu] = useState(false);
  // Force re-render when editor state changes
  const [, forceUpdate] = useState(0);

  // Listen for editor updates to trigger re-renders
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

  // Helper to check if a mark is active (including stored marks for empty selections)
  const isMarkActive = (markName: string) => {
    if (!editor) return false;

    // First check if the mark is active in the current selection
    if (editor.isActive(markName)) return true;

    // Then check stored marks (marks queued to be applied on next input)
    const storedMarks = editor.state.storedMarks;
    if (storedMarks) {
      return storedMarks.some((mark) => mark.type.name === markName);
    }

    return false;
  };

  if (!editor) return null;

  return (
    <div className="dark:border-dark-border dark:bg-dark-surface flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={isMarkActive("bold")}
        title="Fett (Strg+B)"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={isMarkActive("italic")}
        title="Kursiv (Strg+I)"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={isMarkActive("underline")}
        title="Unterstrichen (Strg+U)"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={isMarkActive("strike")}
        title="Durchgestrichen"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
        </svg>
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Headings - Display H1/H2/H3 but use actual levels 2/3/4 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Überschrift 1"
      >
        <span className="text-sm font-bold">H1</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Überschrift 2"
      >
        <span className="text-sm font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        isActive={editor.isActive("heading", { level: 4 })}
        title="Überschrift 3"
      >
        <span className="text-sm font-bold">H3</span>
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Aufzählung"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Nummerierung"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
        </svg>
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Text alignment */}
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
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Zentriert"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Rechtsbündig"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z" />
        </svg>
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Block elements */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Zitat"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontale Linie"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 11h16v2H4z" />
        </svg>
      </ToolbarButton>

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
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
          </svg>
        </ToolbarButton>
        {showLinkInput && (
          <div className="dark:border-dark-border dark:bg-dark-surface absolute top-full right-0 z-50 mt-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
            <input
              type="url"
              placeholder="https://..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setLink()}
              className="dark:border-dark-border dark:bg-dark-background-secondary w-64 rounded border border-gray-300 px-2 py-1 text-sm dark:text-gray-100"
              autoFocus
            />
            <button
              type="button"
              onClick={setLink}
              className="bg-primary rounded px-2 py-1 text-sm text-white"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl("");
              }}
              className="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Image - opens modal */}
      <ToolbarButton onClick={onOpenMediaPicker} title="Bild einfügen">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
      </ToolbarButton>

      {/* Download - opens modal */}
      <ToolbarButton onClick={onOpenDownloadPicker} title="Download einfügen">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
      </ToolbarButton>

      {/* Table dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setShowTableMenu(!showTableMenu)}
          isActive={editor.isActive("table")}
          title="Tabelle"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3v18h18V3H3zm8 16H5v-6h6v6zm0-8H5V5h6v6zm8 8h-6v-6h6v6zm0-8h-6V5h6v6z" />
          </svg>
        </ToolbarButton>
        {showTableMenu && (
          <div className="dark:border-dark-border dark:bg-dark-surface absolute top-full left-0 z-50 mt-1 min-w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-xl">
            {!editor.isActive("table") ? (
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
                className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Tabelle einfügen (3×3)
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().addRowAfter().run();
                    setShowTableMenu(false);
                  }}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Zeile darunter einfügen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().addRowBefore().run();
                    setShowTableMenu(false);
                  }}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Zeile darüber einfügen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().deleteRow().run();
                    setShowTableMenu(false);
                  }}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                >
                  Zeile löschen
                </button>
                <div className="dark:bg-dark-border my-1 h-px bg-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().addColumnAfter().run();
                    setShowTableMenu(false);
                  }}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Spalte rechts einfügen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().addColumnBefore().run();
                    setShowTableMenu(false);
                  }}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Spalte links einfügen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().deleteColumn().run();
                    setShowTableMenu(false);
                  }}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                >
                  Spalte löschen
                </button>
                <div className="dark:bg-dark-border my-1 h-px bg-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeaderRow().run();
                    setShowTableMenu(false);
                  }}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Kopfzeile umschalten
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().mergeCells().run();
                    setShowTableMenu(false);
                  }}
                  disabled={!editor.can().mergeCells()}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Zellen verbinden
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().splitCell().run();
                    setShowTableMenu(false);
                  }}
                  disabled={!editor.can().splitCell()}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Zelle teilen
                </button>
                <div className="dark:bg-dark-border my-1 h-px bg-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().deleteTable().run();
                    setShowTableMenu(false);
                  }}
                  className="dark:hover:bg-dark-background-secondary flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                >
                  Tabelle löschen
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <ToolbarSeparator />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Rückgängig (Strg+Z)"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
        </svg>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Wiederholen (Strg+Y)"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
        </svg>
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Schreiben Sie hier Ihren Text...",
  className = "",
}: RichTextEditorProps) {
  const isInitialized = useRef(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showDownloadPicker, setShowDownloadPicker] = useState(false);

  // Convert markdown to HTML for initial content
  const initialHtml = content ? String(marked.parse(content)) : "";

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full rounded-lg",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: "left",
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse w-full my-4",
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-gray-300 dark:border-gray-600 p-2",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class:
            "border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-800 font-semibold",
        },
      }),
    ],
    content: initialHtml,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    editorProps: {
      attributes: {
        class: "article-content p-4 min-h-[300px] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      // Convert HTML to Markdown
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      onChange(markdown);
    },
  });

  // Handle image selection from media picker
  const handleImageSelect = useCallback(
    (url: string, alt: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url, alt }).run();
      }
      setShowMediaPicker(false);
    },
    [editor],
  );

  // Handle download selection
  const handleDownloadSelect = useCallback(
    (title: string, url: string, fileType: string) => {
      if (editor) {
        // Insert a styled download link
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

  // Update editor content when external content changes (but only after initialization)
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
        className={`dark:border-dark-border dark:bg-dark-background-secondary overflow-hidden rounded-lg border border-gray-300 bg-white ${className}`}
      >
        <Toolbar
          editor={editor}
          onOpenMediaPicker={() => setShowMediaPicker(true)}
          onOpenDownloadPicker={() => setShowDownloadPicker(true)}
        />
        <div className="text-gray-900 dark:text-gray-100">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleImageSelect}
      />

      {/* Download Picker Modal */}
      <DownloadPickerModal
        isOpen={showDownloadPicker}
        onClose={() => setShowDownloadPicker(false)}
        onSelect={handleDownloadSelect}
      />
    </>
  );
}
