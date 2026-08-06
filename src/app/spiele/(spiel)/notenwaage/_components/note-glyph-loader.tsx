"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import type { NoteValueId } from "../_lib/types";

// VexFlow is ~500 KB raw — load the glyph renderer on demand instead of in
// the route bundle (same pattern as rhythm-display-loader).
const NoteGlyphInner = dynamic(
  () => import("./note-glyph").then((m) => ({ default: m.NoteGlyph })),
  {
    ssr: false,
    loading: () => <span className="inline-block h-7 w-7 md:h-10 md:w-10" />,
  },
);

// memo: gleiche Props → kein erneutes (teures) VexFlow-Rendering.
export const NoteGlyph = memo(function NoteGlyph(props: {
  id: NoteValueId;
  className?: string;
}) {
  return <NoteGlyphInner {...props} />;
});
