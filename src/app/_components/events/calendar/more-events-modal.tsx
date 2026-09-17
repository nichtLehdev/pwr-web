"use client";

import type { CalendarItemInternal } from "./desktop-calendar-view";
import { useEffect } from "react";
import { X, Users } from "lucide-react";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
} from "@/app/_components/ui/scrollable-modal";
import { BezirkLabel } from "@/app/_components/programmheft/bezirk-label";
import { Tag } from "@/app/_components/programmheft/tag";

interface MoreEventsModalProps {
  day: number;
  currentMonth: Date;
  events: CalendarItemInternal[];
  onClose: () => void;
  onSelectEvent: (event: CalendarItemInternal) => void;
}

export default function MoreEventsModal({
  day,
  currentMonth,
  events,
  onClose,
  onSelectEvent,
}: MoreEventsModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    return () => {
      document.body.style.overflow = "unset";
      document.body.classList.remove("modal-open");
    };
  }, []);

  return (
    <ScrollableModal zIndex="z-40" onBackdropClick={onClose}>
      <ScrollableModalCard
        maxW="md"
        className="border-ink dark:border-night-text rounded-none! border-2 shadow-none!"
      >
        <ScrollableModalHeader className="border-ink dark:border-night-text border-b-2 pb-4">
          <div className="flex items-center justify-between">
            <h3
              id="more-events-title"
              className="condensed text-ink dark:text-night-text text-lg font-extrabold"
            >
              Events am {day}.{" "}
              {currentMonth.toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <button
              onClick={onClose}
              className="text-ink hover:bg-ink hover:text-paper dark:text-night-text dark:hover:bg-night-text dark:hover:text-night flex h-9 w-9 items-center justify-center transition-colors"
              aria-label="Modal schließen"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </ScrollableModalHeader>

        <ScrollableModalBody className="p-0">
          <ul>
            {events.map((item, idx) => {
              const isCourse = item.type === "course";
              const isCancelled = item.type === "event" && item.cancelled;

              return (
                <li
                  key={idx}
                  className="border-rule dark:border-night-rule border-b"
                >
                  <button
                    onClick={() => {
                      onSelectEvent(item);
                    }}
                    className="fill-row flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`condensed flex-1 font-bold ${
                          isCancelled
                            ? "text-dark dark:text-night-muted line-through"
                            : "text-ink dark:text-night-text"
                        }`}
                      >
                        {item.title}
                      </span>
                      {isCancelled && <Tag tone="cancelled">Abgesagt</Tag>}
                      {!isCancelled &&
                        !isCourse &&
                        item.type === "event" &&
                        item.openToParticipants && (
                          <Tag tone="orange">
                            <Users className="h-3 w-3 shrink-0" aria-hidden />
                            Mitspielen
                          </Tag>
                        )}
                    </div>
                    <div className="text-dark dark:text-night-muted text-sm">
                      {isCourse ? (
                        <>
                          {item.date.toLocaleDateString("de-DE")} -{" "}
                          {item.endDate?.toLocaleDateString("de-DE")}
                          <span className="ml-2">Lehrgang</span>
                        </>
                      ) : (
                        <>
                          {item.date.toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          <span className="ml-2">
                            {item.type === "event" && item.category}
                          </span>
                        </>
                      )}
                    </div>
                    {item.bezirk ? (
                      <div className="text-dark dark:text-night-muted text-xs">
                        <BezirkLabel bezirk={item.bezirk} />
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollableModalBody>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
