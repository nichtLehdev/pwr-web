"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TapDockPortalProps = {
  children: React.ReactNode;
};

/**
 * Mobile: Dock an document.body (kein Clipping durch overflow-Container / Flex).
 * Vor useEffect: gleiches Markup wie Desktop-Flow → Hydration stabil.
 */
export function TapDockPortal({ children }: TapDockPortalProps) {
  const [layout, setLayout] = useState<"pending" | "mobile" | "desktop">(
    "pending",
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setLayout(mq.matches ? "mobile" : "desktop");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const isMobile = layout === "mobile";

  const shell = (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col",
        isMobile &&
          "fixed inset-x-0 bottom-0 z-[10050] transform-gpu border-t border-amber-200/70 bg-gradient-to-t from-amber-50/98 via-white/95 to-white/90 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.08)] dark:border-cyan-900/40 dark:from-dark-background dark:via-dark-background/95 dark:to-dark-background/90 dark:shadow-[0_-8px_32px_rgba(0,0,0,0.35)]",
        !isMobile &&
          "relative z-auto border-transparent bg-transparent px-0 pt-0 shadow-none dark:border-transparent",
        !isMobile &&
          "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
      )}
    >
      {children}
    </div>
  );

  if (isMobile && typeof document !== "undefined") {
    return createPortal(shell, document.body);
  }

  return shell;
}
