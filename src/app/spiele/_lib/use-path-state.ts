"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { notifyProgressChanged, scopedKey } from "./profiles/scope";
import {
  parsePathStore,
  recordPathRun,
  type Celebration,
  type LearningPath,
  type PathProgress,
  type PathStage,
} from "./learning-path";

function storageKey(key: string): string {
  return scopedKey(`pwr.spiele.v1.${key}.path`);
}

function write(key: string, selectedId: string, progress: PathProgress): void {
  try {
    localStorage.setItem(
      storageKey(key),
      JSON.stringify({ selectedId, progress }),
    );
    notifyProgressChanged();
  } catch {
    /* Privates Fenster: Fortschritt gilt dann nur für diese Sitzung. */
  }
}

/** Fortschritt und Auswahl eines Pfads. `key` trennt z. B. die Instrumente. */
export function usePathState<S extends PathStage>(
  path: LearningPath<S>,
  key: string,
) {
  const [selectedId, setSelectedId] = useState(path.stages[0]!.id);
  const [progress, setProgress] = useState<PathProgress>({});
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const latest = useRef({ selectedId, progress });

  useEffect(() => {
    latest.current = { selectedId, progress };
  }, [selectedId, progress]);

  // localStorage erst nach dem Mount lesen (SSR-sicher).
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(storageKey(key));
    } catch {
      /* siehe oben */
    }
    const store = parsePathStore(raw, path);
    latest.current = store;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Serverbild und Speicher unterscheiden sich
    setSelectedId(store.selectedId);
    setProgress(store.progress);
    setCelebration(null);
  }, [key, path]);

  const select = useCallback(
    (id: string) => {
      latest.current = { ...latest.current, selectedId: id };
      setSelectedId(id);
      write(key, id, latest.current.progress);
    },
    [key],
  );

  const record = useCallback(
    (id: string, run: { percent: number; completed: boolean }) => {
      const result = recordPathRun(path, latest.current.progress, id, run);
      latest.current = { ...latest.current, progress: result.progress };
      setProgress(result.progress);
      setCelebration(result.celebration);
      write(key, latest.current.selectedId, result.progress);
      return result;
    },
    [key, path],
  );

  const clearCelebration = useCallback(() => setCelebration(null), []);

  return {
    selectedId,
    progress,
    celebration,
    select,
    record,
    clearCelebration,
  };
}

export type PathState = ReturnType<typeof usePathState>;
