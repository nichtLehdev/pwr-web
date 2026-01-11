"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

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
        window.removeEventListener(
          "mousedown",
          linkMouseDownHandlerRef.current,
          true,
        );
        if (linkMouseDownHandlerRef.current) {
          document.removeEventListener(
            "pointerdown",
            linkMouseDownHandlerRef.current as unknown as EventListener,
            true,
          );
          window.removeEventListener(
            "pointerdown",
            linkMouseDownHandlerRef.current as unknown as EventListener,
            true,
          );
        }
        linkMouseDownHandlerRef.current = undefined;
      }
      if (linkClickHandlerRef.current) {
        document.removeEventListener(
          "click",
          linkClickHandlerRef.current,
          true,
        );
        window.removeEventListener("click", linkClickHandlerRef.current, true);
        linkClickHandlerRef.current = undefined;
      }
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

    const showConfirmation = (): boolean => {
      return window.confirm(
        message ||
          "Du hast nicht gespeicherte Änderungen. Möchtest du die Seite wirklich verlassen?",
      );
    };

    const findLink = (
      element: HTMLElement | null,
    ): HTMLAnchorElement | null => {
      if (!element) return null;

      let link = element.closest("a[href]") as HTMLAnchorElement | null;
      if (link) return link;

      if (element.getRootNode) {
        const rootNode = element.getRootNode();
        const shadowRoot = rootNode as ShadowRoot;
        const path = shadowRoot?.host
          ? [
              shadowRoot.host,
              ...Array.from(
                (shadowRoot.host.getRootNode() as unknown as NodeList) || [],
              ),
            ]
          : [];
        for (const node of path) {
          if (node instanceof HTMLElement) {
            const found = node.closest?.("a[href]");
            if (found) {
              link = found as HTMLAnchorElement;
              break;
            }
          }
        }
      }

      if (!link) {
        let current: HTMLElement | null = element;
        let depth = 0;
        while (current && current !== document.body && depth < 15) {
          if (current.tagName === "A" && current.hasAttribute("href")) {
            link = current as HTMLAnchorElement;
            break;
          }
          const anchor = current.querySelector?.("a[href]");
          if (anchor) {
            link = anchor as HTMLAnchorElement;
            break;
          }
          current = current.parentElement;
          depth++;
        }
      }

      return link;
    };

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
        if (!showConfirmation()) {
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
        if (!showConfirmation()) {
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
          if (!showConfirmation()) {
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
          if (!showConfirmation()) {
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

    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.addEventListener(
      "pointerdown",
      linkMouseDownHandler as unknown as EventListener,
      true,
    );
    document.addEventListener(
      "pointerdown",
      linkMouseDownHandler as unknown as EventListener,
      true,
    );
    window.addEventListener("mousedown", linkMouseDownHandler, true);
    document.addEventListener("mousedown", linkMouseDownHandler, true);
    window.addEventListener("click", linkClickHandler, true);
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
        if (!showConfirmation()) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    };

    window.addEventListener("touchend", touchHandler, true);
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

      window.removeEventListener("beforeunload", beforeUnloadHandler);
      if (linkMouseDownHandlerRef.current) {
        window.removeEventListener(
          "pointerdown",
          linkMouseDownHandlerRef.current as unknown as EventListener,
          true,
        );
        document.removeEventListener(
          "pointerdown",
          linkMouseDownHandlerRef.current as unknown as EventListener,
          true,
        );
      }
      window.removeEventListener("mousedown", linkMouseDownHandler, true);
      document.removeEventListener("mousedown", linkMouseDownHandler, true);
      window.removeEventListener("click", linkClickHandler, true);
      document.removeEventListener("click", linkClickHandler, true);
      window.removeEventListener("touchend", touchHandler, true);
      document.removeEventListener("touchend", touchHandler, true);
      handlerRef.current = undefined;
      linkMouseDownHandlerRef.current = undefined;
      linkClickHandlerRef.current = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, message]);
}
