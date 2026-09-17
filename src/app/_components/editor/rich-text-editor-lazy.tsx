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
    <div className="border-rule dark:border-night-rule text-dark dark:text-night-muted flex min-h-[300px] items-center justify-center border text-sm">
      Editor wird geladen…
    </div>
  ),
});

export default RichTextEditor;
