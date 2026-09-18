"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { formatBerlin } from "@/lib/berlin-time";

/** Gleiche Bausteine wie die Navigation, in der die Glocke steht. */
const ICON_BUTTON =
  "text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night relative inline-flex h-11 w-11 items-center justify-center transition-colors";
const PANEL =
  "border-ink bg-paper dark:border-night-rule dark:bg-night-raised absolute top-full right-0 z-50 mt-2 w-80 border-2 sm:w-96";

function formatRelativeTime(date: Date | string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} Tagen`;
  return formatBerlin(date, "datumZweistellig");
}

/**
 * Nur für angemeldete Nutzer (die Navigation prüft die Sitzung). Zähler in Tinte auf Orange —
 * Papier auf Orange fiele beim Kontrast durch.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const utils = api.useUtils();

  const { data } = api.notifications.list.useQuery(
    { limit: 15 },
    {
      // Light polling so the badge stays fresh without websockets.
      refetchInterval: 60_000,
      staleTime: 30_000,
    },
  );

  const markRead = api.notifications.markRead.useMutation({
    onSuccess: () => void utils.notifications.list.invalidate(),
  });
  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: () => void utils.notifications.list.invalidate(),
  });

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unreadCount = data?.unreadCount ?? 0;

  const handleOpen = (notification: {
    id: string;
    url: string | null;
    readAt: Date | null;
  }) => {
    if (!notification.readAt) {
      markRead.mutate({ id: notification.id });
    }
    setOpen(false);
    if (notification.url) {
      router.push(notification.url);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unreadCount > 0
            ? `Benachrichtigungen (${unreadCount} ungelesen)`
            : "Benachrichtigungen"
        }
        aria-expanded={open}
        className={ICON_BUTTON}
      >
        <BellIcon className="h-5 w-5" aria-hidden />
        {unreadCount > 0 && (
          <span className="semi-condensed bg-primary text-ink absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center px-1 text-[10px] leading-none font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={PANEL}>
          <div className="border-rule dark:border-night-rule flex items-center justify-between gap-3 border-b px-4 py-2.5">
            <p className="semi-condensed text-ink dark:text-night-text text-base font-semibold">
              Benachrichtigungen
            </p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="link-ink inline-flex min-h-8 shrink-0 items-center gap-1.5 text-sm"
              >
                <CheckCheckIcon className="h-4 w-4" aria-hidden />
                Alle gelesen
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!data || data.notifications.length === 0 ? (
              <p className="text-dark dark:text-night-muted px-4 py-8 text-center text-sm">
                Keine Benachrichtigungen
              </p>
            ) : (
              <ul>
                {data.notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="fill-row border-rule dark:border-night-rule border-b last:border-b-0"
                  >
                    <button
                      onClick={() => handleOpen(notification)}
                      className="block w-full px-4 py-3 text-left"
                    >
                      <span className="flex items-start gap-2.5">
                        <span
                          aria-hidden
                          className={`mt-2 h-2 w-2 shrink-0 ${
                            notification.readAt
                              ? "bg-transparent"
                              : "bg-ink dark:bg-night-text"
                          }`}
                        />
                        <span className="min-w-0">
                          <span
                            className={`text-ink dark:text-night-text block text-sm ${
                              notification.readAt
                                ? "font-medium"
                                : "font-semibold"
                            }`}
                          >
                            {notification.title}
                          </span>
                          {notification.body && (
                            <span className="text-dark dark:text-night-muted block truncate text-xs">
                              {notification.body}
                            </span>
                          )}
                          <span className="text-dark dark:text-night-muted mt-0.5 block text-xs">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
