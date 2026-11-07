"use client";

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Check, Pencil, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { Button } from "@/app/_components/ui/button";
import { GAME_FOCUS_RING } from "../_lib/focus-ring";
import {
  isProfileColor,
  MAX_PROFILES,
  PROFILE_COLORS,
  PROFILE_COLOR_IDS,
  PROFILE_INSTRUMENTS,
  type ProfileColor,
  type ProfileInstrument,
} from "../_lib/profiles/options";
import {
  adoptLocalProgress,
  applyProgress,
  collectProgress,
  PROGRESS_CHANGED_EVENT,
  setActiveProfileScope,
} from "../_lib/profiles/scope";
import { GameDock } from "./game-shell-context";
import { Toni } from "./toni";

export type GameProfile = {
  id: string;
  name: string;
  color: string;
  instruments: string[];
};

const CHOSEN_KEY = "pwr.spiele.v1.profile";
const CACHE_KEY = "pwr.spiele.v1.profiles.cache";
const SKIP_KEY = "pwr.spiele.v1.profile.skip";
/** Länger wartet niemand auf den Abgleich; dann gilt der lokale Stand. */
const FIRST_SYNC_TIMEOUT_MS = 2500;
const SYNC_DEBOUNCE_MS = 1500;

function readJson<T>(storage: () => Storage, key: string): T | null {
  try {
    return JSON.parse(storage().getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

function writeJson(storage: () => Storage, key: string, value: unknown) {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, JSON.stringify(value));
  } catch {
    /* Privates Fenster: gilt dann nur bis zum Neuladen. */
  }
}

const local = () => localStorage;
const session = () => sessionStorage;

export function colorOf(profile: { color: string } | null | undefined) {
  return PROFILE_COLORS[
    profile && isProfileColor(profile.color) ? profile.color : "messing"
  ];
}

export function instrumentLabels(instruments: readonly string[]): string {
  return PROFILE_INSTRUMENTS.filter((i) => instruments.includes(i.id))
    .map((i) => i.label)
    .join(", ");
}

type Status = "anon" | "loading" | "none" | "choose" | "skipped" | "ready";

type ProfilesValue = {
  status: Status;
  userId: string | null;
  profiles: GameProfile[];
  active: GameProfile | null;
  /** Erster Abgleich mit dem Server ist durch, die Spiele dürfen ihren Speicher lesen. */
  synced: boolean;
  choose: (id: string | null) => void;
  skip: () => void;
  refresh: () => Promise<unknown>;
};

const ProfilesContext = createContext<ProfilesValue | null>(null);

export function useProfiles(): ProfilesValue {
  const value = useContext(ProfilesContext);
  if (!value) throw new Error("useProfiles braucht einen ProfilesProvider");
  return value;
}

function useProgressSync(active: GameProfile | null) {
  const sync = api.gameProfiles.syncProgress.useMutation();
  const syncRef = useRef(sync.mutateAsync);
  useEffect(() => {
    syncRef.current = sync.mutateAsync;
  });
  const [syncedFor, setSyncedFor] = useState<string | null>(null);
  const activeId = active?.id ?? null;

  const run = useCallback(async (id: string) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      const result = await syncRef.current({
        id,
        progress: collectProgress(id),
      });
      applyProgress(id, result.progress);
    } catch {
      /* Offline oder Server weg: Beim nächsten Anlass klappt es. */
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setSyncedFor(activeId);
    };
    const timer = window.setTimeout(finish, FIRST_SYNC_TIMEOUT_MS);
    void run(activeId).finally(finish);

    let pending: number | undefined;
    const later = () => {
      window.clearTimeout(pending);
      pending = window.setTimeout(() => void run(activeId), SYNC_DEBOUNCE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") later();
    };
    window.addEventListener(PROGRESS_CHANGED_EVENT, later);
    window.addEventListener("online", later);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      done = true;
      window.clearTimeout(timer);
      window.clearTimeout(pending);
      window.removeEventListener(PROGRESS_CHANGED_EVENT, later);
      window.removeEventListener("online", later);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeId, run]);

  return syncedFor === activeId;
}

