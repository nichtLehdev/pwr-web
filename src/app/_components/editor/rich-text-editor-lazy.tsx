"use client";

import dynamic from "next/dynamic";

/** Import this instead of ./rich-text-editor: TipTap + ProseMirror + turndown are several hundred KB. */
const RichTextEditor = dynamic(() => import("./rich-text-editor"), {
  ssr: false,
  loading: () => (
    <div className="border-rule dark:border-night-rule text-dark dark:text-night-muted flex min-h-[300px] items-center justify-center border text-sm">
      Editor wird geladen…
    </div>
  ),
});

export default RichTextEditor;
