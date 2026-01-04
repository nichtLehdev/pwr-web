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
import {
  Bold,
  Italic,
  Underline,
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
  Table,
  Undo,
  Redo,
  X,
  Plus,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
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

function ToolbarSeparator() {
  return <div className="dark:bg-dark-border mx-1 h-6 w-px bg-gray-300" />;
}

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
    <div className="dark:border-dark-border dark:bg-dark-surface flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
      {/* Text formatting */}
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
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={isMarkActive("underline")}
        title="Unterstrichen (Strg+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={isMarkActive("strike")}
        title="Durchgestrichen"
      >
        <Strikethrough className="h-4 w-4" />
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
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Nummerierung"
      >
        <ListOrdered className="h-4 w-4" />
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

      {/* Block elements */}
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
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Image - opens modal */}
      <ToolbarButton onClick={onOpenMediaPicker} title="Bild einfügen">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>

      {/* Download - opens modal */}
      <ToolbarButton onClick={onOpenDownloadPicker} title="Download einfügen">
        <FileText className="h-4 w-4" />
      </ToolbarButton>

      {/* Table dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setShowTableMenu(!showTableMenu)}
          isActive={editor.isActive("table")}
          title="Tabelle"
        >
          <Table className="h-4 w-4" />
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
                <Plus className="h-4 w-4" />
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
}: RichTextEditorProps) {
  const isInitialized = useRef(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showDownloadPicker, setShowDownloadPicker] = useState(false);

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
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "article-content p-4 min-h-[300px] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);
      onChange(markdown);
    },
  });

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
