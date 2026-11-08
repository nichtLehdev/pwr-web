"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Check, Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { MIN_GROUP_FOR_MOVEMENT, MOVE_COUNT, tierName } from "../_lib/leagues";
import { ProfileAvatar, useProfiles } from "./profiles";

const DAY_MS = 24 * 60 * 60 * 1000;

function useStanding() {
  const { active, status } = useProfiles();
  const query = api.gameLeagues.standing.useQuery(
    { profileId: active?.id ?? "" },
    { enabled: Boolean(active), refetchOnWindowFocus: true },
  );
  return { active, status, standing: query.data, loading: query.isPending };
}

function daysLeft(weekEnd: string): string {
  const days = Math.max(
    1,
    Math.ceil((Date.parse(weekEnd) - Date.now()) / DAY_MS),
  );
  return days === 1 ? "noch heute" : `noch ${days} Tage`;
}

type Member = NonNullable<
  ReturnType<typeof useStanding>["standing"]
>["members"][number];

function MemberRow({ member, place }: { member: Member; place: number }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-3 py-2",
        member.isMe &&
          "on-orange bg-primary text-ink rounded-[var(--spiel-corner,1rem)]",
      )}
    >
      <span className="w-6 text-right font-extrabold tabular-nums">
        {place}
      </span>
      <ProfileAvatar profile={member} className="h-9 w-9" />
      <span className="min-w-0 flex-1 truncate font-bold">
        {member.name}
        {member.isMe && <span className="sr-only"> (du)</span>}
      </span>
      {member.move === 1 && (
        <ArrowUp className="h-4 w-4 shrink-0" aria-label="steigt auf" />
      )}
      {member.move === -1 && (
        <ArrowDown
          className="h-4 w-4 shrink-0 opacity-60"
          aria-label="steigt ab"
        />
      )}
      <span className="w-16 text-right font-extrabold tabular-nums">
        {member.xp} XP
      </span>
    </li>
  );
}

/** Auf der Übersicht: Stufe, Platz und die Spitze der eigenen Gruppe. */
export function LeagueCard() {
  const { active, status, standing } = useStanding();

  if (status === "loading") return null;
  if (status === "anon" || status === "skipped" || !active) {
    return (
      <section
        aria-label="Wochenliga"
        className="border-rule dark:border-night-rule mb-8 flex items-center gap-4 border-b pb-5"
      >
        <Trophy
          className="text-primary-ink dark:text-primary h-8 w-8 shrink-0"
          aria-hidden
        />
        <p className="text-ink dark:text-night-text min-w-0 flex-1">
          <strong>Wochenligen:</strong>{" "}
          {status === "anon"
            ? "Mit Anmeldung und Profil spielst du jede Woche gegen andere."
            : "Wähl ein Profil, dann spielst du jede Woche gegen andere."}
        </p>
        <Link
          href={
            status === "anon" ? "/login?callbackUrl=/spiele" : "/spiele/profile"
          }
          className="text-primary-ink dark:text-primary min-h-11 shrink-0 py-3 font-bold"
        >
          {status === "anon" ? "Anmelden" : "Profil wählen"}
        </Link>
      </section>
    );
  }
  if (!standing) return null;

  const meIndex = standing.members.findIndex((m) => m.isMe);
  const top = standing.members.slice(0, 5);
  return (
    <section aria-labelledby="liga-titel" className="mb-8 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="liga-titel"
          className="condensed text-ink dark:text-night-text text-[1.75rem] leading-none font-extrabold"
        >
          {tierName(standing.tier)}-Liga
        </h2>
        <span className="text-dark dark:text-night-muted text-sm font-semibold">
          {daysLeft(standing.weekEnd)}
        </span>
      </div>
      {standing.joined ? (
        <>
          <p className="text-ink dark:text-night-text font-bold">
            Platz {meIndex + 1} von {standing.members.length}
          </p>
          <ol className="flex flex-col">
            {top.map((member, index) => (
              <MemberRow key={member.key} member={member} place={index + 1} />
            ))}
            {meIndex >= top.length && (
              <MemberRow
                member={standing.members[meIndex]!}
                place={meIndex + 1}
              />
            )}
          </ol>
          <Link
            href="/spiele/liga"
            className="text-primary-ink dark:text-primary min-h-11 self-start py-3 font-bold"
          >
            Ganze Liga ansehen
          </Link>
        </>
      ) : (
        <p className="text-ink dark:text-night-text">
          Spiel diese Woche eine Runde, dann bist du in der Liga dabei.
        </p>
      )}
    </section>
  );
}

