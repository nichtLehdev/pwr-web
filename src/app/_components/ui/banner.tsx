"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useBanner } from "./banner-context";
import { XIcon } from "lucide-react";
import { ArrowRightIcon } from "lucide-react";
import { Tag, type TagTone } from "../programmheft/tag";

export type BannerVariant = "info" | "warning" | "maintenance";

export interface AnnouncementBannerProps {
  /** Unique ID used for localStorage dismissal tracking */
  id: string;
  /** Badge text shown before the message */
  badge?: string;
  /** Main message (shown on desktop) */
  message: string;
  /** Short message for mobile (optional, defaults to message) */
  mobileMessage?: string;
  variant?: BannerVariant;
  dismissible?: boolean;
  link?: {
    href: string;
    label: string;
  };
  /** Optional icon to show before the badge */
  icon?: React.ReactNode;
}

/** Schrift immer mit ≥ 4,5:1 (WCAG 1.4.3); die Art nennt das Etikett. */
const variantStyles: Record<BannerVariant, string> = {
  info: "bg-primary text-ink",
  warning: "bg-ink text-paper dark:bg-night-text dark:text-night",
  maintenance: "bg-ink text-paper dark:bg-night-text dark:text-night",
};

const badgeTone: Record<BannerVariant, TagTone> = {
  info: "ink",
  warning: "orange",
  maintenance: "orange",
};

function useBannerVisibility(id: string) {
  const [visibility, setVisibility] = useState<
    "loading" | "visible" | "hidden"
  >("loading");

  useEffect(() => {
    const checkStorage = () => {
      const dismissed =
        localStorage.getItem(`banner-dismissed-${id}`) === "true";
      setVisibility(dismissed ? "hidden" : "visible");
    };
    checkStorage();
  }, [id]);

  const dismiss = useCallback(() => {
    localStorage.setItem(`banner-dismissed-${id}`, "true");
    setVisibility("hidden");
  }, [id]);

  return { visibility, dismiss };
}

function useBannerHeight(
  bannerRef: React.RefObject<HTMLDivElement | null>,
  isVisible: boolean,
) {
  const { setBannerHeight } = useBanner();

  useEffect(() => {
    if (!isVisible) {
      setBannerHeight(0);
      return;
    }

    const element = bannerRef.current;
    if (!element) return;

    setBannerHeight(element.offsetHeight);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Border-Box: enthält das Safe-Area-Padding (Notch), contentRect nicht.
        setBannerHeight(
          entry.borderBoxSize?.[0]?.blockSize ??
            (entry.target as HTMLElement).offsetHeight,
        );
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      setBannerHeight(0);
    };
  }, [bannerRef, isVisible, setBannerHeight]);
}

export function AnnouncementBanner({
  id,
  badge,
  message,
  mobileMessage,
  variant = "info",
  dismissible = true,
  link,
  icon,
}: AnnouncementBannerProps) {
  const { visibility, dismiss } = useBannerVisibility(id);
  const [translateX, setTranslateX] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  useBannerHeight(bannerRef, visibility === "visible");

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!dismissible) return;
    touchStartX.current = e.touches[0]?.clientX ?? 0;
    touchCurrentX.current = touchStartX.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dismissible) return;
    touchCurrentX.current = e.touches[0]?.clientX ?? 0;
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff > 0) {
      setTranslateX(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!dismissible) return;
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff > 100) {
      setTranslateX(window.innerWidth);
      setTimeout(dismiss, 200);
    } else {
      setTranslateX(0);
    }
  };

  if (visibility !== "visible") {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      className={`fixed top-0 right-0 left-0 z-60 overflow-hidden pt-[env(safe-area-inset-top,0px)] transition-transform duration-200 ease-out ${variantStyles[variant]}`}
      style={{ transform: `translateX(${translateX}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-2">
        <div className="flex flex-1 items-center justify-center gap-2 text-sm font-medium sm:justify-start">
          {icon && <span className="shrink-0">{icon}</span>}
          {badge && (
            <Tag tone={badgeTone[variant]} className="shrink-0">
              {badge}
            </Tag>
          )}
          <span className="hidden sm:inline">{message}</span>
          <span className="sm:hidden">{mobileMessage ?? message}</span>
          {link && (
            <Link
              href={link.href}
              className="ml-2 underline underline-offset-2 hover:no-underline"
            >
              {link.label}
            </Link>
          )}
        </div>

        {dismissible && (
          <button
            onClick={dismiss}
            className="ml-4 inline-flex h-11 w-11 shrink-0 items-center justify-center transition-colors hover:bg-current/15 focus-visible:outline-2 focus-visible:outline-current"
            aria-label="Banner schließen"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Swipe indicator for mobile */}
      {dismissible && (
        <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-50 sm:hidden">
          <ArrowRightIcon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

/**
 * Fragt zur Laufzeit, ob dies eine Vorab-Umgebung ist. Kein Prop aus dem
 * Layout: Statisch vorgerenderte Seiten frieren `APP_ENV` zur Build-Zeit ein.
 */
function useIsPreRelease() {
  const [isPreRelease, setIsPreRelease] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/app-env", { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .then((data) => {
        setIsPreRelease(
          typeof data === "object" &&
            data !== null &&
            (data as { isPreRelease?: unknown }).isPreRelease === true,
        );
      })
      .catch(() => {
        // Abbruch oder offline: im Zweifel kein Banner (Produktionsverhalten).
      });

    return () => controller.abort();
  }, []);

  return isPreRelease;
}

export function BetaBanner() {
  const isPreRelease = useIsPreRelease();

  if (!isPreRelease) {
    return null;
  }

  return (
    <AnnouncementBanner
      id="beta"
      badge="Beta"
      message="Diese Website befindet sich noch in der Entwicklung. Feedback ist willkommen!"
      mobileMessage="Website in Entwicklung"
      variant="info"
      dismissible={false}
      link={{ href: "/feedback", label: "Feedback geben" }}
    />
  );
}
