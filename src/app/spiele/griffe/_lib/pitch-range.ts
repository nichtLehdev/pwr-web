import type { DifficultyId, InstrumentId } from "../../noten-lesen/_lib/types";
import type { WrittenPitch } from "../../noten-lesen/_lib/types";
import { pitchPool } from "../../noten-lesen/_lib/ranges";
import type { GriffeDifficultyId, GriffeInstrumentId } from "./types";

/** B‑Trompete nutzt denselben geschriebenen Pool wie Trompete in C. */
export function griffeToNotenInstrumentId(id: GriffeInstrumentId): InstrumentId {
  if (id === "trumpet_bb") return "trumpet_c";
  return id as InstrumentId;
}

/**
 * Anfänger: erste 6 diatonische Töne des Noten‑Anfänger‑Umfangs.
 * Mittel: voller Anfänger‑Umfang (ohne Chromatik).
 * Fortgeschritten: wie Noten lesen „Fortgeschritten“ (Chromatik inkl. Alternativen).
 *
 * Trompete: Pool ist immer **B‑Stimm‑/Schreib‑Tonlage** (wie `pitchPool` für
 * Trompete). `pickRandomGriffePitch` wandelt bei **Trompete in C** in
 * Konzertanzeige um (MIDI − 2).
 */
export function griffePitchPool(
  instrument: GriffeInstrumentId,
  difficulty: GriffeDifficultyId,
): WrittenPitch[] {
  const ni = griffeToNotenInstrumentId(instrument);
  if (difficulty === "beginner") {
    return pitchPool(ni, "beginner" as DifficultyId).slice(0, 6);
  }
  if (difficulty === "intermediate") {
    return pitchPool(ni, "beginner" as DifficultyId);
  }
  return pitchPool(ni, "advanced" as DifficultyId);
}
