"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useBanner } from "./banner-context";

export type BannerVariant = "info" | "warning" | "success" | "maintenance";

export interface AnnouncementBannerProps {
  /** Unique ID used for localStorage dismissal tracking */
  id: string;
  /** Badge text shown before the message */
  badge?: string;
  /** Main message (shown on desktop) */
  message: string;
  /** Short message for mobile (optional, defaults to message) */
  mobileMessage?: string;
  /** Visual variant/color scheme */
  variant?: BannerVariant;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
  /** Optional link */
  link?: {
    href: string;
    label: string;
  };
  /** Optional icon to show before the badge */
  icon?: React.ReactNode;
}

const variantStyles: Record<BannerVariant, string> = {
  info: "bg-[#faa619] text-white",
  warning: "bg-amber-500 text-white",
  success: "bg-green-600 text-white",
  maintenance: "bg-slate-700 text-white",
};

// Hook to check localStorage only on mount
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

// Custom hook to observe and report banner height
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

    // Set initial height
    setBannerHeight(element.offsetHeight);

    // Observe size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBannerHeight(entry.contentRect.height);
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

  // Report banner height to context
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

  // Don't render while loading or if dismissed
  if (visibility !== "visible") {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      className={`fixed top-0 right-0 left-0 z-60 overflow-hidden transition-transform duration-200 ease-out ${variantStyles[variant]}`}
      style={{ transform: `translateX(${translateX}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-2">
        <div className="flex flex-1 items-center justify-center gap-2 text-sm font-medium sm:justify-start">
          {icon && <span className="shrink-0">{icon}</span>}
          {badge && (
            <span className="shrink-0 rounded bg-white/20 px-2 py-0.5 text-xs font-bold tracking-wide uppercase">
              {badge}
            </span>
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
            className="ml-4 shrink-0 rounded-full p-1 transition-colors hover:bg-white/20 focus:ring-2 focus:ring-white/50 focus:outline-none"
            aria-label="Banner schließen"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Swipe indicator for mobile */}
      {dismissible && (
        <div className="absolute top-1/2 right-2 -translate-y-1/2 text-white/50 sm:hidden">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

// Convenience component for the beta banner
export function BetaBanner() {
  return (
    <AnnouncementBanner
      id="beta"
      badge="Beta"
      message="Diese Website befindet sich noch in der Entwicklung. Feedback ist willkommen!"
      mobileMessage="Website in Entwicklung"
      variant="info"
    />
  );
}
