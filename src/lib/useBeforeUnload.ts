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

/** Links that never navigate away from the app and must not be intercepted. */
export function isIgnoredHref(link: HTMLAnchorElement, href: string): boolean {
  return (
    href.startsWith("http") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#") ||
    href === "javascript:void(0)" ||
    link.hasAttribute("download") ||
    link.target === "_blank"
  );
}

/** How long an answer stays valid for the navigation it was given for. */
const DECISION_TTL_MS = 1500;

/**
 * Hook to show a warning before leaving the page if there are unsaved changes.
 * Works for both actual page unloads (beforeunload) and Next.js client-side navigation.
 *
 * Asks in the click phase only. An earlier version also asked on `pointerdown`
 * and `mousedown`: the modal dialog swallowed the rest of the mouse gesture,
 * so the browser never delivered the `click` that Next.js `<Link>` navigates
 * on — confirming "leave" left you sitting on the page, with no way out other
 * than a full reload.
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
  const linkClickHandlerRef = useRef<((e: MouseEvent) => void) | undefined>(
    undefined,
  );
  const currentPathRef = useRef(pathname);
  /**
   * The answer already given for the navigation in flight. A single click on a
   * `<Link>` reaches us twice — once as the DOM event, then again as the
   * `router.push` Next.js makes from its own click handler — and both must
   * share one answer instead of stacking two dialogs.
   *
   * Only "leave" is remembered: a refusal stops the navigation right there, so
   * there is nothing left to ask about, and the next click deserves a fresh
   * question.
   */
  const allowedNavigationRef = useRef<string | null>(null);
  const allowedResetRef = useRef<number | undefined>(undefined);
  const routerRef = useRef(router);
  const originalPushRef = useRef<typeof router.push | null>(null);
  const originalReplaceRef = useRef<typeof router.replace | null>(null);

  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!enabled) {
      if (handlerRef.current) {
        window.removeEventListener("beforeunload", handlerRef.current);
        handlerRef.current = undefined;
      }
      if (linkClickHandlerRef.current) {
        document.removeEventListener(
          "click",
          linkClickHandlerRef.current,
          true,
        );
        linkClickHandlerRef.current = undefined;
      }
      window.clearTimeout(allowedResetRef.current);
      allowedNavigationRef.current = null;
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

    /** Ask once per navigation, not once per handler that sees it. */
    const mayLeave = (href: string): boolean => {
      if (allowedNavigationRef.current === href) return true;

      if (!askToLeave()) return false;

      allowedNavigationRef.current = href;
      // Safety net: the answer must not leak into a later navigation if the
      // click never reaches Next.js (the pointer was dragged off the link).
      window.clearTimeout(allowedResetRef.current);
      allowedResetRef.current = window.setTimeout(() => {
        allowedNavigationRef.current = null;
      }, DECISION_TTL_MS);
      return true;
    };

    const linkClickHandler = (e: MouseEvent) => {
      // Modified clicks open a new tab and leave this page alone.
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      let link: HTMLAnchorElement | null = null;

      if (e.composedPath) {
        for (const node of e.composedPath()) {
          if (node instanceof HTMLElement) {
            link = findClickedLink(node);
            if (link) break;
          }
        }
      }

      if (!link) link = findClickedLink(target);
      if (!link) return;

      if (link.hasAttribute("data-skip-warning")) return;

      const href = link.getAttribute("href");
      if (!href) return;
      if (isIgnoredHref(link, href)) return;

      if (!shouldBlockNavigation(href)) return;

      if (!mayLeave(href)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
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
        if (shouldBlockNavigation(href) && !mayLeave(href)) {
          return Promise.resolve(false);
        }
        return originalPushRef.current!(href, options);
      }) as typeof router.push;

      const interceptedReplace = ((
        href: string,
        options?: Parameters<typeof router.replace>[1],
      ) => {
        if (shouldBlockNavigation(href) && !mayLeave(href)) {
          return Promise.resolve(false);
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
    linkClickHandlerRef.current = linkClickHandler;

    // Document-level capture only. Registering the same handler on window as
    // well ran it twice for every event, since capture descends window →
    // document before reaching the target.
    window.addEventListener("beforeunload", beforeUnloadHandler);
    document.addEventListener("click", linkClickHandler, true);

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

      window.clearTimeout(allowedResetRef.current);
      allowedNavigationRef.current = null;
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      document.removeEventListener("click", linkClickHandler, true);
      handlerRef.current = undefined;
      linkClickHandlerRef.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, message]);
}