/** Hält Profile, gewähltes Profil und den Abgleich; setzt den Speicherbereich der Spiele. */
export function ProfilesProvider({ children }: { children: ReactNode }) {
  const { data: sessionData, isPending: sessionPending } = useSession();
  const userId = sessionData?.user?.id ?? null;
  const [hydrated, setHydrated] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [cached, setCached] = useState<GameProfile[] | null>(null);

  useEffect(() => {
    const stored = readJson<{ userId: string; id: string }>(local, CHOSEN_KEY);
    const cache = readJson<{ userId: string; profiles: GameProfile[] }>(
      local,
      CACHE_KEY,
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild kennt den Speicher nicht
    setChosen(stored && stored.userId === userId ? stored.id : null);
    setCached(cache && cache.userId === userId ? cache.profiles : null);
    setSkipped(readJson<boolean>(session, SKIP_KEY) === true);
    setHydrated(true);
  }, [userId]);

  const list = api.gameProfiles.list.useQuery(undefined, {
    enabled: Boolean(userId),
    retry: 1,
  });

  useEffect(() => {
    if (userId && list.data) {
      writeJson(local, CACHE_KEY, { userId, profiles: list.data });
    }
  }, [userId, list.data]);

  const profiles = useMemo(
    () => list.data ?? cached ?? [],
    [list.data, cached],
  );
  const known = list.data !== undefined || cached !== null;
  const active =
    profiles.find((p) => p.id === chosen) ??
    (profiles.length === 1 && !skipped ? profiles[0]! : null);

  // Im Rendern statt im Effekt: Kinder lesen ihren Speicher in eigenen Effekten, und die laufen zuerst.
  setActiveProfileScope(
    active && !skipped
      ? { id: active.id, instruments: active.instruments }
      : null,
  );

  const synced = useProgressSync(skipped ? null : active);

  const status: Status =
    sessionPending || !hydrated
      ? "loading"
      : !userId
        ? "anon"
        : skipped
          ? "skipped"
          : !known
            ? list.isError
              ? "skipped"
              : "loading"
            : active
              ? "ready"
              : profiles.length === 0
                ? "none"
                : "choose";

  const choose = useCallback(
    (id: string | null) => {
      setChosen(id);
      setSkipped(false);
      writeJson(session, SKIP_KEY, null);
      writeJson(local, CHOSEN_KEY, id && userId ? { userId, id } : null);
    },
    [userId],
  );

  const skip = useCallback(() => {
    setSkipped(true);
    writeJson(session, SKIP_KEY, true);
  }, []);

  const value = useMemo<ProfilesValue>(
    () => ({
      status,
      userId,
      profiles,
      active: skipped ? null : active,
      synced,
      choose,
      skip,
      refresh: list.refetch,
    }),
    [
      status,
      userId,
      profiles,
      skipped,
      active,
      synced,
      choose,
      skip,
      list.refetch,
    ],
  );

  return (
    <ProfilesContext.Provider value={value}>
      {children}
    </ProfilesContext.Provider>
  );
}

export function ProfileAvatar({
  profile,
  className,
}: {
  profile: { color: string } | null;
  className?: string;
}) {
  return <Toni mood="idle" color={colorOf(profile)} className={className} />;
}

function Choice({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "spiel-tile min-h-11 px-3 py-2 text-left text-sm font-bold",
        GAME_FOCUS_RING,
        active && "on-orange bg-primary text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Anlegen und Bearbeiten: Instrumente, Farbe, gewürfelter Name. Nie Freitext. */
export function ProfileEditor({
  profile,
  onDone,
  onCancel,
}: {
  profile: GameProfile | null;
  onDone: (profile: GameProfile) => void;
  onCancel?: () => void;
}) {
  const utils = api.useUtils();
  const [instruments, setInstruments] = useState<ProfileInstrument[]>(
    (profile?.instruments ?? []) as ProfileInstrument[],
  );
  const [color, setColor] = useState<ProfileColor>(
    profile && isProfileColor(profile.color) ? profile.color : "messing",
  );
  const [saved, setSaved] = useState<GameProfile | null>(profile);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const create = api.gameProfiles.create.useMutation();
  const update = api.gameProfiles.update.useMutation();
  const remove = api.gameProfiles.delete.useMutation();
  const busy = create.isPending || update.isPending || remove.isPending;
  const error = create.error ?? update.error ?? remove.error;

  const toggle = (id: ProfileInstrument) =>
    setInstruments((list) =>
      list.includes(id) ? list.filter((i) => i !== id) : [...list, id],
    );

  const save = async () => {
    const result = saved
      ? await update.mutateAsync({ id: saved.id, instruments, color })
      : await create.mutateAsync({ instruments, color });
    // Ein neues Profil erscheint erst nach dem Namen in der Liste, sonst springt das Spiel sofort los.
    if (!saved) {
      adoptLocalProgress(result.id);
      setSaved(result);
      return;
    }
    await utils.gameProfiles.list.invalidate();
    onDone(result);
  };

  const reroll = async () => {
    if (!saved) return;
    const result = await update.mutateAsync({ id: saved.id, rerollName: true });
    setSaved(result);
    if (profile) await utils.gameProfiles.list.invalidate();
  };

  // Frisch angelegt: Erst den Namen zeigen, dann geht es los.
  if (saved && !profile) {
    return (
      <div className="flex flex-col items-center gap-4 pt-4 text-center">
        <ProfileAvatar profile={saved} className="h-28 w-28" />
        <p className="text-dark dark:text-night-muted font-bold">
          Du heißt jetzt
        </p>
        <p className="text-ink dark:text-night-text text-3xl font-extrabold">
          {saved.name}
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={reroll}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Anderer Name
        </Button>
        <GameDock>
          <Button
            type="button"
            size="lg"
            className="spiel-action w-full"
            onClick={async () => {
              await utils.gameProfiles.list.invalidate();
              onDone(saved);
            }}
          >
            Los geht&apos;s
          </Button>
        </GameDock>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-2">
      <div className="flex items-center gap-4">
        <ProfileAvatar profile={{ color }} className="h-24 w-24" />
        <div className="min-w-0">
          <h2 className="text-ink dark:text-night-text text-2xl font-extrabold">
            {saved ? saved.name : "Neues Profil"}
          </h2>
          {saved ? (
            <button
              type="button"
              disabled={busy}
              onClick={reroll}
              className={cn(
                "text-primary-ink dark:text-primary mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold",
                GAME_FOCUS_RING,
              )}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Anderer Name
            </button>
          ) : (
            <p className="text-dark dark:text-night-muted mt-1 text-sm">
              Den Namen würfelt Toni gleich für dich aus.
            </p>
          )}
        </div>
      </div>

      <section
        aria-labelledby="profil-instrumente"
        className="flex flex-col gap-2"
      >
        <h3
          id="profil-instrumente"
          className="text-ink dark:text-night-text font-bold"
        >
          Was spielst du? <span className="font-normal">Auch mehreres.</span>
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROFILE_INSTRUMENTS.map((instrument) => (
            <Choice
              key={instrument.id}
              active={instruments.includes(instrument.id)}
              onClick={() => toggle(instrument.id)}
              className="flex items-center gap-2"
            >
              {instruments.includes(instrument.id) && (
                <Check className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {instrument.label}
            </Choice>
          ))}
        </div>
      </section>

      <section aria-labelledby="profil-farbe" className="flex flex-col gap-2">
        <h3
          id="profil-farbe"
          className="text-ink dark:text-night-text font-bold"
        >
          Tonis Farbe
        </h3>
        <div className="flex flex-wrap gap-3">
          {PROFILE_COLOR_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={color === id}
              aria-label={PROFILE_COLORS[id].label}
              onClick={() => setColor(id)}
              className={cn(
                "border-ink dark:border-night-text h-11 w-11 rounded-full border-2",
                GAME_FOCUS_RING,
                color === id &&
                  "ring-ink dark:ring-night-text ring-[3px] ring-offset-2",
              )}
              style={{
                background: PROFILE_COLORS[id].body,
                borderRadius: "50%",
              }}
            />
          ))}
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="text-sm font-bold text-red-700 dark:text-red-400"
        >
          {error.message ||
            "Das hat nicht geklappt. Versuch es gleich noch einmal."}
        </p>
      )}

      {saved && (
        <div className="border-rule dark:border-night-rule border-t pt-4">
          {confirmDelete ? (
            <div className="flex flex-col gap-2">
              <p className="text-ink dark:text-night-text text-sm">
                Der ganze Fortschritt von {saved.name} wird gelöscht. Das lässt
                sich nicht rückgängig machen.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                >
                  Behalten
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-red-700 text-white hover:bg-red-800"
                  disabled={busy}
                  onClick={async () => {
                    await remove.mutateAsync({ id: saved.id });
                    await utils.gameProfiles.list.invalidate();
                    onCancel?.();
                  }}
                >
                  Endgültig löschen
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className={cn(
                "min-h-11 text-sm font-bold text-red-700 dark:text-red-400",
                GAME_FOCUS_RING,
              )}
            >
              Profil löschen
            </button>
          )}
        </div>
      )}

      <GameDock>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Zurück
            </Button>
          )}
          <Button
            type="button"
            size="lg"
            className="spiel-action flex-[2]"
            disabled={busy || instruments.length === 0}
            onClick={save}
          >
            {instruments.length === 0
              ? "Wähl ein Instrument"
              : saved
                ? "Speichern"
                : "Profil anlegen"}
          </Button>
        </div>
      </GameDock>
    </div>
  );
}

