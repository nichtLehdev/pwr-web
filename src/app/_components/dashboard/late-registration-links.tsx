"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/app/_components/ui/toast";
import { Note } from "@/app/_components/programmheft/note";
import { Tag, type TagTone } from "@/app/_components/programmheft/tag";
import { CopyField } from "@/app/settings/ki-verbindungen/copy-field";
import { formatBerlin } from "@/lib/berlin-time";
import {
  LATE_REGISTRATION_LINK_STATE_LABELS,
  LATE_REGISTRATION_VALID_DAYS,
  type LateRegistrationLinkState,
} from "@/lib/late-registration-link";

const BTN_PRIMARY =
  "bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const BTN_OUTLINE =
  "border-rule dark:border-night-rule text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const FIELD =
  "border-ink dark:border-night-text bg-paper dark:bg-night text-ink dark:text-night-text min-h-11 w-full border-2 px-3 py-2 text-sm";

const STATE_TONES: Record<LateRegistrationLinkState, TagTone> = {
  open: "orange",
  used: "inverse",
  revoked: "muted",
  expired: "muted",
};

const formatDateTime = (date: Date) =>
  `${formatBerlin(date, "datumUhrzeit")} Uhr`;

const daysLabel = (days: number) => (days === 1 ? "1 Tag" : `${days} Tage`);

/**
 * Einmal nutzbare Links für Anmeldungen nach der Frist (oder bei geschlossener
 * Anmeldung). Der Link steht nur direkt nach dem Erstellen hier: gespeichert
 * wird allein ein Hash.
 */
export function LateRegistrationLinks({
  courseId,
  courseEnded,
}: {
  courseId: string;
  courseEnded: boolean;
}) {
  const toast = useToast();
  const utils = api.useUtils();
  const noteId = useId();
  const validityId = useId();

  const [note, setNote] = useState("");
  const [validDays, setValidDays] = useState<number>(
    LATE_REGISTRATION_VALID_DAYS[0],
  );
  const [created, setCreated] = useState<{
    url: string;
    expiresAt: Date;
  } | null>(null);

  const { data: links, isLoading } = api.lateRegistrationLinks.list.useQuery({
    courseId,
  });

  const createMutation = api.lateRegistrationLinks.create.useMutation({
    onSuccess: (result) => {
      setCreated({ url: result.url, expiresAt: result.expiresAt });
      setNote("");
      void utils.lateRegistrationLinks.list.invalidate({ courseId });
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeMutation = api.lateRegistrationLinks.revoke.useMutation({
    onSuccess: () => {
      toast.success("Link zurückgezogen");
      void utils.lateRegistrationLinks.list.invalidate({ courseId });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <section className="dark:border-night-rule border-rule border-t pt-10">
      <h2 className="dark:text-night-text text-ink mb-2 text-lg font-semibold">
        Nachmeldelinks
      </h2>
      <p className="text-dark dark:text-night-muted mb-6 max-w-[65ch] text-sm">
        Mit einem Nachmeldelink kann sich eine Person über das öffentliche
        Formular anmelden, obwohl die Anmeldefrist abgelaufen oder die Anmeldung
        geschlossen ist. Jeder Link gilt für genau eine Anmeldung. Plätze,
        Warteliste und Preise gelten wie sonst auch.
      </p>

      {courseEnded ? (
        <p className="text-dark dark:text-night-muted mb-6 text-sm">
          Der Kurs ist vorbei, neue Links lassen sich nicht mehr erstellen.
        </p>
      ) : (
        <form
          className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setCreated(null);
            createMutation.mutate({
              courseId,
              validDays,
              ...(note.trim() && { note: note.trim() }),
            });
          }}
        >
          <div>
            <label
              htmlFor={noteId}
              className="text-ink dark:text-night-text mb-1 block text-sm font-semibold"
            >
              Für wen? (optional, nur intern)
            </label>
            <input
              id={noteId}
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. Familie Muster"
              className={FIELD}
            />
          </div>
          <div>
            <label
              htmlFor={validityId}
              className="text-ink dark:text-night-text mb-1 block text-sm font-semibold"
            >
              Gültig für
            </label>
            <select
              id={validityId}
              value={validDays}
              onChange={(e) => setValidDays(Number(e.target.value))}
              className={FIELD}
            >
              {[...LATE_REGISTRATION_VALID_DAYS]
                .sort((a, b) => a - b)
                .map((days) => (
                  <option key={days} value={days}>
                    {daysLabel(days)}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className={BTN_PRIMARY}
          >
            <LinkIcon className="h-4 w-4" aria-hidden />
            {createMutation.isPending ? "Wird erstellt…" : "Link erstellen"}
          </button>
        </form>
      )}

      {created && (
        <Note
          tone="info"
          title="Link erstellt – jetzt kopieren"
          className="mb-6"
        >
          <p className="mb-3">
            Der Link wird nur jetzt angezeigt. Er gilt bis{" "}
            {formatDateTime(created.expiresAt)} für eine Anmeldung.
          </p>
          <CopyField value={created.url} label="Nachmeldelink" />
        </Note>
      )}

      {isLoading ? (
        <p className="text-dark dark:text-night-muted text-sm">Laden…</p>
      ) : !links?.length ? (
        <p className="text-dark dark:text-night-muted text-sm">
          Noch keine Nachmeldelinks erstellt.
        </p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => (
            <li
              key={link.id}
              className="dark:border-night-rule border-rule flex flex-wrap items-start justify-between gap-3 border p-4"
            >
              <div className="min-w-0 space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={STATE_TONES[link.state]}>
                    {LATE_REGISTRATION_LINK_STATE_LABELS[link.state]}
                  </Tag>
                  <span className="dark:text-night-text text-ink font-medium">
                    {link.note || "Ohne Notiz"}
                  </span>
                </div>
                <p className="text-dark dark:text-night-muted">
                  Erstellt {formatDateTime(link.createdAt)}
                  {link.createdBy?.displayName
                    ? ` von ${link.createdBy.displayName}`
                    : ""}
                  {" · "}
                  {link.state === "used" && link.usedAt
                    ? `benutzt ${formatDateTime(link.usedAt)}`
                    : link.state === "revoked" && link.revokedAt
                      ? `zurückgezogen ${formatDateTime(link.revokedAt)}`
                      : `${link.state === "expired" ? "abgelaufen" : "gültig bis"} ${formatDateTime(link.expiresAt)}`}
                </p>
                {link.registration && (
                  <p>
                    <Link
                      href={`/dashboard/courses/${courseId}/participants/${link.registration.id}`}
                      className="link-ink"
                    >
                      Anmeldung von {link.registration.registrantFirstName}{" "}
                      {link.registration.registrantLastName}
                    </Link>
                  </p>
                )}
              </div>
              {link.state === "open" && (
                <button
                  type="button"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate({ id: link.id })}
                  className={BTN_OUTLINE}
                >
                  Zurückziehen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
