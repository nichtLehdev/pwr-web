"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { BellIcon, CheckCheckIcon } from "lucide-react";

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
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Header notification bell with unread badge and dropdown. Only rendered for
 * logged-in users (the parent guards on session).
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
        className="text-dark dark:text-dark-text hover:text-primary dark:hover:text-primary dark:hover:bg-dark-background-secondary relative rounded-md p-2 transition-colors hover:bg-gray-100"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="bg-primary absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="dark:bg-dark-surface dark:border-dark-border absolute right-0 z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg sm:w-96">
          <div className="dark:border-dark-border flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
            <p className="dark:text-dark-text text-sm font-semibold text-gray-900">
              Benachrichtigungen
            </p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
              >
                <CheckCheckIcon className="h-3.5 w-3.5" />
                Alle gelesen
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!data || data.notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Keine Benachrichtigungen
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleOpen(notification)}
                      className={`dark:hover:bg-dark-background-secondary block w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                        notification.readAt ? "opacity-70" : ""
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        {!notification.readAt && (
                          <span className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                        )}
                        <span className="min-w-0">
                          <span className="dark:text-dark-text block text-sm font-medium text-gray-900">
                            {notification.title}
                          </span>
                          {notification.body && (
                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                              {notification.body}
                            </span>
                          )}
                          <span className="mt-0.5 block text-xs text-gray-400 dark:text-gray-500">
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