/** „Wer spielt?“: Profile zum Antippen, dazu Anlegen und Bearbeiten. */
export function ProfilePicker({
  onPicked,
  manage = false,
}: {
  onPicked?: (profile: GameProfile) => void;
  /** Mit Bearbeiten-Knopf je Profil, für die Profilseite. */
  manage?: boolean;
}) {
  const { profiles, active, choose, skip } = useProfiles();
  const [editing, setEditing] = useState<GameProfile | "new" | null>(
    profiles.length === 0 ? "new" : null,
  );

  if (editing) {
    return (
      <ProfileEditor
        profile={editing === "new" ? null : editing}
        onDone={(profile) => {
          setEditing(null);
          choose(profile.id);
          onPicked?.(profile);
        }}
        onCancel={profiles.length > 0 ? () => setEditing(null) : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center gap-4">
        <Toni mood="happy" className="h-20 w-20" />
        <h2 className="text-ink dark:text-night-text text-3xl font-extrabold">
          Wer spielt?
        </h2>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {profiles.map((profile) => (
          <li key={profile.id} className="flex gap-2">
            <button
              type="button"
              aria-pressed={active?.id === profile.id}
              onClick={() => {
                choose(profile.id);
                onPicked?.(profile);
              }}
              className={cn(
                "spiel-tile flex min-w-0 flex-1 items-center gap-3 p-3 text-left",
                GAME_FOCUS_RING,
                active?.id === profile.id && "on-orange bg-primary text-ink",
              )}
            >
              <ProfileAvatar profile={profile} className="h-14 w-14" />
              <span className="min-w-0">
                <span className="block text-lg font-extrabold">
                  {profile.name}
                </span>
                <span className="block text-sm leading-snug">
                  {instrumentLabels(profile.instruments)}
                </span>
              </span>
            </button>
            {manage && (
              <button
                type="button"
                aria-label={`${profile.name} bearbeiten`}
                onClick={() => setEditing(profile)}
                className={cn(
                  "spiel-tile flex w-12 shrink-0 items-center justify-center",
                  GAME_FOCUS_RING,
                )}
              >
                <Pencil className="h-5 w-5" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {profiles.length < MAX_PROFILES && (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className={cn(
            "spiel-tile flex min-h-14 items-center justify-center gap-2 p-3 font-bold",
            GAME_FOCUS_RING,
          )}
        >
          <Plus className="h-5 w-5" aria-hidden />
          Neues Profil
        </button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {!manage && (
          <Link
            href="/spiele/profile"
            className="text-primary-ink dark:text-primary min-h-11 py-3 font-bold"
          >
            Profile bearbeiten
          </Link>
        )}
        <button
          type="button"
          onClick={skip}
          className="text-dark dark:text-night-muted min-h-11 font-bold"
        >
          Ohne Profil spielen
        </button>
      </div>
    </div>
  );
}

/** Vor jedem Spiel: erst wählen, wer spielt, dann liest das Spiel seinen Speicher. */
export function ProfileGate({ children }: { children: ReactNode }) {
  const { status, active, synced } = useProfiles();
  if (status === "anon" || status === "skipped") return <>{children}</>;
  if (status === "none" || status === "choose") return <ProfilePicker />;
  if (status === "loading" || (status === "ready" && !synced)) {
    return (
      <p className="text-dark dark:text-night-muted py-16 text-center text-sm">
        Lädt …
      </p>
    );
  }
  return <Fragment key={active!.id}>{children}</Fragment>;
}

/** Auf der Übersicht: wer gerade spielt, mit Weg zum Wechseln. */
export function ProfileBadge() {
  const { status, active } = useProfiles();
  if (status === "anon" || status === "loading") return null;
  return (
    <Link
      href="/spiele/profile"
      className="text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 py-1 pr-2 text-sm font-bold"
    >
      {active ? "Profil wechseln" : "Profil wählen oder anlegen"}
    </Link>
  );
}
