import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import {
  loadGameState,
  loadOutbox,
  mergeServerAggregates,
  recordResult,
  removeFromOutbox,
  saveOutbox,
} from "../storage";

/** Minimaler localStorage-Ersatz für die Node-Testumgebung. */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

const globalWithStorage = globalThis as { localStorage?: unknown };

beforeEach(() => {
  globalWithStorage.localStorage = new MemoryStorage();
});

afterAll(() => {
  delete globalWithStorage.localStorage;
});

describe("loadGameState", () => {
  it("liefert leeren Zustand ohne gespeicherte Daten", () => {
    const state = loadGameState("rhythmus");
    expect(state.schemaVersion).toBe(1);
    expect(state.aggregates).toEqual({
      plays: 0,
      bestScore: 0,
      bestStreak: 0,
      lastPlayedAt: null,
    });
    expect(state.recentEvents).toEqual([]);
  });

  it("fällt bei kaputtem JSON auf leeren Zustand zurück", () => {
    (globalWithStorage.localStorage as MemoryStorage).setItem(
      "pwr.spiele.v1.rhythmus",
      "{not json",
    );
    expect(loadGameState("rhythmus").aggregates.plays).toBe(0);
  });

  it("fällt bei fremder schemaVersion auf leeren Zustand zurück", () => {
    (globalWithStorage.localStorage as MemoryStorage).setItem(
      "pwr.spiele.v1.rhythmus",
      JSON.stringify({ schemaVersion: 99, aggregates: { plays: 7 } }),
    );
    expect(loadGameState("rhythmus").aggregates.plays).toBe(0);
  });
});

describe("recordResult", () => {
  it("zählt Runden und merged Bestwerte als Maximum", () => {
    recordResult("noten-lesen", { score: 10, streak: 3 });
    recordResult("noten-lesen", { score: 7, streak: 8 });
    const state = loadGameState("noten-lesen");
    expect(state.aggregates.plays).toBe(2);
    expect(state.aggregates.bestScore).toBe(10);
    expect(state.aggregates.bestStreak).toBe(8);
    expect(state.aggregates.lastPlayedAt).toBeTruthy();
    expect(state.recentEvents).toHaveLength(2);
  });

  it("hängt Ergebnisse mit eindeutiger clientId an die Outbox an", () => {
    recordResult("griffe", { score: 5 });
    recordResult("griffe", { score: 6 });
    const outbox = loadOutbox();
    expect(outbox).toHaveLength(2);
    expect(outbox[0]!.clientId).not.toBe(outbox[1]!.clientId);
    expect(outbox[1]!.gameId).toBe("griffe");
  });

  it("kappt recentEvents bei 50 und die Outbox bei 200", () => {
    for (let i = 0; i < 210; i++) {
      recordResult("notenwaage", { score: i });
    }
    const state = loadGameState("notenwaage");
    expect(state.recentEvents).toHaveLength(50);
    // Älteste fliegen raus — der letzte Eintrag ist der neueste.
    expect(state.recentEvents.at(-1)!.score).toBe(209);
    expect(loadOutbox()).toHaveLength(200);
    expect(state.aggregates.plays).toBe(210);
  });

  it("funktioniert ohne localStorage (Privatmodus) und stürzt nicht ab", () => {
    delete globalWithStorage.localStorage;
    const aggregates = recordResult("rhythmus", { score: 42 }).aggregates;
    expect(aggregates.plays).toBe(1);
    expect(loadGameState("rhythmus").aggregates.plays).toBe(0);
  });
});

describe("Outbox", () => {
  it("entfernt nur die angegebenen clientIds", () => {
    recordResult("rhythmus", { score: 1 });
    recordResult("rhythmus", { score: 2 });
    const [first, second] = loadOutbox();
    removeFromOutbox([first!.clientId]);
    const remaining = loadOutbox();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.clientId).toBe(second!.clientId);
  });

  it("ignoriert leere Id-Listen", () => {
    recordResult("rhythmus", { score: 1 });
    removeFromOutbox([]);
    expect(loadOutbox()).toHaveLength(1);
  });

  it("kappt beim direkten Speichern ebenfalls bei 200", () => {
    const events = Array.from({ length: 250 }, (_, i) => ({
      clientId: `id-${i}`,
      gameId: "rhythmus" as const,
      playedAt: new Date(2026, 0, 1).toISOString(),
      score: i,
    }));
    saveOutbox(events);
    const outbox = loadOutbox();
    expect(outbox).toHaveLength(200);
    expect(outbox[0]!.clientId).toBe("id-50");
  });
});

describe("mergeServerAggregates", () => {
  it("nimmt je Feld das Maximum und das jüngste Datum", () => {
    recordResult("griffe", { score: 12, streak: 4 });
    const merged = mergeServerAggregates("griffe", {
      plays: 30,
      bestScore: 9,
      bestStreak: 11,
      lastPlayedAt: "2020-01-01T00:00:00.000Z",
    });
    expect(merged.aggregates.plays).toBe(30);
    expect(merged.aggregates.bestScore).toBe(12);
    expect(merged.aggregates.bestStreak).toBe(11);
    // Lokales "gerade eben" ist jünger als das Server-Datum von 2020.
    expect(merged.aggregates.lastPlayedAt! > "2020-01-01").toBe(true);
  });
});
