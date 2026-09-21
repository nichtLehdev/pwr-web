"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BOT_TRAP_ELAPSED_FIELD,
  BOT_TRAP_ELAPSED_HEADER,
  BOT_TRAP_FIELD,
  BOT_TRAP_HEADER,
} from "./bot-trap";

/**
 * Sammelt die beiden Signale eines echten Formulars: den leer gebliebenen
 * Honigtopf (siehe `<BotTrapField>`) und die Zeit seit dem Aufbau.
 */
export function useBotTrap() {
  const [value, setValue] = useState("");
  const openedAt = useRef(0);

  // Erst nach dem Mounten: Während des Renderns ist `Date.now()` nicht erlaubt,
  // und auf dem Server gemessen wäre es ohnehin die falsche Uhr.
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const elapsedMs = useCallback(
    () => (openedAt.current === 0 ? 0 : Date.now() - openedAt.current),
    [],
  );

  /** Für eigene Routen: die Signale reisen im Body mit. */
  const fields = useCallback(
    () => ({
      [BOT_TRAP_FIELD]: value,
      [BOT_TRAP_ELAPSED_FIELD]: elapsedMs(),
    }),
    [value, elapsedMs],
  );

  /** Für fremde Endpunkte mit festem Body-Schema, etwa better-auth. */
  const headers = useCallback(
    () => ({
      [BOT_TRAP_HEADER]: value,
      [BOT_TRAP_ELAPSED_HEADER]: String(elapsedMs()),
    }),
    [value, elapsedMs],
  );

  return { value, setValue, fields, headers };
}
