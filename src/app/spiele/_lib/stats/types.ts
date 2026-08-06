import type { GameId } from "../games";

/** Ein abgeschlossenes Spielergebnis — lokal gespeichert und später synchronisiert. */
export type GameResultEvent = {
  /** Client-generierte UUID — macht den (wiederholten) Upload idempotent. */
  clientId: string;
  gameId: GameId;
  /** ISO-Zeitstempel des Rundenendes. */
  playedAt: string;
  score: number;
  maxScore?: number;
  streak?: number;
  durationMs?: number;
  /** Spielspezifisch: Schwierigkeit, Instrument, BPM … */
  meta?: Record<string, unknown>;
};

export type GameResultInput = Omit<
  GameResultEvent,
  "clientId" | "gameId" | "playedAt"
>;

export type GameAggregates = {
  plays: number;
  bestScore: number;
  bestStreak: number;
  lastPlayedAt: string | null;
};

export type GameLocalState = {
  schemaVersion: 1;
  /** Reserviert für spielspezifische Einstellungen (Sync in späterer Ausbaustufe). */
  settings: Record<string, unknown>;
  aggregates: GameAggregates;
  /** Letzte Ergebnisse (gekappt) — Anzeige & Debugging. */
  recentEvents: GameResultEvent[];
};

export const EMPTY_AGGREGATES: GameAggregates = {
  plays: 0,
  bestScore: 0,
  bestStreak: 0,
  lastPlayedAt: null,
};
