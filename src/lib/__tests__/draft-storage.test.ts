import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import {
  DRAFT_MAX_AGE_MS,
  decideDraftWrite,
  draftKey,
  formatDraftAge,
  readDraft,
  removeDraft,
  sweepDrafts,
  writeDraft,
} from "../draft-storage";

/** Minimaler localStorage-Ersatz für die Node-Testumgebung. */
class MemoryStorage {
  private map = new Map<string, string>();
  /** Wenn gesetzt, wirft setItem — simuliert ein volles Kontingent. */
  failWrites = false;

  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("QuotaExceededError");
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
let store: MemoryStorage;

const NOW = 1_700_000_000_000;
const KEY = draftKey("user-1", "post-new");

beforeEach(() => {
  store = new MemoryStorage();
  globalWithStorage.localStorage = store;
});

afterAll(() => {
  delete globalWithStorage.localStorage;
});

describe("draftKey", () => {
  it("trennt Entwürfe nach Benutzer", () => {
    expect(draftKey("user-1", "post-new")).not.toBe(
      draftKey("user-2", "post-new"),
    );
  });
});

describe("writeDraft / readDraft", () => {
  it("liest zurück, was geschrieben wurde", () => {
    writeDraft(KEY, { title: "Hallo" }, { version: 1, now: NOW });

    expect(readDraft<{ title: string }>(KEY, { version: 1, now: NOW })).toEqual(
      { data: { title: "Hallo" }, savedAt: NOW },
    );
  });

  it("liefert null ohne gespeicherten Entwurf", () => {
    expect(readDraft(KEY, { version: 1, now: NOW })).toBeNull();
  });

  it("meldet fehlgeschlagene Schreibvorgänge", () => {
    store.failWrites = true;

    expect(writeDraft(KEY, { title: "Hallo" }, { version: 1 })).toBe(false);
  });

  it("verwirft Entwürfe einer älteren Formularversion", () => {
    writeDraft(KEY, { title: "Alt" }, { version: 1, now: NOW });

    expect(readDraft(KEY, { version: 2, now: NOW })).toBeNull();
    expect(store.getItem(KEY)).toBeNull();
  });

  it("verwirft abgelaufene Entwürfe", () => {
    writeDraft(KEY, { title: "Alt" }, { version: 1, now: NOW });

    const later = NOW + DRAFT_MAX_AGE_MS + 1;
    expect(readDraft(KEY, { version: 1, now: later })).toBeNull();
    expect(store.getItem(KEY)).toBeNull();
  });

  it("behält Entwürfe innerhalb der Frist", () => {
    writeDraft(KEY, { title: "Frisch" }, { version: 1, now: NOW });

    const later = NOW + DRAFT_MAX_AGE_MS - 1000;
    expect(readDraft(KEY, { version: 1, now: later })).not.toBeNull();
  });

  it("verwirft beschädigte Einträge, statt sie ins Formular zu lassen", () => {
    store.setItem(KEY, "{kein json");

    expect(readDraft(KEY, { version: 1, now: NOW })).toBeNull();
    expect(store.getItem(KEY)).toBeNull();
  });

  it("verwirft Einträge ohne Umschlag (altes Format)", () => {
    store.setItem(KEY, JSON.stringify({ title: "Direkt gespeichert" }));

    expect(readDraft(KEY, { version: 1, now: NOW })).toBeNull();
  });

  it("stürzt ohne localStorage nicht ab (Privatmodus)", () => {
    delete globalWithStorage.localStorage;

    expect(writeDraft(KEY, { a: 1 }, { version: 1 })).toBe(false);
    expect(readDraft(KEY, { version: 1 })).toBeNull();
    expect(() => removeDraft(KEY)).not.toThrow();
    expect(sweepDrafts({ version: 1 })).toBe(0);
  });
});

describe("sweepDrafts", () => {
  it("entfernt abgelaufene und versionsfremde Entwürfe", () => {
    const fresh = draftKey("user-1", "post-new");
    const expired = draftKey("user-1", "post-2-edit");
    const wrongVersion = draftKey("user-2", "event-new");

    writeDraft(fresh, { a: 1 }, { version: 1, now: NOW });
    writeDraft(
      expired,
      { a: 2 },
      { version: 1, now: NOW - DRAFT_MAX_AGE_MS - 1 },
    );
    writeDraft(wrongVersion, { a: 3 }, { version: 99, now: NOW });

    expect(sweepDrafts({ version: 1, now: NOW })).toBe(2);
    expect(store.getItem(fresh)).not.toBeNull();
    expect(store.getItem(expired)).toBeNull();
    expect(store.getItem(wrongVersion)).toBeNull();
  });

  it("entfernt die Schlüssel des alten Autosave-Formats", () => {
    for (const legacy of [
      "post-new",
      "event-new",
      "course-new",
      "newsletter-compose",
      "post-abc-edit",
      "course-mail-abc",
    ]) {
      store.setItem(legacy, JSON.stringify({ title: "alt" }));
    }

    expect(sweepDrafts({ version: 1, now: NOW })).toBe(6);
    expect(store.length).toBe(0);
  });

  it("lässt fremde Einträge in Ruhe", () => {
    store.setItem("theme", "dark");
    store.setItem("banner-dismissed-beta", "true");
    store.setItem("pwr.spiele.v1.outbox", "[]");

    expect(sweepDrafts({ version: 1, now: NOW })).toBe(0);
    expect(store.length).toBe(3);
  });
});

describe("decideDraftWrite", () => {
  const base = {
    next: '{"title":"neu"}',
    lastWritten: "",
    baseline: '{"title":""}',
    suspendedAt: null,
    pending: false,
  };

  it("speichert geänderte Eingaben", () => {
    expect(decideDraftWrite(base)).toEqual({
      action: "write",
      clearSuspension: false,
    });
  });

  it("speichert nichts, solange über einen gefundenen Entwurf entschieden wird", () => {
    // Sonst überschreibt das (noch leere) Formular genau den Entwurf, der
    // gerade zur Wiederherstellung angeboten wird.
    expect(decideDraftWrite({ ...base, pending: true })).toEqual({
      action: "skip",
      clearSuspension: false,
    });
  });

  it("schreibt denselben Stand nicht doppelt", () => {
    expect(decideDraftWrite({ ...base, lastWritten: base.next })).toEqual({
      action: "skip",
      clearSuspension: false,
    });
  });

  it("entfernt den Entwurf, wenn das Formular wieder im Ausgangszustand ist", () => {
    expect(decideDraftWrite({ ...base, next: base.baseline })).toEqual({
      action: "remove",
      clearSuspension: false,
    });
  });

  it("legt nach clear() den gerade gelöschten Entwurf nicht wieder an", () => {
    // Der Re-Render direkt nach dem Absenden liefert unveränderte Daten.
    expect(decideDraftWrite({ ...base, suspendedAt: base.next })).toEqual({
      action: "skip",
      clearSuspension: false,
    });
  });

  it("nimmt das Speichern nach clear() wieder auf, sobald echt getippt wird", () => {
    expect(
      decideDraftWrite({
        ...base,
        suspendedAt: '{"title":"abgeschickt"}',
        next: '{"title":"etwas neues"}',
      }),
    ).toEqual({ action: "write", clearSuspension: true });
  });

  it("legt nach clear() keinen leeren Entwurf an, wenn das Formular zurückgesetzt wird", () => {
    // Nach dem Versand wird das Formular geleert — das ist der
    // Ausgangszustand, kein wiederherstellbarer Entwurf.
    expect(
      decideDraftWrite({
        ...base,
        suspendedAt: '{"title":"abgeschickt"}',
        next: base.baseline,
      }),
    ).toEqual({ action: "remove", clearSuspension: true });
  });
});

describe("formatDraftAge", () => {
  it("beschreibt das Alter auf Deutsch", () => {
    expect(formatDraftAge(NOW, NOW + 5_000)).toBe("gerade eben");
    expect(formatDraftAge(NOW, NOW + 60_000)).toBe("vor 1 Minute");
    expect(formatDraftAge(NOW, NOW + 5 * 60_000)).toBe("vor 5 Minuten");
    expect(formatDraftAge(NOW, NOW + 60 * 60_000)).toBe("vor 1 Stunde");
    expect(formatDraftAge(NOW, NOW + 3 * 60 * 60_000)).toBe("vor 3 Stunden");
    expect(formatDraftAge(NOW, NOW + 24 * 60 * 60_000)).toBe("vor 1 Tag");
    expect(formatDraftAge(NOW, NOW + 3 * 24 * 60 * 60_000)).toBe("vor 3 Tagen");
  });

  it("behandelt Zeitstempel aus der Zukunft (Uhr verstellt) freundlich", () => {
    expect(formatDraftAge(NOW + 10_000, NOW)).toBe("gerade eben");
  });
});
