"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * The link a click actually landed on — the clicked element itself or one of
 * its ancestors.
 *
 * Ancestors ONLY. An earlier version also searched each ancestor's descendants
 * for any `a[href]`, which meant clicking a toolbar button, a checkbox or an
 * input anywhere on a page that contains a link at all resolved to that link —
 * so every click on an editor page raised the "unsaved changes" prompt even
 * though nothing was navigating.
 */
export function findClickedLink(
  element: HTMLElement | null,
): HTMLAnchorElement | null {
  return (element?.closest("a[href]") as HTMLAnchorElement | null) ?? null;
}

/**
 * Hook to show a warning before leaving the page if there are unsaved changes.
 * Works for both actual page unloads (beforeunload) and Next.js client-side navigation.
 *
 * @param enabled - Whether to show the warning (typically based on form dirty state)
 * @param message - Optional custom message (browsers may ignore this)
 */
export function useBeforeUnload(enabled: boolean, message?: string) {
  const pathname = usePathname();
  const router = useRouter();
  const handlerRef = useRef<((e: BeforeUnloadEvent) => void) | undefined>(
    undefined,
  );
  const linkMouseDownHandlerRef = useRef<((e: MouseEvent) => void) | undefined>(
    undefined,
  );
  const linkClickHandlerRef = useRef<((e: MouseEvent) => void) | undefined>(
    undefined,
  );
  const currentPathRef = useRef(pathname);
  const blockedNavigationRef = useRef<string | null>(null);
  /** The answer already given for the click currently in flight. */
  const gestureDecisionRef = useRef<{ href: string; allowed: boolean } | null>(
    null,
  );
  const gestureResetRef = useRef<number | undefined>(undefined);
  const routerRef = useRef(router);
  const originalPushRef = useRef<typeof router.push | null>(null);
  const originalReplaceRef = useRef<typeof router.replace | null>(null);

  useEffect(() => {
    currentPathRef.current = pathname;
    blockedNavigationRef.current = null;
  }, [pathname]);

  useEffect(() => {
    if (!enabled) {
      if (handlerRef.current) {
        window.removeEventListener("beforeunload", handlerRef.current);
        handlerRef.current = undefined;
      }
      if (linkMouseDownHandlerRef.current) {
        document.removeEventListener(
          "mousedown",
          linkMouseDownHandlerRef.current,
          true,
        );
        document.removeEventListener(
          "pointerdown",
          linkMouseDownHandlerRef.current as unknown as EventListener,
          true,
        );
        linkMouseDownHandlerRef.current = undefined;
      }
      if (linkClickHandlerRef.current) {
        document.removeEventListener(
          "click",
          linkClickHandlerRef.current,
          true,
        );
        linkClickHandlerRef.current = undefined;
      }
      gestureDecisionRef.current = null;
      return;
    }

    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        message ||
        "Du hast nicht gespeicherte Änderungen. Möchtest du die Seite wirklich verlassen?";
      return e.returnValue;
    };

    const shouldBlockNavigation = (href: string): boolean => {
      const currentPath = currentPathRef.current;
      const normalizePath = (p: string) => p.replace(/\/$/, "") || "/";
      const normalizedCurrent = normalizePath(currentPath);
      const normalizedHref = normalizePath(href);

      return (
        normalizedHref !== normalizedCurrent &&
        !normalizedCurrent.startsWith(normalizedHref + "/")
      );
    };

    const askToLeave = (): boolean => {
      return window.confirm(
        message ||
          "Du hast nicht gespeicherte Änderungen. Möchtest du die Seite wirklich verlassen?",
      );
    };

    /**
     * Ask once per user gesture. A single click on a link reaches us three
     * times — pointerdown, mousedown, then click — and prompting in each phase
     * stacked three dialogs on top of each other for one click.
     */
    const showConfirmation = (href: string): boolean => {
      const pending = gestureDecisionRef.current;
      if (pending && pending.href === href) return pending.allowed;

      const allowed = askToLeave();
      gestureDecisionRef.current = { href, allowed };
      // Safety net: if no click follows (the pointer was dragged off the
      // link), the decision must not leak into the next gesture.
      window.clearTimeout(gestureResetRef.current);
      gestureResetRef.current = window.setTimeout(() => {
        gestureDecisionRef.current = null;
      }, 1500);
      return allowed;
    };

    const findLink = findClickedLink;

    const linkMouseDownHandler = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      let link: HTMLAnchorElement | null = null;

      if (e.composedPath) {
        const path = e.composedPath();
        for (const node of path) {
          if (node instanceof HTMLElement) {
            link = findLink(node);
            if (link) break;
          }
        }
      }

      if (!link) {
        link = findLink(target);
      }

      if (!link) return;

      if (link.hasAttribute("data-skip-warning")) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href === "javascript:void(0)" ||
        link.hasAttribute("download") ||
        link.target === "_blank"
      ) {
        return;
      }

      if (shouldBlockNavigation(href)) {
        if (!showConfirmation(href)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          blockedNavigationRef.current = href;
          const originalPointerEvents = link.style.pointerEvents;
          link.style.pointerEvents = "none";
          setTimeout(() => {
            link.style.pointerEvents = originalPointerEvents;
            blockedNavigationRef.current = null;
          }, 200);
          return false;
        }
        blockedNavigationRef.current = null;
      }
    };

    const linkClickHandler = (e: MouseEvent) => {
      if (blockedNavigationRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        blockedNavigationRef.current = null;
        return false;
      }

      const target = e.target as HTMLElement;
      if (!target) return;

      let link: HTMLAnchorElement | null = null;

      if (e.composedPath) {
        const path = e.composedPath();
        for (const node of path) {
          if (node instanceof HTMLElement) {
            link = findLink(node);
            if (link) break;
          }
        }
      }

      if (!link) {
        link = findLink(target);
      }

      if (!link) return;

      if (link.hasAttribute("data-skip-warning")) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href === "javascript:void(0)" ||
        link.hasAttribute("download") ||
        link.target === "_blank"
      ) {
        return;
      }

      if (shouldBlockNavigation(href)) {
        const allowed = showConfirmation(href);
        // click is the last phase of the gesture — the answer must not carry
        // over to whatever the user clicks next.
        gestureDecisionRef.current = null;
        if (!allowed) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    };

    if (routerRef.current !== router) {
      routerRef.current = router;
      originalPushRef.current = router.push.bind(router);
      originalReplaceRef.current = router.replace.bind(router);
    }

    if (originalPushRef.current && originalReplaceRef.current) {
      const interceptedPush = ((
        href: string,
        options?: Parameters<typeof router.push>[1],
      ) => {
        if (shouldBlockNavigation(href)) {
          if (!showConfirmation(href)) {
            return Promise.resolve(false);
          }
        }
        return originalPushRef.current!(href, options);
      }) as typeof router.push;

      const interceptedReplace = ((
        href: string,
        options?: Parameters<typeof router.replace>[1],
      ) => {
        if (shouldBlockNavigation(href)) {
          if (!showConfirmation(href)) {
            return Promise.resolve(false);
          }
        }
        return originalReplaceRef.current!(href, options);
      }) as typeof router.replace;

      try {
        Object.defineProperty(router, "push", {
          value: interceptedPush,
          writable: true,
          configurable: true,
        });

        Object.defineProperty(router, "replace", {
          value: interceptedReplace,
          writable: true,
          configurable: true,
        });
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (router as any).push = interceptedPush;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (router as any).replace = interceptedReplace;
      }
    }

    handlerRef.current = beforeUnloadHandler;
    linkMouseDownHandlerRef.current = linkMouseDownHandler;
    linkClickHandlerRef.current = linkClickHandler;

    // Document-level capture only. Registering the same handler on window as
    // well ran it twice for every event, since capture descends window →
    // document before reaching the target.
    window.addEventListener("beforeunload", beforeUnloadHandler);
    document.addEventListener(
      "pointerdown",
      linkMouseDownHandler as unknown as EventListener,
      true,
    );
    document.addEventListener("mousedown", linkMouseDownHandler, true);
    document.addEventListener("click", linkClickHandler, true);

    const touchHandler = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const link = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!link) return;

      if (link.hasAttribute("data-skip-warning")) return;

      const href = link.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href === "javascript:void(0)" ||
        link.hasAttribute("download") ||
        link.target === "_blank"
      ) {
        return;
      }

      if (shouldBlockNavigation(href)) {
        if (!showConfirmation(href)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    };

    document.addEventListener("touchend", touchHandler, true);

    return () => {
      if (originalPushRef.current && originalReplaceRef.current) {
        try {
          Object.defineProperty(router, "push", {
            value: originalPushRef.current,
            writable: true,
            configurable: true,
          });

          Object.defineProperty(router, "replace", {
            value: originalReplaceRef.current,
            writable: true,
            configurable: true,
          });
        } catch {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (router as any).push = originalPushRef.current;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (router as any).replace = originalReplaceRef.current;
        }
      }

      window.clearTimeout(gestureResetRef.current);
      gestureDecisionRef.current = null;
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      document.removeEventListener(
        "pointerdown",
        linkMouseDownHandler as unknown as EventListener,
        true,
      );
      document.removeEventListener("mousedown", linkMouseDownHandler, true);
      document.removeEventListener("click", linkClickHandler, true);
      document.removeEventListener("touchend", touchHandler, true);
      handlerRef.current = undefined;
      linkMouseDownHandlerRef.current = undefined;
      linkClickHandlerRef.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, message]);
}