/** Die ganze Gruppe mit Regeln und dem Ergebnis der Vorwoche. */
export function LeagueTable() {
  const { active, standing, loading } = useStanding();
  if (!active) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 pt-8 text-center">
        <Trophy
          className="text-primary-ink dark:text-primary h-10 w-10"
          aria-hidden
        />
        <p className="text-ink dark:text-night-text text-xl font-extrabold">
          Ligen gibt es mit Anmeldung und Profil
        </p>
        <Link
          href="/spiele/profile"
          className="text-primary-ink dark:text-primary min-h-11 py-3 font-bold"
        >
          Zu den Profilen
        </Link>
      </div>
    );
  }
  if (loading || !standing) {
    return (
      <p className="text-dark dark:text-night-muted py-16 text-center text-sm">
        Lädt …
      </p>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-4">
      {standing.lastOutcome === 1 && (
        <p className="on-orange bg-primary text-ink spiel-stamp rounded-[var(--spiel-corner,1rem)] px-4 py-3 text-center text-lg font-extrabold">
          Aufgestiegen! Willkommen in {tierName(standing.tier)}.
        </p>
      )}
      {standing.lastOutcome === -1 && (
        <p className="border-rule dark:border-night-rule rounded-[var(--spiel-corner,1rem)] border px-4 py-3 text-center font-bold">
          Diese Woche geht es in {tierName(standing.tier)} weiter. Du schaffst
          das wieder.
        </p>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-ink dark:text-night-text text-3xl font-extrabold">
          {tierName(standing.tier)}-Liga
        </h2>
        <span className="text-dark dark:text-night-muted text-sm font-semibold">
          {daysLeft(standing.weekEnd)}
        </span>
      </div>
      {standing.joined ? (
        <ol className="flex flex-col">
          {standing.members.map((member, index) => (
            <MemberRow key={member.key} member={member} place={index + 1} />
          ))}
        </ol>
      ) : (
        <p className="text-ink dark:text-night-text text-lg">
          Spiel diese Woche eine Runde, dann bist du dabei.
        </p>
      )}
      <p className="text-dark dark:text-night-muted text-sm leading-snug">
        {standing.movement
          ? `Am Sonntagabend steigen die ersten ${MOVE_COUNT} auf und die letzten ${MOVE_COUNT} ab.`
          : `Auf- und Abstieg gibt es ab ${MIN_GROUP_FOR_MOVEMENT} Mitspielenden in einer Gruppe.`}{" "}
        XP gibt es für jede Runde, für neue Stufen und das Tagestraining am
        meisten.
      </p>
    </div>
  );
}

/** Drei Aufgaben für diese Woche, mit Fortschritt und Bonus. */
export function WeeklyTasksCard() {
  const { active } = useProfiles();
  const tasks = api.gameLeagues.tasks.useQuery(
    { profileId: active?.id ?? "" },
    { enabled: Boolean(active), refetchOnWindowFocus: true },
  );
  if (!active || !tasks.data || tasks.data.length === 0) return null;
  return (
    <section
      aria-labelledby="aufgaben-titel"
      className="mb-8 flex flex-col gap-3"
    >
      <h2
        id="aufgaben-titel"
        className="condensed text-ink dark:text-night-text text-[1.75rem] leading-none font-extrabold"
      >
        Wochenaufgaben
      </h2>
      <ul className="flex flex-col gap-2">
        {tasks.data.map((task) => (
          <li
            key={task.key}
            className={cn(
              "spiel-tile flex items-center gap-3 p-3",
              task.done && "on-orange bg-primary text-ink",
            )}
          >
            {task.done ? (
              <Check className="h-6 w-6 shrink-0 stroke-[3]" aria-hidden />
            ) : (
              <Target
                className="text-primary-ink dark:text-primary h-6 w-6 shrink-0"
                aria-hidden
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block leading-snug font-bold">{task.title}</span>
              {task.target > 1 && (
                <span
                  className="bg-rule dark:bg-night-rule mt-1.5 block h-2 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={task.target}
                  aria-valuenow={task.progress}
                  aria-label={`${task.progress} von ${task.target}`}
                >
                  <span
                    className="bg-primary-ink dark:bg-primary block h-full rounded-full"
                    style={{ width: `${(100 * task.progress) / task.target}%` }}
                  />
                </span>
              )}
            </span>
            <span className="shrink-0 text-sm font-extrabold tabular-nums">
              {task.done
                ? `+${task.reward} XP`
                : `${task.progress}/${task.target}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
