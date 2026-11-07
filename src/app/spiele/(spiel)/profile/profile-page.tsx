"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameDock } from "../../_components/game-shell-context";
import { ProfilePicker, useProfiles } from "../../_components/profiles";
import { Toni } from "../../_components/toni";

/** Profile wechseln, anlegen und bearbeiten; ohne Login geht das nicht. */
export function ProfilePage() {
  const { status } = useProfiles();
  const router = useRouter();

  if (status === "loading") {
    return (
      <p className="text-dark dark:text-night-muted py-16 text-center text-sm">
        Lädt …
      </p>
    );
  }

  if (status === "anon") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 pt-6 text-center">
        <Toni mood="idle" className="h-24 w-24" />
        <p className="text-ink dark:text-night-text text-2xl font-extrabold">
          Profile gibt es mit Anmeldung
        </p>
        <p className="text-dark dark:text-night-muted">
          Dann können mehrere Kinder ein Konto teilen, und der Fortschritt ist
          auf jedem Gerät da. Spielen geht auch ohne.
        </p>
        <GameDock>
          <Link
            href="/login?callbackUrl=/spiele/profile"
            className="spiele-hub-action flex min-h-14 w-full items-center justify-center text-lg font-extrabold"
          >
            Anmelden
          </Link>
        </GameDock>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ProfilePicker manage onPicked={() => router.push("/spiele")} />
    </div>
  );
}
