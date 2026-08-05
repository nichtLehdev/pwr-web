"use client";

import dynamic from "next/dynamic";

/**
 * Lazy wrapper around the TipTap editor. TipTap + ProseMirror + turndown are
 * several hundred KB — import this instead of ./rich-text-editor so the
 * bundle only loads when an editor actually renders.
 */
const RichTextEditor = dynamic(() => import("./rich-text-editor"), {
  ssr: false,
  loading: () => (
    <div className="dark:border-dark-border flex min-h-[300px] items-center justify-center rounded-lg border border-gray-300 text-sm text-gray-500">
      Editor wird geladen…
    </div>
  ),
});

export default RichTextEditor;
